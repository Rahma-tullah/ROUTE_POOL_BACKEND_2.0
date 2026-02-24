// src/routes/clustering.routes.js
import { verifyToken } from "../middleware/auth.middleware.js";
import { strictLimiter } from "../middleware/ratelimit.middleware.js";
import { logger } from "../utils/logger.js";
import express from "express";
import {
  findNearbyDeliveries,
  createBatchFromNearby,
  getClusteringStats,
  findBestRider,
} from "../services/clustering.service.js";

const router = express.Router();

// POST: Create batch from nearby deliveries
// Usage: POST /api/clustering/create-batch
// Body: { delivery_id: 1 }
router.post("/create-batch", verifyToken, strictLimiter, async (req, res) => {
  try {
    const { delivery_id } = req.body;
    const userId = req.user.id;

    if (!delivery_id) {
      return res.status(400).json({
        success: false,
        error: "delivery_id is required",
      });
    }

    // Verify user owns this delivery
    const { data: delivery } = await supabase
      .from("deliveries")
      .select("retailer_id")
      .eq("id", delivery_id)
      .single();

    if (!delivery || delivery.retailer_id !== userId) {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
        message: "You can only create batches for your own deliveries",
      });
    }

    const result = await createBatchFromNearby(delivery_id);

    if (result.success) {
      return res.status(201).json(result);
    } else {
      return res.status(200).json(result);
    }
  } catch (error) {
    logger.error("Create batch failed", { error: error.message });
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to create batch",
    });
  }
});

// GET: Find nearby deliveries
// Usage: GET /api/clustering/nearby?latitude=6.5244&longitude=3.3792&radius=1
router.get("/nearby", verifyToken, async (req, res) => {
  try {
    let { latitude, longitude, radius } = req.query;

    // Validate coordinates
    latitude = parseFloat(latitude);
    longitude = parseFloat(longitude);
    radius = radius ? parseFloat(radius) : 1;

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        success: false,
        error: "Invalid coordinates",
        message: "latitude and longitude must be valid numbers",
      });
    }

    // Validate bounds
    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({
        success: false,
        error: "Invalid latitude",
        message: "Latitude must be between -90 and 90",
      });
    }

    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        error: "Invalid longitude",
        message: "Longitude must be between -180 and 180",
      });
    }

    // Limit radius to prevent DoS
    if (radius > 50) {
      return res.status(400).json({
        success: false,
        error: "Radius too large",
        message: "Maximum radius is 50km",
      });
    }

    const result = await findNearbyDeliveries(latitude, longitude, radius);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    logger.error("Find nearby deliveries failed", { error: error.message });
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to find nearby deliveries",
    });
  }
});

// GET: Get best available rider
// Usage: GET /api/clustering/best-rider
router.get("/best-rider", verifyToken, async (req, res) => {
  try {
    const result = await findBestRider();

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    logger.error("Find best rider failed", { error: error.message });
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to find best rider",
    });
  }
});

// GET: Get clustering statistics
// Usage: GET /api/clustering/stats
router.get("/stats", verifyToken, async (req, res) => {
  try {
    const result = await getClusteringStats();

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    logger.error("Get clustering stats failed", { error: error.message });
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to get statistics",
    });
  }
});

export default router;
