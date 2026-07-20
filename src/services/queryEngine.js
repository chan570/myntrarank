import { searchIndex } from './searchIndex';
import { calculateRelevance } from '../utils/rankingEngine';

class QueryEngine {
  // Simulates real-time search query execution & script scoring on pre-computed search documents
  searchAndScore(query, options = {}) {
    const startTime = performance.now();
    
    const {
      weightAuthenticity = 0.35,
      weightSentiment = 0.20,
      weightVerified = 0.15,
      weightRichness = 0.10,
      weightRecency = 0.10,
      weightRating = 0.10,
      removeSuspicious = true,
      filterLowReviews = true,
      minRating = 0,
      categoryFilter = "All"
    } = options;

    // Get pre-filtered documents from the search index (simulating cluster retrieval)
    const candidates = searchIndex.getDocsByCategory(categoryFilter);
    const matchedDocs = [];
    let maxRelevance = 0;

    // Phase 1: Keyword Token Relevance calculation (on-the-fly search query parsing)
    for (const doc of candidates) {
      const relevanceScore = calculateRelevance(doc, query);
      
      // If user queried a word, relevance must match to return candidate
      if (query && query.trim() !== "" && relevanceScore <= 0) {
        continue;
      }

      if (relevanceScore > maxRelevance) {
        maxRelevance = relevanceScore;
      }

      matchedDocs.push({
        ...doc,
        rawRelevance: relevanceScore
      });
    }

    const finalRanks = [];

    // Phase 2: Elasticsearch Script Score Execution
    // Calculates score in O(N) using cached precalculated review parameters
    for (const doc of matchedDocs) {
      const pre = doc.precomputed;

      // Rule: Filter out products with fewer than 10 reviews if option enabled
      if (filterLowReviews && pre.totalReviewsCount < 10) {
        continue;
      }

      // Skip products flagged as suspicious if filter active
      if (removeSuspicious && doc.isSuspicious) {
        continue;
      }

      // Filter by average genuine rating
      if (minRating > 0 && pre.averageGenuineRating < minRating) {
        continue;
      }

      // Normalize query relevance score
      let normalizedRelevance = 1.0;
      if (query && query.trim() !== "") {
        normalizedRelevance = maxRelevance > 0 ? doc.rawRelevance / maxRelevance : 0;
      }

      // Calculate script score
      const scriptScore = 
        (weightAuthenticity * pre.authenticityScore) +
        (weightSentiment * pre.sentimentScore) +
        (weightVerified * pre.verifiedRatio) +
        (weightRichness * pre.richnessScore) +
        (weightRecency * pre.recencyScore) +
        (weightRating * pre.ratingScore);

      // Relevance acts as score multiplier
      const finalRankingScore = normalizedRelevance * scriptScore;

      finalRanks.push({
        ...doc,
        relevanceScore: normalizedRelevance,
        // Map precomputed metrics flat for UI compatibility
        rawAvgRating: pre.rawAvgRating,
        averageGenuineRating: pre.averageGenuineRating,
        genuineCount: pre.genuineCount,
        totalReviewsCount: pre.totalReviewsCount,
        authenticityScore: pre.authenticityScore,
        sentimentScore: pre.sentimentScore,
        verifiedRatio: pre.verifiedRatio,
        richnessScore: pre.richnessScore,
        recencyScore: pre.recencyScore,
        ratingScore: pre.ratingScore,
        finalRankingScore,
        isFlaggedAsFake: doc.isSuspicious,
        flaggedDuplicateCount: doc.reviews.filter(r => r.isDuplicate).length,
        flaggedSpikeCount: doc.reviews.filter(r => r.isSpiked).length
      });
    }

    // Sort by final score descending
    finalRanks.sort((a, b) => b.finalRankingScore - a.finalRankingScore);

    const queryTime = (performance.now() - startTime).toFixed(2);

    return {
      results: finalRanks,
      queryTime,
      candidateCount: candidates.length,
      matchedCount: matchedDocs.length,
      returnedCount: finalRanks.length
    };
  }
}

export const queryEngine = new QueryEngine();
export default queryEngine;
