/** Sentiment gateway: Hugging Face Inference when HF_TOKEN is configured,
 * otherwise the local FastAPI transformer service used for development. */
import config from '../config/env.js';
import { MLServiceError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const MAX_BATCH_SIZE = 128;
const REQUEST_TIMEOUT_MS = 45000;
const HF_URL = `https://router.huggingface.co/hf-inference/models/${config.hfSentimentModel}`;

async function postJson(url, body, headers = {}, timeout = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

function scoreFromLabels(labels) {
  if (!Array.isArray(labels)) throw new Error('Sentiment provider returned an unexpected response.');
  const values = Object.fromEntries(labels.map(({ label, score }) => [String(label).toLowerCase(), Number(score)]));
  const negative = values.negative ?? values.label_0;
  const neutral = values.neutral ?? values.label_1;
  const positive = values.positive ?? values.label_2;
  if (![negative, neutral, positive].every(Number.isFinite)) {
    throw new Error('Sentiment response did not contain negative, neutral, and positive scores.');
  }
  return Math.max(0, Math.min(1, positive + (neutral * 0.5)));
}

async function analyzeWithHuggingFace(text) {
  const response = await postJson(HF_URL, {
    inputs: text,
    parameters: { function_to_apply: 'softmax', top_k: 3 }
  }, { Authorization: `Bearer ${config.hfToken}` });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 400);
    throw new Error(`Hugging Face returned HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
  }
  const payload = await response.json();
  // Text-classification responses are normally [[{label, score}, ...]].
  const labels = Array.isArray(payload?.[0]) ? payload[0] : payload;
  return scoreFromLabels(labels);
}

async function analyzeWithLocalService(text) {
  const response = await postJson(`${config.nlpServiceUrl}/predict`, { text });
  if (!response.ok) throw new Error(`Local sentiment service returned HTTP ${response.status}.`);
  const data = await response.json();
  if (data?.status !== 'success' || !Number.isFinite(Number(data.score))) {
    throw new Error('Local sentiment service returned an invalid response.');
  }
  return Number(data.score);
}

export async function analyzeNLPSentiment(text) {
  if (!text || typeof text !== 'string' || !text.trim()) return 0.5;
  try {
    return config.hfToken
      ? await analyzeWithHuggingFace(text.trim())
      : await analyzeWithLocalService(text.trim());
  } catch (err) {
    logger.error(`[NLP] Sentiment analysis failed: ${err.message}`);
    throw new MLServiceError(`Sentiment analysis failed: ${err.message}`);
  }
}

export async function analyzeNLPSentimentBatch(texts) {
  if (!Array.isArray(texts) || texts.length === 0) return [];
  const scores = [];
  for (let offset = 0; offset < texts.length; offset += MAX_BATCH_SIZE) {
    const chunk = texts.slice(offset, offset + MAX_BATCH_SIZE);
    if (!config.hfToken) {
      try {
        const response = await postJson(`${config.nlpServiceUrl}/predict/batch`, {
          reviews: chunk.map((text, index) => ({ id: String(offset + index), text }))
        });
        if (!response.ok) throw new Error(`Local sentiment service returned HTTP ${response.status}.`);
        const data = await response.json();
        if (data?.status !== 'success' || !Array.isArray(data.predictions) || data.predictions.length !== chunk.length) {
          throw new Error('Local sentiment service returned an invalid batch response.');
        }
        scores.push(...data.predictions.map((item) => Number(item.score)));
      } catch (err) {
        throw new MLServiceError(`Batch sentiment analysis failed: ${err.message}`);
      }
      continue;
    }

    // Hugging Face's text-classification endpoint accepts one text per call.
    // Keep concurrency modest to avoid overwhelming the free inference quota.
    for (let i = 0; i < chunk.length; i += 4) {
      const group = chunk.slice(i, i + 4);
      try {
        scores.push(...await Promise.all(group.map((text) => analyzeWithHuggingFace(text))));
      } catch (err) {
        logger.error(`[NLP] Batch sentiment analysis failed: ${err.message}`);
        throw new MLServiceError(`Batch sentiment analysis failed: ${err.message}`);
      }
    }
  }
  return scores;
}

export default { analyzeNLPSentiment, analyzeNLPSentimentBatch };
