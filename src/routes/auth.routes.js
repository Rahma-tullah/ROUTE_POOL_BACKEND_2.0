// src/routes/auth.routes.js
import { verifyToken } from "../middleware/auth.middleware.js";
import {
  otpLimiter,
  verifyLimiter,
  strictLimiter,
} from "../middleware/ratelimit.middleware.js";
import express from "express";
import {
  signup,
  sendOTP,
  verifyOTP,
  getCurrentUser,
  logout,
} from "../services/auth.service.js";
import { logger } from "../utils/logger.js";
const router = express.Router();

// POST: Signup (create new user)
// Usage: POST /api/auth/signup
// POST /api/auth/signup
router.post("/signup", async (req, res) => {
  try {
    // Whitelist only expected fields
    const allowedFields = [
      "name",
      "email",
      "phone",
      "user_type",
      "shop_name",
      "vehicle_type",
    ];
    const filteredBody = {};

    allowedFields.forEach((field) => {
      if (field in req.body) {
        filteredBody[field] = req.body[field];
      }
    });

    const result = await signup(filteredBody);

    if (result.success) {
      return res.status(201).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    logger.error("Signup failed", { error: error.message });
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Signup failed. Please try again.",
    });
  }
});

// POST /api/auth/send-otp (WITH RATE LIMIT)
router.post("/send-otp", otpLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "email is required",
        message: "Email is required",
      });
    }

    const result = await sendOTP(email);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    logger.error("Send OTP failed", { error: error.message });
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to send OTP. Please try again.",
    });
  }
});

// POST /api/auth/verify-otp (WITH RATE LIMIT)
router.post("/verify-otp", verifyLimiter, async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        error: "email and otp are required",
        message: "Email and OTP are required",
      });
    }

    const result = await verifyOTP(email, otp);

    if (result.success) {
      // Set token as HTTPOnly cookie
      res.cookie("auth_token", result.data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });

      // Return user data but NOT token in body
      return res.status(200).json({
        success: true,
        data: {
          user: result.data.user,
          message: "Login successful",
        },
      });
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    logger.error("Verify OTP failed", { error: error.message });
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Verification failed. Please try again.",
    });
  }
});

// GET /api/auth/me (PROTECTED)
router.get("/me", verifyToken, async (req, res) => {
  try {
    const result = await getCurrentUser(req.token);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(401).json(result);
    }
  } catch (error) {
    logger.error("Get current user failed", { error: error.message });
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to get user info",
    });
  }
});

// POST /api/auth/logout (PROTECTED)
router.post("/logout", verifyToken, async (req, res) => {
  try {
    const result = await logout();

    // Clear the auth cookie
    res.clearCookie("auth_token");

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    logger.error("Logout failed", { error: error.message });
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Logout failed",
    });
  }
});

export default router;
