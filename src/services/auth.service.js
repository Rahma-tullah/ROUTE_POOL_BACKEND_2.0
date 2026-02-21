// src/services/auth.service.js

import supabase from "../config/supabase.js";
import {
  validateSignup,
  validateOTP,
  validateEmail,
} from "../validators/auth.validator.js";

// Generate password that meets Supabase requirements
const generateSecurePassword = () => {
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const special = "!@#$%^&*()_+-=[]{};':\"|<>?,./`~";

  let password = "";

  // Add one of each required character type
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Add 8 more random characters
  const allChars = lowercase + uppercase + numbers + special;
  for (let i = 0; i < 8; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
};
// Signup - Create new user
export const signup = async (signupData) => {
  try {
    validateSignup(signupData);

    const { email, name, phone, user_type, shop_name, vehicle_type } =
      signupData;

    // Step 1: Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email,
      password: generateSecurePassword(), // Random password (not used for OTP)
    });

    if (authError) throw authError;

    const userId = authData.user.id;

    // Step 2: Create user record in appropriate table
    let userData;

    if (user_type === "retailer") {
      const { data, error } = await supabase
        .from("retailers")
        .insert([
          {
            name: name,
            email: email,
            phone: phone,
            shop_name: shop_name,
          },
        ])
        .select();

      if (error) throw error;
      userData = data[0];
    } else if (user_type === "rider") {
      const { data, error } = await supabase
        .from("riders")
        .insert([
          {
            name: name,
            email: email,
            phone: phone,
            vehicle_type: vehicle_type,
          },
        ])
        .select();

      if (error) throw error;
      userData = data[0];
    }

    return {
      success: true,
      data: {
        userId: userId,
        user: userData,
        message: "Signup successful. Please verify your email with OTP.",
      },
      message: "Signup successful",
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: "Failed to signup",
    };
  }
};

// Send OTP
export const sendOTP = async (email) => {
  try {
    validateEmail(email);

    // Supabase automatically sends OTP when user signs up
    // This endpoint is for resending OTP
    const { error } = await supabase.auth.signInWithOtp({
      email: email,
    });

    if (error) throw error;

    return {
      success: true,
      message: "OTP sent to email. Check your inbox.",
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: "Failed to send OTP",
    };
  }
};

// Verify OTP and Login
export const verifyOTP = async (email, otp) => {
  try {
    validateOTP(email, otp);

    // Verify OTP with Supabase
    const { data, error } = await supabase.auth.verifyOtp({
      email: email,
      token: otp,
      type: "email",
    });

    if (error) throw error;

    const session = data.session;
    const user = data.user;

    // Get user data from our table
    let userData;

    // Try to find in retailers first
    const { data: retailerData } = await supabase
      .from("retailers")
      .select("*")
      .eq("email", email)
      .single();

    if (retailerData) {
      userData = {
        ...retailerData,
        user_type: "retailer",
      };
    } else {
      // Try riders
      const { data: riderData } = await supabase
        .from("riders")
        .select("*")
        .eq("email", email)
        .single();

      if (riderData) {
        userData = {
          ...riderData,
          user_type: "rider",
        };
      }
    }

    return {
      success: true,
      data: {
        session: session,
        user: userData,
        token: session.access_token,
      },
      message: "Login successful",
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: "Failed to verify OTP",
    };
  }
};

// Get current user
export const getCurrentUser = async (token) => {
  try {
    if (!token) {
      throw new Error("No token provided");
    }

    // Get user from Supabase Auth using token
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error) throw error;

    if (!user) {
      throw new Error("User not found");
    }

    // Get user data from our table
    let userData;

    const { data: retailerData } = await supabase
      .from("retailers")
      .select("*")
      .eq("email", user.email)
      .single();

    if (retailerData) {
      userData = {
        ...retailerData,
        user_type: "retailer",
      };
    } else {
      const { data: riderData } = await supabase
        .from("riders")
        .select("*")
        .eq("email", user.email)
        .single();

      if (riderData) {
        userData = {
          ...riderData,
          user_type: "rider",
        };
      }
    }

    return {
      success: true,
      data: {
        auth_user: user,
        user: userData,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: "Failed to get current user",
    };
  }
};

// Logout
export const logout = async () => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) throw error;

    return {
      success: true,
      message: "Logout successful",
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: "Failed to logout",
    };
  }
};
