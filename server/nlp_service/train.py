"""Fine-tune the configured transformer on the clothing review CSV.

Rating-derived labels are proxies for sentiment, not human sentiment annotations.
The expected CSV is deliberately not bundled; see README for source/licensing.
"""

import json
import os
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
from datasets import Dataset
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    DataCollatorWithPadding,
    Trainer,
    TrainingArguments,
)
from dataset_splits import split_by_product


HERE = Path(__file__).resolve().parent
CSV_PATH = Path(os.getenv("SENTIMENT_TRAINING_CSV", HERE / "../../data/Womens Clothing E-Commerce Reviews.csv")).resolve()
BASE_MODEL = os.getenv("SENTIMENT_BASE_MODEL", "cardiffnlp/twitter-roberta-base-sentiment-latest")
OUTPUT_DIR = Path(os.getenv("SENTIMENT_MODEL_OUTPUT", HERE / "models/trustrank-sentiment")).resolve()
LABEL2ID = {"NEGATIVE": 0, "NEUTRAL": 1, "POSITIVE": 2}
ID2LABEL = {value: key for key, value in LABEL2ID.items()}


def main():
    if not CSV_PATH.exists():
        raise FileNotFoundError(
            f"Training CSV not found: {CSV_PATH}. Set SENTIMENT_TRAINING_CSV to the downloaded, licensed dataset file."
        )

    frame = pd.read_csv(CSV_PATH)
    required = {"Review Text", "Rating", "Clothing ID"}
    missing = required - set(frame.columns)
    if missing:
        raise ValueError(f"Training CSV is missing columns: {sorted(missing)}")

    frame = frame.dropna(subset=["Review Text", "Rating"]).copy()
    frame["text"] = frame["Review Text"].astype(str).str.strip()
    frame = frame[frame["text"].str.len().between(1, 10000)]
    frame["label"] = frame["Rating"].astype(int).map(
        lambda rating: 0 if rating <= 2 else (1 if rating == 3 else 2)
    )
    frame = frame[["text", "label", "Clothing ID"]]

    # Dataset rows for each product stay together. Demo catalog groups are never
    # used for training or evaluation; the test/evaluation groups are separate.
    train_rows, eval_rows, catalog_rows = split_by_product(frame)
    train_frame = train_rows[["text", "label"]].reset_index(drop=True)
    eval_frame = eval_rows[["text", "label"]].reset_index(drop=True)

    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL)
    model = AutoModelForSequenceClassification.from_pretrained(
        BASE_MODEL,
        num_labels=3,
        id2label=ID2LABEL,
        label2id=LABEL2ID,
        ignore_mismatched_sizes=True,
    )
    train_data = Dataset.from_pandas(train_frame).map(
        lambda batch: tokenizer(batch["text"], truncation=True, max_length=512), batched=True
    )
    eval_data = Dataset.from_pandas(eval_frame).map(
        lambda batch: tokenizer(batch["text"], truncation=True, max_length=512), batched=True
    )

    def metrics(eval_prediction):
        logits, labels = eval_prediction
        predictions = np.argmax(logits, axis=-1)
        return {
            "accuracy": accuracy_score(labels, predictions),
            "macro_f1": f1_score(labels, predictions, average="macro", zero_division=0),
            "macro_precision": precision_score(labels, predictions, average="macro", zero_division=0),
            "macro_recall": recall_score(labels, predictions, average="macro", zero_division=0),
        }

    args = TrainingArguments(
        output_dir=str(OUTPUT_DIR / "checkpoints"),
        learning_rate=2e-5,
        per_device_train_batch_size=8,
        per_device_eval_batch_size=16,
        num_train_epochs=3,
        weight_decay=0.01,
        eval_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="macro_f1",
        logging_steps=50,
        report_to="none",
        seed=42,
    )
    trainer = Trainer(
        model=model,
        args=args,
        train_dataset=train_data,
        eval_dataset=eval_data,
        processing_class=tokenizer,
        data_collator=DataCollatorWithPadding(tokenizer=tokenizer),
        compute_metrics=metrics,
    )
    trainer.train()
    result = trainer.evaluate()
    trainer.save_model(str(OUTPUT_DIR))
    tokenizer.save_pretrained(str(OUTPUT_DIR))
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUTPUT_DIR / "evaluation.json").write_text(
        json.dumps({
            "metrics": result,
            "base_model": BASE_MODEL,
            "label_method": "rating proxy: 1-2 negative, 3 neutral, 4-5 positive",
            "train_rows": len(train_frame),
            "evaluation_rows": len(eval_frame),
            "catalog_holdout_rows": len(catalog_rows),
            "catalog_holdout_product_ids": sorted(catalog_rows["Clothing ID"].astype(str).unique().tolist()),
            "product_group_split": True,
        }, indent=2),
        encoding="utf-8",
    )
    print(f"Saved transformer checkpoint and evaluation report to {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
