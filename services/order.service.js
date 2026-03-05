// services/order.service.js
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import { AppError } from '../middleware/errorHandler.middleware.js';
import logger from '../utils/logger.js';
import productService from './product.service.js';

class OrderService {
  // Create new order
  async createOrder(userId, orderData) {
    try {
      const { customerId, items, shippingAddress, notes } = orderData;

      // Verify customer exists
      const customer = await Customer.findOne({ _id: customerId, userId });
      if (!customer) {
        throw new AppError('Customer not found', 404);
      }

      // Validate and calculate order totals
      let subtotal = 0;
      const orderItems = [];

      for (const item of items) {
        const product = await Product.findOne({
          _id: item.productId,
          userId,
          isActive: true,
        });

        if (!product) {
          throw new AppError(`Product ${item.productId} not found`, 404);
        }

        // Check stock
        if (product.stock.trackInventory && product.stock.quantity < item.quantity) {
          throw new AppError(`Insufficient stock for ${product.name}`, 400);
        }

        const itemSubtotal = product.price * item.quantity;
        subtotal += itemSubtotal;

        orderItems.push({
          productId: product._id,
          name: product.name,
          sku: product.sku,
          price: product.price,
          quantity: item.quantity,
          subtotal: itemSubtotal,
        });

        // Deduct stock
        if (product.stock.trackInventory) {
          await productService.updateStock(product._id, userId, item.quantity, 'subtract');
        }
      }

      // Calculate totals
      const tax = subtotal * 0.15; // 15% VAT
      const shipping = orderData.shipping || 0;
      const discount = orderData.discount || 0;
      const total = subtotal + tax + shipping - discount;

      // Create order
      const order = await Order.create({
        userId,
        customerId,
        items: orderItems,
        subtotal,
        tax,
        shipping,
        discount,
        total,
        shippingAddress,
        notes,
        statusHistory: [
          {
            status: 'pending',
            timestamp: new Date(),
            note: 'Order created',
          },
        ],
      });

      logger.info(`Order created: ${order.orderNumber}`, {
        userId,
        orderId: order._id,
        total,
      });

      return order;
    } catch (error) {
      logger.error('Error creating order:', error);
      throw error;
    }
  }

  // Get orders with filters
  async getOrders(userId, filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 20, status, customerId, startDate, endDate } = { ...filters, ...pagination };
      
      const query = { userId };
      
      if (status) query.status = status;
      if (customerId) query.customerId = customerId;
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      const skip = (page - 1) * limit;
      
      const [orders, total] = await Promise.all([
        Order.find(query)
          .populate('customerId', 'name email whatsappNumber')
          .populate('items.productId', 'name images')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Order.countDocuments(query),
      ]);

      return {
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error fetching orders:', error);
      throw error;
    }
  }

  // Get single order
  async getOrderById(orderId, userId) {
    try {
      const order = await Order.findOne({ _id: orderId, userId })
        .populate('customerId')
        .populate('items.productId')
        .populate('paymentId')
        .populate('invoiceId');

      if (!order) {
        throw new AppError('Order not found', 404);
      }

      return order;
    } catch (error) {
      logger.error('Error fetching order:', error);
      throw error;
    }
  }

  // Update order status
  async updateOrderStatus(orderId, userId, newStatus, note = '') {
    try {
      const order = await Order.findOne({ _id: orderId, userId });

      if (!order) {
        throw new AppError('Order not found', 404);
      }

      order.status = newStatus;
      order.statusHistory.push({
        status: newStatus,
        timestamp: new Date(),
        note,
      });

      await order.save();

      logger.info(`Order status updated: ${orderId}`, {
        userId,
        orderId,
        newStatus,
      });

      return order;
    } catch (error) {
      logger.error('Error updating order status:', error);
      throw error;
    }
  }

  // Cancel order and restore stock
  async cancelOrder(orderId, userId, reason = '') {
    try {
      const order = await Order.findOne({ _id: orderId, userId });

      if (!order) {
        throw new AppError('Order not found', 404);
      }

      if (['delivered', 'cancelled', 'refunded'].includes(order.status)) {
        throw new AppError(`Cannot cancel order with status: ${order.status}`, 400);
      }

      // Restore stock
      for (const item of order.items) {
        const product = await Product.findById(item.productId);
        if (product && product.stock.trackInventory) {
          await productService.updateStock(product._id, userId, item.quantity, 'add');
        }
      }

      order.status = 'cancelled';
      order.statusHistory.push({
        status: 'cancelled',
        timestamp: new Date(),
        note: reason || 'Order cancelled',
      });

      await order.save();

      logger.info(`Order cancelled: ${orderId}`, { userId, orderId, reason });

      return order;
    } catch (error) {
      logger.error('Error cancelling order:', error);
      throw error;
    }
  }

  // Get order statistics
  async getOrderStats(userId, startDate, endDate) {
    try {
      const matchQuery = { userId };
      
      if (startDate || endDate) {
        matchQuery.createdAt = {};
        if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
        if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
      }

      const stats = await Order.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$total' },
            averageOrderValue: { $avg: '$total' },
            pendingOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
            },
            completedOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] },
            },
          },
        },
      ]);

      return stats[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        pendingOrders: 0,
        completedOrders: 0,
      };
    } catch (error) {
      logger.error('Error fetching order stats:', error);
      throw error;
    }
  }
}

export default new OrderService();
