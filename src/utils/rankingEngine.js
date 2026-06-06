// E-commerce Search Ranking Engine with Review Intelligence

const POSITIVE_WORDS = new Set([
  "great", "love", "loved", "good", "nice", "excellent", "perfect", "awesome", 
  "amazing", "beautiful", "premium", "comfortable", "best", "superb", "worth", 
  "highly", "clean", "neat", "soft", "breathable", "cushion", "happy", "fine"
]);

const NEGATIVE_WORDS = new Set([
  "bad", "poor", "worst", "terrible", "cheap", "thin", "uncomfortable", "loose", 
  "small", "fade", "faded", "broke", "broken", "chemical", "disappointed", 
  "expensive", "overpriced", "hate", "damaged", "stuck", "ugly", "refund"
]);

// Run sentiment analysis on review text
export function analyzeSentiment(text) {
  if (!text) return 0.5; // Neutral
  const words = text.toLowerCase().match(/[a-z]+/g) || [];
  if (words.length === 0) return 0.5;

  let posCount = 0;
  let negCount = 0;

  for (const word of words) {
    if (POSITIVE_WORDS.has(word)) posCount++;
    else if (NEGATIVE_WORDS.has(word)) negCount++;
  }

  // Score between -1 and 1
  const score = (posCount - negCount) / (posCount + negCount + 1);
  // Normalize to [0, 1]
  return (score + 1) / 2;
}

// Calculate time-decay factor (exponential decay with 180 days half-life)
// Current timestamp - review timestamp in days
export function calculateTimeDecay(reviewDate, currentTimestamp) {
  const diffTime = Math.max(0, currentTimestamp - reviewDate);
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  
  // Lambda for 180 days half-life: ln(2) / 180 = 0.00385
  const lambda = 0.00385;
  const decay = Math.exp(-lambda * diffDays);
  
  // Floor decay at 0.2 so old reviews still hold minor value
  return Math.max(0.2, decay);
}

// Score a review's richness based on word count (logarithmic scale) and image presence
export function calculateRichness(text, hasImages) {
  if (!text) return 0;
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  // Log scale: wordCount=0 -> 0, wordCount=100 -> ~1.0
  const wordRichness = Math.min(1.0, Math.log(wordCount + 1) / Math.log(60));
  
  // Image bonus
  const imageBonus = hasImages ? 0.2 : 0;
  
  return Math.min(1.0, wordRichness + imageBonus);
}

// Perform query relevance scoring
// Matching query words to title, brand, description, and tags
export function calculateRelevance(product, query) {
  if (!query || query.trim() === "") return 1.0;
  
  const queryTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (queryTerms.length === 0) return 1.0;

  let score = 0;
  const title = product.title.toLowerCase();
  const brand = product.brand.toLowerCase();
  const description = product.description.toLowerCase();
  const category = product.category.toLowerCase();
  const tags = product.tags.map(t => t.toLowerCase());

  for (const term of queryTerms) {
    let termMatch = false;

    if (title.includes(term)) {
      score += 12.0; // Primary weight
      termMatch = true;
    }
    if (brand.includes(term)) {
      score += 8.0;
      termMatch = true;
    }
    if (category.includes(term)) {
      score += 5.0;
      termMatch = true;
    }
    if (tags.some(tag => tag.includes(term))) {
      score += 6.0;
      termMatch = true;
    }
    if (description.includes(term)) {
      score += 2.0;
      termMatch = true;
    }

    // If query term has no matches anywhere, penalize relevance
    if (!termMatch) {
      score -= 2.0;
    }
  }

  // Ensure score is positive
  return Math.max(0, score);
}

// Process and rank the list of products
export function rankProducts(products, query, options = {}) {
  const {
    weightAuthenticity = 0.35,
    weightSentiment = 0.20,
    weightVerified = 0.15,
    weightRichness = 0.10,
    weightRecency = 0.10,
    weightRating = 0.10,
    removeSuspicious = true,
    minRating = 0,
    categoryFilter = "All"
  } = options;

  const currentTimestamp = Date.now();
  const processedProducts = [];

  // Step 1: Pre-calculate product matches and relevance scores
  let maxRelevance = 0;
  const matchedProducts = [];

  for (const product of products) {
    // Category Filter
    if (categoryFilter !== "All" && product.category !== categoryFilter) {
      continue;
    }

    // Relevance Score calculation
    const relevanceScore = calculateRelevance(product, query);
    
    // If user searched for something, relevance must be > 0 to display
    if (query && query.trim() !== "" && relevanceScore <= 0) {
      continue;
    }

    if (relevanceScore > maxRelevance) {
      maxRelevance = relevanceScore;
    }

    matchedProducts.push({
      ...product,
      rawRelevance: relevanceScore
    });
  }

  // Step 2: Evaluate review intelligence details for each product
  for (const product of matchedProducts) {
    const rawReviews = product.reviews || [];
    
    // Rule: Filter out products with fewer than 10 reviews
    if (rawReviews.length < 10) {
      continue;
    }

    // Duplicate detection map
    const seenReviewsText = new Set();
    const duplicateReviewIds = new Set();
    
    // Spike detection map (date -> count)
    const dateCounts = {};
    const MS_PER_DAY = 24 * 60 * 60 * 1000;

    // First pass: detect duplicate text and count reviews per day
    for (const r of rawReviews) {
      const normalizedText = r.text.trim().toLowerCase().replace(/\s+/g, " ");
      if (normalizedText.length > 5 && seenReviewsText.has(normalizedText)) {
        duplicateReviewIds.add(r.id);
      } else if (normalizedText.length > 5) {
        seenReviewsText.add(normalizedText);
      }

      // Group reviews by calendar date
      const dateKey = new Date(r.date).toDateString();
      dateCounts[dateKey] = (dateCounts[dateKey] || 0) + 1;
    }

    // Identify spiked days (e.g., if > 5 reviews on a single day and that day has > 30% of total reviews)
    const spikedDates = new Set();
    for (const [dateKey, count] of Object.entries(dateCounts)) {
      if (count > 5 && count / rawReviews.length > 0.3) {
        spikedDates.add(dateKey);
      }
    }

    // Check for abnormal rating distributions (entropy / variance test)
    // E.g., overly perfect ratings with low diversity (perfect 5 stars with no rating variance)
    let totalGenuineRating = 0;
    let genuineCount = 0;
    const genuineRatingsList = [];
    
    let verifiedCount = 0;
    let totalSentiment = 0;
    let totalRichness = 0;
    let totalRecency = 0;
    
    let flaggedDuplicateCount = 0;
    let flaggedSpikeCount = 0;
    
    const analyzedReviews = [];

    // Second pass: score and flag individual reviews
    for (const r of rawReviews) {
      let isDuplicate = duplicateReviewIds.has(r.id);
      const dateKey = new Date(r.date).toDateString();
      let isSpiked = spikedDates.has(dateKey);
      
      const sentiment = analyzeSentiment(r.text);
      const richness = calculateRichness(r.text, r.images && r.images.length > 0);
      const recency = calculateTimeDecay(r.date, currentTimestamp);

      if (isDuplicate) flaggedDuplicateCount++;
      if (isSpiked && !isDuplicate) flaggedSpikeCount++;

      const isSuspicious = isDuplicate || isSpiked;

      // Analyze review
      analyzedReviews.push({
        ...r,
        sentiment,
        richness,
        recency,
        isDuplicate,
        isSpiked,
        isSuspicious
      });

      // Genuine metrics calculations (penalize suspicious items by excluding or lowering weight)
      if (!isSuspicious) {
        genuineCount++;
        totalGenuineRating += r.rating;
        genuineRatingsList.push(r.rating);

        if (r.verified) verifiedCount++;
        
        // Verified reviews carry 1.5x weight in sentiment/richness aggregates
        const w = r.verified ? 1.5 : 1.0;
        totalSentiment += sentiment * w;
        totalRichness += richness * w;
        totalRecency += recency * w;
      }
    }

    // Abnormal distribution penalty calculation
    // Calculate rating variance of genuine reviews
    let variance = 0;
    let averageGenuineRating = 0;
    if (genuineCount > 0) {
      averageGenuineRating = totalGenuineRating / genuineCount;
      const squaredDiffs = genuineRatingsList.map(r => Math.pow(r - averageGenuineRating, 2));
      variance = squaredDiffs.reduce((a, b) => a + b, 0) / genuineCount;
    }

    let ratingDistributionSuspicious = false;
    // Anomaly: Standard deviation is zero (or near 0), average rating is perfect 5.0, and reviews are short
    if (genuineCount >= 10 && variance < 0.05 && averageGenuineRating > 4.8) {
      // Check average length of reviews
      const avgLen = analyzedReviews.reduce((sum, r) => sum + (r.text ? r.text.length : 0), 0) / analyzedReviews.length;
      if (avgLen < 40) {
        ratingDistributionSuspicious = true;
      }
    }

    // Aggregate Product Scores
    const totalReviews = rawReviews.length;
    const flaggedSuspiciousCount = flaggedDuplicateCount + flaggedSpikeCount;
    
    // Authenticity ratio [0, 1]
    let authenticityScore = totalReviews > 0 ? (totalReviews - flaggedSuspiciousCount) / totalReviews : 1.0;
    if (ratingDistributionSuspicious) {
      authenticityScore = Math.max(0.05, authenticityScore * 0.3); // Severe penalty
    }

    // Sentiment score [0, 1]
    const weightedDenominator = analyzedReviews.filter(r => !r.isSuspicious).reduce((sum, r) => sum + (r.verified ? 1.5 : 1.0), 0);
    const sentimentScore = weightedDenominator > 0 ? totalSentiment / weightedDenominator : 0.5;

    // Verified purchase ratio
    const verifiedRatio = genuineCount > 0 ? verifiedCount / genuineCount : 0;

    // Richness score
    const richnessScore = weightedDenominator > 0 ? totalRichness / weightedDenominator : 0;

    // Recency score
    const recencyScore = weightedDenominator > 0 ? totalRecency / weightedDenominator : 0.2;

    // Star rating score (normalized to [0, 1])
    const rawAvgRating = totalReviews > 0 ? rawReviews.reduce((s, r) => s + r.rating, 0) / totalReviews : 0;
    const ratingScore = averageGenuineRating > 0 ? (averageGenuineRating - 1) / 4 : 0;

    // Normalize relevance score relative to maximum relevance matching the query
    let normalizedRelevance = 1.0;
    if (query && query.trim() !== "") {
      normalizedRelevance = maxRelevance > 0 ? product.rawRelevance / maxRelevance : 0;
    }

    // Apply ranking weights
    const combinedSignals = 
      (weightAuthenticity * authenticityScore) +
      (weightSentiment * sentimentScore) +
      (weightVerified * verifiedRatio) +
      (weightRichness * richnessScore) +
      (weightRecency * recencyScore) +
      (weightRating * ratingScore);

    // Final sorting score
    const finalRankingScore = normalizedRelevance * combinedSignals;

    const isFlaggedAsFake = authenticityScore < 0.65 || ratingDistributionSuspicious || product.isSuspicious;

    // Filter out if user selected "Remove Suspicious" and product is flagged as fake
    if (removeSuspicious && isFlaggedAsFake) {
      continue;
    }

    // Filter by rating if applied
    if (rawAvgRating < minRating && averageGenuineRating < minRating) {
      continue;
    }

    processedProducts.push({
      ...product,
      reviews: analyzedReviews,
      rawAvgRating,
      averageGenuineRating,
      genuineCount,
      totalReviewsCount: totalReviews,
      relevanceScore: normalizedRelevance,
      authenticityScore,
      sentimentScore,
      verifiedRatio,
      richnessScore,
      recencyScore,
      ratingScore,
      finalRankingScore,
      isFlaggedAsFake,
      flaggedDuplicateCount,
      flaggedSpikeCount,
      ratingDistributionSuspicious
    });
  }

  // Step 3: Sort by final ranking score descending
  processedProducts.sort((a, b) => b.finalRankingScore - a.finalRankingScore);

  // Return only top 500 products
  return processedProducts.slice(0, 500);
}
