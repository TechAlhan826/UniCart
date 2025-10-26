// what: express server setup
// why: runs app, connects db, loads passport/routes
// how: middleware for json/cors, init passport

import express from 'express';
import connectDB from './config/db.js';
import passportSetup from './passport.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import adminRoutes from './routes/admin.js';
import cartRoutes from './routes/cart.js';
import orderRoutes from './routes/orders.js';
import paymentRoutes from './routes/payments.js';
import supportRoutes from './routes/support.js';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import os from 'os';
import { validateEnv } from './config/security.js';

dotenv.config();

// Validate environment variables on startup
validateEnv();

const app = express();

// connect db
connectDB();

// middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());

// CORS configuration - use FRONTEND_URL from .env
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.FRONTEND_URL]
  : [process.env.FRONTEND_URL || 'http://localhost:5173', 'http://localhost:8081'];

app.use(cors({ 
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// app.use(
//   cors({
//     origin: ["http://localhost:8081", "http://localhost:3000"], // FE dev servers
//     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//     credentials: true, // if you ever set cookies
//   })
// );

// // Make sure preflight (OPTIONS) requests don’t die
// app.options("*", cors());

// passport setup
import passport from 'passport';
passportSetup(passport);
app.use(passport.initialize());

// routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/support', supportRoutes);

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      const familyV4Value = typeof iface.family === 'string' ? 'IPv4' : 4;
      if (iface.family === familyV4Value && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  const localIp = getLocalIpAddress();
  console.log(`Server is running at http://localhost:${PORT}`);
  console.log(`Server is also accessible on your network at http://${localIp}:${PORT}`);
});