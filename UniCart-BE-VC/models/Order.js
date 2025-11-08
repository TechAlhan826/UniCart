// what: order schema
// why: track purchases and payments
// how: ref user, store cart snapshot, payment details

import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cartItems: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    title: String,
    price: Number,
    quantity: Number,
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  }],
  total: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'processing', 'paid', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
  paymentMethod: { type: String, enum: ['razorpay', 'cod'], required: true },
  shippingAddress: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    line1: { type: String, required: true },
    line2: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
  },
  razorpayOrderId: String,
  razorpayPaymentId: String,
  trackingNumber: String,
  couponCode: String,
  discount: { type: Number, default: 0 },
}, { timestamps: true });

// Add indexes for better query performance
orderSchema.index({ userId: 1, createdAt: -1 }); // For fetching user orders
orderSchema.index({ status: 1 }); // For admin filtering
orderSchema.index({ razorpayOrderId: 1 }); // For payment verification
orderSchema.index({ 'cartItems.sellerId': 1 }); // For seller orders

export default mongoose.model('Order', orderSchema);
