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

1. Start a local OpenSearch endpoint that accepts HTTP without authentication, then confirm it is available at `http://localhost:9200`. The bundled development configuration disables the security plugin and is suitable only for local use. For a secured/managed cluster, configure its HTTPS endpoint and credentials in the API environment variables.
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
   FRONTEND_ORIGINS=http://localhost:5173
   ```

   Adjust local ports as needed. Production must use HTTPS, secure cookies, restricted `FRONTEND_ORIGINS`, and protected OpenSearch access. Never commit `.env`, credentials, or model access tokens.

4. The held-out demo catalog is included at `server/data/demo_catalog.json`, so the demo does not need the source CSV. The Women’s Clothing CSV is excluded from this project copy because of its size and dataset licensing/distribution terms. To reproduce the catalog split or train the model yourself, download the same Kaggle dataset and set its path, then run:

   ```powershell
   $env:SENTIMENT_TRAINING_CSV='C:\path\to\Womens Clothing E-Commerce Reviews.csv'
   pip install -r server/nlp_service/requirements-data.txt
   npm run prepare:dataset
   ```

   The dataset preparation script reads `SENTIMENT_TRAINING_CSV`. The shared deterministic split keeps Clothing IDs disjoint: approximately 70% train, 15% evaluation, 15% demo catalog. The catalog reviews are not used to fit or evaluate the model.

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

## Hosted demo deployment (Vercel frontend + Render services)

GitHub Pages and Vercel serve the browser application. They do not run the Express API, OpenSearch, or the Python transformer. The repository includes `render.yaml` to create a public Express API and a private Python sentiment service on Render. Create a secured, persistent OpenSearch cluster separately, for example with Aiven for OpenSearch.

1. Create the OpenSearch service first. Copy its HTTPS endpoint, username, and password. Keep the endpoint and credentials private; the API connection uses `OPENSEARCH_NODE`, `OPENSEARCH_USERNAME`, and `OPENSEARCH_PASSWORD`.
2. In Render, choose **New > Blueprint Instance**, connect `chan570/myntrarank`, and use the repository's `render.yaml`. Select a compute plan with enough memory for the PyTorch sentiment model. Enter the OpenSearch values when Render prompts for the `sync: false` variables. The Blueprint creates the API and private NLP service in the same Render region.
3. Wait for the NLP service to finish loading the model. Check `/health` from the Render service's internal shell/logs; it should report `modelLoaded: true`. Check the API's public `/health/ready` endpoint; it should report `status: ready`.
4. Seed the demo catalog once from the API service's shell by running `npm run seed`. The command skips seeding if products already exist. The checked-in held-out catalog is at `server/data/demo_catalog.json`.
5. Copy the public API origin from Render, for example `https://myntrarank-api.onrender.com` (do not include `/api`). In the Vercel project, open **Settings > Environment Variables** and add:

   - `TRUSTRANK_API_ORIGIN` = the Render API origin, for example `https://myntrarank-api.onrender.com`
   - `VITE_API_BASE_URL` = `/api`

   Select Production (and Preview if needed), save, and redeploy. The small `api/[...route].js` function in this repository forwards Vercel's same-origin `/api` requests to Render, so browser sign-in cookies stay on the Vercel site. Do not add OpenSearch credentials to Vercel or to any `VITE_` variable; Vite variables are included in browser code.
6. GitHub Pages is optional. If you want that URL to work too, add a repository variable named `VITE_API_BASE_URL` in **GitHub > Settings > Secrets and variables > Actions > Variables** with the direct API URL, for example `https://myntrarank-api.onrender.com/api`, then rerun the Pages workflow. Until the variable exists, the Pages workflow skips instead of failing. Use the Vercel deployment as the main hosted demo because the same-origin API proxy also avoids cross-site session-cookie restrictions.
7. Test the Vercel site: featured products should load; search and category browsing should return results; register/sign-in should work; submit a review and search again to see updated ranking. The API allows the Vercel and GitHub Pages origins listed in `render.yaml`.

The transformer service needs enough RAM to load PyTorch and its model. Check the provider's current plan and pricing before creating resources. For real production use, add backups, monitoring, and stronger account storage; the demo currently stores accounts, sessions, and reviews in OpenSearch.

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
