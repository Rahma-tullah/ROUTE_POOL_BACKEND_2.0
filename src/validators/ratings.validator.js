// src/validators/ratings.validator.js

export const validateRating = (data) => {
  const errors = [];

  // Check required fields
  if (data.delivery_id === undefined || data.delivery_id === null) {
    errors.push("delivery_id is required");
  }
  if (data.rider_id === undefined || data.rider_id === null) {
    errors.push("rider_id is required");
  }
  if (data.retailer_id === undefined || data.retailer_id === null) {
    errors.push("retailer_id is required");
  }
  if (data.stars === undefined || data.stars === null) {
    errors.push("stars is required");
  }

  // Check data types
  if (data.delivery_id && typeof data.delivery_id !== "number") {
    errors.push("delivery_id must be a number");
  }
  if (data.rider_id && typeof data.rider_id !== "number") {
    errors.push("rider_id must be a number");
  }
  if (data.retailer_id && typeof data.retailer_id !== "number") {
    errors.push("retailer_id must be a number");
  }
  if (data.stars && typeof data.stars !== "number") {
    errors.push("stars must be a number");
  }
  if (data.comment && typeof data.comment !== "string") {
    errors.push("comment must be a string");
  }

  // Check stars is between 1 and 5
  if (data.stars && (data.stars < 1 || data.stars > 5)) {
    errors.push("stars must be between 1 and 5");
  }

  // If errors, throw them
  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }

  return true;
};
