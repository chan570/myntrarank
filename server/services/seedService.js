import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { auditProductReviews } from './auditEngine.js';
import { openSearchService } from './openSearchEngine.js';

const CATALOG_PATH = fileURLToPath(new URL('../data/demo_catalog.json', import.meta.url));

export async function seedDatabase() {
  const existingCount = await openSearchService.getDocumentCount();
  if (existingCount > 0) {
    console.log(`TrustRank index already contains ${existingCount} products; seed skipped.`);
    return existingCount;
  }

  let products;
  try {
    products = JSON.parse(await readFile(CATALOG_PATH, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error('Dataset catalog is missing. Install `server/nlp_service/requirements-data.txt`, then run `npm run prepare:dataset`.', { cause: error });
    }
    throw error;
  }
  const auditedProducts = [];
  for (let index = 0; index < products.length; index += 1) {
    const product = products[index];
    const audited = await auditProductReviews(product.reviews);
    auditedProducts.push({
      ...product,
      reviews: audited.auditedReviews,
      auditedMetrics: {
        authenticityScore: audited.authenticityScore,
        sentimentScore: audited.sentimentScore,
        verifiedRatio: audited.verifiedRatio,
        richnessScore: audited.richnessScore,
        recencyScore: audited.recencyScore,
        ratingScore: audited.ratingScore,
        genuineRating: audited.genuineRating,
        validReviewsCount: audited.validReviewsCount,
        totalReviewsCount: audited.totalReviewsCount,
        isLowReviewCount: audited.isLowReviewCount,
      },
      auditedBy: 'Transformer sentiment + heuristic review-risk signals',
      dataType: 'heldout-dataset-demo',
      isSuspicious: audited.authenticityScore < 0.60,
    });
    if ((index + 1) % 10 === 0) console.log(`Audited ${index + 1}/${products.length} demo products`);
  }

  await openSearchService.bulkIndex(auditedProducts);
  const count = await openSearchService.getDocumentCount();
  console.log(`Seeded ${count} held-out dataset products into OpenSearch.`);
  return count;
}
