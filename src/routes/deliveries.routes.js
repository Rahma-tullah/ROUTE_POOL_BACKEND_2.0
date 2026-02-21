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
router.post("/", async (req, res) => {
  try {
    const result = await createDelivery(req.body);

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
router.put("/:deliveryId", async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const result = await updateDelivery(deliveryId, req.body);

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

// DELETE: Delete delivery
// Usage: DELETE /api/deliveries/1
router.delete("/:deliveryId", async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const result = await deleteDelivery(deliveryId);

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
