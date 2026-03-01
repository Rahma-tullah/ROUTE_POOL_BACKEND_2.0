// src/routes/verification.routes.js
import { verifyToken } from "../middleware/auth.middleware.js";
import {
  strictLimiter,
  verifyLimiter,
} from "../middleware/ratelimit.middleware.js";
import supabase from "../config/supabase.js";
import { logger } from "../utils/logger.js";
import express from "express";
import {
  generateVerificationCode,
  verifyCode,
  getCodeInfo,
} from "../services/verification.service.js";

const router = express.Router();

// POST: Generate verification code for delivery
// Usage: POST /api/verification/generate
router.post("/generate", verifyToken, verifyLimiter, async (req, res) => {
  try {
    const delivery_id = parseInt(req.body.delivery_id, 10);
    const dbUserId = req.dbUser?.id;

    if (!delivery_id) {
      return res
        .status(400)
        .json({ success: false, error: "delivery_id is required" });
    }

    // Verify user owns this delivery
    const { data: delivery } = await supabase
      .from("deliveries")
      .select("retailer_id")
      .eq("id", delivery_id)
      .single();

    if (!delivery) {
      return res
        .status(404)
        .json({ success: false, error: "Delivery not found" });
    }

    if (delivery.retailer_id !== dbUserId) {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
        message:
          "You do not have permission to generate codes for this delivery",
      });
    }

    const result = await generateVerificationCode(delivery_id);
    return res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    logger.error("Generate code failed", { error: error.message });
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to generate code",
    });
  }
});

// POST: Verify code for delivery
// Usage: POST /api/verification/verify
router.post("/verify", verifyToken, verifyLimiter, async (req, res) => {
  try {
    const delivery_id = parseInt(req.body.delivery_id, 10);
    const { code } = req.body;

    if (!delivery_id || !code) {
      return res
        .status(400)
        .json({ success: false, error: "delivery_id and code are required" });
    }

    const result = await verifyCode(delivery_id, code);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    logger.error("Verify code failed", { error: error.message });
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Verification failed",
    });
  }
});

// GET: Get code info
// Usage: GET /api/verification/info/:codeId
router.get("/info/:codeId", async (req, res) => {
  try {
    const result = await getCodeInfo(req.params.codeId);
    return res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
