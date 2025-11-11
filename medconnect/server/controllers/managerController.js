import mongoose from "mongoose";
import Doctor from "../models/doctor.model.js";
import DoctorTimeSlot from "../models/doctorTimeSlot.model.js";
import Appointment from "../models/appointment.model.js";
import Patient from "../models/patient.model.js";
import User from "../models/user.model.js";
import DoctorScheduleRule from "../models/doctor_schedule_rules.model.js";
import Clinic from "../models/clinic.model.js";
import EducationLevelPrice from "../models/educationLevelPrice.model.js";
import Payment from "../models/payment.model.js";
import {
  createAppointmentNotification,
  createBookingNotification,
} from "../services/notificationService.js";
import { ok, fail } from "../utils/response.js";
import { ERROR_CODES } from "../constants/index.js";
import { sendMail } from "../utils/email.js";

/**
 * Check if doctor has all required information to be active
 * Required fields: yearsExperience > 0, bio (non-empty), and educationLevel
 */
async function checkDoctorCanBeActive(doctorId) {
  try {
    const doctor = await Doctor.findById(doctorId).lean();
    if (!doctor) {
      return { canBeActive: false, reason: "Doctor not found" };
    }

    // Check yearsExperience
    if (!doctor.yearsExperience || doctor.yearsExperience <= 0) {
      return {
        canBeActive: false,
        reason: "Số năm kinh nghiệm chưa được điền hoặc bằng 0",
      };
    }

    // Check bio
    if (!doctor.bio || doctor.bio.trim().length === 0) {
      return {
        canBeActive: false,
        reason: "Lời giới thiệu chưa được điền",
      };
    }

    // Check educationLevel
    if (!doctor.educationLevel || !doctor.educationLevel.trim()) {
      return {
        canBeActive: false,
        reason: "Trình độ học vấn chưa được chọn",
      };
    }

    return { canBeActive: true };
  } catch (error) {
    console.error("Error checking doctor can be active:", error);
    return {
      canBeActive: false,
      reason: "Lỗi khi kiểm tra thông tin bác sĩ",
    };
  }
}

/**
 * Get all doctors for manager to select
 * Manager should see all verified doctors to manage their schedules
 * Supports filtering by name and specializationId
 */
export async function getAllDoctorsForManager(req, res) {
  try {
    const { name, specializationId } = req.query;

    // Log query for debugging
    console.log("[Manager] Fetching verified doctors...", {
      name,
      specializationId,
    });

    // Build query filter - only verified and active doctors
    const filter = {
      isVerified: true,
      $or: [
        { isActive: true },
        { isActive: { $exists: false } }, // Old doctors without isActive field (default is true)
      ],
    };

    // Filter by name (case-insensitive search)
    if (name && name.trim()) {
      // Escape special regex characters to prevent regex injection
      const escapedName = name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.fullName = { $regex: escapedName, $options: "i" };
    }

    // Filter by specializationId (specializationIds is an array, use $in)
    if (specializationId) {
      filter.specializationIds = { $in: [specializationId] };
    }

    const doctors = await Doctor.find(filter)
      .populate("userId", "fullName email phone")
      .populate("specializationIds", "name")
      .populate("clinicDefaultId", "name address phone")
      .select(
        "fullName avatarUrl specializationIds ratingAvg ratingCount isVerified clinicDefaultId educationLevel"
      )
      .sort({ fullName: 1 })
      .lean();

    console.log(`[Manager] Found ${doctors.length} verified doctors`);
    if (doctors.length > 0) {
      console.log(
        `[Manager] Sample doctors:`,
        doctors.slice(0, 3).map((d) => ({
          _id: d._id,
          fullName: d.fullName,
          isActive: d.isActive,
          isVerified: d.isVerified,
        }))
      );
    }

    return ok(res, { doctors });
  } catch (error) {
    console.error("Error fetching doctors for manager:", error);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, "Internal server error");
  }
}

/**
 * Get time slots for a specific doctor (manager can view any doctor's schedule)
 */
export async function getDoctorTimeSlotsForManager(req, res) {
  try {
    const { doctorId } = req.params;
    const { page = 1, limit = 1000, startDate, endDate } = req.query;

    console.log("🔍 [Manager] getDoctorTimeSlotsForManager called with:", {
      doctorId,
      startDate,
      endDate,
      limit,
    });

    if (!doctorId) {
      return fail(res, 400, ERROR_CODES.INVALID_INPUT, "Doctor ID is required");
    }

    // Verify doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      console.log("❌ Doctor not found:", doctorId);
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Doctor not found");
    }

    console.log("✅ Doctor found:", { id: doctor._id, name: doctor.fullName });

    const filter = { doctorId };

    // Apply date range filter
    if (startDate && endDate) {
      try {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return fail(
            res,
            400,
            ERROR_CODES.INVALID_INPUT,
            "Invalid date format"
          );
        }
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        filter.startAt = { $gte: start, $lte: end };
      } catch (dateError) {
        return fail(res, 400, ERROR_CODES.INVALID_INPUT, "Invalid date format");
      }
    }

    console.log("🔍 Querying time slots with filter:", filter);

    const timeSlots = await DoctorTimeSlot.find(filter)
      .sort({ startAt: 1 })
      .limit(parseInt(limit))
      .lean();

    console.log(
      `✅ Found ${timeSlots.length} time slots for doctor ${doctor.fullName}`
    );

    // Get slot IDs to fetch appointments
    const slotIds = timeSlots.map((slot) => slot._id);

    // Fetch appointments for these slots
    // Exclude ALL rescheduled appointments (they are replaced by new appointments)
    // A rescheduled appointment means the old appointment is no longer active
    // IMPORTANT: Show appointments that are paid OR appointments that were rescheduled by manager
    // Manager rescheduled appointments inherit paymentStatus from original appointment
    // Legacy appointments without paymentStatus are also included if they have active status
    // CRITICAL: Exclude appointments with status "rescheduled" or "cancelled" - these should not appear in the schedule
    const appointments = await Appointment.find({
      slotId: { $in: slotIds },
      // Filter out ALL appointments with status "rescheduled" or "cancelled" - they should not appear in the schedule
      // "rescheduled" = old appointments that have been moved to a new slot/doctor
      // "cancelled" = appointments that have been cancelled
      status: { $nin: ["rescheduled", "cancelled", "rejected", "no_show"] },
      // Also exclude appointments that have rescheduledToId (old appointments that were moved)
      rescheduledToId: { $exists: false },
      // Show appointments that are paid OR appointments rescheduled by manager (which inherit payment status)
      $or: [
        { paymentStatus: "paid" },
        // Include appointments rescheduled by manager (they inherit payment from original)
        // These are NEW appointments created after reschedule
        { rescheduledFromId: { $exists: true, $ne: null } },
        // Include legacy appointments without paymentStatus but with active status
        {
          paymentStatus: { $exists: false },
          status: {
            $in: ["pending_doctor", "accepted", "confirmed", "in_progress"],
          },
        },
      ],
    })
      .populate({
        path: "patientId",
        select: "fullName phone",
        model: "Patient",
      })
      .lean();

    console.log(`✅ Found ${appointments.length} appointments for these slots`);

    // Create a map of slotId -> appointment
    const appointmentMap = {};
    appointments.forEach((appointment) => {
      const slotIdKey = appointment.slotId.toString();

      let patientName = null;
      if (appointment.patientId) {
        if (
          typeof appointment.patientId === "object" &&
          appointment.patientId.fullName
        ) {
          patientName = appointment.patientId.fullName;
        }
      }

      appointmentMap[slotIdKey] = {
        appointmentId: appointment._id.toString(),
        patientName: patientName,
        reason: appointment.reason || null,
        appointmentStatus: appointment.status || "booked",
        mode: appointment.mode || "offline",
        rescheduledFromId: appointment.rescheduledFromId
          ? appointment.rescheduledFromId.toString()
          : null, // Include rescheduledFromId to identify rescheduled appointments
        rescheduleType: appointment.rescheduleType || null, // "doctor_busy", "patient_request", "manager_initiated"
        rescheduleRequestedBy: appointment.rescheduleRequestedBy || null, // "doctor", "patient", "manager"
      };
    });

    // Fetch leave requests for these slots
    const LeaveRequest = (await import("../models/leaveRequest.model.js"))
      .default;
    const leaveRequests = await LeaveRequest.find({
      slotId: { $in: slotIds },
      status: "pending",
    }).lean();

    // Create a map of slotId -> leave request
    const leaveRequestMap = {};
    leaveRequests.forEach((leaveRequest) => {
      const slotIdKey = leaveRequest.slotId.toString();
      leaveRequestMap[slotIdKey] = leaveRequest;
    });

    // Format slots similar to doctor's own view with proper status mapping
    const formattedSlots = timeSlots.map((slot) => {
      const slotIdStr = slot._id.toString();
      const appointment = appointmentMap[slotIdStr];
      const pendingLeaveRequest = leaveRequestMap[slotIdStr];

      // Map appointment status to display status (same logic as Doctor)
      let displayStatus = slot.status;
      if (appointment) {
        const statusMap = {
          pending_doctor: "pending",
          accepted: "confirmed",
          in_progress: "in_progress",
          cancelled: "cancelled",
          done: "completed",
          rejected: "cancelled",
          no_show: "cancelled",
        };
        displayStatus = statusMap[appointment.appointmentStatus] || slot.status;
      } else {
        // No appointment found for this slot
        // If slot status is "booked" but no appointment exists (e.g., rescheduled appointment was removed),
        // treat it as "available" so it appears empty
        if (slot.status === "booked") {
          displayStatus = "available";
        }
      }

      return {
        _id: slot._id.toString(),
        doctorId: slot.doctorId.toString(),
        startAt: slot.startAt,
        endAt: slot.endAt,
        status: displayStatus, // Use mapped status
        patientName: appointment?.patientName || null,
        appointmentId: appointment?.appointmentId || null,
        appointmentStatus: appointment?.appointmentStatus || null,
        reason: appointment?.reason || null,
        mode: appointment?.mode || null,
        rescheduledFromId: appointment?.rescheduledFromId || null, // Flag to identify rescheduled appointments
        rescheduleType: appointment?.rescheduleType || null, // "doctor_busy", "patient_request", "manager_initiated"
        rescheduleRequestedBy: appointment?.rescheduleRequestedBy || null, // "doctor", "patient", "manager"
        leaveReason: slot.leaveReason || null, // Lý do nghỉ
        hasPendingLeaveRequest: !!pendingLeaveRequest, // Flag để biết có leave request đang pending
        leaveRequestId: pendingLeaveRequest?._id?.toString() || null,
      };
    });

    return ok(res, {
      slots: formattedSlots,
      doctor: {
        _id: doctor._id,
        fullName: doctor.fullName,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching doctor time slots for manager:", error);
    console.error("❌ Error stack:", error.stack);
    console.error("❌ Error message:", error.message);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, "Internal server error");
  }
}

/**
 * Get appointment detail by appointment ID (manager can view any doctor's appointments)
 */
export async function getAppointmentDetailForManager(req, res) {
  try {
    const { appointmentId } = req.params;

    if (!appointmentId) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Appointment ID is required"
      );
    }

    const appointment = await Appointment.findById(appointmentId)
      .populate({
        path: "patientId",
        select:
          "fullName dob gender phone relationshipToOwner representativeName representativeRelation representativePhone representativeCitizenId userId",
        populate: {
          path: "userId",
          select: "fullName email phone",
        },
      })
      .populate({
        path: "doctorId",
        select: "fullName specializationIds phone avatarUrl",
        populate: {
          path: "specializationIds",
          select: "name",
        },
      })
      .populate("clinicId", "name address")
      .populate("slotId", "startAt endAt")
      .populate({
        path: "rescheduledFromId",
        select:
          "scheduledStart scheduledEnd status rescheduleReason rescheduledAt",
        populate: {
          path: "slotId",
          select: "startAt endAt",
        },
      })
      .lean();

    if (!appointment) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Appointment not found");
    }

    // Ensure patientId is properly populated
    let patientId = appointment.patientId;
    if (
      !patientId ||
      (typeof patientId === "object" &&
        !patientId.fullName &&
        !patientId.userId?.fullName)
    ) {
      console.warn(
        `⚠️ Appointment ${appointment._id} has invalid patientId:`,
        patientId
      );
      patientId = {
        _id: appointment.patientId?._id || appointment.patientId || null,
        fullName:
          appointment.patientId?.fullName ||
          appointment.patientId?.userId?.fullName ||
          "Không có thông tin",
        dob: appointment.patientId?.dob || null,
        gender: appointment.patientId?.gender || null,
        phone:
          appointment.patientId?.phone ||
          appointment.patientId?.userId?.phone ||
          null,
        relationshipToOwner: appointment.patientId?.relationshipToOwner || null,
        representativeName: appointment.patientId?.representativeName || null,
        representativeRelation:
          appointment.patientId?.representativeRelation || null,
        representativePhone: appointment.patientId?.representativePhone || null,
        representativeCitizenId:
          appointment.patientId?.representativeCitizenId || null,
        userId: appointment.patientId?.userId || null,
      };
    } else if (patientId && typeof patientId === "object") {
      // Ensure fullName is available from userId if not in patient directly
      if (!patientId.fullName && patientId.userId?.fullName) {
        patientId.fullName = patientId.userId.fullName;
      }
      // Ensure phone is available from userId if not in patient directly
      if (!patientId.phone && patientId.userId?.phone) {
        patientId.phone = patientId.userId.phone;
      }
    }

    // Ensure new fields have default values for backward compatibility
    const appointmentWithDefaults = {
      ...appointment,
      patientId, // Use properly populated patientId
      reason: appointment.reason || null, // Ensure reason is included
      services: appointment.services || [],
      totalPay:
        appointment.totalPay !== undefined && appointment.totalPay !== null
          ? appointment.totalPay
          : 0,
      amountPaid:
        appointment.amountPaid !== undefined && appointment.amountPaid !== null
          ? appointment.amountPaid
          : 0,
      paymentStatus: appointment.paymentStatus || "unpaid",
      rescheduleType: appointment.rescheduleType || null, // "doctor_busy", "patient_request", "manager_initiated"
      rescheduleRequestedBy: appointment.rescheduleRequestedBy || null, // "doctor", "patient", "manager"
    };

    return ok(res, appointmentWithDefaults);
  } catch (error) {
    console.error("❌ getAppointmentDetailForManager error:", error);
    return fail(
      res,
      500,
      ERROR_CODES.SERVER_ERROR,
      error.message || String(error)
    );
  }
}

/**
 * Get all patients for manager to select when booking appointments
 */
export async function getAllPatientsForManager(req, res) {
  try {
    const { search, page = 1, limit = 50 } = req.query;

    // Build query
    let query = {};
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get patients with populated user info, filter only users with role='patient'
    const patients = await Patient.find(query)
      .populate({
        path: "userId",
        select: "email status role createdAt",
        match: { role: "patient" },
      })
      .select("fullName phone email dob gender avatarUrl createdAt updatedAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Filter out patients where userId is null (due to role filter)
    const validPatients = patients.filter(
      (p) => p.userId && p.userId.role === "patient"
    );

    // Get total count - need to count only patients with role='patient'
    const patientUserIds = await User.find({ role: "patient" })
      .select("_id")
      .lean();
    const patientIds = patientUserIds.map((u) => u._id);
    const countQuery = { ...query, userId: { $in: patientIds } };
    const total = await Patient.countDocuments(countQuery);

    // Format response
    const formattedPatients = validPatients.map((patient) => ({
      _id: patient._id,
      id: patient._id,
      userId: patient.userId?._id,
      fullName: patient.fullName,
      phone: patient.phone,
      email: patient.email || patient.userId?.email,
      dob: patient.dob,
      gender: patient.gender,
      avatarUrl: patient.avatarUrl,
      status: patient.userId?.status || "active",
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt,
    }));

    return ok(res, {
      patients: formattedPatients,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching patients for manager:", error);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, "Internal server error");
  }
}

/**
 * Create appointment by manager (for any doctor)
 */
export async function createAppointmentByManager(req, res) {
  try {
    const {
      doctorId,
      slotId,
      patientId, // New: patient ID if selecting from existing patients
      patientName, // For new patient
      patientPhone, // For new patient
      dob, // Date of birth for new patient
      gender, // Gender for new patient
      citizenId, // Citizen ID for new patient
      address, // Address for new patient
      allergyNotes, // Allergy notes for new patient
      reason,
      mode,
      clinicId, // Clinic ID for offline mode
      scheduledStart,
      scheduledEnd,
    } = req.body;

    if (!doctorId || !reason || !mode || !scheduledStart || !scheduledEnd) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Missing required fields"
      );
    }

    // Verify doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Doctor not found");
    }

    // Find patient - prioritize patientId, fallback to patientName/patientPhone
    let patient = null;

    if (patientId) {
      // Use existing patient by ID
      patient = await Patient.findById(patientId);
      if (!patient) {
        return fail(res, 404, ERROR_CODES.NOT_FOUND, "Patient not found");
      }
    } else if (patientPhone && patientName) {
      // Create new patient with full information
      console.log("🔍 [Manager] Creating new patient with data:", {
        patientName,
        patientPhone,
        dob,
        gender,
        citizenId,
        address,
        hasAllergyNotes: !!allergyNotes,
      });

      // Validate required fields for new patient
      if (!dob || !gender || !citizenId || !address) {
        console.error("❌ [Manager] Missing required patient information:", {
          hasDob: !!dob,
          hasGender: !!gender,
          hasCitizenId: !!citizenId,
          hasAddress: !!address,
        });
        return fail(
          res,
          400,
          ERROR_CODES.INVALID_INPUT,
          "Missing required patient information: dob, gender, citizenId, address are required for new patients"
        );
      }

      // Find existing User by phone, or create minimal User if not found
      let user = await User.findOne({ phone: patientPhone });
      let userId;

      if (!user) {
        // Create minimal User for the patient (required by Patient model)
        console.log(
          "🔍 [Manager] User not found, creating minimal User for patient"
        );
        try {
          // Generate a unique email
          const baseEmail = `${patientPhone}@patient.medconnect.local`;
          let finalEmail = baseEmail;
          let emailExists = await User.findOne({ email: finalEmail });
          let counter = 1;
          while (emailExists) {
            finalEmail = `${patientPhone}_${Date.now()}_${counter}@patient.medconnect.local`;
            emailExists = await User.findOne({ email: finalEmail });
            counter++;
          }

          // Create minimal User (no password required for phone auth)
          user = new User({
            phone: patientPhone,
            email: finalEmail,
            fullName: patientName,
            role: "patient",
            status: "active",
            authProvider: "phone", // Set to "phone" so passwordHash is not required
          });
          await user.save();
          userId = user._id;
          console.log("✅ [Manager] Created minimal User:", userId);
        } catch (userError) {
          // Handle duplicate key error (race condition)
          if (userError.code === 11000) {
            console.log(
              "⚠️ [Manager] Duplicate key error, finding existing user"
            );
            user = await User.findOne({ phone: patientPhone });
            if (user) {
              userId = user._id;
              console.log(
                "✅ [Manager] Found existing User after error:",
                userId
              );
            } else {
              console.error("❌ [Manager] Error creating User:", userError);
              throw userError;
            }
          } else {
            console.error("❌ [Manager] Error creating User:", userError);
            throw userError;
          }
        }
      } else {
        userId = user._id;
        console.log("✅ [Manager] Found existing User:", userId);
      }

      // Validate DOB format
      let dobDate;
      try {
        dobDate = new Date(dob);
        if (isNaN(dobDate.getTime())) {
          console.error("❌ [Manager] Invalid DOB format:", dob);
          return fail(
            res,
            400,
            ERROR_CODES.INVALID_INPUT,
            "Invalid date of birth format"
          );
        }
      } catch (error) {
        console.error("❌ [Manager] Error parsing DOB:", error, dob);
        return fail(
          res,
          400,
          ERROR_CODES.INVALID_INPUT,
          "Invalid date of birth format"
        );
      }

      // Always create new patient (even if one exists with same phone)
      console.log("🔍 [Manager] Creating new Patient");
      patient = new Patient({
        userId,
        fullName: patientName,
        phone: patientPhone,
        dob: dobDate,
        gender: gender,
        citizenId: citizenId,
        address: address,
        allergyNotes: allergyNotes || "",
        isProfileComplete: true, // Mark as complete since we have all required fields
      });
      await patient.save();
      console.log("✅ [Manager] Created new Patient:", patient._id);
    } else {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Either patientId or patientName+patientPhone with full information must be provided"
      );
    }

    // Create appointment (similar to doctor's createAppointmentByDoctor)
    console.log("🔍 [Manager] Creating appointment with data:", {
      patientId: patient._id,
      doctorId: doctor._id,
      slotId: slotId || null,
      mode,
      scheduledStart,
      scheduledEnd,
      reason,
      clinicId: mode === "offline" ? clinicId : null,
    });

    // Validate scheduled dates
    let scheduledStartDate, scheduledEndDate;
    try {
      if (!scheduledStart || !scheduledEnd) {
        console.error("❌ [Manager] Missing scheduled dates:", {
          scheduledStart,
          scheduledEnd,
        });
        return fail(
          res,
          400,
          ERROR_CODES.INVALID_INPUT,
          "Missing scheduledStart or scheduledEnd"
        );
      }

      scheduledStartDate = new Date(scheduledStart);
      scheduledEndDate = new Date(scheduledEnd);

      if (
        isNaN(scheduledStartDate.getTime()) ||
        isNaN(scheduledEndDate.getTime())
      ) {
        console.error("❌ [Manager] Invalid scheduled dates:", {
          scheduledStart,
          scheduledEnd,
          parsedStart: scheduledStartDate,
          parsedEnd: scheduledEndDate,
        });
        return fail(
          res,
          400,
          ERROR_CODES.INVALID_INPUT,
          "Invalid scheduled start or end date"
        );
      }
    } catch (error) {
      console.error("❌ [Manager] Error parsing scheduled dates:", error);
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Invalid scheduled start or end date format"
      );
    }

    // Ensure dates are properly set and in future
    console.log("🔍 [Manager] Validating scheduled dates:", {
      scheduledStartDate: scheduledStartDate.toISOString(),
      scheduledEndDate: scheduledEndDate.toISOString(),
      now: new Date().toISOString(),
      isFuture: scheduledStartDate > new Date(),
    });

    if (scheduledStartDate <= new Date()) {
      console.error("❌ [Manager] scheduledStart is not in the future:", {
        scheduledStart: scheduledStartDate.toISOString(),
        now: new Date().toISOString(),
      });
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Scheduled start time must be in the future"
      );
    }

    const appointmentData = {
      patientId: patient._id,
      doctorId: doctor._id,
      slotId: slotId || null,
      mode,
      scheduledStart: scheduledStartDate,
      scheduledEnd: scheduledEndDate,
      reason,
      status: "pending_doctor",
    };

    // Add clinicId if mode is offline
    if (mode === "offline") {
      if (!clinicId) {
        console.error(
          "❌ [Manager] Clinic ID is required for offline appointments"
        );
        return fail(
          res,
          400,
          ERROR_CODES.INVALID_INPUT,
          "Clinic ID is required for offline appointments"
        );
      }
      // Verify clinic exists
      const clinic = await Clinic.findById(clinicId);
      if (!clinic) {
        console.error("❌ [Manager] Clinic not found:", clinicId);
        return fail(res, 404, ERROR_CODES.NOT_FOUND, "Clinic not found");
      }
      appointmentData.clinicId = clinicId;
      console.log("✅ [Manager] Added clinicId to appointment:", clinicId);
    }

    // Double check that scheduledStartDate is set correctly
    if (!appointmentData.scheduledStart || !appointmentData.scheduledEnd) {
      console.error(
        "❌ [Manager] scheduledStart or scheduledEnd is missing in appointmentData:",
        appointmentData
      );
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "scheduledStart and scheduledEnd must be set"
      );
    }

    console.log("🔍 [Manager] Final appointmentData before save:", {
      ...appointmentData,
      scheduledStart: appointmentData.scheduledStart?.toISOString(),
      scheduledEnd: appointmentData.scheduledEnd?.toISOString(),
      scheduledStartType: typeof appointmentData.scheduledStart,
      scheduledEndType: typeof appointmentData.scheduledEnd,
    });

    console.log("🔍 [Manager] Saving appointment...");
    const appointment = await Appointment.create(appointmentData);
    console.log("✅ [Manager] Created appointment:", appointment._id);

    // Update slot status if slotId provided
    if (slotId) {
      await DoctorTimeSlot.findByIdAndUpdate(slotId, {
        status: "booked",
        appointmentId: appointment._id,
      });
    }

    // Send notification to doctor about new appointment created by manager
    try {
      await createBookingNotification(appointment._id, {
        createdByManager: true,
      });
      console.log(
        `✅ [Manager] Sent booking notification to doctor for appointment ${appointment._id}`
      );
    } catch (notificationError) {
      // Log error but don't fail the request if notification fails
      console.error(
        "⚠️ [Manager] Error sending notification to doctor:",
        notificationError
      );
    }

    return ok(res, { appointment });
  } catch (error) {
    console.error("❌ [Manager] Error creating appointment by manager:", error);
    console.error("❌ [Manager] Error stack:", error.stack);
    console.error(
      "❌ [Manager] Request body:",
      JSON.stringify(req.body, null, 2)
    );

    // Return more detailed error message
    const errorMessage = error.message || "Internal server error";
    return fail(
      res,
      500,
      ERROR_CODES.SERVER_ERROR,
      `Error creating appointment: ${errorMessage}`
    );
  }
}

/**
 * Generate time slots for a specific doctor (manager can generate for any doctor)
 */
export async function generateSlotsForManager(req, res) {
  try {
    const { doctorId } = req.params;

    if (!doctorId) {
      return fail(res, 400, ERROR_CODES.INVALID_INPUT, "Doctor ID is required");
    }

    console.log("🔍 generateSlotsForManager - doctorId:", doctorId);

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Doctor not found");
    }

    console.log("🔍 generateSlotsForManager - Found doctor:", {
      id: doctor._id,
      fullName: doctor.fullName,
    });

    // First, create default schedule rules for missing weekdays
    const existingRules = await DoctorScheduleRule.find({
      doctorId: doctor._id,
      isActive: true,
    });

    // Get existing weekdays
    const existingWeekdays = new Set(existingRules.map((rule) => rule.weekday));

    console.log(
      `Existing weekdays for doctor ${doctor._id}:`,
      Array.from(existingWeekdays)
    );

    // Create default schedule rules for missing weekdays (Monday to Sunday)
    const defaultRules = [];

    // Check all weekdays: 0 (Sunday), 1 (Monday), 2 (Tuesday), 3 (Wednesday), 4 (Thursday), 5 (Friday), 6 (Saturday)
    const allWeekdays = [0, 1, 2, 3, 4, 5, 6];

    for (const weekday of allWeekdays) {
      // Skip if rule already exists for this weekday
      if (existingWeekdays.has(weekday)) {
        console.log(`Rule for weekday ${weekday} already exists, skipping...`);
        continue;
      }

      // Create rule for this weekday
      const rule = {
        doctorId: doctor._id,
        weekday: weekday,
        blocks: [
          {
            startTime: "07:00",
            endTime: "11:40",
          },
          {
            startTime: "13:00",
            endTime: "17:00",
          },
        ],
        slotBlockMinutes: 20,
        consultMinutes: 20,
        effectiveFrom: new Date(),
        isActive: true,
      };
      defaultRules.push(rule);
    }

    if (defaultRules.length > 0) {
      await DoctorScheduleRule.insertMany(defaultRules);
      console.log(
        `Created ${defaultRules.length} default schedule rules for doctor ${
          doctor._id
        } (missing weekdays: ${defaultRules.map((r) => r.weekday).join(", ")})`
      );
    } else {
      console.log(
        `All schedule rules already exist for doctor ${doctor._id} (all 7 days)`
      );
    }

    // Get active schedule rules for this doctor
    const scheduleRules = await DoctorScheduleRule.find({
      doctorId: doctor._id,
      isActive: true,
    }).lean();

    if (scheduleRules.length === 0) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "No schedule rules found. Please set up schedule rules first."
      );
    }

    console.log(
      `📋 Found ${scheduleRules.length} schedule rules for doctor ${doctor.fullName}`
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate end of current month (không tạo sang tháng mới)
    const endDate = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    console.log("🔍 Creating slots from:", today.toISOString().split("T")[0]);
    console.log(
      "🔍 Creating slots until end of current month:",
      endDate.toISOString().split("T")[0]
    );

    // Check how many future slots already exist in the current month
    const existingFutureSlots = await DoctorTimeSlot.countDocuments({
      doctorId: doctor._id,
      startAt: {
        $gte: today,
        $lte: endDate,
      },
    });

    console.log(
      `📊 Existing future slots in current month: ${existingFutureSlots}`
    );

    // Check if we already have slots for remaining days in the current month
    // Estimate: if we have more than 80% of needed slots (assuming average 30 slots per day)
    // Calculate days remaining from today to end of month
    const daysRemaining = Math.ceil(
      (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    const estimatedSlotsNeeded = daysRemaining * 30; // Rough estimate: 30 slots per day

    if (existingFutureSlots >= estimatedSlotsNeeded * 0.8) {
      console.log(
        `⏭️ Skipping slot generation - already have ${existingFutureSlots} slots in current month (>= ${Math.floor(
          estimatedSlotsNeeded * 0.8
        )})`
      );
      return ok(res, {
        message: `No new slots created. Doctor already has enough slots for the remaining days of current month.`,
        createdSlots: 0,
        skippedSlots: 0,
        existingSlots: existingFutureSlots,
        note: "Slots are only auto-generated when remaining days of current month have insufficient slots.",
      });
    }

    const createdSlots = [];
    const skippedSlots = [];

    // Calculate number of days from today to end of current month
    const daysFromTodayToEndOfMonth = Math.ceil(
      (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    for (
      let dayOffset = 0;
      dayOffset < daysFromTodayToEndOfMonth;
      dayOffset++
    ) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + dayOffset);
      const weekday = currentDate.getDay(); // 0 = Sunday, 6 = Saturday

      // Find schedule rule for this weekday
      const dayRule = scheduleRules.find((rule) => rule.weekday === weekday);
      if (!dayRule) {
        console.log(
          `⚠️ No schedule rule for weekday ${weekday} (${currentDate.toDateString()})`
        );
        continue;
      }

      console.log(
        `📅 Processing ${currentDate.toDateString()} (weekday ${weekday}) with ${
          dayRule.blocks.length
        } blocks`
      );
      let daySlotCount = 0;

      // Generate slots based on schedule rules
      const generatedSlots = DoctorScheduleRule.generateSlotsForDate({
        date: currentDate,
        blocks: dayRule.blocks,
        slotBlockMinutes: dayRule.slotBlockMinutes,
      });

      console.log(
        `🔍 Generated ${
          generatedSlots.length
        } slots for ${currentDate.toDateString()}`
      );

      for (const slotData of generatedSlots) {
        try {
          console.log(
            `🔍 Checking slot: ${slotData.startAt.toTimeString()} - ${slotData.endAt.toTimeString()}`
          );

          const existingSlot = await DoctorTimeSlot.findOne({
            doctorId: doctor._id,
            startAt: slotData.startAt,
            endAt: slotData.endAt,
          });

          if (!existingSlot) {
            console.log(
              `✅ Creating new slot: ${slotData.startAt.toTimeString()} - ${slotData.endAt.toTimeString()}`
            );
            const newSlot = await DoctorTimeSlot.create({
              doctorId: doctor._id,
              startAt: slotData.startAt,
              endAt: slotData.endAt,
              status: "available",
            });
            createdSlots.push(newSlot);
            daySlotCount++;
            console.log(`✅ Slot created successfully: ${newSlot._id}`);
          } else {
            console.log(
              `⚠️ Slot already exists: ${slotData.startAt.toTimeString()} - ${slotData.endAt.toTimeString()}`
            );
            skippedSlots.push({
              startAt: slotData.startAt,
              endAt: slotData.endAt,
              reason: "Already exists",
            });
          }
        } catch (error) {
          console.error(
            `❌ Error creating slot ${slotData.startAt.toTimeString()} - ${slotData.endAt.toTimeString()}:`,
            error
          );
          skippedSlots.push({
            startAt: slotData.startAt,
            endAt: slotData.endAt,
            reason: error.message,
          });
        }
      }

      console.log(
        `📊 Day ${dayOffset + 1} completed: ${daySlotCount} slots created`
      );
    }

    console.log(
      `✅ Created ${createdSlots.length} new time slots for doctor ${doctor.fullName} based on schedule rules`
    );
    console.log(
      `⚠️ Skipped ${skippedSlots.length} slots (already exist or error)`
    );
    console.log(`📊 Actual created: ${createdSlots.length} slots`);

    // Count total future slots after creation
    const totalFutureSlots = await DoctorTimeSlot.countDocuments({
      doctorId: doctor._id,
      startAt: { $gte: today },
    });

    return ok(res, {
      message: `Generated ${createdSlots.length} new time slots for doctor ${doctor.fullName} for remaining days of current month`,
      createdSlots: createdSlots.length,
      skippedSlots: skippedSlots.length,
      totalFutureSlots: totalFutureSlots, // Total future slots after creation
      dateRange: {
        startDate: today.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      },
      scheduleRules: scheduleRules.length,
      details: {
        created: createdSlots.slice(0, 5),
        skipped: skippedSlots.slice(0, 5),
      },
    });
  } catch (error) {
    console.error("❌ generateSlotsForManager error:", error);
    return fail(
      res,
      500,
      ERROR_CODES.SERVER_ERROR,
      error.message || String(error)
    );
  }
}

/**
 * Delete a time slot for a specific doctor (manager can delete for any doctor)
 */
export async function deleteTimeSlotForManager(req, res) {
  try {
    const { doctorId, slotId } = req.params;

    if (!doctorId || !slotId) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Doctor ID and Slot ID are required"
      );
    }

    // Verify doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Doctor not found");
    }

    console.log(
      "🔍 deleteTimeSlotForManager - doctor:",
      doctor._id,
      "slot:",
      slotId
    );

    // Find the slot and verify it belongs to the specified doctor
    const slot = await DoctorTimeSlot.findOne({
      _id: slotId,
      doctorId: doctor._id,
    });

    if (!slot) {
      return fail(
        res,
        404,
        ERROR_CODES.NOT_FOUND,
        "Time slot not found or does not belong to this doctor"
      );
    }

    // Check if slot has active appointment
    const appointment = await Appointment.findOne({
      slotId: slot._id,
      status: {
        $nin: ["cancelled", "rejected", "no_show", "rescheduled"],
      },
    });

    if (appointment) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "Cannot delete slot with active appointment"
      );
    }

    // Delete the slot
    await DoctorTimeSlot.findByIdAndDelete(slotId);
    console.log(
      `✅ Manager deleted time slot ${slotId} for doctor ${doctor.fullName}`
    );

    return ok(res, {
      message: "Time slot deleted successfully",
      deletedSlotId: slotId,
    });
  } catch (error) {
    console.error("❌ deleteTimeSlotForManager error:", error);
    return fail(
      res,
      500,
      ERROR_CODES.SERVER_ERROR,
      error.message || String(error)
    );
  }
}

/**
 * Block a single slot by slotId for a specific doctor (manager can block for any doctor)
 */
export async function blockSingleSlotForManager(req, res) {
  try {
    const { doctorId, slotId } = req.params;
    const { reason } = req.body || {};

    if (!doctorId || !slotId) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Doctor ID and Slot ID are required"
      );
    }

    // Verify doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Doctor not found");
    }

    // Find the specific slot
    const slot = await DoctorTimeSlot.findOne({
      _id: slotId,
      doctorId: doctor._id,
    });

    if (!slot) {
      return fail(
        res,
        404,
        ERROR_CODES.NOT_FOUND,
        "Time slot not found or does not belong to this doctor"
      );
    }

    // Check if slot has active appointments
    const activeAppointments = await Appointment.find({
      slotId: slot._id,
      status: {
        $nin: ["cancelled", "rejected", "no_show", "rescheduled"],
      },
    }).select("slotId status");

    if (activeAppointments.length > 0) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "Cannot block slot with active appointment. Please cancel the appointment first."
      );
    }

    // Block the slot
    slot.status = "blocked";
    slot.leaveReason = reason || "";
    await slot.save();

    console.log(
      `✅ Manager blocked single slot ${slotId} for doctor ${doctor.fullName} at ${slot.startAt}`
    );
    if (reason) {
      console.log(`Reason: ${reason}`);
    }

    return ok(res, {
      message: "Slot blocked successfully",
      blockedSlotId: slotId,
      slot: {
        id: slot._id,
        startAt: slot.startAt,
        endAt: slot.endAt,
        status: slot.status,
      },
    });
  } catch (error) {
    console.error("❌ blockSingleSlotForManager error:", error);
    return fail(
      res,
      500,
      ERROR_CODES.SERVER_ERROR,
      error.message || String(error)
    );
  }
}

/**
 * Block/unblock slots by date range for a specific doctor (manager can block for any doctor)
 */
export async function blockSlotsByDateRangeForManager(req, res) {
  try {
    const { doctorId } = req.params;
    const { startDate, endDate, reason } = req.body;

    if (!doctorId) {
      return fail(res, 400, ERROR_CODES.INVALID_INPUT, "Doctor ID is required");
    }

    if (!startDate || !endDate) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Start date and end date are required"
      );
    }

    // Verify doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Doctor not found");
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (start > end) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Start date must be before end date"
      );
    }

    // Find all slots in the date range for this doctor
    const slotsToBlock = await DoctorTimeSlot.find({
      doctorId: doctor._id,
      startAt: { $gte: start, $lte: end },
    });

    if (slotsToBlock.length === 0) {
      return fail(
        res,
        404,
        ERROR_CODES.NOT_FOUND,
        "No slots found in the specified date range"
      );
    }

    // Check if any slots have active appointments
    const slotIds = slotsToBlock.map((slot) => slot._id);
    const activeAppointments = await Appointment.find({
      slotId: { $in: slotIds },
      status: {
        $nin: ["cancelled", "rejected", "no_show", "rescheduled"],
      },
    }).select("slotId status");

    if (activeAppointments.length > 0) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        `Cannot block ${activeAppointments.length} slot(s) with active appointments. Please cancel those appointments first.`
      );
    }

    // Block all slots in the date range
    const updateResult = await DoctorTimeSlot.updateMany(
      {
        _id: { $in: slotIds },
      },
      {
        $set: { status: "blocked" },
      }
    );

    console.log(
      `✅ Manager blocked ${updateResult.modifiedCount} slots for doctor ${doctor.fullName} from ${startDate} to ${endDate}`
    );
    if (reason) {
      console.log(`Reason: ${reason}`);
    }

    return ok(res, {
      message: `Successfully blocked ${updateResult.modifiedCount} slots`,
      blockedSlots: updateResult.modifiedCount,
      dateRange: {
        startDate: startDate,
        endDate: endDate,
      },
      reason: reason || null,
    });
  } catch (error) {
    console.error("❌ blockSlotsByDateRangeForManager error:", error);
    return fail(
      res,
      500,
      ERROR_CODES.SERVER_ERROR,
      error.message || String(error)
    );
  }
}

/**
 * Reschedule appointment by manager (direct reschedule without approval)
 */
export async function rescheduleAppointmentByManager(req, res) {
  try {
    const { appointmentId } = req.params;
    const { newDateTime, reason, mode, clinicId, newDoctorId, rescheduleType } =
      req.body;
    const userId = req.user.app_user_id;

    console.log("🔄 Reschedule request:", {
      appointmentId,
      newDateTime,
      reason,
      mode,
      clinicId,
      newDoctorId,
      hasNewDoctorId: !!newDoctorId,
    });

    if (!appointmentId || !newDateTime || !reason || !mode) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Missing required fields: appointmentId, newDateTime, reason, mode"
      );
    }

    // Validate mode
    if (!["online", "offline"].includes(mode)) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Mode must be 'online' or 'offline'"
      );
    }

    // If offline mode, clinicId is required
    if (mode === "offline" && !clinicId) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Clinic ID is required for offline appointments"
      );
    }

    // Find appointment with populated data
    const originalAppointment = await Appointment.findById(appointmentId)
      .populate("patientId", "userId fullName")
      .populate("doctorId", "userId fullName")
      .populate({
        path: "patientId",
        populate: {
          path: "userId",
          select: "email fullName",
        },
      })
      .populate({
        path: "doctorId",
        populate: {
          path: "userId",
          select: "email fullName",
        },
      });

    if (!originalAppointment) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Appointment not found");
    }

    // Check if appointment can be rescheduled
    if (!["pending_doctor", "accepted"].includes(originalAppointment.status)) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Appointment cannot be rescheduled in current status"
      );
    }

    // Extract originalDoctorId once at the beginning (before using it)
    const originalDoctorIdValue =
      originalAppointment.doctorId._id || originalAppointment.doctorId;

    // Validate new datetime
    const newDate = new Date(newDateTime);
    const now = new Date();

    if (newDate <= now) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "New appointment time must be in the future"
      );
    }

    // Try to use transaction, fallback to non-transaction if not supported
    // MongoDB transactions only work with replica sets or sharded clusters
    // In development, we often use standalone MongoDB which doesn't support transactions
    let session = null;
    let useTransaction = false;

    // For now, disable transactions in development to avoid errors
    // Uncomment the code below if you have MongoDB replica set configured
    /*
    try {
      const testSession = await mongoose.startSession();
      try {
        testSession.startTransaction();
        // If we get here, transactions are supported
        await testSession.abortTransaction();
        await testSession.endSession();
        
        // Now start the real transaction
        session = await mongoose.startSession();
        session.startTransaction();
        useTransaction = true;
        console.log("✅ Transaction started successfully");
      } catch (startError) {
        // Transaction not supported
        await testSession.endSession();
        throw startError;
      }
    } catch (transactionError) {
      // If transaction is not supported (e.g., standalone MongoDB), continue without it
      console.warn(
        "⚠️ Transactions not supported (standalone MongoDB detected), proceeding without transaction:",
        transactionError.message
      );
      useTransaction = false;
      session = null;
    }
    */

    // Disable transactions for now (standalone MongoDB)
    console.log("ℹ️ Transactions disabled (standalone MongoDB mode)");
    useTransaction = false;
    session = null;

    try {
      // Determine reschedule type and requested by
      // rescheduleType: "doctor_busy" (bác sĩ bận), "patient_request" (bệnh nhân yêu cầu), "manager_initiated" (manager tự động)
      // rescheduleRequestedBy: "doctor", "patient", "manager"
      let finalRescheduleType = rescheduleType || "manager_initiated";
      let finalRescheduleRequestedBy = "manager"; // Manager is processing the reschedule

      // Priority: Use rescheduleType from request body if provided
      // If rescheduleType is "doctor_busy", always use it (even if doctor is not changed)
      if (rescheduleType === "doctor_busy") {
        finalRescheduleType = "doctor_busy";
        finalRescheduleRequestedBy = "doctor"; // Doctor is busy, manager reschedules
      } else if (rescheduleType === "patient_request") {
        finalRescheduleType = "patient_request";
        finalRescheduleRequestedBy = "patient"; // Patient requested, manager processed it
      } else if (
        // If newDoctorId is provided and different from original, it's "doctor_busy"
        newDoctorId &&
        newDoctorId.toString() !== originalDoctorIdValue.toString()
      ) {
        finalRescheduleType = "doctor_busy";
        finalRescheduleRequestedBy = "doctor"; // Doctor is busy, manager reschedules to another doctor
      }

      console.log("📋 Reschedule metadata:", {
        rescheduleType: finalRescheduleType,
        rescheduleRequestedBy: finalRescheduleRequestedBy,
        newDoctorId: newDoctorId ? newDoctorId.toString() : null,
        originalDoctorId: originalDoctorIdValue.toString(),
      });

      // Update original appointment status to "rescheduled" and mark it as moved
      // This ensures it won't appear in the schedule anymore
      await Appointment.findByIdAndUpdate(
        originalAppointment._id,
        {
          status: "rescheduled",
          rescheduledToId: null, // Will be set after creating new appointment
          rescheduledBy: userId,
          rescheduledAt: new Date(),
          rescheduleReason: reason.trim(),
          rescheduleType: finalRescheduleType,
          rescheduleRequestedBy: finalRescheduleRequestedBy,
        },
        useTransaction ? { session } : {}
      );

      console.log(
        `✅ Updated original appointment ${originalAppointment._id} status to "rescheduled"`
      );

      // Calculate appointment duration
      const appointmentDuration =
        originalAppointment.scheduledEnd.getTime() -
        originalAppointment.scheduledStart.getTime();

      const newScheduledStart = newDate;
      const newScheduledEnd = new Date(newDate.getTime() + appointmentDuration);

      // Use newDoctorId if provided, otherwise use original doctor
      // originalDoctorIdValue is already defined above
      const doctorId = newDoctorId || originalDoctorIdValue;

      console.log("👨‍⚕️ Doctor selection:", {
        originalDoctorId: originalDoctorIdValue.toString(),
        newDoctorId: newDoctorId ? newDoctorId.toString() : null,
        finalDoctorId: doctorId.toString(),
        doctorChanged:
          newDoctorId &&
          newDoctorId.toString() !== originalDoctorIdValue.toString(),
      });

      // Validate new doctor exists if different from original
      if (newDoctorId) {
        const newDoctor = await Doctor.findById(newDoctorId).lean();
        if (!newDoctor) {
          if (useTransaction && session) {
            await session.abortTransaction();
          }
          return fail(res, 404, ERROR_CODES.NOT_FOUND, "New doctor not found");
        }
        if (!newDoctor.isVerified || !newDoctor.isActive) {
          if (useTransaction && session) {
            await session.abortTransaction();
          }
          return fail(
            res,
            400,
            ERROR_CODES.INVALID_INPUT,
            "New doctor is not verified or active"
          );
        }
        console.log(
          `✅ New doctor validated: ${
            newDoctor.fullName || newDoctor.userId?.fullName
          }`
        );
      }

      // Find or create a time slot for the new datetime
      let newTimeSlot;
      try {
        let query = DoctorTimeSlot.findOne({
          doctorId: doctorId,
          startAt: newScheduledStart,
          endAt: newScheduledEnd,
        });
        if (useTransaction && session) {
          query = query.session(session);
        }
        newTimeSlot = await query;
        console.log(
          `🔍 Looking for time slot: doctorId=${doctorId}, startAt=${newScheduledStart}, endAt=${newScheduledEnd}`
        );
        if (newTimeSlot) {
          console.log(
            `📋 Found existing slot: ${newTimeSlot._id}, status=${newTimeSlot.status}`
          );
        } else {
          console.log("📋 No existing slot found, will create new one");
        }
      } catch (queryError) {
        // If query fails with session, retry without session
        if (
          useTransaction &&
          queryError.message &&
          queryError.message.includes("Transaction")
        ) {
          console.warn(
            "⚠️ Query failed with session, retrying without session"
          );
          useTransaction = false;
          newTimeSlot = await DoctorTimeSlot.findOne({
            doctorId: doctorId,
            startAt: newScheduledStart,
            endAt: newScheduledEnd,
          });
          if (newTimeSlot) {
            console.log(
              `📋 Found existing slot (retry): ${newTimeSlot._id}, status=${newTimeSlot.status}`
            );
          }
        } else {
          throw queryError;
        }
      }

      if (!newTimeSlot) {
        // Create new time slot for the rescheduled appointment
        newTimeSlot = new DoctorTimeSlot({
          doctorId: doctorId,
          startAt: newScheduledStart,
          endAt: newScheduledEnd,
          status: "available", // Will be set to "booked" after appointment creation
        });
        try {
          if (useTransaction && session) {
            await newTimeSlot.save({ session });
          } else {
            await newTimeSlot.save();
          }
        } catch (saveError) {
          // If save fails with session, retry without session
          if (
            useTransaction &&
            saveError.message &&
            saveError.message.includes("Transaction")
          ) {
            console.warn(
              "⚠️ Save failed with session, retrying without session"
            );
            useTransaction = false;
            await newTimeSlot.save();
          } else {
            throw saveError;
          }
        }
        console.log(
          `✅ Created new time slot ${newTimeSlot._id} for rescheduled appointment`
        );
      }

      // Verify slot is available
      // Check if slot has any active appointments (not cancelled, rejected, rescheduled, or done)
      const existingAppointment = await Appointment.findOne({
        slotId: newTimeSlot._id,
        status: {
          $in: ["pending_doctor", "accepted", "confirmed", "in_progress"],
        },
      }).lean();

      if (existingAppointment) {
        // Slot is already booked by another appointment
        if (useTransaction && session) {
          await session.abortTransaction();
        }
        console.warn(
          `⚠️ Time slot ${newTimeSlot._id} is already booked by appointment ${existingAppointment._id}`
        );
        return fail(
          res,
          400,
          ERROR_CODES.INVALID_INPUT,
          "Time slot for new datetime is no longer available (already booked)"
        );
      }

      // Also check slot status (should be available or booked by the appointment we're rescheduling)
      if (newTimeSlot.status === "blocked") {
        if (useTransaction && session) {
          await session.abortTransaction();
        }
        return fail(
          res,
          400,
          ERROR_CODES.INVALID_INPUT,
          "Time slot for new datetime is blocked"
        );
      }

      // If slot status is "booked", check if it's booked by the appointment we're rescheduling
      // (This shouldn't happen in normal flow, but handle it just in case)
      if (newTimeSlot.status === "booked" && !existingAppointment) {
        // Slot is marked as booked but no appointment found - might be stale data
        // We can still use it, but log a warning
        console.warn(
          `⚠️ Time slot ${newTimeSlot._id} is marked as booked but no active appointment found. Proceeding anyway.`
        );
      }

      // Create new appointment with the NEW time slot
      // Copy paymentStatus from original appointment (if it was paid, new appointment should also be paid)
      const newAppointmentData = {
        patientId:
          originalAppointment.patientId._id || originalAppointment.patientId,
        doctorId: doctorId,
        clinicId:
          mode === "offline"
            ? clinicId ||
              originalAppointment.clinicId?._id ||
              originalAppointment.clinicId
            : undefined,
        slotId: newTimeSlot._id,
        scheduledStart: newScheduledStart,
        scheduledEnd: newScheduledEnd,
        mode: mode,
        status: "accepted",
        reason:
          originalAppointment.reason || originalAppointment.reasonForVisit,
        rescheduledFromId: originalAppointment._id,
        // Copy payment status from original appointment
        // If original was paid, new appointment should also be paid
        paymentStatus: originalAppointment.paymentStatus || "unpaid",
        totalPay: originalAppointment.totalPay || 0,
        amountPaid: originalAppointment.amountPaid || 0,
        // Store reschedule metadata
        rescheduleType: finalRescheduleType,
        rescheduleRequestedBy: finalRescheduleRequestedBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const newAppointment = new Appointment(newAppointmentData);
      try {
        if (useTransaction && session) {
          await newAppointment.save({ session });
        } else {
          await newAppointment.save();
        }
      } catch (saveError) {
        // If save fails with session, retry without session
        if (
          useTransaction &&
          saveError.message &&
          saveError.message.includes("Transaction")
        ) {
          console.warn(
            "⚠️ Appointment save failed with session, retrying without session"
          );
          useTransaction = false;
          await newAppointment.save();
        } else {
          throw saveError;
        }
      }

      // Mark the new time slot as booked
      await DoctorTimeSlot.findByIdAndUpdate(
        newTimeSlot._id,
        { status: "booked" },
        useTransaction && session ? { session } : {}
      );

      // Update rescheduledToId in original appointment to link to new appointment
      await Appointment.findByIdAndUpdate(
        originalAppointment._id,
        {
          rescheduledToId: newAppointment._id,
        },
        useTransaction && session ? { session } : {}
      );
      console.log(
        `✅ Linked original appointment ${originalAppointment._id} to new appointment ${newAppointment._id}`
      );

      // Handle old slot based on reschedule type
      // - If "doctor_busy": block the old slot (doctor is unavailable, slot should not be bookable)
      // - If "patient_request" or other: free the old slot (patient requested, slot can be reused)
      const oldSlotId =
        originalAppointment.slotId?._id || originalAppointment.slotId;
      if (oldSlotId) {
        if (finalRescheduleType === "doctor_busy") {
          // Block the old slot because doctor is busy/unavailable
          await DoctorTimeSlot.findByIdAndUpdate(
            oldSlotId,
            { status: "blocked" },
            useTransaction && session ? { session } : {}
          );
          console.log(
            `✅ Blocked old slot ${oldSlotId} - doctor is busy, slot should not be bookable`
          );
        } else {
          // Free the old slot for reuse (patient requested reschedule)
          await DoctorTimeSlot.findByIdAndUpdate(
            oldSlotId,
            { status: "available" },
            useTransaction && session ? { session } : {}
          );
          console.log(
            `✅ Freed old slot ${oldSlotId} - set to available after reschedule (patient request)`
          );
        }
      }

      // Commit transaction if using one
      if (useTransaction && session) {
        await session.commitTransaction();
      }

      // Send notifications to both doctor and patient
      try {
        // Notification for both patient and doctor (using original appointment to get both users)
        await createAppointmentNotification(
          originalAppointment._id,
          "rescheduled",
          {
            reason: reason.trim(),
            newDateTime: newDate,
            rescheduledBy: userId,
            rescheduledByType: "manager",
            notifyDoctor: true, // Flag to notify doctor
            newAppointmentId: newAppointment._id, // Include new appointment ID for reference
          }
        );

        console.log(
          `✅ Reschedule notifications sent for appointment ${originalAppointment._id}`
        );
      } catch (notificationError) {
        console.error(
          "❌ Error creating reschedule notifications:",
          notificationError
        );
      }

      // Get doctor objects for emails (reuse originalDoctorIdValue from above)
      const isDoctorChanged =
        newDoctorId &&
        newDoctorId.toString() !== originalDoctorIdValue.toString();

      // Get original doctor for email
      const originalDoctor = await Doctor.findById(originalDoctorIdValue)
        .populate("userId", "email fullName")
        .lean();

      // Get new doctor for email (if changed)
      let newDoctor = null;
      if (isDoctorChanged) {
        newDoctor = await Doctor.findById(newDoctorId)
          .populate("userId", "email fullName")
          .lean();
      }

      // Get current doctor (for patient email - could be original or new)
      const currentDoctor = newDoctor || originalDoctor;

      // Send email notification to patient
      try {
        const { sendAppointmentRescheduledEmail } = await import(
          "../controllers/rescheduleController.js"
        );

        await sendAppointmentRescheduledEmail(
          originalAppointment,
          newAppointment,
          reason.trim(),
          currentDoctor
        );
        console.log("✅ Reschedule confirmation email sent to patient");
      } catch (emailError) {
        console.error(
          "⚠️ Failed to send reschedule confirmation email to patient:",
          emailError.message
        );
        // Don't block reschedule if email fails
      }

      // Send email notification to original doctor (always send)
      try {
        const { sendDoctorRescheduledEmail } = await import(
          "../controllers/rescheduleController.js"
        );

        await sendDoctorRescheduledEmail(
          originalAppointment,
          newAppointment,
          reason.trim(),
          originalDoctor,
          true, // isOriginalDoctor = true
          newDoctor // Pass new doctor if changed
        );
        console.log(
          `✅ Reschedule email sent to original doctor ${
            originalDoctor.userId?.fullName || originalDoctor.fullName
          }`
        );
      } catch (emailError) {
        console.error(
          "⚠️ Failed to send reschedule email to original doctor:",
          emailError.message
        );
        // Don't block reschedule if email fails
      }

      // If doctor was changed, send email and notification to new doctor
      if (isDoctorChanged && newDoctor) {
        try {
          // Send notification to new doctor directly
          if (newDoctor?.userId?._id || newDoctor?.userId) {
            const Notification = (
              await import("../models/notification.model.js")
            ).default;

            const newDoctorUserId = newDoctor.userId._id || newDoctor.userId;
            const patientName =
              originalAppointment.patientId?.fullName ||
              originalAppointment.patientId?.userId?.fullName ||
              "Bệnh nhân";
            const originalDoctorName =
              originalDoctor.userId?.fullName ||
              originalDoctor.fullName ||
              "Bác sĩ";

            const newAppointmentTime = new Date(
              newAppointment.scheduledStart
            ).toLocaleString("vi-VN", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            await Notification.create({
              userId: newDoctorUserId,
              type: "appointment",
              title: "Lịch hẹn mới được chuyển từ bác sĩ khác",
              message: `Bạn có lịch hẹn mới với bệnh nhân ${patientName} vào ${newAppointmentTime}. Lịch hẹn này đã được quản lý chuyển từ BS. ${originalDoctorName}.`,
              priority: "high",
              relatedId: newAppointment._id,
              relatedType: "appointment",
              metadata: {
                appointmentId: newAppointment._id,
                patientName,
                appointmentTime: newAppointmentTime,
                status: "accepted",
                rescheduledBy: userId,
                rescheduledByType: "manager",
                originalDoctorId: originalDoctorIdValue,
                reason: "Lịch hẹn đã được dời từ bác sĩ khác",
              },
            });
            console.log(
              `✅ Notification sent to new doctor ${
                newDoctor.userId?.fullName || newDoctor.fullName
              }`
            );
          }

          // Send email to new doctor
          const { sendDoctorRescheduledEmail } = await import(
            "../controllers/rescheduleController.js"
          );

          await sendDoctorRescheduledEmail(
            originalAppointment,
            newAppointment,
            reason.trim(),
            newDoctor,
            false, // isOriginalDoctor = false
            null // newDoctor not needed for new doctor email
          );
          console.log(
            `✅ Reschedule email sent to new doctor ${
              newDoctor.userId?.fullName || newDoctor.fullName
            }`
          );
        } catch (newDoctorError) {
          console.error(
            "⚠️ Failed to notify new doctor:",
            newDoctorError.message
          );
        }
      }

      // Populate newAppointment with doctorId for frontend
      const populatedNewAppointment = await Appointment.findById(
        newAppointment._id
      )
        .populate("doctorId", "fullName userId")
        .populate("doctorId.userId", "fullName")
        .lean();

      return ok(res, {
        message: "Appointment rescheduled successfully",
        newAppointment: populatedNewAppointment || newAppointment,
        originalAppointment: originalAppointment._id,
        newDoctorId: doctorId.toString(), // Include newDoctorId for easy reference
      });
    } catch (error) {
      console.error("❌ Error in reschedule transaction block:", error);
      // Only abort transaction if we're using one
      if (useTransaction && session) {
        try {
          await session.abortTransaction();
        } catch (abortError) {
          console.error("Error aborting transaction:", abortError);
        }
      }
      throw error;
    } finally {
      // Only end session if we created one
      if (session) {
        try {
          await session.endSession();
        } catch (endError) {
          console.error("Error ending session:", endError);
        }
      }
    }
  } catch (error) {
    console.error("❌ Error rescheduling appointment by manager:", error);
    console.error("❌ Error stack:", error.stack);
    // Check if it's a transaction error
    if (
      error.message &&
      error.message.includes("Transaction numbers are only allowed")
    ) {
      console.error(
        "💡 This is a MongoDB transaction error. The code should have handled this, but it seems the error occurred during execution."
      );
      return fail(
        res,
        500,
        ERROR_CODES.SERVER_ERROR,
        "MongoDB transaction not supported. Please ensure MongoDB is running in replica set mode or contact administrator."
      );
    }
    return fail(
      res,
      500,
      ERROR_CODES.SERVER_ERROR,
      error.message || "Internal server error"
    );
  }
}

/**
 * Unblock slots by date range for a specific doctor (manager can unblock for any doctor)
 */
export async function unblockSlotsByDateRangeForManager(req, res) {
  try {
    const { doctorId } = req.params;
    const { startDate, endDate } = req.body;

    if (!doctorId) {
      return fail(res, 400, ERROR_CODES.INVALID_INPUT, "Doctor ID is required");
    }

    if (!startDate || !endDate) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Start date and end date are required"
      );
    }

    // Verify doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Doctor not found");
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (start > end) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Start date must be before end date"
      );
    }

    // Find all blocked slots in the date range for this doctor
    const slotsToUnblock = await DoctorTimeSlot.find({
      doctorId: doctor._id,
      startAt: { $gte: start, $lte: end },
      status: "blocked",
    });

    if (slotsToUnblock.length === 0) {
      return fail(
        res,
        404,
        ERROR_CODES.NOT_FOUND,
        "No blocked slots found in the specified date range"
      );
    }

    // Unblock all slots in the date range
    const updateResult = await DoctorTimeSlot.updateMany(
      {
        doctorId: doctor._id,
        startAt: { $gte: start, $lte: end },
        status: "blocked",
      },
      {
        $set: { status: "available" },
      }
    );

    console.log(
      `✅ Manager unblocked ${updateResult.modifiedCount} slots for doctor ${doctor.fullName} from ${startDate} to ${endDate}`
    );

    return ok(res, {
      message: `Successfully unblocked ${updateResult.modifiedCount} slots`,
      unblockedSlots: updateResult.modifiedCount,
      dateRange: {
        startDate: startDate,
        endDate: endDate,
      },
    });
  } catch (error) {
    console.error("❌ unblockSlotsByDateRangeForManager error:", error);
    return fail(
      res,
      500,
      ERROR_CODES.SERVER_ERROR,
      error.message || String(error)
    );
  }
}

// ================== INVOICE MANAGEMENT CONTROLLERS ==================

/**
 * Get all invoices (payments) for manager
 * GET /api/managers/invoices?invoiceType=booking&page=1&limit=20
 */
export async function getManagerInvoices(req, res) {
  try {
    const {
      invoiceType,
      page = 1,
      limit = 20,
      status,
      startDate,
      endDate,
    } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    const query = {};

    // Filter by invoiceType (booking or service)
    // Show all booking invoices (both manager-created and patient-created)
    if (invoiceType && invoiceType !== "all") {
      query.invoiceType = invoiceType;
    }

    // Filter by status
    if (status && status !== "all") {
      query.status = status;
    }

    // Filter by date range
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: start, $lte: end };
    }

    // Get payments with populated data
    const Payment = (await import("../models/payment.model.js")).default;

    const payments = await Payment.find(query)
      .populate("appointmentId", "scheduledStart status mode")
      .populate("billTo.patientId", "fullName phone dob gender")
      .populate("billFrom.doctorId", "fullName")
      .populate("billFrom.clinicId", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Payment.countDocuments(query);

    // Format invoices for response
    const formattedInvoices = payments.map((payment) => ({
      _id: payment._id,
      invoiceNumber: payment.invoiceNumber,
      invoiceType: payment.invoiceType,
      orderCode: payment.orderCode || payment.pendingOrderCode || null,
      appointmentId: payment.appointmentId?._id,
      appointmentDate: payment.appointmentId?.scheduledStart,
      appointmentStatus: payment.appointmentId?.status,
      appointmentMode: payment.appointmentId?.mode,
      patientName:
        payment.billTo?.name || payment.billTo?.patientId?.fullName || "N/A",
      patientPhone:
        payment.billTo?.phone || payment.billTo?.patientId?.phone || null,
      patientDateOfBirth: payment.billTo?.patientId?.dob || null,
      patientGender: payment.billTo?.patientId?.gender || null,
      doctorName:
        payment.billFrom?.doctorName ||
        payment.billFrom?.doctorId?.fullName ||
        "N/A",
      clinicName:
        payment.billFrom?.clinicName ||
        payment.billFrom?.clinicId?.name ||
        null,
      items: payment.items || [],
      subtotal: payment.subtotal,
      discount: payment.discount || 0,
      total: payment.total,
      gateway: payment.gateway,
      method: payment.method,
      status: payment.status,
      paidAt: payment.paidAt || payment.capturedAt || payment.createdAt,
      createdAt: payment.createdAt,
      currency: payment.currency || "VND",
    }));

    return res.json({
      success: true,
      data: {
        invoices: formattedInvoices,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching manager invoices:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi tải danh sách hóa đơn",
      error: error.message,
    });
  }
}

/**
 * Delete invoice (payment) for manager
 * Only allows deletion of pending or cancelled invoices
 * DELETE /api/managers/invoices/:invoiceId
 */
export async function deleteManagerInvoice(req, res) {
  try {
    const { invoiceId } = req.params;

    if (!invoiceId) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Invoice ID is required"
      );
    }

    const Payment = (await import("../models/payment.model.js")).default;

    // Find the payment/invoice
    const payment = await Payment.findById(invoiceId);

    if (!payment) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Invoice not found");
    }

    // Only allow deletion of pending or cancelled invoices
    // Do not allow deletion of paid invoices
    if (payment.status === "paid") {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "Cannot delete a paid invoice. Only pending or cancelled invoices can be deleted."
      );
    }

    // Delete the payment/invoice
    await Payment.findByIdAndDelete(invoiceId);

    console.log(`✅ Manager deleted invoice ${invoiceId}`);

    return ok(res, {
      message: "Invoice deleted successfully",
      deletedInvoiceId: invoiceId,
    });
  } catch (error) {
    console.error("❌ deleteManagerInvoice error:", error);
    return fail(
      res,
      500,
      ERROR_CODES.SERVER_ERROR,
      error.message || String(error)
    );
  }
}

// ================== EDUCATION LEVEL PRICE MANAGEMENT ==================

/**
 * Get all education level prices
 * GET /api/manager/education-level-prices
 */
export async function getEducationLevelPrices(req, res) {
  try {
    const prices = await EducationLevelPrice.find({ isActive: true })
      .populate("updatedBy", "fullName")
      .sort({ educationLevel: 1, mode: 1 })
      .lean();

    // Format response by education level
    const formattedPrices = {};
    const educationLevels = [
      "Bác sĩ",
      "Thạc sĩ",
      "Tiến sĩ",
      "Phó Giáo Sư",
      "Giáo Sư",
    ];

    educationLevels.forEach((level) => {
      formattedPrices[level] = {
        online: null,
        offline: null,
      };
    });

    prices.forEach((price) => {
      if (formattedPrices[price.educationLevel]) {
        formattedPrices[price.educationLevel][price.mode] = {
          id: price._id,
          weekdayPrice: price.weekdayPrice,
          weekendPrice: price.weekendPrice,
          currency: price.currency,
          updatedBy: price.updatedBy?.fullName || "System",
          updatedAt: price.updatedAt,
        };
      }
    });

    return ok(res, {
      prices: formattedPrices,
      allPrices: prices,
    });
  } catch (error) {
    console.error("Error fetching education level prices:", error);
    return fail(
      res,
      500,
      ERROR_CODES.SERVER_ERROR,
      error.message || String(error)
    );
  }
}

/**
 * Set/Update education level price
 * POST /api/manager/education-level-prices
 */
export async function setEducationLevelPrice(req, res) {
  try {
    const {
      educationLevel,
      mode,
      weekdayPrice,
      weekendPrice,
      currency = "VND",
    } = req.body;

    // Validate required fields
    if (
      !educationLevel ||
      !mode ||
      weekdayPrice === undefined ||
      weekendPrice === undefined
    ) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "Vui lòng điền đầy đủ thông tin: educationLevel, mode, weekdayPrice, weekendPrice"
      );
    }

    // Validate educationLevel enum
    const validLevels = [
      "Bác sĩ",
      "Thạc sĩ",
      "Tiến sĩ",
      "Phó Giáo Sư",
      "Giáo Sư",
    ];
    if (!validLevels.includes(educationLevel)) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "Trình độ học vấn không hợp lệ"
      );
    }

    // Validate mode
    if (!["online", "offline"].includes(mode)) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "Mode phải là 'online' hoặc 'offline'"
      );
    }

    // Validate prices
    if (weekdayPrice < 0 || weekendPrice < 0) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "Giá tiền phải lớn hơn hoặc bằng 0"
      );
    }

    // Get current user
    const userEmail = req.user?.email;
    if (!userEmail) {
      return fail(
        res,
        401,
        ERROR_CODES.UNAUTHORIZED,
        "User email not found in token"
      );
    }

    const user = await User.findOne({ email: userEmail }).lean();
    if (!user) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "User not found");
    }

    // Upsert education level price
    const price = await EducationLevelPrice.findOneAndUpdate(
      { educationLevel, mode },
      {
        educationLevel,
        mode,
        weekdayPrice,
        weekendPrice,
        currency,
        isActive: true,
        updatedBy: user._id,
      },
      { upsert: true, new: true, runValidators: true }
    );

    return ok(res, {
      message: "Đã cập nhật giá theo trình độ học vấn thành công",
      price,
    });
  } catch (error) {
    console.error("Error setting education level price:", error);
    return fail(
      res,
      500,
      ERROR_CODES.SERVER_ERROR,
      error.message || String(error)
    );
  }
}

// ================== SERVICE PAYMENT MANAGEMENT CONTROLLERS ==================

/**
 * Get pending service payments (chờ manager xử lý)
 * GET /api/managers/service-payments/pending
 */
export async function getPendingServicePayments(req, res) {
  try {
    const { page = 1, limit = 20, invoiceType, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query for pending payments. Include both booking and service by default.
    let statusFilter;
    if (status) {
      // Nếu status có dấu phẩy, tách thành mảng
      if (status.includes(",")) {
        statusFilter = { $in: status.split(",").map((s) => s.trim()) };
      } else {
        statusFilter = status;
      }
    } else {
      // Mặc định: hiển thị cả pending_manager và initiated
      statusFilter = { $in: ["pending_manager", "initiated"] };
    }

    const query = {
      status: statusFilter,
    };

    if (invoiceType === "booking" || invoiceType === "service") {
      query.invoiceType = invoiceType;
    } else {
      query.invoiceType = { $in: ["booking", "service"] };
    }

    const payments = await Payment.find(query)
      .populate("appointmentId", "scheduledStart status mode")
      .populate("billTo.patientId", "fullName phone dob gender")
      .populate("billFrom.doctorId", "fullName")
      .populate("billFrom.clinicId", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Payment.countDocuments(query);

    // Format payments for response
    const formattedPayments = payments.map((payment) => ({
      _id: payment._id,
      invoiceNumber: payment.invoiceNumber,
      invoiceType: payment.invoiceType,
      appointmentId: payment.appointmentId?._id,
      appointmentDate: payment.appointmentId?.scheduledStart,
      appointmentStatus: payment.appointmentId?.status,
      appointmentMode: payment.appointmentId?.mode,
      patientName:
        payment.billTo?.name || payment.billTo?.patientId?.fullName || "N/A",
      patientPhone:
        payment.billTo?.phone || payment.billTo?.patientId?.phone || null,
      doctorName:
        payment.billFrom?.doctorName ||
        payment.billFrom?.doctorId?.fullName ||
        "N/A",
      clinicName:
        payment.billFrom?.clinicName ||
        payment.billFrom?.clinicId?.name ||
        null,
      items: payment.items || [],
      subtotal: payment.subtotal,
      discount: payment.discount || 0,
      total: payment.total,
      amountPaid: payment.amountPaid || 0,
      status: payment.status,
      payUrl: payment.payUrl || null, // Thêm payUrl để hiển thị nút thanh toán
      pendingOrderCode: payment.pendingOrderCode || null,
      createdAt: payment.createdAt,
    }));

    return ok(res, {
      payments: formattedPayments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching pending service payments:", error);
    return fail(
      res,
      500,
      ERROR_CODES.SERVER_ERROR,
      "Lỗi khi tải danh sách yêu cầu thanh toán"
    );
  }
}

/**
 * Create booking payment (pending_manager) BEFORE creating appointment
 * POST /api/managers/booking-payments
 * Body: { doctorId, slotId, patientId/patientInfo, reason, scheduledStart, scheduledEnd, clinicId }
 * Appointment will be created AFTER payment is successful
 */
export async function createBookingPaymentByManager(req, res) {
  try {
    const {
      doctorId,
      slotId,
      patientId,
      patientName,
      patientPhone,
      dob,
      gender,
      citizenId,
      address,
      allergyNotes,
      reason,
      scheduledStart,
      scheduledEnd,
      clinicId,
    } = req.body;

    if (!doctorId || !reason || !scheduledStart || !scheduledEnd || !clinicId) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Missing required fields: doctorId, reason, scheduledStart, scheduledEnd, clinicId"
      );
    }

    // Verify doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Doctor not found");
    }

    // Find or create patient
    let patient = null;
    if (patientId) {
      patient = await Patient.findById(patientId).populate("userId");
      if (!patient) {
        return fail(res, 404, ERROR_CODES.NOT_FOUND, "Patient not found");
      }
    } else if (patientPhone && patientName) {
      // Create new patient (same logic as createAppointmentByManager)
      if (!dob || !gender || !citizenId || !address) {
        return fail(
          res,
          400,
          ERROR_CODES.INVALID_INPUT,
          "Missing required patient information: dob, gender, citizenId, address are required for new patients"
        );
      }

      let user = await User.findOne({ phone: patientPhone });
      if (!user) {
        const baseEmail = `${patientPhone}@patient.medconnect.local`;
        let finalEmail = baseEmail;
        let emailExists = await User.findOne({ email: finalEmail });
        let counter = 1;
        while (emailExists) {
          finalEmail = `${patientPhone}_${Date.now()}_${counter}@patient.medconnect.local`;
          emailExists = await User.findOne({ email: finalEmail });
          counter++;
        }

        user = new User({
          phone: patientPhone,
          email: finalEmail,
          fullName: patientName,
          role: "patient",
          status: "active",
          authProvider: "phone", // Set to "phone" so passwordHash is not required
        });
        await user.save();
      }

      patient = new Patient({
        userId: user._id,
        fullName: patientName,
        phone: patientPhone,
        dob: new Date(dob),
        gender,
        citizenId,
        address,
        allergyNotes: allergyNotes || "",
      });
      await patient.save();
    } else {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Patient information is required"
      );
    }

    // Get doctor's education level to find pricing
    if (!doctor.educationLevel) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Doctor does not have education level configured"
      );
    }

    // Find offline pricing based on education level
    const educationLevelPrice = await EducationLevelPrice.findOne({
      educationLevel: doctor.educationLevel,
      mode: "offline",
      isActive: true,
    }).lean();

    if (!educationLevelPrice) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Offline pricing not configured for this doctor's education level"
      );
    }

    // Calculate price based on weekday/weekend
    const start = new Date(scheduledStart);
    const isWeekend = [0, 6].includes(start.getDay());
    const unitPrice = isWeekend
      ? educationLevelPrice.weekendPrice
      : educationLevelPrice.weekdayPrice;

    // Verify clinic exists
    const clinic = await Clinic.findById(clinicId);
    if (!clinic) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Clinic not found");
    }

    // Build invoice items
    const items = [
      {
        description: "Khám tại phòng khám",
        quantity: 1,
        unitPrice: unitPrice,
        lineTotal: unitPrice,
      },
    ];

    // Check if slot is already booked by an active PAID appointment
    // If there's an unpaid appointment for this slot, delete it first (user can re-book)
    if (slotId) {
      const existingAppointment = await Appointment.findOne({
        slotId: slotId,
        status: { $in: ["pending_doctor", "accepted", "in_progress", "done"] },
      });

      if (existingAppointment) {
        // If existing appointment is unpaid, delete it to allow re-booking
        if (
          existingAppointment.paymentStatus === "unpaid" ||
          !existingAppointment.paymentStatus
        ) {
          console.log(
            `🗑️ Deleting unpaid appointment ${existingAppointment._id} to allow re-booking`
          );

          // Delete associated payment if exists
          await Payment.deleteMany({
            appointmentId: existingAppointment._id,
            invoiceType: "booking",
            status: { $in: ["pending_manager", "initiated"] },
          });

          // Delete the unpaid appointment
          await Appointment.findByIdAndDelete(existingAppointment._id);
          console.log(`✅ Deleted unpaid appointment, allowing new booking`);
        } else {
          // If appointment is paid, cannot override
          return fail(
            res,
            400,
            ERROR_CODES.INVALID_INPUT,
            "Time slot has already been booked and paid. Please select a different time slot."
          );
        }
      }
    }

    const orderCode = Number(String(Date.now()).slice(-10));
    const invoiceNumber = `INV-BOOKING-${orderCode}`;

    // Create TEMPORARY appointment with status "pending_doctor"
    // This appointment will be "activated" after payment success
    // Slot will NOT be marked as "booked" until payment succeeds
    const scheduledStartDate = new Date(scheduledStart);
    const scheduledEndDate = new Date(scheduledEnd);

    let tempAppointment;
    try {
      tempAppointment = new Appointment({
        patientId: patient._id,
        doctorId: doctor._id,
        slotId: slotId || null,
        mode: "offline",
        clinicId: clinicId,
        scheduledStart: scheduledStartDate,
        scheduledEnd: scheduledEndDate,
        reason,
        status: "pending_doctor",
        // Mark as pending payment - will be activated after payment
        paymentStatus: "unpaid",
      });

      await tempAppointment.save();
    } catch (saveError) {
      // Handle duplicate key error (unique index on slotId)
      if (saveError.code === 11000) {
        return fail(
          res,
          400,
          ERROR_CODES.INVALID_INPUT,
          "Time slot has already been booked. Please select a different time slot."
        );
      }
      throw saveError;
    }

    // Create payment linked to temporary appointment
    const payment = new Payment({
      appointmentId: tempAppointment._id,
      invoiceType: "booking",
      invoiceNumber,
      currency: "VND",
      issueDate: new Date(),
      billTo: {
        patientId: patient._id,
        name: patient.fullName || "Unknown",
        email: patient.userId?.email,
        phone: patient.userId?.phoneNumber || patient.phone,
      },
      billFrom: {
        doctorId: doctor._id,
        clinicId: clinicId,
        doctorName: doctor.fullName || "Unknown Doctor",
        clinicName: clinic.name || "Clinic",
      },
      items,
      subtotal: unitPrice,
      discount: 0,
      total: unitPrice,
      status: "pending_manager",
      amountPaid: 0,
    });

    await payment.save();

    // DO NOT mark slot as "booked" yet - only after payment success

    return ok(res, {
      payment,
      message:
        "Booking payment created. Appointment will be created after payment success.",
    });
  } catch (error) {
    console.error("❌ Error creating booking payment:", error);
    return fail(
      res,
      500,
      ERROR_CODES.SERVER_ERROR,
      error.message || String(error)
    );
  }
}

/**
 * Delete education level price
 * DELETE /api/manager/education-level-prices/:id
 */
export async function deleteEducationLevelPrice(req, res) {
  try {
    const { id } = req.params;

    const price = await EducationLevelPrice.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!price) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Không tìm thấy giá");
    }

    return ok(res, {
      message: "Đã xóa giá theo trình độ học vấn thành công",
    });
  } catch (error) {
    console.error("Error deleting education level price:", error);
    return fail(
      res,
      500,
      ERROR_CODES.SERVER_ERROR,
      error.message || String(error)
    );
  }
}

/**
 * Process cash payment
 * POST /api/managers/service-payments/:paymentId/cash
 * body: { amountPaid: number }
 */
export async function processCashPayment(req, res) {
  try {
    const { paymentId } = req.params;
    const { amountPaid } = req.body;

    if (!paymentId) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Payment ID is required"
      );
    }

    if (
      !amountPaid ||
      amountPaid <= 0 ||
      !Number.isInteger(Number(amountPaid))
    ) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Số tiền thanh toán phải là số nguyên dương"
      );
    }

    // Find payment
    const payment = await Payment.findById(paymentId).populate("appointmentId");

    if (!payment) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Payment not found");
    }

    // Validate payment status - chỉ cho phép pending_manager hoặc initiated
    if (
      payment.status !== "pending_manager" &&
      payment.status !== "initiated"
    ) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        `Payment is not available for processing. Current status: ${payment.status}`
      );
    }

    // Nếu đã captured thì không cho thanh toán lại
    if (payment.status === "captured") {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Payment has already been completed. Cannot process again."
      );
    }

    // Validate amountPaid <= total
    if (Number(amountPaid) > payment.total) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Số tiền thanh toán không được vượt quá tổng tiền"
      );
    }

    // Update payment
    payment.amountPaid = Number(amountPaid);
    payment.gateway = "cash";
    payment.method = "cash";
    payment.status =
      Number(amountPaid) >= payment.total ? "captured" : "pending_manager";
    payment.paidAt = new Date();
    payment.capturedAt = new Date();
    await payment.save();

    // Update Appointment
    if (payment.appointmentId) {
      const appointment = await Appointment.findById(
        payment.appointmentId._id || payment.appointmentId
      );
      if (appointment) {
        if (payment.invoiceType === "booking") {
          // Booking payment: Update appointment payment status and mark slot as booked
          if (Number(amountPaid) >= payment.total) {
            appointment.paymentStatus = "paid";
            appointment.paymentId = payment._id;

            // Mark slot as "booked" after payment success
            if (appointment.slotId) {
              await DoctorTimeSlot.findByIdAndUpdate(appointment.slotId, {
                status: "booked",
                appointmentId: appointment._id,
              });
              console.log(
                `✅ Slot ${appointment.slotId} marked as booked after cash payment success`
              );
            }

            await appointment.save();
            console.log(
              `✅ Booking payment completed. Appointment ${appointment._id} activated.`
            );

            // Gửi notification cho doctor về lịch hẹn mới (sau khi thanh toán thành công)
            try {
              await createBookingNotification(appointment._id, {
                createdByManager: true,
                paymentCompleted: true,
              });
              console.log(
                `📬 Booking notification sent to doctor for appointment ${appointment._id}`
              );
            } catch (notificationError) {
              console.error(
                "❌ Error sending booking notification to doctor:",
                notificationError
              );
            }
          } else {
            appointment.paymentStatus = "unpaid";
            await appointment.save();
          }
        } else {
          // Service payment: Calculate total from all service payments
          const allServicePayments = await Payment.find({
            appointmentId: appointment._id,
            invoiceType: "service",
          });

          const totalAmountPaid = allServicePayments.reduce(
            (sum, p) => sum + (p.amountPaid || 0),
            0
          );

          // Cập nhật totalPay từ services nếu chưa có
          if (!appointment.totalPay || appointment.totalPay === 0) {
            const totalPay = allServicePayments.reduce(
              (sum, p) => sum + (p.total || 0),
              0
            );
            appointment.totalPay = totalPay;
          }

          appointment.amountPaid = totalAmountPaid;

          // Cập nhật paymentStatus
          if (totalAmountPaid >= appointment.totalPay) {
            appointment.paymentStatus = "paid";
            // Khi đã thanh toán đủ, chuyển trạng thái lịch hẹn thành hoàn thành (done)
            if (appointment.status !== "done") {
              const prevStatus = appointment.status;
              appointment.status = "done";
              console.log(
                `✅ Appointment status updated from "${prevStatus}" to "done" after cash payment: ${appointment._id}`
              );
            }
          } else {
            appointment.paymentStatus = "unpaid";
          }

          await appointment.save();
        }

        // Gửi email xác nhận cho bệnh nhân nếu đã thanh toán đủ (giống chuyển khoản)
        if (appointment.paymentStatus === "paid") {
          try {
            const patient = await Patient.findById(
              appointment.patientId
            ).populate("userId");
            const doctor = await Doctor.findById(appointment.doctorId);
            const patientEmail = patient?.userId?.email;

            if (patientEmail) {
              const appointmentDate = new Date(appointment.scheduledStart);
              const formattedDate = appointmentDate.toLocaleDateString(
                "vi-VN",
                {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }
              );
              const formattedTime = appointmentDate.toLocaleTimeString(
                "vi-VN",
                {
                  hour: "2-digit",
                  minute: "2-digit",
                }
              );
              const formattedAmount = new Intl.NumberFormat("vi-VN", {
                style: "currency",
                currency: "VND",
              }).format(payment.total);

              const html = `
                <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:16px;background:#f6f7f9">
                  <div style="background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #eef1f5">
                    <div style="background:#2563eb;color:#fff;padding:16px 20px">
                      <h2 style="margin:0;font-size:20px">Xác nhận thanh toán tiền mặt</h2>
                      <div style="opacity:.9;margin-top:4px">MedConnect</div>
                    </div>
                    <div style="padding:20px">
                      <p>Xin chào <strong>${
                        patient.fullName || "Khách hàng"
                      }</strong>,</p>
                      <p>Chúng tôi xác nhận bạn đã <strong>thanh toán tiền mặt</strong> thành công cho lịch hẹn sau:</p>
                      <div style="background:#f9fafb;border-left:4px solid #2563eb;padding:12px 16px;border-radius:4px;margin:12px 0">
                        <div><strong>Ngày hẹn:</strong> ${formattedDate}</div>
                        <div><strong>Giờ hẹn:</strong> ${formattedTime}</div>
                        <div><strong>Bác sĩ:</strong> ${
                          doctor?.fullName || "Bác sĩ"
                        }</div>
                        <div><strong>Hình thức khám:</strong> ${
                          appointment.mode === "online"
                            ? "Khám trực tuyến"
                            : "Khám tại phòng khám"
                        }</div>
                      </div>
                      <div style="background:#fff7ed;border:1px solid #fed7aa;padding:12px 16px;border-radius:4px;margin:12px 0">
                        <div><strong>Mã hóa đơn:</strong> ${
                          payment.invoiceNumber
                        }</div>
                        <div><strong>Phương thức:</strong> Tiền mặt</div>
                        <div><strong>Tổng tiền:</strong> ${formattedAmount}</div>
                      </div>
                      <p>Nếu cần hỗ trợ, vui lòng phản hồi email này hoặc liên hệ hotline.</p>
                      <p>Trân trọng,<br/>MedConnect</p>
                    </div>
                  </div>
                </div>`;

              await sendMail({
                to: patientEmail,
                subject: `Xác nhận thanh toán tiền mặt - ${payment.invoiceNumber}`,
                html,
              });
              console.log(
                `📧 Cash payment confirmation email sent to ${patientEmail}`
              );
            } else {
              console.log(
                "⚠️ No patient email found; skipping cash payment email"
              );
            }
          } catch (emailErr) {
            console.error("❌ Error sending cash payment email:", emailErr);
          }
        }
      }
    }

    console.log(
      `✅ Manager processed cash payment ${paymentId}, amount: ${amountPaid}`
    );

    return ok(res, {
      message: "Thanh toán tiền mặt thành công",
      payment: {
        _id: payment._id,
        invoiceNumber: payment.invoiceNumber,
        total: payment.total,
        amountPaid: payment.amountPaid,
        status: payment.status,
      },
    });
  } catch (error) {
    console.error("Error processing cash payment:", error);
    return fail(
      res,
      500,
      ERROR_CODES.SERVER_ERROR,
      "Lỗi khi xử lý thanh toán tiền mặt"
    );
  }
}

/**
 * Create bank transfer payment link (PayOS)
 * POST /api/managers/service-payments/:paymentId/bank-transfer
 */
export async function createBankTransferPayment(req, res) {
  try {
    const { paymentId } = req.params;

    if (!paymentId) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Payment ID is required"
      );
    }

    // Find payment
    const payment = await Payment.findById(paymentId).populate("appointmentId");

    if (!payment) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Payment not found");
    }

    // Validate payment status - chỉ cho phép pending_manager
    if (payment.status !== "pending_manager") {
      if (payment.status === "captured") {
        return fail(
          res,
          400,
          ERROR_CODES.INVALID_INPUT,
          "Payment has already been completed. Cannot create payment link again."
        );
      }
      if (payment.status === "initiated" && payment.payUrl) {
        // Nếu đã có link PayOS, trả về link hiện có
        return ok(res, {
          message: "Link thanh toán đã được tạo trước đó",
          payment: {
            _id: payment._id,
            invoiceNumber: payment.invoiceNumber,
            total: payment.total,
            payUrl: payment.payUrl,
            orderCode: payment.pendingOrderCode,
          },
        });
      }
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        `Payment is not pending for manager processing. Current status: ${payment.status}`
      );
    }

    // Create PayOS payment link
    try {
      const { PayOS } = await import("@payos/node");
      const payos = new PayOS(
        process.env.PAYOS_CLIENT_ID,
        process.env.PAYOS_API_KEY,
        process.env.PAYOS_CHECKSUM_KEY
      );

      // Validate FRONTEND_URL
      if (!process.env.FRONTEND_URL) {
        return fail(
          res,
          500,
          ERROR_CODES.SERVER_ERROR,
          "FRONTEND_URL not configured"
        );
      }

      const orderCode = Number(String(Date.now()).slice(-10));
      // Use different description based on invoiceType to help webhook distinguish
      // PayOS requires description max 25 characters
      const description =
        payment.invoiceType === "booking"
          ? `MC Booking ${String(orderCode).slice(-6)}`
          : `MC Service ${String(orderCode).slice(-6)}`;

      const payosPaymentData = {
        orderCode,
        amount: payment.total,
        description: description.substring(0, 25), // Ensure max 25 characters
        returnUrl: `${process.env.FRONTEND_URL}/manager/thanh-toan-dich-vu?status=success&orderCode=${orderCode}`,
        cancelUrl: `${process.env.FRONTEND_URL}/manager/thanh-toan-dich-vu?status=failed&orderCode=${orderCode}`,
      };

      const link = await payos.paymentRequests.create(payosPaymentData);

      // Update payment with PayOS info
      payment.payUrl = link.checkoutUrl;
      payment.pendingOrderCode = orderCode;
      payment.gateway = "payos";
      payment.method = "qr";
      payment.status = "initiated"; // Chờ thanh toán qua PayOS
      await payment.save();

      console.log(`✅ Manager created PayOS link for payment ${paymentId}`);

      return ok(res, {
        message: "Link thanh toán chuyển khoản đã được tạo",
        payment: {
          _id: payment._id,
          invoiceNumber: payment.invoiceNumber,
          total: payment.total,
          payUrl: payment.payUrl,
          orderCode: payment.pendingOrderCode,
        },
      });
    } catch (payosError) {
      console.error("Error creating PayOS payment link:", payosError);
      return fail(
        res,
        500,
        ERROR_CODES.SERVER_ERROR,
        `Failed to create payment link: ${payosError.message}`
      );
    }
  } catch (error) {
    console.error("Error creating bank transfer payment:", error);
    return fail(
      res,
      500,
      ERROR_CODES.SERVER_ERROR,
      "Lỗi khi tạo link thanh toán chuyển khoản"
    );
  }
}
