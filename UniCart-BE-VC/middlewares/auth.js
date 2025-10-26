// what: auth middleware
// why: verify jwt from bearer or cookie
// how: decode token, attach user to req

import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

export const authMiddleware = async (req, res, next) => {
  let token = req.header('Authorization')?.replace('Bearer ', '');
  
  // fallback to cookie if no bearer token
  if (!token && req.cookies?.token) {
    token = req.cookies.token;
  }
  
  if (!token) return res.status(401).json({ success: false, error: 'No token, authorization denied' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ success: false, error: 'Invalid token' });
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ success: false, error: 'Token is not valid' });
  }
};

export const sellerMiddleware = (req, res, next) => {
  if (req.user.role !== 'seller' || !req.user.isVerified) {
    return res.status(403).json({ success: false, error: 'Not authorized as verified seller' });
  }
  next();
};

export const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Not authorized as admin' });
  }
  next();
};