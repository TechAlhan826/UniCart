import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import crypto from 'crypto';
import { sendOrderConfirmationEmail, sendSellerOrderNotification, sendOrderStatusEmail } from '../utils/emailService.js';

// simple coupon storage (in production, use DB)
const coupons = {
  'WELCOME10': { discount: 10, type: 'percentage', minOrder: 500, expiresAt: new Date('2025-12-31') },
  'FLAT50': { discount: 50, type: 'fixed', minOrder: 200, expiresAt: new Date('2025-12-31') }
};

export const createOrder = async (req, res) => {
  const { cartId, items, shippingAddress, paymentMethod, couponCode } = req.body;
  
  try {
    let cartItems;
    let total = 0;
    
    if (cartId) {
      // Cart-based order
      const cart = await Cart.findById(cartId).populate('items.productId');
      
      if (!cart || !cart.userId.equals(req.user._id)) {
        return res.status(404).json({ success: false, error: 'Cart not found' });
      }
      
      if (cart.items.length === 0) {
        return res.status(400).json({ success: false, error: 'Cart is empty' });
      }
      
      // check stock
      for (const item of cart.items) {
        if (item.productId.stock < item.quantity) {
          return res.status(400).json({ success: false, error: `Product "${item.productId.title}" is out of stock` });
        }
      }
      
      total = cart.total;
      cartItems = cart.items.map(item => ({
        productId: item.productId._id,
        title: item.productId.title,
        price: item.price,
        quantity: item.quantity,
        sellerId: item.productId.sellerId
      }));
    } else if (items && Array.isArray(items)) {
      // Direct items array order
      const productIds = items.map(item => item.productId);
      const products = await Product.find({ _id: { $in: productIds } });
      
      if (products.length !== items.length) {
        return res.status(400).json({ success: false, error: 'One or more products not found' });
      }
      
      const productMap = new Map(products.map(p => [p._id.toString(), p]));
      cartItems = [];
      
      for (const item of items) {
        const product = productMap.get(item.productId);
        
        if (!product) {
          return res.status(400).json({ success: false, error: 'Product not found' });
        }
        
        if (product.stock < item.quantity) {
          return res.status(400).json({ success: false, error: `Product "${product.title}" is out of stock` });
        }
        
        cartItems.push({
          productId: product._id,
          title: product.title,
          price: product.price,
          quantity: item.quantity,
          sellerId: product.sellerId
        });
        
        total += product.price * item.quantity;
      }
    } else {
      return res.status(400).json({ success: false, error: 'Either cartId or items array is required' });
    }
    
    // validate address
    if (!shippingAddress || !shippingAddress.name || !shippingAddress.phone || !shippingAddress.line1 || !shippingAddress.city || !shippingAddress.state || !shippingAddress.pincode) {
      return res.status(400).json({ success: false, error: 'Invalid shipping address format' });
    }
    
    let discount = 0;
    
    // apply coupon
    if (couponCode) {
      const coupon = coupons[couponCode];
      if (!coupon) {
        return res.status(400).json({ success: false, error: 'Invalid coupon code' });
      }
      
      if (new Date() > coupon.expiresAt) {
        return res.status(400).json({ success: false, error: 'Coupon has expired' });
      }
      
      if (total < coupon.minOrder) {
        return res.status(400).json({ success: false, error: `Minimum order value is ₹${coupon.minOrder}` });
      }
      
      if (coupon.type === 'percentage') {
        discount = (total * coupon.discount) / 100;
      } else {
        discount = coupon.discount;
      }
      
      total -= discount;
    }
    
    const order = new Order({
      userId: req.user._id,
      cartItems,
      total,
      paymentMethod,
      shippingAddress,
      couponCode: couponCode || undefined,
      discount,
      status: paymentMethod === 'cod' ? 'processing' : 'pending'
    });
    
    // create razorpay order if razorpay
    if (paymentMethod === 'razorpay') {
      const razorpayOrderId = `order_${crypto.randomBytes(12).toString('hex')}`; // mock order id
      order.razorpayOrderId = razorpayOrderId;
      
      await order.save();
      
      if (cartId) {
        // clear cart if cart-based order
        const cart = await Cart.findById(cartId);
        if (cart) {
          cart.items = [];
          await cart.save();
        }
      }
      
      return res.json({
        success: true,
        data: {
          orderId: order._id,
          amount: Math.round(total * 100), // convert to paisa
          currency: 'INR',
          razorpayOrderId,
          status: order.status
        }
      });
    }
    
    // cod - directly set to processing
    await order.save();
    
    // Update product stock for COD orders
    for (const item of cartItems) {
      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { stock: -item.quantity } }
      );
    }
    
    if (cartId) {
      // clear cart if cart-based order
      const cart = await Cart.findById(cartId);
      if (cart) {
        cart.items = [];
        await cart.save();
      }
    }
    
    // Send order confirmation email to buyer
    try {
      const buyer = await User.findById(req.user._id);
      if (buyer) {
        await sendOrderConfirmationEmail(buyer, order);
      }
    } catch (emailErr) {
      console.error('Failed to send order confirmation email:', emailErr);
    }
    
    // Send order notification to sellers
    try {
      const sellerIds = [...new Set(cartItems.map(item => item.sellerId.toString()))];
      for (const sellerId of sellerIds) {
        const seller = await User.findById(sellerId);
        if (seller) {
          const sellerItems = cartItems.filter(item => item.sellerId.toString() === sellerId);
          await sendSellerOrderNotification(seller, order, sellerItems);
        }
      }
    } catch (emailErr) {
      console.error('Failed to send seller notification email:', emailErr);
    }
    
    res.json({ 
      success: true, 
      data: { 
        orderId: order._id, 
        amount: total, 
        status: order.status 
      }, 
      message: 'Order created successfully' 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const applyCoupon = async (req, res) => {
  const { cartId, code, items } = req.body;
  
  try {
    let total = 0;
    
    if (cartId) {
      const cart = await Cart.findById(cartId);
      
      if (!cart || !cart.userId.equals(req.user._id)) {
        return res.status(404).json({ success: false, error: 'Cart not found' });
      }
      
      total = cart.total;
    } else if (items && Array.isArray(items)) {
      const productIds = items.map(item => item.productId);
      const products = await Product.find({ _id: { $in: productIds } });
      const productMap = new Map(products.map(p => [p._id.toString(), p]));
      
      for (const item of items) {
        const product = productMap.get(item.productId);
        if (product) {
          total += product.price * item.quantity;
        }
      }
    } else {
      return res.status(400).json({ success: false, error: 'Either cartId or items array is required' });
    }
    
    const coupon = coupons[code];
    
    if (!coupon) {
      return res.status(400).json({ success: false, error: 'Invalid coupon code' });
    }
    
    if (new Date() > coupon.expiresAt) {
      return res.status(400).json({ success: false, error: 'Coupon has expired' });
    }
    
    if (total < coupon.minOrder) {
      return res.status(400).json({ success: false, error: `Minimum order value is ₹${coupon.minOrder}` });
    }
    
    let discount = 0;
    if (coupon.type === 'percentage') {
      discount = (total * coupon.discount) / 100;
    } else {
      discount = coupon.discount;
    }
    
    res.json({ success: true, data: { discount, code } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id })
      .populate({
        path: 'cartItems.productId',
        select: 'title images price sellerId',
        populate: { path: 'sellerId', select: 'name verified rating' }
      })
      .sort({ createdAt: -1 })
      .lean();
    
    // Enrich cartItems with product details
    const enrichedOrders = orders.map(order => ({
      ...order,
      id: order._id,
      cartItems: order.cartItems.map(item => ({
        id: item._id,
        productId: item.productId?._id || item.productId,
        product: {
          id: item.productId?._id,
          title: item.productId?.title || item.title,
          images: item.productId?.images || [],
          price: item.productId?.price || item.price,
          sellerId: item.productId?.sellerId
        },
        title: item.title,
        price: item.price,
        quantity: item.quantity,
        sellerId: item.sellerId
      }))
    }));
    
    res.json({ success: true, data: { orders: enrichedOrders } });
  } catch (err) {
    console.error('Get user orders error:', err);
    res.status(500).json({ success: false, msg: 'Failed to fetch orders' });
  }
};

export const getSellerOrders = async (req, res) => {
  try {
    // Find all orders that contain products from this seller
    const orders = await Order.find({
      'cartItems.sellerId': req.user._id
    })
      .populate({
        path: 'cartItems.productId',
        select: 'title images price sellerId',
        populate: { path: 'sellerId', select: 'name verified rating' }
      })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    
    // Filter and enrich - only include items belonging to this seller
    const enrichedOrders = orders.map(order => {
      const sellerItems = order.cartItems.filter(
        item => item.sellerId?.toString() === req.user._id.toString()
      );
      
      if (sellerItems.length === 0) return null;
      
      return {
        ...order,
        id: order._id,
        cartItems: sellerItems.map(item => ({
          id: item._id,
          productId: item.productId?._id || item.productId,
          product: {
            id: item.productId?._id,
            title: item.productId?.title || item.title,
            images: item.productId?.images || [],
            price: item.productId?.price || item.price,
            sellerId: item.productId?.sellerId
          },
          title: item.title,
          price: item.price,
          quantity: item.quantity,
          sellerId: item.sellerId
        })),
        // Calculate seller-specific total
        sellerTotal: sellerItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      };
    }).filter(Boolean);
    
    res.json({ success: true, data: { orders: enrichedOrders } });
  } catch (err) {
    console.error('Get seller orders error:', err);
    res.status(500).json({ success: false, msg: 'Failed to fetch seller orders' });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate({
        path: 'cartItems.productId',
        select: 'title images price sellerId description',
        populate: { path: 'sellerId', select: 'name verified rating email phone' }
      })
      .populate('userId', 'name email phone')
      .lean();
    
    if (!order) {
      return res.status(404).json({ success: false, msg: 'Order not found' });
    }
    
    // Check ownership: user must be buyer OR seller of items in order
    const isBuyer = order.userId._id.toString() === req.user._id.toString();
    const isSeller = order.cartItems.some(
      item => item.sellerId?.toString() === req.user._id.toString()
    );
    
    if (!isBuyer && !isSeller && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, msg: 'Access denied' });
    }
    
    // Enrich order
    const enrichedOrder = {
      ...order,
      id: order._id,
      cartItems: order.cartItems.map(item => ({
        id: item._id,
        productId: item.productId?._id || item.productId,
        product: {
          id: item.productId?._id,
          title: item.productId?.title || item.title,
          images: item.productId?.images || [],
          price: item.productId?.price || item.price,
          description: item.productId?.description,
          sellerId: item.productId?.sellerId,
          seller: item.productId?.sellerId ? {
            id: item.productId.sellerId._id,
            name: item.productId.sellerId.name,
            verified: item.productId.sellerId.verified,
            rating: item.productId.sellerId.rating
          } : null
        },
        title: item.title,
        price: item.price,
        quantity: item.quantity,
        sellerId: item.sellerId
      }))
    };
    
    res.json({ success: true, data: { order: enrichedOrder } });
  } catch (err) {
    console.error('Get order by ID error:', err);
    res.status(500).json({ success: false, msg: 'Failed to fetch order details' });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { status, trackingNumber } = req.body;
    
    // Validate status
    const allowedStatuses = ['pending', 'processing', 'paid', 'shipped', 'delivered', 'cancelled'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, msg: 'Invalid status value' });
    }
    
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, msg: 'Order not found' });
    }
    
    // Check permissions: seller of items OR admin
    const isSeller = order.cartItems.some(
      item => item.sellerId?.toString() === req.user._id.toString()
    );
    
    if (!isSeller && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, msg: 'Access denied' });
    }
    
    // Update order
    order.status = status;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    await order.save();
    
    // Send status update email to buyer
    try {
      const buyer = await User.findById(order.userId);
      if (buyer) {
        await sendOrderStatusEmail(buyer, order);
      }
    } catch (emailErr) {
      console.error('Failed to send order status email:', emailErr);
    }
    
    res.json({
      success: true,
      data: {
        order: {
          id: order._id,
          status: order.status,
          trackingNumber: order.trackingNumber,
          updatedAt: order.updatedAt
        }
      },
      msg: 'Order status updated successfully'
    });
  } catch (err) {
    console.error('Update order status error:', err);
    res.status(500).json({ success: false, msg: 'Failed to update order status' });
  }
};

export const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ success: false, msg: 'Order not found' });
    }
    
    // Check ownership
    if (order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, msg: 'Access denied' });
    }
    
    // Only allow cancellation of pending orders
    if (order.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        msg: `Cannot cancel order with status: ${order.status}` 
      });
    }
    
    // Restore product stock
    for (const item of order.cartItems) {
      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { stock: item.quantity } }
      );
    }
    
    // Update order status
    order.status = 'cancelled';
    order.paymentStatus = order.paymentStatus === 'paid' ? 'refunded' : 'failed';
    await order.save();
    
    res.json({ success: true, msg: 'Order cancelled successfully' });
  } catch (err) {
    console.error('Cancel order error:', err);
    res.status(500).json({ success: false, msg: 'Failed to cancel order' });
  }
};
