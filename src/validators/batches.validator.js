// src/validators/batches.validator.js

export const validateBatch = (data) => {
  const errors = [];

  if (data.rider_id && typeof data.rider_id !== "number") {
    errors.push("rider_id must be a number");
  }
  if (data.status && typeof data.status !== "string") {
    errors.push("status must be a string");
  }
  if (data.total_deliveries && typeof data.total_deliveries !== "number") {
    errors.push("total_deliveries must be a number");
  }

  if (data.status) {
    const validStatuses = ["created", "in_transit", "completed"];
    if (!validStatuses.includes(data.status)) {
      errors.push(`status must be one of: ${validStatuses.join(", ")}`);
    }
  }

  if (data.total_deliveries && data.total_deliveries < 0) {
    errors.push("total_deliveries must be positive");
  }

  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }

  return true;
};

// ✅ FIX: Separate validator for partial updates — only validates fields that are present
export const validateBatchUpdate = (data) => {
  const errors = [];
  const allowedFields = [
    "rider_id",
    "status",
    "total_deliveries",
    "completed_at",
  ];

  // Reject unknown fields
  Object.keys(data).forEach((key) => {
    if (!allowedFields.includes(key)) {
      errors.push(`'${key}' is not an updatable field`);
    }
  });

  if ("rider_id" in data && typeof data.rider_id !== "number") {
    errors.push("rider_id must be a number");
  }
  if ("status" in data) {
    const validStatuses = ["created", "in_transit", "completed"];
    if (!validStatuses.includes(data.status)) {
      errors.push(`status must be one of: ${validStatuses.join(", ")}`);
    }
  }
  if ("total_deliveries" in data) {
    if (typeof data.total_deliveries !== "number") {
      errors.push("total_deliveries must be a number");
    } else if (data.total_deliveries < 0) {
      errors.push("total_deliveries must be positive");
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }

  return true;
};
