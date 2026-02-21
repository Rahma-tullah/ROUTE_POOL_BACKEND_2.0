// src/validators/riders.validator.js

export const validateRider = (data) => {
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
  if (!data.vehicle_type) {
    errors.push("vehicle_type is required");
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
  if (data.vehicle_type && typeof data.vehicle_type !== "string") {
    errors.push("vehicle_type must be a string");
  }

  // Check email format
  if (data.email && !data.email.includes("@")) {
    errors.push("email must be valid");
  }

  // Check vehicle type is valid
  if (data.vehicle_type) {
    const validVehicles = ["motorcycle", "bicycle", "car"];
    if (!validVehicles.includes(data.vehicle_type)) {
      errors.push(`vehicle_type must be one of: ${validVehicles.join(", ")}`);
    }
  }

  // Check average_rating if provided
  if (
    data.average_rating &&
    (typeof data.average_rating !== "number" ||
      data.average_rating < 0 ||
      data.average_rating > 5)
  ) {
    errors.push("average_rating must be a number between 0 and 5");
  }

  // If errors, throw them
  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }

  return true;
};
