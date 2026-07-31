import { Product } from '../models/Product.js';

export class ProductRepository {
  async findById(id) {
    return Product.findOne({ id }).lean();
  }

  async findAll() {
    return Product.find().lean();
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
