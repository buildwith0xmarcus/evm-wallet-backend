const rateLimit = require('express-rate-limit');

/**
 * General API limiter - provides basic protection for all routes
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // maximum 500 requests per IP in 15 minutes
  message: {
    success: false,
    message: 'Too many requests, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Stricter limit for critical operations like wallet creation and import
 */
const walletActionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // maximum 20 requests per IP per hour
  message: {
    success: false,
    message: 'Too many wallet operations, please try again after 1 hour.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Special limit for transaction operations
 */
const transactionLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 30, // maximum 30 transactions per IP in 10 minutes
  message: {
    success: false,
    message: 'Too many transaction requests, please try again after 10 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Limiter for WebSocket connections
 */
const websocketLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // maximum 50 connections per IP in 5 minutes
  message: {
    success: false,
    message: 'Too many WebSocket connections, please try again after 5 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  globalLimiter,
  walletActionLimiter,
  transactionLimiter,
  websocketLimiter
}; 