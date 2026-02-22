// src/routes/status.routes.js

import express from "express";
import {
  updateDeliveryStatus,
  updateBatchStatus,
  getDeliveryStatusHistory,
  getBatchStatusWithDeliveries,
} from "../services/status.service.js";

const router = express.Router();

// PUT: Update delivery status
// Usage: PUT /api/status/delivery/:deliveryId
router.put("/delivery/:deliveryId", async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const { status } = req.body;

    if (!deliveryId || !status) {
      return res.status(400).json({
        success: false,
        error: "deliveryId and status are required",
      });
    }

    const result = await updateDeliveryStatus(parseInt(deliveryId), status);

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

// PUT: Update batch status
// Usage: PUT /api/status/batch/:batchId
router.put("/batch/:batchId", async (req, res) => {
  try {
    const { batchId } = req.params;
    const { status } = req.body;

    if (!batchId || !status) {
      return res.status(400).json({
        success: false,
        error: "batchId and status are required",
      });
    }

    const result = await updateBatchStatus(parseInt(batchId), status);

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

// GET: Get delivery status history
// Usage: GET /api/status/delivery/:deliveryId
router.get("/delivery/:deliveryId", async (req, res) => {
  try {
    const { deliveryId } = req.params;

    const result = await getDeliveryStatusHistory(deliveryId);

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

// GET: Get batch status with all deliveries
// Usage: GET /api/status/batch/:batchId
router.get("/batch/:batchId", async (req, res) => {
  try {
    const { batchId } = req.params;

    const result = await getBatchStatusWithDeliveries(batchId);

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

export default router;
