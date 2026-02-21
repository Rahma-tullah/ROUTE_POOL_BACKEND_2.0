// src/validators/retailers.validator.js

export const validateRetailer = (data) => {
  const errors = [];

  // Check required fields
  if (!data.name) {
    errors.push("name is required");
  }
  if (!data.email) {
    errors.push("email is required");
  }
  if (!data.phone) {
    errors.push("phone is required");
  }
  if (!data.shop_name) {
    errors.push("shop_name is required");
  }

  // Check data types
  if (data.name && typeof data.name !== "string") {
    errors.push("name must be a string");
  }
  if (data.email && typeof data.email !== "string") {
    errors.push("email must be a string");
  }
  if (data.phone && typeof data.phone !== "string") {
    errors.push("phone must be a string");
  }
  if (data.shop_name && typeof data.shop_name !== "string") {
    errors.push("shop_name must be a string");
  }

  // Check email format
  if (data.email && !data.email.includes("@")) {
    errors.push("email must be valid");
  }

  // If errors, throw them
  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }

  return true;
};
