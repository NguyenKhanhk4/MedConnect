import express from "express";
import { authGuard } from "../middleware/auth.js";
import {
  getAllPatients,
  getCurrentPatientProfile,
  updatePatientProfile,
  getSpecializations,
  getDoctorsBySpecialization,
  getDoctorTimeSlots,
  getDoctorPricing,
  bookAppointment,
  getPatientAppointments,
  cancelAppointment,
  getAppointmentDetails,
  getPatientConsultationSummaries,
  getPatientConsultationAdvice,
  getFamilyMemberConsultationSummaries,
  getFamilyMemberConsultationAdvice,
  getFamilyMembers,
  createFamilyMember,
  deleteFamilyMember,
  getFavoriteDoctors,
  addFavoriteDoctor,
  removeFavoriteDoctor,
  getDoctorVisitCount,
  getPatientPayments,
  calculatePaymentSummaryForSingleAppointment,
  createPaymentForSingleAppointment,
} from "../controllers/patientController.js";
import Patient from "../models/patient.model.js";
import User from "../models/user.model.js";
import Appointment from "../models/appointment.model.js";

const router = express.Router();

// Get all patients (public, no auth required for now - can add admin/manager check later)
router.get("/", getAllPatients);

// Get current patient profile
router.get("/me/profile", authGuard, getCurrentPatientProfile);

// Update patient profile
router.put("/me/profile", authGuard, updatePatientProfile);

// Get all specializations for appointment booking
router.get("/specializations", getSpecializations);

router.get(
  "/specializations/:specializationId/doctors",
  getDoctorsBySpecialization
);

// Get available time slots for a doctor
router.get("/doctors/:doctorId/time-slots", getDoctorTimeSlots);

// Get doctor pricing (public)
router.get("/doctors/:doctorId/pricing", getDoctorPricing);

// Book an appointment (OLD FLOW - backward compatibility)
router.post("/appointments", authGuard, bookAppointment);

// Calculate payment summary for single appointment (NEW FLOW - pre-payment)
router.post(
  "/appointments/calculate-payment-summary",
  authGuard,
  calculatePaymentSummaryForSingleAppointment
);

// Create payment for single appointment (NEW FLOW - pre-payment)
router.post(
  "/appointments/create-payment",
  authGuard,
  createPaymentForSingleAppointment
);

// Get patient's appointments
router.get("/me/appointments", authGuard, getPatientAppointments);

// Cancel patient appointment
router.put(
  "/me/appointments/:appointmentId/cancel",
  authGuard,
  cancelAppointment
);
// Get appointment details by ID
router.get("/me/appointments/:appointmentId", authGuard, getAppointmentDetails);

// Get patient stats
router.get("/me/stats", authGuard, async (req, res) => {
  try {
    const claims = req.user || {};
    const appUserId = claims.app_user_id;

    if (!appUserId) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED" },
        message: "User ID not found in token",
      });
    }

    // Find patient by user ID, create if not exists
    let patient = await Patient.findOne({ userId: appUserId });
    if (!patient) {
      // Create a basic patient profile if it doesn't exist
      console.log("Creating new patient profile for user:", appUserId);
      const user = await User.findById(appUserId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: { code: "USER_NOT_FOUND" },
          message: "User not found",
        });
      }

      const newPatient = new Patient({
        userId: appUserId,
        fullName: user.fullName || "Chưa cập nhật",
        phone: user.phone || "",
        isComplete: false,
      });

      await newPatient.save();
      patient = newPatient;
      console.log("Created patient profile:", patient._id);
    }

    // Get appointment counts by status
    const totalAppointments = await Appointment.countDocuments({
      patientId: patient._id,
    });
    const pendingAppointments = await Appointment.countDocuments({
      patientId: patient._id,
      status: "pending_doctor",
    });
    const completedAppointments = await Appointment.countDocuments({
      patientId: patient._id,
      status: "done",
    });
    const cancelledAppointments = await Appointment.countDocuments({
      patientId: patient._id,
      status: "cancelled",
    });

    res.json({
      success: true,
      data: {
        totalAppointments,
        pendingAppointments,
        completedAppointments,
        cancelledAppointments,
      },
    });
  } catch (error) {
    console.error("Error fetching patient stats:", error);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR" },
      message: "Internal server error",
    });
  }
});
// Get patient's consultation summaries (medical history)
router.get(
  "/me/consultation-summaries",
  authGuard,
  getPatientConsultationSummaries
);

// Get patient's consultation advice (consultation history)
router.get("/me/consultation-advice", authGuard, getPatientConsultationAdvice);

// Get family member's consultation summaries (medical history)
router.get(
  "/:patientId/consultation-summaries",
  authGuard,
  getFamilyMemberConsultationSummaries
);

// Get family member's consultation advice (consultation history)
router.get(
  "/:patientId/consultation-advice",
  authGuard,
  getFamilyMemberConsultationAdvice
);

// Get all family members
router.get("/me/family-members", authGuard, getFamilyMembers);

// Create a new family member
router.post("/me/family-members", authGuard, createFamilyMember);

// Delete a family member
router.delete("/me/family-members/:patientId", authGuard, deleteFamilyMember);

// Get favorite doctors
router.get("/me/favorite-doctors", authGuard, getFavoriteDoctors);

// Add doctor to favorites
router.post("/me/favorite-doctors", authGuard, addFavoriteDoctor);

// Remove doctor from favorites
router.delete(
  "/me/favorite-doctors/:doctorId",
  authGuard,
  removeFavoriteDoctor
);

// Get visit count for a specific doctor
router.get("/me/doctors/:doctorId/visit-count", authGuard, getDoctorVisitCount);

// Get patient payments (invoices)
router.get("/me/payments", authGuard, getPatientPayments);

export default router;
