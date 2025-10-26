import Cart from '../models/Cart.js';
import Product from '../models/Product.js';

export const getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id })
      .populate({
        path: 'items.productId',
        select: 'title price images stock status'
      });
    
    if (!cart) {
      return res.json({ success: true, data: { items: [], total: 0, itemCount: 0 } });
    }
    
    const formattedItems = cart.items.map(item => ({
      id: item._id,
      productId: item.productId._id,
      product: {
        id: item.productId._id,
        title: item.productId.title,
        price: item.productId.price,
        images: item.productId.images,
        stock: item.productId.stock,
        status: item.productId.status
      },
      quantity: item.quantity,
      price: item.price
    }));
    
    res.json({ success: true, data: { items: formattedItems, total: cart.total, itemCount: cart.itemCount } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const addToCart = async (req, res) => {
  const { productId, quantity = 1 } = req.body;
  
  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    
    if (product.status !== 'active') {
      return res.status(400).json({ success: false, error: 'Product is not available' });
    }
    
    if (product.stock < quantity) {
      return res.status(400).json({ success: false, error: 'Insufficient stock' });
    }
    
    let cart = await Cart.findOne({ userId: req.user._id });
    
    if (!cart) {
      cart = new Cart({ userId: req.user._id, items: [] });
    }
    
    const existingItem = cart.items.find(item => item.productId.equals(productId));
    
    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (product.stock < newQuantity) {
        return res.status(400).json({ success: false, error: 'Insufficient stock' });
      }
      existingItem.quantity = newQuantity;
    } else {
      cart.items.push({ productId, quantity, price: product.price });
    }
    
    await cart.save();
    
    const populated = await Cart.findById(cart._id).populate('items.productId', 'title price images stock status');
    
    res.json({ success: true, data: populated, message: 'Product added to cart' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const updateCartItem = async (req, res) => {
  const { productId, quantity } = req.body;
  
  try {
    const cart = await Cart.findOne({ userId: req.user._id });
    
    if (!cart) {
      return res.status(404).json({ success: false, error: 'Cart not found' });
    }
    
    const item = cart.items.find(item => item.productId.equals(productId));
    
    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found in cart' });
    }
    
    const product = await Product.findById(productId);
    if (product.stock < quantity) {
      return res.status(400).json({ success: false, error: 'Insufficient stock' });
    }
    
    item.quantity = quantity;
    await cart.save();
    
    const populated = await Cart.findById(cart._id).populate('items.productId', 'title price images stock status');
    
    res.json({ success: true, data: populated, message: 'Cart updated' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const removeFromCart = async (req, res) => {
  const { productId } = req.params;
  
  try {
    const cart = await Cart.findOne({ userId: req.user._id });
    
    if (!cart) {
      return res.status(404).json({ success: false, error: 'Cart not found' });
    }
    
    cart.items = cart.items.filter(item => !item.productId.equals(productId));
    await cart.save();
    
    res.json({ success: true, message: 'Item removed from cart' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id });
    
    if (!cart) {
      return res.status(404).json({ success: false, error: 'Cart not found' });
    }
    
    cart.items = [];
    await cart.save();
    
    res.json({ success: true, message: 'Cart cleared' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};
