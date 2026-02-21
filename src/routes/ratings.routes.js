// src/routes/ratings.routes.js

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
router.post("/", async (req, res) => {
  try {
    const result = await createRating(req.body);

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
router.put("/:ratingId", async (req, res) => {
  try {
    const { ratingId } = req.params;
    const result = await updateRating(ratingId, req.body);

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

// DELETE: Delete rating
// Usage: DELETE /api/ratings/1
router.delete("/:ratingId", async (req, res) => {
  try {
    const { ratingId } = req.params;
    const result = await deleteRating(ratingId);

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
