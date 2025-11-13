/* =======================================================
 * Medical Visit Controller
 * Quản lý phiên khám trong ngày (gom nhiều appointments)
 * ======================================================= */

import MedicalVisit from "../models/medicalVisit.model.js";
import Appointment from "../models/appointment.model.js";
import Doctor from "../models/doctor.model.js";
import DoctorTimeSlot from "../models/doctorTimeSlot.model.js";
import Specialization from "../models/specialization.model.js";
import Patient from "../models/patient.model.js";
import User from "../models/user.model.js";
import Review from "../models/review.model.js";
import Payment from "../models/payment.model.js";
import EducationLevelPrice from "../models/educationLevelPrice.model.js";
import { ok, fail } from "../utils/response.js";
import { ERROR_CODES } from "../constants/index.js";
import {
  createAppointmentNotification,
} from "../services/notificationService.js";

/**
 * Helper: Find or create the "self" patient profile for a user
 */
async function getSelfPatient(appUserId, { createIfMissing = false, populateUser = false } = {}) {
  if (!appUserId) return null;

  const applyPopulate = (query) =>
    populateUser ? query.populate("userId") : query;

  // 1) Try to find existing "self" profile
  let patient = await applyPopulate(
    Patient.findOne({ userId: appUserId, relationshipToOwner: "self" })
  );

  if (patient) {
    return patient;
  }

  // 2) Legacy data: missing relationshipToOwner -> upgrade to "self"
  let legacyPatient = await applyPopulate(
    Patient.findOne({
      userId: appUserId,
      $or: [
        { relationshipToOwner: { $exists: false } },
        { relationshipToOwner: null },
        { relationshipToOwner: "" },
      ],
    })
  );

  if (legacyPatient) {
    legacyPatient.relationshipToOwner = "self";
    await legacyPatient.save();
    return populateUser
      ? await applyPopulate(Patient.findById(legacyPatient._id))
      : legacyPatient;
  }

  if (!createIfMissing) {
    return null;
  }

  // 3) Create new "self" profile if allowed
  const user = await User.findById(appUserId).lean();
  if (!user) {
    return null;
  }

  const newPatient = new Patient({
    userId: appUserId,
    fullName: user.fullName || "Chưa cập nhật",
    phone: user.phone || "",
    relationshipToOwner: "self",
    isComplete: false,
  });
  await newPatient.save();

  return populateUser
    ? await applyPopulate(Patient.findById(newPatient._id))
    : newPatient;
}

/**
 * Tạo hoặc lấy phiên khám trong ngày cho bệnh nhân
 * GET /api/medical-visits/get-or-create
 */
export async function getOrCreateVisit(req, res) {
  try {
    const claims = req.user || {};
    const appUserId = claims.app_user_id;

    if (!appUserId) {
      return fail(
        res,
        401,
        ERROR_CODES.UNAUTHORIZED,
        "User ID not found in token"
      );
    }

    const { visitDate } = req.query; // Format: YYYY-MM-DD

    if (!visitDate) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "visitDate is required (format: YYYY-MM-DD)"
      );
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(visitDate)) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "Invalid date format. Use YYYY-MM-DD"
      );
    }

    // Get patient profile (self) or create if missing
    const patient = await getSelfPatient(appUserId, { createIfMissing: true });
    if (!patient) {
      return fail(
        res,
        404,
        ERROR_CODES.NOT_FOUND,
        "Patient profile not found"
      );
    }

    // Return temporary visit data (not saved to DB yet)
    // Just return visitDate and patientId for frontend to manage appointments locally
    return ok(res, {
      visit: {
        visitDate: visitDate,
        patientId: patient._id,
        status: "draft", // Temporary status, not in DB
        appointmentIds: [],
        totalFee: 0,
        paymentStatus: "unpaid",
      },
    });
  } catch (error) {
    console.error("❌ Error in getOrCreateVisit:", error);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, error.message || String(error));
  }
}

/**
 * Lấy danh sách bác sĩ và time slots khả dụng theo chuyên khoa trong ngày
 * GET /api/medical-visits/available-doctors
 */
export async function getAvailableDoctorsAndSlots(req, res) {
  try {
    const claims = req.user || {};
    const appUserId = claims.app_user_id;

    if (!appUserId) {
      return fail(
        res,
        401,
        ERROR_CODES.UNAUTHORIZED,
        "User ID not found in token"
      );
    }

    const { specializationId, visitDate } = req.query;

    if (!specializationId || !visitDate) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "specializationId and visitDate are required"
      );
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(visitDate)) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "Invalid date format. Use YYYY-MM-DD"
      );
    }

    // Parse date and create date range for the day
    const startDate = new Date(visitDate);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(visitDate);
    endDate.setHours(23, 59, 59, 999);

    // Find all doctors with this specialization
    const doctors = await Doctor.find({
      specializationIds: specializationId,
      isActive: true,
      isVerified: true,
    })
      .populate("userId", "fullName email phone")
      .populate("specializationIds", "name code")
      .populate("clinicDefaultId", "name address phone")
      .lean();

    // For each doctor, get available time slots
    const doctorsWithSlots = await Promise.all(
      doctors.map(async (doctor) => {
        // Get all time slots for this doctor on the specified date
        const timeSlots = await DoctorTimeSlot.find({
          doctorId: doctor._id,
          startAt: { $gte: startDate, $lte: endDate },
          status: { $in: ["available", "booked"] },
        })
          .sort({ startAt: 1 })
          .lean();

        // Get all appointments using these slots to check if they're really available
        const slotIds = timeSlots.map((slot) => slot._id);
        const appointments = await Appointment.find({
          slotId: { $in: slotIds },
          status: {
            $in: [
              "pending_doctor",
              "accepted",
              "in_progress",
              "done",
            ],
          },
        })
          .select("slotId status")
          .lean();

        // Create a set of booked slot IDs
        const bookedSlotIds = new Set(
          appointments.map((apt) => apt.slotId?.toString())
        );

        // Filter available slots
        const availableSlots = timeSlots
          .filter((slot) => !bookedSlotIds.has(slot._id.toString()))
          .map((slot) => ({
            _id: slot._id,
            startAt: slot.startAt,
            endAt: slot.endAt,
            startTime: slot.startAt.toTimeString().slice(0, 5), // HH:MM
            endTime: slot.endAt.toTimeString().slice(0, 5),
            timeRange: `${slot.startAt.toTimeString().slice(0, 5)} - ${slot.endAt
              .toTimeString()
              .slice(0, 5)}`,
            available: true,
          }));

        // Calculate rating from Review model if ratingAvg is null/undefined or if ratingCount is 0 but there are reviews
        let ratingAvg = doctor.ratingAvg !== undefined && doctor.ratingAvg !== null ? doctor.ratingAvg : 0;
        let ratingCount = doctor.ratingCount !== undefined && doctor.ratingCount !== null ? doctor.ratingCount : 0;
        
        // If rating is missing or count is 0, check if there are reviews in database
        if ((ratingAvg === 0 && ratingCount === 0) || ratingAvg === null || ratingAvg === undefined) {
          // Calculate rating from Review model
          const ratingStats = await Review.aggregate([
            { $match: { doctorId: doctor._id } },
            {
              $group: {
                _id: null,
                avgRating: { $avg: "$rating" },
                totalReviews: { $sum: 1 },
              },
            },
          ]);
          
          if (ratingStats.length > 0 && ratingStats[0].totalReviews > 0) {
            ratingAvg = Math.round(ratingStats[0].avgRating * 10) / 10; // Round to 1 decimal
            ratingCount = ratingStats[0].totalReviews;
          }
        }

        return {
          _id: doctor._id,
          fullName: doctor.fullName,
          licenseNo: doctor.licenseNo,
          yearsExperience: doctor.yearsExperience,
          bio: doctor.bio,
          avatarUrl: doctor.avatarUrl,
          specializationIds: doctor.specializationIds,
          clinicDefaultId: doctor.clinicDefaultId,
          educationLevel: doctor.educationLevel,
          ratingAvg: ratingAvg,
          ratingCount: ratingCount,
          availableSlots: availableSlots,
        };
      })
    );

    // Filter out doctors with no available slots
    const doctorsWithAvailableSlots = doctorsWithSlots.filter(
      (doctor) => doctor.availableSlots.length > 0
    );

    return ok(res, {
      doctors: doctorsWithAvailableSlots,
      specialization: await Specialization.findById(specializationId).lean(),
    });
  } catch (error) {
    console.error("❌ Error in getAvailableDoctorsAndSlots:", error);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, error.message || String(error));
  }
}

/**
 * Calculate payment summary for a list of appointments (pre-creation)
 * POST /api/medical-visits/calculate-payment-summary
 * POST /api/medical-visits/complete-planning (redirects here)
 * 
 * Flow mới:
 * 1. User chọn appointments và bấm "Hoàn tất"
 * 2. Gọi endpoint này để tính toán và hiển thị hóa đơn (KHÔNG tạo visit/appointments)
 * 3. User bấm "Xác nhận thanh toán" → Gọi createPaymentForVisit với appointments data
 * 4. Sau khi thanh toán thành công (webhook), mới tạo visit và appointments với status "pending_doctor"
 * 
 * Body: { visitDate, appointments: [{ doctorId, slotId, mode, clinicId, reason }] }
 */
export async function calculatePaymentSummary(req, res) {
  try {
    const claims = req.user || {};
    const appUserId = claims.app_user_id;

    if (!appUserId) {
      return fail(
        res,
        401,
        ERROR_CODES.UNAUTHORIZED,
        "User ID not found in token"
      );
    }

    const { visitDate, appointments } = req.body;

    console.log("calculatePaymentSummary - Request body:", {
      visitDate,
      appointmentsCount: appointments?.length,
      appointments: appointments,
    });

    if (!visitDate) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "visitDate is required"
      );
    }

    if (!appointments || !Array.isArray(appointments)) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "appointments must be an array"
      );
    }

    if (appointments.length === 0) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "At least one appointment is required"
      );
    }

    // Get patient profile (self)
    const patient = await getSelfPatient(appUserId, { createIfMissing: true });
    if (!patient) {
      return fail(
        res,
        404,
        ERROR_CODES.NOT_FOUND,
        "Patient profile not found"
      );
    }

    // Validate all appointments
    const appointmentData = [];
    for (const aptData of appointments) {
      const { doctorId, slotId, mode, clinicId, reason } = aptData;

      if (!doctorId || !slotId || !mode) {
        return fail(
          res,
          400,
          ERROR_CODES.BAD_REQUEST,
          "Each appointment must have doctorId, slotId, and mode"
        );
      }

      // Validate mode
      if (!["online", "offline"].includes(mode)) {
        return fail(
          res,
          400,
          ERROR_CODES.BAD_REQUEST,
          "Mode must be 'online' or 'offline'"
        );
      }

      // If offline mode, clinicId is required
      if (mode === "offline" && !clinicId) {
        return fail(
          res,
          400,
          ERROR_CODES.BAD_REQUEST,
          "clinicId is required for offline appointments"
        );
      }

      // Get slot information
      const slot = await DoctorTimeSlot.findById(slotId);
      if (!slot) {
        return fail(res, 404, ERROR_CODES.NOT_FOUND, `Time slot ${slotId} not found`);
      }

      // Check if slot belongs to the doctor
      if (slot.doctorId.toString() !== doctorId) {
        return fail(
          res,
          400,
          ERROR_CODES.BAD_REQUEST,
          `Slot does not belong to doctor ${doctorId}`
        );
      }

      // Check if slot is available (not already booked)
      const existingAppointment = await Appointment.findOne({
        slotId: slotId,
        status: {
          $in: ["pending_doctor", "accepted", "in_progress", "done"],
        },
      });

      if (existingAppointment) {
        return fail(
          res,
          409,
          ERROR_CODES.CONFLICT,
          `Time slot ${slotId} is already booked`
        );
      }

      // Ensure scheduledStart and scheduledEnd are proper Date objects
      let scheduledStart = slot.startAt;
      let scheduledEnd = slot.endAt;

      if (scheduledStart && !(scheduledStart instanceof Date)) {
        scheduledStart = new Date(scheduledStart);
      } else if (scheduledStart instanceof Date) {
        scheduledStart = new Date(scheduledStart.getTime());
      }

      if (scheduledEnd && !(scheduledEnd instanceof Date)) {
        scheduledEnd = new Date(scheduledEnd);
      } else if (scheduledEnd instanceof Date) {
        scheduledEnd = new Date(scheduledEnd.getTime());
      }

      appointmentData.push({
        doctorId,
        slotId,
        mode,
        clinicId: mode === "offline" ? clinicId : undefined,
        scheduledStart: scheduledStart,
        scheduledEnd: scheduledEnd,
        reason: reason || "",
      });
    }

    // Check for time conflicts between appointments
    const conflicts = [];
    for (let i = 0; i < appointmentData.length; i++) {
      for (let j = i + 1; j < appointmentData.length; j++) {
        const apt1 = appointmentData[i];
        const apt2 = appointmentData[j];
        const start1 = new Date(apt1.scheduledStart);
        const end1 = new Date(apt1.scheduledEnd);
        const start2 = new Date(apt2.scheduledStart);
        const end2 = new Date(apt2.scheduledEnd);

        if (
          (start1 >= start2 && start1 < end2) ||
          (end1 > start2 && end1 <= end2) ||
          (start1 <= start2 && end1 >= end2)
        ) {
          conflicts.push({
            appointment1: { doctorId: apt1.doctorId, time: apt1.scheduledStart },
            appointment2: { doctorId: apt2.doctorId, time: apt2.scheduledStart },
          });
        }
      }
    }

    // Calculate payment summary for all appointments
    const appointmentsWithDetails = await Promise.all(
      appointmentData.map(async (aptData) => {
        const doctor = await Doctor.findById(aptData.doctorId)
          .populate("specializationIds", "name")
          .lean();
        
        if (!doctor) {
          console.warn(`Doctor ${aptData.doctorId} not found`);
          return null;
        }

        return {
          ...aptData,
          doctor,
          slot: await DoctorTimeSlot.findById(aptData.slotId).lean(),
          clinic: aptData.clinicId
            ? await Clinic.findById(aptData.clinicId).lean()
            : null,
        };
      })
    );

    const validAppointments = appointmentsWithDetails.filter((apt) => apt !== null);

    const appointmentSummaries = await Promise.all(
      validAppointments.map(async (apt) => {
        const price = await calculateAppointmentBookingFee(apt);
        const specializationNames = apt.doctor?.specializationIds
          ?.map((s) => (typeof s === "object" ? s.name : s))
          .join(", ") || "";
        
        return {
          doctorId: apt.doctorId,
          doctorName: apt.doctor?.fullName || "Unknown Doctor",
          specializationName: specializationNames || "N/A",
          mode: apt.mode,
          scheduledStart: apt.scheduledStart,
          scheduledEnd: apt.scheduledEnd,
          clinicName: apt.clinic?.name || null,
          price: price,
          slotId: apt.slotId,
          clinicId: apt.clinicId,
          reason: apt.reason || "",
        };
      })
    );

    const totalAmount = appointmentSummaries.reduce(
      (sum, apt) => sum + apt.price,
      0
    );

    // Return payment summary (KHÔNG tạo visit/appointments trong DB)
    return ok(res, {
      visitDate,
      totalAmount,
      appointmentSummaries,
      appointmentsCount: appointmentSummaries.length,
      conflicts: conflicts.length > 0 ? conflicts : undefined,
      conflictWarning: conflicts.length > 0
        ? "Phát hiện xung đột trùng giờ trong các lịch hẹn"
        : undefined,
    });
  } catch (error) {
    console.error("❌ Error in calculatePaymentSummary:", error);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, error.message || String(error));
  }
}

/**
 * Hoàn thành planning và tính toán payment summary (NEW FLOW)
 * POST /api/medical-visits/complete-planning
 * 
 * Flow mới:
 * 1. User chọn appointments và bấm "Hoàn tất"
 * 2. Gọi calculatePaymentSummary để tính toán và hiển thị hóa đơn
 * 3. User bấm "Xác nhận thanh toán" → Gọi createPaymentForVisit với appointments data
 * 4. Sau khi thanh toán thành công (webhook), mới tạo visit và appointments với status "pending_doctor"
 */
export async function completePlanningAndCreateVisit(req, res) {
  // Redirect to calculatePaymentSummary (new flow)
  return calculatePaymentSummary(req, res);
}

/**
 * Thêm appointment vào visit (deprecated - now using completePlanningAndCreateVisit)
 * POST /api/medical-visits/add-appointment
 */
export async function addAppointmentToVisit(req, res) {
  try {
    const claims = req.user || {};
    const appUserId = claims.app_user_id;

    if (!appUserId) {
      return fail(
        res,
        401,
        ERROR_CODES.UNAUTHORIZED,
        "User ID not found in token"
      );
    }

    const { visitId, doctorId, slotId, mode, clinicId, reason } = req.body;

    if (!visitId || !doctorId || !slotId || !mode) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "visitId, doctorId, slotId, and mode are required"
      );
    }

    // Validate mode
    if (!["online", "offline"].includes(mode)) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "Mode must be 'online' or 'offline'"
      );
    }

    // If offline mode, clinicId is required
    if (mode === "offline" && !clinicId) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "clinicId is required for offline appointments"
      );
    }

    // Get patient profile
    const patient = await getSelfPatient(appUserId);
    if (!patient) {
      return fail(
        res,
        404,
        ERROR_CODES.NOT_FOUND,
        "Patient profile not found"
      );
    }

    // Get visit
    const visit = await MedicalVisit.findById(visitId);
    if (!visit) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Visit not found");
    }

    // Check if visit belongs to this patient
    if (visit.patientId.toString() !== patient._id.toString()) {
      return fail(
        res,
        403,
        ERROR_CODES.FORBIDDEN,
        "You don't have permission to add appointments to this visit"
      );
    }

    // Check if visit is in planning or pending_doctor status
    if (!["planning", "pending_doctor"].includes(visit.status)) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        `Cannot add appointments to visit with status: ${visit.status}`
      );
    }

    // Get slot information
    const slot = await DoctorTimeSlot.findById(slotId);
    if (!slot) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Time slot not found");
    }

    // Check if slot belongs to the doctor
    if (slot.doctorId.toString() !== doctorId) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "Slot does not belong to the specified doctor"
      );
    }

    // Check if slot is available (not already booked)
    const existingAppointment = await Appointment.findOne({
      slotId: slotId,
      status: {
        $in: ["pending_doctor", "accepted", "in_progress", "done"],
      },
    });

    if (existingAppointment) {
      return fail(
        res,
        409,
        ERROR_CODES.CONFLICT,
        "Time slot is already booked"
      );
    }

    // Check for time conflicts with existing appointments in the same visit
    const visitAppointments = await Appointment.find({
      _id: { $in: visit.appointmentIds || [] },
      status: {
        $in: ["pending_doctor", "accepted", "in_progress"],
      },
    }).lean();

    const hasConflict = visitAppointments.some((apt) => {
      const aptStart = new Date(apt.scheduledStart);
      const aptEnd = new Date(apt.scheduledEnd);
      const newStart = new Date(slot.startAt);
      const newEnd = new Date(slot.endAt);

      // Check if times overlap
      return (
        (newStart >= aptStart && newStart < aptEnd) ||
        (newEnd > aptStart && newEnd <= aptEnd) ||
        (newStart <= aptStart && newEnd >= aptEnd)
      );
    });

    // Create appointment
    const appointment = new Appointment({
      visitId: visitId,
      patientId: patient._id,
      doctorId: doctorId,
      slotId: slotId,
      mode: mode,
      clinicId: mode === "offline" ? clinicId : undefined,
      scheduledStart: slot.startAt,
      scheduledEnd: slot.endAt,
      status: "accepted",
      reason: reason,
    });

    await appointment.save();

    // Add appointment to visit
    visit.appointmentIds.push(appointment._id);
    await visit.save();

    return ok(
      res,
      {
        appointment: {
          _id: appointment._id,
          doctorId: appointment.doctorId,
          slotId: appointment.slotId,
          scheduledStart: appointment.scheduledStart,
          scheduledEnd: appointment.scheduledEnd,
          status: appointment.status,
          mode: appointment.mode,
          hasConflict: hasConflict,
        },
        visit: {
          _id: visit._id,
          status: visit.status,
          appointmentCount: visit.appointmentIds.length,
        },
        conflictWarning: hasConflict
          ? "This appointment conflicts with another appointment in the same visit. Consider rescheduling."
          : null,
      },
      {},
      201,
      hasConflict
        ? "Appointment added with time conflict warning"
        : "Appointment added successfully"
    );
  } catch (error) {
    console.error("❌ Error in addAppointmentToVisit:", error);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, error.message || String(error));
  }
}

/**
 * Hoàn thành planning và chuyển visit sang pending_doctor (deprecated)
 * POST /api/medical-visits/complete-planning
 * @deprecated Use completePlanningAndCreateVisit instead
 */
export async function completePlanning(req, res) {
  // This function is kept for backward compatibility but redirects to new endpoint
  return fail(
    res,
    400,
    ERROR_CODES.BAD_REQUEST,
    "This endpoint is deprecated. Use completePlanningAndCreateVisit instead."
  );
}

/**
 * Đồng bộ trạng thái visit dựa trên trạng thái các appointments
 * Internal helper function
 */
export async function syncVisitStatus(visitId) {
  try {
    const visit = await MedicalVisit.findById(visitId);
    if (!visit) {
      throw new Error("Visit not found");
    }

    const appointments = await Appointment.find({
      _id: { $in: visit.appointmentIds || [] },
    }).select("status");

    if (!appointments || appointments.length === 0) {
      // No appointments, set to planning
      visit.status = "planning";
      await visit.save();
      return visit;
    }

    const statuses = appointments.map((apt) => apt.status);
    const hasPending = statuses.includes("pending_doctor");
    const hasAccepted = statuses.includes("accepted");
    const hasRejected = statuses.includes("rejected");
    const hasInProgress = statuses.includes("in_progress");
    const hasDone = statuses.includes("done");
    const hasCancelled = statuses.includes("cancelled");

    // Determine visit status based on appointment statuses
    let newStatus;

    if (hasCancelled && !hasPending && !hasAccepted && !hasInProgress && !hasDone) {
      // All cancelled/rejected
      newStatus = "cancelled";
    } else if (hasInProgress) {
      // At least one appointment is in progress
      newStatus = "in_progress";
    } else if (hasDone && !hasPending && !hasAccepted && !hasInProgress && !hasRejected) {
      // All done
      newStatus = "completed";
    } else if (hasAccepted && !hasPending && !hasRejected && !hasInProgress && !hasDone) {
      // All accepted
      newStatus = "scheduled";
    } else if (hasRejected && (hasAccepted || hasPending)) {
      // Mixed: some rejected, some accepted/pending
      newStatus = "partial_rejected";
    } else if (hasPending) {
      // All or mostly pending
      newStatus = "pending_doctor";
    } else {
      // Default to current status or pending_doctor
      newStatus = visit.status || "pending_doctor";
    }

    // Update visit status if changed
    if (visit.status !== newStatus) {
      visit.status = newStatus;
      await visit.save();
    }

    return visit;
  } catch (error) {
    console.error("❌ Error in syncVisitStatus:", error);
    throw error;
  }
}

/**
 * Bác sĩ duyệt appointment
 * POST /api/medical-visits/doctor/approve-appointment
 */
export async function doctorApproveAppointment(req, res) {
  try {
    const userEmail = req.user?.email;
    if (!userEmail) {
      return fail(
        res,
        401,
        ERROR_CODES.UNAUTHORIZED,
        "User email not found in token"
      );
    }

    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "User not found");
    }

    const doctor = await Doctor.findOne({ userId: user._id });
    if (!doctor) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Doctor profile not found");
    }

    const { appointmentId, action, rejectReason } = req.body; // action: "accept" or "reject"

    if (!appointmentId || !action) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "appointmentId and action are required"
      );
    }

    if (!["accept", "reject"].includes(action)) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "action must be 'accept' or 'reject'"
      );
    }

    if (action === "reject" && !rejectReason) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "rejectReason is required when rejecting"
      );
    }

    // Get appointment
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Appointment not found");
    }

    // Check if appointment belongs to this doctor
    if (appointment.doctorId.toString() !== doctor._id.toString()) {
      return fail(
        res,
        403,
        ERROR_CODES.FORBIDDEN,
        "This appointment does not belong to you"
      );
    }

    // Check if appointment can be accepted/rejected
    // Note: pending_doctor status has been removed - all new appointments are auto-accepted
    // For backward compatibility, allow accepting pending_doctor appointments
    // For reject action, allow rejecting both pending_doctor and accepted appointments
    if (action === "accept") {
      // Accept action: only allow if status is pending_doctor (for backward compatibility with old data)
      if (appointment.status !== "pending_doctor") {
        return fail(
          res,
          400,
          ERROR_CODES.BAD_REQUEST,
          `Appointment is not pending. Current status: ${appointment.status}. New appointments are automatically accepted.`
        );
      }
      appointment.status = "accepted";
      appointment.acceptedBy = doctor._id;
    } else {
      // Reject action: allow rejecting pending_doctor or accepted appointments
      if (!["pending_doctor", "accepted"].includes(appointment.status)) {
        return fail(
          res,
          400,
          ERROR_CODES.BAD_REQUEST,
          `Appointment cannot be rejected. Current status: ${appointment.status}`
        );
      }
      appointment.status = "rejected";
      appointment.rejectedBy = doctor._id;
      appointment.rejectReason = rejectReason;
    }

    await appointment.save();

    // Sync visit status
    if (appointment.visitId) {
      await syncVisitStatus(appointment.visitId);
    }

    // Create notification for patient
    await createAppointmentNotification(
      appointmentId,
      action === "accept" ? "accepted" : "rejected",
      {
        rejectReason: action === "reject" ? rejectReason : undefined,
      }
    );

    return ok(res, {
      appointment: {
        _id: appointment._id,
        status: appointment.status,
        action: action,
      },
    });
  } catch (error) {
    console.error("❌ Error in doctorApproveAppointment:", error);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, error.message || String(error));
  }
}

/**
 * Xử lý xung đột trùng giờ và đề xuất slot thay thế
 * GET /api/medical-visits/check-conflicts
 */
export async function checkTimeConflicts(req, res) {
  try {
    const claims = req.user || {};
    const appUserId = claims.app_user_id;

    if (!appUserId) {
      return fail(
        res,
        401,
        ERROR_CODES.UNAUTHORIZED,
        "User ID not found in token"
      );
    }

    const { visitId } = req.query;

    if (!visitId) {
      return fail(res, 400, ERROR_CODES.BAD_REQUEST, "visitId is required");
    }

    // Get patient profile
    const patient = await getSelfPatient(appUserId);
    if (!patient) {
      return fail(
        res,
        404,
        ERROR_CODES.NOT_FOUND,
        "Patient profile not found"
      );
    }

    // Get visit with appointments
    const visit = await MedicalVisit.findById(visitId).populate(
      "appointmentIds",
      "doctorId slotId scheduledStart scheduledEnd status"
    );
    if (!visit) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Visit not found");
    }

    // Check if visit belongs to this patient
    if (visit.patientId.toString() !== patient._id.toString()) {
      return fail(
        res,
        403,
        ERROR_CODES.FORBIDDEN,
        "You don't have permission to view this visit"
      );
    }

    // Get all active appointments
    const appointments = await Appointment.find({
      _id: { $in: visit.appointmentIds || [] },
      status: {
        $in: ["pending_doctor", "accepted", "in_progress"],
      },
    })
      .populate("doctorId", "fullName")
      .populate("slotId", "startAt endAt")
      .lean();

    // Check for conflicts
    const conflicts = [];
    for (let i = 0; i < appointments.length; i++) {
      for (let j = i + 1; j < appointments.length; j++) {
        const apt1 = appointments[i];
        const apt2 = appointments[j];

        const start1 = new Date(apt1.scheduledStart);
        const end1 = new Date(apt1.scheduledEnd);
        const start2 = new Date(apt2.scheduledStart);
        const end2 = new Date(apt2.scheduledEnd);

        // Check if times overlap
        if (
          (start1 >= start2 && start1 < end2) ||
          (end1 > start2 && end1 <= end2) ||
          (start1 <= start2 && end1 >= end2)
        ) {
          conflicts.push({
            appointment1: {
              _id: apt1._id,
              doctor: apt1.doctorId.fullName,
              scheduledStart: apt1.scheduledStart,
              scheduledEnd: apt1.scheduledEnd,
            },
            appointment2: {
              _id: apt2._id,
              doctor: apt2.doctorId.fullName,
              scheduledStart: apt2.scheduledStart,
              scheduledEnd: apt2.scheduledEnd,
            },
          });
        }
      }
    }

    // For each conflict, suggest alternative slots
    const suggestions = await Promise.all(
      conflicts.map(async (conflict) => {
        // Get alternative slots for appointment1
        const apt1 = await Appointment.findById(conflict.appointment1._id)
          .populate("doctorId", "_id")
          .populate("slotId")
          .lean();

        if (!apt1 || !apt1.doctorId) {
          return {
            conflictedAppointment: conflict.appointment1._id,
            suggestedSlots: [],
          };
        }

        const doctorId = apt1.doctorId._id || apt1.doctorId;

        const visitDate = visit.visitDate;
        const startDate = new Date(visitDate);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(visitDate);
        endDate.setHours(23, 59, 59, 999);

        // Get available slots for the same doctor on the same day
        const allSlots = await DoctorTimeSlot.find({
          doctorId: doctorId,
          startAt: { $gte: startDate, $lte: endDate },
          status: { $in: ["available", "booked"] },
        })
          .sort({ startAt: 1 })
          .lean();

        const slotIds = allSlots.map((s) => s._id);
        const bookedAppointments = await Appointment.find({
          slotId: { $in: slotIds },
          status: {
            $in: ["pending_doctor", "accepted", "in_progress", "done"],
          },
        })
          .select("slotId")
          .lean();

        const bookedSlotIds = new Set(
          bookedAppointments.map((apt) => apt.slotId?.toString())
        );

        const availableSlots = allSlots
          .filter((slot) => !bookedSlotIds.has(slot._id.toString()))
          .filter((slot) => {
            // Exclude slots that conflict with other appointments in the visit
            const slotStart = new Date(slot.startAt);
            const slotEnd = new Date(slot.endAt);

            return !appointments.some((apt) => {
              if (apt._id.toString() === conflict.appointment1._id.toString()) {
                return false;
              }
              const aptStart = new Date(apt.scheduledStart);
              const aptEnd = new Date(apt.scheduledEnd);

              return (
                (slotStart >= aptStart && slotStart < aptEnd) ||
                (slotEnd > aptStart && slotEnd <= aptEnd) ||
                (slotStart <= aptStart && slotEnd >= aptEnd)
              );
            });
          })
          .map((slot) => ({
            _id: slot._id,
            startAt: slot.startAt,
            endAt: slot.endAt,
            startTime: slot.startAt.toTimeString().slice(0, 5),
            endTime: slot.endAt.toTimeString().slice(0, 5),
          }));

        return {
          conflictedAppointment: conflict.appointment1._id,
          suggestedSlots: availableSlots.slice(0, 5), // Return top 5 suggestions
        };
      })
    );

    return ok(res, {
      hasConflicts: conflicts.length > 0,
      conflicts: conflicts,
      suggestions: suggestions,
    });
  } catch (error) {
    console.error("❌ Error in checkTimeConflicts:", error);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, error.message || String(error));
  }
}

/**
 * Thay thế appointment bị từ chối
 * POST /api/medical-visits/replace-appointment
 */
export async function replaceRejectedAppointment(req, res) {
  try {
    const claims = req.user || {};
    const appUserId = claims.app_user_id;

    if (!appUserId) {
      return fail(
        res,
        401,
        ERROR_CODES.UNAUTHORIZED,
        "User ID not found in token"
      );
    }

    const { appointmentId, newSlotId, mode, clinicId } = req.body;

    if (!appointmentId || !newSlotId || !mode) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "appointmentId, newSlotId, and mode are required"
      );
    }

    // Get patient profile
    const patient = await getSelfPatient(appUserId);
    if (!patient) {
      return fail(
        res,
        404,
        ERROR_CODES.NOT_FOUND,
        "Patient profile not found"
      );
    }

    // Get original appointment
    const originalAppointment = await Appointment.findById(appointmentId);
    if (!originalAppointment) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Appointment not found");
    }

    // Check if appointment belongs to this patient
    if (originalAppointment.patientId.toString() !== patient._id.toString()) {
      return fail(
        res,
        403,
        ERROR_CODES.FORBIDDEN,
        "You don't have permission to replace this appointment"
      );
    }

    // Check if appointment is rejected
    if (originalAppointment.status !== "rejected") {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        `Appointment is not rejected. Current status: ${originalAppointment.status}`
      );
    }

    // Get new slot
    const newSlot = await DoctorTimeSlot.findById(newSlotId);
    if (!newSlot) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "New time slot not found");
    }

    // Check if new slot is available
    const existingAppointment = await Appointment.findOne({
      slotId: newSlotId,
      status: {
        $in: ["pending_doctor", "accepted", "in_progress", "done"],
      },
    });

    if (existingAppointment) {
      return fail(
        res,
        409,
        ERROR_CODES.CONFLICT,
        "New time slot is already booked"
      );
    }

    // Check if new slot belongs to the same doctor
    if (newSlot.doctorId.toString() !== originalAppointment.doctorId.toString()) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "New slot must belong to the same doctor"
      );
    }

    // Cancel original appointment
    originalAppointment.status = "cancelled";
    originalAppointment.cancelledAt = new Date();
    originalAppointment.cancelledBy = appUserId;
    originalAppointment.cancelReason = "Replaced due to rejection";
    await originalAppointment.save();

    // Create new appointment
    const newAppointment = new Appointment({
      visitId: originalAppointment.visitId,
      patientId: patient._id,
      doctorId: originalAppointment.doctorId,
      slotId: newSlotId,
      mode: mode,
      clinicId: mode === "offline" ? clinicId : undefined,
      scheduledStart: newSlot.startAt,
      scheduledEnd: newSlot.endAt,
      status: "accepted",
      reason: originalAppointment.reason,
    });

    await newAppointment.save();

    // Update visit appointments
    if (originalAppointment.visitId) {
      const visit = await MedicalVisit.findById(originalAppointment.visitId);
      if (visit) {
        // Remove old appointment, add new one
        visit.appointmentIds = visit.appointmentIds.filter(
          (id) => id.toString() !== appointmentId
        );
        visit.appointmentIds.push(newAppointment._id);
        await visit.save();

        // Sync visit status
        await syncVisitStatus(visit._id);
      }
    }

    return ok(res, {
      originalAppointment: {
        _id: originalAppointment._id,
        status: originalAppointment.status,
      },
      newAppointment: {
        _id: newAppointment._id,
        doctorId: newAppointment.doctorId,
        slotId: newAppointment.slotId,
        scheduledStart: newAppointment.scheduledStart,
        scheduledEnd: newAppointment.scheduledEnd,
        status: newAppointment.status,
      },
    });
  } catch (error) {
    console.error("❌ Error in replaceRejectedAppointment:", error);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, error.message || String(error));
  }
}

/**
 * Bác sĩ: Lấy danh sách appointments cần duyệt
 * GET /api/medical-visits/doctor/pending-appointments
 */
export async function getDoctorPendingAppointments(req, res) {
  try {
    const userEmail = req.user?.email;
    if (!userEmail) {
      return fail(
        res,
        401,
        ERROR_CODES.UNAUTHORIZED,
        "User email not found in token"
      );
    }

    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "User not found");
    }

    const doctor = await Doctor.findOne({ userId: user._id });
    if (!doctor) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Doctor profile not found");
    }

    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // Get pending appointments for this doctor
    const appointments = await Appointment.find({
      doctorId: doctor._id,
      status: "pending_doctor",
    })
      .populate("patientId", "fullName dob gender phone")
      .populate("visitId", "visitDate status")
      .populate("slotId", "startAt endAt")
      .populate("clinicId", "name address")
      .sort({ scheduledStart: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Appointment.countDocuments({
      doctorId: doctor._id,
      status: "pending_doctor",
    });

    return ok(res, {
      appointments: appointments.map((apt) => ({
        _id: apt._id,
        patient: {
          _id: apt.patientId._id,
          fullName: apt.patientId.fullName,
          dob: apt.patientId.dob,
          gender: apt.patientId.gender,
          phone: apt.patientId.phone,
        },
        visit: apt.visitId
          ? {
              _id: apt.visitId._id,
              visitDate: apt.visitId.visitDate,
              status: apt.visitId.status,
            }
          : null,
        scheduledStart: apt.scheduledStart,
        scheduledEnd: apt.scheduledEnd,
        status: apt.status,
        mode: apt.mode,
        clinic: apt.clinicId
          ? {
              _id: apt.clinicId._id,
              name: apt.clinicId.name,
              address: apt.clinicId.address,
            }
          : null,
        reason: apt.reason,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("❌ Error in getDoctorPendingAppointments:", error);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, error.message || String(error));
  }
}

/**
 * Bệnh nhân: Hủy appointment trong visit
 * POST /api/medical-visits/cancel-appointment
 */
export async function cancelAppointmentInVisit(req, res) {
  try {
    const claims = req.user || {};
    const appUserId = claims.app_user_id;

    if (!appUserId) {
      return fail(
        res,
        401,
        ERROR_CODES.UNAUTHORIZED,
        "User ID not found in token"
      );
    }

    const { appointmentId, cancelReason } = req.body;

    if (!appointmentId) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "appointmentId is required"
      );
    }

    // Get patient profile
    const patient = await getSelfPatient(appUserId);
    if (!patient) {
      return fail(
        res,
        404,
        ERROR_CODES.NOT_FOUND,
        "Patient profile not found"
      );
    }

    // Get appointment
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Appointment not found");
    }

    // Check if appointment belongs to this patient
    if (appointment.patientId.toString() !== patient._id.toString()) {
      return fail(
        res,
        403,
        ERROR_CODES.FORBIDDEN,
        "You don't have permission to cancel this appointment"
      );
    }

    // Check if appointment can be cancelled
    if (!["pending_doctor", "accepted"].includes(appointment.status)) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        `Cannot cancel appointment with status: ${appointment.status}`
      );
    }

    // Cancel appointment
    appointment.status = "cancelled";
    appointment.cancelledAt = new Date();
    appointment.cancelledBy = appUserId;
    appointment.cancelReason = cancelReason || "Cancelled by patient";
    await appointment.save();

    // Sync visit status
    if (appointment.visitId) {
      await syncVisitStatus(appointment.visitId);
    }

    return ok(res, {
      appointment: {
        _id: appointment._id,
        status: appointment.status,
        cancelledAt: appointment.cancelledAt,
      },
    });
  } catch (error) {
    console.error("❌ Error in cancelAppointmentInVisit:", error);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, error.message || String(error));
  }
}

/**
 * Bệnh nhân: Lấy danh sách tất cả visits
 * GET /api/medical-visits
 */
export async function getPatientVisits(req, res) {
  try {
    const claims = req.user || {};
    const appUserId = claims.app_user_id;

    if (!appUserId) {
      return fail(
        res,
        401,
        ERROR_CODES.UNAUTHORIZED,
        "User ID not found in token"
      );
    }

    const { page = 1, limit = 20, status } = req.query;
    const skip = (page - 1) * limit;

    // Get patient profile
    const patient = await getSelfPatient(appUserId);
    if (!patient) {
      return fail(
        res,
        404,
        ERROR_CODES.NOT_FOUND,
        "Patient profile not found"
      );
    }

    // Build query
    const query = { patientId: patient._id };
    if (status) {
      query.status = status;
    }

    // Get visits
    const visits = await MedicalVisit.find(query)
      .sort({ visitDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await MedicalVisit.countDocuments(query);

    // Get appointment counts for each visit
    const visitsWithAppointmentCounts = await Promise.all(
      visits.map(async (visit) => {
        const appointmentCount = await Appointment.countDocuments({
          _id: { $in: visit.appointmentIds || [] },
        });

        return {
          _id: visit._id,
          visitDate: visit.visitDate,
          status: visit.status,
          appointmentCount,
          totalFee: visit.totalFee,
          paymentStatus: visit.paymentStatus,
          createdAt: visit.createdAt,
          updatedAt: visit.updatedAt,
        };
      })
    );

    return ok(res, {
      visits: visitsWithAppointmentCounts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("❌ Error in getPatientVisits:", error);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, error.message || String(error));
  }
}

/**
 * Lấy chi tiết visit với tất cả appointments
 * GET /api/medical-visits/:visitId
 */
export async function getVisitDetails(req, res) {
  try {
    const claims = req.user || {};
    const appUserId = claims.app_user_id;

    if (!appUserId) {
      return fail(
        res,
        401,
        ERROR_CODES.UNAUTHORIZED,
        "User ID not found in token"
      );
    }

    const { visitId } = req.params;

    // Get patient profile
    const patient = await getSelfPatient(appUserId);
    if (!patient) {
      return fail(
        res,
        404,
        ERROR_CODES.NOT_FOUND,
        "Patient profile not found"
      );
    }

    // Get visit
    const visit = await MedicalVisit.findById(visitId);
    if (!visit) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Visit not found");
    }

    // Check if visit belongs to this patient
    if (visit.patientId.toString() !== patient._id.toString()) {
      return fail(
        res,
        403,
        ERROR_CODES.FORBIDDEN,
        "You don't have permission to view this visit"
      );
    }

    // Get all appointments with full details
    const appointments = await Appointment.find({
      _id: { $in: visit.appointmentIds || [] },
    })
      .populate({
        path: "doctorId",
        select: "fullName specializationIds avatarUrl ratingAvg ratingCount",
        populate: {
          path: "specializationIds",
          select: "name code",
        },
      })
      .populate("slotId", "startAt endAt")
      .populate("clinicId", "name address phone")
      .sort({ scheduledStart: 1 })
      .lean();

    return ok(res, {
      visit: {
        _id: visit._id,
        visitDate: visit.visitDate,
        status: visit.status,
        totalFee: visit.totalFee,
        paymentStatus: visit.paymentStatus,
        createdAt: visit.createdAt,
        updatedAt: visit.updatedAt,
      },
      appointments: appointments.map((apt) => ({
        _id: apt._id,
        doctor: {
          _id: apt.doctorId._id,
          fullName: apt.doctorId.fullName,
          specializationIds: apt.doctorId.specializationIds,
          avatarUrl: apt.doctorId.avatarUrl,
          ratingAvg: apt.doctorId.ratingAvg,
          ratingCount: apt.doctorId.ratingCount,
        },
        scheduledStart: apt.scheduledStart,
        scheduledEnd: apt.scheduledEnd,
        status: apt.status,
        mode: apt.mode,
        clinic: apt.clinicId
          ? {
              _id: apt.clinicId._id,
              name: apt.clinicId.name,
              address: apt.clinicId.address,
              phone: apt.clinicId.phone,
            }
          : null,
        reason: apt.reason,
        rejectReason: apt.rejectReason,
      })),
    });
  } catch (error) {
    console.error("❌ Error in getVisitDetails:", error);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, error.message || String(error));
  }
}

/**
 * Helper function: Tính giá booking fee cho một appointment
 * @param {Object} appointment - Appointment object với doctorId, mode, scheduledStart
 * @returns {Promise<Number>} - Giá booking fee (VND)
 */
async function calculateAppointmentBookingFee(appointment) {
  try {
    // Get doctorId (có thể là object hoặc ID)
    const doctorId = appointment.doctorId?._id || appointment.doctorId;
    if (!doctorId) {
      console.warn(`Appointment ${appointment._id} không có doctorId`);
      return 0;
    }

    // Get doctor với education level
    const doctor = await Doctor.findById(doctorId).lean();
    if (!doctor) {
      console.warn(`Doctor ${doctorId} không tồn tại`);
      return 0;
    }

    if (!doctor.educationLevel) {
      console.warn(`Doctor ${doctorId} không có education level, sử dụng giá mặc định 0`);
      return 0;
    }

    // Get mode
    const mode = appointment.mode;
    if (!mode) {
      console.warn(`Appointment ${appointment._id} không có mode`);
      return 0;
    }

    // Get pricing based on education level and mode
    const priceRecord = await EducationLevelPrice.findOne({
      educationLevel: doctor.educationLevel,
      mode: mode,
      isActive: true,
    }).lean();

    if (!priceRecord) {
      console.warn(`Không tìm thấy giá cho educationLevel=${doctor.educationLevel}, mode=${mode}`);
      return 0;
    }

    // Check if scheduledStart is weekend (Saturday = 6, Sunday = 0)
    if (!appointment.scheduledStart) {
      console.warn(`Appointment ${appointment._id} không có scheduledStart`);
      return priceRecord.weekdayPrice; // Default to weekday price
    }

    const scheduledDate = new Date(appointment.scheduledStart);
    if (isNaN(scheduledDate.getTime())) {
      console.warn(`Appointment ${appointment._id} có scheduledStart không hợp lệ: ${appointment.scheduledStart}`);
      return priceRecord.weekdayPrice; // Default to weekday price
    }

    const dayOfWeek = scheduledDate.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Return appropriate price
    return isWeekend ? priceRecord.weekendPrice : priceRecord.weekdayPrice;
  } catch (error) {
    console.error("Error calculating appointment booking fee:", error);
    return 0;
  }
}

/**
 * Get payment summary for medical visit
 * GET /api/medical-visits/:visitId/payment-summary
 * 
 * DEPRECATED for new flow: Sử dụng calculatePaymentSummary thay vì endpoint này
 * Endpoint này vẫn hoạt động cho các visit đã tồn tại (backward compatibility)
 */
export async function getPaymentSummary(req, res) {
  try {
    console.log("[getPaymentSummary] Request received:", {
      visitId: req.params.visitId,
      path: req.path,
      url: req.url,
    });

    const claims = req.user || {};
    const appUserId = claims.app_user_id;

    if (!appUserId) {
      return fail(
        res,
        401,
        ERROR_CODES.UNAUTHORIZED,
        "User ID not found in token"
      );
    }

    const { visitId } = req.params;
    
    if (!visitId) {
      console.error("[getPaymentSummary] visitId is missing");
      return fail(res, 400, ERROR_CODES.BAD_REQUEST, "visitId is required");
    }

    // Get patient profile
    const patient = await getSelfPatient(appUserId);
    if (!patient) {
      return fail(
        res,
        404,
        ERROR_CODES.NOT_FOUND,
        "Patient profile not found"
      );
    }

    // Get visit
    const visit = await MedicalVisit.findById(visitId);
    if (!visit) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Visit not found");
    }

    // Check if visit belongs to this patient
    if (visit.patientId.toString() !== patient._id.toString()) {
      return fail(
        res,
        403,
        ERROR_CODES.FORBIDDEN,
        "You don't have permission to view this visit"
      );
    }

    // Get all appointments với status = accepted
    const appointments = await Appointment.find({
      _id: { $in: visit.appointmentIds || [] },
      status: "accepted", // Chỉ tính các appointments đã được chấp nhận
    })
      .populate("doctorId", "fullName educationLevel")
      .populate("clinicId", "name")
      .lean();

    // Get all appointments to count statuses
    const allAppointments = await Appointment.find({
      _id: { $in: visit.appointmentIds || [] },
    }).select("status").lean();
    
    const pendingCount = allAppointments.filter(
      (apt) => apt.status === "pending_doctor"
    ).length;
    const rejectedCount = allAppointments.filter(
      (apt) => apt.status === "rejected"
    ).length;

    // If no accepted appointments, return summary with pending info
    if (appointments.length === 0) {
      return ok(res, {
        totalAmount: 0,
        acceptedAppointments: [],
        acceptedCount: 0,
        pendingCount,
        rejectedCount,
        totalCount: visit.appointmentIds?.length || 0,
        message: "Chưa có appointments được chấp nhận để thanh toán",
      });
    }

    // Calculate price for each appointment
    // Need to populate specializationIds for appointments
    const appointmentsWithDetails = await Promise.all(
      appointments.map(async (apt) => {
        const aptWithDoctor = await Appointment.findById(apt._id)
          .populate("doctorId", "fullName specializationIds")
          .populate({
            path: "doctorId",
            populate: {
              path: "specializationIds",
              select: "name",
            },
          })
          .populate("clinicId", "name")
          .lean();
        return aptWithDoctor || apt;
      })
    );

    const appointmentSummaries = await Promise.all(
      appointmentsWithDetails.map(async (apt) => {
        const price = await calculateAppointmentBookingFee(apt);
        const specializationNames = apt.doctorId?.specializationIds
          ?.map((s) => (typeof s === "object" ? s.name : s))
          .join(", ") || "";
        
        return {
          _id: apt._id,
          appointmentId: apt._id,
          doctorId: apt.doctorId._id,
          doctor: {
            _id: apt.doctorId._id,
            fullName: apt.doctorId.fullName,
          },
          doctorName: apt.doctorId.fullName,
          specializationName: specializationNames || "N/A",
          mode: apt.mode,
          scheduledStart: apt.scheduledStart,
          scheduledEnd: apt.scheduledEnd,
          clinicName: apt.clinicId?.name || null,
          bookingFee: price,
          price: price,
        };
      })
    );

    // Calculate total
    const totalAmount = appointmentSummaries.reduce(
      (sum, apt) => sum + apt.price,
      0
    );

    return ok(res, {
      totalAmount,
      acceptedAppointments: appointmentSummaries,
      acceptedCount: appointments.length,
      pendingCount,
      rejectedCount,
      totalCount: visit.appointmentIds?.length || 0,
    });
  } catch (error) {
    console.error("❌ Error in getPaymentSummary:", error);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, error.message || String(error));
  }
}

/**
 * Create payment for existing medical visit (BACKWARD COMPATIBILITY)
 * POST /api/medical-visits/:visitId/create-payment
 * 
 * Flow cũ: Visit và appointments đã tồn tại, chỉ tạo payment cho các appointments đã được chấp nhận
 */
async function createPaymentForExistingVisit(req, res, visitId) {
  try {
    const claims = req.user || {};
    const appUserId = claims.app_user_id;

    // Get patient profile
    const patient = await Patient.findOne({ userId: appUserId }).populate("userId");
    if (!patient) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Patient profile not found");
    }

    // Get visit
    const visit = await MedicalVisit.findById(visitId);
    if (!visit) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Visit not found");
    }

    // Check if visit belongs to this patient
    if (visit.patientId.toString() !== patient._id.toString()) {
      return fail(
        res,
        403,
        ERROR_CODES.FORBIDDEN,
        "You don't have permission to create payment for this visit"
      );
    }

    // Get all appointments với status = accepted
    const appointments = await Appointment.find({
      _id: { $in: visit.appointmentIds || [] },
      status: "accepted", // Chỉ tính các appointments đã được chấp nhận
    })
      .populate("doctorId", "fullName specializationIds")
      .populate({
        path: "doctorId",
        populate: {
          path: "specializationIds",
          select: "name",
        },
      })
      .populate("clinicId", "name")
      .lean();

    if (appointments.length === 0) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "Không có appointments được chấp nhận để thanh toán"
      );
    }

    // Calculate prices and create payment items
    const appointmentItems = await Promise.all(
      appointments.map(async (apt) => {
        const price = await calculateAppointmentBookingFee(apt);
        const specializationNames = apt.doctorId?.specializationIds
          ?.map((s) => (typeof s === "object" ? s.name : s))
          .join(", ") || "";
        const modeText = apt.mode === "online" ? "Trực tuyến" : "Tại phòng khám";
        const clinicText = apt.clinicId?.name ? ` - ${apt.clinicId.name}` : "";
        const timeText = apt.scheduledStart
          ? ` (${new Date(apt.scheduledStart).toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            })})`
          : "";
        
        return {
          description: `${apt.doctorId.fullName}${specializationNames ? ` - ${specializationNames}` : ""} (${modeText}${clinicText})${timeText}`,
          quantity: 1,
          unitPrice: price,
          lineTotal: price,
        };
      })
    );

    // Calculate total
    const totalAmount = appointmentItems.reduce(
      (sum, item) => sum + item.lineTotal,
      0
    );

    if (totalAmount === 0) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Tổng số tiền thanh toán là 0"
      );
    }

    // Get gateway and method from request body
    const { gateway = "payos", method = "qr" } = req.body;

    // Validate gateway
    if (!["payos", "vnpay", "momo"].includes(gateway)) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Gateway must be payos, vnpay, or momo"
      );
    }

    // Create payment record với medicalVisitId và appointmentIds (visit đã tồn tại)
    const orderCode = Number(String(Date.now()).slice(-10));
    const invoiceNumber = `INV-VISIT-${orderCode}`;

    // Get first appointment for billFrom
    const firstAppointment = appointments[0];
    const firstDoctor = firstAppointment.doctorId;

    const payment = new Payment({
      medicalVisitId: visit._id,
      appointmentIds: appointments.map((apt) => apt._id),
      invoiceType: "booking",
      invoiceNumber,
      currency: "VND",
      issueDate: new Date(),
      billTo: {
        patientId: patient._id,
        name: patient.fullName || patient.userId?.fullName || "Unknown",
        email: patient.userId?.email,
        phone: patient.userId?.phoneNumber || patient.phone,
      },
      billFrom: {
        doctorId: firstDoctor._id,
        clinicId: firstAppointment.clinicId?._id || null,
        doctorName: firstDoctor.fullName || "MedConnect",
        clinicName: firstAppointment.clinicId?.name || "MedConnect Clinic",
      },
      items: appointmentItems,
      subtotal: totalAmount,
      discount: 0,
      total: totalAmount,
      gateway: gateway,
      method: method,
      status: "initiated", // Will be updated to captured after payment
      amountPaid: 0,
      orderCode: orderCode,
      pendingOrderCode: orderCode, // Temporary, will be cleared after payment
    });

    await payment.save();

    // Create PayOS payment link (if gateway is payos)
    if (gateway === "payos") {
      try {
        const { createPayosPaymentLink } = await import("../services/payos.service.js");
        const payosResult = await createPayosPaymentLink(appUserId, {
          medicalVisitId: visit._id.toString(), // Pass medicalVisitId for existing visit
          amount: totalAmount,
          description: `MedConnect Visit ${String(orderCode).slice(-8)}`,
        });

        // Update payment with payUrl
        payment.payUrl = payosResult.payUrl;
        await payment.save();

        return ok(res, {
          paymentId: payment._id,
          payUrl: payosResult.payUrl,
          orderCode: orderCode,
          totalAmount: totalAmount,
          appointmentsCount: appointments.length,
          visitId: visit._id,
        });
      } catch (payosError) {
        console.error("Error creating PayOS payment link:", payosError);
        // Delete payment record if PayOS link creation fails
        await Payment.findByIdAndDelete(payment._id);
        return fail(
          res,
          500,
          ERROR_CODES.SERVER_ERROR,
          `Không thể tạo link thanh toán: ${payosError.message}`
        );
      }
    } else {
      // For other gateways, return payment info (will be handled separately)
      return ok(res, {
        paymentId: payment._id,
        orderCode: orderCode,
        totalAmount: totalAmount,
        appointmentsCount: appointments.length,
        visitId: visit._id,
        message: `Payment created for ${gateway}. Payment link will be generated separately.`,
      });
    }
  } catch (error) {
    console.error("❌ Error in createPaymentForExistingVisit:", error);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, error.message || String(error));
  }
}

/**
 * Create payment for medical visit (NEW FLOW: pre-payment)
 * POST /api/medical-visits/create-payment
 * 
 * Flow mới:
 * 1. Nhận visitDate và appointments data từ request body (chưa tạo visit/appointments)
 * 2. Validate appointments data
 * 3. Tính toán payment summary
 * 4. Tạo Payment record với appointmentData (lưu appointments data để tạo sau khi thanh toán thành công)
 * 5. Tạo PayOS payment link
 * 6. Return payUrl để redirect user đến PayOS
 * 7. Sau khi thanh toán thành công (webhook), tạo visit và appointments từ payment.appointmentData
 * 
 * BACKWARD COMPATIBILITY:
 * POST /api/medical-visits/:visitId/create-payment
 * - Nếu có visitId trong params, xử lý flow cũ (visit đã tồn tại)
 */
export async function createPaymentForVisit(req, res) {
  try {
    const claims = req.user || {};
    const appUserId = claims.app_user_id;

    if (!appUserId) {
      return fail(
        res,
        401,
        ERROR_CODES.UNAUTHORIZED,
        "User ID not found in token"
      );
    }

    // BACKWARD COMPATIBILITY: Check if visitId is in params (old flow)
    const { visitId } = req.params;
    if (visitId) {
      // Old flow: Visit already exists, create payment for accepted appointments
      return await createPaymentForExistingVisit(req, res, visitId);
    }

    // NEW FLOW: Pre-payment (visit/appointments not created yet)
    const { visitDate, appointments, gateway = "payos", method = "qr" } = req.body;

    // Validate gateway
    if (!["payos", "vnpay", "momo"].includes(gateway)) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Gateway must be payos, vnpay, or momo"
      );
    }

    if (!visitDate) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "visitDate is required"
      );
    }

    if (!appointments || !Array.isArray(appointments) || appointments.length === 0) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "appointments array is required and must not be empty"
      );
    }

    // Get patient profile
    const patient = await Patient.findOne({ userId: appUserId }).populate("userId");
    if (!patient) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Patient profile not found");
    }

    // Validate all appointments and prepare appointmentData
    const appointmentData = [];
    for (const aptData of appointments) {
      const { doctorId, slotId, mode, clinicId, reason, patientId } = aptData;

      if (!doctorId || !slotId || !mode) {
        return fail(
          res,
          400,
          ERROR_CODES.BAD_REQUEST,
          "Each appointment must have doctorId, slotId, and mode"
        );
      }

      // Validate mode
      if (!["online", "offline"].includes(mode)) {
        return fail(
          res,
          400,
          ERROR_CODES.BAD_REQUEST,
          "Mode must be 'online' or 'offline'"
        );
      }

      // If offline mode, clinicId is required
      if (mode === "offline" && !clinicId) {
        return fail(
          res,
          400,
          ERROR_CODES.BAD_REQUEST,
          "clinicId is required for offline appointments"
        );
      }

      // Get slot information
      const slot = await DoctorTimeSlot.findById(slotId);
      if (!slot) {
        return fail(res, 404, ERROR_CODES.NOT_FOUND, `Time slot ${slotId} not found`);
      }

      // Check if slot belongs to the doctor
      if (slot.doctorId.toString() !== doctorId) {
        return fail(
          res,
          400,
          ERROR_CODES.BAD_REQUEST,
          `Slot does not belong to doctor ${doctorId}`
        );
      }

      // Check if slot is available (not already booked)
      const existingAppointment = await Appointment.findOne({
        slotId: slotId,
        status: {
          $in: ["pending_doctor", "accepted", "in_progress", "done"],
        },
      });

      if (existingAppointment) {
        return fail(
          res,
          409,
          ERROR_CODES.CONFLICT,
          `Time slot ${slotId} is already booked`
        );
      }

      // Ensure scheduledStart and scheduledEnd are proper Date objects
      let scheduledStart = slot.startAt;
      let scheduledEnd = slot.endAt;

      if (scheduledStart && !(scheduledStart instanceof Date)) {
        scheduledStart = new Date(scheduledStart);
      } else if (scheduledStart instanceof Date) {
        scheduledStart = new Date(scheduledStart.getTime());
      }

      if (scheduledEnd && !(scheduledEnd instanceof Date)) {
        scheduledEnd = new Date(scheduledEnd);
      } else if (scheduledEnd instanceof Date) {
        scheduledEnd = new Date(scheduledEnd.getTime());
      }

      // If patientId is provided (booking for family), verify ownership
      let validatedPatientId = undefined;
      if (patientId) {
        const familyPatient = await Patient.findOne({
          _id: patientId,
          userId: appUserId,
          relationshipToOwner: { $ne: "self" },
        }).lean();
        if (!familyPatient) {
          return fail(
            res,
            403,
            ERROR_CODES.UNAUTHORIZED,
            "Provided patientId does not belong to current user"
          );
        }
        validatedPatientId = familyPatient._id;
      }

      appointmentData.push({
        doctorId,
        slotId,
        mode,
        clinicId: mode === "offline" ? clinicId : undefined,
        scheduledStart: scheduledStart,
        scheduledEnd: scheduledEnd,
        reason: reason || "",
        // Persist patientId per appointment (optional)
        patientId: validatedPatientId,
      });
    }

    // Calculate prices for each appointment
    const appointmentsWithDetails = await Promise.all(
      appointmentData.map(async (aptData) => {
        // Get doctor info for price calculation
        const doctor = await Doctor.findById(aptData.doctorId)
          .populate("specializationIds", "name")
          .lean();
        
        if (!doctor) {
          console.warn(`Doctor ${aptData.doctorId} not found`);
          return null;
        }

        return {
          ...aptData,
          doctor,
          clinic: aptData.clinicId
            ? await Clinic.findById(aptData.clinicId).lean()
            : null,
        };
      })
    );

    // Filter out null appointments
    const validAppointments = appointmentsWithDetails.filter((apt) => apt !== null);

    if (validAppointments.length === 0) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "Không có appointments hợp lệ để thanh toán"
      );
    }

    // Calculate prices and create payment items
    const appointmentItems = await Promise.all(
      validAppointments.map(async (apt) => {
        const price = await calculateAppointmentBookingFee(apt);
        const doctorName = apt.doctor?.fullName || "Unknown Doctor";
        const specializationNames = apt.doctor?.specializationIds
          ?.map((s) => (typeof s === "object" ? s.name : s))
          .join(", ") || "";
        const modeText = apt.mode === "online" ? "Trực tuyến" : "Tại phòng khám";
        const clinicText = apt.clinic?.name ? ` - ${apt.clinic.name}` : "";
        const timeText = apt.scheduledStart
          ? ` (${new Date(apt.scheduledStart).toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            })})`
          : "";
        
        return {
          description: `${doctorName}${specializationNames ? ` - ${specializationNames}` : ""} (${modeText}${clinicText})${timeText}`,
          quantity: 1,
          unitPrice: price,
          lineTotal: price,
        };
      })
    );

    // Calculate total
    const totalAmount = appointmentItems.reduce(
      (sum, item) => sum + item.lineTotal,
      0
    );

    if (totalAmount === 0) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Tổng số tiền thanh toán là 0"
      );
    }

    // Create payment record với appointmentData (chưa tạo visit/appointments)
    const orderCode = Number(String(Date.now()).slice(-10));
    const invoiceNumber = `INV-VISIT-${orderCode}`;

    // Get first doctor for billFrom
    const firstAppointment = validAppointments[0];
    const firstDoctor = firstAppointment.doctor;

    // Log để debug
    console.log("🔍 Creating payment with appointmentData:", {
      appointmentDataLength: appointmentData.length,
      appointmentData: appointmentData.map(apt => ({
        doctorId: apt.doctorId?.toString(),
        slotId: apt.slotId?.toString(),
        mode: apt.mode,
        scheduledStart: apt.scheduledStart,
      })),
      totalAmount,
      invoiceNumber,
    });

    // Determine billTo patient (use selected family member if provided, else owner's patient)
    let billToPatientId = patient._id;
    const firstAptWithPatient = appointmentData.find(a => !!a.patientId);
    if (firstAptWithPatient?.patientId) {
      billToPatientId = firstAptWithPatient.patientId;
    }

    // Tạo payment object - Đảm bảo appointmentId KHÔNG được set (không phải undefined, mà là không có field)
    const paymentData = {
      // KHÔNG có appointmentId - chỉ có appointmentData (pre-payment flow)
      // KHÔNG có medicalVisitId và appointmentIds vì chưa tạo visit/appointments
      appointmentData: appointmentData, // Lưu appointments data để tạo sau khi thanh toán thành công
      invoiceType: "booking",
      invoiceNumber,
      currency: "VND",
      issueDate: new Date(),
      billTo: {
        patientId: billToPatientId,
        name: patient.fullName || patient.userId?.fullName || "Unknown",
        email: patient.userId?.email,
        phone: patient.userId?.phoneNumber || patient.phone,
      },
      billFrom: {
        doctorId: firstDoctor._id,
        clinicId: firstAppointment.clinicId || null,
        doctorName: firstDoctor.fullName || "MedConnect",
        clinicName: firstAppointment.clinic?.name || "MedConnect Clinic",
      },
      items: appointmentItems,
      subtotal: totalAmount,
      discount: 0,
      total: totalAmount,
      gateway: gateway,
      method: method,
      status: "initiated", // Will be updated to captured after payment
      amountPaid: 0,
      orderCode: orderCode,
      pendingOrderCode: orderCode, // Temporary, will be cleared after payment
    };

    // Log payment data trước khi tạo
    console.log("🔍 Payment data before creation:", {
      hasAppointmentId: "appointmentId" in paymentData,
      hasMedicalVisitId: "medicalVisitId" in paymentData,
      hasAppointmentData: "appointmentData" in paymentData,
      appointmentDataLength: paymentData.appointmentData?.length || 0,
    });

    const payment = new Payment(paymentData);

    // Validate payment trước khi save
    try {
      await payment.validate();
      console.log("✅ Payment validation passed");
    } catch (validationError) {
      console.error("❌ Payment validation failed:", validationError);
      console.error("Payment data:", {
        hasAppointmentId: !!payment.appointmentId,
        hasMedicalVisitId: !!payment.medicalVisitId,
        appointmentIdsLength: payment.appointmentIds?.length || 0,
        appointmentDataLength: payment.appointmentData?.length || 0,
        appointmentData: payment.appointmentData,
      });
      throw validationError;
    }

    await payment.save();
    console.log("✅ Payment saved successfully:", payment._id);

    // Create PayOS payment link (if gateway is payos)
    if (gateway === "payos") {
      try {
        const { createPayosPaymentLink } = await import("../services/payos.service.js");
        const payosResult = await createPayosPaymentLink(appUserId, {
          paymentId: payment._id.toString(), // Pass paymentId instead of medicalVisitId
          amount: totalAmount,
          description: `MedConnect Visit ${String(orderCode).slice(-8)}`,
        });

        // Update payment with payUrl
        payment.payUrl = payosResult.payUrl;
        await payment.save();

        return ok(res, {
          paymentId: payment._id,
          payUrl: payosResult.payUrl,
          orderCode: orderCode,
          totalAmount: totalAmount,
          appointmentsCount: validAppointments.length,
          visitDate: visitDate,
        });
      } catch (payosError) {
        console.error("Error creating PayOS payment link:", payosError);
        // Delete payment record if PayOS link creation fails
        await Payment.findByIdAndDelete(payment._id);
        return fail(
          res,
          500,
          ERROR_CODES.SERVER_ERROR,
          `Không thể tạo link thanh toán: ${payosError.message}`
        );
      }
    } else {
      // For other gateways, return payment info (will be handled separately)
      return ok(res, {
        paymentId: payment._id,
        orderCode: orderCode,
        totalAmount: totalAmount,
        appointmentsCount: validAppointments.length,
        visitDate: visitDate,
        message: `Payment created for ${gateway}. Payment link will be generated separately.`,
      });
    }
  } catch (error) {
    console.error("❌ Error in createPaymentForVisit:", error);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, error.message || String(error));
  }
}

