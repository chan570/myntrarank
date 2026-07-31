import { openSearchService } from '../services/openSearchEngine.js';

export class SearchController {
  constructor(searchService = openSearchService) {
    this.searchService = searchService;
  }

  search = async (req, res, next) => {
    try {
      const query = req.query.q || '';
      const weights = {
        auth: req.query.auth ? parseFloat(req.query.auth) : 0.35,
        sent: req.query.sent ? parseFloat(req.query.sent) : 0.20,
        ver: req.query.ver ? parseFloat(req.query.ver) : 0.15,
        rich: req.query.rich ? parseFloat(req.query.rich) : 0.10,
        rec: req.query.rec ? parseFloat(req.query.rec) : 0.10,
        rate: req.query.rate ? parseFloat(req.query.rate) : 0.10,
      };

      const filters = {
        removeSuspicious: req.query.removeSuspicious === 'true',
        filterLowReviews: req.query.filterLowReviews === 'true',
        minRating: req.query.minRating ? parseFloat(req.query.minRating) : 0,
        categoryFilter: req.query.category || 'All'
      };

      const searchResponse = await this.searchService.executeQuery(query, weights, filters);
      
      res.json({
        status: 'success',
        cloudService: 'Amazon OpenSearch Service',
        data: searchResponse
      });
    } catch (error) {
      next(error);
    }
  };

  autocomplete = async (req, res, next) => {
    try {
      const query = req.query.q || '';
      const response = await this.searchService.autocomplete(query);
      res.json({
        status: 'success',
        data: response
      });
    } catch (error) {
      next(error);
    }
  };
}

export const searchController = new SearchController();
export default searchController;
