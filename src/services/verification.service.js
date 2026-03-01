// src/services/verification.service.js
import { logger } from "../utils/logger.js";
import supabase from "../config/supabase.js";
import bcryptjs from "bcryptjs";
import {
  validateCodeGeneration,
  validateCodeVerification,
} from "../validators/verification.validator.js";

// Helper: Generate random alphanumeric code
const generateCode = (length = 8) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Helper: Generate hash for code (for storage)
const hashCode = async (code) => {
  return await bcryptjs.hash(code, 10);
};

// Helper: Check if code is expired (24 hours)
const isCodeExpired = (createdAt) => {
  const createdDate = new Date(createdAt);
  if (isNaN(createdDate.getTime())) {
    logger.error("Invalid created_at date", { createdAt });
    return true;
  }
  const expiryTime = 24 * 60 * 60 * 1000; // 24 hours
  return new Date().getTime() - createdDate.getTime() > expiryTime;
};

// Generate verification code for delivery
export const generateVerificationCode = async (deliveryId) => {
  try {
    validateCodeGeneration({ delivery_id: deliveryId });

    // Get delivery
    const { data: delivery, error: deliveryError } = await supabase
      .from("deliveries")
      .select("*")
      .eq("id", deliveryId)
      .single();

    if (deliveryError) throw new Error("Delivery not found");

    // Delete any existing codes for this delivery before generating a new one
    await supabase
      .from("verification_codes")
      .delete()
      .eq("delivery_id", deliveryId);

    // Generate new code
    const code = generateCode(8);
    const hashedCode = await hashCode(code); // ← was missing await

    // Store code in database
    const { data: storedCode, error: storeError } = await supabase
      .from("verification_codes")
      .insert([
        {
          delivery_id: deliveryId,
          code_hash: hashedCode,
          is_used: false,
        },
      ])
      .select();

    if (storeError) throw storeError;

    logger.info("Verification code generated", { deliveryId });

    return {
      success: true,
      data: {
        deliveryId: deliveryId,
        code: code,
        codeId: storedCode[0].id,
        expiresAt: new Date(new Date().getTime() + 24 * 60 * 60 * 1000),
        message: "Verification code generated. Valid for 24 hours.",
      },
    };
  } catch (error) {
    logger.error("Generate code failed", { deliveryId, error: error.message });
    return {
      success: false,
      error: error.message,
      message: "Failed to generate verification code",
    };
  }
};

// Verify code for delivery
export const verifyCode = async (deliveryId, code) => {
  try {
    logger.info("Code verification attempt", { deliveryId });

    validateCodeVerification({ delivery_id: deliveryId, code: code });

    // Get delivery
    const { data: delivery, error: deliveryError } = await supabase
      .from("deliveries")
      .select("*")
      .eq("id", deliveryId)
      .single();

    if (deliveryError) throw new Error("Delivery not found");

    // Get the NEWEST unused code for this delivery
    const { data: codes, error: codeError } = await supabase
      .from("verification_codes")
      .select("*")
      .eq("delivery_id", deliveryId)
      .eq("is_used", false)
      .order("created_at", { ascending: false })
      .limit(1);

    if (codeError || !codes || codes.length === 0) {
      logger.warn("No valid code found", { deliveryId });
      throw new Error("No valid verification code found for this delivery");
    }

    const codeRecord = codes[0];

    // Check expiry
    if (isCodeExpired(codeRecord.created_at)) {
      logger.warn("Code expired", { deliveryId, codeId: codeRecord.id });
      return {
        success: false,
        error: "Code has expired",
        message: "Verification code expired. Please generate a new code.",
      };
    }

    // Verify code against hash
    const isCodeValid = await bcryptjs.compare(code, codeRecord.code_hash);
    if (!isCodeValid) {
      logger.warn("Invalid code provided", {
        deliveryId,
        codeId: codeRecord.id,
      });
      return {
        success: false,
        error: "Invalid code",
        message: "Verification code is incorrect",
      };
    }

    // Mark code as used
    const { error: updateError } = await supabase
      .from("verification_codes")
      .update({ is_used: true, used_at: new Date() })
      .eq("id", codeRecord.id);

    if (updateError) throw updateError;

    // Mark delivery as delivered
    const { error: deliveryUpdateError } = await supabase
      .from("deliveries")
      .update({ status: "delivered" })
      .eq("id", deliveryId);

    if (deliveryUpdateError) throw deliveryUpdateError;

    logger.info("Code verified successfully", {
      deliveryId,
      status: "delivered",
    });

    return {
      success: true,
      data: {
        deliveryId: deliveryId,
        status: "delivered",
        verifiedAt: new Date(),
      },
      message: "Delivery verified and marked as completed!",
    };
  } catch (error) {
    logger.error("Code verification failed", {
      deliveryId,
      error: error.message,
    });
    return {
      success: false,
      error: error.message,
      message: "Failed to verify code",
    };
  }
};

// Get code info
export const getCodeInfo = async (codeId) => {
  try {
    const { data: codeRecord, error } = await supabase
      .from("verification_codes")
      .select("*")
      .eq("id", codeId)
      .single();

    if (error) throw error;

    return {
      success: true,
      data: {
        codeId: codeRecord.id,
        deliveryId: codeRecord.delivery_id,
        isUsed: codeRecord.is_used,
        expiresAt: new Date(
          new Date(codeRecord.created_at).getTime() + 24 * 60 * 60 * 1000,
        ),
        isExpired: isCodeExpired(codeRecord.created_at),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};
