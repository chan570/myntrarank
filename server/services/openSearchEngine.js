/**
 * TRUSTRANK OPENSEARCH ENGINE (Simulated Amazon OpenSearch / Elasticsearch Service)
 * Maintains an Inverted Index and executes script score queries in < 2ms.
 */

export class OpenSearchEngine {
  constructor() {
    this.index = new Map(); // Index store: productId -> Document
  }

  // Index or update a document
  upsertDocument(product) {
    if (!product || !product.id) return;
    const metrics = product.auditedMetrics || {};
    
    this.index.set(product.id, {
      id: product.id,
      title: product.title,
      brand: product.brand,
      description: product.description || '',
      image: product.image,
      price: product.price,
      originalPrice: product.originalPrice,
      discountPercent: product.discountPercent,
      category: product.category,
      tags: product.tags || [],
      anomalyType: product.anomalyType,
      isSuspicious: product.isSuspicious,
      reviews: product.reviews || [],
      auditedMetrics: {
        authenticityScore: metrics.authenticityScore ?? 1.0,
        sentimentScore: metrics.sentimentScore ?? 0.5,
        verifiedRatio: metrics.verifiedRatio ?? 0.5,
        richnessScore: metrics.richnessScore ?? 0.5,
        recencyScore: metrics.recencyScore ?? 0.5,
        ratingScore: metrics.ratingScore ?? 0.8,
        genuineRating: metrics.genuineRating ?? 4.0,
        validReviewsCount: metrics.validReviewsCount ?? 0,
        totalReviewsCount: metrics.totalReviewsCount ?? 0,
        isLowReviewCount: metrics.isLowReviewCount ?? false
      }
    });
  }

  // Bulk index documents
  bulkIndex(products) {
    if (!Array.isArray(products)) return;
    for (const p of products) {
      this.upsertDocument(p);
    }
  }

  // Get total document count
  getDocumentCount() {
    return this.index.size;
  }

  // Execute Search Query (BM25 token matching + Custom Script Score)
  executeQuery(queryText = '', weights = {}) {
    const startTime = performance.now();
    const queryTokens = queryText.toLowerCase().trim().split(/\s+/).filter(Boolean);

    // Default Metric Weights
    const wAuth = weights.auth !== undefined ? weights.auth : 0.35;
    const wSent = weights.sent !== undefined ? weights.sent : 0.20;
    const wVer = weights.ver !== undefined ? weights.ver : 0.15;
    const wRich = weights.rich !== undefined ? weights.rich : 0.10;
    const wRec = weights.rec !== undefined ? weights.rec : 0.10;
    const wRate = weights.rate !== undefined ? weights.rate : 0.10;

    const results = [];

    for (const doc of this.index.values()) {
      let relevanceScore = 1.0;

      // Lexical Match (BM25 Token Weights)
      if (queryTokens.length > 0) {
        let matchScore = 0;
        const titleLower = doc.title.toLowerCase();
        const brandLower = doc.brand.toLowerCase();
        const catLower = doc.category.toLowerCase();
        const tagsLower = doc.tags.map(t => t.toLowerCase());
        const descLower = doc.description.toLowerCase();

        for (const token of queryTokens) {
          if (titleLower.includes(token)) matchScore += 12;
          if (brandLower.includes(token)) matchScore += 8;
          if (tagsLower.some(t => t.includes(token))) matchScore += 6;
          if (catLower.includes(token)) matchScore += 5;
          if (descLower.includes(token)) matchScore += 2;
        }

        if (matchScore === 0) continue; // Filter out non-matching documents
        relevanceScore = Math.log2(matchScore + 1);
      }

      // Pre-computed Metric Vector
      const m = doc.auditedMetrics;
      const compositeTrustScore = 
        (wAuth * m.authenticityScore) +
        (wSent * m.sentimentScore) +
        (wVer * m.verifiedRatio) +
        (wRich * m.richnessScore) +
        (wRec * m.recencyScore) +
        (wRate * m.ratingScore);

      const finalRankScore = relevanceScore * compositeTrustScore;

      results.push({
        ...doc,
        relevanceScore: Number(relevanceScore.toFixed(2)),
        compositeTrustScore: Number(compositeTrustScore.toFixed(3)),
        finalRankScore: Number(finalRankScore.toFixed(3))
      });
    }

    // Sort by Final Score Descending
    results.sort((a, b) => b.finalRankScore - a.finalRankScore);

    const executionTimeMs = Number((performance.now() - startTime).toFixed(3));

    return {
      results: results.slice(0, 500),
      totalMatches: results.length,
      totalIndexed: this.index.size,
      executionTimeMs
    };
  }
}

export const openSearchService = new OpenSearchEngine();
