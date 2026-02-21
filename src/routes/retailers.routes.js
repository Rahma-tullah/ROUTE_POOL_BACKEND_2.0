// src/routes/retailers.routes.js

import express from "express";
import {
  createRetailer,
  getAllRetailers,
  getRetailerById,
  updateRetailer,
  deleteRetailer,
} from "../services/retailers.service.js";

const router = express.Router();

// POST: Create a new retailer
// Usage: POST /api/retailers
router.post("/", async (req, res) => {
  try {
    const result = await createRetailer(req.body);

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

// GET: Get all retailers
// Usage: GET /api/retailers
router.get("/", async (req, res) => {
  try {
    const result = await getAllRetailers();

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

// GET: Get retailer by ID
// Usage: GET /api/retailers/1
router.get("/:retailerId", async (req, res) => {
  try {
    const { retailerId } = req.params;
    const result = await getRetailerById(retailerId);

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

// PUT: Update retailer
// Usage: PUT /api/retailers/1
router.put("/:retailerId", async (req, res) => {
  try {
    const { retailerId } = req.params;
    const result = await updateRetailer(retailerId, req.body);

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

// DELETE: Delete retailer
// Usage: DELETE /api/retailers/1
router.delete("/:retailerId", async (req, res) => {
  try {
    const { retailerId } = req.params;
    const result = await deleteRetailer(retailerId);

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
