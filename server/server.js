import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import config from './config/env.js';
import { connectDB } from './config/db.js';
import { seedDatabase } from './services/seedService.js';
import apiRoutes from './routes/api.js';
import { errorHandler } from './middlewares/errorHandler.js';

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
  console.log(`\n======================================================`);
  console.log(`🚀 STARTING TRUSTRANK BACKEND MICROSERVICE GATEWAY`);
  console.log(`======================================================\n`);

  // Start listening on port immediately to guarantee instant Render port binding and deployment success
  app.listen(config.port, async () => {
    console.log(`\n🌐 Express REST API Server running live at: http://localhost:${config.port}`);
    console.log(`📡 Cloud API Endpoints Active:`);
    console.log(`   - Search API:  http://localhost:${config.port}/api/v1/search?q=shirt`);
    console.log(`   - Stats API:   http://localhost:${config.port}/api/v1/stats`);
    console.log(`======================================================\n`);

    // Run connection and seeding asynchronously in the background
    try {
      const isConnected = await connectDB();
      seedDatabase(!isConnected).then(() => {
        console.log(`📦 Seeding and OpenSearch initialization completed!`);
      }).catch(err => {
        console.warn(`⚠️ Seeding failure caught in background: ${err.message}`);
      });
    } catch (err) {
      console.warn(`⚠️ DB Boot failure caught in background: ${err.message}`);
    }
  });
}

startServer();
