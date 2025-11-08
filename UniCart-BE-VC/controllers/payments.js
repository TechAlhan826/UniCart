import Order from '../models/Order.js';
import Product from '../models/Product.js';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

export const confirmPayment = async (req, res) => {
  try {
    const { orderId, razorpayPaymentId, razorpayOrderId, signature } = req.body;
    
    // Validate input
    if (!orderId || !razorpayPaymentId || !razorpayOrderId || !signature) {
      return res.status(400).json({ success: false, msg: 'Missing required payment details' });
    }
    
    // Find order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, msg: 'Order not found' });
    }
    
    // Check ownership
    if (order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, msg: 'Access denied' });
    }
    
    // Verify Razorpay signature
    const razorpaySecret = process.env.RAZORPAY_KEY_SECRET || 'test_secret';
    const generatedSignature = crypto
      .createHmac('sha256', razorpaySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');
    
    if (generatedSignature !== signature) {
      return res.status(400).json({ success: false, msg: 'Payment verification failed - Invalid signature' });
    }
    
    // Update order
    order.razorpayPaymentId = razorpayPaymentId;
    order.status = 'paid';
    order.paymentStatus = 'paid';
    await order.save();
    
    // INSTANT RESPONSE
    const responseData = {
      id: order._id,
      status: order.status,
      paymentStatus: order.paymentStatus,
      razorpayPaymentId: order.razorpayPaymentId
    };
    
    res.json({
      success: true,
      data: { order: responseData },
      msg: 'Payment verified successfully'
    });
    
    // Update product stock in background (non-blocking)
    setImmediate(async () => {
      try {
        const stockUpdatePromises = order.cartItems.map(item =>
          Product.findByIdAndUpdate(
            item.productId,
            { $inc: { stock: -item.quantity } }
          ).catch(err => console.error(`Stock update failed for ${item.productId}:`, err))
        );
        
        await Promise.allSettled(stockUpdatePromises);
        console.log(`✅ Stock updated for order ${order._id}`);
      } catch (err) {
        console.error(`❌ Stock update failed for order ${order._id}:`, err);
      }
    });
  } catch (err) {
    console.error('Confirm payment error:', err);
    res.status(500).json({ success: false, msg: 'Failed to verify payment' });
  }
};
