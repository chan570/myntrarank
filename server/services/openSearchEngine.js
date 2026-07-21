/**
 * TRUSTRANK PURE AMAZON OPENSEARCH ENGINE
 * Official @opensearch-project/opensearch SDK integration.
 * Performs real OpenSearch indexing, Painless script_score queries, and document updates.
 */

import { Client } from '@opensearch-project/opensearch';

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

  // Ensure index & Painless script metric mapping exists in OpenSearch
  async init() {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      console.log(`[OpenSearch Engine] Connecting to Amazon OpenSearch / Elasticsearch cluster at ${OPENSEARCH_NODE}...`);
      const pingRes = await this.client.ping();
      if (!pingRes) {
        throw new Error(`Could not ping OpenSearch cluster at ${OPENSEARCH_NODE}`);
      }
      console.log(`[OpenSearch Engine] ✅ Connected to Amazon OpenSearch Cluster!`);

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

  // Index or update a document directly in OpenSearch cluster
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

  // Bulk index documents directly into OpenSearch
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

    await this.client.bulk({ refresh: true, body });
    console.log(`[OpenSearch Engine] Bulk indexed ${products.length} documents into OpenSearch cluster.`);
  }

  // Get single document from OpenSearch
  async getDocument(id) {
    await this.init();
    try {
      const res = await this.client.get({ index: INDEX_NAME, id });
      return res.body._source;
    } catch (err) {
      return null;
    }
  }

  // Get all documents from OpenSearch
  async getAllDocuments() {
    await this.init();
    try {
      const res = await this.client.search({
        index: INDEX_NAME,
        body: {
          size: 10000,
          query: { match_all: {} }
        }
      });
      const hits = res.body.hits.hits || [];
      return hits.map(h => h._source);
    } catch (err) {
      return [];
    }
  }

  // Total document count in OpenSearch
  async getDocumentCount() {
    await this.init();
    const res = await this.client.count({ index: INDEX_NAME });
    return res.body.count;
  }

  // Execute Search Query (Pure Amazon OpenSearch DSL + Painless Script Scoring)
  async executeQuery(queryText = '', weights = {}) {
    const startTime = performance.now();
    await this.init();

    const wAuth = weights.auth !== undefined ? weights.auth : 0.35;
    const wSent = weights.sent !== undefined ? weights.sent : 0.20;
    const wVer = weights.ver !== undefined ? weights.ver : 0.15;
    const wRich = weights.rich !== undefined ? weights.rich : 0.10;
    const wRec = weights.rec !== undefined ? weights.rec : 0.10;
    const wRate = weights.rate !== undefined ? weights.rate : 0.10;

    const queryTokens = queryText.toLowerCase().trim().split(/\s+/).filter(Boolean);
    
    const baseQuery = queryTokens.length > 0 ? {
      multi_match: {
        query: queryText,
        fields: ['title^12', 'brand^8', 'tags^6', 'category^5', 'description^2']
      }
    } : { match_all: {} };

    // Native OpenSearch Painless Script Score Query
    const searchBody = {
      size: 500,
      query: {
        script_score: {
          query: baseQuery,
          script: {
            source: `
              double auth = doc['auditedMetrics.authenticityScore'].value;
              double sent = doc['auditedMetrics.sentimentScore'].value;
              double ver = doc['auditedMetrics.verifiedRatio'].value;
              double rich = doc['auditedMetrics.richnessScore'].value;
              double rec = doc['auditedMetrics.recencyScore'].value;
              double rate = doc['auditedMetrics.ratingScore'].value;
              
              double trustScore = (params.wAuth * auth) + (params.wSent * sent) + (params.wVer * ver) + (params.wRich * rich) + (params.wRec * rec) + (params.wRate * rate);
              return _score * trustScore;
            `,
            params: { wAuth, wSent, wVer, wRich, wRec, wRate }
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
      const score = hit._score || 1.0;
      const m = doc.auditedMetrics || {};
      const authScore = m.authenticityScore ?? 1.0;
      const isFake = doc.isSuspicious || authScore < 0.60 || (doc.anomalyType && doc.anomalyType !== 'low_review_count');

      return {
        ...doc,
        authenticityScore: authScore,
        rawAvgRating: m.genuineRating ?? 4.0,
        totalReviewsCount: m.totalReviewsCount ?? (doc.reviews ? doc.reviews.length : 0),
        isFlaggedAsFake: isFake,
        isSuspicious: isFake,
        relevanceScore: Number(score.toFixed(2)),
        compositeTrustScore: Number(authScore.toFixed(3)),
        finalRankScore: Number(score.toFixed(3))
      };
    });

    const executionTimeMs = Number((performance.now() - startTime).toFixed(3));
    return {
      engine: 'Amazon OpenSearch Cluster (DSL + Painless Script Scoring)',
      results,
      totalMatches: results.length,
      totalIndexed: response.body.hits.total.value || results.length,
      executionTimeMs
    };
  }
}

export const openSearchService = new OpenSearchEngine();
export default openSearchService;
