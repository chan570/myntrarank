import dotenv from 'dotenv';
dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const defaultFrontendOrigin = 'http://localhost:5173';
const frontendOrigins = (process.env.FRONTEND_ORIGINS || process.env.FRONTEND_ORIGIN || defaultFrontendOrigin)
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);
const rawNlpServiceUrl = (process.env.NLP_SERVICE_URL || 'http://localhost:8000/api/v1').trim().replace(/\/+$/, '');
const nlpServiceUrlWithProtocol = /^https?:\/\//i.test(rawNlpServiceUrl)
  ? rawNlpServiceUrl
  : `http://${rawNlpServiceUrl}`;
const nlpServiceUrl = /\/api\/v1$/i.test(nlpServiceUrlWithProtocol)
  ? nlpServiceUrlWithProtocol
  : `${nlpServiceUrlWithProtocol}/api/v1`;
const cookieSameSite = (process.env.COOKIE_SAME_SITE || (nodeEnv === 'production' ? 'none' : 'lax')).toLowerCase();

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv,
  sessionCookieName: 'trustrank_session',
  frontendOrigins,
  cookieSameSite: ['strict', 'lax', 'none'].includes(cookieSameSite) ? cookieSameSite : 'lax',
  opensearchNode: process.env.OPENSEARCH_NODE || 'http://localhost:9200',
  opensearchUsername: process.env.OPENSEARCH_USERNAME || '',
  opensearchPassword: process.env.OPENSEARCH_PASSWORD || '',
  hfToken: process.env.HF_TOKEN || '',
  hfSentimentModel: process.env.HF_SENTIMENT_MODEL || 'cardiffnlp/twitter-roberta-base-sentiment-latest',
  nlpServiceUrl,
  rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
  rateLimitMax: 100 // Limit each IP to 100 requests per windowMs
};

export default config;
