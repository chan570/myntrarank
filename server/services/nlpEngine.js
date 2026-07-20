/**
 * TRUSTRANK VADER NLP SENTIMENT ENGINE
 * Advanced rule-augmented NLP sentiment analysis implementing:
 * 1. Lexicon Valence Scores (-4.0 to +4.0)
 * 2. Negation Handling ("not bad", "never good", "hardly comfortable")
 * 3. Booster/Dampener Words ("very", "extremely", "slightly")
 * 4. Capitalization & Punctuation Intensity ("GREAT!!!", "AMAZING")
 * 5. Contrastive Conjunction Weighting ("good quality, but expensive")
 */

const VALENCE_LEXICON = {
  // Positive Lexicon & Intensity Scores
  "amazing": 3.4, "excellent": 3.2, "awesome": 3.1, "outstanding": 3.5,
  "comfortable": 2.4, "comfy": 2.2, "premium": 2.5, "stylish": 2.1,
  "perfect": 3.0, "soft": 1.8, "breathable": 2.0, "clean": 1.7,
  "superb": 3.1, "worth": 2.0, "recommend": 2.5, "love": 3.2,
  "loved": 3.2, "best": 3.2, "great": 2.8, "good": 1.9,
  "nice": 1.8, "snug": 1.5, "durable": 2.1, "high-quality": 2.7,
  "quality": 2.0, "beautiful": 2.6, "brilliant": 2.8, "happy": 2.2,
  "pleased": 2.0, "satisfied": 2.1, "fast": 1.6, "neat": 1.5,
  
  // Negative Lexicon & Intensity Scores
  "cheap": -2.1, "uncomfortable": -2.6, "dull": -1.8, "terrible": -3.2,
  "horrible": -3.4, "awful": -3.3, "loose": -1.5, "smaller": -1.3,
  "faded": -2.0, "damaged": -2.8, "overpriced": -2.5, "stuck": -1.9,
  "smells": -2.2, "bled": -2.4, "disappointed": -2.6, "bad": -2.3,
  "poor": -2.4, "worst": -3.5, "broken": -2.9, "dirty": -2.4,
  "chemical": -1.9, "thin": -1.4, "heavy": -1.2, "loose": -1.6,
  "defective": -2.9, "useless": -2.8, "flimsy": -2.1, "fake": -3.0
};

const NEGATIONS = new Set([
  "not", "never", "no", "neither", "nor", "hardly", "scarcely",
  "barely", "isnt", "wasnt", "shouldnt", "wouldnt", "couldnt",
  "dont", "doesnt", "didnt", "cant", "cannot", "without", "lack"
]);

const BOOSTERS = {
  "very": 0.35, "extremely": 0.45, "super": 0.4, "incredibly": 0.45,
  "really": 0.3, "absolutely": 0.4, "completely": 0.35, "totally": 0.35,
  "exceptionally": 0.45, "hugely": 0.3, "highly": 0.35, "slightly": -0.2,
  "barely": -0.25, "somewhat": -0.15, "hardly": -0.2
};

export function analyzeNLPSentiment(text) {
  if (!text || typeof text !== 'string') return 0.5;

  const rawWords = text.replace(/[^a-zA-Z0-9\s!?-]/g, '').split(/\s+/).filter(Boolean);
  if (rawWords.length === 0) return 0.5;

  let totalScore = 0;
  let wordCount = 0;
  let inButClause = false;

  for (let i = 0; i < rawWords.length; i++) {
    const rawWord = rawWords[i];
    const cleanWord = rawWord.toLowerCase();

    // Clause boundary detection (e.g. "but", "however", "although")
    if (cleanWord === "but" || cleanWord === "however" || cleanWord === "although") {
      inButClause = true;
      continue;
    }

    if (cleanWord in VALENCE_LEXICON) {
      let valence = VALENCE_LEXICON[cleanWord];

      // Capitalization intensity check (e.g., "GREAT", "TERRIBLE")
      const isAllCaps = rawWord === rawWord.toUpperCase() && rawWord.length > 2;
      if (isAllCaps) {
        valence += valence > 0 ? 0.4 : -0.4;
      }

      // Check preceding words for negations & booster modifiers (up to 2 words back)
      let isNegated = false;
      let boosterDelta = 0;

      for (let lookback = 1; lookback <= 2; lookback++) {
        if (i - lookback >= 0) {
          const prevWord = rawWords[i - lookback].toLowerCase();
          if (NEGATIONS.has(prevWord)) {
            isNegated = true;
          }
          if (prevWord in BOOSTERS) {
            boosterDelta += BOOSTERS[prevWord];
          }
        }
      }

      // Apply Booster multiplier
      if (valence > 0) {
        valence += boosterDelta;
      } else {
        valence -= boosterDelta;
      }

      // Apply Negation inversion (VADER formula: negate and multiply by 0.74 scalar)
      if (isNegated) {
        valence = -0.74 * valence;
      }

      // Apply Contrastive Conjunction weighting (0.5x before "but", 1.5x after "but")
      const clauseMultiplier = inButClause ? 1.5 : 0.75;
      valence *= clauseMultiplier;

      totalScore += valence;
      wordCount++;
    }
  }

  // Punctuation Intensity Boost (! and ?)
  const exclamationCount = (text.match(/!/g) || []).length;
  if (exclamationCount > 0) {
    const boost = Math.min(exclamationCount * 0.15, 0.6);
    totalScore += totalScore >= 0 ? boost : -boost;
  }

  // VADER Compound Score Normalization: S_norm = score / sqrt(score^2 + alpha)
  const alpha = 15;
  const compound = totalScore / Math.sqrt((totalScore * totalScore) + alpha);

  // Normalize range from [-1.0, +1.0] to [0.0, 1.0] for UI compatibility
  const normalizedScore = (compound + 1.0) / 2.0;

  return Number(Math.max(0.05, Math.min(0.98, normalizedScore)).toFixed(2));
}

export default { analyzeNLPSentiment };
