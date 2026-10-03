# TrustRank

TrustRank is a review-risk and product-ranking demo. Users can register, sign in, and submit one review per account for a product. The API saves the review and recalculates the product score. Search rankings are snapshots: an existing results list stays fixed until the user searches or refreshes again.

## What this demo does and does not claim

- Catalog products and historical seed reviews come only from the CC0 Women’s Clothing E-Commerce Reviews dataset. Catalog products are held out by `Clothing ID` from both transformer training and model evaluation. User-submitted reviews are separate demo inputs and are not silently added to the training set.
- Submitted reviews are always unverified. There is no checkout/order integration to prove purchase.
- Demo accounts use scrypt password hashes and seven-day HttpOnly session cookies. There is no email verification, password reset, or account recovery.
- Review-risk rules are heuristics and may flag harmless behavior. They are not proof of fraud.
- Sentiment uses a pretrained three-class transformer. It predicts polarity only; it does not detect fake reviews.
- The default checkpoint was trained on English social-media text, so it is a starting model, not proven clothing-review performance. Its model card lists CC-BY-4.0 and English suitability; retain attribution and validate it on product reviews before relying on the scores. [Model card](https://huggingface.co/cardiffnlp/twitter-roberta-base-sentiment-latest)
- The source has no prices, product photos, reviewer identities, purchase verification, or review dates. The interface labels or omits those fields rather than inventing them. No live marketplace feed is connected.

## Main review flow

```text
Product page form
  -> POST /api/reviews (validated, idempotency key)
  -> load product from OpenSearch
  -> append one account-owned, unverified review and rerun risk scoring + uncached sentiment inference
  -> write reviews and aggregate metrics into the product document
  -> return updated metrics
  -> show success while each existing search snapshot stays fixed
  -> the next search or explicit refresh requests the current ordering
```

OpenSearch stores the demo catalog, account records, sessions, reviews, and score aggregates. A per-product queue serializes simultaneous review writes inside one API process; version-checked writes protect against concurrent updates from another process. Review sentiment predictions are cached on each review, so subsequent submissions only need inference for new text. This makes a single-process pilot with 20 users more predictable. A multi-instance production service should move account and review writes to a transactional database with uniqueness constraints, then update OpenSearch as a search projection. The bundled local cluster is for development only.

## Services

- React + Vite frontend
- Express API
- OpenSearch index `myntrarank_products`
- OpenSearch indexes `trustrank_users` and `trustrank_sessions` for demo account sessions
- Python FastAPI sentiment service using `cardiffnlp/twitter-roberta-base-sentiment-latest` by default

The service loads the transformer once at process start. First startup downloads model files, so the host needs outbound access to Hugging Face unless the model is pre-cached. CPU inference is supported; GPU is used when available. For mixed Hindi-English reviews, select and evaluate a multilingual model before claiming support.

## Local setup

Requirements: Node.js compatible with the lockfile, Python 3.10+, an OpenSearch 2.x endpoint, outbound access to Hugging Face for the first model download, and enough RAM for the transformer model (CPU use is slower). The updated source ZIP does not include an OpenSearch distribution. If you still have the original `opensearch-2.11.0` folder, start it with `.\opensearch-2.11.0\bin\opensearch.bat`; otherwise install/run a local OpenSearch 2.x instance separately.

1. Start a local OpenSearch endpoint that accepts HTTP without authentication, then confirm it is available at `http://localhost:9200`. The bundled development configuration disables the security plugin and is suitable only for local use. The current API client does not configure TLS or credentials for a secured/managed cluster.
2. In the project root, create a local Python environment and install the NLP requirements:

   ```powershell
   python -m venv .venv
   .\.venv\Scripts\python.exe -m pip install -r server/nlp_service/requirements.txt
   ```

   Download the model once into the project-local ignored model folder. This avoids repeated downloads and keeps the large checkpoint out of source control:

   ```powershell
   .\.venv\Scripts\python.exe -c 'from huggingface_hub import snapshot_download; snapshot_download(repo_id="cardiffnlp/twitter-roberta-base-sentiment-latest", local_dir="server/nlp_service/models/cardiffnlp/twitter-roberta-base-sentiment-latest", allow_patterns=["config.json","vocab.json","merges.txt","tokenizer_config.json","special_tokens_map.json","pytorch_model.bin"])'
   $env:SENTIMENT_MODEL_ID = (Resolve-Path "server/nlp_service/models/cardiffnlp/twitter-roberta-base-sentiment-latest").Path
   Push-Location server/nlp_service
   ..\..\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
   Pop-Location
   ```

   Keep this terminal open. Verify `http://127.0.0.1:8000/health` reports `modelLoaded: true`. Run `/api/v1/predict` once to confirm inference.

3. In a second terminal, install Node dependencies and create `.env` from `.env.example` only if you do not already have a local `.env`:

   ```powershell
   npm ci
   if (-not (Test-Path .env)) { Copy-Item .env.example .env }
   ```

   `.env` should contain:

   ```env
   PORT=5000
   OPENSEARCH_NODE=http://localhost:9200
   NLP_SERVICE_URL=http://localhost:8000/api/v1
   FRONTEND_ORIGIN=http://localhost:5173
   ```

   Adjust local ports as needed. Production must use HTTPS, secure cookie delivery, a restricted `FRONTEND_ORIGIN`, protected OpenSearch access, and a managed identity/security setup. Never commit `.env`, credentials, or model access tokens.

4. The Kaggle CSV and held-out catalog are included. To reproduce the catalog split from the source file, run:

   ```powershell
   pip install -r server/nlp_service/requirements-data.txt
   npm run prepare:dataset
   ```

   This shared deterministic split keeps Clothing IDs disjoint: approximately 70% train, 15% evaluation, 15% demo catalog. The catalog reviews are not used to fit or evaluate the model.

5. Seed the dataset catalog once, after OpenSearch and the sentiment service are ready:

   ```powershell
   npm run seed
   ```

   The seed command imports the held-out product groups and skips seeding if the index already contains documents. To reset a local demo, delete the `myntrarank_products` index in your OpenSearch UI/API, then run the seed command again.

6. Start the API and frontend in separate terminals:

   ```powershell
   npm run server
   npm run dev
   ```

   Readiness is available at `http://localhost:5000/health/ready`; API documentation is at `/api/docs`.

   If readiness returns `503`, first check that OpenSearch is reachable and then check the sentiment service at `/health`. Do not seed the catalog again if the index already contains products; the seed command intentionally skips a non-empty index.

## Optional domain fine-tuning

The default transformer is pretrained, not fine-tuned on this project's product reviews. The training script uses only the included Women’s Clothing dataset and derives three sentiment proxy classes from ratings (1–2 negative, 3 neutral, 4–5 positive). It reports evaluation metrics and saves a local model. Ratings are noisy sentiment proxies, not human-annotated sentiment labels.

For transformer fine-tuning, install the training dependencies and run:

```powershell
pip install -r requirements-training.txt
$env:SENTIMENT_TRAINING_CSV='C:\path\to\Womens Clothing E-Commerce Reviews.csv'
python train.py
```

Then configure `SENTIMENT_MODEL_ID` to the resulting `models/trustrank-sentiment` directory before launching the FastAPI service. Rating-derived labels are noisy proxies, not human-annotated sentiment. Keep the default pretrained checkpoint if fine-tuning does not improve a held-out review set.

## Evaluation and limitations

Run the JavaScript checks with `npm test` and frontend static checks/build with `npm run lint` and `npm run build`. The Python API can be checked through `/health` and prediction endpoints. Do not use old benchmark figures in `server/benchmark.md`: they were not supplied with reproducible harness/results for this transformer version.

This is a portfolio demo, not a production marketplace. Accounts have no email verification, password reset, account recovery, purchase verification, moderation queues, appeals, abuse reporting, privacy retention controls, durable backups, or load testing. Reviews are embedded in product documents and score recalculation is synchronous, so very high review volume per product needs normalized review storage and durable background aggregation. The in-process product queue coordinates one API process; multiple API instances need database-level uniqueness/locking or a shared durable queue. Search pagination and independent review pagination are also future work for a larger catalog.
