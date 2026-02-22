// src/services/verification.service.js

import supabase from "../config/supabase.js";
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
const hashCode = (code) => {
  // Simple hash for MVP (use bcrypt in production)
  return Buffer.from(code).toString("base64");
};

// Generate verification code for delivery
export const generateVerificationCode = async (deliveryId) => {
  try {
    validateCodeGeneration({ delivery_id: deliveryId });

    // Step 1: Get delivery
    const { data: delivery, error: deliveryError } = await supabase
      .from("deliveries")
      .select("*")
      .eq("id", deliveryId)
      .single();

    if (deliveryError) throw new Error("Delivery not found");

    // Step 2: Check if delivery already has a code
    const { data: existingCode } = await supabase
      .from("verification_codes")
      .select("*")
      .eq("delivery_id", deliveryId)
      .eq("is_used", false)
      .single();

    if (existingCode && !isCodeExpired(existingCode.created_at)) {
      // Return existing valid code
      return {
        success: true,
        data: {
          deliveryId: deliveryId,
          codeId: existingCode.id,
          expiresAt: new Date(
            new Date(existingCode.created_at).getTime() + 15 * 60000,
          ),
          message: "Code already generated. Use existing code.",
        },
      };
    }

    // Step 3: Generate new code
    const code = generateCode(8);
    const hashedCode = hashCode(code);

    // Step 4: Store code in database
    const { data: storedCode, error: storeError } = await supabase
      .from("verification_codes")
      .insert([
        {
          delivery_id: deliveryId,
          code_hash: hashedCode,
          is_used: false,
          // Remove created_at - Supabase will set it automatically
        },
      ])
      .select();

    if (storeError) throw storeError;

    return {
      success: true,
      data: {
        deliveryId: deliveryId,
        code: code, // Send actual code to user (not hash)
        codeId: storedCode[0].id,
        expiresAt: new Date(new Date().getTime() + 15 * 60000), // 15 minutes
        message: "Verification code generated. Valid for 15 minutes.",
      },
    };
  } catch (error) {
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
    validateCodeVerification({ delivery_id: deliveryId, code: code });

    // Step 1: Get delivery
    const { data: delivery, error: deliveryError } = await supabase
      .from("deliveries")
      .select("*")
      .eq("id", deliveryId)
      .single();

    if (deliveryError) throw new Error("Delivery not found");

    // Step 2: Get verification code record
    const { data: codeRecord, error: codeError } = await supabase
      .from("verification_codes")
      .select("*")
      .eq("delivery_id", deliveryId)
      .eq("is_used", false)
      .single();

    if (codeError || !codeRecord) {
      throw new Error("No valid verification code found for this delivery");
    }

    // Step 3: Check if code is expired (15 minutes)
    // if (isCodeExpired(codeRecord.created_at)) {
    //   return {
    //     success: false,
    //     error: "Code has expired",
    //     message: "Verification code expired. Request a new code.",
    //   };
    // }

    // Step 4: Verify code (compare hashes)
    const hashedInputCode = hashCode(code);
    if (hashedInputCode !== codeRecord.code_hash) {
      return {
        success: false,
        error: "Invalid code",
        message: "Verification code is incorrect",
      };
    }

    // Step 5: Mark code as used
    const { error: updateError } = await supabase
      .from("verification_codes")
      .update({ is_used: true, used_at: new Date() })
      .eq("id", codeRecord.id);

    if (updateError) throw updateError;

    // Step 6: Mark delivery as completed
    const { error: deliveryUpdateError } = await supabase
      .from("deliveries")
      .update({ status: "delivered" })
      .eq("id", deliveryId);

    if (deliveryUpdateError) throw deliveryUpdateError;

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
    return {
      success: false,
      error: error.message,
      message: "Failed to verify code",
    };
  }
};

// Helper: Check if code is expired (15 minutes)
const isCodeExpired = (createdAt) => {
  // Ensure createdAt is a valid date
  const createdDate = new Date(createdAt);

  // Handle invalid dates
  if (isNaN(createdDate.getTime())) {
    console.error("Invalid date:", createdAt);
    return true; // Treat as expired if date is invalid
  }

  const created = createdDate.getTime();
  const now = new Date().getTime();
  const expiryTime = 15 * 60 * 1000; // 15 minutes in milliseconds

  console.log("Created:", new Date(created));
  console.log("Now:", new Date(now));
  console.log("Difference (ms):", now - created);
  console.log("Expiry time (ms):", expiryTime);
  console.log("Is expired?", now - created > expiryTime);

  return now - created > expiryTime;
};

// Get code info (without revealing actual code)
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
          new Date(codeRecord.created_at).getTime() + 15 * 60000,
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
