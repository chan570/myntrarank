import { Product } from '../models/Product.js';

export class ProductRepository {
  async findById(id) {
    return Product.findOne({ id }).lean();
  }

  // Encapsulates paginated, filtered, and sorted database queries
  async findPaged({ page = 1, limit = 10, category = 'All', sortBy = 'title', sortOrder = 'asc' }) {
    const query = {};
    if (category && category !== 'All') {
      query.category = category;
    }

    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Product.find(query).sort(sort).skip(skip).limit(limit).lean(),
      Product.countDocuments(query)
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async count() {
    return Product.countDocuments();
  }

  async save(productData) {
    const product = new Product(productData);
    return product.save();
  }

  async update(id, updateData) {
    return Product.findOneAndUpdate({ id }, updateData, { new: true }).lean();
  }
}

export const productRepository = new ProductRepository();
export default productRepository;
