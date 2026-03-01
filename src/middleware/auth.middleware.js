// src/middleware/auth.middleware.js

import supabase from "../config/supabase.js";
import { logger } from "../utils/logger.js";

// Verify JWT token and attach flattened user + db record to req
export const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "No token provided",
        message: "Authorization required",
      });
    }

    // supabase.auth.getUser returns { data: { user }, error }
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({
        success: false,
        error: "Invalid token",
        message: "Unauthorized",
      });
    }

    // Flatten: req.user is now the actual Supabase auth user object
    // so req.user.email, req.user.id (UUID) work directly everywhere
    req.user = data.user;
    req.token = token;

    // Also look up the integer DB record by email and attach as req.dbUser
    // This gives routes access to the integer id without their own lookups
    const email = data.user.email;

    const { data: retailer } = await supabase
      .from("retailers")
      .select("*")
      .eq("email", email)
      .single();

    if (retailer) {
      req.dbUser = { ...retailer, user_type: "retailer" };
    } else {
      const { data: rider } = await supabase
        .from("riders")
        .select("*")
        .eq("email", email)
        .single();

      if (rider) {
        req.dbUser = { ...rider, user_type: "rider" };
      }
    }

    next();
  } catch (error) {
    logger.error("Token verification failed", { error: error.message });
    res.status(401).json({
      success: false,
      error: "Invalid token",
      message: "Unauthorized",
    });
  }
};

// Verify user owns this resource
export const verifyOwnership = async (req, res, next) => {
  try {
    if (!req.dbUser?.id) {
      return res.status(401).json({
        success: false,
        error: "User not identified",
        message: "Unauthorized",
      });
    }
    req.userId = req.dbUser.id;
    next();
  } catch (error) {
    logger.error("Ownership verification failed", { error: error.message });
    res.status(401).json({
      success: false,
      error: "Authorization failed",
      message: "Unauthorized",
    });
  }
};

// Check user role
export const requireRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const userType = req.dbUser?.user_type;

      if (!userType || !allowedRoles.includes(userType)) {
        return res.status(403).json({
          success: false,
          error: "Forbidden",
          message: "You do not have permission to access this resource",
        });
      }

      req.userType = userType;
      next();
    } catch (error) {
      logger.error("Role check failed", { error: error.message });
      res.status(403).json({
        success: false,
        error: "Forbidden",
        message: "You do not have permission",
      });
    }
  };
};
