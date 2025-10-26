// what: email utility functions
// why: send transactional emails to users
// how: nodemailer with gmail smtp

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Generic email sender
export const sendEmail = async (to, subject, html) => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('SMTP not configured. Email not sent:', subject);
      return;
    }

    await transporter.sendMail({
      from: process.env.SMTP_FROM || `UniCart <${process.env.SMTP_USER}>`,
      to,
      subject,
      html
    });
    console.log(`Email sent to ${to}: ${subject}`);
  } catch (error) {
    console.error('Email send error:', error);
    // Don't throw error to prevent breaking the main flow
  }
};

// Welcome Email
export const sendWelcomeEmail = async (user, verificationToken = null) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .button { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to UniCart! 🎉</h1>
        </div>
        <div class="content">
          <h2>Hi ${user.name},</h2>
          <p>Welcome to UniCart - VIT's premier campus marketplace!</p>
          <p>Your account has been successfully created. You can now:</p>
          <ul>
            <li>Browse thousands of products from fellow students</li>
            <li>List your own items for sale</li>
            <li>Connect with buyers and sellers on campus</li>
            <li>Track your orders in real-time</li>
          </ul>
          ${verificationToken ? `
            <p><strong>Please verify your email to get started:</strong></p>
            <a href="${frontendUrl}/auth/verify-email/${verificationToken}" class="button">Verify Email</a>
            <p><small>This link expires in 24 hours</small></p>
          ` : ''}
          <p>Get started now:</p>
          <a href="${frontendUrl}" class="button">Browse Products</a>
        </div>
        <div class="footer">
          <p>Need help? Contact us at support@unicart.vit.ac.in</p>
          <p>&copy; 2025 UniCart - VIT Campus Marketplace</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  await sendEmail(user.email, 'Welcome to UniCart - VIT Campus Marketplace', html);
};

// Email Verification
export const sendVerificationEmail = async (email, name, token) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const verificationUrl = `${frontendUrl}/auth/verify-email/${token}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .button { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Verify Your Email 📧</h1>
        </div>
        <div class="content">
          <h2>Hi ${name},</h2>
          <p>Thank you for registering with UniCart!</p>
          <p>Please verify your email address to activate your account:</p>
          <a href="${verificationUrl}" class="button">Verify Email Address</a>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          <p><small>This link expires in 24 hours</small></p>
          <p>If you didn't create an account with UniCart, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>&copy; 2025 UniCart - VIT Campus Marketplace</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  await sendEmail(email, 'Verify Your UniCart Email Address', html);
};

// Password Reset Email
export const sendPasswordResetEmail = async (email, name, token) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetUrl = `${frontendUrl}/auth/reset-password/${token}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #DC2626; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .button { display: inline-block; padding: 12px 24px; background: #DC2626; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .warning { background: #FEF2F2; border-left: 4px solid #DC2626; padding: 12px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Reset Your Password 🔐</h1>
        </div>
        <div class="content">
          <h2>Hi ${name},</h2>
          <p>We received a request to reset your UniCart password.</p>
          <p>Click the button below to reset your password:</p>
          <a href="${resetUrl}" class="button">Reset Password</a>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p><small>This link expires in 1 hour</small></p>
          <div class="warning">
            <strong>Security Notice:</strong> If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
          </div>
        </div>
        <div class="footer">
          <p>&copy; 2025 UniCart - VIT Campus Marketplace</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  await sendEmail(email, 'Reset Your UniCart Password', html);
};

// Order Confirmation Email
export const sendOrderConfirmationEmail = async (user, order) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  
  const itemsHtml = order.cartItems.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #ddd;">
        ${item.title}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">
        ${item.quantity}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">
        ₹${item.price.toLocaleString()}
      </td>
    </tr>
  `).join('');
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10B981; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .button { display: inline-block; padding: 12px 24px; background: #10B981; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        .order-details { background: white; padding: 15px; margin: 15px 0; border-radius: 6px; }
        table { width: 100%; border-collapse: collapse; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Order Confirmed! ✅</h1>
          <p>Order #${order._id}</p>
        </div>
        <div class="content">
          <h2>Hi ${user.name},</h2>
          <p>Thank you for your order! We've received your order and it's being processed.</p>
          
          <div class="order-details">
            <h3>Order Details</h3>
            <table>
              <thead>
                <tr style="background: #f3f4f6;">
                  <th style="padding: 10px; text-align: left;">Item</th>
                  <th style="padding: 10px; text-align: center;">Qty</th>
                  <th style="padding: 10px; text-align: right;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
              <tfoot>
                ${order.discount ? `
                  <tr>
                    <td colspan="2" style="padding: 10px; text-align: right;"><strong>Subtotal:</strong></td>
                    <td style="padding: 10px; text-align: right;">₹${(order.total + order.discount).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td colspan="2" style="padding: 10px; text-align: right;"><strong>Discount:</strong></td>
                    <td style="padding: 10px; text-align: right; color: #10B981;">-₹${order.discount.toLocaleString()}</td>
                  </tr>
                ` : ''}
                <tr style="background: #f3f4f6; font-size: 18px;">
                  <td colspan="2" style="padding: 10px; text-align: right;"><strong>Total:</strong></td>
                  <td style="padding: 10px; text-align: right;"><strong>₹${order.total.toLocaleString()}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          <div class="order-details">
            <h3>Shipping Address</h3>
            <p>
              ${order.shippingAddress.name}<br>
              ${order.shippingAddress.phone}<br>
              ${order.shippingAddress.line1}${order.shippingAddress.line2 ? ', ' + order.shippingAddress.line2 : ''}<br>
              ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}
            </p>
          </div>
          
          <div class="order-details">
            <p><strong>Payment Method:</strong> ${order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</p>
            <p><strong>Order Status:</strong> ${order.status}</p>
          </div>
          
          <a href="${frontendUrl}/orders/${order._id}" class="button">Track Your Order</a>
        </div>
        <div class="footer">
          <p>Questions? Contact us at support@unicart.vit.ac.in</p>
          <p>&copy; 2025 UniCart - VIT Campus Marketplace</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  await sendEmail(user.email, `Order Confirmed #${order._id} - UniCart`, html);
};

// Order Status Update Email
export const sendOrderStatusEmail = async (user, order) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  
  const statusMessages = {
    'processing': 'Your order is being processed',
    'shipped': 'Your order has been shipped! 📦',
    'delivered': 'Your order has been delivered! 🎉',
    'cancelled': 'Your order has been cancelled'
  };
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .button { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        .status-box { background: white; padding: 20px; margin: 15px 0; border-radius: 6px; text-align: center; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Order Status Update</h1>
          <p>Order #${order._id}</p>
        </div>
        <div class="content">
          <h2>Hi ${user.name},</h2>
          <div class="status-box">
            <h3>${statusMessages[order.status] || 'Order status updated'}</h3>
            <p><strong>Current Status:</strong> ${order.status.toUpperCase()}</p>
            ${order.trackingNumber ? `<p><strong>Tracking Number:</strong> ${order.trackingNumber}</p>` : ''}
          </div>
          <a href="${frontendUrl}/orders/${order._id}" class="button">View Order Details</a>
        </div>
        <div class="footer">
          <p>&copy; 2025 UniCart - VIT Campus Marketplace</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  await sendEmail(user.email, `Order #${order._id} Status: ${order.status}`, html);
};

// New Order Notification for Seller
export const sendSellerOrderNotification = async (seller, order, sellerItems) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  
  const itemsHtml = sellerItems.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.title}</td>
      <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">₹${item.price.toLocaleString()}</td>
    </tr>
  `).join('');
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #F59E0B; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .button { display: inline-block; padding: 12px 24px; background: #F59E0B; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        .order-details { background: white; padding: 15px; margin: 15px 0; border-radius: 6px; }
        table { width: 100%; border-collapse: collapse; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Order Received! 🛒</h1>
        </div>
        <div class="content">
          <h2>Hi ${seller.name},</h2>
          <p>Great news! You have received a new order.</p>
          
          <div class="order-details">
            <h3>Your Items</h3>
            <table>
              <thead>
                <tr style="background: #f3f4f6;">
                  <th style="padding: 10px; text-align: left;">Product</th>
                  <th style="padding: 10px; text-align: center;">Qty</th>
                  <th style="padding: 10px; text-align: right;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
          </div>
          
          <div class="order-details">
            <h3>Shipping Details</h3>
            <p>
              ${order.shippingAddress.name}<br>
              ${order.shippingAddress.phone}<br>
              ${order.shippingAddress.line1}${order.shippingAddress.line2 ? ', ' + order.shippingAddress.line2 : ''}<br>
              ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}
            </p>
          </div>
          
          <div class="order-details">
            <p><strong>Payment Method:</strong> ${order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paid Online'}</p>
            <p><strong>Payment Status:</strong> ${order.paymentStatus}</p>
          </div>
          
          <p><strong>Action Required:</strong> Please prepare the item(s) for shipping and update the order status.</p>
          
          <a href="${frontendUrl}/orders/seller" class="button">Manage Order</a>
        </div>
        <div class="footer">
          <p>&copy; 2025 UniCart - VIT Campus Marketplace</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  await sendEmail(seller.email, 'New Order Received - UniCart', html);
};

// Support Ticket Response Email
export const sendTicketResponseEmail = async (user, ticket) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .button { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        .ticket-details { background: white; padding: 15px; margin: 15px 0; border-radius: 6px; }
        .response-box { background: #EEF2FF; border-left: 4px solid #4F46E5; padding: 15px; margin: 10px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Response to Your Support Ticket 💬</h1>
          <p>Ticket #${ticket._id}</p>
        </div>
        <div class="content">
          <h2>Hi ${user.name},</h2>
          <p>We've responded to your support ticket.</p>
          
          <div class="ticket-details">
            <h3>Your Request</h3>
            <p><strong>${ticket.title}</strong></p>
            <p>${ticket.description}</p>
          </div>
          
          <div class="response-box">
            <h3>Our Response</h3>
            <p>${ticket.response || 'Please check the ticket for updates.'}</p>
          </div>
          
          <div class="ticket-details">
            <p><strong>Status:</strong> ${ticket.status.toUpperCase()}</p>
            <p><strong>Priority:</strong> ${ticket.priority.toUpperCase()}</p>
          </div>
          
          <a href="${frontendUrl}/support" class="button">View Ticket</a>
        </div>
        <div class="footer">
          <p>Need more help? Reply to this ticket or contact support@unicart.vit.ac.in</p>
          <p>&copy; 2025 UniCart - VIT Campus Marketplace</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  await sendEmail(user.email, `Response to Your Support Ticket #${ticket._id}`, html);
};
