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

// FCT / Abuja bounding box (generous coverage of the entire Federal Capital Territory)
const ABUJA_BOUNDS = {
  minLat: 7.8,
  maxLat: 9.8,
  minLon: 6.4,
  maxLon: 8.2,
};

const isWithinAbuja = (lat, lon) =>
  lat >= ABUJA_BOUNDS.minLat &&
  lat <= ABUJA_BOUNDS.maxLat &&
  lon >= ABUJA_BOUNDS.minLon &&
  lon <= ABUJA_BOUNDS.maxLon;

// Small delay helper to avoid rate limiting
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Geocode an address string using Nominatim — tries multiple queries
const geocodeAddress = async (address) => {
  const queries = [
    `${address}, Abuja, FCT, Nigeria`,
    `${address}, Abuja, Nigeria`,
    `${address}, Nigeria`,
  ];

  for (const query of queries) {
    try {
      await sleep(1000); // Nominatim requires 1 request per second
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=3&countrycodes=ng&accept-language=en`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "RoutePool-DeliveryApp/1.0 (contact@routepool.app)",
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        logger.warn("Nominatim returned non-200", {
          status: res.status,
          query,
        });
        continue;
      }

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        logger.warn("Nominatim returned invalid JSON", {
          query,
          preview: text.slice(0, 80),
        });
        continue;
      }

      if (data && data.length > 0) {
        for (const result of data) {
          const lat = parseFloat(result.lat);
          const lon = parseFloat(result.lon);
          if (isWithinAbuja(lat, lon)) {
            logger.info("Geocoded within Abuja", { lat, lon, query });
            return { latitude: lat, longitude: lon };
          }
        }
        logger.warn("Geocoded result outside Abuja bounds", {
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon),
          query,
        });
      }
    } catch (err) {
      logger.warn("Geocoding attempt failed", { query, error: err.message });
    }
  }

  return { error: "outside_bounds" };
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
      if (coords && coords.error === "outside_bounds") {
        return res.status(400).json({
          success: false,
          error: "Invalid address",
          message:
            "This address could not be located within Abuja. Please enter a more specific Abuja address (e.g. include the district or landmark).",
        });
      } else if (coords) {
        filteredBody.latitude = coords.latitude;
        filteredBody.longitude = coords.longitude;
        logger.info("Geocoded successfully", coords);
      } else {
        // Geocoding returned nothing at all — still allow delivery but without coordinates
        logger.warn("Could not geocode address at all", {
          address: filteredBody.address,
        });
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

// GET: Get deliveries by retailer enriched with batch + rider info
// Usage: GET /api/deliveries/retailer/:retailerId/full
router.get("/retailer/:retailerId/full", async (req, res) => {
  try {
    const { retailerId } = req.params;

    // Get all deliveries for this retailer
    const { data: deliveries, error: deliveriesError } = await supabase
      .from("deliveries")
      .select("*")
      .eq("retailer_id", retailerId)
      .order("created_at", { ascending: false });

    if (deliveriesError) throw deliveriesError;

    // For each delivery that has a batch_id, fetch batch + rider info
    const batchIds = [
      ...new Set(deliveries.map((d) => d.batch_id).filter(Boolean)),
    ];

    let batchMap = {};
    if (batchIds.length > 0) {
      const { data: batches } = await supabase
        .from("batches")
        .select("id, status, rider_id")
        .in("id", batchIds);

      if (batches) {
        // Get all rider_ids from those batches
        const riderIds = [
          ...new Set(batches.map((b) => b.rider_id).filter(Boolean)),
        ];

        let riderMap = {};
        if (riderIds.length > 0) {
          const { data: riders } = await supabase
            .from("riders")
            .select("id, name, phone, vehicle_type")
            .in("id", riderIds);

          if (riders) {
            riders.forEach((r) => {
              riderMap[r.id] = r;
            });
          }
        }

        batches.forEach((b) => {
          batchMap[b.id] = {
            batch_id: b.id,
            batch_status: b.status,
            rider: b.rider_id ? riderMap[b.rider_id] || null : null,
          };
        });
      }
    }

    // Enrich each delivery
    const enriched = deliveries.map((d) => ({
      ...d,
      batch_info: d.batch_id ? batchMap[d.batch_id] || null : null,
    }));

    return res
      .status(200)
      .json({ success: true, data: enriched, count: enriched.length });
  } catch (error) {
    logger.error("Get enriched deliveries failed", { error: error.message });
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch deliveries" });
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
