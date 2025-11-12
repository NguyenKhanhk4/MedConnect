import express from "express";
import { authGuard } from "../../middleware/auth.js";
import {
  // Profile
  getCurrentDoctorProfile,
  updateDoctorProfile,
  getDoctorProfile,

  // Appointments
  getDoctorAppointments,
  getDoctorAppointmentDetail,
  updateAppointmentStatus,
  createAppointmentByDoctor,

  // Dashboard
  getDoctorDashboardStats,

  // Time Slots
  getDoctorTimeSlots,
  deleteTimeSlot,
  autoGenerateTimeSlots,
  blockSingleSlot,
  blockSlotsByDateRange,
  unblockSlotsByDateRange,

  // Schedule Rules
  getDoctorScheduleRules,
  updateDoctorScheduleRules,

  // Consultation
  getConsultationRecords,
  createConsultationSummary,
  createConsultationAdvice,
  getDoctorConsultationSummaries,
  getDoctorConsultationAdvice,
  uploadConsultationFile,

  // Prescriptions
  createPrescription,

  // Clinics
  getDoctorClinics,

  // Reviews
  getDoctorReviews,
  getPublicDoctorReviews,
  respondToReview,

  // Search
  getAllDoctors,
  getSearchDoctors,
  getSearchSpecializations,
  getSearchClinics,
} from "../../controllers/doctorController.js";
import {
  createServicePayment,
  getServicePaymentStatus,
} from "../../controllers/servicePaymentController.js";
import {
  getLeaveRequests,
  createLeaveRequest,
} from "../../controllers/leaveRequestController.js";

const router = express.Router();

// ================== PUBLIC ROUTES ==================
// Get all doctors (public)
router.get("/", getAllDoctors);

// Search doctors (public)
router.get("/search", getSearchDoctors);

// Search specializations (public)
router.get("/specializations/search", getSearchSpecializations);

// Search clinics (public)
router.get("/clinics/search", getSearchClinics);

// Get doctor profile by ID (public)
router.get("/:doctorId", getDoctorProfile);

// Get doctor clinics (public)
router.get("/:doctorId/clinics", getDoctorClinics);

// IMPORTANT: /me/reviews must be defined BEFORE /:doctorId/reviews to avoid route conflicts
// Route cụ thể hơn phải được định nghĩa trước route có parameter
router.get("/me/reviews", authGuard, getDoctorReviews);

// Get public doctor reviews (public) - Must be after /me/reviews
router.get("/:doctorId/reviews", getPublicDoctorReviews);

// ================== AUTHENTICATED DOCTOR ROUTES ==================
// Apply auth middleware to all routes below
router.use(authGuard);

// ================== PROFILE ROUTES ==================
router.get("/me/profile", getCurrentDoctorProfile);
router.put("/me/profile", updateDoctorProfile);

// ================== DASHBOARD ROUTES ==================
router.get("/me/dashboard/stats", getDoctorDashboardStats);

// ================== APPOINTMENT ROUTES ==================
router.get("/me/appointments", getDoctorAppointments);
router.get("/me/appointments/:appointmentId", getDoctorAppointmentDetail);
router.put("/me/appointments/:appointmentId/status", updateAppointmentStatus);
router.post("/me/appointments/create", createAppointmentByDoctor);

// Service Payment Routes
router.post(
  "/me/appointments/:appointmentId/service-payment",
  createServicePayment
);
router.get(
  "/me/appointments/:appointmentId/service-payment",
  getServicePaymentStatus
);

// ================== TIME SLOT ROUTES ==================
router.get("/me/time-slots", getDoctorTimeSlots);
router.post("/me/time-slots/auto-generate", autoGenerateTimeSlots);
router.delete("/me/time-slots/:slotId", deleteTimeSlot);
router.post("/me/time-slots/:slotId/block", blockSingleSlot);
router.post("/me/time-slots/block", blockSlotsByDateRange);
router.post("/me/time-slots/unblock", unblockSlotsByDateRange);

// ================== SCHEDULE RULES ROUTES ==================
router.get("/me/schedule-rules", getDoctorScheduleRules);
router.put("/me/schedule-rules", updateDoctorScheduleRules);

// ================== LEAVE REQUEST ROUTES ==================
router.get("/me/leave-requests", getLeaveRequests);
router.post("/me/leave-requests", createLeaveRequest);

// ================== CONSULTATION ROUTES ==================
router.get("/me/consultation-records", getConsultationRecords);
router.get("/me/consultation-summaries", getDoctorConsultationSummaries);
router.post("/me/consultation-summaries", createConsultationSummary);
router.get("/me/consultation-advice", getDoctorConsultationAdvice);
router.post("/me/consultation-advice", createConsultationAdvice);
router.post("/me/upload-consultation-file", uploadConsultationFile);

// ================== PRESCRIPTION ROUTES ==================
router.post("/me/prescriptions", createPrescription);

// ================== REVIEW ROUTES ==================
// Note: /me/reviews GET is already defined above (line 87, with authGuard)
router.post("/me/reviews/:reviewId/respond", respondToReview);

export default router;
