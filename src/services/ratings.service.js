// src/services/ratings.service.js

import supabase from "../config/supabase.js";
import { validateRating } from "../validators/ratings.validator.js";

// Create a new rating
export const createRating = async (ratingData) => {
  try {
    validateRating(ratingData);

    const { data, error } = await supabase
      .from("ratings")
      .insert([ratingData])
      .select();

    if (error) throw error;

    return {
      success: true,
      data: data[0],
      message: "Rating created successfully",
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: "Failed to create rating",
    };
  }
};

// Get all ratings
export const getAllRatings = async () => {
  try {
    const { data, error } = await supabase
      .from("ratings")
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
      message: "Failed to fetch ratings",
    };
  }
};

// Get rating by ID
export const getRatingById = async (ratingId) => {
  try {
    const { data, error } = await supabase
      .from("ratings")
      .select("*")
      .eq("id", ratingId)
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
      message: "Failed to fetch rating",
    };
  }
};

// Get ratings by rider
export const getRatingsByRider = async (riderId) => {
  try {
    const { data, error } = await supabase
      .from("ratings")
      .select("*")
      .eq("rider_id", riderId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return {
      success: true,
      data: data,
      count: data.length,
      averageRating:
        data.length > 0
          ? (data.reduce((sum, r) => sum + r.stars, 0) / data.length).toFixed(2)
          : 0,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: "Failed to fetch ratings",
    };
  }
};

// Get ratings by retailer
export const getRatingsByRetailer = async (retailerId) => {
  try {
    const { data, error } = await supabase
      .from("ratings")
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
      message: "Failed to fetch ratings",
    };
  }
};

// Get ratings by delivery
export const getRatingsByDelivery = async (deliveryId) => {
  try {
    const { data, error } = await supabase
      .from("ratings")
      .select("*")
      .eq("delivery_id", deliveryId)
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
      message: "Failed to fetch rating",
    };
  }
};

// Update rating
export const updateRating = async (ratingId, updateData) => {
  try {
    validateRating(updateData);

    const { data, error } = await supabase
      .from("ratings")
      .update(updateData)
      .eq("id", ratingId)
      .select();

    if (error) throw error;

    return {
      success: true,
      data: data[0],
      message: "Rating updated successfully",
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: "Failed to update rating",
    };
  }
};

// Delete rating
export const deleteRating = async (ratingId) => {
  try {
    const { error } = await supabase
      .from("ratings")
      .delete()
      .eq("id", ratingId);

    if (error) throw error;

    return {
      success: true,
      message: "Rating deleted successfully",
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: "Failed to delete rating",
    };
  }
};
