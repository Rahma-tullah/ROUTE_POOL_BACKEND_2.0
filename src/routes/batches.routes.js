// src/routes/batches.routes.js
import { verifyToken } from "../middleware/auth.middleware.js";
import supabase from "../config/supabase.js";
import { logger } from "../utils/logger.js";
import express from "express";
import {
  createBatch,
  getAllBatches,
  getBatchById,
  getBatchesByRider,
  getBatchesByStatus,
  updateBatch,
  deleteBatch,
} from "../services/batches.service.js";

const router = express.Router();

// POST: Create a new batch
// Usage: POST /api/batches
router.post("/", async (req, res) => {
  try {
    const result = await createBatch(req.body);

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

// GET: Get all batches
// Usage: GET /api/batches
router.get("/", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Determine user type and get appropriate batches
    const { data: retailer } = await supabase
      .from("retailers")
      .select("id")
      .eq("id", userId)
      .single();

    let batches;

    if (retailer) {
      // Retailer sees only batches containing their deliveries
      const { data: deliveries } = await supabase
        .from("deliveries")
        .select("batch_id")
        .eq("retailer_id", userId)
        .not("batch_id", "is", null);

      const batchIds = deliveries?.map((d) => d.batch_id) || [];

      if (batchIds.length === 0) {
        return res.status(200).json({
          success: true,
          data: [],
        });
      }

      const { data: batchData, error } = await supabase
        .from("batches")
        .select("id, rider_id, status, total_deliveries, created_at")
        .in("id", batchIds);

      if (error) throw error;
      batches = batchData;
    } else {
      // Rider sees only their assigned batches
      const { data: batchData, error } = await supabase
        .from("batches")
        .select("id, rider_id, status, total_deliveries, created_at")
        .eq("rider_id", userId);

      if (error) throw error;
      batches = batchData;
    }

    return res.status(200).json({
      success: true,
      data: batches || [],
    });
  } catch (error) {
    logger.error("Get all batches failed", { error: error.message });
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to get batches",
    });
  }
});

// GET: Get batches by rider
// Usage: GET /api/batches/rider/1
router.get("/rider/:riderId", async (req, res) => {
  try {
    const { riderId } = req.params;
    const result = await getBatchesByRider(riderId);

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

// GET: Get batches by status
// Usage: GET /api/batches/status/in_transit
router.get("/status/:status", async (req, res) => {
  try {
    const { status } = req.params;
    const result = await getBatchesByStatus(status);

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

// GET: Get batch by ID
// Usage: GET /api/batches/1
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get batch
    const { data: batch } = await supabase
      .from("batches")
      .select("id, rider_id, status, total_deliveries, created_at")
      .eq("id", id)
      .single();

    if (!batch) {
      return res.status(404).json({
        success: false,
        error: "Batch not found",
      });
    }

    // Check authorization
    const { data: retailer } = await supabase
      .from("retailers")
      .select("id")
      .eq("id", userId)
      .single();

    if (retailer) {
      // Retailer can only view batches with their deliveries
      const { data: delivery } = await supabase
        .from("deliveries")
        .select("id")
        .eq("batch_id", id)
        .eq("retailer_id", userId)
        .single();

      if (!delivery) {
        return res.status(403).json({
          success: false,
          error: "Forbidden",
          message: "You do not have permission to view this batch",
        });
      }
    } else if (batch.rider_id !== userId) {
      // Rider can only view their own batches
      return res.status(403).json({
        success: false,
        error: "Forbidden",
        message: "You do not have permission to view this batch",
      });
    }

    const result = await getBatch(id);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    logger.error("Get batch failed", { error: error.message });
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to get batch",
    });
  }
});

// PUT: Update batch
// Usage: PUT /api/batches/1
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get batch
    const { data: batch } = await supabase
      .from("batches")
      .select("rider_id")
      .eq("id", id)
      .single();

    if (!batch) {
      return res.status(404).json({
        success: false,
        error: "Batch not found",
      });
    }

    // Only assigned rider can update batch
    if (batch.rider_id !== userId) {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
        message: "You do not have permission to update this batch",
      });
    }

    // Whitelist allowed fields
    const allowedFields = ["status"];
    const filteredBody = {};

    allowedFields.forEach((field) => {
      if (field in req.body) {
        filteredBody[field] = req.body[field];
      }
    });

    const result = await updateBatch(id, filteredBody);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    logger.error("Update batch failed", { error: error.message });
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to update batch",
    });
  }
});

// DELETE: Delete batch
// Usage: DELETE /api/batches/1
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get batch
    const { data: batch } = await supabase
      .from("batches")
      .select("rider_id")
      .eq("id", id)
      .single();

    if (!batch) {
      return res.status(404).json({
        success: false,
        error: "Batch not found",
      });
    }

    // Only assigned rider can delete batch
    if (batch.rider_id !== userId) {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
        message: "You do not have permission to delete this batch",
      });
    }

    const result = await deleteBatch(id);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    logger.error("Delete batch failed", { error: error.message });
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to delete batch",
    });
  }
});

export default router;
