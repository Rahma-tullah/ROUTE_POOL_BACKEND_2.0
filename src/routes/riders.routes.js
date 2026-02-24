// src/routes/riders.routes.js
import { verifyToken } from "../middleware/auth.middleware.js";
import supabase from "../config/supabase.js";
import { logger } from "../utils/logger.js";
import express from "express";
import {
  createRider,
  getAllRiders,
  getRider,
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
    const result = await getRider(riderId);

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
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Only allow rider to update their own profile
    if (id !== userId) {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
        message: "You can only update your own profile",
      });
    }

    // Whitelist allowed fields only
    const allowedFields = ["name", "phone", "vehicle_type", "is_active"];
    const filteredBody = {};

    allowedFields.forEach((field) => {
      if (field in req.body) {
        filteredBody[field] = req.body[field];
      }
    });

    const result = await updateRider(id, filteredBody);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    logger.error("Update rider failed", { error: error.message });
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to update rider",
    });
  }
});

// DELETE: Delete rider
// Usage: DELETE /api/riders/1
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Only allow rider to delete their own account
    if (id !== userId) {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
        message: "You can only delete your own account",
      });
    }

    const result = await deleteRider(id);

    if (result.success) {
      // Clear the auth cookie on delete
      res.clearCookie("auth_token");
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    logger.error("Delete rider failed", { error: error.message });
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to delete rider account",
    });
  }
});

export default router;
