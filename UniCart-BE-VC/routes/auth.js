// what: auth routes
// why: handle register/login/logout/profile/google
// how: jwt token + cookie fallback, validate inputs

import express from 'express';
import passport from 'passport';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Cart from '../models/Cart.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { authMiddleware } from '../middlewares/auth.js';
import { sendWelcomeEmail, sendVerificationEmail } from '../utils/emailService.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// get current user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({ success: true, data: { user } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// register
router.post('/register', async (req, res) => {
  const { name, email, password, confirmPassword, profile, agreeToTerms } = req.body;
  
  try {
    // validate vit email
    const vitEmailRegex = /@vitstudent\.ac\.in$|@vit\.ac\.in$/i;
    if (!vitEmailRegex.test(email)) {
      return res.status(400).json({ success: false, error: 'Must use VIT email address' });
    }
    
    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, error: 'Passwords do not match' });
    }
    
    if (!agreeToTerms) {
      return res.status(400).json({ success: false, error: 'Must agree to terms and conditions' });
    }
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Email already registered' });
    }
    
    const newUser = new User({ 
      name, 
      email, 
      password, 
      profile: profile || {},
      agreeToTerms 
    });
    await newUser.save();
    
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    const userData = {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      profile: newUser.profile,
      isVerified: newUser.isVerified,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt
    };
    
    res.json({ success: true, data: { token, user: userData } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// login
router.post('/login', async (req, res) => {
  const { email, password, rememberMe } = req.body;
  
  try {
    const user = await User.findOne({ email });
    if (!user || !user.password) {
      return res.status(400).json({ success: false, error: 'Invalid credentials or use Google login' });
    }
    
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: 'Invalid credentials' });
    }
    
    const expiresIn = rememberMe ? '30d' : '7d';
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn });
    
    // optional: set httpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000
    });
    
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profile: user.profile,
      isVerified: user.isVerified,
      rating: user.rating,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
    
    res.json({ success: true, data: { token, user: userData } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully' });
});

// update profile
router.put('/profile', authMiddleware, async (req, res) => {
  const { name, profile } = req.body;
  
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    if (name) user.name = name;
    if (profile) user.profile = { ...user.profile, ...profile };
    
    await user.save();
    
    const userData = await User.findById(user._id).select('-password');
    res.json({ success: true, data: { user: userData }, message: 'Profile updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// google auth start
router.get('/google', passport.authenticate('google', { 
  scope: ['profile', 'email'],
  session: false
}));

// google callback
router.get('/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/login?error=google_auth_failed`,
    session: false
  }), 
  (req, res) => {
    // Successfully authenticated, redirect to frontend with token
    const token = req.user.token;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    // Redirect to frontend callback page with token
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  }
);

// set password for google user
router.post('/set-password', async (req, res) => {
  const { email, password, confirmPassword } = req.body;
  
  if (password !== confirmPassword) {
    return res.status(400).json({ success: false, error: 'Passwords do not match' });
  }
  
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    user.password = password;
    await user.save();
    
    res.json({ success: true, message: 'Password set successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// seller request
router.post('/seller-request', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    if (user.role === 'seller') {
      return res.status(400).json({ success: false, error: 'Already registered as seller' });
    }
    
    user.role = 'seller';
    await user.save();
    
    res.json({ success: true, message: 'Seller request submitted for approval' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// upgrade to seller
router.put('/upgrade-to-seller', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, msg: 'User not found' });
    }
    
    if (user.role === 'seller' || user.role === 'admin') {
      return res.status(400).json({ success: false, msg: 'Account is already a seller' });
    }
    
    user.role = 'seller';
    await user.save();
    
    const userData = await User.findById(user._id).select('-password');
    
    res.json({ 
      success: true, 
      data: { user: userData },
      msg: 'Account upgraded to seller successfully' 
    });
  } catch (err) {
    console.error('Upgrade to seller error:', err);
    res.status(500).json({ success: false, msg: 'Server error' });
  }
});

// change password
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, msg: 'All fields are required' });
    }
    
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, msg: 'Passwords do not match' });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, msg: 'Password must be at least 8 characters' });
    }
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, msg: 'User not found' });
    }
    
    // Check if user has a password (not OAuth user)
    if (!user.password) {
      return res.status(400).json({ success: false, msg: 'Cannot change password for OAuth account' });
    }
    
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, msg: 'Current password is incorrect' });
    }
    
    user.password = newPassword;
    await user.save();
    
    res.json({ success: true, msg: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ success: false, msg: 'Server error' });
  }
});

// send verification email
router.post('/verify-email', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, msg: 'User not found' });
    }
    
    if (user.isVerified) {
      return res.status(400).json({ success: false, msg: 'Email already verified' });
    }
    
    // Check rate limiting (max 3 verification emails per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (user.verificationEmailSentAt && user.verificationEmailSentAt > oneHourAgo) {
      const minutesLeft = Math.ceil((user.verificationEmailSentAt.getTime() + 60 * 60 * 1000 - Date.now()) / (60 * 1000));
      return res.status(429).json({ 
        success: false, 
        msg: `Too many requests. Please try again in ${minutesLeft} minutes` 
      });
    }
    
    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.verificationToken = verificationToken;
    user.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    user.verificationEmailSentAt = new Date();
    await user.save();
    
    // Send verification email
    try {
      await sendVerificationEmail(user.email, user.name, verificationToken);
    } catch (emailErr) {
      console.error('Failed to send verification email:', emailErr);
      return res.status(500).json({ success: false, msg: 'Failed to send verification email' });
    }
    
    res.json({ success: true, msg: 'Verification email sent to your VIT email' });
  } catch (err) {
    console.error('Send verification email error:', err);
    res.status(500).json({ success: false, msg: 'Server error' });
  }
});

// verify email with token
router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ success: false, msg: 'Invalid or expired verification token' });
    }
    
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();
    
    res.json({ success: true, msg: 'Email verified successfully. You can now login.' });
  } catch (err) {
    console.error('Verify email error:', err);
    res.status(500).json({ success: false, msg: 'Server error' });
  }
});

// delete account
router.delete('/delete-account', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, msg: 'User not found' });
    }
    
    // Check for active orders (non-delivered, non-cancelled)
    const activeOrders = await Order.find({
      userId: user._id,
      status: { $nin: ['delivered', 'cancelled'] }
    });
    
    if (activeOrders.length > 0) {
      return res.status(400).json({ 
        success: false, 
        msg: 'Cannot delete account with active orders. Please wait for order completion or contact support.' 
      });
    }
    
    // Delete user's products
    await Product.deleteMany({ sellerId: user._id });
    
    // Delete user's cart
    await Cart.deleteOne({ userId: user._id });
    
    // Delete user (orders are preserved for legal/audit purposes)
    await User.findByIdAndDelete(user._id);
    
    res.json({ success: true, msg: 'Account deleted successfully' });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ success: false, msg: 'Server error' });
  }
});

export default router;