// src/routes/ratings.routes.js
import { verifyToken } from "../middleware/auth.middleware.js";
import supabase from "../config/supabase.js";
import { logger } from "../utils/logger.js";
import express from "express";
import {
  createRating,
  getAllRatings,
  getRatingById,
  getRatingsByRider,
  getRatingsByRetailer,
  getRatingsByDelivery,
  updateRating,
  deleteRating,
} from "../services/ratings.service.js";

const router = express.Router();

// POST: Create a new rating
// Usage: POST /api/ratings
router.post("/", verifyToken, async (req, res) => {
  try {
    const { delivery_id, stars, comment } = req.body;
    const dbUserId = req.dbUser?.id;

    if (!delivery_id || !stars) {
      return res.status(400).json({
        success: false,
        error: "delivery_id and stars are required",
      });
    }

    // Only retailers can rate
    if (!dbUserId || req.dbUser?.user_type !== "retailer") {
      // Double-check by looking up in retailers table
      const { data: retailerCheck } = await supabase
        .from("retailers")
        .select("id")
        .eq("id", dbUserId)
        .single();

      if (!retailerCheck) {
        return res.status(403).json({
          success: false,
          error: "Forbidden",
          message: "Only retailers can create ratings",
        });
      }
    }

    // Get delivery with batch info to resolve rider_id
    const { data: delivery } = await supabase
      .from("deliveries")
      .select("status, retailer_id, batch_id")
      .eq("id", parseInt(delivery_id, 10))
      .single();

    if (!delivery) {
      return res
        .status(404)
        .json({ success: false, error: "Delivery not found" });
    }

    if (delivery.status !== "delivered") {
      return res.status(400).json({
        success: false,
        error: "Invalid delivery status",
        message: "Can only rate completed deliveries",
      });
    }

    if (delivery.retailer_id !== dbUserId) {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
        message: "You can only rate your own deliveries",
      });
    }

    // Resolve rider_id from the batch
    let rider_id = null;
    if (delivery.batch_id) {
      const { data: batch } = await supabase
        .from("batches")
        .select("rider_id")
        .eq("id", delivery.batch_id)
        .single();
      rider_id = batch?.rider_id || null;
    }

    if (!rider_id) {
      return res.status(400).json({
        success: false,
        error: "No rider found",
        message: "This delivery has no assigned rider to rate",
      });
    }

    // Check for duplicate rating
    const { data: existingRating } = await supabase
      .from("ratings")
      .select("id")
      .eq("delivery_id", delivery_id)
      .eq("retailer_id", dbUserId)
      .single();

    if (existingRating) {
      return res.status(400).json({
        success: false,
        error: "Duplicate rating",
        message: "You have already rated this delivery",
      });
    }

    const result = await createRating({
      delivery_id: parseInt(delivery_id, 10),
      rider_id,
      retailer_id: dbUserId,
      stars,
      comment,
    });

    if (result.success) {
      return res.status(201).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    logger.error("Create rating failed", { error: error.message });
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to create rating",
    });
  }
});

// GET: Get all ratings
router.get("/", async (req, res) => {
  try {
    const result = await getAllRatings();
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET: Get ratings by rider
router.get("/rider/:riderId", async (req, res) => {
  try {
    const result = await getRatingsByRider(req.params.riderId);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET: Get ratings by retailer
router.get("/retailer/:retailerId", async (req, res) => {
  try {
    const result = await getRatingsByRetailer(req.params.retailerId);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET: Get ratings by delivery
router.get("/delivery/:deliveryId", async (req, res) => {
  try {
    const result = await getRatingsByDelivery(req.params.deliveryId);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET: Get rating by ID
router.get("/:id", async (req, res) => {
  try {
    const result = await getRatingById(req.params.id);
    return res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT: Update rating
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const dbUserId = req.dbUser?.id;
    const { data: rating } = await supabase
      .from("ratings")
      .select("retailer_id, created_at")
      .eq("id", req.params.id)
      .single();

    if (!rating)
      return res
        .status(404)
        .json({ success: false, error: "Rating not found" });
    if (rating.retailer_id !== dbUserId)
      return res.status(403).json({ success: false, error: "Forbidden" });

    const minutesSince = (new Date() - new Date(rating.created_at)) / 60000;
    if (minutesSince > 30) {
      return res.status(400).json({
        success: false,
        error: "Too late to edit",
        message: "Ratings can only be edited within 30 minutes",
      });
    }

    const { stars, comment } = req.body;
    const result = await updateRating(req.params.id, { stars, comment });
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE: Delete rating
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const dbUserId = req.dbUser?.id;
    const { data: rating } = await supabase
      .from("ratings")
      .select("retailer_id")
      .eq("id", req.params.id)
      .single();

    if (!rating)
      return res
        .status(404)
        .json({ success: false, error: "Rating not found" });
    if (rating.retailer_id !== dbUserId)
      return res.status(403).json({ success: false, error: "Forbidden" });

    const result = await deleteRating(req.params.id);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
