/**
 * TRUSTRANK NLP SENTIMENT GATEWAY
 * Direct connection to Python FastAPI ML Microservice (Logistic Regression + TF-IDF)
 * No fallback, pure Machine Learning execution path.
 */

import config from '../config/env.js';

/**
 * Perform Sentiment Analysis using the FastAPI ML Service.
 * Returns a score normalized from 0.0 to 1.0. Throws an error on connection failure.
 */
export async function analyzeNLPSentiment(text) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) return 0.5;

  const url = `${config.nlpServiceUrl}/predict`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });

  if (!response.ok) {
    throw new Error(`NLP Microservice returned HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  if (data && data.status === 'success') {
    return data.score; // Float value between 0.05 and 0.98
  }

  throw new Error("Invalid response format received from NLP Microservice.");
}

export default { analyzeNLPSentiment };
