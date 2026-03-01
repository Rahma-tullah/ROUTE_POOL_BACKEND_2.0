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
router.post("/", async (req, res) => {
  try {
    const result = await createBatch(req.body);
    return res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET: Get all batches (filtered by user type)
router.get("/", verifyToken, async (req, res) => {
  try {
    const dbUserId = req.dbUser?.id;
    const userType = req.dbUser?.user_type;
    let batches;

    if (userType === "retailer") {
      // Retailer sees only batches containing their deliveries
      const { data: deliveries } = await supabase
        .from("deliveries")
        .select("batch_id")
        .eq("retailer_id", dbUserId)
        .not("batch_id", "is", null);

      const batchIds = deliveries?.map((d) => d.batch_id) || [];
      if (batchIds.length === 0)
        return res.status(200).json({ success: true, data: [] });

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
        .eq("rider_id", dbUserId);

      if (error) throw error;
      batches = batchData;
    }

    return res.status(200).json({ success: true, data: batches || [] });
  } catch (error) {
    logger.error("Get all batches failed", { error: error.message });
    res
      .status(500)
      .json({
        success: false,
        error: "Internal server error",
        message: "Failed to get batches",
      });
  }
});

// GET: Get batches by rider
router.get("/rider/:riderId", async (req, res) => {
  try {
    const result = await getBatchesByRider(req.params.riderId);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET: Get batches by status
router.get("/status/:status", async (req, res) => {
  try {
    const result = await getBatchesByStatus(req.params.status);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET: Get batch by ID
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const dbUserId = req.dbUser?.id;
    const userType = req.dbUser?.user_type;

    const { data: batch } = await supabase
      .from("batches")
      .select("id, rider_id, status, total_deliveries, created_at")
      .eq("id", id)
      .single();

    if (!batch) {
      return res.status(404).json({ success: false, error: "Batch not found" });
    }

    // Rider can view their own batch
    if (userType === "rider" && batch.rider_id === dbUserId) {
      const result = await getBatchById(id);
      return res.status(result.success ? 200 : 400).json(result);
    }

    // Retailer can view if they have deliveries in this batch
    if (userType === "retailer") {
      const { data: delivery } = await supabase
        .from("deliveries")
        .select("id")
        .eq("batch_id", id)
        .eq("retailer_id", dbUserId)
        .single();

      if (delivery) {
        const result = await getBatchById(id);
        return res.status(result.success ? 200 : 400).json(result);
      }
    }

    return res.status(403).json({
      success: false,
      error: "Forbidden",
      message: "You do not have permission to view this batch",
    });
  } catch (error) {
    logger.error("Get batch failed", { error: error.message });
    res
      .status(500)
      .json({
        success: false,
        error: "Internal server error",
        message: "Failed to get batch",
      });
  }
});

// PUT: Update batch
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const dbUserId = req.dbUser?.id;

    const { data: batch } = await supabase
      .from("batches")
      .select("rider_id")
      .eq("id", id)
      .single();

    if (!batch) {
      return res.status(404).json({ success: false, error: "Batch not found" });
    }

    if (batch.rider_id !== dbUserId) {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
        message: "You do not have permission to update this batch",
      });
    }

    const allowedFields = ["status"];
    const filteredBody = {};
    allowedFields.forEach((field) => {
      if (field in req.body) filteredBody[field] = req.body[field];
    });

    const result = await updateBatch(id, filteredBody);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    logger.error("Update batch failed", { error: error.message });
    res
      .status(500)
      .json({
        success: false,
        error: "Internal server error",
        message: "Failed to update batch",
      });
  }
});

// DELETE: Delete batch
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const dbUserId = req.dbUser?.id;

    const { data: batch } = await supabase
      .from("batches")
      .select("rider_id")
      .eq("id", id)
      .single();

    if (!batch) {
      return res.status(404).json({ success: false, error: "Batch not found" });
    }

    if (batch.rider_id !== dbUserId) {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
        message: "You do not have permission to delete this batch",
      });
    }

    const result = await deleteBatch(id);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    logger.error("Delete batch failed", { error: error.message });
    res
      .status(500)
      .json({
        success: false,
        error: "Internal server error",
        message: "Failed to delete batch",
      });
  }
});

export default router;
