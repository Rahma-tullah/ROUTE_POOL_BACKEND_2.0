// src/validators/deliveries.validator.js

export const validateDelivery = (data) => {
  const errors = [];

  // Check required fields
  if (!data.retailer_id) {
    errors.push("retailer_id is required");
  }
  if (!data.customer_name) {
    errors.push("customer_name is required");
  }
  if (!data.customer_phone) {
    errors.push("customer_phone is required");
  }
  if (!data.address) {
    errors.push("address is required");
  }

  // Check data types
  if (data.retailer_id && typeof data.retailer_id !== "number") {
    errors.push("retailer_id must be a number");
  }
  if (data.customer_name && typeof data.customer_name !== "string") {
    errors.push("customer_name must be a string");
  }
  if (data.customer_phone && typeof data.customer_phone !== "string") {
    errors.push("customer_phone must be a string");
  }
  if (data.address && typeof data.address !== "string") {
    errors.push("address must be a string");
  }

  // Check status is valid (if provided)
  if (data.status) {
    const validStatuses = ["pending", "assigned", "in_transit", "delivered"];
    if (!validStatuses.includes(data.status)) {
      errors.push(`status must be one of: ${validStatuses.join(", ")}`);
    }
  }

  // Check coordinates if provided
  if (
    data.latitude &&
    (typeof data.latitude !== "number" ||
      data.latitude < -90 ||
      data.latitude > 90)
  ) {
    errors.push("latitude must be a number between -90 and 90");
  }
  if (
    data.longitude &&
    (typeof data.longitude !== "number" ||
      data.longitude < -180 ||
      data.longitude > 180)
  ) {
    errors.push("longitude must be a number between -180 and 180");
  }

  // If errors, throw them
  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }

  return true;
};
