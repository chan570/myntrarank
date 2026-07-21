/**
 * TRUSTRANK REAL ML NLP SENTIMENT ENGINE
 * Powered by Hugging Face Transformers.js (@xenova/transformers)
 * Model: Xenova/distilbert-base-uncased-finetuned-sst-2-english
 * Fallback: Rule-augmented VADER Lexicon engine
 */

import { pipeline } from '@xenova/transformers';

let sentimentPipeline = null; //model
let isInitializing = false;
/*100 users arrive together.
100 Downloads

100 Copies

Crash Therefore developer added

isInitializing

Initially=false means

Nobody loading model.

When first user starts

isInitializing=true 
Now everyone else sees 
Already loading.
Wait.*/ 
let initPromise = null; //model is downloading... as a promise

/**
 * Initialize the ML Transformer Model asynchronously.
 */
export async function initMLModel() {
  if (sentimentPipeline) return sentimentPipeline;
  if (isInitializing) return initPromise;

  isInitializing = true;
  initPromise = (async () => {
    try {
      console.log('[NLP Engine] Loading Transformer ML Model (Xenova/distilbert-base-uncased-finetuned-sst-2-english)...');
      sentimentPipeline = await pipeline(
        'sentiment-analysis',
        'Xenova/distilbert-base-uncased-finetuned-sst-2-english'
      );
      console.log('[NLP Engine] Transformer ML Model loaded successfully!');
      return sentimentPipeline;
    } catch (err) {
      console.warn('[NLP Engine] Could not load ML Transformer model, falling back to VADER:', err.message);
      return null;
    } finally {
      isInitializing = false;
    }
  })();

  return initPromise;
}

/**
 * Perform Sentiment Analysis using Transformer ML Model.
 * Returns a score normalized from 0.0 to 1.0.
 */
export async function analyzeNLPSentiment(text) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) return 0.5;

  try {
    const pipe = await initMLModel();
    if (pipe) {
      const output = await pipe(text);
      if (output && output.length > 0) {
        const { label, score } = output[0];
        // DistilBERT output: POSITIVE or NEGATIVE with confidence score
        let sentimentScore = 0.5;
        if (label === 'POSITIVE') {
          sentimentScore = score;
        } else if (label === 'NEGATIVE') {
          sentimentScore = 1.0 - score;
        } else {
          sentimentScore = score;
        }
        return Number(Math.max(0.05, Math.min(0.98, sentimentScore)).toFixed(2));
      }
    }
  } catch (err) {
    console.warn('[NLP Engine] ML Inference failed, using rule-based VADER fallback:', err.message);
  }

  // Fallback to Rule-based VADER
  return analyzeNLPSentimentSync(text);
}

const VALENCE_LEXICON = {
  // Positive Lexicon & Intensity Scores
  "amazing": 3.4, "excellent": 3.2, "awesome": 3.1, "outstanding": 3.5,
  "comfortable": 2.4, "comfy": 2.2, "premium": 2.5, "stylish": 2.1,
  "perfect": 3.0, "soft": 1.8, "breathable": 2.0, "clean": 1.7,
  "superb": 3.1, "worth": 2.0, "recommend": 2.5, "love": 3.2,
  "loved": 3.2, "best": 3.2, "great": 2.8, "good": 1.9,
  "nice": 1.8, "snug": 1.5, "durable": 2.1, "high-quality": 2.7,
  "quality": 2.0, "beautiful": 2.6, "brilliant": 2.8, "happy": 2.2,
  "pleased": 2.0, "satisfied": 2.1, "fast": 1.6, "neat": 1.5,
  
  // Negative Lexicon & Intensity Scores
  "cheap": -2.1, "uncomfortable": -2.6, "dull": -1.8, "terrible": -3.2,
  "horrible": -3.4, "awful": -3.3, "loose": -1.5, "smaller": -1.3,
  "faded": -2.0, "damaged": -2.8, "overpriced": -2.5, "stuck": -1.9,
  "smells": -2.2, "bled": -2.4, "disappointed": -2.6, "bad": -2.3,
  "poor": -2.4, "worst": -3.5, "broken": -2.9, "dirty": -2.4,
  "chemical": -1.9, "thin": -1.4, "heavy": -1.2, "loose": -1.6,
  "defective": -2.9, "useless": -2.8, "flimsy": -2.1, "fake": -3.0
};

const NEGATIONS = new Set([
  "not", "never", "no", "neither", "nor", "hardly", "scarcely",
  "barely", "isnt", "wasnt", "shouldnt", "wouldnt", "couldnt",
  "dont", "doesnt", "didnt", "cant", "cannot", "without", "lack"
]);

const BOOSTERS = {
  "very": 0.35, "extremely": 0.45, "super": 0.4, "incredibly": 0.45,
  "really": 0.3, "absolutely": 0.4, "completely": 0.35, "totally": 0.35,
  "exceptionally": 0.45, "hugely": 0.3, "highly": 0.35, "slightly": -0.2,
  "barely": -0.25, "somewhat": -0.15, "hardly": -0.2
};

export function analyzeNLPSentimentSync(text) {
  if (!text || typeof text !== 'string') return 0.5;

  const rawWords = text.replace(/[^a-zA-Z0-9\s!?-]/g, '').split(/\s+/).filter(Boolean);
  if (rawWords.length === 0) return 0.5;

  let totalScore = 0;
  let wordCount = 0;
  let inButClause = false;

  for (let i = 0; i < rawWords.length; i++) {
    const rawWord = rawWords[i];
    const cleanWord = rawWord.toLowerCase();

    if (cleanWord === "but" || cleanWord === "however" || cleanWord === "although") {
      inButClause = true;
      continue;
    }

    if (cleanWord in VALENCE_LEXICON) {
      let valence = VALENCE_LEXICON[cleanWord];

      const isAllCaps = rawWord === rawWord.toUpperCase() && rawWord.length > 2;
      if (isAllCaps) {
        valence += valence > 0 ? 0.4 : -0.4;
      }

      let isNegated = false;
      let boosterDelta = 0;

      for (let lookback = 1; lookback <= 2; lookback++) {
        if (i - lookback >= 0) {
          const prevWord = rawWords[i - lookback].toLowerCase();
          if (NEGATIONS.has(prevWord)) {
            isNegated = true;
          }
          if (prevWord in BOOSTERS) {
            boosterDelta += BOOSTERS[prevWord];
          }
        }
      }

      if (valence > 0) {
        valence += boosterDelta;
      } else {
        valence -= boosterDelta;
      }

      if (isNegated) {
        valence = -0.74 * valence;
      }

      const clauseMultiplier = inButClause ? 1.5 : 0.75;
      valence *= clauseMultiplier;

      totalScore += valence;
      wordCount++;
    }
  }

  const exclamationCount = (text.match(/!/g) || []).length;
  if (exclamationCount > 0) {
    const boost = Math.min(exclamationCount * 0.15, 0.6);
    totalScore += totalScore >= 0 ? boost : -boost;
  }

  const alpha = 15;
  const compound = totalScore / Math.sqrt((totalScore * totalScore) + alpha);
  const normalizedScore = (compound + 1.0) / 2.0;

  return Number(Math.max(0.05, Math.min(0.98, normalizedScore)).toFixed(2));
}

export default { analyzeNLPSentiment, analyzeNLPSentimentSync, initMLModel };
