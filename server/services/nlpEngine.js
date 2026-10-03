/**
 * TRUSTRANK NLP SENTIMENT GATEWAY
 * Direct connection to the Python FastAPI transformer sentiment service.
 * Implements request timeouts and retry logic with exponential backoff.
 */

import config from '../config/env.js';
import { MLServiceError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const MAX_RETRIES = 3;
const MAX_BATCH_SIZE = 128; // Must match the FastAPI BatchReviewPayload limit.
const INITIAL_BACKOFF_MS = 200;
const TIMEOUT_MS = 3000; // 3 seconds timeout per request
const BATCH_TIMEOUT_MS = 120000; // CPU transformer inference can take longer for full batches.

async function fetchWithTimeout(url, options, timeout = TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Perform Sentiment Analysis using the FastAPI ML Service.
 * Implements exponential backoff retry policies.
 */
export async function analyzeNLPSentiment(text) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) return 0.5;

  const url = `${config.nlpServiceUrl}/predict`;
  let attempt = 1;
  let delay = INITIAL_BACKOFF_MS;

  while (attempt <= MAX_RETRIES) {
    try {
      logger.debug(`[NLP Client] Fetching sentiment (Attempt ${attempt}/${MAX_RETRIES})...`);
      const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      }, TIMEOUT_MS);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data && data.status === 'success') {
        return data.score; // Expected polarity score in the range [0, 1].
      }
      throw new Error("Malformed response format received from ML service.");
    } catch (err) {
      logger.warn(`[NLP Client] Attempt ${attempt} failed: ${err.message}`);
      if (attempt === MAX_RETRIES) {
        throw new MLServiceError(`FastAPI ML service unreachable after ${MAX_RETRIES} attempts. Details: ${err.message}`);
      }
      
      // Delay using exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
      attempt++;
    }
  }
}

async function analyzeNLPSentimentBatchChunk(texts, offset) {
  const url = `${config.nlpServiceUrl}/predict/batch`;
  const reviews = texts.map((text, index) => ({ id: String(offset + index), text }));
  
  let attempt = 1;
  let delay = INITIAL_BACKOFF_MS;

  while (attempt <= MAX_RETRIES) {
    try {
      logger.debug(`[NLP Client] Fetching batch sentiment for ${texts.length} items (Attempt ${attempt}/${MAX_RETRIES})...`);
      const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviews })
      }, BATCH_TIMEOUT_MS);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data && data.status === 'success' && data.predictions) {
        if (data.predictions.length !== texts.length) {
          throw new Error(`Expected ${texts.length} sentiment predictions, received ${data.predictions.length}.`);
        }
        return data.predictions.map(p => p.score);
      }
      throw new Error("Malformed response format received from ML service.");
    } catch (err) {
      logger.warn(`[NLP Client] Batch Attempt ${attempt} failed: ${err.message}`);
      if (attempt === MAX_RETRIES) {
        throw new MLServiceError(`FastAPI ML service unreachable after ${MAX_RETRIES} attempts. Details: ${err.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
      attempt++;
    }
  }
}

export async function analyzeNLPSentimentBatch(texts) {
  if (!texts || !Array.isArray(texts) || texts.length === 0) return [];

  const scores = [];
  for (let offset = 0; offset < texts.length; offset += MAX_BATCH_SIZE) {
    const chunk = texts.slice(offset, offset + MAX_BATCH_SIZE);
    scores.push(...await analyzeNLPSentimentBatchChunk(chunk, offset));
  }
  return scores;
}

export default { analyzeNLPSentiment };
