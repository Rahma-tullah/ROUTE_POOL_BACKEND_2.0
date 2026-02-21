// src/routes/batches.routes.js

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
router.get("/", async (req, res) => {
  try {
    const result = await getAllBatches();

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
router.get("/:batchId", async (req, res) => {
  try {
    const { batchId } = req.params;
    const result = await getBatchById(batchId);

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

// PUT: Update batch
// Usage: PUT /api/batches/1
router.put("/:batchId", async (req, res) => {
  try {
    const { batchId } = req.params;
    const result = await updateBatch(batchId, req.body);

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

// DELETE: Delete batch
// Usage: DELETE /api/batches/1
router.delete("/:batchId", async (req, res) => {
  try {
    const { batchId } = req.params;
    const result = await deleteBatch(batchId);

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
