// src/routes/verification.routes.js

import express from "express";
import {
  generateVerificationCode,
  verifyCode,
  getCodeInfo,
} from "../services/verification.service.js";

const router = express.Router();

// POST: Generate verification code for delivery
// Usage: POST /api/verification/generate
router.post("/generate", async (req, res) => {
  try {
    const { delivery_id } = req.body;

    if (!delivery_id) {
      return res.status(400).json({
        success: false,
        error: "delivery_id is required",
      });
    }

    const result = await generateVerificationCode(delivery_id);

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

// POST: Verify code for delivery
// Usage: POST /api/verification/verify
router.post("/verify", async (req, res) => {
  try {
    const { delivery_id, code } = req.body;

    if (!delivery_id || !code) {
      return res.status(400).json({
        success: false,
        error: "delivery_id and code are required",
      });
    }

    const result = await verifyCode(delivery_id, code);

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

// GET: Get code info
// Usage: GET /api/verification/info/:codeId
router.get("/info/:codeId", async (req, res) => {
  try {
    const { codeId } = req.params;

    const result = await getCodeInfo(codeId);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(404).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
