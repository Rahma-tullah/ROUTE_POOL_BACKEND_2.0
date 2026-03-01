import { startAutoBatchCron } from "./services/cron.service.js";
import { logger } from "./utils/logger.js";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import deliveriesRoutes from "./routes/deliveries.routes.js";
import retailersRoutes from "./routes/retailers.routes.js";
import ridersRoutes from "./routes/riders.routes.js";
import batchesRoutes from "./routes/batches.routes.js";
import ratingsRoutes from "./routes/ratings.routes.js";
import authRoutes from "./routes/auth.routes.js";
import clusteringRoutes from "./routes/clustering.routes.js";
import verificationRoutes from "./routes/verification.routes.js";
import statusRoutes from "./routes/status.routes.js";
import chatRoutes from "./routes/chat.routes.js";

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
logger.info("Server starting");
const PORT = process.env.PORT || 3000;

// Middleware
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  }),
);

app.use(express.json());

// Welcome route
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to Route-Pool Backend API",
    version: "1.0.0",
    endpoints: {
      deliveries: "/api/deliveries",
    },
  });
});

// API Routes
app.use("/api/deliveries", deliveriesRoutes);
app.use("/api/retailers", retailersRoutes);
app.use("/api/riders", ridersRoutes);
app.use("/api/batches", batchesRoutes);
app.use("/api/ratings", ratingsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/clustering", clusteringRoutes);
app.use("/api/verification", verificationRoutes);
app.use("/api/status", statusRoutes);
app.use("/api/chat", chatRoutes);

// Health check route
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    success: false,
    error: err.message,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📚 API Documentation:`);
  console.log(`   GET  http://localhost:${PORT}/`);
  console.log(`   GET  http://localhost:${PORT}/health`);

  // Start auto-batch cron job
  startAutoBatchCron();
});
