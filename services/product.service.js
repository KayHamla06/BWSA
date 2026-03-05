// services/product.service.js
import Product from '../models/Product.js';
import { AppError } from '../middleware/errorHandler.middleware.js';
import logger from '../utils/logger.js';

class ProductService {
  // Create new product
  async createProduct(userId, productData) {
    try {
      const product = await Product.create({
        userId,
        ...productData,
      });

      logger.info(`Product created: ${product._id}`, { userId, productId: product._id });
      return product;
    } catch (error) {
      logger.error('Error creating product:', error);
      throw error;
    }
  }

  // Get all products for a user
  async getProducts(userId, filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 20, category, isActive, search } = { ...filters, ...pagination };
      
      const query = { userId };
      
      if (category) query.category = category;
      if (typeof isActive !== 'undefined') query.isActive = isActive;
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { sku: { $regex: search, $options: 'i' } },
        ];
      }

      const skip = (page - 1) * limit;
      
      const [products, total] = await Promise.all([
        Product.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Product.countDocuments(query),
      ]);

      return {
        products,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error fetching products:', error);
      throw error;
    }
  }

  // Get single product
  async getProductById(productId, userId) {
    try {
      const product = await Product.findOne({ _id: productId, userId });
      
      if (!product) {
        throw new AppError('Product not found', 404);
      }

      return product;
    } catch (error) {
      logger.error('Error fetching product:', error);
      throw error;
    }
  }

  // Update product
  async updateProduct(productId, userId, updateData) {
    try {
      const product = await Product.findOneAndUpdate(
        { _id: productId, userId },
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!product) {
        throw new AppError('Product not found', 404);
      }

      logger.info(`Product updated: ${productId}`, { userId, productId });
      return product;
    } catch (error) {
      logger.error('Error updating product:', error);
      throw error;
    }
  }

  // Delete product (soft delete by marking inactive)
  async deleteProduct(productId, userId) {
    try {
      const product = await Product.findOneAndUpdate(
        { _id: productId, userId },
        { $set: { isActive: false } },
        { new: true }
      );

      if (!product) {
        throw new AppError('Product not found', 404);
      }

      logger.info(`Product deleted: ${productId}`, { userId, productId });
      return product;
    } catch (error) {
      logger.error('Error deleting product:', error);
      throw error;
    }
  }

  // Update stock
  async updateStock(productId, userId, quantity, operation = 'set') {
    try {
      const product = await Product.findOne({ _id: productId, userId });

      if (!product) {
        throw new AppError('Product not found', 404);
      }

      if (!product.stock.trackInventory) {
        throw new AppError('Inventory tracking not enabled for this product', 400);
      }

      if (operation === 'set') {
        product.stock.quantity = quantity;
      } else if (operation === 'add') {
        product.stock.quantity += quantity;
      } else if (operation === 'subtract') {
        if (product.stock.quantity < quantity) {
          throw new AppError('Insufficient stock', 400);
        }
        product.stock.quantity -= quantity;
      }

      await product.save();

      logger.info(`Stock updated for product: ${productId}`, {
        userId,
        productId,
        operation,
        quantity,
        newStock: product.stock.quantity,
      });

      return product;
    } catch (error) {
      logger.error('Error updating stock:', error);
      throw error;
    }
  }

  // Get low stock products
  async getLowStockProducts(userId) {
    try {
      const products = await Product.find({
        userId,
        isActive: true,
        'stock.trackInventory': true,
        $expr: { $lte: ['$stock.quantity', '$stock.lowStockThreshold'] },
      });

      return products;
    } catch (error) {
      logger.error('Error fetching low stock products:', error);
      throw error;
    }
  }

  // Bulk update products
  async bulkUpdateProducts(userId, updates) {
    try {
      const bulkOps = updates.map((update) => ({
        updateOne: {
          filter: { _id: update.id, userId },
          update: { $set: update.data },
        },
      }));

      const result = await Product.bulkWrite(bulkOps);

      logger.info(`Bulk update completed: ${result.modifiedCount} products updated`, { userId });
      return result;
    } catch (error) {
      logger.error('Error in bulk update:', error);
      throw error;
    }
  }
}

export default new ProductService();
