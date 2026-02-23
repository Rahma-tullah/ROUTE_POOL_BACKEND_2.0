// src/utils/logger.js

export const logger = {
  info: (msg, data) => {
    console.log(`[INFO] ${msg}`, data || "");
  },
  error: (msg, data) => {
    console.log(`[ERROR] ${msg}`, data || "");
  },
  warn: (msg, data) => {
    console.log(`[WARN] ${msg}`, data || "");
  },
};
