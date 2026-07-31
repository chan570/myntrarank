import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trustrank',
  opensearchNode: process.env.OPENSEARCH_NODE || 'http://localhost:9200',
  nlpServiceUrl: process.env.NLP_SERVICE_URL || 'http://localhost:8000/api/v1',
  rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
  rateLimitMax: 100 // Limit each IP to 100 requests per windowMs
};

export default config;
