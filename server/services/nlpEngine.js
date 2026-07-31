/**
 * TRUSTRANK NLP SENTIMENT ENGINE
 * Powered by natural.js BayesClassifier Model.
 * Trained on boot with fashion-specific review vocabulary.
 */

import natural from 'natural';

// Labeled Fashion Training Data for high-accuracy classifier training
const trainingData = [
  // Positive Samples
  { text: 'amazing fit and excellent premium quality fabric', label: 'positive' },
  { text: 'very comfortable soft breathable material must buy', label: 'positive' },
  { text: 'perfect sizing looks extremely stylish and beautiful', label: 'positive' },
  { text: 'superb product value for money highly recommend it', label: 'positive' },
  { text: 'best purchase so far loved the color and quality', label: 'positive' },
  { text: 'great design happy with the product comfortable snug fit', label: 'positive' },
  { text: 'outstanding fabric clean stitching and neat design', label: 'positive' },
  { text: 'highly satisfied with the packaging and fast delivery', label: 'positive' },
  { text: 'looks neat elegant and holds up well after wash', label: 'positive' },
  { text: 'durable material excellent build high-quality stitching', label: 'positive' },
  { text: 'loved the fit and comfort beautiful shirt', label: 'positive' },
  { text: 'nice fabric feel comfortable for daily wear', label: 'positive' },
  { text: 'brilliant design fits perfectly like custom tailored', label: 'positive' },
  { text: 'great fit and great quality very fast shipping', label: 'positive' },
  { text: 'very pleased with this purchase looks great on me', label: 'positive' },

  // Negative Samples
  { text: 'cheap material uncomfortable to wear dull color', label: 'negative' },
  { text: 'terrible quality horrible stitching loose threads everywhere', label: 'negative' },
  { text: 'stuck zipper faded color after first wash damaged product', label: 'negative' },
  { text: 'overpriced flimsy material defective sewing bad fit', label: 'negative' },
  { text: 'smells like chemicals thin see-through fabric bad purchase', label: 'negative' },
  { text: 'useless product worst experience disappointed with quality', label: 'negative' },
  { text: 'awful sizing fit is too large and heavy material', label: 'negative' },
  { text: 'color bled in wash ruined other clothes cheap quality', label: 'negative' },
  { text: 'dirty package broken buttons loose stitching hate it', label: 'negative' },
  { text: 'poor cloth quality very rough on skin sizing is wrong', label: 'negative' },
  { text: 'fake brand replication cheap duplicates', label: 'negative' },
  { text: 'fake reviews product is completely different', label: 'negative' },
  { text: 'worst shirt quality is very bad and fits terribly', label: 'negative' },
  { text: 'very bad material and it arrived torn', label: 'negative' },
  { text: 'disappointed with the fit it is too tight and small', label: 'negative' }
];

// Initialize the Bayes Classifier Model
const classifier = new natural.BayesClassifier();

// Train Model function called on startup
export function initMLModel() {
  console.log('[NLP Engine] Initializing and training natural.js BayesClassifier Model...');
  for (const item of trainingData) {
    classifier.addDocument(item.text, item.label);
  }
  classifier.train();
  console.log('[NLP Engine] BayesClassifier Model trained successfully on fashion vocabulary!');
  return classifier;
}

// Auto-train on module load
try {
  initMLModel();
} catch (e) {
  console.error('[NLP Engine] Initial training failed:', e.message);
}

/**
 * Perform Sentiment Analysis using the trained BayesClassifier model.
 * Returns a score normalized from 0.0 to 1.0 representing positive probability.
 */
export async function analyzeNLPSentiment(text) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) return 0.5;

  try {
    const rawClassifications = classifier.getClassifications(text.toLowerCase().trim());
    if (rawClassifications && rawClassifications.length > 0) {
      const posClass = rawClassifications.find(c => c.label === 'positive');
      const negClass = rawClassifications.find(c => c.label === 'negative');
      
      const posValue = posClass ? posClass.value : 0.5;
      const negValue = negClass ? negClass.value : 0.5;
      
      // Calculate normalized probability score from classifications
      const sum = posValue + negValue;
      let score = 0.5;
      if (sum > 0) {
        score = posValue / sum;
      }
      
      // Clamp between 0.05 and 0.98
      return Number(Math.max(0.05, Math.min(0.98, score)).toFixed(2));
    }
  } catch (err) {
    console.warn('[NLP Engine] BayesClassifier prediction failed, using fallback scoring:', err.message);
  }

  // Simple rule fallback
  return analyzeNLPSentimentSync(text);
}

// Fast rule-based sentiment fallback
export function analyzeNLPSentimentSync(text) {
  if (!text || typeof text !== 'string') return 0.5;
  const clean = text.toLowerCase().trim();
  
  const positiveWords = ['amazing', 'excellent', 'awesome', 'comfortable', 'perfect', 'premium', 'soft', 'superb', 'love', 'loved', 'best', 'great', 'good', 'nice', 'beautiful', 'happy', 'satisfied', 'worth'];
  const negativeWords = ['cheap', 'uncomfortable', 'terrible', 'horrible', 'awful', 'loose', 'faded', 'damaged', 'overpriced', 'disappointed', 'bad', 'poor', 'worst', 'broken', 'useless', 'fake'];

  let posCount = 0;
  let negCount = 0;

  const words = clean.split(/\s+/);
  for (const w of words) {
    if (positiveWords.includes(w)) posCount++;
    if (negativeWords.includes(w)) negCount++;
  }

  const total = posCount + negCount;
  if (total === 0) return 0.5;
  return Number((posCount / total).toFixed(2));
}

export default { analyzeNLPSentiment, analyzeNLPSentimentSync, initMLModel };
