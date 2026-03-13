import Order from '../models/Order.js';

export async function listOrders(req, res, next) {
  try {
    const { status } = req.query;
    const filter = { userId: req.user.userId };
    if (status) {
      const normalized = String(status).toLowerCase();
      if (normalized === 'approved') filter.status = 'paid';
      else if (normalized === 'declined') filter.status = 'failed';
      else filter.status = normalized;
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .populate('productId', 'name price image_url');

    res.json({
      success: true,
      orders: orders.map((order) => ({
        ...order.toObject(),
        displayStatus:
          order.status === 'paid'
            ? 'APPROVED'
            : order.status === 'failed'
              ? 'DECLINED'
              : order.status === 'delivered'
                ? 'DELIVERED'
                : 'PENDING',
      })),
    });
  } catch (error) {
    next(error);
  }
}

export async function getOrder(req, res, next) {
  try {
    const order = await Order.findOne({ _id: req.params.id, userId: req.user.userId })
      .populate('productId', 'name price image_url description');

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order });
  } catch (error) {
    next(error);
  }
}

export async function updateOrderStatus(req, res, next) {
  try {
    const requested = String(req.body.status || '').toUpperCase();
    const statusMap = {
      PENDING: 'pending',
      APPROVED: 'paid',
      DECLINED: 'failed',
      DELIVERED: 'delivered',
    };
    const status = statusMap[requested];

    if (!status) {
      return res.status(400).json({ success: false, message: 'Invalid order status' });
    }

    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { status },
      { new: true }
    );

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, message: 'Order status updated', order });
  } catch (error) {
    next(error);
  }
}
