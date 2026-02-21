// src/services/clustering.service.js

import supabase from "../config/supabase.js";

// Helper function: Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Find nearby pending deliveries
export const findNearbyDeliveries = async (
  latitude,
  longitude,
  radiusKm = 1,
) => {
  try {
    // Get all pending deliveries
    const { data: deliveries, error } = await supabase
      .from("deliveries")
      .select("*")
      .eq("status", "pending")
      .is("batch_id", null); // Only unbatched deliveries

    if (error) throw error;

    // Filter by distance (since PostGIS might not be setup for raw queries)
    const nearby = deliveries.filter((d) => {
      if (!d.latitude || !d.longitude) return false;

      const distance = calculateDistance(
        latitude,
        longitude,
        d.latitude,
        d.longitude,
      );

      return distance <= radiusKm;
    });

    return {
      success: true,
      data: nearby,
      count: nearby.length,
      radius: radiusKm,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: "Failed to find nearby deliveries",
    };
  }
};

// Get available riders (sorted by rating)
export const getAvailableRiders = async () => {
  try {
    const { data: riders, error } = await supabase
      .from("riders")
      .select("*")
      .eq("is_active", true)
      .order("average_rating", { ascending: false });

    if (error) throw error;

    return {
      success: true,
      data: riders,
      count: riders.length,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

// Get rider's current batch count (how busy they are)
export const getRiderBatchCount = async (riderId) => {
  try {
    const { data: batches, error } = await supabase
      .from("batches")
      .select("*")
      .eq("rider_id", riderId)
      .neq("status", "completed");

    if (error) throw error;

    return batches.length;
  } catch (error) {
    console.error(error);
    return 0;
  }
};

// Find best available rider
export const findBestRider = async () => {
  try {
    const ridersResult = await getAvailableRiders();

    if (!ridersResult.success || ridersResult.count === 0) {
      return {
        success: false,
        error: "No available riders",
        data: null,
      };
    }

    // Score riders: high rating + low workload
    const riders = ridersResult.data;
    const scoredRiders = [];

    for (const rider of riders) {
      const batchCount = await getRiderBatchCount(rider.id);

      // Score: rating (weighted 70%) + availability (weighted 30%)
      const score =
        rider.average_rating * 0.7 + (5 - Math.min(batchCount, 5)) * 0.6;

      scoredRiders.push({
        ...rider,
        batchCount,
        score,
      });
    }

    // Sort by score (highest first)
    scoredRiders.sort((a, b) => b.score - a.score);

    return {
      success: true,
      data: scoredRiders[0],
      allRiders: scoredRiders,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

// Create batch from nearby deliveries
export const createBatchFromNearby = async (deliveryId) => {
  try {
    // Step 1: Get the delivery
    const { data: delivery, error: deliveryError } = await supabase
      .from("deliveries")
      .select("*")
      .eq("id", deliveryId)
      .single();

    if (deliveryError) throw deliveryError;

    if (!delivery.latitude || !delivery.longitude) {
      throw new Error("Delivery must have valid coordinates");
    }

    // Step 2: Find nearby deliveries (including the original)
    const nearbyResult = await findNearbyDeliveries(
      delivery.latitude,
      delivery.longitude,
      1, // 1km radius
    );

    if (!nearbyResult.success) {
      throw new Error(nearbyResult.error);
    }

    // Step 3: Check if we have 3+ deliveries (including original)
    const nearbyCount = nearbyResult.count;

    if (nearbyCount < 3) {
      return {
        success: false,
        canBatch: false,
        nearbyCount: nearbyCount,
        needed: 3 - nearbyCount,
        message: `Need ${3 - nearbyCount} more nearby delivery(ies) to create batch. Currently ${nearbyCount} pending.`,
      };
    }

    // Step 4: Find best rider
    const riderResult = await findBestRider();

    if (!riderResult.success) {
      throw new Error(riderResult.error);
    }

    const rider = riderResult.data;

    // Step 5: Create batch
    const { data: batch, error: batchError } = await supabase
      .from("batches")
      .insert([
        {
          rider_id: rider.id,
          status: "created",
          total_deliveries: nearbyCount,
        },
      ])
      .select();

    if (batchError) throw batchError;

    const batchId = batch[0].id;

    // Step 6: Link nearby deliveries to batch
    const nearbyIds = nearbyResult.data.map((d) => d.id);

    const { error: updateError } = await supabase
      .from("deliveries")
      .update({ batch_id: batchId })
      .in("id", nearbyIds);

    if (updateError) throw updateError;

    return {
      success: true,
      canBatch: true,
      data: {
        batchId: batchId,
        riderId: rider.id,
        riderName: rider.name,
        riderRating: rider.average_rating,
        vehicleType: rider.vehicle_type,
        deliveriesInBatch: nearbyCount,
        deliveryIds: nearbyIds,
        status: "created",
      },
      message: `Batch created! ${nearbyCount} deliveries assigned to ${rider.name} (Rating: ${rider.average_rating})`,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: "Failed to create batch",
    };
  }
};

// Get clustering statistics
export const getClusteringStats = async () => {
  try {
    // Pending deliveries
    const { data: pendingDeliveries, error: pendingError } = await supabase
      .from("deliveries")
      .select("*")
      .eq("status", "pending");

    if (pendingError) throw pendingError;

    // Active batches
    const { data: activeBatches, error: batchError } = await supabase
      .from("batches")
      .select("*")
      .neq("status", "completed");

    if (batchError) throw batchError;

    // Completed deliveries
    const { data: completedDeliveries, error: completedError } = await supabase
      .from("deliveries")
      .select("*")
      .eq("status", "delivered");

    if (completedError) throw completedError;

    return {
      success: true,
      data: {
        pendingDeliveries: pendingDeliveries.length,
        activeBatches: activeBatches.length,
        completedDeliveries: completedDeliveries.length,
        pendingUnbatched: pendingDeliveries.filter((d) => !d.batch_id).length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};
