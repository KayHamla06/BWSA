import Customer from '../models/Customer.js';
import { checkCustomerLimit } from '../services/subscription.service.js';
import { ApiError } from '../errors/ApiError.js';

export async function listCustomers(req, res, next) {
  try {
    const { search = '', segment = 'all' } = req.query;
    const conditions = [{ userId: req.user.userId }];

    if (search.trim()) {
      conditions.push({
        $or: [
        { name: { $regex: search.trim(), $options: 'i' } },
        { whatsappNumber: { $regex: search.trim(), $options: 'i' } },
        ],
      });
    }

    if (segment === 'repeat') {
      conditions.push({ orderCount: { $gt: 1 } });
    }

    if (segment === 'inactive') {
      const threshold = new Date();
      threshold.setDate(threshold.getDate() - 30);
      conditions.push({
        $or: [
        { lastContactDate: { $lt: threshold } },
        { lastContactDate: null },
        ],
      });
    }

    const customers = await Customer.find({ $and: conditions }).sort({ createdAt: -1 });
    res.json({ success: true, customers });
  } catch (error) {
    next(error);
  }
}

export async function getCustomer(req, res, next) {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, customer });
  } catch (error) {
    next(error);
  }
}

export async function createCustomer(req, res, next) {
  try {
    const limitCheck = await checkCustomerLimit(req.user.userId);
    if (!limitCheck.allowed) {
      throw ApiError.badRequest(
        `Customer limit reached (${limitCheck.current}/${limitCheck.limit}). Upgrade your plan to add more customers.`
      );
    }

    const { name, email, whatsappNumber } = req.body;
    if (!name || !whatsappNumber) {
      return res.status(400).json({ success: false, message: 'Name and WhatsApp number are required' });
    }

    const existing = await Customer.findOne({ userId: req.user.userId, whatsappNumber });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Customer with this number already exists' });
    }

    const customer = await Customer.create({
      userId: req.user.userId,
      name,
      email: email || '',
      whatsappNumber,
      phoneNumber: whatsappNumber,
      lastContactDate: new Date(),
    });

    res.status(201).json({ success: true, message: 'Customer created', customer });
  } catch (error) {
    next(error);
  }
}

export async function deleteCustomer(req, res, next) {
  try {
    const customer = await Customer.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, message: 'Customer deleted' });
  } catch (error) {
    next(error);
  }
}
