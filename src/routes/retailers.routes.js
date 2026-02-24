// src/routes/retailers.routes.js
import { verifyToken } from "../middleware/auth.middleware.js";
import supabase from "../config/supabase.js";
import { logger } from "../utils/logger.js";
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
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Only allow retailer to update their own profile
    if (id !== userId) {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
        message: "You can only update your own profile",
      });
    }

    // Whitelist allowed fields only
    const allowedFields = ["name", "phone", "shop_name"];
    const filteredBody = {};

    allowedFields.forEach((field) => {
      if (field in req.body) {
        filteredBody[field] = req.body[field];
      }
    });

    const result = await updateRetailer(id, filteredBody);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    logger.error("Update retailer failed", { error: error.message });
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to update retailer",
    });
  }
});

// DELETE: Delete retailer
// Usage: DELETE /api/retailers/1
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Only allow retailer to delete their own account
    if (id !== userId) {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
        message: "You can only delete your own account",
      });
    }

    const result = await deleteRetailer(id);

    if (result.success) {
      // Clear the auth cookie on delete
      res.clearCookie("auth_token");
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    logger.error("Delete retailer failed", { error: error.message });
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to delete retailer account",
    });
  }
});

export default router;
