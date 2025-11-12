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
import { ok, fail } from "../utils/response.js";
import { ERROR_CODES } from "../constants/index.js";
import {
  createAppointmentNotification,
} from "../services/notificationService.js";

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

    // Get patient profile
    const patient = await Patient.findOne({ userId: appUserId });
    if (!patient) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Patient profile not found");
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

        return {
          _id: doctor._id,
          fullName: doctor.fullName,
          licenseNo: doctor.licenseNo,
          yearsExperience: doctor.yearsExperience,
          bio: doctor.bio,
          avatarUrl: doctor.avatarUrl,
          specializationIds: doctor.specializationIds,
          clinicDefaultId: doctor.clinicDefaultId,
          ratingAvg: doctor.ratingAvg,
          ratingCount: doctor.ratingCount,
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
 * Hoàn tất planning và tạo visit với tất cả appointments
 * POST /api/medical-visits/complete-planning
 * Body: { visitDate, appointments: [{ doctorId, slotId, mode, clinicId, reason }] }
 */
export async function completePlanningAndCreateVisit(req, res) {
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

    console.log("completePlanningAndCreateVisit - Request body:", {
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

    // Get patient profile
    const patient = await Patient.findOne({ userId: appUserId });
    if (!patient) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Patient profile not found");
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

      // Check if slot is available
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

      appointmentData.push({
        patientId: patient._id,
        doctorId,
        slotId,
        mode,
        clinicId: mode === "offline" ? clinicId : undefined,
        scheduledStart: slot.startAt,
        scheduledEnd: slot.endAt,
        status: "pending_doctor",
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

    // Create visit with status pending_doctor
    const visit = new MedicalVisit({
      patientId: patient._id,
      visitDate: visitDate,
      status: "pending_doctor",
      appointmentIds: [],
      totalFee: 0,
      paymentStatus: "unpaid",
      createdBy: appUserId,
    });

    await visit.save();

    // Create all appointments and add to visit
    const createdAppointments = [];
    for (const aptData of appointmentData) {
      const appointment = new Appointment({
        visitId: visit._id,
        ...aptData,
      });

      await appointment.save();
      visit.appointmentIds.push(appointment._id);
      createdAppointments.push(appointment);
    }

    await visit.save();

    // Sync visit status
    await syncVisitStatus(visit._id);

    // Get full appointment details with populated data
    const fullAppointments = await Appointment.find({
      _id: { $in: visit.appointmentIds },
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
        appointmentCount: visit.appointmentIds.length,
      },
      appointments: fullAppointments.map((apt) => ({
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
      })),
      conflicts: conflicts.length > 0 ? conflicts : undefined,
      conflictWarning: conflicts.length > 0
        ? "Phát hiện xung đột trùng giờ trong các lịch hẹn"
        : undefined,
    });
  } catch (error) {
    console.error("❌ Error in completePlanningAndCreateVisit:", error);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, error.message || String(error));
  }
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
    const patient = await Patient.findOne({ userId: appUserId });
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
      status: "pending_doctor",
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

    // Check if appointment is pending
    if (appointment.status !== "pending_doctor") {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        `Appointment is not pending. Current status: ${appointment.status}`
      );
    }

    // Update appointment status
    if (action === "accept") {
      appointment.status = "accepted";
      appointment.acceptedBy = doctor._id;
    } else {
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
    const patient = await Patient.findOne({ userId: appUserId });
    if (!patient) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Patient profile not found");
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
    const patient = await Patient.findOne({ userId: appUserId });
    if (!patient) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Patient profile not found");
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
      status: "pending_doctor",
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
    const patient = await Patient.findOne({ userId: appUserId });
    if (!patient) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Patient profile not found");
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
    const patient = await Patient.findOne({ userId: appUserId });
    if (!patient) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Patient profile not found");
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
    const patient = await Patient.findOne({ userId: appUserId });
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

