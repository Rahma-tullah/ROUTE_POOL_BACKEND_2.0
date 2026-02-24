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
    const { delivery_id, rider_id, stars, comment } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!delivery_id || !rider_id || !stars) {
      return res.status(400).json({
        success: false,
        error: "delivery_id, rider_id, and stars are required",
      });
    }

    // Only retailer can create ratings
    const { data: retailer } = await supabase
      .from("retailers")
      .select("id")
      .eq("id", userId)
      .single();

    if (!retailer) {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
        message: "Only retailers can create ratings",
      });
    }

    // Verify delivery exists and is completed
    const { data: delivery } = await supabase
      .from("deliveries")
      .select("status, retailer_id")
      .eq("id", delivery_id)
      .single();

    if (!delivery) {
      return res.status(404).json({
        success: false,
        error: "Delivery not found",
      });
    }

    if (delivery.status !== "delivered") {
      return res.status(400).json({
        success: false,
        error: "Invalid delivery status",
        message: "Can only rate completed deliveries",
      });
    }

    if (delivery.retailer_id !== userId) {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
        message: "You can only rate your own deliveries",
      });
    }

    // Check for duplicate rating
    const { data: existingRating } = await supabase
      .from("ratings")
      .select("id")
      .eq("delivery_id", delivery_id)
      .eq("retailer_id", userId)
      .single();

    if (existingRating) {
      return res.status(400).json({
        success: false,
        error: "Duplicate rating",
        message: "You have already rated this delivery",
      });
    }

    const result = await createRating({
      delivery_id,
      rider_id,
      retailer_id: userId,
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
// Usage: GET /api/ratings
router.get("/", async (req, res) => {
  try {
    const result = await getAllRatings();

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

// GET: Get ratings by rider
// Usage: GET /api/ratings/rider/1
router.get("/rider/:riderId", async (req, res) => {
  try {
    const { riderId } = req.params;
    const result = await getRatingsByRider(riderId);

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

// GET: Get ratings by retailer
// Usage: GET /api/ratings/retailer/1
router.get("/retailer/:retailerId", async (req, res) => {
  try {
    const { retailerId } = req.params;
    const result = await getRatingsByRetailer(retailerId);

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

// GET: Get rating by ID
// Usage: GET /api/ratings/1
router.get("/:ratingId", async (req, res) => {
  try {
    const { ratingId } = req.params;
    const result = await getRatingById(ratingId);

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

// PUT: Update rating
// Usage: PUT /api/ratings/1
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get rating to verify ownership
    const { data: rating } = await supabase
      .from("ratings")
      .select("retailer_id, created_at")
      .eq("id", id)
      .single();

    if (!rating) {
      return res.status(404).json({
        success: false,
        error: "Rating not found",
      });
    }

    // Only owner can update
    if (rating.retailer_id !== userId) {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
        message: "You can only update your own ratings",
      });
    }

    // Check time window (30 minutes after creation)
    const createdTime = new Date(rating.created_at).getTime();
    const now = new Date().getTime();
    const thirtyMinutes = 30 * 60 * 1000;

    if (now - createdTime > thirtyMinutes) {
      return res.status(400).json({
        success: false,
        error: "Rating window expired",
        message: "Ratings can only be edited within 30 minutes of creation",
      });
    }

    // Whitelist allowed fields
    const allowedFields = ["stars", "comment"];
    const filteredBody = {};

    allowedFields.forEach((field) => {
      if (field in req.body) {
        filteredBody[field] = req.body[field];
      }
    });

    const result = await updateRating(id, filteredBody);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    logger.error("Update rating failed", { error: error.message });
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to update rating",
    });
  }
});

// DELETE: Delete rating
// Usage: DELETE /api/ratings/1
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get rating to verify ownership
    const { data: rating } = await supabase
      .from("ratings")
      .select("retailer_id")
      .eq("id", id)
      .single();

    if (!rating) {
      return res.status(404).json({
        success: false,
        error: "Rating not found",
      });
    }

    // Only owner can delete
    if (rating.retailer_id !== userId) {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
        message: "You can only delete your own ratings",
      });
    }

    const result = await deleteRating(id);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    logger.error("Delete rating failed", { error: error.message });
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to delete rating",
    });
  }
});

export default router;
