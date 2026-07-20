import { generateProducts } from '../data/mockProducts.js';

class MockDatabase {
  constructor() {
    this.rawProducts = [];
    this.reset();
  }

  // Reset database to initial state generated deterministically
  reset() {
    this.rawProducts = generateProducts();
  }

  // Get all raw products
  getAll() {
    return this.rawProducts;
  }

  // Get a single product by ID
  getProduct(id) {
    return this.rawProducts.find(p => p.id === id) || null;
  }

  // Inject a single user review
  addReview(productId, review) {
    const product = this.getProduct(productId);
    if (!product) return false;
    
    product.reviews.unshift({
      id: `rev-user-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      ...review
    });
    return true;
  }

  // Inject a coordinated spam/bot review attack on a specific product
  injectBotAttack(productId, options = {}) {
    const product = this.getProduct(productId);
    if (!product) return false;

    const {
      rating = 5,
      text = "Amazing quality product! Recommended to everyone, buy it now!",
      count = 15,
      isVerified = false
    } = options;

    const currentTimestamp = Date.now();
    const reviewerNames = [
      "BotAccountA", "BotAccountB", "BotAccountC", "BotAccountD", "BotAccountE",
      "ClickFarmUser1", "ClickFarmUser2", "ClickFarmUser3", "ClickFarmUser4",
      "PaidReviewerX", "PaidReviewerY", "PaidReviewerZ"
    ];

    // Inject identical reviews posted on the exact same timestamp to create a clear anomaly signature
    for (let i = 0; i < count; i++) {
      product.reviews.unshift({
        id: `rev-bot-${currentTimestamp}-${i}`,
        reviewerName: reviewerNames[i % reviewerNames.length] + `_${Math.floor(Math.random()*100)}`,
        rating,
        text,
        verified: isVerified,
        date: currentTimestamp,
        images: []
      });
    }

    product.isSuspicious = true;
    product.anomalyType = "injected_bot_attack";
    return true;
  }
}

export const mockDatabase = new MockDatabase();
export default mockDatabase;
