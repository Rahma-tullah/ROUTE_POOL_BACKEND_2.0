// src/routes/deliveries.routes.js
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

// Geocode an address string using Nominatim (OpenStreetMap) — Nigeria biased
const geocodeAddress = async (address) => {
  try {
    const query = encodeURIComponent(`${address}, Nigeria`);
    const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=ng`;
    const res = await fetch(url, {
      headers: {
        // Nominatim requires a User-Agent identifying your app
        "User-Agent": "RoutePool-DeliveryApp/1.0",
      },
    });
    const data = await res.json();
    if (data && data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
      };
    }
    return null;
  } catch (err) {
    logger.warn("Geocoding failed", { error: err.message });
    return null;
  }
};

// POST: Create a new delivery
router.post("/", verifyToken, async (req, res) => {
  try {
    const retailer = req.dbUser;
    if (!retailer || retailer.user_type !== "retailer") {
      return res
        .status(403)
        .json({
          success: false,
          error: "Forbidden",
          message: "Only retailers can create deliveries",
        });
    }

    const allowedFields = [
      "customer_name",
      "customer_phone",
      "address",
      "latitude",
      "longitude",
      "package_description",
    ];
    const filteredBody = {};
    allowedFields.forEach((field) => {
      if (field in req.body) filteredBody[field] = req.body[field];
    });
    filteredBody.retailer_id = retailer.id;

    // If lat/lng not provided, geocode the address automatically
    if (
      (!filteredBody.latitude || !filteredBody.longitude) &&
      filteredBody.address
    ) {
      logger.info("Geocoding address", { address: filteredBody.address });
      const coords = await geocodeAddress(filteredBody.address);
      if (coords) {
        filteredBody.latitude = coords.latitude;
        filteredBody.longitude = coords.longitude;
        logger.info("Geocoded successfully", coords);
      } else {
        logger.warn(
          "Could not geocode address — delivery will have no coordinates",
          { address: filteredBody.address },
        );
      }
    }

    const result = await createDelivery(filteredBody);
    return res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    logger.error("Create delivery failed", { error: error.message });
    res
      .status(500)
      .json({
        success: false,
        error: "Internal server error",
        message: "Failed to create delivery",
      });
  }
});

// GET: Get all deliveries
router.get("/", async (req, res) => {
  try {
    const result = await getAllDeliveries();
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET: Get deliveries by retailer
router.get("/retailer/:retailerId", async (req, res) => {
  try {
    const result = await getDeliveriesByRetailer(req.params.retailerId);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET: Get delivery by ID
router.get("/:deliveryId", async (req, res) => {
  try {
    const result = await getDeliveryById(req.params.deliveryId);
    return res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT: Update delivery
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const retailer = req.dbUser;
    if (!retailer || retailer.user_type !== "retailer") {
      return res
        .status(403)
        .json({
          success: false,
          error: "Forbidden",
          message: "Only retailers can update deliveries",
        });
    }

    const { data: delivery } = await supabase
      .from("deliveries")
      .select("retailer_id")
      .eq("id", req.params.id)
      .single();
    if (!delivery)
      return res
        .status(404)
        .json({ success: false, error: "Delivery not found" });
    if (delivery.retailer_id !== retailer.id)
      return res
        .status(403)
        .json({
          success: false,
          error: "Forbidden",
          message: "You can only update your own deliveries",
        });

    const allowedFields = [
      "customer_name",
      "customer_phone",
      "address",
      "package_description",
    ];
    const filteredBody = {};
    allowedFields.forEach((field) => {
      if (field in req.body) filteredBody[field] = req.body[field];
    });

    const result = await updateDelivery(req.params.id, filteredBody);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    logger.error("Update delivery failed", { error: error.message });
    res
      .status(500)
      .json({
        success: false,
        error: "Internal server error",
        message: "Failed to update delivery",
      });
  }
});

// DELETE: Delete delivery
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const retailer = req.dbUser;
    if (!retailer || retailer.user_type !== "retailer") {
      return res
        .status(403)
        .json({
          success: false,
          error: "Forbidden",
          message: "Only retailers can delete deliveries",
        });
    }

    const { data: delivery } = await supabase
      .from("deliveries")
      .select("retailer_id")
      .eq("id", req.params.id)
      .single();
    if (!delivery)
      return res
        .status(404)
        .json({ success: false, error: "Delivery not found" });
    if (delivery.retailer_id !== retailer.id)
      return res
        .status(403)
        .json({
          success: false,
          error: "Forbidden",
          message: "You can only delete your own deliveries",
        });

    const result = await deleteDelivery(req.params.id);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    logger.error("Delete delivery failed", { error: error.message });
    res
      .status(500)
      .json({
        success: false,
        error: "Internal server error",
        message: "Failed to delete delivery",
      });
  }
});

export default router;
