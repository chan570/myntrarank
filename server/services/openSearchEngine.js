/**
 * TRUSTRANK AMAZON OPENSEARCH SERVICE
 * Direct integration with Amazon OpenSearch / Elasticsearch REST DSL.
 * Pure execution path with no local in-memory fallbacks.
 */

import { Client } from '@opensearch-project/opensearch';
import { TRUST_WEIGHTS, RANKING_WEIGHTS } from '../constants/weights.js';

const INDEX_NAME = 'myntrarank_products';
const OPENSEARCH_NODE = process.env.OPENSEARCH_NODE || 'http://localhost:9200';

export class OpenSearchEngine {
  constructor() {
    this.client = new Client({
      node: OPENSEARCH_NODE,
      requestTimeout: 10000
    });
    this.initPromise = null;
  }

  // Verify and initialize index mapping (throws error on failure)
  async init() {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      console.log(`[OpenSearch Engine] Connecting to Amazon OpenSearch / Elasticsearch cluster at ${OPENSEARCH_NODE}...`);
      const pingRes = await this.client.ping();
      if (!pingRes) {
        throw new Error(`Could not ping OpenSearch cluster at ${OPENSEARCH_NODE}`);
      }
      console.log(`[OpenSearch Engine] Connected to OpenSearch Cluster successfully.`);

      const indexExists = await this.client.indices.exists({ index: INDEX_NAME });
      if (!indexExists.body) {
        await this.client.indices.create({
          index: INDEX_NAME,
          body: {
            mappings: {
              properties: {
                id: { type: 'keyword' },
                title: { type: 'text', analyzer: 'standard' },
                brand: { type: 'keyword' },
                description: { type: 'text' },
                category: { type: 'keyword' },
                tags: { type: 'keyword' },
                price: { type: 'float' },
                originalPrice: { type: 'float' },
                discountPercent: { type: 'float' },
                anomalyType: { type: 'keyword' },
                isSuspicious: { type: 'boolean' },
                auditedMetrics: {
                  properties: {
                    authenticityScore: { type: 'double' },
                    sentimentScore: { type: 'double' },
                    verifiedRatio: { type: 'double' },
                    richnessScore: { type: 'double' },
                    recencyScore: { type: 'double' },
                    ratingScore: { type: 'double' },
                    genuineRating: { type: 'double' },
                    validReviewsCount: { type: 'integer' },
                    totalReviewsCount: { type: 'integer' },
                    isLowReviewCount: { type: 'boolean' }
                  }
                }
              }
            }
          }
        });
        console.log(`[OpenSearch Engine] Created index '${INDEX_NAME}' with custom metric mapping.`);
      }
    })();

    return this.initPromise;
  }

  // Get single document by ID
  async getDocument(id) {
    await this.init();
    const res = await this.client.get({ index: INDEX_NAME, id });
    return res.body._source;
  }

  // Get all documents
  async getAllDocuments() {
    await this.init();
    const res = await this.client.search({
      index: INDEX_NAME,
      body: { size: 1000, query: { match_all: {} } }
    });
    const hits = res.body.hits.hits || [];
    return hits.map(h => h._source);
  }

  // Get total document count
  async getDocumentCount() {
    await this.init();
    const res = await this.client.count({ index: INDEX_NAME });
    return res.body.count;
  }

  // Insert or update a single document
  async upsertDocument(product) {
    if (!product || !product.id) return;
    await this.init();

    const metrics = product.auditedMetrics || {};
    const doc = {
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
    };

    await this.client.index({
      index: INDEX_NAME,
      id: product.id,
      body: doc,
      refresh: true
    });
  }

  // Bulk index documents
  async bulkIndex(products) {
    if (!Array.isArray(products) || products.length === 0) return;
    await this.init();

    const body = products.flatMap(p => {
      const metrics = p.auditedMetrics || {};
      return [
        { index: { _index: INDEX_NAME, _id: p.id } },
        {
          id: p.id,
          title: p.title,
          brand: p.brand,
          description: p.description || '',
          image: p.image,
          price: p.price,
          originalPrice: p.originalPrice,
          discountPercent: p.discountPercent,
          category: p.category,
          tags: p.tags || [],
          anomalyType: p.anomalyType,
          isSuspicious: p.isSuspicious,
          reviews: p.reviews || [],
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
        }
      ];
    });

    await this.client.bulk({ body, refresh: true });
  }

  // Autocomplete Query Engine
  async autocomplete(queryText = '') {
    await this.init();
    const query = queryText.trim().toLowerCase();
    if (!query) return [];

    const response = await this.client.search({
      index: INDEX_NAME,
      body: {
        size: 8,
        query: {
          match_phrase_prefix: {
            title: query
          }
        }
      }
    });
    const hits = response.body.hits.hits || [];
    return hits.map(h => ({
      id: h._source.id,
      title: h._source.title,
      brand: h._source.brand,
      category: h._source.category
    }));
  }

  // Execute Search Query (DSL + Painless Script Scoring + Explanation)
  async executeQuery(queryText = '', weights = {}, filters = {}) {
    const startTime = performance.now();
    await this.init();

    // Configure TrustRank weights from input params or defaults
    const wAuth = weights.auth !== undefined ? weights.auth : TRUST_WEIGHTS.auth;
    const wSent = weights.sent !== undefined ? weights.sent : TRUST_WEIGHTS.sentiment;
    const wVer = weights.ver !== undefined ? weights.ver : TRUST_WEIGHTS.verified;
    const wRich = weights.rich !== undefined ? weights.rich : TRUST_WEIGHTS.rich;
    const wRec = weights.rec !== undefined ? weights.rec : TRUST_WEIGHTS.rec;
    const wRate = weights.rate !== undefined ? weights.rate : TRUST_WEIGHTS.rating;

    const {
      removeSuspicious = false,
      filterLowReviews = false,
      minRating = 0,
      categoryFilter = 'All'
    } = filters;

    // DSL Search Engine Path
    const queryTokens = queryText.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const baseMatch = queryTokens.length > 0 ? {
      multi_match: {
        query: queryText,
        fields: ['title^12', 'brand^8', 'tags^6', 'category^5', 'description^2']
      }
    } : { match_all: {} };

    const mustFilters = [];
    if (categoryFilter && categoryFilter !== 'All') {
      mustFilters.push({ term: { category: categoryFilter } });
    }
    if (filterLowReviews) {
      mustFilters.push({ range: { 'auditedMetrics.totalReviewsCount': { gte: 10 } } });
    }
    if (minRating > 0) {
      mustFilters.push({ range: { 'auditedMetrics.genuineRating': { gte: minRating } } });
    }
    if (removeSuspicious) {
      mustFilters.push({ term: { isSuspicious: false } });
      mustFilters.push({ range: { 'auditedMetrics.authenticityScore': { gte: 0.60 } } });
    }

    const filteredQuery = mustFilters.length > 0 ? {
      bool: {
        must: [baseMatch, ...mustFilters]
      }
    } : baseMatch;

    // Advanced Painless Script Score using SDE weights & search score
    const searchBody = {
      size: 500,
      query: {
        script_score: {
          query: filteredQuery,
          script: {
            source: `
              double auth = doc['auditedMetrics.authenticityScore'].value;
              double sent = doc['auditedMetrics.sentimentScore'].value;
              double ver = doc['auditedMetrics.verifiedRatio'].value;
              double rich = doc['auditedMetrics.richnessScore'].value;
              double rec = doc['auditedMetrics.recencyScore'].value;
              double rate = doc['auditedMetrics.ratingScore'].value;
              
              double trust = (params.wAuth * auth) + (params.wSent * sent) + (params.wVer * ver) + (params.wRich * rich) + (params.wRec * rec) + (params.wRate * rate);
              
              // Normalize score base
              double relevance = _score / 10.0;
              if (relevance > 1.0) relevance = 1.0;
              
              // SDE Composite Ranking Score
              return (params.rRel * relevance) + (params.rTr * trust) + (params.rRate * rate) + (params.rRec * rec);
            `,
            params: { 
              wAuth, wSent, wVer, wRich, wRec, wRate,
              rRel: RANKING_WEIGHTS.relevance,
              rTr: RANKING_WEIGHTS.trustScore,
              rRate: RANKING_WEIGHTS.rating,
              rRec: RANKING_WEIGHTS.recency
            }
          }
        }
      }
    };

    const response = await this.client.search({
      index: INDEX_NAME,
      body: searchBody
    });

    const hits = response.body.hits.hits || [];
    const results = hits.map(hit => {
      const doc = hit._source;
      const finalScore = hit._score || 1.0;
      const m = doc.auditedMetrics || {};
      const authScore = m.authenticityScore ?? 1.0;
      const isFake = doc.isSuspicious || authScore < 0.60 || (doc.anomalyType && doc.anomalyType !== 'low_review_count');

      const trustScore = (wAuth * authScore) + 
                         (wSent * (m.sentimentScore ?? 0.5)) + 
                         (wVer * (m.verifiedRatio ?? 0.8)) + 
                         (wRich * (m.richnessScore ?? 0.5)) + 
                         (wRec * (m.recencyScore ?? 0.5)) + 
                         (wRate * (m.ratingScore ?? 0.8));

      const queryRelevance = Math.min(1.0, (finalScore - (RANKING_WEIGHTS.trustScore * trustScore)) / RANKING_WEIGHTS.relevance);

      const rankingExplanation = {
        relevanceScore: Number(queryRelevance.toFixed(2)),
        trustScore: Number(trustScore.toFixed(3)),
        ratingScore: Number((m.ratingScore ?? 0.8).toFixed(2)),
        recencyScore: Number((m.recencyScore ?? 0.5).toFixed(2)),
        weights: RANKING_WEIGHTS,
        text: `Overall SDE Rank: ${finalScore.toFixed(3)} (Relevance Match: ${queryRelevance.toFixed(1)} [W: 40%], Trust Rank: ${trustScore.toFixed(2)} [W: 30%], Genuine Rating: ${(m.ratingScore ?? 0.8).toFixed(2)} [W: 15%], Time Decay: ${(m.recencyScore ?? 0.5).toFixed(2)} [W: 15%])`
      };

      return {
        ...doc,
        authenticityScore: authScore,
        rawAvgRating: m.genuineRating ?? 4.0,
        totalReviewsCount: m.totalReviewsCount ?? (doc.reviews ? doc.reviews.length : 0),
        isFlaggedAsFake: isFake,
        isSuspicious: isFake,
        relevanceScore: Number(queryRelevance.toFixed(2)),
        compositeTrustScore: Number(authScore.toFixed(3)),
        finalRankScore: Number(finalScore.toFixed(3)),
        rankingExplanation
      };
    });

    return {
      engine: 'Amazon OpenSearch Cluster (DSL + Painless Script Scoring)',
      results,
      totalMatches: results.length,
      totalIndexed: response.body.hits.total.value || results.length,
      executionTimeMs: Number((performance.now() - startTime).toFixed(3))
    };
  }
}

export const openSearchService = new OpenSearchEngine();
export default openSearchService;
