import supabase from "../config/supabase.js";

// Create a new delivery
import { validateDelivery } from "../validators/deliveries.validator.js";

export const createDelivery = async (deliveryData) => {
  try {
    // Validate data FIRST
    validateDelivery(deliveryData);

    const { data, error } = await supabase
      .from("deliveries")
      .insert([deliveryData])
      .select();
    console.log("INSERT RESULT:", { data, error });
    if (error) throw error;

    return {
      success: true,
      data: data[0],
      message: "Delivery created successfully",
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: "Failed to create delivery",
    };
  }
};

// Get all deliveries
export const getAllDeliveries = async () => {
  try {
    const { data, error } = await supabase
      .from("deliveries")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return {
      success: true,
      data: data,
      count: data.length,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: "Failed to fetch deliveries",
    };
  }
};

// Get delivery by ID
export const getDeliveryById = async (deliveryId) => {
  try {
    const { data, error } = await supabase
      .from("deliveries")
      .select("*")
      .eq("id", deliveryId)
      .single();

    if (error) throw error;

    return {
      success: true,
      data: data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: "Failed to fetch delivery",
    };
  }
};

// Get deliveries by retailer
export const getDeliveriesByRetailer = async (retailerId) => {
  try {
    const { data, error } = await supabase
      .from("deliveries")
      .select("*")
      .eq("retailer_id", retailerId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return {
      success: true,
      data: data,
      count: data.length,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

// Update delivery
export const updateDelivery = async (deliveryId, updateData) => {
  try {
    const { data, error } = await supabase
      .from("deliveries")
      .update(updateData)
      .eq("id", deliveryId)
      .select();

    if (error) throw error;

    return {
      success: true,
      data: data[0],
      message: "Delivery updated successfully",
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

// Delete delivery
export const deleteDelivery = async (deliveryId) => {
  try {
    const { error } = await supabase
      .from("deliveries")
      .delete()
      .eq("id", deliveryId);

    if (error) throw error;

    return {
      success: true,
      message: "Delivery deleted successfully",
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};
