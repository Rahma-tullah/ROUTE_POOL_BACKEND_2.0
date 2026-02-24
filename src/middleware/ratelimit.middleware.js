// src/middleware/ratelimit.middleware.js

import rateLimit from "express-rate-limit";

// General rate limit: 100 requests per 15 minutes
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: "Too many requests",
    message: "Please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limit: 5 requests per 15 minutes
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: "Too many requests",
    message: "Please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// OTP rate limit: 3 OTP requests per hour (per email)
export const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    error: "Too many OTP requests",
    message: "Please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Verification rate limit: 10 verification attempts per minute
export const verifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: "Too many verification attempts",
    message: "Please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
