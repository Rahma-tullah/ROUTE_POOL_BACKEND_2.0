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
// Valid status values
const VALID_DELIVERY_STATUSES = ["pending", "in_transit", "delivered"];
const VALID_BATCH_STATUSES = ["created", "in_transit", "completed"];

// Validate status value
const validateStatus = (status, validStatuses) => {
  if (!status || !validStatuses.includes(status.toLowerCase())) {
    return false;
  }
  return true;
};
const router = express.Router();

// PUT: Update delivery status
// Usage: PUT /api/status/delivery/:deliveryId
router.put("/delivery/:deliveryId", verifyToken, async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const { status } = req.body;
    if (!validateStatus(status, VALID_DELIVERY_STATUSES)) {
      return res.status(400).json({
        success: false,
        error: "Invalid status",
        message: `Status must be one of: ${VALID_DELIVERY_STATUSES.join(", ")}`,
      });
    }
    const userId = req.user.id;

    // Get delivery details
    const { data: delivery, error: fetchError } = await supabase
      .from("deliveries")
      .select("batch_id, retailer_id")
      .eq("id", deliveryId)
      .single();

    if (fetchError || !delivery) {
      return res.status(404).json({
        success: false,
        error: "Delivery not found",
        message: "Delivery not found",
      });
    }

    // Authorization: User must be the retailer or assigned rider
    if (delivery.retailer_id !== userId && delivery.batch_id) {
      // Check if user is the rider assigned to this batch
      const { data: batch } = await supabase
        .from("batches")
        .select("rider_id")
        .eq("id", delivery.batch_id)
        .single();

      if (!batch || batch.rider_id !== userId) {
        return res.status(403).json({
          success: false,
          error: "Forbidden",
          message: "You do not have permission to update this delivery",
        });
      }
    } else if (delivery.retailer_id !== userId) {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
        message: "You do not have permission to update this delivery",
      });
    }

    const result = await updateDeliveryStatus(deliveryId, status);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    logger.error("Update delivery status failed", { error: error.message });
    res.status(500).json({
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
    const { batchId } = req.params;
    const { status } = req.body;
    if (!validateStatus(status, VALID_BATCH_STATUSES)) {
      return res.status(400).json({
        success: false,
        error: "Invalid status",
        message: `Status must be one of: ${VALID_BATCH_STATUSES.join(", ")}`,
      });
    }
    const userId = req.user.id;

    // Get batch details
    const { data: batch, error: fetchError } = await supabase
      .from("batches")
      .select("rider_id")
      .eq("id", batchId)
      .single();

    if (fetchError || !batch) {
      return res.status(404).json({
        success: false,
        error: "Batch not found",
        message: "Batch not found",
      });
    }

    // Authorization: Only the assigned rider can update batch
    if (batch.rider_id !== userId) {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
        message: "You do not have permission to update this batch",
      });
    }

    const result = await updateBatchStatus(batchId, status);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    logger.error("Update batch status failed", { error: error.message });
    res.status(500).json({
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
    const { deliveryId } = req.params;
    const userId = req.user.id;

    // Verify user has permission to view this delivery
    const { data: delivery } = await supabase
      .from("deliveries")
      .select("retailer_id, batch_id")
      .eq("id", deliveryId)
      .single();

    if (!delivery) {
      return res.status(404).json({
        success: false,
        error: "Delivery not found",
      });
    }

    // User must be retailer or assigned rider
    if (delivery.retailer_id !== userId && delivery.batch_id) {
      const { data: batch } = await supabase
        .from("batches")
        .select("rider_id")
        .eq("id", delivery.batch_id)
        .single();

      if (!batch || batch.rider_id !== userId) {
        return res.status(403).json({
          success: false,
          error: "Forbidden",
          message: "You do not have permission to view this delivery",
        });
      }
    } else if (delivery.retailer_id !== userId) {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
        message: "You do not have permission to view this delivery",
      });
    }

    const result = await getDeliveryStatusHistory(deliveryId);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    logger.error("Get delivery status failed", { error: error.message });
    res.status(500).json({
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
    const { batchId } = req.params;
    const userId = req.user.id;

    // Get batch details
    const { data: batch } = await supabase
      .from("batches")
      .select("rider_id")
      .eq("id", batchId)
      .single();

    if (!batch) {
      return res.status(404).json({
        success: false,
        error: "Batch not found",
      });
    }

    // Only rider or retailers with deliveries in batch can view
    if (batch.rider_id !== userId) {
      // Check if user is a retailer with deliveries in this batch
      const { data: delivery } = await supabase
        .from("deliveries")
        .select("retailer_id")
        .eq("batch_id", batchId)
        .eq("retailer_id", userId)
        .single();

      if (!delivery) {
        return res.status(403).json({
          success: false,
          error: "Forbidden",
          message: "You do not have permission to view this batch",
        });
      }
    }

    const result = await getBatchStatusWithDeliveries(batchId);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    logger.error("Get batch status failed", { error: error.message });
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to get batch status",
    });
  }
});

export default router;
