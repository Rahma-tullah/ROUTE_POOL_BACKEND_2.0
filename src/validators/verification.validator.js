// src/validators/verification.validator.js

export const validateCodeGeneration = (data) => {
  const errors = [];

  if (!data.delivery_id) {
    errors.push("delivery_id is required");
  }
  if (data.delivery_id && typeof data.delivery_id !== "number") {
    errors.push("delivery_id must be a number");
  }

  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }

  return true;
};

export const validateCodeVerification = (data) => {
  const errors = [];

  if (!data.delivery_id) {
    errors.push("delivery_id is required");
  }
  if (!data.code) {
    errors.push("code is required");
  }

  if (data.delivery_id && typeof data.delivery_id !== "number") {
    errors.push("delivery_id must be a number");
  }
  if (data.code && typeof data.code !== "string") {
    errors.push("code must be a string");
  }

  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }

  return true;
};
