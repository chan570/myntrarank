/**
 * TRUSTRANK NLP SENTIMENT ENGINE
 * Powered by natural.js BayesClassifier Model.
 * Loads pre-trained model state from server/data/sentiment_model.json on boot.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import natural from 'natural';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MODEL_PATH = path.join(__dirname, '../data/sentiment_model.json');

let classifier = null;
let isLoaded = false;
let loadPromise = null;

// Load pre-trained BayesClassifier Model from disk on startup
export function initMLModel() {
  if (isLoaded) return Promise.resolve(classifier);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve) => {
    console.log('[NLP Engine] Deserializing pre-trained BayesClassifier Model from disk...');
    natural.BayesClassifier.load(MODEL_PATH, null, (err, loadedClassifier) => {
      if (err) {
        console.warn(`[NLP Engine] ⚠️ Could not load model from ${MODEL_PATH}: ${err.message}`);
        console.log('[NLP Engine] Fallback: Initializing empty BayesClassifier.');
        classifier = new natural.BayesClassifier();
      } else {
        classifier = loadedClassifier;
        isLoaded = true;
        console.log('[NLP Engine] ✅ BayesClassifier Model loaded successfully from JSON state!');
      }
      resolve(classifier);
    });
  });

  return loadPromise;
}

// Auto-load on module import
initMLModel().catch((err) => console.error('[NLP Engine] Startup load failed:', err.message));

/**
 * Perform Sentiment Analysis using the pre-trained BayesClassifier model.
 * Returns a score normalized from 0.0 to 1.0 representing positive probability.
 */
export async function analyzeNLPSentiment(text) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) return 0.5;

  try {
    // Ensure the model is loaded before predicting
    await initMLModel();

    if (classifier) {
      const rawClassifications = classifier.getClassifications(text.toLowerCase().trim());
      if (rawClassifications && rawClassifications.length > 0) {
        const posClass = rawClassifications.find(c => c.label === 'positive');
        const negClass = rawClassifications.find(c => c.label === 'negative');
        
        const posValue = posClass ? posClass.value : 0.5;
        const negValue = negClass ? negClass.value : 0.5;
        
        // Calculate normalized probability score from classifications
        const sum = posValue + negValue;
        let score = 0.5;
        if (sum > 0) {
          score = posValue / sum;
        }
        
        // Clamp between 0.05 and 0.98
        return Number(Math.max(0.05, Math.min(0.98, score)).toFixed(2));
      }
    }
  } catch (err) {
    console.warn('[NLP Engine] BayesClassifier prediction failed, using fallback scoring:', err.message);
  }

  // Simple rule fallback
  return analyzeNLPSentimentSync(text);
}

// Fast rule-based sentiment fallback
export function analyzeNLPSentimentSync(text) {
  if (!text || typeof text !== 'string') return 0.5;
  const clean = text.toLowerCase().trim();
  
  const positiveWords = ['amazing', 'excellent', 'awesome', 'comfortable', 'perfect', 'premium', 'soft', 'superb', 'love', 'loved', 'best', 'great', 'good', 'nice', 'beautiful', 'happy', 'satisfied', 'worth'];
  const negativeWords = ['cheap', 'uncomfortable', 'terrible', 'horrible', 'awful', 'loose', 'faded', 'damaged', 'overpriced', 'disappointed', 'bad', 'poor', 'worst', 'broken', 'useless', 'fake'];

  let posCount = 0;
  let negCount = 0;

  const words = clean.split(/\s+/);
  for (const w of words) {
    if (positiveWords.includes(w)) posCount++;
    if (negativeWords.includes(w)) negCount++;
  }

  const total = posCount + negCount;
  if (total === 0) return 0.5;
  return Number((posCount / total).toFixed(2));
}

export default { analyzeNLPSentiment, analyzeNLPSentimentSync, initMLModel };
