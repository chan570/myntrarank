const PRIOR_REVIEW_COUNT = 10;
const NEUTRAL_TRUST = 0.5;
const NEUTRAL_RATING = 3.5;

export function getReviewCount(product) {
  return Number(product.totalReviewsCount ?? product.auditedMetrics?.totalReviewsCount ?? product.reviews?.length ?? 0);
}

export function getEvidenceAdjustedTrust(product) {
  const count = getReviewCount(product);
  const raw = Number(product.compositeTrustScore ?? product.rankingExplanation?.trustScore ?? 0.5);
  const weight = count / (count + PRIOR_REVIEW_COUNT);
  return weight * raw + (1 - weight) * NEUTRAL_TRUST;
}

export function getEvidenceAdjustedRating(product) {
  const count = getReviewCount(product);
  const rating = Number(product.rawAvgRating ?? product.averageGenuineRating ?? 3.5);
  return (count * rating + PRIOR_REVIEW_COUNT * NEUTRAL_RATING) / (count + PRIOR_REVIEW_COUNT);
}

export function getRecommendedScore(product) {
  const relevance = Number(product.relevanceScore ?? 0);
  return 0.4 * relevance + 0.6 * getEvidenceAdjustedTrust(product);
}
