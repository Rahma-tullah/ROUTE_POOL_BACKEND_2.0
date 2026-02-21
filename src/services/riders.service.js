// src/services/riders.service.js

import supabase from "../config/supabase.js";
import { validateRider } from "../validators/riders.validator.js";

// Create a new rider
export const createRider = async (riderData) => {
  try {
    validateRider(riderData);

    const { data, error } = await supabase
      .from("riders")
      .insert([riderData])
      .select();

    if (error) throw error;

    return {
      success: true,
      data: data[0],
      message: "Rider created successfully",
    };
  } catch (error) {
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
      message: "Failed to fetch riders",
    };
  }
};

// Get rider by ID
export const getRiderById = async (riderId) => {
  try {
    const { data, error } = await supabase
      .from("riders")
      .select("*")
      .eq("id", riderId)
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
      message: "Failed to fetch rider",
    };
  }
};

// Get riders by vehicle type
export const getRidersByVehicleType = async (vehicleType) => {
  try {
    const { data, error } = await supabase
      .from("riders")
      .select("*")
      .eq("vehicle_type", vehicleType)
      .order("average_rating", { ascending: false });

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

    return {
      success: true,
      data: data[0],
      message: "Rider updated successfully",
    };
  } catch (error) {
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

    return {
      success: true,
      message: "Rider deleted successfully",
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: "Failed to delete rider",
    };
  }
};
