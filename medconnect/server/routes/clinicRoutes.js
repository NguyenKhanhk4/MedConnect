/**
 * ======================================================================
 * CLINIC ROUTES
 * ======================================================================
 * 
 * File định nghĩa các routes (endpoints) cho Clinic APIs
 * 
 * Base URL: /api/clinics
 * 
 * Public Routes (không cần authentication):
 * - GET    /api/clinics              - Lấy danh sách clinics
 * - GET    /api/clinics/locations    - Lấy danh sách locations duy nhất
 * - GET    /api/clinics/:id          - Lấy chi tiết clinic theo ID
 * 
 * Protected Routes (cần authentication):
 * - POST   /api/clinics              - Tạo clinic mới
 * - PUT    /api/clinics/:id          - Cập nhật clinic
 * - DELETE /api/clinics/:id          - Xóa clinic
 * 
 * Note:
 * - Protected routes sử dụng authGuard middleware để verify token
 * - Thứ tự routes quan trọng: đặt routes cụ thể trước routes động
 *   (ví dụ: /locations phải đặt trước /:id)
 */

// Import Express Router
import express from "express";

// Import Controllers
import {
  getAllClinics,        // GET    /
  getClinicById,        // GET    /:id
  createClinic,         // POST   /
  updateClinic,         // PUT    /:id
  deleteClinic,         // DELETE /:id
  getUniqueLocations,   // GET    /locations
} from "../controllers/clinicController.js";

// Import Middleware
import { authGuard } from "../middleware/auth.js";

// Tạo Express Router instance
const router = express.Router();

// ======================================================================
// PUBLIC ROUTES - Không cần authentication
// ======================================================================

/**
 * GET /api/clinics
 * Lấy danh sách tất cả clinics với pagination, search, sort
 * 
 * Query params: page, limit, search, sortBy, sortOrder
 * Response: { clinics: [...], pagination: {...} }
 */
router.get("/", getAllClinics);

/**
 * GET /api/clinics/locations
 * Lấy danh sách locations duy nhất (extract từ tên và địa chỉ clinics)
 * 
 * QUAN TRỌNG: Route này phải đặt TRƯỚC /:id
 * Vì nếu đặt sau, Express sẽ match "locations" như là id parameter
 * 
 * Response: { locations: ["Quận 1", "Quận 2", ...] }
 */
router.get("/locations", getUniqueLocations);

/**
 * GET /api/clinics/:id
 * Lấy chi tiết một clinic theo MongoDB ObjectId
 * 
 * URL params: id (MongoDB ObjectId)
 * Response: { clinic: {...} }
 * 
 * Use case: Hiển thị trang bản đồ, trang chi tiết clinic
 */
router.get("/:id", getClinicById);

// ======================================================================
// PROTECTED ROUTES - Cần authentication với authGuard middleware
// ======================================================================

/**
 * POST /api/clinics
 * Tạo mới một clinic
 * 
 * Middleware: authGuard - Verify JWT token trong request headers
 * Request body: { name*, type, location, address, ... }
 * Response: { clinic: {...} } với status 201 Created
 */
router.post("/", authGuard, createClinic);

/**
 * PUT /api/clinics/:id
 * Cập nhật thông tin clinic
 * 
 * Middleware: authGuard - Verify JWT token
 * URL params: id (MongoDB ObjectId)
 * Request body: { name, type, location, ... } (tất cả optional)
 * Response: { clinic: {...} }
 */
router.put("/:id", authGuard, updateClinic);

/**
 * DELETE /api/clinics/:id
 * Xóa một clinic
 * 
 * Middleware: authGuard - Verify JWT token
 * URL params: id (MongoDB ObjectId)
 * Response: { message: "Clinic deleted successfully" }
 * 
 * Note: Xóa vĩnh viễn, không thể khôi phục
 */
router.delete("/:id", authGuard, deleteClinic);

// ======================================================================
// EXPORT ROUTER
// ======================================================================

/**
 * Export router để sử dụng trong main application (app.js hoặc server.js)
 * 
 * Sử dụng:
 * import clinicRoutes from "./routes/clinicRoutes.js";
 * app.use("/api/clinics", clinicRoutes);
 */
export default router;
