import { verifyToken } from "../middleware/auth.middleware.js";
import supabase from "../config/supabase.js";
import { logger } from "../utils/logger.js";
import express from "express";
import {
  createDelivery,
  getAllDeliveries,
  getDeliveryById,
  getDeliveriesByRetailer,
  updateDelivery,
  deleteDelivery,
} from "../services/deliveries.service.js";

const router = express.Router();

// POST: Create a new delivery
// Usage: POST /api/deliveries

router.post("/", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Whitelist fields
    const allowedFields = [
      "retailer_id",
      "customer_name",
      "customer_phone",
      "address",
      "latitude",
      "longitude",
      "package_description",
    ];
    const filteredBody = {};

    allowedFields.forEach((field) => {
      if (field in req.body) {
        filteredBody[field] = req.body[field];
      }
    });

    // Verify retailer_id matches authenticated user
    if (filteredBody.retailer_id !== userId) {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
        message: "You can only create deliveries for your own account",
      });
    }

    const result = await createDelivery(filteredBody);

    if (result.success) {
      return res.status(201).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    logger.error("Create delivery failed", { error: error.message });
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to create delivery",
    });
  }
});
// GET: Get all deliveries
// Usage: GET /api/deliveries
router.get("/", async (req, res) => {
  try {
    const result = await getAllDeliveries();

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

// GET: Get deliveries by retailer
// Usage: GET /api/deliveries/retailer/1
router.get("/retailer/:retailerId", async (req, res) => {
  try {
    const { retailerId } = req.params;
    const result = await getDeliveriesByRetailer(retailerId);

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

// GET: Get delivery by ID
// Usage: GET /api/deliveries/1
router.get("/:deliveryId", async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const result = await getDeliveryById(deliveryId);

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

// PUT: Update delivery
// Usage: PUT /api/deliveries/1
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get delivery to verify ownership
    const { data: delivery } = await supabase
      .from("deliveries")
      .select("retailer_id")
      .eq("id", id)
      .single();

    if (!delivery) {
      return res.status(404).json({
        success: false,
        error: "Delivery not found",
      });
    }

    // Only retailer can update their own delivery
    if (delivery.retailer_id !== userId) {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
        message: "You can only update your own deliveries",
      });
    }

    // Whitelist allowed fields
    const allowedFields = [
      "customer_name",
      "customer_phone",
      "address",
      "package_description",
    ];
    const filteredBody = {};

    allowedFields.forEach((field) => {
      if (field in req.body) {
        filteredBody[field] = req.body[field];
      }
    });

    const result = await updateDelivery(id, filteredBody);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    logger.error("Update delivery failed", { error: error.message });
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to update delivery",
    });
  }
});

// DELETE: Delete delivery
// Usage: DELETE /api/deliveries/1
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get delivery to verify ownership
    const { data: delivery } = await supabase
      .from("deliveries")
      .select("retailer_id")
      .eq("id", id)
      .single();

    if (!delivery) {
      return res.status(404).json({
        success: false,
        error: "Delivery not found",
      });
    }

    // Only retailer can delete their own delivery
    if (delivery.retailer_id !== userId) {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
        message: "You can only delete your own deliveries",
      });
    }

    const result = await deleteDelivery(id);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    logger.error("Delete delivery failed", { error: error.message });
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to delete delivery",
    });
  }
});

export default router;
