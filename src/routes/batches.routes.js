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

// GET: All unassigned batches visible to any rider
// Usage: GET /api/batches/available
router.get("/available", verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("batches")
      .select("id, status, total_deliveries, created_at")
      .is("rider_id", null)
      .eq("status", "created")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return res.status(200).json({ success: true, data: data || [] });
  } catch (error) {
    logger.error("Get available batches failed", { error: error.message });
    res
      .status(500)
      .json({ success: false, error: "Failed to get available batches" });
  }
});

// POST: Rider claims an available batch
// Usage: POST /api/batches/:id/claim
router.post("/:id/claim", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const dbUserId = req.dbUser?.id;

    if (!dbUserId)
      return res.status(401).json({ success: false, error: "Unauthorized" });

    // Must be a rider
    const { data: rider } = await supabase
      .from("riders")
      .select("id")
      .eq("id", dbUserId)
      .single();

    if (!rider) {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
        message: "Only riders can claim batches",
      });
    }

    // Get the batch and check it's still unclaimed
    const { data: batch } = await supabase
      .from("batches")
      .select("id, rider_id, status")
      .eq("id", id)
      .single();

    if (!batch)
      return res.status(404).json({ success: false, error: "Batch not found" });

    if (batch.rider_id !== null) {
      return res.status(409).json({
        success: false,
        error: "Already claimed",
        message: "This batch has already been claimed by another rider",
      });
    }

    if (batch.status !== "created") {
      return res.status(400).json({
        success: false,
        error: "Batch not available",
        message: "This batch is no longer available",
      });
    }

    // Assign rider — only update if still unclaimed (race condition safety)
    const { data: updated, error: updateError } = await supabase
      .from("batches")
      .update({ rider_id: dbUserId })
      .eq("id", id)
      .is("rider_id", null)
      .select()
      .single();

    if (updateError || !updated) {
      return res.status(409).json({
        success: false,
        error: "Claim failed",
        message:
          "This batch was just claimed by another rider. Please try another.",
      });
    }

    logger.info("Batch claimed", { batchId: id, riderId: dbUserId });
    return res
      .status(200)
      .json({
        success: true,
        data: updated,
        message: "Batch claimed successfully",
      });
  } catch (error) {
    logger.error("Claim batch failed", { error: error.message });
    res.status(500).json({ success: false, error: "Failed to claim batch" });
  }
});

// GET: All batches (filtered by user type)
router.get("/", verifyToken, async (req, res) => {
  try {
    const dbUserId = req.dbUser?.id;

    const { data: retailer } = await supabase
      .from("retailers")
      .select("id")
      .eq("id", dbUserId)
      .single();

    let batches;

    if (retailer) {
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
    res.status(500).json({ success: false, error: "Failed to get batches" });
  }
});

// GET: Batches by rider
router.get("/rider/:riderId", async (req, res) => {
  try {
    const result = await getBatchesByRider(req.params.riderId);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET: Batches by status
router.get("/status/:status", async (req, res) => {
  try {
    const result = await getBatchesByStatus(req.params.status);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET: Batch by ID
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const dbUserId = req.dbUser?.id;

    const { data: batch } = await supabase
      .from("batches")
      .select("id, rider_id, status, total_deliveries, created_at")
      .eq("id", id)
      .single();

    if (!batch)
      return res.status(404).json({ success: false, error: "Batch not found" });

    const { data: retailer } = await supabase
      .from("retailers")
      .select("id")
      .eq("id", dbUserId)
      .single();

    if (retailer) {
      const { data: delivery } = await supabase
        .from("deliveries")
        .select("id")
        .eq("batch_id", id)
        .eq("retailer_id", dbUserId)
        .single();
      if (!delivery)
        return res.status(403).json({ success: false, error: "Forbidden" });
    } else if (batch.rider_id !== dbUserId) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    const result = await getBatchById(id);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    logger.error("Get batch failed", { error: error.message });
    res.status(500).json({ success: false, error: "Failed to get batch" });
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

    if (!batch)
      return res.status(404).json({ success: false, error: "Batch not found" });
    if (batch.rider_id !== dbUserId)
      return res.status(403).json({ success: false, error: "Forbidden" });

    const result = await updateBatch(id, { status: req.body.status });
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    logger.error("Update batch failed", { error: error.message });
    res.status(500).json({ success: false, error: "Failed to update batch" });
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

    if (!batch)
      return res.status(404).json({ success: false, error: "Batch not found" });
    if (batch.rider_id !== dbUserId)
      return res.status(403).json({ success: false, error: "Forbidden" });

    const result = await deleteBatch(id);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    logger.error("Delete batch failed", { error: error.message });
    res.status(500).json({ success: false, error: "Failed to delete batch" });
  }
});

export default router;
