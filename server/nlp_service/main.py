"""TrustRank sentiment service backed by a pretrained transformer classifier.

This service predicts sentiment only. It does not determine whether a review is
genuine or purchase-verified.
"""

import os
from typing import List

import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from transformers import AutoModelForSequenceClassification, AutoTokenizer


MODEL_ID = os.getenv(
    "SENTIMENT_MODEL_ID", "cardiffnlp/twitter-roberta-base-sentiment-latest"
)
MAX_LENGTH = 512
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_ID)
model.to(DEVICE)
model.eval()

app = FastAPI(
    title="TrustRank Transformer Sentiment Service",
    description="Three-class transformer sentiment inference for product reviews.",
    version="2.0.0",
)


class ReviewPayload(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000)


class BatchReviewPayload(BaseModel):
    id: str
    text: str = Field(..., min_length=1, max_length=10000)


class BatchPayload(BaseModel):
    reviews: List[BatchReviewPayload] = Field(..., max_length=128)


def predict_texts(texts: List[str]):
    if not texts:
        return []
    inputs = tokenizer(
        texts,
        padding=True,
        truncation=True,
        max_length=MAX_LENGTH,
        return_tensors="pt",
    ).to(DEVICE)

    with torch.inference_mode():
        probabilities = torch.softmax(model(**inputs).logits, dim=-1).cpu()

    labels = [model.config.id2label[index].lower() for index in range(probabilities.shape[1])]
    label_indexes = {label: index for index, label in enumerate(labels)}
    required = {"negative", "neutral", "positive"}
    if not required.issubset(label_indexes):
        raise RuntimeError(f"Expected model labels {sorted(required)}, got {labels}")

    results = []
    for row in probabilities:
        values = {label: float(row[index]) for label, index in label_indexes.items()}
        sentiment = max(required, key=lambda label: values[label]).upper()
        # Expected polarity in [0,1], with neutral centered at 0.5.
        score = values["positive"] + (0.5 * values["neutral"])
        confidence = values[sentiment.lower()]
        results.append({
            "sentiment": sentiment,
            "score": round(score, 4),
            "confidence": round(confidence, 4),
        })
    return results


@app.post("/api/v1/predict")
def predict_sentiment(payload: ReviewPayload):
    try:
        return {"status": "success", **predict_texts([payload.text])[0]}
    except Exception as err:
        raise HTTPException(status_code=500, detail="Sentiment prediction failed") from err


@app.post("/api/v1/predict/batch")
def predict_sentiment_batch(payload: BatchPayload):
    try:
        predictions = predict_texts([review.text for review in payload.reviews])
        return {
            "status": "success",
            "predictions": [
                {"id": review.id, **prediction}
                for review, prediction in zip(payload.reviews, predictions)
            ],
        }
    except Exception as err:
        raise HTTPException(status_code=500, detail="Batch sentiment prediction failed") from err


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "modelLoaded": True,
        "model": MODEL_ID,
        "device": str(DEVICE),
        "version": "2.0.0",
    }
