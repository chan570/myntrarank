import os
import json
import joblib
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List
import uvicorn
from train import clean_and_preprocess

# Load model and vectorizer once on boot
model_path = os.path.join(os.path.dirname(__file__), 'model.pkl')
tfidf_path = os.path.join(os.path.dirname(__file__), 'tfidf.pkl')

if not os.path.exists(model_path) or not os.path.exists(tfidf_path):
    raise RuntimeError("Trained model files not found. Please run train.py first.")

model = joblib.load(model_path)
vectorizer = joblib.load(tfidf_path)

# Initialize FastAPI app
app = FastAPI(
    title="TrustRank NLP Sentiment Microservice",
    description="Production-grade TF-IDF + Logistic Regression Sentiment Classifier API.",
    version="1.0.0"
)

class ReviewPayload(BaseModel):
    text: str = Field(..., description="Review text to analyze", min_length=1)

class BatchReviewPayload(BaseModel):
    id: str = Field(..., description="Unique review identifier")
    text: str = Field(..., description="Review text to analyze", min_length=1)

class BatchPayload(BaseModel):
    reviews: List[BatchReviewPayload] = Field(..., description="List of reviews to predict in batch")

class PredictionResponse(BaseModel):
    status: str = "success"
    sentiment: str = Field(..., description="Predicted sentiment class (POSITIVE/NEGATIVE)")
    score: float = Field(..., description="Sentiment score normalized between 0.0 and 1.0")
    confidence: float = Field(..., description="Model prediction probability confidence")

class BatchPredictionItem(BaseModel):
    id: str
    sentiment: str
    score: float
    confidence: float

class BatchPredictionResponse(BaseModel):
    status: str = "success"
    predictions: List[BatchPredictionItem]

def predict_single_text(text: str):
    cleaned = clean_and_preprocess(text)
    features = vectorizer.transform([cleaned])
    probabilities = model.predict_proba(features)[0]  # [prob_neg, prob_pos]
    prob_pos = probabilities[1]
    prob_neg = probabilities[0]
    
    if prob_pos >= 0.5:
        sentiment = "POSITIVE"
        confidence = prob_pos
        score = prob_pos
    else:
        sentiment = "NEGATIVE"
        confidence = prob_neg
        score = prob_pos
        
    score = float(max(0.05, min(0.98, score)))
    confidence = float(max(0.50, min(1.0, confidence)))
    return sentiment, round(score, 3), round(confidence, 3)

@app.post("/api/v1/predict", response_model=PredictionResponse)
async def predict_sentiment(payload: ReviewPayload):
    try:
        sentiment, score, confidence = predict_single_text(payload.text)
        return PredictionResponse(
            status="success",
            sentiment=sentiment,
            score=score,
            confidence=confidence
        )
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))

@app.post("/api/v1/predict/batch", response_model=BatchPredictionResponse)
async def predict_sentiment_batch(payload: BatchPayload):
    try:
        results = []
        for r in payload.reviews:
            sentiment, score, confidence = predict_single_text(r.text)
            results.append(BatchPredictionItem(
                id=r.id,
                sentiment=sentiment,
                score=score,
                confidence=confidence
            ))
        return BatchPredictionResponse(status="success", predictions=results)
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "modelLoaded": True,
        "model": "TF-IDF + Logistic Regression",
        "version": "1.0"
    }

@app.get("/metrics")
async def get_metrics():
    metrics_path = os.path.join(os.path.dirname(__file__), 'evaluation', 'metrics.json')
    if os.path.exists(metrics_path):
        with open(metrics_path, 'r') as f:
            data = json.load(f)
            return {
                "modelVersion": "1.0",
                "trainingDate": data.get("training_date"),
                "vocabularySize": data.get("vocabulary_size"),
                "classes": data.get("classes"),
                "accuracy": data.get("accuracy"),
                "meanCvScore": data.get("mean_cv_score")
            }
    return {"status": "warning", "message": "Evaluation metrics.json not found."}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
