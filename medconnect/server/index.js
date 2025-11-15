/* ================ Core & Libs ================ */
import express from "express";
import http from "http";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import apiRouter from "./routes/api.router.js";

// Get __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { initializeFirebase } from "./config/firebase.js";
import { startAppointmentCleanupJob } from "./services/appointmentCleanupService.js";
import { startVideoCallReminderJob } from "./services/videoCallReminderService.js";

// Initialize Firebase Admin SDK (will exit process if config missing)
initializeFirebase();

/* ================ App & CORS ================ */
const app = express();
const allowedOrigins = [
  "http://localhost:5173",
  process.env.CLIENT_URL, // Allow ngrok URL from .env
].filter(Boolean); // Remove undefined values
const corsOptions = {
  origin(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, curl, server-to-server)
    if (!origin) return callback(null, true);

    // Allow requests from allowed origins
    if (allowedOrigins.includes(origin)) return callback(null, true);

    // Allow ngrok URLs (for development)
    if (origin && (origin.includes(".ngrok.io") || origin.includes(".ngrok-free.dev"))) {
      return callback(null, true);
    }

    // Log rejected origin for debugging
    console.warn(`⚠️ CORS rejected origin: ${origin}`);
    return callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

// Parse JSON and urlencoded request bodies FIRST
// Increased limit to 10MB to handle base64 avatar images
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// CORS must be after body parsers
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// app.use(morgan("dev"));
app.use("/uploads", express.static("../client/public/uploads"));
// Serve static files from uploads directory - use absolute path to ensure it works
const uploadsDir = path.join(__dirname, "uploads");
console.log(`📁 Static files directory: ${uploadsDir}`);
app.use("/server-uploads", (req, res, next) => {
  console.log(`📄 Requesting file: ${req.path}`);
  
  // Check if file exists before serving
  const filePath = path.join(uploadsDir, req.path);
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.log(`❌ File not found: ${req.path}`);
      console.log(`   Expected path: ${filePath}`);
      console.log(`   Uploads directory: ${uploadsDir}`);
      // List files in doctors directory for debugging
      const doctorsDir = path.join(uploadsDir, "doctors");
      if (fs.existsSync(doctorsDir)) {
        const files = fs.readdirSync(doctorsDir);
        console.log(`   Files in doctors directory: ${files.length} files`);
        if (req.path.includes("doctors")) {
          const requestedFile = req.path.split("/").pop();
          const matchingFiles = files.filter(f => f.includes(requestedFile?.split("-")[0] || ""));
          if (matchingFiles.length > 0) {
            console.log(`   Similar files found: ${matchingFiles.join(", ")}`);
          }
        }
      }
      res.status(404).json({ error: "Không tìm thấy trang" });
      return;
    }
    // File exists, serve it
    express.static(uploadsDir)(req, res, next);
  });
});
app.use(cookieParser());

// router
// Expose APIs under /api to match frontend (frontend uses /api/auth/...)
app.use("/api", apiRouter);

/* ================ 404 & Error Handler ================ */
app.use((_req, res) => {
  res.status(404).json({ error: "Không tìm thấy trang" });
});
app.use((err, req, res, _next) => {
  console.error("❌ Error handler caught:", err.stack);

  // Ensure CORS headers are set even on errors
  const origin = req.headers.origin;
  if (!origin || allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin || "*");
    res.header("Access-Control-Allow-Credentials", "true");
  }

  res.status(err.status || 500).json({
    error: true,
    message: err.message || "Internal Server Error",
  });
});

/* ================ Start Server ================ */
const server = http.createServer(app);

mongoose
  .connect(process.env.MONGODB_URL || "mongodb://localhost:27017/MedConnect")
  .then(async () => {
    console.log("✅ Kết nối đến MongoDB thành công");
    
    // Fix old unique index on Payments collection if exists
    try {
      const db = mongoose.connection.db;
      const collection = db.collection("Payments");
      const indexes = await collection.indexes();
      const oldIndex = indexes.find(idx => 
        idx.name === "appointmentId_1" && idx.unique === true
      );
      
      if (oldIndex) {
        await collection.dropIndex("appointmentId_1");
        console.log("✅ Đã xóa unique index cũ: appointmentId_1 trên collection Payments");
      }
    } catch (error) {
      if (error.code !== 27 && !error.message?.includes("index not found")) {
        console.log("ℹ️ Kiểm tra index (có thể đã được xóa):", error.message);
      }
    }
    
    // Tắt cron job tự động hủy appointments - không giới hạn thời gian thanh toán
    // startAppointmentCleanupJob();
    console.log(
      "ℹ️  Auto-cancel appointments is disabled - no payment deadline"
    );

    // Khởi động cron job gửi email nhắc nhở video call 10 phút trước
    startVideoCallReminderJob();
  })
  .catch((err) => {
    console.error("❌ Lỗi kết nối đến MongoDB:", err.message);
    console.log("⚠️ Server sẽ tiếp tục chạy nhưng có thể có lỗi database");
  });

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  const domain = `http://localhost:${PORT}`;
  console.log(`🚀 Server đang chạy tại: ${domain}`);
});
// });

