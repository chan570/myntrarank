import dotenv from 'dotenv';
dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv,
  sessionCookieName: 'trustrank_session',
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  opensearchNode: process.env.OPENSEARCH_NODE || 'http://localhost:9200',
  nlpServiceUrl: process.env.NLP_SERVICE_URL || 'http://localhost:8000/api/v1',
  rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
  rateLimitMax: 100 // Limit each IP to 100 requests per windowMs
};

export default config;
