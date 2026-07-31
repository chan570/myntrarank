import os
import joblib
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import uvicorn
from train import clean_and_preprocess

# Load model and vectorizer
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

class PredictionResponse(BaseModel):
    status: str = "success"
    sentiment: str = Field(..., description="Predicted sentiment class (POSITIVE/NEGATIVE)")
    score: float = Field(..., description="Sentiment score normalized between 0.0 and 1.0")
    confidence: float = Field(..., description="Model prediction probability confidence")

@app.post("/api/v1/predict", response_model=PredictionResponse)
async def predict_sentiment(payload: ReviewPayload):
    try:
        # Preprocess text
        cleaned = clean_and_preprocess(payload.text)
        
        # Transform features
        features = vectorizer.transform([cleaned])
        
        # Predict probability
        probabilities = model.predict_proba(features)[0]  # [prob_neg, prob_pos]
        prob_pos = probabilities[1]
        prob_neg = probabilities[0]
        
        # Assign sentiment class and confidence
        if prob_pos >= 0.5:
            sentiment = "POSITIVE"
            confidence = prob_pos
            score = prob_pos
        else:
            sentiment = "NEGATIVE"
            confidence = prob_neg
            score = prob_pos  # score normalized from 0.0 to 1.0
            
        # Guarantee constraints
        score = float(max(0.05, min(0.98, score)))
        confidence = float(max(0.50, min(1.0, confidence)))
        
        return PredictionResponse(
            status="success",
            sentiment=sentiment,
            score=round(score, 3),
            confidence=round(confidence, 3)
        )
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "TrustRank NLP Service"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
