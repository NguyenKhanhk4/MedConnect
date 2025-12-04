import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import morgan from "morgan";
import { fail } from "../utils/response.js";
import { ERROR_CODES } from "../constants/index.js";

/**
 * Configure Express app
 */
export function configureExpress() {
  const app = express();

  // Basic configuration
  // app.disable("x-powered-by");
  // Disable etag so Express doesn't generate ETag headers that can cause 304 responses
  // app.set('etag', false);
  // Add middleware to prevent caching for API responses (avoid 304 Not Modified)
  // app.use((req, res, next) => {
  //   // Only set no-cache for API routes (adjust path prefix if your API is mounted elsewhere)
  //   if (req.path.startsWith('/api') || req.path === '/' || req.baseUrl) {
  //     res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  //     res.setHeader('Pragma', 'no-cache');
  //     res.setHeader('Expires', '0');
  //     res.setHeader('Surrogate-Control', 'no-store');
  //   }
  //   next();
  // });
  // Increased limit to 10MB to handle base64 avatar images
  app.use(express.json({ limit: "10mb" }));
  app.use(cookieParser());
  app.use(
    cors({
      origin: ["http://localhost:5173", "http://localhost:5174"],
      credentials: true,
    })
  );
  app.use(morgan("dev"));

  return app;
}

/**
 * Configure error handling middleware
 */
// export function configureErrorHandling(app) {
//   // 404 handler
//   app.use((req, res) =>
//     fail(res, 404, ERROR_CODES.NOT_FOUND, "Route not found")
//   );

//   // Global error handler
//   app.use((err, _req, res, _next) => {
//     console.error("❌ Express error:", err);
//     fail(res, 500, ERROR_CODES.SERVER_ERROR, err.message || String(err));
//   });
// }
