// src/services/riders.service.js

import supabase from "../config/supabase.js";
import { validateRider } from "../validators/riders.validator.js";
import { logger } from "../utils/logger.js";

// Create a new rider
export const createRider = async (riderData) => {
  try {
    validateRider(riderData);

    const { data, error } = await supabase
      .from("riders")
      .insert([riderData])
      .select();

    if (error) throw error;

    logger.info("Rider created", { riderId: data[0].id, name: data[0].name });
    return {
      success: true,
      data: data[0],
      message: "Rider created successfully",
    };
  } catch (error) {
    logger.error("Create rider failed", { error: error.message });
    return {
      success: false,
      error: error.message,
      message: "Failed to create rider",
    };
  }
};

// Get all riders
export const getAllRiders = async () => {
  try {
    const { data, error } = await supabase
      .from("riders")
      .select(
        "id, name, email, phone, vehicle_type, is_active, average_rating, created_at",
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    logger.info("All riders fetched", { count: data.length });
    return {
      success: true,
      data: data,
      count: data.length,
    };
  } catch (error) {
    logger.error("Get all riders failed", { error: error.message });
    return {
      success: false,
      error: error.message,
      message: "Failed to fetch riders",
    };
  }
};

// Get rider by ID
export const getRider = async (riderId) => {
  try {
    const { data, error } = await supabase
      .from("riders")
      .select(
        "id, name, email, phone, vehicle_type, is_active, average_rating, created_at",
      )
      .eq("id", riderId)
      .single();

    if (error) throw error;

    return {
      success: true,
      data: data,
    };
  } catch (error) {
    logger.error("Get rider failed", { riderId, error: error.message });
    return {
      success: false,
      error: error.message,
      message: "Failed to fetch rider",
    };
  }
};

// Get riders by vehicle type
export const getRidersByVehicleType = async (vehicleType) => {
  try {
    const { data, error } = await supabase
      .from("riders")
      .select("id, name, email, phone, vehicle_type, is_active, average_rating")
      .eq("vehicle_type", vehicleType)
      .order("average_rating", { ascending: false });

    if (error) throw error;

    logger.info("Riders fetched by vehicle type", {
      vehicleType,
      count: data.length,
    });
    return {
      success: true,
      data: data,
      count: data.length,
    };
  } catch (error) {
    logger.error("Get riders by vehicle type failed", {
      vehicleType,
      error: error.message,
    });
    return {
      success: false,
      error: error.message,
      message: "Failed to fetch riders",
    };
  }
};

// Update rider
export const updateRider = async (riderId, updateData) => {
  try {
    const { data, error } = await supabase
      .from("riders")
      .update(updateData)
      .eq("id", riderId)
      .select();

    if (error) throw error;

    logger.info("Rider updated", { riderId, updates: Object.keys(updateData) });
    return {
      success: true,
      data: data[0],
      message: "Rider updated successfully",
    };
  } catch (error) {
    logger.error("Update rider failed", { riderId, error: error.message });
    return {
      success: false,
      error: error.message,
      message: "Failed to update rider",
    };
  }
};

// Delete rider
export const deleteRider = async (riderId) => {
  try {
    const { error } = await supabase.from("riders").delete().eq("id", riderId);

    if (error) throw error;

    logger.info("Rider deleted", { riderId });
    return {
      success: true,
      message: "Rider deleted successfully",
    };
  } catch (error) {
    logger.error("Delete rider failed", { riderId, error: error.message });
    return {
      success: false,
      error: error.message,
      message: "Failed to delete rider",
    };
  }
};
