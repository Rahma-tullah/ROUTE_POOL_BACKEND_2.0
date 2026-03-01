// src/routes/status.routes.js
import { verifyToken } from "../middleware/auth.middleware.js";
import supabase from "../config/supabase.js";
import { logger } from "../utils/logger.js";
import express from "express";
import {
  updateDeliveryStatus,
  updateBatchStatus,
  getDeliveryStatusHistory,
  getBatchStatusWithDeliveries,
} from "../services/status.service.js";

const VALID_DELIVERY_STATUSES = ["pending", "in_transit", "delivered"];
const VALID_BATCH_STATUSES = ["created", "in_transit", "completed"];

const validateStatus = (status, validStatuses) =>
  status && validStatuses.includes(status.toLowerCase());

const router = express.Router();

// PUT: Update delivery status
// Usage: PUT /api/status/delivery/:deliveryId
router.put("/delivery/:deliveryId", verifyToken, async (req, res) => {
  try {
    const deliveryId = parseInt(req.params.deliveryId, 10);
    const { status } = req.body;
    const dbUserId = req.dbUser?.id;

    if (!validateStatus(status, VALID_DELIVERY_STATUSES)) {
      return res.status(400).json({
        success: false,
        error: "Invalid status",
        message: `Status must be one of: ${VALID_DELIVERY_STATUSES.join(", ")}`,
      });
    }

    const { data: delivery, error: fetchError } = await supabase
      .from("deliveries")
      .select("batch_id, retailer_id")
      .eq("id", deliveryId)
      .single();

    if (fetchError || !delivery) {
      return res
        .status(404)
        .json({ success: false, error: "Delivery not found" });
    }

    // Allow if user is the retailer who owns this delivery
    if (delivery.retailer_id === dbUserId) {
      const result = await updateDeliveryStatus(deliveryId, status);
      return res.status(result.success ? 200 : 400).json(result);
    }

    // Allow if user is the rider assigned to this delivery's batch
    if (delivery.batch_id) {
      const { data: batch } = await supabase
        .from("batches")
        .select("rider_id")
        .eq("id", delivery.batch_id)
        .single();

      if (batch && batch.rider_id === dbUserId) {
        const result = await updateDeliveryStatus(deliveryId, status);
        return res.status(result.success ? 200 : 400).json(result);
      }
    }

    return res.status(403).json({
      success: false,
      error: "Forbidden",
      message: "You do not have permission to update this delivery",
    });
  } catch (error) {
    logger.error("Update delivery status failed", { error: error.message });
    res
      .status(500)
      .json({
        success: false,
        error: "Internal server error",
        message: "Failed to update status",
      });
  }
});

// PUT: Update batch status
// Usage: PUT /api/status/batch/:batchId
router.put("/batch/:batchId", verifyToken, async (req, res) => {
  try {
    const batchId = parseInt(req.params.batchId, 10);
    const { status } = req.body;
    const dbUserId = req.dbUser?.id;

    if (!validateStatus(status, VALID_BATCH_STATUSES)) {
      return res.status(400).json({
        success: false,
        error: "Invalid status",
        message: `Status must be one of: ${VALID_BATCH_STATUSES.join(", ")}`,
      });
    }

    const { data: batch, error: fetchError } = await supabase
      .from("batches")
      .select("rider_id")
      .eq("id", batchId)
      .single();

    if (fetchError || !batch) {
      return res.status(404).json({ success: false, error: "Batch not found" });
    }

    // Only the assigned rider can update batch status
    if (batch.rider_id !== dbUserId) {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
        message: "You do not have permission to update this batch",
      });
    }

    const result = await updateBatchStatus(batchId, status);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    logger.error("Update batch status failed", { error: error.message });
    res
      .status(500)
      .json({
        success: false,
        error: "Internal server error",
        message: "Failed to update batch",
      });
  }
});

// GET: Get delivery status history
// Usage: GET /api/status/delivery/:deliveryId
router.get("/delivery/:deliveryId", verifyToken, async (req, res) => {
  try {
    const deliveryId = parseInt(req.params.deliveryId, 10);
    const dbUserId = req.dbUser?.id;

    const { data: delivery } = await supabase
      .from("deliveries")
      .select("retailer_id, batch_id")
      .eq("id", deliveryId)
      .single();

    if (!delivery) {
      return res
        .status(404)
        .json({ success: false, error: "Delivery not found" });
    }

    // Allow retailer who owns it
    if (delivery.retailer_id === dbUserId) {
      const result = await getDeliveryStatusHistory(deliveryId);
      return res.status(result.success ? 200 : 400).json(result);
    }

    // Allow rider assigned to its batch
    if (delivery.batch_id) {
      const { data: batch } = await supabase
        .from("batches")
        .select("rider_id")
        .eq("id", delivery.batch_id)
        .single();

      if (batch && batch.rider_id === dbUserId) {
        const result = await getDeliveryStatusHistory(deliveryId);
        return res.status(result.success ? 200 : 400).json(result);
      }
    }

    return res.status(403).json({
      success: false,
      error: "Forbidden",
      message: "You do not have permission to view this delivery",
    });
  } catch (error) {
    logger.error("Get delivery status failed", { error: error.message });
    res
      .status(500)
      .json({
        success: false,
        error: "Internal server error",
        message: "Failed to get status",
      });
  }
});

// GET: Get batch status with all deliveries
// Usage: GET /api/status/batch/:batchId
router.get("/batch/:batchId", verifyToken, async (req, res) => {
  try {
    const batchId = parseInt(req.params.batchId, 10);
    const dbUserId = req.dbUser?.id;

    const { data: batch } = await supabase
      .from("batches")
      .select("rider_id")
      .eq("id", batchId)
      .single();

    if (!batch) {
      return res.status(404).json({ success: false, error: "Batch not found" });
    }

    // Allow assigned rider
    if (batch.rider_id === dbUserId) {
      const result = await getBatchStatusWithDeliveries(batchId);
      return res.status(result.success ? 200 : 400).json(result);
    }

    // Allow retailer who has deliveries in this batch
    const { data: delivery } = await supabase
      .from("deliveries")
      .select("retailer_id")
      .eq("batch_id", batchId)
      .eq("retailer_id", dbUserId)
      .single();

    if (delivery) {
      const result = await getBatchStatusWithDeliveries(batchId);
      return res.status(result.success ? 200 : 400).json(result);
    }

    return res.status(403).json({
      success: false,
      error: "Forbidden",
      message: "You do not have permission to view this batch",
    });
  } catch (error) {
    logger.error("Get batch status failed", { error: error.message });
    res
      .status(500)
      .json({
        success: false,
        error: "Internal server error",
        message: "Failed to get batch status",
      });
  }
});

export default router;
