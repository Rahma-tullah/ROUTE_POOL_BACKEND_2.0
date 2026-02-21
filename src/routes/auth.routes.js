// src/routes/auth.routes.js

import express from "express";
import {
  signup,
  sendOTP,
  verifyOTP,
  getCurrentUser,
  logout,
} from "../services/auth.service.js";

const router = express.Router();

// POST: Signup (create new user)
// Usage: POST /api/auth/signup
router.post("/signup", async (req, res) => {
  try {
    const result = await signup(req.body);

    if (result.success) {
      return res.status(201).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// POST: Send OTP
// Usage: POST /api/auth/send-otp
router.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;
    const result = await sendOTP(email);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// POST: Verify OTP and Login
// Usage: POST /api/auth/verify-otp
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const result = await verifyOTP(email, otp);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET: Get current user
// Usage: GET /api/auth/me
// Header: Authorization: Bearer <token>
router.get("/me", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "No token provided",
        message: "Please login first",
      });
    }

    const result = await getCurrentUser(token);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(401).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// POST: Logout
// Usage: POST /api/auth/logout
router.post("/logout", async (req, res) => {
  try {
    const result = await logout();

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
