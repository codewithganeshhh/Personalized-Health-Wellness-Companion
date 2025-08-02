const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid token or user not found' });
    }

    // Update last active timestamp
    user.lastActive = new Date();
    await user.save();

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// Check if user has premium subscription
const requirePremium = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const { subscription } = req.user;
  const now = new Date();

  if (subscription.type === 'free') {
    return res.status(403).json({ 
      message: 'Premium subscription required',
      upgradeRequired: true 
    });
  }

  if (subscription.endDate && subscription.endDate < now) {
    return res.status(403).json({ 
      message: 'Subscription expired',
      subscriptionExpired: true 
    });
  }

  next();
};

// Check if user has expert subscription
const requireExpert = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const { subscription } = req.user;
  const now = new Date();

  if (subscription.type !== 'expert') {
    return res.status(403).json({ 
      message: 'Expert subscription required',
      upgradeRequired: true 
    });
  }

  if (subscription.endDate && subscription.endDate < now) {
    return res.status(403).json({ 
      message: 'Subscription expired',
      subscriptionExpired: true 
    });
  }

  next();
};

// Rate limiting middleware
const rateLimitStore = new Map();

const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    const userLimit = rateLimitStore.get(key);
    
    if (now > userLimit.resetTime) {
      userLimit.count = 1;
      userLimit.resetTime = now + windowMs;
      return next();
    }
    
    if (userLimit.count >= maxRequests) {
      return res.status(429).json({
        message: 'Too many requests',
        retryAfter: Math.ceil((userLimit.resetTime - now) / 1000)
      });
    }
    
    userLimit.count++;
    next();
  };
};

// Validate user owns resource
const validateResourceOwnership = (Model, resourceParam = 'id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[resourceParam];
      const resource = await Model.findById(resourceId);

      if (!resource) {
        return res.status(404).json({ message: 'Resource not found' });
      }

      if (resource.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }

      req.resource = resource;
      next();
    } catch (error) {
      return res.status(400).json({ message: 'Invalid resource ID' });
    }
  };
};

// Admin role check
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

module.exports = {
  authenticateToken,
  requirePremium,
  requireExpert,
  rateLimit,
  validateResourceOwnership,
  requireAdmin
};