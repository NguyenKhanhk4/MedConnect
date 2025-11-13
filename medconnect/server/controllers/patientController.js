import User from "../models/user.model.js";
import Patient from "../models/patient.model.js";
import Doctor from "../models/doctor.model.js";
import Specialization from "../models/specialization.model.js";
import DoctorTimeSlot from "../models/doctorTimeSlot.model.js";
import Appointment from "../models/appointment.model.js";
import ConsultationSummary from "../models/consultationSummary.model.js";
import ConsultationAdvice from "../models/consultationAdvice.model.js";
import Notification from "../models/notification.model.js";
import PatientFavorite from "../models/patientFavorite.model.js";
import EducationLevelPrice from "../models/educationLevelPrice.model.js";
import Payment from "../models/payment.model.js";
import Clinic from "../models/clinic.model.js";
import Review from "../models/review.model.js";
import {
  createBookingNotification,
  createAppointmentNotification,
} from "../services/notificationService.js";
import { ok, fail } from "../utils/response.js";
import { ERROR_CODES } from "../constants/index.js";
import { sendMail } from "../utils/email.js";

/**
 * Get all patients (for admin/manager)
 */
export async function getAllPatients(req, res) {
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
    console.error("Error fetching all patients:", error);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, "Internal server error");
  }
}

/**
 * Cancel appointment by patient
 */
export async function cancelAppointment(req, res) {
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

    const { appointmentId } = req.params;
    const { cancelReason } = req.body;

    // Find appointment first
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Appointment not found");
    }

    // Verify the appointment's patient belongs to this user (support family members)
    const appointmentPatient = await Patient.findById(appointment.patientId);
    if (
      !appointmentPatient ||
      appointmentPatient.userId.toString() !== appUserId.toString()
    ) {
      return fail(
        res,
        403,
        ERROR_CODES.UNAUTHORIZED,
        "Appointment does not belong to you"
      );
    }

    // Check if appointment can be cancelled
    if (!["pending_doctor", "accepted"].includes(appointment.status)) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Appointment cannot be cancelled in current status"
      );
    }

    // Update appointment status
    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      {
        status: "cancelled",
        cancelledAt: new Date(),
        cancelledBy: appUserId,
        cancelReason: cancelReason || "Cancelled by patient",
      },
      { new: true }
    )
      .populate("patientId", "fullName phone userId")
      .populate({
        path: "patientId",
        populate: { path: "userId", select: "email fullName" },
      })
      .populate("doctorId", "fullName")
      .populate("slotId", "startAt endAt")
      .lean();

    // Free up the time slot
    await DoctorTimeSlot.findByIdAndUpdate(appointment.slotId, {
      status: "available",
    });

    // Send cancellation confirmation email to patient
    try {
      await sendAppointmentCancellationEmail(
        updatedAppointment,
        updatedAppointment.patientId,
        updatedAppointment.doctorId,
        cancelReason
      );
      console.log("✅ Cancellation confirmation email sent successfully");
    } catch (emailError) {
      console.error(
        "⚠️ Failed to send cancellation confirmation email:",
        emailError.message
      );
      // Don't block cancellation if email fails
    }

    // Create notification for doctor about cancellation
    try {
      await createAppointmentNotification(appointmentId, "cancelled", {
        cancelReason: cancelReason || "Cancelled by patient",
      });
      console.log(
        `✅ Cancellation notification created for appointment ${appointmentId}`
      );
    } catch (notificationError) {
      console.error(
        "❌ Error creating cancellation notification:",
        notificationError
      );
      // Don't fail the main request if notification fails
    }

    return ok(res, {
      message: "Appointment cancelled successfully",
      appointment: updatedAppointment,
    });
  } catch (error) {
    console.error("Error cancelling appointment:", error);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, "Internal server error");
  }
}

/**
 * Get current patient profile with full information
 */
export async function getCurrentPatientProfile(req, res) {
  try {
    const claims = req.user || {};

    // Try to get app_user_id first, fall back to email-based lookup
    let appUserId = claims.app_user_id;
    let user;

    if (appUserId) {
      // Use app_user_id if available
      user = await User.findById(appUserId).lean();
    } else {
      // Fall back to email-based lookup (compatible with Google login)
      const userEmail = claims.email;
      if (!userEmail) {
        console.log("❌ No app_user_id or email found in token");
        return fail(
          res,
          401,
          ERROR_CODES.UNAUTHORIZED,
          "User ID or email not found in token"
        );
      }

      console.log("🔍 Looking up user by email:", userEmail);
      user = await User.findOne({ email: userEmail }).lean();

      if (user) {
        appUserId = user._id;
      }
    }

    if (!user) {
      return fail(res, 404, ERROR_CODES.USER_NOT_FOUND, "User not found");
    }

    console.log("👤 Found user:", {
      _id: user._id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    });

    // IMPORTANT: Only find/create patient profile if user role is "patient"
    // Doctors, admins, and managers should NOT have patient profiles
    let patient = null;

    if (user.role === "patient") {
      // 1) Ưu tiên lấy đúng hồ sơ "self" (chính chủ)
      patient = await Patient.findOne({
        userId: appUserId,
        relationshipToOwner: "self",
      }).lean();

      if (!patient) {
        // 2) Nếu không có "self", kiểm tra hồ sơ cũ chưa set relationshipToOwner
        const legacyOrMissingRelationship = await Patient.findOne({
          userId: appUserId,
          $or: [
            { relationshipToOwner: { $exists: false } },
            { relationshipToOwner: null },
            { relationshipToOwner: "" },
          ],
        });

        if (legacyOrMissingRelationship) {
          // Gắn cờ "self" cho hồ sơ cũ thay vì tạo mới để tránh trùng lặp
          legacyOrMissingRelationship.relationshipToOwner = "self";
          await legacyOrMissingRelationship.save();
          patient = legacyOrMissingRelationship.toObject();
          console.log(
            "✅ Upgraded legacy/missing relationship to 'self' for patient:",
            patient._id
          );
        } else {
          // 3) Chỉ khi hoàn toàn không có hồ sơ nào của userId thì mới tạo mới
          console.log("Creating new SELF patient profile for user:", appUserId);
          const newPatient = new Patient({
            userId: appUserId,
            fullName: user.fullName || "Chưa cập nhật",
            phone: user.phone || "",
            relationshipToOwner: "self",
            isComplete: false,
          });

          await newPatient.save();
          patient = newPatient.toObject();
          console.log("Created self patient profile:", patient._id);
        }
      }
    } else {
      // For non-patient users (doctor, admin, manager), check if Patient exists and remove it
      const existingPatient = await Patient.findOne({ userId: appUserId });
      if (existingPatient) {
        console.warn(
          `⚠️ Patient record found for ${user.role} user ${appUserId}, removing it...`
        );
        await Patient.findByIdAndDelete(existingPatient._id);
        console.log(`✅ Removed Patient record: ${existingPatient._id}`);
      }
      console.log(
        `ℹ️ User ${appUserId} is a ${user.role}, no patient profile needed`
      );
    }

    // Combine user and patient data
    const profileData = {
      user: {
        _id: user._id,
        email: user.email,
        phone: user.phone,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
        authProvider: user.authProvider,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      profile: patient
        ? {
            _id: patient._id,
            fullName: patient.fullName,
            dob: patient.dob,
            gender: patient.gender,
            ethnicity: patient.ethnicity,
            occupation: patient.occupation,
            citizenId: patient.citizenId,
            phone: patient.phone,
            email: patient.email,
            address: patient.address,
            houseNumber: patient.houseNumber,
            avatarUrl: patient.avatarUrl,
            // Người đại diện
            representativeName: patient.representativeName,
            representativeCitizenId: patient.representativeCitizenId,
            representativeRelation: patient.representativeRelation,
            representativePhone: patient.representativePhone,
            // Thông tin y tế
            bloodType: patient.bloodType,
            allergyNotes: patient.allergyNotes,
            medicalHistory: patient.medicalHistory,
            healthInsurance: patient.healthInsurance,
            healthInsuranceIssueDate: patient.healthInsuranceIssueDate,
            healthInsuranceExpiryDate: patient.healthInsuranceExpiryDate,
            // Ghi chú
            notes: patient.notes,
            // Legacy fields
            nationalId: patient.nationalId,
            wardCode: patient.wardCode,
            districtCode: patient.districtCode,
            provinceCode: patient.provinceCode,
            relationshipToOwner: patient.relationshipToOwner,
            createdAt: patient.createdAt,
            updatedAt: patient.updatedAt,
            isComplete: !!(
              patient.fullName &&
              patient.dob &&
              patient.gender &&
              patient.phone
            ),
          }
        : null,
    };

    return ok(res, profileData);
  } catch (error) {
    console.error("Error fetching patient profile:", error);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, "Internal server error");
  }
}

/**
 * Update patient profile
 */
export async function updatePatientProfile(req, res) {
  try {
    const claims = req.user || {};

    // Try to get app_user_id first, fall back to email-based lookup
    let appUserId = claims.app_user_id;

    if (!appUserId) {
      // Fall back to email-based lookup
      const userEmail = claims.email;
      if (!userEmail) {
        return fail(
          res,
          401,
          ERROR_CODES.UNAUTHORIZED,
          "User ID or email not found in token"
        );
      }

      const user = await User.findOne({ email: userEmail }).lean();
      if (!user) {
        return fail(res, 404, ERROR_CODES.USER_NOT_FOUND, "User not found");
      }
      appUserId = user._id;
    }

    const updateData = req.body;

    // Server-side validation
    const validationErrors = {};

    // Validate required fields
    if (updateData.fullName && updateData.fullName.trim().length < 2) {
      validationErrors.fullName = "Họ và tên phải có ít nhất 2 ký tự";
    }

    // Validate email format
    if (
      updateData.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updateData.email)
    ) {
      validationErrors.email = "Email không đúng định dạng";
    }

    // Validate phone format
    if (
      updateData.phone &&
      !/^(\+84|84|0)[1-9][0-9]{8,9}$/.test(updateData.phone.replace(/\s/g, ""))
    ) {
      validationErrors.phone = "Số điện thoại không đúng định dạng";
    }

    // Validate date of birth
    if (updateData.dob) {
      const birthDate = new Date(updateData.dob);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();

      if (birthDate > today) {
        validationErrors.dob = "Ngày sinh không thể là tương lai";
      } else if (age > 120) {
        validationErrors.dob = "Tuổi không hợp lệ";
      }
    }

    // Validate citizen ID format
    if (updateData.citizenId && !/^[0-9]{9,12}$/.test(updateData.citizenId)) {
      validationErrors.citizenId = "CCCD/CMND phải có 9-12 chữ số";
    }

    // Validate representative citizen ID
    if (
      updateData.representativeCitizenId &&
      !/^[0-9]{9,12}$/.test(updateData.representativeCitizenId)
    ) {
      validationErrors.representativeCitizenId =
        "CCCD/CMND người đại diện phải có 9-12 chữ số";
    }

    // Validate phone numbers
    if (
      updateData.representativePhone &&
      !/^(\+84|84|0)[1-9][0-9]{8,9}$/.test(
        updateData.representativePhone.replace(/\s/g, "")
      )
    ) {
      validationErrors.representativePhone =
        "Số điện thoại người đại diện không đúng định dạng";
    }

    // Validate representative name
    if (updateData.representativeName) {
      if (updateData.representativeName.trim().length < 2) {
        validationErrors.representativeName =
          "Họ tên người đại diện phải có ít nhất 2 ký tự";
      } else if (updateData.representativeName.length > 100) {
        validationErrors.representativeName =
          "Họ tên người đại diện không được quá 100 ký tự";
      } else if (!/^[a-zA-ZÀ-ỹ\s]+$/.test(updateData.representativeName)) {
        validationErrors.representativeName =
          "Họ tên chỉ được chứa chữ cái và khoảng trắng";
      }
    }

    // Validate text length
    if (updateData.allergyNotes && updateData.allergyNotes.length > 500) {
      validationErrors.allergyNotes = "Ghi chú dị ứng không được quá 500 ký tự";
    }

    if (updateData.notes && updateData.notes.length > 1000) {
      validationErrors.notes = "Ghi chú không được quá 1000 ký tự";
    }

    // Return validation errors if any
    if (Object.keys(validationErrors).length > 0) {
      return fail(
        res,
        400,
        ERROR_CODES.VALIDATION_ERROR,
        "Dữ liệu không hợp lệ",
        validationErrors
      );
    }

    // Update user basic info
    const userUpdate = {};
    if (updateData.fullName) userUpdate.fullName = updateData.fullName;
    if (updateData.phone) userUpdate.phone = updateData.phone;

    if (Object.keys(userUpdate).length > 0) {
      await User.findByIdAndUpdate(appUserId, userUpdate);
    }

    // Update or create patient profile
    const patientUpdate = {
      userId: appUserId,
      fullName: updateData.fullName,
      dob: updateData.dob,
      gender: updateData.gender,
      ethnicity: updateData.ethnicity,
      occupation: updateData.occupation,
      citizenId: updateData.citizenId,
      phone: updateData.phone,
      email: updateData.email,
      address: updateData.address,
      houseNumber: updateData.houseNumber,
      // Avatar
      avatarUrl: updateData.avatarUrl,
      // Người đại diện
      representativeName: updateData.representativeName,
      representativeCitizenId: updateData.representativeCitizenId,
      representativeRelation: updateData.representativeRelation,
      representativePhone: updateData.representativePhone,
      // Thông tin y tế
      bloodType: updateData.bloodType,
      allergyNotes: updateData.allergyNotes,
      medicalHistory: updateData.medicalHistory,
      // Bảo hiểm y tế (không bắt buộc)
      ...(updateData.healthInsurance !== undefined && {
        healthInsurance: updateData.healthInsurance || null,
      }),
      ...(updateData.healthInsuranceIssueDate !== undefined && {
        healthInsuranceIssueDate: updateData.healthInsuranceIssueDate || null,
      }),
      ...(updateData.healthInsuranceExpiryDate !== undefined && {
        healthInsuranceExpiryDate: updateData.healthInsuranceExpiryDate || null,
      }),
      // Ghi chú
      notes: updateData.notes,
    };

    const patient = await Patient.findOneAndUpdate(
      { userId: appUserId },
      patientUpdate,
      { upsert: true, new: true }
    );

    return ok(res, {
      message: "Profile updated successfully",
      profile: patient,
    });
  } catch (error) {
    console.error("Error updating patient profile:", error);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, "Internal server error");
  }
}

/**
 * Get all specializations for appointment booking
 */
export async function getSpecializations(req, res) {
  try {
    const specializations = await Specialization.find({})
      .select("_id name description")
      .sort({ name: 1 })
      .lean();

    return ok(res, { specializations });
  } catch (error) {
    console.error("Error fetching specializations:", error);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, "Internal server error");
  }
}

/**
 * Get doctors by specialization
 */
export async function getDoctorsBySpecialization(req, res) {
  try {
    const { specializationId } = req.params;

    if (!specializationId) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Specialization ID is required"
      );
    }

    const doctors = await Doctor.find({
      specializationIds: specializationId,
      isVerified: true,
      isActive: true, // Only show active doctors
    })
      .populate("specializationIds", "name")
      .select(
        "_id fullName bio avatarUrl specializationIds ratingCount ratingAvg yearsExperience"
      )
      .sort({ ratingAvg: -1 })
      .lean();

    return ok(res, { doctors });
  } catch (error) {
    console.error("Error fetching doctors by specialization:", error);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, "Internal server error");
  }
}

/**
 * Get available time slots for a doctor
 */
export async function getDoctorTimeSlots(req, res) {
  try {
    const { doctorId } = req.params;
    const { date } = req.query; // Format: YYYY-MM-DD

    if (!doctorId) {
      return fail(res, 400, ERROR_CODES.INVALID_INPUT, "Doctor ID is required");
    }

    if (!date) {
      return fail(res, 400, ERROR_CODES.INVALID_INPUT, "Date is required");
    }

    // Parse date and create date range for the day
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    // Get all time slots for the doctor on the specified date (available, booked, and blocked)
    // Include blocked slots so patients can see when doctor is on leave (but cannot book)
    const timeSlots = await DoctorTimeSlot.find({
      doctorId: doctorId,
      startAt: { $gte: startDate, $lte: endDate },
      status: { $in: ["available", "booked", "blocked"] }, // Include blocked slots for display
    })
      .sort({ startAt: 1 })
      .lean();

    // Get all appointments using these slots to check if they're really available
    // Include ALL appointments (even done) so we can show all slots but mark them as unavailable
    const slotIds = timeSlots.map((slot) => slot._id);
    const appointments = await Appointment.find({
      slotId: { $in: slotIds },
      status: {
        $in: [
          "pending_doctor",
          "accepted",
          "in_progress",
          "done",
          // Exclude cancelled, rejected, no_show, rescheduled
          // Include "done" to show all slots but mark them as unavailable
        ],
      },
    })
      .select("slotId status")
      .lean();

    // Create a map of booked slot IDs with their appointment statuses
    // This allows us to show all slots but mark unavailable ones
    const bookedSlotMap = new Map();
    appointments.forEach((apt) => {
      const slotIdStr = apt.slotId?.toString();
      if (slotIdStr && !bookedSlotMap.has(slotIdStr)) {
        bookedSlotMap.set(slotIdStr, apt.status);
      }
    });

    // Format ALL time slots for frontend (not just available ones)
    // Mark slots as unavailable if they have active appointments or are blocked
    const formattedSlots = timeSlots.map((slot) => {
      const slotIdStr = slot._id.toString();
      const appointmentStatus = bookedSlotMap.get(slotIdStr);
      const isBlocked = slot.status === "blocked";
      const isAvailable = !appointmentStatus && !isBlocked; // Available if no active appointment and not blocked

      return {
        _id: slot._id,
        startAt: slot.startAt, // Keep original for datetime calculation
        endAt: slot.endAt,
        startTime: slot.startAt.toTimeString().slice(0, 5), // HH:MM format
        endTime: slot.endAt.toTimeString().slice(0, 5),
        timeRange: `${slot.startAt.toTimeString().slice(0, 5)} - ${slot.endAt
          .toTimeString()
          .slice(0, 5)}`,
        available: isAvailable,
        appointmentStatus: appointmentStatus || null, // Include appointment status for frontend display
        status: slot.status, // Include slot status (available, booked, blocked)
        isBlocked: isBlocked, // Flag to identify blocked slots
        leaveReason: slot.leaveReason || null, // Reason for leave (if blocked)
      };
    });

    return ok(res, { timeSlots: formattedSlots });
  } catch (error) {
    console.error("Error fetching doctor time slots:", error);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, "Internal server error");
  }
}

/**
 * Get doctor pricing (public endpoint for patients)
 */
export async function getDoctorPricing(req, res) {
  try {
    const { doctorId } = req.params;

    if (!doctorId) {
      return fail(res, 400, ERROR_CODES.INVALID_INPUT, "Doctor ID is required");
    }

    // Verify doctor exists and get education level
    const doctor = await Doctor.findById(doctorId).lean();
    if (!doctor) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Doctor not found");
    }

    // Get pricing based on doctor's education level
    const educationLevel = doctor.educationLevel;
    if (!educationLevel) {
      return ok(res, {
        doctorId: doctor._id,
        pricing: null,
      });
    }

    // Get pricing for both online and offline modes
    const onlinePrice = await EducationLevelPrice.findOne({
      educationLevel,
      mode: "online",
      isActive: true,
    }).lean();

    const offlinePrice = await EducationLevelPrice.findOne({
      educationLevel,
      mode: "offline",
      isActive: true,
    }).lean();

    // Format pricing similar to DoctorRate format
    const pricing = [];
    if (onlinePrice) {
      pricing.push({
        mode: "online",
        weekdayPrice: onlinePrice.weekdayPrice,
        weekendPrice: onlinePrice.weekendPrice,
        clinicId: null,
      });
    }
    if (offlinePrice) {
      pricing.push({
        mode: "offline",
        weekdayPrice: offlinePrice.weekdayPrice,
        weekendPrice: offlinePrice.weekendPrice,
        clinicId: doctor.clinicDefaultId || null,
      });
    }

    return ok(res, {
      doctorId: doctor._id,
      pricing: pricing.length > 0 ? pricing : null,
    });
  } catch (error) {
    console.error("Error fetching doctor pricing:", error);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, "Internal server error");
  }
}

/**
 * Book an appointment
 */
export async function bookAppointment(req, res) {
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

    const {
      doctorId,
      slotId,
      mode, // "online" or "offline"
      clinicId, // required if mode is "offline"
      reason,
      scheduledStart,
      scheduledEnd,
      patientId, // Optional: specific patient ID for family member booking
    } = req.body;

    // Validate required fields
    if (!doctorId || !slotId || !mode || !scheduledStart || !scheduledEnd) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Missing required fields"
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

    // Get patient profile
    let patient;
    if (patientId) {
      // If patientId is provided, use that patient (for family member booking)
      patient = await Patient.findOne({
        _id: patientId,
        userId: appUserId, // Verify the patient belongs to this user
      });

      if (!patient) {
        return fail(
          res,
          403,
          ERROR_CODES.UNAUTHORIZED,
          "Patient not found or does not belong to you"
        );
      }
    } else {
      // Otherwise, get or create the user's own patient profile
      patient = await Patient.findOne({ userId: appUserId });
      if (!patient) {
        // Create a basic patient profile if it doesn't exist
        console.log("Creating new patient profile for user:", appUserId);
        const user = await User.findById(appUserId);
        if (!user) {
          return fail(res, 404, ERROR_CODES.USER_NOT_FOUND, "User not found");
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
    }

    // Verify the time slot exists and is available
    const timeSlot = await DoctorTimeSlot.findById(slotId);
    if (!timeSlot) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Time slot not found");
    }

    if (timeSlot.doctorId.toString() !== doctorId) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Time slot does not belong to the selected doctor"
      );
    }

    // Check if slot is really available by checking for active appointments
    // A slot is available if it has no active appointments using it
    // This handles the case where slot status is "booked" but the appointment was cancelled
    // Note: pending_doctor status has been removed - all appointments are auto-accepted
    const activeAppointments = await Appointment.find({
      slotId: slotId,
      status: {
        $in: ["accepted", "in_progress", "done"],
      },
    })
      .select("slotId status")
      .lean();

    // Slot is not available if there's an active appointment using it
    if (activeAppointments.length > 0) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Time slot is no longer available"
      );
    }

    // TODO: Comment out payment validation for now
    // Check if payment is required and completed
    // const doctor = await Doctor.findById(doctorId);
    // if (doctor.requiresPayment && !paymentId) {
    //   return fail(res, 400, ERROR_CODES.PAYMENT_REQUIRED, "Payment is required for this appointment");
    // }

    // Create appointment
    // Both online and offline appointments: automatically accepted (no approval needed)
    const appointment = new Appointment({
      patientId: patient._id,
      doctorId: doctorId,
      slotId: slotId,
      mode: mode,
      clinicId: mode === "offline" ? clinicId : undefined,
      scheduledStart: new Date(scheduledStart),
      scheduledEnd: new Date(scheduledEnd),
      status: "accepted", // Auto-accepted for both online and offline (no approval needed)
      paymentStatus: "unpaid", // Initially unpaid
      // paymentDeadline không set - không giới hạn thời gian thanh toán
      reason: reason,
      autoExpireAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now
    });

    await appointment.save();

    // Update time slot status to booked
    await DoctorTimeSlot.findByIdAndUpdate(slotId, { status: "booked" });

    // Create notification for doctor about new appointment
    try {
      await createBookingNotification(appointment._id);
      console.log(
        `✅ Booking notification created for appointment ${appointment._id}`
      );
    } catch (notificationError) {
      console.error(
        "❌ Error creating booking notification:",
        notificationError
      );
      // Don't fail the main request if notification fails
    }

    // Populate appointment data for response
    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate("patientId", "fullName phone")
      .populate("doctorId", "fullName")
      .populate("slotId", "startAt endAt")
      .lean();

    return ok(res, {
      message: "Appointment booked successfully.",
      appointment: populatedAppointment,
    });
  } catch (error) {
    console.error("Error booking appointment:", error);

    // Handle duplicate slot booking error
    if (error.code === 11000) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "This time slot has already been booked"
      );
    }

    return fail(res, 500, ERROR_CODES.SERVER_ERROR, "Internal server error");
  }
}

/**
 * Get patient's appointments
 */
export async function getPatientAppointments(req, res) {
  try {
    const claims = req.user || {};

    // Try to get app_user_id first, fall back to email-based lookup
    let appUserId = claims.app_user_id;
    let user;

    if (appUserId) {
      user = await User.findById(appUserId).lean();
    } else {
      const userEmail = claims.email;
      if (!userEmail) {
        return fail(
          res,
          401,
          ERROR_CODES.UNAUTHORIZED,
          "User ID or email not found in token"
        );
      }
      user = await User.findOne({ email: userEmail }).lean();
      if (user) {
        appUserId = user._id;
      }
    }

    if (!user) {
      return fail(res, 404, ERROR_CODES.USER_NOT_FOUND, "User not found");
    }

    // Find all patients for this user (including family members)
    let patients = await Patient.find({ userId: appUserId });

    if (!patients || patients.length === 0) {
      // Create a basic patient profile if it doesn't exist
      console.log("Creating new patient profile for user:", appUserId);

      const newPatient = new Patient({
        userId: appUserId,
        fullName: user.fullName || "Chưa cập nhật",
        phone: user.phone || "",
        isComplete: false,
      });

      await newPatient.save();
      console.log("Created patient profile:", newPatient._id);

      // Use the newly created patient
      patients = [newPatient];
    }

    const { status, page = 1, limit = 50 } = req.query;

    // Build query to get appointments for all patients belonging to this user
    const patientIds = patients.map((p) => p._id);
    const query = { patientId: { $in: patientIds } };
    if (status) {
      query.status = status;
    }

    // Exclude rescheduled appointments (they are replaced by new appointments)
    // Only exclude if status is "rescheduled" AND has rescheduledToId
    query.$nor = [
      {
        status: "rescheduled",
        rescheduledToId: { $exists: true, $ne: null },
      },
    ];

    const totalCount = await Appointment.countDocuments(query);

    const appointments = await Appointment.find(query)
      .populate({
        path: "doctorId",
        select: "fullName specializationIds avatarUrl",
        populate: {
          path: "specializationIds",
          select: "name",
        },
      })
      .populate({
        path: "patientId",
        select: "fullName dob gender phone relationshipToOwner",
      })
      .populate("slotId", "startAt endAt")
      .populate("clinicId", "name address")
      .populate({
        path: "rescheduledFromId",
        select: "scheduledStart scheduledEnd status",
      })
      .sort({ scheduledStart: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    // Ensure new fields have default values for backward compatibility
    // Also ensure patientId is properly populated
    const appointmentsWithDefaults = appointments.map((apt) => {
      // Ensure patientId is properly populated
      let patientId = apt.patientId;
      if (
        !patientId ||
        (typeof patientId === "object" && !patientId.fullName)
      ) {
        console.warn(
          `⚠️ Appointment ${apt._id} has invalid patientId:`,
          patientId
        );
        patientId = {
          _id: apt.patientId?._id || apt.patientId || null,
          fullName: apt.patientId?.fullName || "Không có thông tin",
          dob: apt.patientId?.dob || null,
          gender: apt.patientId?.gender || null,
          phone: apt.patientId?.phone || null,
          relationshipToOwner: apt.patientId?.relationshipToOwner || null,
        };
      }

      return {
        ...apt,
        patientId, // Use properly populated patientId
        services: apt.services || [],
        totalPay:
          apt.totalPay !== undefined && apt.totalPay !== null
            ? apt.totalPay
            : 0,
        amountPaid:
          apt.amountPaid !== undefined && apt.amountPaid !== null
            ? apt.amountPaid
            : 0,
        paymentStatus: apt.paymentStatus || "unpaid",
      };
    });

    const total = await Appointment.countDocuments(query);

    return ok(res, {
      appointments: appointmentsWithDefaults,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching patient appointments:", error);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, "Internal server error");
  }
}

/**
 * Cancel patient appointment
 */
export async function cancelPatientAppointment(req, res) {
  try {
    const claims = req.user || {};

    // Try to get app_user_id first, fall back to email-based lookup
    let appUserId = claims.app_user_id;
    let user;

    if (appUserId) {
      user = await User.findById(appUserId).lean();
    } else {
      const userEmail = claims.email;
      if (!userEmail) {
        return fail(
          res,
          401,
          ERROR_CODES.UNAUTHORIZED,
          "User ID or email not found in token"
        );
      }
      user = await User.findOne({ email: userEmail }).lean();
      if (user) {
        appUserId = user._id;
      }
    }

    if (!user) {
      return fail(res, 404, ERROR_CODES.USER_NOT_FOUND, "User not found");
    }

    const { appointmentId } = req.params;
    const { cancelReason } = req.body;

    // Find patient by user ID, create if not exists
    let patient = await Patient.findOne({ userId: appUserId });
    if (!patient) {
      // Create a basic patient profile if it doesn't exist
      console.log("Creating new patient profile for user:", appUserId);

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

    // Find appointment belonging to this patient
    const appointment = await Appointment.findOne({
      _id: appointmentId,
      patientId: patient._id,
    });

    if (!appointment) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Appointment not found");
    }

    // Check if appointment can be cancelled
    if (appointment.status === "cancelled") {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Appointment is already cancelled"
      );
    }

    if (appointment.status === "done") {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Cannot cancel completed appointment"
      );
    }

    // Update appointment status
    const updateData = {
      status: "cancelled",
      cancelledAt: new Date(),
      cancelledBy: appUserId,
    };

    if (cancelReason) {
      updateData.cancelReason = cancelReason;
    }

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      updateData,
      { new: true }
    )
      .populate("doctorId", "fullName specializationIds avatarUrl")
      .populate("slotId", "startAt endAt")
      .populate("clinicId", "name address");

    // Free up the time slot when appointment is cancelled
    try {
      if (appointment.slotId) {
        await DoctorTimeSlot.findByIdAndUpdate(appointment.slotId, {
          status: "available",
        });
        console.log(
          `✅ Slot ${appointment.slotId} freed up after appointment cancellation`
        );
      }
    } catch (slotError) {
      console.error(
        "Error updating slot status after cancellation:",
        slotError
      );
      // Don't fail the request if slot update fails
    }

    return ok(res, {
      appointment: updatedAppointment,
      message: "Appointment cancelled successfully",
    });
  } catch (error) {
    console.error("Error cancelling patient appointment:", error);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, "Internal server error");
  }
}

/**
 * Get appointment details by ID
 */
export async function getAppointmentDetails(req, res) {
  try {
    const claims = req.user || {};
    const appUserId = claims.app_user_id;
    const { appointmentId } = req.params;

    if (!appUserId) {
      return fail(
        res,
        401,
        ERROR_CODES.UNAUTHORIZED,
        "User ID not found in token"
      );
    }

    // Get appointment first
    const appointment = await Appointment.findById(appointmentId)
      .populate({
        path: "doctorId",
        select: "fullName name specializationIds avatarUrl",
        populate: [
          {
            path: "specializationIds",
            select: "name",
          },
          {
            path: "userId",
            select: "phone fullName",
          },
        ],
      })
      .populate({
        path: "patientId",
        select: "fullName dob gender phone relationshipToOwner",
        populate: {
          path: "userId",
          select: "fullName phone",
        },
      })
      .populate("clinicId", "name address")
      .populate("slotId", "startAt endAt")
      .lean();

    if (!appointment) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Appointment not found");
    }

    // Verify the appointment belongs to any patient under this user (supports family members)
    if (
      !appointment.patientId ||
      !appointment.patientId.userId ||
      appointment.patientId.userId._id.toString() !== appUserId.toString()
    ) {
      return fail(
        res,
        403,
        ERROR_CODES.UNAUTHORIZED,
        "Appointment does not belong to you"
      );
    }

    // Map phone from userId to doctorId for easier access
    if (appointment?.doctorId?.userId?.phone) {
      appointment.doctorId.phone = appointment.doctorId.userId.phone;
    }

    // Ensure patientId is properly populated
    let patientId = appointment.patientId;
    if (!patientId || (typeof patientId === "object" && !patientId.fullName)) {
      console.warn(
        `⚠️ Appointment ${appointment._id} has invalid patientId:`,
        patientId
      );
      patientId = {
        _id: appointment.patientId?._id || appointment.patientId || null,
        fullName: appointment.patientId?.fullName || "Không có thông tin",
        dob: appointment.patientId?.dob || null,
        gender: appointment.patientId?.gender || null,
        phone: appointment.patientId?.phone || null,
        relationshipToOwner: appointment.patientId?.relationshipToOwner || null,
        userId: appointment.patientId?.userId || null,
      };
    }

    // Ensure new fields have default values for backward compatibility
    const appointmentWithDefaults = {
      ...appointment,
      patientId, // Use properly populated patientId
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
    };

    console.log("✅ Patient appointment detail fetched:", {
      appointmentId: appointmentWithDefaults._id.toString(),
      status: appointmentWithDefaults.status,
      hasDoctor: !!appointmentWithDefaults.doctorId,
      doctorName:
        appointmentWithDefaults.doctorId?.fullName ||
        appointmentWithDefaults.doctorId?.name,
      hasPatient: !!appointmentWithDefaults.patientId,
      patientName: appointmentWithDefaults.patientId?.fullName,
    });

    return ok(res, appointmentWithDefaults);
  } catch (error) {
    console.error("Error fetching appointment details:", error);
    console.error("Error stack:", error.stack);
    return fail(
      res,
      500,
      ERROR_CODES.SERVER_ERROR,
      "Failed to fetch appointment details"
    );
  }
}

/**
 * Get patient's consultation summaries (medical history)
 */
export async function getPatientConsultationSummaries(req, res) {
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

    // Find patient by user ID
    const patient = await Patient.findOne({ userId: appUserId });
    if (!patient) {
      return fail(
        res,
        404,
        ERROR_CODES.USER_NOT_FOUND,
        "Patient profile not found"
      );
    }

    const { page = 1, limit = 20 } = req.query;

    // Get consultation summaries for this patient
    const consultationSummaries = await ConsultationSummary.find({
      patientId: patient._id,
      status: "final", // Only get finalized summaries
    })
      .populate({
        path: "doctorId",
        select: "fullName specializationIds avatarUrl",
        populate: {
          path: "specializationIds",
          select: "name",
        },
      })
      .populate("appointmentId", "scheduledStart scheduledEnd mode reason")
      .populate("clinicId", "name address")
      .sort({ visitDate: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await ConsultationSummary.countDocuments({
      patientId: patient._id,
      status: "final",
    });

    // Format the response for frontend
    const formattedSummaries = consultationSummaries.map((summary) => {
      // Get primary diagnosis
      const primaryDiagnosis =
        summary.diagnoses && summary.diagnoses.length > 0
          ? summary.diagnoses[0].name
          : "Không có chẩn đoán";

      // Format medications
      const medicationsText =
        summary.medications && summary.medications.length > 0
          ? summary.medications
              .map(
                (med) =>
                  `${med.name} - ${med.quantity || "N/A"} - ${med.instruction}`
              )
              .join(", ")
          : "Không có đơn thuốc";

      // Format documents (lab results + imaging results)
      const documents = [];
      if (summary.labResults && summary.labResults.length > 0) {
        summary.labResults.forEach((lab) => {
          documents.push({
            name: `${lab.testName} - Kết quả xét nghiệm.pdf`,
            type: "pdf",
          });
        });
      }
      if (summary.imagingResults && summary.imagingResults.length > 0) {
        summary.imagingResults.forEach((img) => {
          documents.push({
            name: `${img.type} - Kết quả hình ảnh.pdf`,
            type: "pdf",
          });
        });
      }

      return {
        id: summary._id,
        specialty:
          summary.doctorId?.specializationIds?.[0]?.name || "Không xác định",
        date: new Date(summary.visitDate).toLocaleDateString("vi-VN"),
        doctor: `BS. ${summary.doctorId?.fullName || "Không xác định"}`,
        diagnosis: primaryDiagnosis,
        prescription: medicationsText,
        documents: documents,
        // Full details for modal
        fullDetails: {
          reasonForVisit: summary.reasonForVisit,
          visitDate: summary.visitDate,
          treatmentResult: summary.treatmentResult,
          diagnoses: summary.diagnoses,
          vitals: summary.vitals,
          labResults: summary.labResults,
          imagingResults: summary.imagingResults,
          medications: summary.medications,
          procedures: summary.procedures,
          summaryText: summary.summaryText,
          treatmentMethod: summary.treatmentMethod,
          followUpInstructions: summary.followUpInstructions,
          nextAppointmentDate: summary.nextAppointmentDate,
          appointment: summary.appointmentId,
          clinic: summary.clinicId,
        },
      };
    });

    return ok(res, {
      consultationSummaries: formattedSummaries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching patient consultation summaries:", error);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, "Internal server error");
  }
}

/**
 * Get patient's consultation advice (consultation history)
 */
export async function getPatientConsultationAdvice(req, res) {
  try {
    const claims = req.user || {};

    // Try to get app_user_id first, fall back to email-based lookup
    let appUserId = claims.app_user_id;
    let user;

    if (appUserId) {
      user = await User.findById(appUserId).lean();
    } else {
      const userEmail = claims.email;
      if (!userEmail) {
        return fail(
          res,
          401,
          ERROR_CODES.UNAUTHORIZED,
          "User ID or email not found in token"
        );
      }

      user = await User.findOne({ email: userEmail }).lean();
      if (user) {
        appUserId = user._id;
      }
    }

    if (!user) {
      return fail(res, 404, ERROR_CODES.USER_NOT_FOUND, "User not found");
    }

    // Find patient by user ID, create if not exists
    let patient = await Patient.findOne({ userId: appUserId });
    if (!patient) {
      // Create a basic patient profile if it doesn't exist
      console.log(
        "Creating new patient profile for consultation advice:",
        appUserId
      );

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

    const { page = 1, limit = 20 } = req.query;

    // Get consultation advice for this patient
    const consultationAdvice = await ConsultationAdvice.find({
      patientId: patient._id,
    })
      .populate({
        path: "doctorId",
        select: "fullName specializationIds avatarUrl",
        populate: {
          path: "specializationIds",
          select: "name",
        },
      })
      .populate("appointmentId", "scheduledStart scheduledEnd mode reason")
      .populate("clinicId", "name address")
      .sort({ startedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await ConsultationAdvice.countDocuments({
      patientId: patient._id,
    });

    // Format the response for frontend
    const formattedAdvice = consultationAdvice.map((advice) => {
      // Get primary diagnosis
      const primaryDiagnosis =
        advice.diagnoses && advice.diagnoses.length > 0
          ? advice.diagnoses[0].name
          : "Không có chẩn đoán";

      // Format medications
      const medicationsText =
        advice.medications && advice.medications.length > 0
          ? advice.medications
              .map(
                (med) =>
                  `${med.name} - ${med.quantity || "N/A"} - ${med.instruction}`
              )
              .join(", ")
          : "Không có đơn thuốc";

      // Format documents
      const documents = [];
      if (advice.attachmentUrl) {
        documents.push({
          name: `Tài liệu tư vấn.pdf`,
          type: "pdf",
        });
      }

      // Get date/time from appointment if available, otherwise from advice
      const appointmentStart = advice.appointmentId?.scheduledStart;
      const appointmentEnd = advice.appointmentId?.scheduledEnd;
      const adviceDate = advice.appointmentDate;

      // Use appointment date/time as primary source
      const consultationDateTime = appointmentStart || adviceDate;

      // Safe date handling - format with date and time
      let formattedDate = "Không xác định";
      let formattedDateTime = null; // For full date+time display

      if (appointmentStart) {
        formattedDate = new Date(appointmentStart).toLocaleDateString("vi-VN");
        formattedDateTime = new Date(appointmentStart).toLocaleString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      } else if (adviceDate) {
        formattedDate = new Date(adviceDate).toLocaleDateString("vi-VN");
        formattedDateTime = new Date(adviceDate).toLocaleString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      }

      // Calculate duration
      let duration = "Không xác định";
      if (advice.durationMinutes) {
        // If durationMinutes exists in advice (from old data)
        duration = `${advice.durationMinutes} phút`;
      } else if (appointmentStart && appointmentEnd) {
        // Calculate from appointment time
        const start = new Date(appointmentStart);
        const end = new Date(appointmentEnd);
        const diffMs = end.getTime() - start.getTime();
        const diffMinutes = Math.round(diffMs / (1000 * 60));
        if (diffMinutes > 0) {
          duration = `${diffMinutes} phút`;
        }
      } else if (advice.startedAt && advice.endedAt) {
        // Calculate from startedAt/endedAt if available
        const start = new Date(advice.startedAt);
        const end = new Date(advice.endedAt);
        const diffMs = end.getTime() - start.getTime();
        const diffMinutes = Math.round(diffMs / (1000 * 60));
        if (diffMinutes > 0) {
          duration = `${diffMinutes} phút`;
        }
      }

      // Safe summary handling - check if summary exists and is a string
      const summaryText = advice.summary || advice.notes || "Không có tóm tắt";
      const summaryString =
        typeof summaryText === "string" ? summaryText : String(summaryText);
      const topic =
        summaryString.length > 100
          ? summaryString.substring(0, 100) + "..."
          : summaryString;

      // Get mode from appointment or advice
      const mode = advice.appointmentId?.mode || advice.mode || "offline";

      return {
        id: advice._id,
        type: mode === "online" ? "Video Call" : "Chat",
        date: formattedDate,
        dateTime: formattedDateTime || formattedDate, // Full date+time for display
        doctor: `BS. ${advice.doctorId?.fullName || "Không xác định"}`,
        specialty:
          advice.doctorId?.specializationIds?.[0]?.name || "Không xác định",
        duration: duration,
        topic: topic,
        summary: summaryString,
        documents: documents,
        // Full details for modal
        fullDetails: {
          adviceType: advice.adviceType,
          summary: summaryString,
          startedAt: appointmentStart || advice.startedAt || adviceDate,
          endedAt: appointmentEnd || advice.endedAt,
          durationMinutes:
            advice.durationMinutes ||
            (appointmentStart && appointmentEnd
              ? Math.round(
                  (new Date(appointmentEnd).getTime() -
                    new Date(appointmentStart).getTime()) /
                    (1000 * 60)
                )
              : null),
          consultationDateTime: consultationDateTime,
          diagnoses: advice.diagnoses || [],
          medications: advice.medications || [],
          attachmentUrl: advice.attachmentUrl,
          notes: advice.notes,
          appointment: advice.appointmentId,
          clinic: advice.clinicId,
          doctor: advice.doctorId,
        },
      };
    });

    return ok(res, {
      consultationAdvice: formattedAdvice,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching patient consultation advice:", error);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, "Internal server error");
  }
}

/**
 * Get all family members (all patients under the same userId)
 */
export async function getFamilyMembers(req, res) {
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

    // Get only family members (exclude "self" - the user's own profile)
    // Chỉ lấy những patient có relationshipToOwner là family member hợp lệ
    const familyMembers = await Patient.find({ 
      userId: appUserId,
      relationshipToOwner: { 
        $in: ["father", "mother", "spouse", "child", "grandparent", "other"] 
      } // Chỉ lấy người thân, loại bỏ "self" và null/undefined
    })
      .select("_id fullName dob gender relationshipToOwner phone avatarUrl citizenId address ethnicity occupation bloodType allergyNotes medicalHistory")
      .sort({ relationshipToOwner: 1, createdAt: 1 })
      .lean();

    return ok(res, {
      familyMembers,
    });
  } catch (error) {
    console.error("Error fetching family members:", error);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, "Internal server error");
  }
}

/**
 * Create a new family member patient profile
 */
/**
 * Get family member's consultation summaries (medical history)
 */
export async function getFamilyMemberConsultationSummaries(req, res) {
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

    const { patientId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!patientId) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Patient ID is required"
      );
    }

    // Verify that this patient belongs to the current user
    const patient = await Patient.findOne({
      _id: patientId,
      userId: appUserId,
    });

    if (!patient) {
      return fail(
        res,
        404,
        ERROR_CODES.NOT_FOUND,
        "Family member not found or access denied"
      );
    }

    // Get consultation summaries for this family member
    const consultationSummaries = await ConsultationSummary.find({
      patientId: patientId,
      status: "final", // Only get finalized summaries
    })
      .populate({
        path: "doctorId",
        select: "fullName specializationIds avatarUrl",
        populate: {
          path: "specializationIds",
          select: "name",
        },
      })
      .populate("appointmentId", "scheduledStart scheduledEnd mode reason")
      .populate("clinicId", "name address")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await ConsultationSummary.countDocuments({
      patientId: patientId,
      status: "final",
    });

    // Format the response (same as getPatientConsultationSummaries)
    const formattedSummaries = consultationSummaries.map((summary) => {
      // Get primary diagnosis
      const primaryDiagnosis =
        summary.diagnoses && summary.diagnoses.length > 0
          ? summary.diagnoses[0].name
          : "Không có chẩn đoán";

      // Format medications
      const medicationsText =
        summary.medications && summary.medications.length > 0
          ? summary.medications
              .map(
                (med) =>
                  `${med.name} - ${med.quantity || "N/A"} - ${med.instruction}`
              )
              .join(", ")
          : "Không có đơn thuốc";

      // Format documents
      const documents = [];
      if (summary.attachmentUrl) {
        documents.push({
          name: `Tài liệu khám.pdf`,
          type: "pdf",
        });
      }

      // Get date from appointment if available, otherwise from summary
      const appointmentStart = summary.appointmentId?.scheduledStart;
      const formattedDate = appointmentStart
        ? new Date(appointmentStart).toLocaleDateString("vi-VN")
        : summary.createdAt
        ? new Date(summary.createdAt).toLocaleDateString("vi-VN")
        : "Không xác định";

      return {
        id: summary._id,
        specialty:
          summary.doctorId?.specializationIds?.[0]?.name || "Không xác định",
        date: formattedDate,
        doctor: `BS. ${summary.doctorId?.fullName || "Không xác định"}`,
        diagnosis: primaryDiagnosis,
        prescription: medicationsText,
        documents: documents,
        // Full details for modal
        fullDetails: {
          visitDate: appointmentStart || summary.createdAt,
          reasonForVisit: summary.appointmentId?.reason || "Không có",
          treatmentResult: summary.treatmentMethod || "Không có",
          diagnoses: summary.diagnoses || [],
          vitals: summary.vitals || {},
          labResults: summary.labResults || [],
          imagingResults: summary.imagingResults || [],
          medications: summary.medications || [],
          procedures: summary.procedures || [],
          summaryText: summary.summaryText || summary.summary || "",
          treatmentMethod: summary.treatmentMethod || "",
          followUpInstructions: summary.followUpInstructions || "",
          nextAppointmentDate: summary.nextAppointmentDate || null,
        },
      };
    });

    return ok(res, {
      consultationSummaries: formattedSummaries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error(
      "Error fetching family member consultation summaries:",
      error
    );
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, "Internal server error");
  }
}

/**
 * Get family member's consultation advice (consultation history)
 */
export async function getFamilyMemberConsultationAdvice(req, res) {
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

    const { patientId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!patientId) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Patient ID is required"
      );
    }

    // Verify that this patient belongs to the current user
    const patient = await Patient.findOne({
      _id: patientId,
      userId: appUserId,
    });

    if (!patient) {
      return fail(
        res,
        404,
        ERROR_CODES.NOT_FOUND,
        "Family member not found or access denied"
      );
    }

    // Get consultation advice for this family member
    const consultationAdvice = await ConsultationAdvice.find({
      patientId: patientId,
    })
      .populate({
        path: "doctorId",
        select: "fullName specializationIds avatarUrl",
        populate: {
          path: "specializationIds",
          select: "name",
        },
      })
      .populate("appointmentId", "scheduledStart scheduledEnd mode reason")
      .populate("clinicId", "name address")
      .sort({ startedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await ConsultationAdvice.countDocuments({
      patientId: patientId,
    });

    // Format the response (same as getPatientConsultationAdvice)
    const formattedAdvice = consultationAdvice.map((advice) => {
      // Get primary diagnosis
      const primaryDiagnosis =
        advice.diagnoses && advice.diagnoses.length > 0
          ? advice.diagnoses[0].name
          : "Không có chẩn đoán";

      // Format medications
      const medicationsText =
        advice.medications && advice.medications.length > 0
          ? advice.medications
              .map(
                (med) =>
                  `${med.name} - ${med.quantity || "N/A"} - ${med.instruction}`
              )
              .join(", ")
          : "Không có đơn thuốc";

      // Format documents
      const documents = [];
      if (advice.attachmentUrl) {
        documents.push({
          name: `Tài liệu tư vấn.pdf`,
          type: "pdf",
        });
      }

      // Get date/time from appointment if available, otherwise from advice
      const appointmentStart = advice.appointmentId?.scheduledStart;
      const appointmentEnd = advice.appointmentId?.scheduledEnd;
      const adviceDate = advice.appointmentDate;

      // Use appointment date/time as primary source
      const consultationDateTime = appointmentStart || adviceDate;

      // Safe date handling - format with date and time
      let formattedDate = "Không xác định";
      let formattedDateTime = null; // For full date+time display

      if (appointmentStart) {
        formattedDate = new Date(appointmentStart).toLocaleDateString("vi-VN");
        formattedDateTime = new Date(appointmentStart).toLocaleString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      } else if (adviceDate) {
        formattedDate = new Date(adviceDate).toLocaleDateString("vi-VN");
        formattedDateTime = new Date(adviceDate).toLocaleString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      }

      // Calculate duration
      let duration = "Không xác định";
      if (advice.durationMinutes) {
        duration = `${advice.durationMinutes} phút`;
      } else if (appointmentStart && appointmentEnd) {
        const start = new Date(appointmentStart);
        const end = new Date(appointmentEnd);
        const diffMs = end.getTime() - start.getTime();
        const diffMinutes = Math.round(diffMs / (1000 * 60));
        if (diffMinutes > 0) {
          duration = `${diffMinutes} phút`;
        }
      } else if (advice.startedAt && advice.endedAt) {
        const start = new Date(advice.startedAt);
        const end = new Date(advice.endedAt);
        const diffMs = end.getTime() - start.getTime();
        const diffMinutes = Math.round(diffMs / (1000 * 60));
        if (diffMinutes > 0) {
          duration = `${diffMinutes} phút`;
        }
      }

      // Safe summary handling
      const summaryText = advice.summary || advice.notes || "Không có tóm tắt";
      const summaryString =
        typeof summaryText === "string" ? summaryText : String(summaryText);
      const topic =
        summaryString.length > 100
          ? summaryString.substring(0, 100) + "..."
          : summaryString;

      // Get mode from appointment or advice
      const mode = advice.appointmentId?.mode || advice.mode || "offline";

      return {
        id: advice._id,
        type: mode === "online" ? "Video Call" : "Chat",
        date: formattedDate,
        dateTime: formattedDateTime || formattedDate,
        doctor: `BS. ${advice.doctorId?.fullName || "Không xác định"}`,
        specialty:
          advice.doctorId?.specializationIds?.[0]?.name || "Không xác định",
        duration: duration,
        topic: topic,
        summary: summaryString,
        documents: documents,
        // Full details for modal
        fullDetails: {
          adviceType: advice.adviceType,
          summary: summaryString,
          startedAt: appointmentStart || advice.startedAt || adviceDate,
          endedAt: appointmentEnd || advice.endedAt,
          durationMinutes:
            advice.durationMinutes ||
            (appointmentStart && appointmentEnd
              ? Math.round(
                  (new Date(appointmentEnd) - new Date(appointmentStart)) /
                    (1000 * 60)
                )
              : null),
          diagnoses: advice.diagnoses || [],
          medications: advice.medications || [],
          notes: advice.notes || "",
          attachmentUrl: advice.attachmentUrl || null,
        },
      };
    });

    return ok(res, {
      consultationAdvice: formattedAdvice,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching family member consultation advice:", error);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, "Internal server error");
  }
}

export async function createFamilyMember(req, res) {
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

    const {
      fullName,
      dob,
      gender,
      relationshipToOwner,
      phone,
      address,
      houseNumber,
      citizenId,
      bloodType,
      allergyNotes,
      medicalHistory,
      ethnicity,
      occupation,
      representativeName,
      representativePhone,
      representativeRelation,
      representativeCitizenId,
    } = req.body;

    // Validate required fields
    if (!fullName || !dob || !gender || !relationshipToOwner) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Missing required fields: fullName, dob, gender, relationshipToOwner"
      );
    }

    // Validate relationship (but allow all relationships even for family members)
    const validRelationships = [
      "self",
      "father",
      "mother",
      "spouse",
      "child",
      "grandparent",
      "other",
    ];
    if (!validRelationships.includes(relationshipToOwner)) {
      return fail(res, 400, ERROR_CODES.INVALID_INPUT, "Invalid relationship");
    }

    // Validate gender enum
    const validGenders = ["male", "female", "other"];
    if (!validGenders.includes(gender)) {
      return fail(res, 400, ERROR_CODES.INVALID_INPUT, "Invalid gender");
    }

    // Get current user info to populate representative fields if not provided
    let representativeInfo = {};
    if (relationshipToOwner !== "self") {
      const currentUser = await User.findById(appUserId).lean();
      if (currentUser) {
        // Use provided representative info or fallback to current user info
        representativeInfo = {
          representativeName: representativeName || currentUser.fullName || "",
          representativePhone: representativePhone || currentUser.phone || "",
          representativeRelation: representativeRelation || relationshipToOwner,
          representativeCitizenId: representativeCitizenId || "",
        };
      }
    }

    // Create new family member patient
    const newPatient = new Patient({
      userId: appUserId,
      fullName,
      dob: new Date(dob),
      gender,
      relationshipToOwner,
      phone,
      address,
      houseNumber,
      citizenId,
      bloodType,
      allergyNotes,
      medicalHistory,
      ethnicity,
      occupation,
      ...representativeInfo, // Spread representative info if relationshipToOwner !== "self"
      isComplete: false,
    });

    await newPatient.save();

    return ok(res, {
      message: "Family member created successfully",
      patient: newPatient,
    });
  } catch (error) {
    console.error("Error creating family member:", error);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, "Internal server error");
  }
}

/**
 * Delete family member (patient with relationshipToOwner !== "self")
 */
export async function deleteFamilyMember(req, res) {
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

    const { patientId } = req.params;

    // Find the patient record
    const patient = await Patient.findById(patientId);

    if (!patient) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Patient not found");
    }

    // Verify this patient belongs to the current user
    if (patient.userId.toString() !== appUserId.toString()) {
      return fail(
        res,
        403,
        ERROR_CODES.FORBIDDEN,
        "You don't have permission to delete this patient"
      );
    }

    // Verify this is a family member, not self
    if (patient.relationshipToOwner === "self") {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Cannot delete self patient record"
      );
    }

    // Cancel all pending/appointed appointments for this patient
    await Appointment.updateMany(
      {
        patientId: patient._id,
        status: { $in: ["pending_doctor", "accepted", "in_progress"] },
      },
      {
        $set: {
          status: "cancelled",
          cancelReason: "Family member deleted by user",
        },
      }
    );

    // Delete the patient record
    await Patient.findByIdAndDelete(patientId);

    return ok(res, {
      message: "Family member deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting family member:", error);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, "Internal server error");
  }
}

/**
 * Get patient's favorite doctors
 */
export async function getFavoriteDoctors(req, res) {
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

    // Find patient profile
    let patient = await Patient.findOne({ userId: appUserId });
    if (!patient) {
      // Create a basic patient profile if it doesn't exist
      const user = await User.findById(appUserId);
      if (!user) {
        return fail(res, 404, ERROR_CODES.USER_NOT_FOUND, "User not found");
      }

      const newPatient = new Patient({
        userId: appUserId,
        fullName: user.fullName || "Chưa cập nhật",
        phone: user.phone || "",
        isComplete: false,
      });

      await newPatient.save();
      patient = newPatient;
    }

    // Get all favorite doctors for this patient
    const favorites = await PatientFavorite.find({ patientId: patient._id })
      .populate({
        path: "doctorId",
        select:
          "fullName avatarUrl yearsExperience educationLevel bio specializationIds userId", // Explicitly select fields including educationLevel
        populate: [
          {
            path: "userId",
            select: "fullName email photoURL",
          },
          {
            path: "specializationIds",
            select: "name",
          },
        ],
      })
      .sort({ favoritedAt: -1 })
      .lean();

    // Get doctor IDs
    const doctorIds = favorites
      .map((fav) => fav.doctorId?._id)
      .filter((id) => id);

    // Calculate ratings from Review collection
    const ratingStats = await Review.aggregate([
      {
        $match: {
          doctorId: { $in: doctorIds },
        },
      },
      {
        $group: {
          _id: "$doctorId",
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    // Create a map for quick lookup
    const ratingMap = new Map();
    ratingStats.forEach((stat) => {
      ratingMap.set(stat._id.toString(), {
        ratingAvg: parseFloat(stat.averageRating.toFixed(2)),
        ratingCount: stat.totalReviews,
      });
    });

    // Format doctors data with calculated ratings
    const favoriteDoctors = favorites.map((fav) => {
      const doctorId = fav.doctorId?._id?.toString();
      const ratingData = ratingMap.get(doctorId);

      // Debug log to check educationLevel
      if (fav.doctorId) {
        console.log(`[getFavoriteDoctors] Doctor ${doctorId}:`, {
          fullName: fav.doctorId.fullName,
          educationLevel: fav.doctorId.educationLevel,
          hasEducationLevel: !!fav.doctorId.educationLevel,
        });
      }

      return {
        _id: fav.doctorId._id,
        fullName: fav.doctorId.userId?.fullName || fav.doctorId.fullName,
        avatarUrl: fav.doctorId.avatarUrl || fav.doctorId.userId?.photoURL,
        specializations: fav.doctorId.specializationIds || [],
        yearsExperience: fav.doctorId.yearsExperience,
        educationLevel: fav.doctorId.educationLevel || null, // Explicitly set to null if missing
        ratingAvg: ratingData?.ratingAvg || 0,
        ratingCount: ratingData?.ratingCount || 0,
        bio: fav.doctorId.bio,
        favoritedAt: fav.favoritedAt,
      };
    });

    return ok(res, { favoriteDoctors });
  } catch (error) {
    console.error("Error fetching favorite doctors:", error);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, "Internal server error");
  }
}

/**
 * Add a doctor to favorites
 */
export async function addFavoriteDoctor(req, res) {
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

    const { doctorId } = req.body;

    if (!doctorId) {
      return fail(res, 400, ERROR_CODES.INVALID_INPUT, "Doctor ID is required");
    }

    // Verify doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Doctor not found");
    }

    // Find or create patient profile
    let patient = await Patient.findOne({ userId: appUserId });
    if (!patient) {
      const user = await User.findById(appUserId);
      if (!user) {
        return fail(res, 404, ERROR_CODES.USER_NOT_FOUND, "User not found");
      }

      const newPatient = new Patient({
        userId: appUserId,
        fullName: user.fullName || "Chưa cập nhật",
        phone: user.phone || "",
        isComplete: false,
      });

      await newPatient.save();
      patient = newPatient;
    }

    // Check if already favorited
    const existingFavorite = await PatientFavorite.findOne({
      patientId: patient._id,
      doctorId: doctorId,
    });

    if (existingFavorite) {
      return ok(res, {
        message: "Doctor already in favorites",
        favorite: existingFavorite,
      });
    }

    // Create new favorite
    const favorite = await PatientFavorite.create({
      patientId: patient._id,
      doctorId: doctorId,
    });

    return ok(res, {
      message: "Doctor added to favorites",
      favorite,
    });
  } catch (error) {
    console.error("Error adding favorite doctor:", error);

    // Handle duplicate key error
    if (error.code === 11000) {
      return ok(res, {
        message: "Doctor already in favorites",
      });
    }

    return fail(res, 500, ERROR_CODES.SERVER_ERROR, "Internal server error");
  }
}

/**
 * Remove a doctor from favorites
 */
export async function removeFavoriteDoctor(req, res) {
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

    const { doctorId } = req.params;

    if (!doctorId) {
      return fail(res, 400, ERROR_CODES.INVALID_INPUT, "Doctor ID is required");
    }

    // Find patient profile
    const patient = await Patient.findOne({ userId: appUserId });
    if (!patient) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Patient profile not found");
    }

    // Remove favorite
    const result = await PatientFavorite.findOneAndDelete({
      patientId: patient._id,
      doctorId: doctorId,
    });

    if (!result) {
      return fail(
        res,
        404,
        ERROR_CODES.NOT_FOUND,
        "Doctor not found in favorites"
      );
    }

    return ok(res, {
      message: "Doctor removed from favorites",
    });
  } catch (error) {
    console.error("Error removing favorite doctor:", error);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, "Internal server error");
  }
}

/**
 * Get visit count for a specific doctor (how many times patient has visited this doctor)
 */
export async function getDoctorVisitCount(req, res) {
  try {
    const claims = req.user || {};
    let appUserId = claims.app_user_id;
    let user;

    if (appUserId) {
      user = await User.findById(appUserId).lean();
    } else {
      const userEmail = claims.email;
      if (!userEmail) {
        return fail(
          res,
          401,
          ERROR_CODES.UNAUTHORIZED,
          "User ID or email not found in token"
        );
      }
      user = await User.findOne({ email: userEmail }).lean();
      if (user) {
        appUserId = user._id;
      }
    }

    if (!user) {
      return fail(res, 404, ERROR_CODES.USER_NOT_FOUND, "User not found");
    }

    const { doctorId } = req.params;

    if (!doctorId) {
      return fail(res, 400, ERROR_CODES.INVALID_INPUT, "Doctor ID is required");
    }

    // Find all patients for this user
    const patients = await Patient.find({ userId: appUserId });
    if (!patients || patients.length === 0) {
      return ok(res, { visitCount: 0 });
    }

    const patientIds = patients.map((p) => p._id);

    // Count completed appointments (status = "done")
    const visitCount = await Appointment.countDocuments({
      patientId: { $in: patientIds },
      doctorId: doctorId,
      status: "done",
    });

    return ok(res, { visitCount });
  } catch (error) {
    console.error("Error getting doctor visit count:", error);
    return fail(
      res,
      500,
      ERROR_CODES.SERVER_ERROR,
      error.message || String(error)
    );
  }
}

/**
 * Helper function: Send cancellation confirmation email to patient
 */
async function sendAppointmentCancellationEmail(
  appointment,
  patient,
  doctor,
  cancelReason
) {
  try {
    console.log(`📧 sendAppointmentCancellationEmail called with:`, {
      appointmentId: appointment?._id,
      patientEmail: patient?.userId?.email,
      patientUserId: patient?.userId,
    });

    // Lấy email từ Patient userId
    let patientEmail = null;

    if (
      patient?.userId &&
      typeof patient.userId === "object" &&
      patient.userId.email
    ) {
      // userId đã được populate
      patientEmail = patient.userId.email;
      console.log(`📧 Found email from populated userId: ${patientEmail}`);
    } else if (patient?.userId) {
      // userId là ObjectId, cần query
      console.log(`📧 Querying User for email, userId: ${patient.userId}`);
      const patientUser = await User.findById(patient.userId)
        .select("email fullName")
        .lean();
      if (patientUser) {
        patientEmail = patientUser.email;
        console.log(`📧 Found email from User query: ${patientEmail}`);
      } else {
        console.log(`⚠️ User not found for userId: ${patient.userId}`);
      }
    }

    // Nếu vẫn không có email, không gửi
    if (!patientEmail) {
      console.log(
        "⚠️ Patient email not found, skipping cancellation email notification. Patient data:",
        {
          patientId: patient?._id,
          userId: patient?.userId,
        }
      );
      return;
    }

    console.log(
      `📧 Sending cancellation confirmation email to: ${patientEmail}`
    );

    // Format thời gian
    const scheduledStart = new Date(appointment.scheduledStart);
    const scheduledEnd = new Date(appointment.scheduledEnd);

    const dateStr = scheduledStart.toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const timeStr = `${scheduledStart.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    })} - ${scheduledEnd.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;

    const modeText =
      appointment.mode === "online" ? "Online" : "Trực tiếp tại phòng khám";

    // Lấy tên bác sĩ và bệnh nhân
    const doctorName = doctor?.fullName || "Bác sĩ";
    const patientName =
      patient?.fullName || patient?.userId?.fullName || "Bệnh nhân";
    const cancellationDate = new Date().toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Tạo nội dung email
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 10px;">
          Xác nhận hủy lịch hẹn
        </h2>
        <p>Xin chào <strong>${patientName}</strong>,</p>
        <p>Chúng tôi xác nhận rằng bạn đã <strong style="color: #dc2626;">hủy thành công</strong> lịch hẹn khám của mình.</p>
        
        <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #b91c1c;">Thông tin lịch hẹn đã hủy:</h3>
          <p style="margin: 8px 0;"><strong>Bác sĩ:</strong> ${doctorName}</p>
          <p style="margin: 8px 0;"><strong>Thời gian:</strong> ${dateStr}</p>
          <p style="margin: 8px 0;"><strong>Giờ:</strong> ${timeStr}</p>
          <p style="margin: 8px 0;"><strong>Hình thức:</strong> ${modeText}</p>
          ${
            appointment.reason
              ? `<p style="margin: 8px 0;"><strong>Lý do khám ban đầu:</strong> ${appointment.reason}</p>`
              : ""
          }
          <p style="margin: 8px 0;"><strong>Ngày hủy:</strong> ${cancellationDate}</p>
          ${
            cancelReason
              ? `<p style="margin: 8px 0;"><strong>Lý do hủy:</strong> ${cancelReason}</p>`
              : ""
          }
        </div>

        <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #d97706;">Lưu ý:</h3>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>Lịch hẹn của bạn đã được hủy thành công</li>
            <li>Nếu bạn muốn đặt lại lịch hẹn mới, vui lòng đăng nhập vào hệ thống</li>
            <li>Nếu bạn cần hỗ trợ, vui lòng liên hệ với chúng tôi</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${
            process.env.CLIENT_URL || "http://localhost:5173"
          }/appointment/new" 
             style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Đặt lịch hẹn mới
          </a>
        </div>
        
        <p style="margin-top: 30px;">Cảm ơn bạn đã sử dụng dịch vụ của MedConnect. Chúng tôi luôn sẵn sàng hỗ trợ bạn khi cần.</p>
        
        <p style="margin-top: 30px;">Trân trọng,<br><strong>MedConnect</strong></p>
      </div>
    `;

    const textContent = `
Xác nhận hủy lịch hẹn

Xin chào ${patientName},

Chúng tôi xác nhận rằng bạn đã hủy thành công lịch hẹn khám của mình.

Thông tin lịch hẹn đã hủy:
- Bác sĩ: ${doctorName}
- Thời gian: ${dateStr}
- Giờ: ${timeStr}
- Hình thức: ${modeText}
${appointment.reason ? `- Lý do khám ban đầu: ${appointment.reason}` : ""}
- Ngày hủy: ${cancellationDate}
${cancelReason ? `- Lý do hủy: ${cancelReason}` : ""}

Lưu ý:
- Lịch hẹn của bạn đã được hủy thành công
- Nếu bạn muốn đặt lại lịch hẹn mới, vui lòng đăng nhập vào hệ thống
- Nếu bạn cần hỗ trợ, vui lòng liên hệ với chúng tôi

Cảm ơn bạn đã sử dụng dịch vụ của MedConnect. Chúng tôi luôn sẵn sàng hỗ trợ bạn khi cần.

Trân trọng,
MedConnect
    `;

    console.log(
      `📧 Attempting to send cancellation confirmation email via sendMail...`
    );
    const emailResult = await sendMail({
      to: patientEmail,
      subject: "Xác nhận hủy lịch hẹn - MedConnect",
      text: textContent,
      html: htmlContent,
    });

    console.log(
      `✅ Cancellation confirmation email sent successfully to ${patientEmail}`
    );
    console.log(`📧 Email result:`, {
      messageId: emailResult?.messageId,
      response: emailResult?.response,
    });
  } catch (error) {
    console.error(
      "❌ Error sending cancellation confirmation email:",
      error?.message || error
    );
    // Không throw error để không ảnh hưởng đến flow chính
  }
}

/**
 * Helper function: Calculate appointment booking fee
 * Tính toán phí đặt lịch dựa trên education level và mode
 */
async function calculateAppointmentBookingFee(appointment) {
  try {
    // Get doctorId (có thể là object hoặc ID)
    const doctorId = appointment.doctorId?._id || appointment.doctorId;
    if (!doctorId) {
      console.warn(`Appointment không có doctorId`);
      return 0;
    }

    // Get doctor với education level
    const doctor = await Doctor.findById(doctorId).lean();
    if (!doctor) {
      console.warn(`Doctor ${doctorId} không tồn tại`);
      return 0;
    }

    if (!doctor.educationLevel) {
      console.warn(
        `Doctor ${doctorId} không có education level, sử dụng giá mặc định 0`
      );
      return 0;
    }

    // Get mode
    const mode = appointment.mode;
    if (!mode) {
      console.warn(`Appointment không có mode`);
      return 0;
    }

    // Get pricing based on education level and mode
    const priceRecord = await EducationLevelPrice.findOne({
      educationLevel: doctor.educationLevel,
      mode: mode,
      isActive: true,
    }).lean();

    if (!priceRecord) {
      console.warn(
        `Không tìm thấy giá cho educationLevel=${doctor.educationLevel}, mode=${mode}`
      );
      return 0;
    }

    // Check if scheduledStart is weekend (Saturday = 6, Sunday = 0)
    if (!appointment.scheduledStart) {
      console.warn(`Appointment không có scheduledStart`);
      return priceRecord.weekdayPrice; // Default to weekday price
    }

    const scheduledDate = new Date(appointment.scheduledStart);
    if (isNaN(scheduledDate.getTime())) {
      console.warn(
        `Appointment có scheduledStart không hợp lệ: ${appointment.scheduledStart}`
      );
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
 * Get patient payments (invoices)
 * GET /api/patients/me/payments?invoiceType=booking&page=1&limit=20&status=captured&startDate=...&endDate=...
 */
export async function getPatientPayments(req, res) {
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

    // Find all patients belonging to this user (including family members)
    const patients = await Patient.find({ userId: appUserId });
    if (!patients || patients.length === 0) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Patient not found");
    }

    // Get all patient IDs (including family members)
    const patientIds = patients.map((p) => p._id);

    const {
      invoiceType,
      page = 1,
      limit = 20,
      status,
      startDate,
      endDate,
    } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query - get payments for all patients belonging to this user
    // This includes payments for the user themselves and payments for family members they booked for
    const query = {
      "billTo.patientId": { $in: patientIds },
    };

    // Filter by invoiceType (booking or service)
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

    return ok(res, {
      invoices: formattedInvoices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching patient payments:", error);
    return fail(
      res,
      500,
      ERROR_CODES.SERVER_ERROR,
      error.message || "Lỗi khi tải danh sách thanh toán"
    );
  }
}

/**
 * Calculate payment summary for single appointment (pre-payment flow)
 * POST /api/patients/appointments/calculate-payment-summary
 *
 * Tính toán payment summary cho single appointment mà chưa tạo appointment trong DB
 * Tương tự calculatePaymentSummary cho nhiều lịch nhưng chỉ có 1 appointment
 */
export async function calculatePaymentSummaryForSingleAppointment(req, res) {
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

    const {
      doctorId,
      slotId,
      mode,
      clinicId,
      reason,
      scheduledStart,
      scheduledEnd,
      patientId,
    } = req.body;

    // Validate required fields
    if (!doctorId || !slotId || !mode || !scheduledStart || !scheduledEnd) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Missing required fields: doctorId, slotId, mode, scheduledStart, scheduledEnd"
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
        "clinicId is required for offline appointments"
      );
    }

    // Get patient profile
    let patient;
    if (patientId) {
      patient = await Patient.findOne({
        _id: patientId,
        userId: appUserId,
      });

      if (!patient) {
        return fail(
          res,
          403,
          ERROR_CODES.UNAUTHORIZED,
          "Patient not found or does not belong to you"
        );
      }
    } else {
      patient = await Patient.findOne({ userId: appUserId });
      if (!patient) {
        const user = await User.findById(appUserId);
        if (!user) {
          return fail(res, 404, ERROR_CODES.USER_NOT_FOUND, "User not found");
        }

        const newPatient = new Patient({
          userId: appUserId,
          fullName: user.fullName || "Chưa cập nhật",
          phone: user.phone || "",
          isComplete: false,
        });

        await newPatient.save();
        patient = newPatient;
      }
    }

    // Verify the time slot exists and is available
    const timeSlot = await DoctorTimeSlot.findById(slotId);
    if (!timeSlot) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Time slot not found");
    }

    if (timeSlot.doctorId.toString() !== doctorId) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Time slot does not belong to the selected doctor"
      );
    }

    // Check if slot is really available by checking for active appointments
    const activeAppointments = await Appointment.find({
      slotId: slotId,
      status: {
        $in: ["accepted", "in_progress", "done"],
      },
    })
      .select("slotId status")
      .lean();

    if (activeAppointments.length > 0) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Time slot is no longer available"
      );
    }

    // Get doctor info
    const doctor = await Doctor.findById(doctorId)
      .populate("specializationIds", "name")
      .lean();

    if (!doctor) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Doctor not found");
    }

    // Get clinic info if offline
    let clinic = null;
    if (mode === "offline" && clinicId) {
      clinic = await Clinic.findById(clinicId).lean();
    }

    // Prepare appointment data for price calculation
    const appointmentData = {
      doctorId: doctor._id,
      mode: mode,
      scheduledStart: new Date(scheduledStart),
      scheduledEnd: new Date(scheduledEnd),
      clinicId: clinicId || undefined,
    };

    // Calculate price
    const price = await calculateAppointmentBookingFee(appointmentData);

    // Get specialization names
    const specializationNames =
      doctor.specializationIds
        ?.map((s) => (typeof s === "object" ? s.name : s))
        .join(", ") || "";

    // Format scheduled time
    const scheduledDate = new Date(scheduledStart);
    const timeText = scheduledDate.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return ok(res, {
      totalAmount: price,
      appointmentSummary: {
        doctorId: doctor._id,
        doctorName: doctor.fullName,
        specializationName: specializationNames || "N/A",
        mode: mode,
        scheduledStart: scheduledStart,
        scheduledEnd: scheduledEnd,
        clinicId: clinicId || null,
        clinicName: clinic?.name || null,
        reason: reason || "",
        price: price,
        bookingFee: price,
        timeText: timeText,
      },
      appointmentsCount: 1,
    });
  } catch (error) {
    console.error(
      "❌ Error in calculatePaymentSummaryForSingleAppointment:",
      error
    );
    return fail(
      res,
      500,
      ERROR_CODES.SERVER_ERROR,
      error.message || String(error)
    );
  }
}

/**
 * Create payment for single appointment (pre-payment flow)
 * POST /api/patients/appointments/create-payment
 *
 * Flow mới:
 * 1. Nhận appointment data từ request body (chưa tạo appointment trong DB)
 * 2. Validate appointment data
 * 3. Tính toán payment
 * 4. Tạo Payment record với appointmentData (lưu appointment data để tạo sau khi thanh toán thành công)
 * 5. Tạo PayOS payment link
 * 6. Return payUrl để redirect user đến PayOS
 * 7. Sau khi thanh toán thành công (webhook), tạo appointment từ payment.appointmentData
 */
export async function createPaymentForSingleAppointment(req, res) {
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

    const {
      doctorId,
      slotId,
      mode,
      clinicId,
      reason,
      scheduledStart,
      scheduledEnd,
      patientId,
      gateway = "payos",
      method = "qr",
    } = req.body;

    // Validate gateway
    if (!["payos", "vnpay", "momo"].includes(gateway)) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Gateway must be payos, vnpay, or momo"
      );
    }

    // Validate required fields
    if (!doctorId || !slotId || !mode || !scheduledStart || !scheduledEnd) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Missing required fields: doctorId, slotId, mode, scheduledStart, scheduledEnd"
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
        "clinicId is required for offline appointments"
      );
    }

    // Get patient profile
    let patient;
    if (patientId) {
      patient = await Patient.findOne({
        _id: patientId,
        userId: appUserId,
      }).populate("userId");

      if (!patient) {
        return fail(
          res,
          403,
          ERROR_CODES.UNAUTHORIZED,
          "Patient not found or does not belong to you"
        );
      }
    } else {
      patient = await Patient.findOne({ userId: appUserId }).populate("userId");
      if (!patient) {
        const user = await User.findById(appUserId);
        if (!user) {
          return fail(res, 404, ERROR_CODES.USER_NOT_FOUND, "User not found");
        }

        const newPatient = new Patient({
          userId: appUserId,
          fullName: user.fullName || "Chưa cập nhật",
          phone: user.phone || "",
          isComplete: false,
        });

        await newPatient.save();
        await newPatient.populate("userId");
        patient = newPatient;
      }
    }

    // Verify the time slot exists and is available
    const timeSlot = await DoctorTimeSlot.findById(slotId);
    if (!timeSlot) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Time slot not found");
    }

    if (timeSlot.doctorId.toString() !== doctorId) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Time slot does not belong to the selected doctor"
      );
    }

    // Check if slot is really available by checking for active appointments
    const activeAppointments = await Appointment.find({
      slotId: slotId,
      status: {
        $in: ["accepted", "in_progress", "done"],
      },
    })
      .select("slotId status")
      .lean();

    if (activeAppointments.length > 0) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Time slot is no longer available"
      );
    }

    // Get doctor info
    const doctor = await Doctor.findById(doctorId)
      .populate("specializationIds", "name")
      .lean();

    if (!doctor) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Doctor not found");
    }

    // Get clinic info if offline
    let clinic = null;
    if (mode === "offline" && clinicId) {
      clinic = await Clinic.findById(clinicId).lean();
    }

    // Ensure scheduledStart and scheduledEnd are proper Date objects
    // Use scheduledStart and scheduledEnd from request body (already validated)
    let appointmentScheduledStart = new Date(scheduledStart);
    let appointmentScheduledEnd = new Date(scheduledEnd);

    // Validate dates
    if (isNaN(appointmentScheduledStart.getTime())) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "scheduledStart is not a valid date"
      );
    }

    if (isNaN(appointmentScheduledEnd.getTime())) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "scheduledEnd is not a valid date"
      );
    }

    // Ensure scheduledEnd is after scheduledStart
    if (appointmentScheduledEnd <= appointmentScheduledStart) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "scheduledEnd must be after scheduledStart"
      );
    }

    // Prepare appointment data for payment
    const appointmentData = {
      doctorId: doctorId,
      slotId: slotId,
      mode: mode,
      clinicId: mode === "offline" ? clinicId : undefined,
      scheduledStart: appointmentScheduledStart,
      scheduledEnd: appointmentScheduledEnd,
      reason: reason || "",
    };

    // Calculate price
    const price = await calculateAppointmentBookingFee({
      doctorId: doctor._id,
      mode: mode,
      scheduledStart: appointmentScheduledStart,
      scheduledEnd: appointmentScheduledEnd,
    });

    if (price === 0) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Tổng số tiền thanh toán là 0"
      );
    }

    // Get specialization names
    const specializationNames =
      doctor.specializationIds
        ?.map((s) => (typeof s === "object" ? s.name : s))
        .join(", ") || "";

    // Create payment items
    const modeText = mode === "online" ? "Trực tuyến" : "Tại phòng khám";
    const clinicText = clinic?.name ? ` - ${clinic.name}` : "";
    const timeText = appointmentScheduledStart
      ? ` (${new Date(appointmentScheduledStart).toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        })})`
      : "";

    const appointmentItems = [
      {
        description: `${doctor.fullName}${
          specializationNames ? ` - ${specializationNames}` : ""
        } (${modeText}${clinicText})${timeText}`,
        quantity: 1,
        unitPrice: price,
        lineTotal: price,
      },
    ];

    // Create payment record với appointmentData (chưa tạo appointment)
    const orderCode = Number(String(Date.now()).slice(-10));
    const invoiceNumber = `INV-APT-${orderCode}`;

    // Tạo payment object - Đảm bảo appointmentId KHÔNG được set
    const paymentData = {
      // KHÔNG có appointmentId - chỉ có appointmentData (pre-payment flow)
      // KHÔNG có medicalVisitId và appointmentIds vì đây là single appointment
      appointmentData: [appointmentData], // Lưu appointment data để tạo sau khi thanh toán thành công
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
        doctorId: doctor._id,
        clinicId: clinicId || null,
        doctorName: doctor.fullName || "MedConnect",
        clinicName: clinic?.name || "MedConnect Clinic",
      },
      items: appointmentItems,
      subtotal: price,
      discount: 0,
      total: price,
      gateway: gateway,
      method: method,
      status: "initiated", // Will be updated to captured after payment
      amountPaid: 0,
      orderCode: orderCode,
      pendingOrderCode: orderCode, // Temporary, will be cleared after payment
    };

    // Log payment data trước khi tạo
    console.log("🔍 Payment data before creation (single appointment):", {
      hasAppointmentId: "appointmentId" in paymentData,
      hasMedicalVisitId: "medicalVisitId" in paymentData,
      hasAppointmentData: "appointmentData" in paymentData,
      appointmentDataLength: paymentData.appointmentData?.length || 0,
      paymentDataKeys: Object.keys(paymentData),
    });

    // Đảm bảo appointmentId và medicalVisitId KHÔNG có trong paymentData
    // Xóa chúng nếu có (defensive programming)
    if ("appointmentId" in paymentData) {
      delete paymentData.appointmentId;
      console.log("⚠️ Removed appointmentId from paymentData");
    }
    if ("medicalVisitId" in paymentData) {
      delete paymentData.medicalVisitId;
      console.log("⚠️ Removed medicalVisitId from paymentData");
    }
    if ("appointmentIds" in paymentData) {
      delete paymentData.appointmentIds;
      console.log("⚠️ Removed appointmentIds from paymentData");
    }

    const payment = new Payment(paymentData);

    // Đảm bảo payment object không có appointmentId
    if (payment.appointmentId !== undefined) {
      payment.appointmentId = undefined;
      payment.unmarkModified("appointmentId");
      console.log("⚠️ Cleared appointmentId from payment object");
    }

    // Validate payment trước khi save
    try {
      // Manually validate appointmentData exists
      if (!payment.appointmentData || payment.appointmentData.length === 0) {
        throw new Error("appointmentData is required for pre-payment flow");
      }

      await payment.validate();
      console.log("✅ Payment validation passed (single appointment)");
    } catch (validationError) {
      console.error(
        "❌ Payment validation failed (single appointment):",
        validationError
      );
      console.error("Validation error details:", {
        name: validationError.name,
        message: validationError.message,
        errors: validationError.errors,
      });
      console.error("Payment object state:", {
        hasAppointmentId: payment.appointmentId !== undefined,
        appointmentIdValue: payment.appointmentId,
        hasMedicalVisitId: payment.medicalVisitId !== undefined,
        medicalVisitIdValue: payment.medicalVisitId,
        appointmentIdsLength: payment.appointmentIds?.length || 0,
        appointmentDataLength: payment.appointmentData?.length || 0,
        appointmentData: payment.appointmentData,
        isNew: payment.isNew,
      });

      // Format error message better
      if (validationError.errors) {
        const errorMessages = Object.keys(validationError.errors).map((key) => {
          return `${key}: ${validationError.errors[key].message}`;
        });
        throw new Error(
          `Payment validation failed: ${errorMessages.join(", ")}`
        );
      }
      throw validationError;
    }

    await payment.save();
    console.log(
      "✅ Payment saved successfully (single appointment):",
      payment._id
    );

    // Create PayOS payment link (if gateway is payos)
    if (gateway === "payos") {
      try {
        const { createPayosPaymentLink } = await import(
          "../services/payos.service.js"
        );
        const payosResult = await createPayosPaymentLink(appUserId, {
          paymentId: payment._id.toString(), // Pass paymentId for pre-payment flow
          amount: price,
          description: `MC Apt ${String(orderCode).slice(-8)}`, // Max 25 chars: "MC Apt " (7) + 8 = 15 chars
        });

        // Update payment with payUrl
        payment.payUrl = payosResult.payUrl;
        await payment.save();

        return ok(res, {
          paymentId: payment._id,
          payUrl: payosResult.payUrl,
          orderCode: orderCode,
          totalAmount: price,
          appointmentSummary: {
            doctorId: doctor._id,
            doctorName: doctor.fullName,
            specializationName: specializationNames || "N/A",
            mode: mode,
            scheduledStart: appointmentScheduledStart,
            scheduledEnd: appointmentScheduledEnd,
            clinicId: clinicId || null,
            clinicName: clinic?.name || null,
            reason: reason || "",
            price: price,
          },
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
        totalAmount: price,
        appointmentSummary: {
          doctorId: doctor._id,
          doctorName: doctor.fullName,
          specializationName: specializationNames || "N/A",
          mode: mode,
          scheduledStart: appointmentScheduledStart,
          scheduledEnd: appointmentScheduledEnd,
          clinicId: clinicId || null,
          clinicName: clinic?.name || null,
          reason: reason || "",
          price: price,
        },
        message: `Payment created for ${gateway}. Payment link will be generated separately.`,
      });
    }
  } catch (error) {
    console.error("❌ Error in createPaymentForSingleAppointment:", error);
    return fail(
      res,
      500,
      ERROR_CODES.SERVER_ERROR,
      error.message || String(error)
    );
  }
}
