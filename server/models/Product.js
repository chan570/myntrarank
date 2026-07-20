import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true, index: true },
  brand: { type: String, required: true, index: true },
  description: { type: String, default: '' },
  image: { type: String, required: true },
  price: { type: Number, required: true },
  originalPrice: { type: Number, required: true },
  discountPercent: { type: Number, required: true },
  category: { type: String, required: true, index: true },
  tags: [{ type: String, index: true }],
  anomalyType: { type: String, default: null },
  isSuspicious: { type: Boolean, default: false },

  // Pre-computed Audited Metrics Vector
  auditedMetrics: {
    authenticityScore: { type: Number, default: 1.0 },
    sentimentScore: { type: Number, default: 0.5 },
    verifiedRatio: { type: Number, default: 0.5 },
    richnessScore: { type: Number, default: 0.5 },
    recencyScore: { type: Number, default: 0.5 },
    ratingScore: { type: Number, default: 0.8 },
    genuineRating: { type: Number, default: 4.0 },
    validReviewsCount: { type: Number, default: 0 },
    totalReviewsCount: { type: Number, default: 0 },
    isLowReviewCount: { type: Boolean, default: false },
    isDirty: { type: Boolean, default: false }
  }
}, { timestamps: true });

export const Product = mongoose.models.Product /*if already exist*/|| mongoose.model('Product', productSchema); //if not exist
