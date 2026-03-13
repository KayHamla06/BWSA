import Product from '../models/Product.js';
import { uploadImage } from '../services/cloudinary.service.js';

export async function listProducts(req, res, next) {
  try {
    const { category, active } = req.query;
    const filter = { userId: req.user.userId };
    if (category) filter.category = category;
    if (active !== undefined) filter.isActive = active === 'true';

    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, products });
  } catch (error) {
    next(error);
  }
}

export async function getProduct(req, res, next) {
  try {
    const product = await Product.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product });
  } catch (error) {
    next(error);
  }
}

export async function createProduct(req, res, next) {
  try {
    const { name, description, price, category, stock } = req.body;

    let image_url = null;
    if (req.file) {
      const result = await uploadImage(req.file.buffer, 'products');
      image_url = result.url;
    }

    const product = await Product.create({
      userId: req.user.userId,
      name,
      description: description || '',
      price: Number(price),
      category: category || 'General',
      stock: Number(stock) || 0,
      image_url,
    });

    res.status(201).json({ success: true, message: 'Product created', product });
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(req, res, next) {
  try {
    const { name, description, price, category, stock, isActive } = req.body;
    const update = {};

    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (price !== undefined) update.price = Number(price);
    if (category !== undefined) update.category = category;
    if (stock !== undefined) update.stock = Number(stock);
    if (isActive !== undefined) update.isActive = isActive;

    if (req.file) {
      const result = await uploadImage(req.file.buffer, 'products');
      update.image_url = result.url;
    }

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      update,
      { new: true }
    );

    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, message: 'Product updated', product });
  } catch (error) {
    next(error);
  }
}

export async function deleteProduct(req, res, next) {
  try {
    const product = await Product.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    next(error);
  }
}
