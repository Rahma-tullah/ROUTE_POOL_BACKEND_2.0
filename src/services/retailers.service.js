// src/services/retailers.service.js

import supabase from "../config/supabase.js";
import { validateRetailer } from "../validators/retailers.validator.js";

// Create a new retailer
export const createRetailer = async (retailerData) => {
  try {
    validateRetailer(retailerData);

    const { data, error } = await supabase
      .from("retailers")
      .insert([retailerData])
      .select();

    if (error) throw error;

    return {
      success: true,
      data: data[0],
      message: "Retailer created successfully",
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: "Failed to create retailer",
    };
  }
};

// Get all retailers
export const getAllRetailers = async () => {
  try {
    const { data, error } = await supabase
      .from("retailers")
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
      message: "Failed to fetch retailers",
    };
  }
};

// Get retailer by ID
export const getRetailerById = async (retailerId) => {
  try {
    const { data, error } = await supabase
      .from("retailers")
      .select("*")
      .eq("id", retailerId)
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
      message: "Failed to fetch retailer",
    };
  }
};

// Update retailer
export const updateRetailer = async (retailerId, updateData) => {
  try {
    const { data, error } = await supabase
      .from("retailers")
      .update(updateData)
      .eq("id", retailerId)
      .select();

    if (error) throw error;

    return {
      success: true,
      data: data[0],
      message: "Retailer updated successfully",
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: "Failed to update retailer",
    };
  }
};

// Delete retailer
export const deleteRetailer = async (retailerId) => {
  try {
    const { error } = await supabase
      .from("retailers")
      .delete()
      .eq("id", retailerId);

    if (error) throw error;

    return {
      success: true,
      message: "Retailer deleted successfully",
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: "Failed to delete retailer",
    };
  }
};
