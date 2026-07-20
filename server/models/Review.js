import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  productId: { type: String, required: true, index: true },
  reviewerName: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  text: { type: String, default: '' },
  verified: { type: Boolean, default: false },
  date: { type: Number, required: true },
  images: [{ type: String }],
  
  // Audited Flags
  auditFlags: {
    textHash: { type: String, default: '' },
    isDuplicate: { type: Boolean, default: false },
    isVelocitySpike: { type: Boolean, default: false },
    isLowVariance: { type: Boolean, default: false },
    timeDecayWeight: { type: Number, default: 1.0 },
    sentimentScore: { type: Number, default: 0.5 }
  }
}, { timestamps: true });

export const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);
