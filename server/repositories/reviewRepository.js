import { Review } from '../models/Review.js';

export class ReviewRepository {
  async findByProductId(productId) {
    return Review.find({ productId }).lean();
  }

  async countByProductId(productId) {
    return Review.countDocuments({ productId });
  }

  async save(reviewData) {
    const review = new Review(reviewData);
    return review.save();
  }

  async saveMany(reviews) {
    return Review.insertMany(reviews, { ordered: false });
  }
}

export const reviewRepository = new ReviewRepository();
export default reviewRepository;
