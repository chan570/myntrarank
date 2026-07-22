import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { seedDatabase } from './services/seedService.js';
import apiRoutes from './routes/api.js';

dotenv.config();

const app = express();//Express Application Object.
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());//Allow cross-origin requests.
app.use(express.json());//Express automatically parses JSON.

// API Routes
app.use('/api', apiRoutes);//Any request whose URL starts with /api should be handled by the router defined in routes/api.js.

// Health Endpoint
app.get('/', (req, res) => { //If this endpoint works,the backend is alive.

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

  // Start listening on port immediately so that Render detects an active port binding without delay
  app.listen(PORT, async () => {
    console.log(`\n🌐 Express REST API Server running live at: http://localhost:${PORT}`);
    console.log(`📡 Cloud API Endpoints Active:`);
    console.log(`   - Search API:  http://localhost:${PORT}/api/search?q=shirt`);
    console.log(`   - Stats API:   http://localhost:${PORT}/api/stats`);
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
