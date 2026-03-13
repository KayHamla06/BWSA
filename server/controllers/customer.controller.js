import Customer from '../models/Customer.js';

export async function listCustomers(req, res, next) {
  try {
    const customers = await Customer.find({ userId: req.user.userId }).sort({ createdAt: -1 });
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
