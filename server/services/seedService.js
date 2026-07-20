import { generateProducts } from '../../src/data/mockProducts.js';
import { Product } from '../models/Product.js';
import { Review } from '../models/Review.js';
import { auditProductReviews } from './auditEngine.js';
import { openSearchService } from './openSearchEngine.js';

export async function seedDatabase(isMemoryFallback = false) {
  console.log(`🚀 Initializing TrustRank Database Seeder (Generating 1,100 products & 27,000+ reviews)...`);

  const mockData = generateProducts();
  let dbProducts = [];

  if (!isMemoryFallback) {
    try {
      const existingCount = await Product.countDocuments();
      if (existingCount === 0) {
        console.log(`📦 Seeding MongoDB Database with 1,100 products...`);
        for (let idx = 0; idx < mockData.length; idx++) {
          const p = mockData[idx];
          const audited = auditProductReviews(p.reviews);
          const newProd = new Product({
            id: p.id,
            title: p.title,
            brand: p.brand,
            description: p.description,
            image: p.image,
            price: p.price,
            originalPrice: p.originalPrice,
            discountPercent: p.discountPercent,
            category: p.category,
            tags: p.tags,
            anomalyType: p.anomalyType,
            isSuspicious: p.isSuspicious,
            auditedMetrics: audited
          });
          await newProd.save();

          if (p.reviews && p.reviews.length > 0) {
            const revDocs = p.reviews.map((r, rIdx) => ({
              ...r,
              id: `rev-${p.id}-${rIdx}-${Date.now()}`,
              productId: p.id
            }));
            try {
              await Review.insertMany(revDocs, { ordered: false });
            } catch (rErr) {}
          }
        }
        console.log(`✅ MongoDB Seeded Successfully!`);
      }
      dbProducts = await Product.find().lean();
    } catch (err) {
      console.warn(`⚠️ MongoDB Seed Bypass: ${err.message}`);
      dbProducts = mockData.map(p => ({
        ...p,
        auditedMetrics: auditProductReviews(p.reviews)
      }));
    }
  } else {
    console.log(`⚡ Seeding In-Memory Data Store...`);
    dbProducts = mockData.map(p => ({
      ...p,
      auditedMetrics: auditProductReviews(p.reviews)
    }));
  }

  // Populate OpenSearch Engine
  openSearchService.bulkIndex(dbProducts);
  console.log(`🔍 Amazon OpenSearch Index Populated with ${openSearchService.getDocumentCount()} documents.`);
}
