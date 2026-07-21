/**
 * TRUSTRANK AUDIT ENGINE (Simulated Apache Spark Batch Worker)
 * Implements DJB2 Hashing, Date Density Outlier Detection, Variance Audit, 
 * Exponential Half-Life Time Decay (T_half = 180d), and Real ML Transformer NLP Sentiment.
 */

import { analyzeNLPSentiment } from './nlpEngine.js';

// DJB2 Hash String Primitive
export function hashString(str) {
  if (!str || typeof str !== 'string') return '0';
  const cleaned = str.toLowerCase().replace(/[^a-z0-9]/g, '');
  let hash = 5381;
  for (let i = 0; i < cleaned.length; i++) {
    hash = ((hash << 5) + hash) + cleaned.charCodeAt(i);
    hash = hash & hash;
  }
  return (hash >>> 0).toString(16);
}

// Exponential Half-Life Time Decay Scorer
export function calculateTimeDecay(reviewDate, halfLifeDays = 180) {
  const now = Date.now();
  const dateMs = typeof reviewDate === 'number' ? reviewDate : new Date(reviewDate).getTime();
  const diffDays = Math.max(0, (now - dateMs) / (1000 * 60 * 60 * 24));
  const lambda = Math.LN2 / halfLifeDays;
  const weight = Math.exp(-lambda * diffDays);
  return Math.max(0.20, weight);
}

// ML Transformer NLP Sentiment Analysis
export async function calculateSentiment(text) {
  return await analyzeNLPSentiment(text);
}

// Multi-Pass Review Auditing Routine (Async for ML inference)
export async function auditProductReviews(reviews) {
  if (!reviews || !Array.isArray(reviews) || reviews.length === 0) {
    return {
      authenticityScore: 1.0,
      sentimentScore: 0.5,
      verifiedRatio: 0,
      richnessScore: 0,
      recencyScore: 0.2,
      ratingScore: 0.5,
      genuineRating: 0,
      validReviewsCount: 0,
      totalReviewsCount: 0,
      isLowReviewCount: true,
      auditedReviews: []
    };
  }

  const totalReviewsCount = reviews.length;
  if (totalReviewsCount < 10) {
    return {
      authenticityScore: 1.0,
      sentimentScore: 0.5,
      verifiedRatio: reviews.filter(r => r.verified).length / totalReviewsCount,
      richnessScore: 0.5,
      recencyScore: 0.5,
      ratingScore: reviews.reduce((a, r) => a + r.rating, 0) / (totalReviewsCount * 5),
      genuineRating: Number((reviews.reduce((a, r) => a + r.rating, 0) / totalReviewsCount).toFixed(1)),
      validReviewsCount: totalReviewsCount,
      totalReviewsCount,
      isLowReviewCount: true,
      auditedReviews: reviews
    };
  }

  // Pass 1: Deduplication via DJB2 Hashing
  const seenHashes = new Set();
  let duplicateCount = 0;
  const deduplicated = [];

  for (const r of reviews) {
    const textHash = hashString(r.text || '');
    if (textHash && seenHashes.has(textHash)) {
      duplicateCount++;
    } else {
      if (textHash) seenHashes.add(textHash);
      deduplicated.push(r);
    }
  }

  // Pass 2: Velocity Spike Anomaly Detection (Single-day density check)
  const dateCounts = {};
  for (const r of deduplicated) {
    const dateKey = new Date(r.date).toISOString().split('T')[0];
    dateCounts[dateKey] = (dateCounts[dateKey] || 0) + 1;
  }
  let maxSingleDayCount = 0;
  for (const k in dateCounts) {
    if (dateCounts[k] > maxSingleDayCount) maxSingleDayCount = dateCounts[k];
  }
  const isVelocitySpike = maxSingleDayCount >= 5 && (maxSingleDayCount / totalReviewsCount) > 0.30;
  const validReviews = isVelocitySpike ? deduplicated.filter(r => new Date(r.date).toISOString().split('T')[0] !== Object.keys(dateCounts).find(k => dateCounts[k] === maxSingleDayCount)) : deduplicated;

  // Pass 3: Rating Variance & Entropy Audit
  const ratings = validReviews.map(r => r.rating);
  const meanRating = ratings.reduce((a, b) => a + b, 0) / (ratings.length || 1);
  const variance = ratings.reduce((a, b) => a + Math.pow(b - meanRating, 2), 0) / (ratings.length || 1);
  const avgTextLen = validReviews.reduce((a, r) => a + (r.text ? r.text.length : 0), 0) / (validReviews.length || 1);
  const isLowVariance = variance < 0.05 && meanRating > 4.8 && avgTextLen < 40;

  // Authenticity Penalty Calculation
  let authPenalty = 0;
  if (duplicateCount > 0) authPenalty += Math.min(0.4, (duplicateCount / totalReviewsCount) * 0.8);
  if (isVelocitySpike) authPenalty += 0.35;
  if (isLowVariance) authPenalty += 0.35;
  const authenticityScore = Math.max(0.05, Number((1 - authPenalty).toFixed(2)));

  // Metric Computations
  let weightedRatingSum = 0;
  let totalDecayWeight = 0;
  let sentimentSum = 0;
  let verifiedCount = 0;
  let richnessSum = 0;

  for (const r of validReviews) {
    const decay = calculateTimeDecay(r.date);
    const sent = await calculateSentiment(r.text);
    const textLen = (r.text || '').split(/\s+/).filter(Boolean).length;
    const richness = Math.min(1.0, Math.log(textLen + 1) / Math.log(60)) + (r.images && r.images.length > 0 ? 0.2 : 0);

    weightedRatingSum += r.rating * decay;
    totalDecayWeight += decay;
    sentimentSum += sent;
    richnessSum += Math.min(1.0, richness);
    if (r.verified) verifiedCount++;
  }

  const validCount = validReviews.length;
  const genuineRating = totalDecayWeight > 0 ? Number((weightedRatingSum / totalDecayWeight).toFixed(1)) : 0;
  const sentimentScore = validCount > 0 ? Number((sentimentSum / validCount).toFixed(2)) : 0.5;
  const verifiedRatio = validCount > 0 ? Number((verifiedCount / validCount).toFixed(2)) : 0;
  const richnessScore = validCount > 0 ? Number((richnessSum / validCount).toFixed(2)) : 0;
  const recencyScore = validCount > 0 ? Number((totalDecayWeight / validCount).toFixed(2)) : 0.2;
  const ratingScore = Number((genuineRating / 5.0).toFixed(2));

  return {
    authenticityScore,
    sentimentScore,
    verifiedRatio,
    richnessScore,
    recencyScore,
    ratingScore,
    genuineRating,
    validReviewsCount: validCount,
    totalReviewsCount,
    isLowReviewCount: false
  };
}
