/**
 * TRUSTRANK AUDIT & SPAM DETECTION ENGINE
 * Enterprise review verification pipeline. Performs cryptographic hash-based
 * deduplication, vocabulary diversity analysis (Type-Token Ratio), velocity
 * spike detection, rating anomaly audits, and configures spam scores per review.
 */

import { analyzeNLPSentiment, analyzeNLPSentimentSync } from './nlpEngine.js';
import { TRUST_WEIGHTS, TIME_DECAY_HALF_LIFE_DAYS } from '../constants/weights.js';

// DJB2 Hash String Primitive for fast duplicate checks
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
export function calculateTimeDecay(reviewDate, halfLifeDays = TIME_DECAY_HALF_LIFE_DAYS) {
  const now = Date.now();
  const dateMs = typeof reviewDate === 'number' ? reviewDate : new Date(reviewDate).getTime();
  const diffDays = Math.max(0, (now - dateMs) / (1000 * 60 * 60 * 24));
  const lambda = Math.LN2 / halfLifeDays;
  const weight = Math.exp(-lambda * diffDays);
  return Math.max(0.20, weight);
}

// Calculate Vocabulary Diversity (Type-Token Ratio)
export function calculateTypeTokenRatio(text) {
  if (!text || typeof text !== 'string') return 1.0;
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
  if (words.length === 0) return 1.0;
  const uniqueWords = new Set(words);
  return Number((uniqueWords.size / words.length).toFixed(3));
}

// Count sequential repeated words (e.g. "very very very")
export function countRepeatedWords(text) {
  if (!text || typeof text !== 'string') return 0;
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
  let repeats = 0;
  for (let i = 0; i < words.length - 1; i++) {
    if (words[i] === words[i + 1]) {
      repeats++;
    }
  }
  return repeats;
}

const SPAM_KEYWORDS = [
  "best product ever", "must buy", "amazing fabric", "five stars",
  "free product", "discount code", "click here", "buy now",
  "sponsored review", "work from home", "make money"
];

// Audit single review and return spam statistics
export function auditSingleReview(review, allReviews, velocitySpikeDates) {
  const text = review.text || '';
  const reasons = [];
  let spamPoints = 0.0;

  // 1. Duplicate Text Detection
  const textHash = hashString(text);
  const duplicates = allReviews.filter(r => r.id !== review.id && hashString(r.text) === textHash);
  if (duplicates.length > 0) {
    reasons.push('duplicate_text');
    spamPoints += 0.50;
  }

  // 2. Vocabulary Diversity Check (TTR)
  const ttr = calculateTypeTokenRatio(text);
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  if (wordCount > 6 && ttr < 0.65) {
    reasons.push('low_vocabulary_diversity');
    spamPoints += 0.25;
  }

  // 3. Repeated Words Check
  const repeatedWords = countRepeatedWords(text);
  if (repeatedWords > 2) {
    reasons.push('repeated_words');
    spamPoints += 0.20;
  }

  // 4. Too Short Check
  if (wordCount > 0 && wordCount < 5) {
    reasons.push('very_short_review');
    spamPoints += 0.15;
  }

  // 5. Spam Keywords Matching
  const cleanText = text.toLowerCase();
  const matchedKeywords = SPAM_KEYWORDS.filter(kw => cleanText.includes(kw));
  if (matchedKeywords.length > 0) {
    reasons.push('spam_keywords_detected');
    spamPoints += 0.30;
  }

  // 6. Review Velocity Spike Check
  const dateKey = new Date(review.date).toISOString().split('T')[0];
  if (velocitySpikeDates.has(dateKey)) {
    reasons.push('velocity_spike_anomaly');
    spamPoints += 0.25;
  }

  // 7. Rating Anomaly (Verified purchase status combined with 5-star rating)
  if (review.rating === 5 && !review.verified) {
    reasons.push('unverified_5_star');
    spamPoints += 0.10;
  }

  const spamScore = Number(Math.max(0.0, Math.min(1.0, spamPoints)).toFixed(3));
  
  // Confidence calculation based on number of trigger reasons
  let confidence = 0.50;
  if (reasons.length > 0) {
    confidence = Math.min(0.98, 0.50 + (reasons.length * 0.15));
  }

  return {
    spamScore,
    reasons,
    confidence: Number(confidence.toFixed(3))
  };
}

// Multi-Pass Review Auditing Routine
export async function auditProductReviews(reviews, useSyncSentiment = false) {
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

  // Pass 1: Pre-calculate velocity spikes dates
  const dateCounts = {};
  for (const r of reviews) {
    const dateKey = new Date(r.date).toISOString().split('T')[0];
    dateCounts[dateKey] = (dateCounts[dateKey] || 0) + 1;
  }
  const velocitySpikeDates = new Set();
  for (const k in dateCounts) {
    // Flag dates where there are at least 5 reviews and represents > 30% of total reviews
    if (dateCounts[k] >= 5 && (dateCounts[k] / totalReviewsCount) > 0.30) {
      velocitySpikeDates.add(k);
    }
  }

  // Pass 2: Audit each review individually
  const auditedReviews = reviews.map(r => {
    const auditRes = auditSingleReview(r, reviews, velocitySpikeDates);
    return {
      ...r,
      spamScore: auditRes.spamScore,
      reasons: auditRes.reasons,
      confidence: auditRes.confidence
    };
  });

  // Calculate Product Authenticity Score
  const avgSpamScore = auditedReviews.reduce((sum, r) => sum + r.spamScore, 0) / totalReviewsCount;
  const authenticityScore = Number((1.0 - avgSpamScore).toFixed(3));

  // Pass 3: Process valid reviews (spamScore < 0.60) to calculate aggregates
  const validReviews = auditedReviews.filter(r => r.spamScore < 0.60);
  const validCount = validReviews.length;

  let weightedRatingSum = 0;
  let totalDecayWeight = 0;
  let sentimentSum = 0;
  let verifiedCount = 0;
  let richnessSum = 0;

  for (const r of validReviews) {
    const decay = calculateTimeDecay(r.date);
    const sent = useSyncSentiment ? analyzeNLPSentimentSync(r.text) : await analyzeNLPSentiment(r.text);
    const textLen = (r.text || '').split(/\s+/).filter(Boolean).length;
    const richness = Math.min(1.0, Math.log(textLen + 1) / Math.log(60)) + (r.images && r.images.length > 0 ? 0.2 : 0);

    weightedRatingSum += r.rating * decay;
    totalDecayWeight += decay;
    sentimentSum += sent;
    richnessSum += Math.min(1.0, richness);
    if (r.verified) verifiedCount++;
  }

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
    isLowReviewCount: totalReviewsCount < 10,
    auditedReviews
  };
}

export default { auditProductReviews, calculateTimeDecay, calculateTypeTokenRatio };
