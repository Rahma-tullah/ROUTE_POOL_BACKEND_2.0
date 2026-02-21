// src/validators/auth.validator.js

export const validateSignup = (data) => {
  const errors = [];

  // Check required fields
  if (!data.email) {
    errors.push("email is required");
  }
  if (!data.name) {
    errors.push("name is required");
  }
  if (!data.phone) {
    errors.push("phone is required");
  }
  if (!data.user_type) {
    errors.push("user_type is required");
  }

  // For retailers
  if (data.user_type === "retailer" && !data.shop_name) {
    errors.push("shop_name is required for retailers");
  }

  // For riders
  if (data.user_type === "rider" && !data.vehicle_type) {
    errors.push("vehicle_type is required for riders");
  }

  // Check email format
  if (data.email && !data.email.includes("@")) {
    errors.push("email must be valid");
  }

  // Check user_type is valid
  if (data.user_type && !["retailer", "rider"].includes(data.user_type)) {
    errors.push("user_type must be either retailer or rider");
  }

  // Check vehicle type for riders
  if (data.vehicle_type) {
    const validVehicles = ["motorcycle", "bicycle", "car"];
    if (!validVehicles.includes(data.vehicle_type)) {
      errors.push(`vehicle_type must be one of: ${validVehicles.join(", ")}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }

  return true;
};

export const validateOTP = (email, otp) => {
  const errors = [];

  if (!email) {
    errors.push("email is required");
  }
  if (!otp) {
    errors.push("otp is required");
  }
  if (otp && typeof otp !== "string") {
    errors.push("otp must be a string");
  }

  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }

  return true;
};

export const validateEmail = (email) => {
  if (!email) {
    throw new Error("email is required");
  }
  if (!email.includes("@")) {
    throw new Error("email must be valid");
  }
  return true;
};
