import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { seedDatabase } from './services/seedService.js';
import apiRoutes from './routes/api.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', apiRoutes);

// Health Endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'TrustRank Enterprise Microservice Gateway',
    version: '1.0.0',
    documentation: 'GET /api/search, POST /api/reviews, POST /api/admin/audit'
  });
});

// Boot Sequence
async function startServer() {
  console.log(`\n======================================================`);
  console.log(`🚀 STARTING TRUSTRANK BACKEND MICROSERVICE GATEWAY`);
  console.log(`======================================================\n`);

  const isConnected = await connectDB();
  await seedDatabase(!isConnected);

  app.listen(PORT, () => {
    console.log(`\n🌐 Express REST API Server running live at: http://localhost:${PORT}`);
    console.log(`📡 Cloud API Endpoints Active:`);
    console.log(`   - Search API:  http://localhost:${PORT}/api/search?q=shirt`);
    console.log(`   - Stats API:   http://localhost:${PORT}/api/stats`);
    console.log(`======================================================\n`);
  });
}

startServer();
