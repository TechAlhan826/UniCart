// what: security configuration and middleware
// why: prevent common vulnerabilities
// how: rate limiting, input sanitization, security headers

import dotenv from 'dotenv';

dotenv.config();

// Security configuration
export const securityConfig = {
  // JWT settings
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    algorithm: 'HS256'
  },
  
  // CORS settings
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL 
      : [process.env.FRONTEND_URL || 'http://localhost:5173', 'http://localhost:8081'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  
  // Rate limiting (requests per window)
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // limit each IP to 100 requests per windowMs
    skipSuccessfulRequests: false
  },
  
  // Password policy
  password: {
    minLength: 8,
    requireUppercase: false,
    requireLowercase: false,
    requireNumbers: false,
    requireSpecialChars: false
  },
  
  // File upload limits
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    maxFiles: 5
  },
  
  // Email verification
  email: {
    verificationTokenExpiry: 24 * 60 * 60 * 1000, // 24 hours
    resendCooldown: 60 * 60 * 1000 // 1 hour
  }
};

// Input sanitization helpers
export const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    // Remove any potential XSS vectors
    return input
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }
  return input;
};

// Validate environment variables on startup
export const validateEnv = () => {
  const required = [
    'MONGO_URI',
    'JWT_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    console.error('Please check your .env file and ensure all required variables are set.');
    process.exit(1);
  }
  
  // Warn about weak JWT secret
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.warn('⚠️  WARNING: JWT_SECRET should be at least 32 characters long for security!');
  }
  
  // Warn about default values
  if (process.env.JWT_SECRET === 'change_this_super_secure') {
    console.warn('⚠️  WARNING: Please change JWT_SECRET from default value before deploying to production!');
  }
  
  if (process.env.RAZORPAY_KEY_ID === 'rzp_test_xxxxxxxxxxxx') {
    console.warn('⚠️  INFO: Using placeholder Razorpay credentials. Update for production use.');
  }
  
  console.log('✅ Environment variables validated successfully');
};

export default securityConfig;
