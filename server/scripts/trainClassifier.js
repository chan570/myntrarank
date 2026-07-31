/**
 * TRUSTRANK OFFLINE MODEL TRAINING PIPELINE
 * Compiles a large labeled dataset of fashion product reviews,
 * trains the natural.js BayesClassifier, and serializes the state to JSON.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import natural from 'natural';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../data');
const MODEL_PATH = path.join(DATA_DIR, 'sentiment_model.json');

// High-quality large training corpus (150+ entries covering fashion domains)
const corpus = [
  // POSITIVE FASHION REVIEWS (75 samples)
  { text: "amazing fit and excellent premium quality fabric", label: "positive" },
  { text: "very comfortable soft breathable material must buy", label: "positive" },
  { text: "perfect sizing looks extremely stylish and beautiful", label: "positive" },
  { text: "superb product value for money highly recommend it", label: "positive" },
  { text: "best purchase so far loved the color and quality", label: "positive" },
  { text: "great design happy with the product comfortable snug fit", label: "positive" },
  { text: "outstanding fabric clean stitching and neat design", label: "positive" },
  { text: "highly satisfied with the packaging and fast delivery", label: "positive" },
  { text: "looks neat elegant and holds up well after wash", label: "positive" },
  { text: "durable material excellent build high-quality stitching", label: "positive" },
  { text: "loved the fit and comfort beautiful shirt", label: "positive" },
  { text: "nice fabric feel comfortable for daily wear", label: "positive" },
  { text: "brilliant design fits perfectly like custom tailored", label: "positive" },
  { text: "great fit and great quality very fast shipping", label: "positive" },
  { text: "very pleased with this purchase looks great on me", label: "positive" },
  { text: "fabric is so soft and light perfect for summer", label: "positive" },
  { text: "the fit is spot on and the color matches the photo", label: "positive" },
  { text: "excellent value for the price paid definitely buying again", label: "positive" },
  { text: "stitching is solid and buttons are firmly attached", label: "positive" },
  { text: "received many compliments wearing this elegant dress", label: "positive" },
  { text: "highly breathable activewear perfect for gym workouts", label: "positive" },
  { text: "delighted with the premium packaging and quick delivery", label: "positive" },
  { text: "classic look fits wonderfully and fabric feels expensive", label: "positive" },
  { text: "amazing texture very comfortable fits like a glove", label: "positive" },
  { text: "perfect casual shirt comfortable and breathable cotton", label: "positive" },
  { text: "extremely happy with the style color matches description", label: "positive" },
  { text: "highly recommend this brand for premium everyday basic tees", label: "positive" },
  { text: "great quality fabric didn't shrink after multiple washes", label: "positive" },
  { text: "super soft inner lining keeps me warm in winter", label: "positive" },
  { text: "excellent customer service and beautiful custom fit", label: "positive" },
  { text: "the fabric stretches nicely and has a good grip", label: "positive" },
  { text: "looks very premium and premium branding details are great", label: "positive" },
  { text: "lovely design and very soft to the skin", label: "positive" },
  { text: "absolutely gorgeous color and the fit is perfect", label: "positive" },
  { text: "durable stitching holds up well during daily running", label: "positive" },
  { text: "great buy value for money soft cotton playsuit", label: "positive" },
  { text: "satisfying purchase high-quality shoe sole is soft", label: "positive" },
  { text: "fits perfectly and feels very comfortable on long walks", label: "positive" },
  { text: "clean details no loose threads beautiful packaging", label: "positive" },
  { text: "the fabric thickness is perfect not see-through", label: "positive" },
  { text: "highly recommend buying a size up fits perfectly then", label: "positive" },
  { text: "loved the vibrant shade of blue and comfortable fitting", label: "positive" },
  { text: "elegant look looks great with formal trousers", label: "positive" },
  { text: "very comfy material soft and fits as expected", label: "positive" },
  { text: "fast shipping clean design fits my athletic body well", label: "positive" },
  { text: "awesome activewear fabric keeps me dry during sweat", label: "positive" },
  { text: "so happy with the purchase color is very elegant", label: "positive" },
  { text: "premium brand look at a very reasonable price point", label: "positive" },
  { text: "great comfort and the sole is very cushioned", label: "positive" },
  { text: "fits very well soft and durable stitching overall", label: "positive" },
  { text: "amazing premium quality fabric very soft texture", label: "positive" },
  { text: "excellent styling looks very fashionable and premium", label: "positive" },
  { text: "the product is worth every rupee buy it without doubt", label: "positive" },
  { text: "love the design fits perfectly and very fast delivery", label: "positive" },
  { text: "high-quality materials feels like luxury brand shoes", label: "positive" },
  { text: "the cotton fabric is super soft and breathable", label: "positive" },
  { text: "nice and snug fit looks awesome for parties", label: "positive" },
  { text: "excellent casual wear very comfortable fabric", label: "positive" },
  { text: "durable fabric didn't fade at all after three washes", label: "positive" },
  { text: "perfect fit and matches standard sizing chart perfectly", label: "positive" },
  { text: "great customer service solved my sizing query fast", label: "positive" },
  { text: "highly satisfied with the lightweight design of jacket", label: "positive" },
  { text: "perfect color looks rich and has standard styling", label: "positive" },
  { text: "very soft material matches catalog description exactly", label: "positive" },
  { text: "stitching is clean color is vibrant and fit is snug", label: "positive" },
  { text: "highly recommended for summer wear very lightweight", label: "positive" },
  { text: "feels very light on body sizing is exact", label: "positive" },
  { text: "excellent finish premium buttons and neat collars", label: "positive" },
  { text: "perfectly stitched looks great and fabric is comfortable", label: "positive" },
  { text: "love the texture of the fabric very comfortable to wear", label: "positive" },
  { text: "great daily wear highly durable cotton fabric", label: "positive" },
  { text: "excellent product matches standard retail quality", label: "positive" },
  { text: "looks premium soft fabric perfect fit overall", label: "positive" },
  { text: "very happy with this top fits beautifully", label: "positive" },
  { text: "comfortable activewear holds shape well after washing", label: "positive" },

  // NEGATIVE FASHION REVIEWS (75 samples)
  { text: "cheap material uncomfortable to wear dull color", label: "negative" },
  { text: "terrible quality horrible stitching loose threads everywhere", label: "negative" },
  { text: "stuck zipper faded color after first wash damaged product", label: "negative" },
  { text: "overpriced flimsy material defective sewing bad fit", label: "negative" },
  { text: "smells like chemicals thin see-through fabric bad purchase", label: "negative" },
  { text: "useless product worst experience disappointed with quality", label: "negative" },
  { text: "awful sizing fit is too large and heavy material", label: "negative" },
  { text: "color bled in wash ruined other clothes cheap quality", label: "negative" },
  { text: "dirty package broken buttons loose stitching hate it", label: "negative" },
  { text: "poor cloth quality very rough on skin sizing is wrong", label: "negative" },
  { text: "fake brand replication cheap duplicates", label: "negative" },
  { text: "fake reviews product is completely different", label: "negative" },
  { text: "worst shirt quality is very bad and fits terribly", label: "negative" },
  { text: "very bad material and it arrived torn", label: "negative" },
  { text: "disappointed with the fit it is too tight and small", label: "negative" },
  { text: "cheap quality stitching came apart on the first day", label: "negative" },
  { text: "color doesn't match the image looks completely washed out", label: "negative" },
  { text: "waste of money sizing is totally off and material is rough", label: "negative" },
  { text: "defective zip could not even open the package properly", label: "negative" },
  { text: "very thin fabric feels like it will tear after one wash", label: "negative" },
  { text: "bad smell on opening the bag cheap synthetic material", label: "negative" },
  { text: "stitching is terrible thread is coming out from buttons", label: "negative" },
  { text: "worst fit ever arms are too tight chest is too loose", label: "negative" },
  { text: "completely disappointed fabric started pilling immediately", label: "negative" },
  { text: "cheap replica fake product do not buy", label: "negative" },
  { text: "the fabric is rough and uncomfortable to wear at all", label: "negative" },
  { text: "buttons fell off in the first wash bad sewing quality", label: "negative" },
  { text: "overpriced for such cheap quality cotton blend", label: "negative" },
  { text: "very bad design looks ugly in real life", label: "negative" },
  { text: "stretching ruined the shape after one wash bad material", label: "negative" },
  { text: "sole is hard and hurts my feet cheap running shoes", label: "negative" },
  { text: "sizing is inaccurate fits two sizes smaller than chart", label: "negative" },
  { text: "faded color instantly after one gentle cold wash", label: "negative" },
  { text: "stitching is so uneven looks like a cheap replica", label: "negative" },
  { text: "worst purchase I've ever made on this app highly regret it", label: "negative" },
  { text: "heavy uncomfortable material keeps too hot in summer", label: "negative" },
  { text: "poor customer response sizing replacement took 2 weeks", label: "negative" },
  { text: "uncomfortable fit collar is very stiff and scratches skin", label: "negative" },
  { text: "cheap plastic buttons broken on delivery disappointed", label: "negative" },
  { text: "ugly design colors are very different from product images", label: "negative" },
  { text: "fabric holds sweat and smells very bad cheap activewear", label: "negative" },
  { text: "extremely poor quality fabric is very rough and cheap", label: "negative" },
  { text: "waste of money fitting is completely out of shape", label: "negative" },
  { text: "torn sleeve on arrival bad inspection and packaging", label: "negative" },
  { text: "zipper broke on first use cheap materials used", label: "negative" },
  { text: "color looks faded and stitching is loose all over", label: "negative" },
  { text: "uncomfortable shoes sole has no cushioning at all", label: "negative" },
  { text: "stretching is bad and the pants lost fit immediately", label: "negative" },
  { text: "cheap replicate brand logo is different from original", label: "negative" },
  { text: "terrible quality control sizing is completely wrong", label: "negative" },
  { text: "fabric feels like plastic very uncomfortable to wear", label: "negative" },
  { text: "poorly stitched sleeves are of unequal length", label: "negative" },
  { text: "worst material fabric shrunk by two sizes in wash", label: "negative" },
  { text: "very bad value overpriced for replica cheap quality", label: "negative" },
  { text: "disappointed by the faded print looks very cheap", label: "negative" },
  { text: "stuck zip and loose threads everywhere awful product", label: "negative" },
  { text: "rough inner lining hurts skin uncomfortable to wear", label: "negative" },
  { text: "defective stitching under arms bad tailoring quality", label: "negative" },
  { text: "worst experience print washed away in first spin", label: "negative" },
  { text: "cheap fabric thin see-through and very rough texture", label: "negative" },
  { text: "color bled and stained my washing machine bad dye quality", label: "negative" },
  { text: "sizing fits extremely loose looks like a sack", label: "negative" },
  { text: "rough canvas material hurts feet uncomfortable shoes", label: "negative" },
  { text: "poor quality sewing buttons came loose in first use", label: "negative" },
  { text: "overpriced cheap plastic feel not real cotton", label: "negative" },
  { text: "ugly fit and stitching details are extremely poor", label: "negative" },
  { text: "faded color within a week of purchase do not buy", label: "negative" },
  { text: "defective item arrived with holes in pockets", label: "negative" },
  { text: "uncomfortable fit material doesn't stretch at all", label: "negative" },
  { text: "cheap copy and fake packaging waste of money", label: "negative" },
  { text: "worst product on catalog terrible fabric feel", label: "negative" },
  { text: "extremely thin fabric tears very easily", label: "negative" },
  { text: "bad fit sizing chart is completely misleading", label: "negative" },
  { text: "poor quality control stitching is missing at collar", label: "negative" },
  { text: "disappointed with the dull washed out colors", label: "negative" }
];

async function trainAndSerialize() {
  console.log('------------------------------------------------------');
  console.log('🚀 INITIALIZING NLP MODEL TRAINING PIPELINE');
  console.log('------------------------------------------------------');

  if (!fs.existsSync(DATA_DIR)) {
    console.log(`📁 Creating directory: ${DATA_DIR}`);
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const classifier = new natural.BayesClassifier();

  console.log(`📦 Adding ${corpus.length} fashion reviews to BayesClassifier training set...`);
  for (const item of corpus) {
    classifier.addDocument(item.text.toLowerCase().trim(), item.label);
  }

  console.log('⚡ Training model (running tokenization, stemming & feature probability mapping)...');
  classifier.train();
  console.log('✅ Model training complete!');

  console.log(`💾 Serializing and saving model parameters to: ${MODEL_PATH}`);
  classifier.save(MODEL_PATH, (err) => {
    if (err) {
      console.error(`❌ Serialization failed: ${err.message}`);
      process.exit(1);
    }
    console.log('🎉 Model state saved successfully! Production ready.');
    console.log('------------------------------------------------------\n');
  });
}

trainAndSerialize().catch(console.error);
