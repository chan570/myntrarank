import { searchIndex } from './searchIndex';
import { analyzeSentiment, calculateRichness, calculateTimeDecay } from '../utils/rankingEngine';

// Fast DJB2 hash for string fingerprinting
function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16); // return unsigned hex string
}

class OfflinePipeline {
  constructor() {
    this.logs = [];
  }

  // Trigger simulated batch processing job
  runBatchJob(rawProducts) {
    const startTime = performance.now();
    const timestampString = new Date().toLocaleTimeString();
    
    this.logs = [];
    this.log(`INFO`, `Starting offline Spark batch analysis job...`);
    this.log(`INFO`, `Scanning database table 'raw_reviews' (Size: ${rawProducts.length} products)...`);

    const currentTimestamp = Date.now();
    const indexedDocuments = [];
    let totalReviewsProcessed = 0;
    let duplicateSpamFound = 0;
    let velocitySpikesFound = 0;
    let filteredLowReviewProducts = 0;
    let totalFlaggedProducts = 0;

    for (const product of rawProducts) {
      const rawReviews = product.reviews || [];
      totalReviewsProcessed += rawReviews.length;
      
      const hasLowReviews = rawReviews.length < 10;
      if (hasLowReviews) {
        filteredLowReviewProducts++;
      }

      // Step 2: Run Review Integrity Audit
      const seenHashes = new Set();
      const duplicateIds = new Set();
      const dateCounts = {};

      for (const r of rawReviews) {
        // Clean text and generate hash
        const cleanText = r.text.trim().toLowerCase().replace(/\s+/g, " ");
        if (cleanText.length > 5) {
          const textHash = hashString(cleanText);
          if (seenHashes.has(textHash)) {
            duplicateIds.add(r.id);
          } else {
            seenHashes.add(textHash);
          }
        }

        // Group by calendar day
        const dateKey = new Date(r.date).toDateString();
        dateCounts[dateKey] = (dateCounts[dateKey] || 0) + 1;
      }

      // Identify velocity spikes
      const spikedDates = new Set();
      for (const [dateKey, count] of Object.entries(dateCounts)) {
        if (count > 5 && count / rawReviews.length > 0.3) {
          spikedDates.add(dateKey);
        }
      }

      let flaggedDuplicatesThisProduct = 0;
      let flaggedSpikesThisProduct = 0;
      const analyzedReviews = [];

      let genuineCount = 0;
      let totalGenuineRating = 0;
      const genuineRatingsList = [];

      let verifiedGenuineCount = 0;
      let totalSentiment = 0;
      let totalRichness = 0;
      let totalRecency = 0;

      for (const r of rawReviews) {
        const isDuplicate = duplicateIds.has(r.id);
        const dateKey = new Date(r.date).toDateString();
        const isSpiked = spikedDates.has(dateKey);
        
        const sentiment = analyzeSentiment(r.text);
        const richness = calculateRichness(r.text, r.images && r.images.length > 0);
        const recency = calculateTimeDecay(r.date, currentTimestamp);

        if (isDuplicate) flaggedDuplicatesThisProduct++;
        if (isSpiked && !isDuplicate) flaggedSpikesThisProduct++;

        const isSuspicious = isDuplicate || isSpiked;

        analyzedReviews.push({
          ...r,
          sentiment,
          richness,
          recency,
          isDuplicate,
          isSpiked,
          isSuspicious
        });

        // Compute precalculated metrics only from genuine (non-flagged) reviews
        if (!isSuspicious) {
          genuineCount++;
          totalGenuineRating += r.rating;
          genuineRatingsList.push(r.rating);

          if (r.verified) verifiedGenuineCount++;

          // Verified reviews carry 1.5x weight in aggregated stats
          const w = r.verified ? 1.5 : 1.0;
          totalSentiment += sentiment * w;
          totalRichness += richness * w;
          totalRecency += recency * w;
        }
      }

      duplicateSpamFound += flaggedDuplicatesThisProduct;
      velocitySpikesFound += flaggedSpikesThisProduct;

      // Entropy / low-variance rating audit
      let variance = 0;
      let averageGenuineRating = 0;
      if (genuineCount > 0) {
        averageGenuineRating = totalGenuineRating / genuineCount;
        const squaredDiffs = genuineRatingsList.map(r => Math.pow(r - averageGenuineRating, 2));
        variance = squaredDiffs.reduce((a, b) => a + b, 0) / genuineCount;
      }

      let ratingDistributionSuspicious = false;
      if (genuineCount >= 10 && variance < 0.05 && averageGenuineRating > 4.8) {
        const avgLen = analyzedReviews.reduce((sum, r) => sum + (r.text ? r.text.length : 0), 0) / analyzedReviews.length;
        if (avgLen < 40) {
          ratingDistributionSuspicious = true;
        }
      }

      // Compile final precomputed stats
      const totalReviews = rawReviews.length;
      const flaggedSuspiciousCount = flaggedDuplicatesThisProduct + flaggedSpikesThisProduct;

      let authenticityScore = totalReviews > 0 ? (totalReviews - flaggedSuspiciousCount) / totalReviews : 1.0;
      if (ratingDistributionSuspicious) {
        authenticityScore = Math.max(0.05, authenticityScore * 0.3); // Apply severe rating farm penalty
      }

      const weightedDenominator = analyzedReviews.filter(r => !r.isSuspicious).reduce((sum, r) => sum + (r.verified ? 1.5 : 1.0), 0);
      const sentimentScore = weightedDenominator > 0 ? totalSentiment / weightedDenominator : 0.5;
      const verifiedRatio = genuineCount > 0 ? verifiedGenuineCount / genuineCount : 0;
      const richnessScore = weightedDenominator > 0 ? totalRichness / weightedDenominator : 0;
      const recencyScore = weightedDenominator > 0 ? totalRecency / weightedDenominator : 0.2;
      const ratingScore = averageGenuineRating > 0 ? (averageGenuineRating - 1) / 4 : 0;

      const isFlaggedAsFake = authenticityScore < 0.65 || ratingDistributionSuspicious || product.isSuspicious;

      if (isFlaggedAsFake) {
        totalFlaggedProducts++;
        if (flaggedDuplicatesThisProduct > 0) {
          this.log(`WARN`, `prod-id [${product.id}] flagged: Found ${flaggedDuplicatesThisProduct} duplicate bot reviews. Authenticity score: ${Math.round(authenticityScore*100)}%`);
        }
        if (flaggedSpikesThisProduct > 0) {
          this.log(`WARN`, `prod-id [${product.id}] flagged: Velocity spike detected (${flaggedSpikesThisProduct} reviews on single day).`);
        }
        if (ratingDistributionSuspicious) {
          this.log(`WARN`, `prod-id [${product.id}] flagged: Anomaly detected - zero rating variance (perfect 5.0 with low review length).`);
        }
      }

      // Cache document structure with precomputed properties (exactly matching a search index schema)
      indexedDocuments.push({
        id: product.id,
        title: product.title,
        brand: product.brand,
        description: product.description,
        image: product.image,
        price: product.price,
        originalPrice: product.originalPrice,
        discountPercent: product.discountPercent,
        category: product.category,
        tags: product.tags,
        reviews: analyzedReviews, // Keep reviews inside for detailed client-side drawer inspection
        isSuspicious: isFlaggedAsFake,
        precomputed: {
          authenticityScore,
          sentimentScore,
          verifiedRatio,
          richnessScore,
          recencyScore,
          ratingScore,
          averageGenuineRating,
          rawAvgRating: totalReviews > 0 ? rawReviews.reduce((s, r) => s + r.rating, 0) / totalReviews : 0,
          totalReviewsCount: totalReviews,
          genuineCount
        }
      });
    }

    // Load precomputed documents into the Search Index
    searchIndex.loadIndex(indexedDocuments);

    const timeElapsed = (performance.now() - startTime).toFixed(1);
    this.log(`INFO`, `Synchronized ${indexedDocuments.length} precomputed documents to Elasticsearch index.`);
    this.log(`INFO`, `Filtered out ${filteredLowReviewProducts} products with low review velocity (<10 reviews).`);
    this.log(`INFO`, `Audited ${totalReviewsProcessed} reviews: Flagged ${duplicateSpamFound} duplicate scripts & ${velocitySpikesFound} spike anomalies.`);
    this.log(`SUCCESS`, `Offline batch compiler sync complete in ${timeElapsed}ms! Index is active.`);

    return {
      timeElapsed,
      duplicateSpamFound,
      velocitySpikesFound,
      filteredLowReviewProducts,
      totalFlaggedProducts,
      logs: this.logs
    };
  }

  log(level, message) {
    const timestamp = new Date().toLocaleTimeString();
    this.logs.push(`[${timestamp}] [${level}] ${message}`);
  }

  getLogs() {
    return this.logs;
  }
}

export const offlinePipeline = new OfflinePipeline();
export default offlinePipeline;
