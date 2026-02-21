// src/routes/clustering.routes.js

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
router.post("/create-batch", async (req, res) => {
  try {
    const { delivery_id } = req.body;

    if (!delivery_id) {
      return res.status(400).json({
        success: false,
        error: "delivery_id is required",
      });
    }

    const result = await createBatchFromNearby(delivery_id);

    if (result.success) {
      return res.status(201).json(result);
    } else if (result.canBatch === false) {
      // Not an error, just not enough nearby deliveries
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

// GET: Find nearby deliveries
// Usage: GET /api/clustering/nearby?latitude=6.5244&longitude=3.3792&radius=1
router.get("/nearby", async (req, res) => {
  try {
    const { latitude, longitude, radius } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: "latitude and longitude are required",
      });
    }

    const radiusKm = radius ? parseFloat(radius) : 1;
    const result = await findNearbyDeliveries(
      parseFloat(latitude),
      parseFloat(longitude),
      radiusKm,
    );

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

// GET: Get best available rider
// Usage: GET /api/clustering/best-rider
router.get("/best-rider", async (req, res) => {
  try {
    const result = await findBestRider();

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

// GET: Get clustering statistics
// Usage: GET /api/clustering/stats
router.get("/stats", async (req, res) => {
  try {
    const result = await getClusteringStats();

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
