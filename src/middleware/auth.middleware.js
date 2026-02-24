// src/middleware/auth.middleware.js

import supabase from "../config/supabase.js";
import { logger } from "../utils/logger.js";

// Verify JWT token
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

    const { data: user, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: "Invalid token",
        message: "Unauthorized",
      });
    }

    // Attach user to request
    req.user = user;
    req.token = token;
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
    const userId = req.user.id;
    const resourceId = req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "User not identified",
        message: "Unauthorized",
      });
    }

    // Store for later use in route handlers
    req.userId = userId;
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
      const userId = req.user.id;

      // Get user type from database
      let userType = null;

      // Check retailers table
      const { data: retailer } = await supabase
        .from("retailers")
        .select("id")
        .eq("id", userId)
        .single();

      if (retailer) {
        userType = "retailer";
      } else {
        // Check riders table
        const { data: rider } = await supabase
          .from("riders")
          .select("id")
          .eq("id", userId)
          .single();

        if (rider) {
          userType = "rider";
        }
      }

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
