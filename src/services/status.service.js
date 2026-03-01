// src/services/status.service.js

import supabase from "../config/supabase.js";
import {
  validateDeliveryStatusUpdate,
  validateBatchStatusUpdate,
} from "../validators/status.validator.js";

// Update delivery status
export const updateDeliveryStatus = async (deliveryId, newStatus) => {
  try {
    validateDeliveryStatusUpdate({
      delivery_id: deliveryId,
      status: newStatus,
    });

    const { data: delivery, error: fetchError } = await supabase
      .from("deliveries")
      .select("*")
      .eq("id", deliveryId)
      .single();

    if (fetchError) throw new Error("Delivery not found");

    const validTransitions = {
      pending: ["in_transit", "cancelled"],
      in_transit: ["delivered", "pending"],
      delivered: [],
    };

    if (!validTransitions[delivery.status]?.includes(newStatus)) {
      throw new Error(
        `Cannot transition from ${delivery.status} to ${newStatus}`,
      );
    }

    const { error: updateError } = await supabase
      .from("deliveries")
      .update({ status: newStatus, updated_at: new Date() })
      .eq("id", deliveryId);

    if (updateError) throw updateError;

    return {
      success: true,
      data: {
        deliveryId: deliveryId,
        previousStatus: delivery.status,
        newStatus: newStatus,
        updatedAt: new Date(),
      },
      message: `Delivery status updated to ${newStatus}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: "Failed to update delivery status",
    };
  }
};

// Update batch status
export const updateBatchStatus = async (batchId, newStatus) => {
  try {
    validateBatchStatusUpdate({ batch_id: batchId, status: newStatus });

    const { data: batch, error: fetchError } = await supabase
      .from("batches")
      .select("*")
      .eq("id", batchId)
      .single();

    if (fetchError) throw new Error("Batch not found");

    const validTransitions = {
      created: ["in_transit", "cancelled"],
      in_transit: ["completed", "created"],
      completed: [],
    };

    if (!validTransitions[batch.status]?.includes(newStatus)) {
      throw new Error(`Cannot transition from ${batch.status} to ${newStatus}`);
    }

    // If completing batch, mark all linked deliveries as delivered
    if (newStatus === "completed") {
      const { error: deliveryError } = await supabase
        .from("deliveries")
        .update({ status: "delivered", updated_at: new Date() })
        .eq("batch_id", batchId)
        .neq("status", "delivered");

      if (deliveryError)
        console.error("Error updating linked deliveries:", deliveryError);
    }

    const { error: updateError } = await supabase
      .from("batches")
      .update({
        status: newStatus,
        updated_at: new Date(),
        completed_at: newStatus === "completed" ? new Date() : null,
      })
      .eq("id", batchId)
      .select();

    if (updateError) throw updateError;

    return {
      success: true,
      data: {
        batchId,
        previousStatus: batch.status,
        newStatus,
        updatedAt: new Date(),
      },
      message: `Batch status updated to ${newStatus}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: "Failed to update batch status",
    };
  }
};

// Get delivery status history
export const getDeliveryStatusHistory = async (deliveryId) => {
  try {
    const { data: delivery, error } = await supabase
      .from("deliveries")
      .select("*")
      .eq("id", deliveryId)
      .single();

    if (error) throw error;

    return {
      success: true,
      data: {
        deliveryId: deliveryId,
        currentStatus: delivery.status,
        createdAt: delivery.created_at,
        updatedAt: delivery.updated_at,
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Get batch status with all deliveries (includes retailer pickup info)
export const getBatchStatusWithDeliveries = async (batchId) => {
  try {
    const { data: batch, error: batchError } = await supabase
      .from("batches")
      .select("*")
      .eq("id", batchId)
      .single();

    if (batchError) throw batchError;

    // Join retailers so riders get shop_name, shop_address, phone for pickup
    const { data: deliveries, error: deliveriesError } = await supabase
      .from("deliveries")
      .select("*, retailers(name, phone, shop_name, shop_address)")
      .eq("batch_id", batchId);

    if (deliveriesError) throw deliveriesError;

    const statusCounts = {
      pending: deliveries.filter((d) => d.status === "pending").length,
      in_transit: deliveries.filter((d) => d.status === "in_transit").length,
      delivered: deliveries.filter((d) => d.status === "delivered").length,
    };

    return {
      success: true,
      data: {
        batchId: batchId,
        batchStatus: batch.status,
        totalDeliveries: deliveries.length,
        deliveryStatuses: statusCounts,
        deliveries: deliveries,
        createdAt: batch.created_at,
        updatedAt: batch.updated_at,
        completedAt: batch.completed_at,
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
