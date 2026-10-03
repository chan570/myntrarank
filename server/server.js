import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import config from './config/env.js';
import { openSearchService } from './services/openSearchEngine.js';
import apiRoutes from './routes/api.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { logger } from './utils/logger.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swaggerSpec.js';

const app = express();
app.use(helmet());
app.use(cors({
  origin: config.frontendOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
}));
app.use(express.json({ limit: '32kb' }));
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url} - IP: ${req.ip}`);
  next();
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api', apiRoutes);
app.get('/health/ready', async (req, res) => {
  try {
    const indexedProducts = await openSearchService.getDocumentCount();
    res.json({ status: 'ready', indexedProducts });
  } catch {
    res.status(503).json({ status: 'not_ready' });
  }
});
app.get('/', (req, res) => res.json({
  status: 'online',
  service: 'TrustRank review ranking API',
  version: '2.0.0',
  readiness: '/health/ready',
  documentation: '/api/docs',
}));
app.use(errorHandler);

async function startServer() {
  await openSearchService.init();
  const server = app.listen(config.port, () => {
    logger.info(`TrustRank API ready at http://localhost:${config.port}`);
  });

  const gracefulShutdown = (signal) => {
    logger.info(`Received ${signal}; closing HTTP server.`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

startServer().catch((error) => {
  logger.error(`Backend startup failed: ${error.message}`);
  process.exitCode = 1;
});
