// src/validators/status.validator.js
// Valid status values

export const validateDeliveryStatusUpdate = (data) => {
  const errors = [];

  if (!data.delivery_id) {
    errors.push("delivery_id is required");
  }
  if (!data.status) {
    errors.push("status is required");
  }

  if (data.delivery_id && typeof data.delivery_id !== "number") {
    errors.push("delivery_id must be a number");
  }

  // Valid delivery statuses
  const validDeliveryStatuses = ["pending", "in_transit", "delivered"];
  if (data.status && !validDeliveryStatuses.includes(data.status)) {
    errors.push(`status must be one of: ${validDeliveryStatuses.join(", ")}`);
  }

  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }

  return true;
};

export const validateBatchStatusUpdate = (data) => {
  const errors = [];

  if (!data.batch_id) {
    errors.push("batch_id is required");
  }
  if (!data.status) {
    errors.push("status is required");
  }

  if (data.batch_id && typeof data.batch_id !== "number") {
    errors.push("batch_id must be a number");
  }

  // Valid batch statuses
  const validBatchStatuses = ["created", "in_transit", "completed"];
  if (data.status && !validBatchStatuses.includes(data.status)) {
    errors.push(`status must be one of: ${validBatchStatuses.join(", ")}`);
  }

  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }

  return true;
};
