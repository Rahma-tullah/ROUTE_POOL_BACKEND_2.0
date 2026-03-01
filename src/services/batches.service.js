// src/services/batches.service.js

import supabase from "../config/supabase.js";
import {
  validateBatch,
  validateBatchUpdate,
} from "../validators/batches.validator.js"; // ✅ FIX: import validateBatchUpdate

// Create a new batch
export const createBatch = async (batchData) => {
  try {
    validateBatch(batchData);

    const { data, error } = await supabase
      .from("batches")
      .insert([batchData])
      .select();

    if (error) throw error;

    return {
      success: true,
      data: data[0],
      message: "Batch created successfully",
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: "Failed to create batch",
    };
  }
};

// Get all batches
export const getAllBatches = async () => {
  try {
    const { data, error } = await supabase
      .from("batches")
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
      message: "Failed to fetch batches",
    };
  }
};

// Get batch by ID
export const getBatchById = async (batchId) => {
  try {
    const { data, error } = await supabase
      .from("batches")
      .select("*")
      .eq("id", batchId)
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
      message: "Failed to fetch batch",
    };
  }
};

// Get batches by rider
export const getBatchesByRider = async (riderId) => {
  try {
    const { data, error } = await supabase
      .from("batches")
      .select("*")
      .eq("rider_id", riderId)
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
      message: "Failed to fetch batches",
    };
  }
};

// Get batches by status
export const getBatchesByStatus = async (status) => {
  try {
    const { data, error } = await supabase
      .from("batches")
      .select("*")
      .eq("status", status)
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
      message: "Failed to fetch batches",
    };
  }
};

// Update batch
export const updateBatch = async (batchId, updateData) => {
  try {
    validateBatchUpdate(updateData); // ✅ FIX: use validateBatchUpdate for partial updates

    const { data, error } = await supabase
      .from("batches")
      .update(updateData)
      .eq("id", batchId)
      .select();

    if (error) throw error;

    return {
      success: true,
      data: data[0],
      message: "Batch updated successfully",
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: "Failed to update batch",
    };
  }
};

// Delete batch
export const deleteBatch = async (batchId) => {
  try {
    const { error } = await supabase.from("batches").delete().eq("id", batchId);

    if (error) throw error;

    return {
      success: true,
      message: "Batch deleted successfully",
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: "Failed to delete batch",
    };
  }
};
