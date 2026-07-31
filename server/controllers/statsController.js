import mongoose from 'mongoose';
import { openSearchService } from '../services/openSearchEngine.js';

export class StatsController {
  constructor(searchService = openSearchService) {
    this.searchService = searchService;
  }

  getStats = async (req, res, next) => {
    try {
      const indexedCount = await this.searchService.getDocumentCount();
      const dbConnected = mongoose.connection && mongoose.connection.readyState === 1;

      res.json({
        status: 'online',
        appName: 'TrustRank Enterprise Microservice',
        cloudServices: {
          database: dbConnected ? 'MongoDB Atlas Cloud' : 'In-Memory DB Engine',
          searchIndex: 'Amazon OpenSearch Service',
          auditWorker: 'Apache Spark on AWS EMR'
        },
        metrics: {
          indexedProducts: indexedCount,
          serverTimestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  };
}

export const statsController = new StatsController();
export default statsController;
