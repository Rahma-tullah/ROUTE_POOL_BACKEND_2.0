// src/routes/riders.routes.js

import express from "express";
import {
  createRider,
  getAllRiders,
  getRiderById,
  getRidersByVehicleType,
  updateRider,
  deleteRider,
} from "../services/riders.service.js";

const router = express.Router();

// POST: Create a new rider
// Usage: POST /api/riders
router.post("/", async (req, res) => {
  try {
    const result = await createRider(req.body);

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

// GET: Get all riders
// Usage: GET /api/riders
router.get("/", async (req, res) => {
  try {
    const result = await getAllRiders();

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

// GET: Get riders by vehicle type
// Usage: GET /api/riders/vehicle/motorcycle
router.get("/vehicle/:vehicleType", async (req, res) => {
  try {
    const { vehicleType } = req.params;
    const result = await getRidersByVehicleType(vehicleType);

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

// GET: Get rider by ID
// Usage: GET /api/riders/1
router.get("/:riderId", async (req, res) => {
  try {
    const { riderId } = req.params;
    const result = await getRiderById(riderId);

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

// PUT: Update rider
// Usage: PUT /api/riders/1
router.put("/:riderId", async (req, res) => {
  try {
    const { riderId } = req.params;
    const result = await updateRider(riderId, req.body);

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

// DELETE: Delete rider
// Usage: DELETE /api/riders/1
router.delete("/:riderId", async (req, res) => {
  try {
    const { riderId } = req.params;
    const result = await deleteRider(riderId);

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
