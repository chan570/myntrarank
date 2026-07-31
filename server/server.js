import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import config from './config/env.js';
import { connectDB } from './config/db.js';
import { seedDatabase } from './services/seedService.js';
import apiRoutes from './routes/api.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { logger } from './utils/logger.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swaggerSpec.js';

const app = express();

// Secure backend with Helmet security headers
app.use(helmet());

// Configure Cross-Origin Resource Sharing (CORS)
app.use(cors({
  origin: '*', // In production, customize this to allow only trust domains
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url} - IP: ${req.ip}`);
  next();
});

// API Documentation UI
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API Routes
app.use('/api', apiRoutes);

// Base health status check
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'TrustRank Enterprise Microservice Gateway',
    version: '1.0.0',
    documentation: 'GET /api/v1/search, POST /api/v1/reviews, POST /api/v1/admin/audit'
  });
});

// Centralized error handling middleware (handles all next(err) downstream exceptions)
app.use(errorHandler);

// Boot Sequence
async function startServer() {
  logger.info('STARTING TRUSTRANK BACKEND MICROSERVICE GATEWAY...');

  // Start listening on port immediately to guarantee instant Render port binding and deployment success
  const server = app.listen(config.port, async () => {
    logger.info(`Express REST API Server running live at: http://localhost:${config.port}`);
    logger.info(`Cloud API Endpoints Active:`);
    logger.info(`   - Search API:  http://localhost:${config.port}/api/v1/search?q=shirt`);
    logger.info(`   - Stats API:   http://localhost:${config.port}/api/v1/stats`);

    // Run connection and seeding asynchronously in the background
    try {
      const isConnected = await connectDB();
      seedDatabase(!isConnected).then(() => {
        logger.info('Seeding and OpenSearch initialization completed!');
      }).catch(err => {
        logger.warn(`Seeding failure caught in background: ${err.message}`);
      });
    } catch (err) {
      logger.warn(`DB Boot failure caught in background: ${err.message}`);
    }
  });

  // Graceful Shutdown Handler
  const gracefulShutdown = async (signal) => {
    logger.info(`Received ${signal}. Shutting down server gracefully...`);
    server.close(async () => {
      logger.info('HTTP server closed.');
      try {
        const mongoose = await import('mongoose');
        await mongoose.default.connection.close();
        logger.info('Database connection closed.');
        process.exit(0);
      } catch (err) {
        logger.error(`Error closing database connection: ${err.message}`);
        process.exit(1);
      }
    });

    setTimeout(() => {
      logger.error('Forced shutdown due to timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

startServer();
