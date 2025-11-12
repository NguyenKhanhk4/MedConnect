import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables from .env file
config();

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

const app = express();

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// API routes
app.use("/api/auth", import("./routes/authRoutes.js"));
app.use("/api/patients", import("./routes/patientRoutes.js"));
app.use("/api/doctors", import("./routes/doctorRoutes.js"));
app.use("/api/admin", import("./routes/adminRoutes.js"));
app.use("/api/managers", import("./routes/managerRoutes.js"));
app.use("/api/payments", import("./routes/paymentRoutes.js"));
app.use("/api/notifications", import("./routes/notificationRoutes.js"));
app.use("/api/reviews", import("./routes/reviewRoutes.js"));
app.use("/api/specializations", import("./routes/specializationRoutes.js"));
app.use("/api/appointments", import("./routes/appointmentRoutes.js"));

// Serve frontend static files in production
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "../client/dist")));

// Fallback to serve index.html for all non-API routes (frontend routing)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist/index.html"));
});

// Change PORT from 5000 to 3000
const PORT = process.env.PORT || 3000;

// Start the server
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});
