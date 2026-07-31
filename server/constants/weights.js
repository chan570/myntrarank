/**
/**
 * TRUSTRANK CONFIGURABLE WEIGHT CONSTANTS
 */

export const TRUST_WEIGHTS = {
  auth: 0.35,      // Weight for review authenticity (absence of spam/duplicates)
  sentiment: 0.20, // Weight for positive sentiment ratio
  verified: 0.15,  // Weight for verified purchase ratio
  richness: 0.10,  // Weight for word count & richness of review text
  recency: 0.10,   // Weight for review recency (exponential time decay)
  rating: 0.10     // Weight for customer star ratings
};

export const RANKING_WEIGHTS = {
  relevance: 0.40, // Match score boost
  trustScore: 0.30, // TrustRank composite integrity score
  rating: 0.15,     // Customer rating score
  recency: 0.15     // Recency decay score
};

export const TIME_DECAY_HALF_LIFE_DAYS = 180; // Configurable half-life
