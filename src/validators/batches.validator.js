// src/validators/batches.validator.js

export const validateBatch = (data) => {
  const errors = [];

  // Check data types
  if (data.rider_id && typeof data.rider_id !== "number") {
    errors.push("rider_id must be a number");
  }
  if (data.status && typeof data.status !== "string") {
    errors.push("status must be a string");
  }
  if (data.total_deliveries && typeof data.total_deliveries !== "number") {
    errors.push("total_deliveries must be a number");
  }

  // Check status is valid (if provided)
  if (data.status) {
    const validStatuses = ["created", "in_transit", "completed"];
    if (!validStatuses.includes(data.status)) {
      errors.push(`status must be one of: ${validStatuses.join(", ")}`);
    }
  }

  // Check total_deliveries is positive
  if (data.total_deliveries && data.total_deliveries < 0) {
    errors.push("total_deliveries must be positive");
  }

  // If errors, throw them
  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }

  return true;
};
