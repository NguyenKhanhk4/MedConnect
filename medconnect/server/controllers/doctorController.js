import mongoose from "mongoose";
import Doctor from "../models/doctor.model.js";
import User from "../models/user.model.js";
import Patient from "../models/patient.model.js";
import Appointment from "../models/appointment.model.js";
import Specialization from "../models/specialization.model.js";
import Clinic from "../models/clinic.model.js";
import ConsultationSummary from "../models/consultationSummary.model.js";
import ConsultationAdvice from "../models/consultationAdvice.model.js";
import Prescription from "../models/prescription.model.js";
import DoctorTimeSlot from "../models/doctorTimeSlot.model.js";
import DoctorScheduleRule from "../models/doctor_schedule_rules.model.js";
import Review from "../models/review.model.js";
import AuthProvider from "../models/auth_providers.model.js";
import EducationLevelPrice from "../models/educationLevelPrice.model.js";
import { createAppointmentNotification } from "../services/notificationService.js";
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
 * Get doctor profile by ID
 */
export async function getDoctorProfile(req, res) {
  try {
    const { doctorId } = req.params;

    const doctor = await Doctor.findById(doctorId)
      .populate("userId", "fullName email phone")
      .populate("specializationIds", "name code")
      .populate("clinicDefaultId", "name address phone")
      .lean();

    if (!doctor) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Doctor not found");
    }

    return ok(res, { doctor });
  } catch (e) {
    console.error("getDoctorProfile error:", e);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, e.message || String(e));
  }
}

/**
 * Get current doctor profile (from authenticated user)
 */
export async function getCurrentDoctorProfile(req, res) {
  try {
    // Use email-based authentication instead of Firebase UID
    const userEmail = req.user?.email;
    if (!userEmail) {
      return fail(
        res,
        401,
        ERROR_CODES.UNAUTHORIZED,
        "User email not found in token"
      );
    }

    // Find user directly by email (simplified approach)
    const user = await User.findOne({ email: userEmail }).lean();
    if (!user) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "User not found by email");
    }

    // Find doctor profile
    const doctor = await Doctor.findOne({ userId: user._id })
      .populate("userId", "fullName email phone")
      .populate("specializationIds", "name code")
      .populate("clinicDefaultId", "name address phone")
      .lean();

    if (!doctor) {
      return fail(
        res,
        404,
        ERROR_CODES.NOT_FOUND,
        "Doctor profile not found for user"
      );
    }

    // Build licenseImageUrl from licenseNo (similar to getPendingDoctors and getVerifiedDoctors)
    if (doctor.licenseNo && !doctor.licenseImageUrl) {
      doctor.licenseImageUrl = `/server-uploads/doctors/${doctor.licenseNo}`;
    }

    return ok(res, { doctor });
  } catch (e) {
    console.error("getCurrentDoctorProfile error:", e);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, e.message || String(e));
  }
}

/**
 * Update doctor profile
 */
export async function updateDoctorProfile(req, res) {
  try {
    // Use email-based authentication (consistent with other functions)
    const userEmail = req.user?.email;
    if (!userEmail) {
      return fail(
        res,
        401,
        ERROR_CODES.UNAUTHORIZED,
        "User email not found in token"
      );
    }

    // Find user directly by email
    const user = await User.findOne({ email: userEmail }).lean();
    if (!user) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "User not found by email");
    }

    const appUserId = user._id;

    const {
      fullName,
      email,
      phone,
      licenseNo,
      yearsExperience,
      bio,
      avatarUrl,
      clinicDefaultId,
      specializationIds,
      educationLevel,
    } = req.body;

    // Update user basic info first (like in updatePatientProfile)
    const userUpdate = {};
    if (fullName) userUpdate.fullName = fullName;
    if (email) userUpdate.email = email;
    if (phone) userUpdate.phone = phone;

    if (Object.keys(userUpdate).length > 0) {
      await User.findByIdAndUpdate(appUserId, userUpdate, {
        new: true,
      });
    }

    // Update doctor profile
    const doctorUpdateData = {};
    if (fullName) doctorUpdateData.fullName = fullName;
    if (licenseNo) doctorUpdateData.licenseNo = licenseNo;
    if (yearsExperience !== undefined)
      doctorUpdateData.yearsExperience = yearsExperience;
    if (bio) doctorUpdateData.bio = bio;
    if (avatarUrl) doctorUpdateData.avatarUrl = avatarUrl;
    if (clinicDefaultId) doctorUpdateData.clinicDefaultId = clinicDefaultId;
    if (specializationIds)
      doctorUpdateData.specializationIds = specializationIds;
    if (educationLevel !== undefined)
      doctorUpdateData.educationLevel = educationLevel;

    const doctor = await Doctor.findOneAndUpdate(
      { userId: appUserId },
      doctorUpdateData,
      { new: true, runValidators: true }
    )
      .populate("userId", "fullName email phone")
      .populate("specializationIds", "name code")
      .populate("clinicDefaultId", "name address phone");

    if (!doctor) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Doctor profile not found");
    }

    // Education level is now used directly from EducationLevelPrice, no sync needed

    // Note: Doctors cannot update their profile themselves.
    // Only manager/admin can update doctor information via updateUser endpoint.
    // No automatic activation check here.

    return ok(res, { doctor });
  } catch (e) {
    console.error("updateDoctorProfile error:", e);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, e.message || String(e));
  }
}

/**
 * Get doctor appointments
 */
export async function getDoctorAppointments(req, res) {
  try {
    // Use email-based authentication instead of Firebase UID
    const userEmail = req.user?.email;
    if (!userEmail) {
      return fail(
        res,
        401,
        ERROR_CODES.UNAUTHORIZED,
        "User email not found in token"
      );
    }

    // Find user directly by email (simplified approach)
    const user = await User.findOne({ email: userEmail }).lean();
    if (!user) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "User not found by email");
    }

    // Then find the Doctor document by userId
    const doctor = await Doctor.findOne({ userId: user._id });
    if (!doctor) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Doctor profile not found");
    }

    const { status, date, page = 1, limit = 1000 } = req.query;
    const skip = (page - 1) * limit;

    const filter = { doctorId: doctor._id };
    // Exclude pending_doctor status from doctor's schedule (auto-accepted appointments only)
    // All new appointments are automatically accepted, so pending_doctor is no longer used
    if (status) {
      // If status is explicitly requested, use it (but pending_doctor will return empty)
      filter.status = status;
    } else {
      // If no status filter, exclude pending_doctor (show only accepted and other statuses)
      filter.status = { $ne: "pending_doctor" };
    }
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      filter.scheduledStart = { $gte: startDate, $lt: endDate };
    }

    // CRITICAL: Only show appointments that have been paid (paymentStatus = "paid")
    // Unpaid appointments should NOT appear in doctor's schedule
    // This ensures only confirmed/paid bookings are visible to doctors
    // Legacy appointments without paymentStatus are excluded to ensure consistency
    filter.paymentStatus = "paid";

    const appointments = await Appointment.find(filter)
      .populate({
        path: "patientId",
        select:
          "fullName dob gender phone email relationshipToOwner representativeName representativeRelation representativePhone representativeCitizenId",
        populate: {
          path: "userId",
          select: "fullName email phone",
        },
      })
      .populate("slotId")
      .populate("originalSlotId", "startAt endAt") // Populate original slot for in-place rescheduled appointments
      .populate("originalDoctorId", "fullName") // Populate original doctor for in-place rescheduled appointments
      .populate("originalClinicId", "name address") // Populate original clinic for in-place rescheduled appointments
      .populate("rescheduledToId", "scheduledStart scheduledEnd status")
      .populate({
        path: "rescheduledFromId",
        select: "scheduledStart scheduledEnd status patientId",
        populate: {
          path: "patientId",
          select:
            "fullName dob gender phone email relationshipToOwner representativeName representativeRelation representativePhone representativeCitizenId",
          populate: {
            path: "userId",
            select: "email phone",
          },
        },
      })
      .sort({ scheduledStart: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const appointmentsWithMissingPatients = appointments.filter(
      (apt) =>
        !apt.patientId ||
        (typeof apt.patientId === "object" && !apt.patientId.fullName)
    );
    if (appointmentsWithMissingPatients.length > 0) {
      console.warn(
        `⚠️ Found ${appointmentsWithMissingPatients.length} appointments with missing or invalid patientId`
      );

      // Try to manually populate patientId for these appointments
      for (const apt of appointmentsWithMissingPatients) {
        const originalPatientId = apt.patientId;
        let patientIdValue = null;

        if (originalPatientId) {
          // Get patientId value (could be ObjectId or string)
          patientIdValue =
            typeof originalPatientId === "string"
              ? originalPatientId
              : originalPatientId._id?.toString() ||
              originalPatientId.toString();

          try {
            // Try to fetch patient manually
            const patient = await Patient.findById(patientIdValue)
              .select(
                "fullName dob gender phone email relationshipToOwner representativeName representativeRelation representativePhone representativeCitizenId userId"
              )
              .populate("userId", "fullName email phone")
              .lean();

            if (patient) {
              // Successfully fetched patient - replace the invalid patientId
              apt.patientId = patient;
              console.log(
                `✅ Manually populated patientId for appointment ${apt._id}: ${patient.fullName}`
              );
            } else {
              console.warn(
                `  - Appointment ${apt._id}: Patient document not found for patientId: ${patientIdValue}`
              );
            }
          } catch (error) {
            console.error(
              `  - Error fetching patient for appointment ${apt._id}:`,
              error.message
            );
          }
        } else {
          console.warn(`  - Appointment ${apt._id}: patientId is null`);
        }
      }
    }

    // Check which appointments have consultation records
    const appointmentIds = appointments.map((apt) => apt._id);
    const consultationSummaries = await ConsultationSummary.find({
      appointmentId: { $in: appointmentIds },
    })
      .select("appointmentId")
      .lean();

    const consultationAdvices = await ConsultationAdvice.find({
      appointmentId: { $in: appointmentIds },
    })
      .select("appointmentId")
      .lean();

    const summaryAppointmentIds = new Set(
      consultationSummaries.map((s) => s.appointmentId.toString())
    );
    const adviceAppointmentIds = new Set(
      consultationAdvices.map((a) => a.appointmentId.toString())
    );

    // Add hasConsultationRecord flag to each appointment
    // Also ensure new fields (services, totalPay, amountPaid) have default values
    // Ensure patientId is properly populated
    const appointmentsWithFlags = appointments.map((apt) => {
      const aptIdStr = apt._id.toString();
      const hasConsultationRecord =
        summaryAppointmentIds.has(aptIdStr) ||
        adviceAppointmentIds.has(aptIdStr);

      // Ensure patientId is properly populated - if null, try to manually populate
      let patientId = apt.patientId;

      // Check if patientId is properly populated
      if (!patientId) {
        // patientId is null - this should not happen but handle it
        console.warn(`⚠️ Appointment ${aptIdStr} has null patientId`);
        patientId = {
          _id: null,
          fullName: "Không có thông tin",
          phone: null,
          dob: null,
          gender: null,
          userId: null,
        };
      } else if (
        typeof patientId === "string" ||
        (patientId._id && !patientId.fullName)
      ) {
        // patientId is an ObjectId string or ObjectId - not populated properly
        console.warn(
          `⚠️ Appointment ${aptIdStr} patientId not populated:`,
          patientId
        );
        // Try to fetch patient manually
        const patientIdValue =
          typeof patientId === "string"
            ? patientId
            : patientId._id?.toString() || patientId.toString();
        patientId = {
          _id: patientIdValue,
          fullName: "Đang tải...",
          phone: null,
          dob: null,
          gender: null,
          userId: null,
        };
      } else if (
        typeof patientId === "object" &&
        (!patientId.fullName || typeof patientId.fullName !== "string")
      ) {
        // patientId is an object but missing fullName or fullName is invalid
        console.warn(
          `⚠️ Appointment ${aptIdStr} patientId missing fullName:`,
          patientId
        );
        patientId = {
          _id: patientId._id || patientId,
          fullName: patientId.fullName || "Không có thông tin",
          phone: patientId.phone || null,
          dob: patientId.dob || null,
          gender: patientId.gender || null,
          email: patientId.email || null,
          userId: patientId.userId || null,
          relationshipToOwner: patientId.relationshipToOwner || null,
          representativeName: patientId.representativeName || null,
          representativeRelation: patientId.representativeRelation || null,
          representativePhone: patientId.representativePhone || null,
          representativeCitizenId: patientId.representativeCitizenId || null,
        };
      }

      // Ensure new fields have default values for backward compatibility
      // Note: reason field is included via ...apt spread, but ensure it's explicitly available
      return {
        ...apt,
        patientId, // Use properly populated patientId
        hasConsultationRecord,
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
        reason: apt.reason || null, // Explicitly include reason field
      };
    });

    const total = await Appointment.countDocuments(filter);

    return ok(res, {
      appointments: appointmentsWithFlags,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (e) {
    console.error("getDoctorAppointments error:", e);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, e.message || String(e));
  }
}

/**
 * Get doctor dashboard statistics
 */
export async function getDoctorDashboardStats(req, res) {
  try {
    // Use email-based authentication instead of Firebase UID
    const userEmail = req.user?.email;
    if (!userEmail) {
      return fail(
        res,
        401,
        ERROR_CODES.UNAUTHORIZED,
        "User email not found in token"
      );
    }

    // Find user directly by email (simplified approach)
    const user = await User.findOne({ email: userEmail }).lean();
    if (!user) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "User not found by email");
    }

    // Then find the Doctor document by userId
    const doctor = await Doctor.findOne({ userId: user._id });
    if (!doctor) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Doctor profile not found");
    }

    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1
    );

    // Today's appointments (include: accepted, in_progress, done, no_show)
    // Exclude: pending_doctor (removed), cancelled, rejected (these are not considered "appointments")
    const todayAppointments = await Appointment.countDocuments({
      doctorId: doctor._id,
      scheduledStart: { $gte: startOfDay, $lt: endOfDay },
      status: {
        $in: ["accepted", "in_progress", "done", "no_show"],
      },
    });

    // Available slots today = slots with status "available" + slots with cancelled/rejected appointments
    // Get available slots (slots that are not booked)
    const availableSlotsCount = await DoctorTimeSlot.countDocuments({
      doctorId: doctor._id,
      startAt: { $gte: startOfDay, $lt: endOfDay },
      status: "available",
    });

    // Get slots with cancelled or rejected appointments (these count as available)
    const cancelledRejectedSlots = await Appointment.countDocuments({
      doctorId: doctor._id,
      scheduledStart: { $gte: startOfDay, $lt: endOfDay },
      status: { $in: ["cancelled", "rejected"] },
    });

    // Total available slots = empty slots + cancelled/rejected slots
    const availableSlots = availableSlotsCount + cancelledRejectedSlots;

    // Pending appointments (no longer used - all appointments are auto-accepted)
    // Set to 0 since pending_doctor status has been removed
    const pendingAppointments = 0;

    // All stats are for today only - removed weekly appointments calculation
    // This field is no longer used as we only show today's data
    const weeklyAppointments = 0;

    // Completed appointments (all time - from beginning to now)
    const completedAppointments = await Appointment.countDocuments({
      doctorId: doctor._id,
      status: "done",
    });

    return ok(res, {
      stats: {
        todayAppointments,
        availableSlots,
        pendingAppointments,
        weeklyAppointments,
        completedAppointments,
      },
    });
  } catch (e) {
    console.error("getDoctorDashboardStats error:", e);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, e.message || String(e));
  }
}

/**
 * Get appointment detail by ID
 */
export async function getDoctorAppointmentDetail(req, res) {
  try {
    console.log("🔍 getDoctorAppointmentDetail - req.user:", req.user);

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
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "User not found by email");
    }

    const { appointmentId } = req.params;

    const doctor = await Doctor.findOne({ userId: user._id });
    if (!doctor) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Doctor profile not found");
    }

    const appointment = await Appointment.findOne({
      _id: appointmentId,
      doctorId: doctor._id,
    })
      .populate({
        path: "patientId",
        select:
          "fullName dob gender phone relationshipToOwner representativeName representativeRelation representativePhone representativeCitizenId",
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
      return fail(
        res,
        404,
        ERROR_CODES.NOT_FOUND,
        "Appointment not found or does not belong to this doctor"
      );
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
        representativeName: appointment.patientId?.representativeName || null,
        representativeRelation:
          appointment.patientId?.representativeRelation || null,
        representativePhone: appointment.patientId?.representativePhone || null,
        representativeCitizenId:
          appointment.patientId?.representativeCitizenId || null,
      };
    }

    console.log("✅ Doctor appointment detail fetched:", {
      appointmentId: appointment._id,
      status: appointment.status,
      hasPatient: !!patientId,
      patientName: patientId?.fullName,
    });

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

    return ok(res, appointmentWithDefaults);
  } catch (e) {
    console.error("getDoctorAppointmentDetail error:", e);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, e.message || String(e));
  }
}

/**
 * Helper function to send appointment acceptance email to patient
 */
async function sendAppointmentAcceptanceEmail(appointment, patient, doctor) {
  try {
    console.log(`📧 sendAppointmentAcceptanceEmail called with:`, {
      patientEmail: patient?.email,
      patientUserId: patient?.userId,
      hasUserIdObject: patient?.userId && typeof patient.userId === "object",
      userIdEmail: patient?.userId?.email,
    });

    // Lấy email từ Patient hoặc User
    let patientEmail = patient.email;

    // Nếu Patient không có email, lấy từ User (userId có thể là object đã populate hoặc ObjectId)
    if (!patientEmail) {
      if (
        patient.userId &&
        typeof patient.userId === "object" &&
        patient.userId.email
      ) {
        // userId đã được populate
        patientEmail = patient.userId.email;
        console.log(`📧 Found email from populated userId: ${patientEmail}`);
      } else if (patient.userId) {
        // userId là ObjectId, cần query
        console.log(`📧 Querying User for email, userId: ${patient.userId}`);
        const patientUser = await User.findById(patient.userId)
          .select("email")
          .lean();
        if (patientUser) {
          patientEmail = patientUser.email;
          console.log(`📧 Found email from User query: ${patientEmail}`);
        } else {
          console.log(`⚠️ User not found for userId: ${patient.userId}`);
        }
      }
    } else {
      console.log(`📧 Using email from patient object: ${patientEmail}`);
    }

    // Nếu vẫn không có email, không gửi
    if (!patientEmail) {
      console.log(
        "⚠️ Patient email not found, skipping email notification. Patient data:",
        {
          patientId: patient?._id,
          patientEmail: patient?.email,
          userId: patient?.userId,
        }
      );
      return;
    }

    console.log(`📧 Sending acceptance email to: ${patientEmail}`);

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

    // Lấy tên bác sĩ
    const doctorName = doctor?.fullName || doctor?.userId?.fullName || "Bác sĩ";

    // Tạo nội dung email
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2b6cb0; border-bottom: 2px solid #2b6cb0; padding-bottom: 10px;">
          Lịch hẹn của bạn đã được xác nhận
        </h2>
        <p>Xin chào <strong>${patient.fullName || "Bệnh nhân"}</strong>,</p>
        <p>Chúng tôi xin thông báo rằng lịch hẹn khám của bạn đã được <strong style="color: #059669;">xác nhận</strong> bởi bác sĩ.</p>
        
        <div style="background-color: #f0f9ff; border-left: 4px solid #2b6cb0; padding: 15px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1e40af;">Thông tin lịch hẹn:</h3>
          <p style="margin: 8px 0;"><strong>Bác sĩ:</strong> ${doctorName}</p>
          <p style="margin: 8px 0;"><strong>Thời gian:</strong> ${dateStr}</p>
          <p style="margin: 8px 0;"><strong>Giờ:</strong> ${timeStr}</p>
          <p style="margin: 8px 0;"><strong>Hình thức:</strong> ${modeText}</p>
          ${appointment.reason
        ? `<p style="margin: 8px 0;"><strong>Lý do khám:</strong> ${appointment.reason}</p>`
        : ""
      }
        </div>

        <p>Vui lòng đảm bảo bạn có mặt đúng giờ hẹn.</p>
        ${appointment.mode === "online"
        ? "<p><strong>Lưu ý:</strong> Đây là cuộc hẹn online. Vui lòng chuẩn bị kết nối internet ổn định và tham gia cuộc gọi video đúng giờ.</p>"
        : ""
      }
        
        <p style="margin-top: 30px;">Trân trọng,<br><strong>MedConnect</strong></p>
      </div>
    `;

    const textContent = `
Lịch hẹn của bạn đã được xác nhận

Xin chào ${patient.fullName || "Bệnh nhân"},

Chúng tôi xin thông báo rằng lịch hẹn khám của bạn đã được xác nhận bởi bác sĩ.

Thông tin lịch hẹn:
- Bác sĩ: ${doctorName}
- Thời gian: ${dateStr}
- Giờ: ${timeStr}
- Hình thức: ${modeText}
${appointment.reason ? `- Lý do khám: ${appointment.reason}` : ""}

Vui lòng đảm bảo bạn có mặt đúng giờ hẹn.
${appointment.mode === "online"
        ? "\nLưu ý: Đây là cuộc hẹn online. Vui lòng chuẩn bị kết nối internet ổn định và tham gia cuộc gọi video đúng giờ."
        : ""
      }

Trân trọng,
MedConnect
    `;

    console.log(`📧 Attempting to send email via sendMail...`);
    const emailResult = await sendMail({
      to: patientEmail,
      subject: "Lịch hẹn của bạn đã được xác nhận - MedConnect",
      text: textContent,
      html: htmlContent,
    });

    console.log(
      `✅ Appointment acceptance email sent successfully to ${patientEmail}`
    );
    console.log(`📧 Email result:`, {
      messageId: emailResult?.messageId,
      response: emailResult?.response,
    });
  } catch (error) {
    console.error("❌ Error sending appointment acceptance email:", error);
    console.error("❌ Error details:", {
      message: error?.message,
      stack: error?.stack,
      status: error?.status,
    });
    // Không throw error để không ảnh hưởng đến flow chính
  }
}

/**
 * Helper function to send appointment rejection email to patient
 */
async function sendAppointmentRejectionEmail(
  appointment,
  patient,
  doctor,
  rejectReason
) {
  try {
    console.log(`📧 sendAppointmentRejectionEmail called with:`, {
      patientEmail: patient?.email,
      patientUserId: patient?.userId,
      hasUserIdObject: patient?.userId && typeof patient.userId === "object",
      userIdEmail: patient?.userId?.email,
      rejectReason: rejectReason,
    });

    // Lấy email từ Patient hoặc User
    let patientEmail = patient.email;

    // Nếu Patient không có email, lấy từ User (userId có thể là object đã populate hoặc ObjectId)
    if (!patientEmail) {
      if (
        patient.userId &&
        typeof patient.userId === "object" &&
        patient.userId.email
      ) {
        // userId đã được populate
        patientEmail = patient.userId.email;
        console.log(`📧 Found email from populated userId: ${patientEmail}`);
      } else if (patient.userId) {
        // userId là ObjectId, cần query
        console.log(`📧 Querying User for email, userId: ${patient.userId}`);
        const patientUser = await User.findById(patient.userId)
          .select("email")
          .lean();
        if (patientUser) {
          patientEmail = patientUser.email;
          console.log(`📧 Found email from User query: ${patientEmail}`);
        } else {
          console.log(`⚠️ User not found for userId: ${patient.userId}`);
        }
      }
    } else {
      console.log(`📧 Using email from patient object: ${patientEmail}`);
    }

    // Nếu vẫn không có email, không gửi
    if (!patientEmail) {
      console.log(
        "⚠️ Patient email not found, skipping email notification. Patient data:",
        {
          patientId: patient?._id,
          patientEmail: patient?.email,
          userId: patient?.userId,
        }
      );
      return;
    }

    console.log(`📧 Sending rejection email to: ${patientEmail}`);

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

    // Lấy tên bác sĩ
    const doctorName = doctor?.fullName || doctor?.userId?.fullName || "Bác sĩ";

    // Tạo nội dung email
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 10px;">
          Lịch hẹn của bạn đã bị từ chối
        </h2>
        <p>Xin chào <strong>${patient.fullName || "Bệnh nhân"}</strong>,</p>
        <p>Chúng tôi rất tiếc thông báo rằng lịch hẹn khám của bạn đã bị <strong style="color: #dc2626;">từ chối</strong> bởi bác sĩ.</p>
        
        <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #991b1b;">Thông tin lịch hẹn:</h3>
          <p style="margin: 8px 0;"><strong>Bác sĩ:</strong> ${doctorName}</p>
          <p style="margin: 8px 0;"><strong>Thời gian:</strong> ${dateStr}</p>
          <p style="margin: 8px 0;"><strong>Giờ:</strong> ${timeStr}</p>
          <p style="margin: 8px 0;"><strong>Hình thức:</strong> ${modeText}</p>
          ${appointment.reason
        ? `<p style="margin: 8px 0;"><strong>Lý do khám:</strong> ${appointment.reason}</p>`
        : ""
      }
          ${rejectReason
        ? `<p style="margin: 8px 0;"><strong>Lý do từ chối:</strong> ${rejectReason}</p>`
        : ""
      }
        </div>

        <p>Bạn có thể đặt lịch hẹn mới với bác sĩ khác hoặc chọn thời gian khác phù hợp hơn.</p>
        <p>Chúng tôi xin lỗi vì sự bất tiện này và cảm ơn bạn đã tin tưởng sử dụng dịch vụ của MedConnect.</p>
        
        <p style="margin-top: 30px;">Trân trọng,<br><strong>MedConnect</strong></p>
      </div>
    `;

    const textContent = `
Lịch hẹn của bạn đã bị từ chối

Xin chào ${patient.fullName || "Bệnh nhân"},

Chúng tôi rất tiếc thông báo rằng lịch hẹn khám của bạn đã bị từ chối bởi bác sĩ.

Thông tin lịch hẹn:
- Bác sĩ: ${doctorName}
- Thời gian: ${dateStr}
- Giờ: ${timeStr}
- Hình thức: ${modeText}
${appointment.reason ? `- Lý do khám: ${appointment.reason}` : ""}
${rejectReason ? `- Lý do từ chối: ${rejectReason}` : ""}

Bạn có thể đặt lịch hẹn mới với bác sĩ khác hoặc chọn thời gian khác phù hợp hơn.
Chúng tôi xin lỗi vì sự bất tiện này và cảm ơn bạn đã tin tưởng sử dụng dịch vụ của MedConnect.

Trân trọng,
MedConnect
    `;

    console.log(`📧 Attempting to send rejection email via sendMail...`);
    const emailResult = await sendMail({
      to: patientEmail,
      subject: "Lịch hẹn của bạn đã bị từ chối - MedConnect",
      text: textContent,
      html: htmlContent,
    });

    console.log(
      `✅ Appointment rejection email sent successfully to ${patientEmail}`
    );
    console.log(`📧 Email result:`, {
      messageId: emailResult?.messageId,
      response: emailResult?.response,
    });
  } catch (error) {
    console.error("❌ Error sending appointment rejection email:", error);
    console.error("❌ Error details:", {
      message: error?.message,
      stack: error?.stack,
      status: error?.status,
    });
    // Không throw error để không ảnh hưởng đến flow chính
  }
}

// NOTE: sendAppointmentCompletedEmail đã được di chuyển sang payos.service.js
// để hỗ trợ cả single và multiple appointments, và đặt cho người thân

/**
 * Update appointment status
 */
export async function updateAppointmentStatus(req, res) {
  try {
    console.log("==========================================");
    console.log("📞 updateAppointmentStatus called");
    console.log("🔍 updateAppointmentStatus - req.user:", req.user);
    console.log(
      "🔍 updateAppointmentStatus - req.user.email:",
      req.user?.email
    );

    // Use email-based authentication instead of Firebase UID
    const userEmail = req.user?.email;
    if (!userEmail) {
      console.log("❌ User email not found in token");
      return fail(
        res,
        401,
        ERROR_CODES.UNAUTHORIZED,
        "User email not found in token"
      );
    }

    // Find user directly by email (simplified approach)
    const user = await User.findOne({ email: userEmail }).lean();
    if (!user) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "User not found by email");
    }

    const { appointmentId } = req.params;
    const { status, cancelReason } = req.body;

    console.log("🔍 updateAppointmentStatus - Request params:", {
      appointmentId,
      status,
      cancelReason,
    });
    console.log(
      "📧 Will send email if status is accepted or rejected:",
      status === "accepted" || status === "rejected"
    );

    const doctor = await Doctor.findOne({ userId: user._id });
    if (!doctor) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Doctor profile not found");
    }

    console.log("✅ updateAppointmentStatus - Doctor found:", doctor._id);

    const appointment = await Appointment.findOne({
      _id: appointmentId,
      doctorId: doctor._id,
    });

    console.log("🔍 updateAppointmentStatus - Appointment lookup result:", {
      found: !!appointment,
      currentStatus: appointment?.status,
      appointmentId,
      doctorId: doctor._id,
    });

    if (!appointment) {
      return fail(
        res,
        404,
        ERROR_CODES.NOT_FOUND,
        "Appointment not found or does not belong to this doctor"
      );
    }

    // Validate status transition
    const validStatusTransitions = {
      pending_doctor: ["accepted", "rejected", "cancelled"],
      accepted: ["in_progress", "cancelled", "done", "no_show"],
      in_progress: ["done", "cancelled"],
      // "rejected", "cancelled", "done", "no_show" are terminal states or handled by patient
    };

    if (
      !validStatusTransitions[appointment.status] ||
      !validStatusTransitions[appointment.status].includes(status)
    ) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        `Invalid status transition from ${appointment.status} to ${status}`
      );
    }

    // CRITICAL: Enforce sequential appointments
    // If trying to start an appointment (status -> in_progress), check if there's already one in progress
    if (status === "in_progress") {
      const existingInProgress = await Appointment.findOne({
        doctorId: doctor._id,
        status: "in_progress",
        _id: { $ne: appointmentId }, // Exclude current appointment
      });

      if (existingInProgress) {
        return fail(
          res,
          400,
          ERROR_CODES.INVALID_INPUT,
          "Bạn đang có một ca khám khác đang diễn ra. Vui lòng hoàn thành ca khám hiện tại trước khi bắt đầu ca mới."
        );
      }
    }

    const updateData = { status };

    // Handle different status updates
    if (status === "accepted") {
      updateData.acceptedBy = doctor._id;
    } else if (status === "rejected") {
      updateData.rejectedBy = doctor._id;
      updateData.rejectReason = cancelReason; // Use cancelReason as rejectReason
    } else if (status === "cancelled") {
      updateData.cancelReason = cancelReason;
      updateData.cancelledAt = new Date();
      updateData.cancelledBy = user._id;
    } else if (status === "no_show") {
      updateData.noShowAt = new Date();
      updateData.noShowBy = doctor._id;
    }

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      updateData,
      { new: true }
    )
      .populate({
        path: "patientId",
        select: "fullName dob gender phone email userId",
        populate: {
          path: "userId",
          select: "email fullName",
        },
      })
      .populate("slotId")
      .populate({
        path: "doctorId",
        select: "fullName",
        populate: {
          path: "userId",
          select: "fullName email",
        },
      });

    // Send email notification when appointment is accepted, rejected, or done
    if (status === "accepted" || status === "rejected" || status === "done") {
      console.log(
        `📧 Preparing to send ${status} email for appointment ${appointmentId}`
      );
      try {
        const populatedAppointment = await Appointment.findById(appointmentId)
          .populate({
            path: "patientId",
            select: "fullName dob gender phone email userId",
            populate: {
              path: "userId",
              select: "email fullName",
            },
          })
          .populate({
            path: "doctorId",
            select: "fullName",
            populate: {
              path: "userId",
              select: "fullName email",
            },
          })
          .lean();

        console.log(`📧 Populated appointment:`, {
          hasPatientId: !!populatedAppointment?.patientId,
          patientEmail: populatedAppointment?.patientId?.email,
          userIdEmail: populatedAppointment?.patientId?.userId?.email,
          patientName: populatedAppointment?.patientId?.fullName,
        });

        if (populatedAppointment?.patientId) {
          if (status === "accepted") {
            // Gửi email xác nhận cho cả online và offline
            console.log(`📧 Calling sendAppointmentAcceptanceEmail...`);
            await sendAppointmentAcceptanceEmail(
              populatedAppointment,
              populatedAppointment.patientId,
              populatedAppointment.doctorId
            );
            console.log(`✅ sendAppointmentAcceptanceEmail completed`);
          } else if (status === "rejected") {
            // Gửi email từ chối cho cả online và offline
            console.log(`📧 Calling sendAppointmentRejectionEmail...`);
            await sendAppointmentRejectionEmail(
              populatedAppointment,
              populatedAppointment.patientId,
              populatedAppointment.doctorId,
              cancelReason || populatedAppointment.rejectReason
            );
            console.log(`✅ sendAppointmentRejectionEmail completed`);
          } else if (status === "done") {
            // Gửi email thông báo hoàn thành khám cho bệnh nhân
            // Sử dụng hàm mới từ payos.service.js hỗ trợ single và multiple appointments
            console.log(`📧 Calling sendAppointmentCompletedEmail...`);
            try {
              const { sendAppointmentCompletedEmail } = await import(
                "../services/payos.service.js"
              );
              await sendAppointmentCompletedEmail(
                populatedAppointment,
                populatedAppointment.patientId,
                populatedAppointment.doctorId
              );
              console.log(`✅ sendAppointmentCompletedEmail completed`);
            } catch (emailError) {
              console.error("❌ Error importing or calling sendAppointmentCompletedEmail:", emailError);
              // Không throw error để không ảnh hưởng đến flow chính
            }
          } else if (status === "no_show") {
            // Gửi email thông báo không đến khám cho bệnh nhân
            console.log(`📧 Calling sendAppointmentNoShowEmail...`);
            try {
              const { sendAppointmentNoShowEmail } = await import(
                "../services/payos.service.js"
              );
              await sendAppointmentNoShowEmail(
                populatedAppointment,
                populatedAppointment.patientId,
                populatedAppointment.doctorId
              );
              console.log(`✅ sendAppointmentNoShowEmail completed`);
            } catch (emailError) {
              console.error("❌ Error importing or calling sendAppointmentNoShowEmail:", emailError);
              // Không throw error để không ảnh hưởng đến flow chính
            }
          }
        } else {
          console.log(`⚠️ No patientId found in populated appointment`);
        }
      } catch (emailError) {
        console.error(`❌ Error sending ${status} email:`, emailError);
        console.error(`❌ Error stack:`, emailError.stack);
        // Don't fail the main request if email fails
      }
    }

    // Create notification for status change
    try {
      const additionalData = {};
      if (status === "rejected" && cancelReason) {
        additionalData.rejectReason = cancelReason;
      } else if (status === "cancelled" && cancelReason) {
        additionalData.cancelReason = cancelReason;
      }

      await createAppointmentNotification(
        appointmentId,
        status,
        additionalData
      );
      console.log(
        `✅ Notification created for appointment ${appointmentId} status: ${status}`
      );
    } catch (notificationError) {
      console.error("❌ Error creating notification:", notificationError);
      // Don't fail the main request if notification fails
    }

    return ok(res, {
      message: "Appointment status updated successfully",
      appointment: updatedAppointment,
    });
  } catch (e) {
    console.error("❌ updateAppointmentStatus error:", e);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, e.message || String(e));
  }
}

/**
 * Get all doctors (for search/listing)
 */
export async function getAllDoctors(req, res) {
  try {
    const {
      specialization,
      search,
      page = 1,
      limit = 10,
      verified,
      facility,
      experience,
      rating,
      priceRange,
      location,
      availability,
    } = req.query;

    const skip = (page - 1) * limit;
    const filter = {};

    // Default filter: Only show verified and active doctors for public API
    // Note: isActive may not exist for old doctors (default is true in schema)
    // So we filter by isVerified=true AND (isActive=true OR isActive doesn't exist)
    filter.isVerified = true;
    filter.$or = [
      { isActive: true },
      { isActive: { $exists: false } }, // Old doctors without isActive field (default is true)
    ];

    // Override isVerified if explicitly requested via query param
    if (verified !== undefined) {
      filter.isVerified = verified === "true";
      // If explicitly requesting non-verified doctors, don't filter by isActive
      if (verified === "false") {
        delete filter.$or;
      }
    }

    // Filter by specialization
    if (specialization) {
      // Convert string to ObjectId for proper MongoDB query
      try {
        const mongoose = await import("mongoose");
        const specializationObjectId = new mongoose.default.Types.ObjectId(
          specialization
        );
        filter.specializationIds = { $in: [specializationObjectId] };
        console.log(
          "Converted specialization to ObjectId:",
          specializationObjectId
        );
      } catch (error) {
        console.error("Invalid specialization ID:", specialization, error);
        return fail(
          res,
          400,
          ERROR_CODES.INVALID_INPUT,
          "Invalid specialization ID"
        );
      }
    }

    // Filter by search term
    if (search) {
      // Only search by doctor name, not bio
      filter.fullName = { $regex: search, $options: "i" };
    }

    // Filter by experience (yearsExperience)
    if (experience) {
      switch (experience) {
        case "1-3":
          filter.yearsExperience = { $gte: 1, $lt: 3 };
          break;
        case "3-5":
          filter.yearsExperience = { $gte: 3, $lt: 5 };
          break;
        case "5-10":
          filter.yearsExperience = { $gte: 5, $lt: 10 };
          break;
        case "10+":
          filter.yearsExperience = { $gte: 10 };
          break;
      }
    }

    // Filter by rating (ratingAvg) - now supports ranges (e.g., "4.5-5.0")
    if (rating) {
      // Check if rating is a range (e.g., "4.5-5.0") or single value (e.g., "4.5+")
      if (rating.includes("-")) {
        // Range format: "4.5-5.0"
        const [minRating, maxRating] = rating
          .split("-")
          .map((v) => parseFloat(v.trim()));
        if (
          !isNaN(minRating) &&
          !isNaN(maxRating) &&
          minRating >= 0 &&
          maxRating <= 5 &&
          minRating <= maxRating
        ) {
          // Filter doctors with ratingAvg in range [minRating, maxRating]
          // Also ensure they have at least 1 review (ratingCount > 0)
          filter.ratingAvg = { $gte: minRating, $lte: maxRating };
          filter.ratingCount = { $gt: 0 }; // Only doctors with at least 1 review
          console.log(
            `Filtering by rating range: ${minRating} - ${maxRating}, ratingCount > 0`
          );
        } else {
          console.log(`Invalid rating range: ${rating}`);
        }
      } else {
        // Legacy format: "4.5+" (for backward compatibility)
        const ratingValue = parseFloat(rating.replace("+", ""));
        if (!isNaN(ratingValue) && ratingValue >= 0 && ratingValue <= 5) {
          filter.ratingAvg = { $gte: ratingValue, $ne: null };
          filter.ratingCount = { $gt: 0 };
          console.log(
            `Filtering by rating: >= ${ratingValue}, ratingCount > 0`
          );
        } else {
          console.log(`Invalid rating value: ${rating}`);
        }
      }
    }

    // Filter by location (via Clinic name or address)
    if (location) {
      // Location now comes as lowercase with hyphens (e.g., "quan-1", "hai-chau")
      // Convert back to proper format for searching
      const locationFormats = [
        // Original format: "quan-1" -> ["Quận 1", "Q1", etc.]
        location
          .split("-")
          .map((part, index) => {
            if (index === 0 && part === "quan") return "Quận";
            return part.charAt(0).toUpperCase() + part.slice(1);
          })
          .join(" "),
        // Also try direct match
        location.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        // Original location string
        location,
      ];

      // Build regex pattern from all formats
      const regexPattern = locationFormats
        .map((fmt) => fmt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("|");

      // Find clinics by searching in both name and address fields
      // Clinic names often contain location like "MedConnect Clinic Quận 1"
      const clinics = await Clinic.find({
        $or: [
          // Search in clinic name (most common case)
          { name: { $regex: regexPattern, $options: "i" } },
          // Search in address field
          { address: { $regex: regexPattern, $options: "i" } },
          // Search for location field if it exists
          { location: { $regex: regexPattern, $options: "i" } },
        ],
      }).select("_id");

      const clinicIds = clinics.map((c) => c._id);
      if (clinicIds.length > 0) {
        filter.clinicDefaultId = { $in: clinicIds };
        console.log(
          `Found ${clinicIds.length} clinics for location: ${location}`
        );
      } else {
        // Return empty results if no clinic found in this location
        console.log(`No clinics found for location: ${location}`);
        return ok(res, {
          doctors: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            pages: 0,
          },
        });
      }
    }

    if (facility) {
      // Find clinic by name and filter doctors by clinicDefaultId
      try {
        console.log("🔍 Searching for clinic with facility name:", facility);

        // Try exact match first
        let clinic = await Clinic.findOne({ name: facility });

        // If not found, try regex match
        if (!clinic) {
          clinic = await Clinic.findOne({
            name: { $regex: facility, $options: "i" },
          });
        }

        // If still not found, try partial match
        if (!clinic) {
          const words = facility.split(" ").filter((word) => word.length > 2);
          if (words.length > 0) {
            clinic = await Clinic.findOne({
              name: { $regex: words.join("|"), $options: "i" },
            });
          }
        }

        if (clinic) {
          filter.clinicDefaultId = clinic._id;
          console.log("✅ Found clinic:", clinic.name, "ID:", clinic._id);
          console.log("🔍 Filter will be:", JSON.stringify(filter, null, 2));
        } else {
          console.log("❌ Clinic not found for facility:", facility);
          // List all clinics for debugging
          const allClinics = await Clinic.find({}, "name").lean();
          console.log(
            "Available clinics:",
            allClinics.map((c) => c.name)
          );

          // Return empty results if clinic not found
          return ok(res, {
            doctors: [],
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total: 0,
              pages: 0,
            },
          });
        }
      } catch (error) {
        console.error("Error finding clinic:", error);
        return fail(
          res,
          400,
          ERROR_CODES.INVALID_INPUT,
          "Invalid facility name"
        );
      }
    }

    // Filter by price range (via EducationLevelPrice)
    let doctorIdsByPrice = null;
    if (priceRange) {
      let minPrice, maxPrice;
      switch (priceRange) {
        case "0-300000":
          minPrice = 0;
          maxPrice = 300000;
          break;
        case "300000-500000":
          minPrice = 300000;
          maxPrice = 500000;
          break;
        case "500000-1000000":
          minPrice = 500000;
          maxPrice = 1000000;
          break;
        case "1000000+":
          minPrice = 1000000;
          maxPrice = null;
          break;
      }

      // Get education level prices in this range (online mode, use weekdayPrice as reference)
      const priceQuery = {
        mode: "online",
        isActive: true,
        weekdayPrice: maxPrice
          ? { $gte: minPrice, $lte: maxPrice }
          : { $gte: minPrice },
      };
      const educationLevelPrices = await EducationLevelPrice.find(priceQuery)
        .select("educationLevel")
        .lean();
      const educationLevelsInRange = educationLevelPrices.map(
        (p) => p.educationLevel
      );

      // Get doctors with these education levels
      const doctorsInRange = await Doctor.find({
        educationLevel: { $in: educationLevelsInRange },
        isVerified: true,
        isActive: true,
      })
        .select("_id")
        .lean();

      doctorIdsByPrice = doctorsInRange.map((d) => d._id.toString());

      if (doctorIdsByPrice.length === 0) {
        // Return empty results if no doctors match price range
        return ok(res, {
          doctors: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            pages: 0,
          },
        });
      }
    }

    // Filter by availability
    let doctorIdsByAvailability = null;
    if (availability) {
      const now = new Date();
      let startDate, endDate;

      switch (availability) {
        case "available-today": {
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 1);
          break;
        }
        case "available-week": {
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
          startDate.setHours(0, 0, 0, 0);
          const dayOfWeek = now.getDay();
          const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          startDate.setDate(startDate.getDate() - daysToMonday);
          endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 7);
          break;
        }
        case "online": {
          // Doctors with education levels that have online pricing configured
          const onlinePrices = await EducationLevelPrice.find({
            mode: "online",
            isActive: true,
          })
            .select("educationLevel")
            .lean();
          const educationLevelsWithOnline = onlinePrices.map(
            (p) => p.educationLevel
          );

          const doctorsWithOnline = await Doctor.find({
            educationLevel: { $in: educationLevelsWithOnline },
            isVerified: true,
            isActive: true,
          })
            .select("_id")
            .lean();

          doctorIdsByAvailability = doctorsWithOnline.map((d) =>
            d._id.toString()
          );
          break;
        }
      }

      if (availability !== "online" && startDate && endDate) {
        // Find doctors with available time slots in this range
        const availableSlots = await DoctorTimeSlot.find({
          startTime: { $gte: startDate, $lt: endDate },
          isAvailable: true,
        }).select("doctorId");
        doctorIdsByAvailability = [
          ...new Set(availableSlots.map((slot) => slot.doctorId.toString())),
        ];
      }

      if (
        doctorIdsByAvailability !== null &&
        doctorIdsByAvailability.length === 0
      ) {
        // Return empty results if no doctors match availability
        return ok(res, {
          doctors: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            pages: 0,
          },
        });
      }
    }

    // Combine filters - intersect doctor IDs if both filters are applied
    if (doctorIdsByPrice !== null || doctorIdsByAvailability !== null) {
      let combinedIds = null;

      if (doctorIdsByPrice !== null && doctorIdsByAvailability !== null) {
        // Both filters: intersect (both are already strings)
        combinedIds = doctorIdsByAvailability.filter((id) =>
          doctorIdsByPrice.includes(id)
        );
      } else if (doctorIdsByPrice !== null) {
        // Only price filter (already strings)
        combinedIds = doctorIdsByPrice;
      } else if (doctorIdsByAvailability !== null) {
        // Only availability filter (already strings)
        combinedIds = doctorIdsByAvailability;
      }

      if (combinedIds !== null && combinedIds.length > 0) {
        // Convert string IDs to ObjectIds for MongoDB query
        const mongoose = await import("mongoose");
        filter._id = {
          $in: combinedIds.map((id) => new mongoose.default.Types.ObjectId(id)),
        };
      } else if (combinedIds !== null && combinedIds.length === 0) {
        // No doctors match the combined filters
        return ok(res, {
          doctors: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            pages: 0,
          },
        });
      }
    }

    // Count total doctors with different statuses for debugging
    const totalDoctorsInDB = await Doctor.countDocuments({});
    const verifiedCount = await Doctor.countDocuments({ isVerified: true });
    const activeCount = await Doctor.countDocuments({ isActive: true });
    const verifiedAndActiveCount = await Doctor.countDocuments({
      isVerified: true,
      isActive: true,
    });
    const unverifiedCount = await Doctor.countDocuments({ isVerified: false });
    const inactiveCount = await Doctor.countDocuments({ isActive: false });
    // Count verified doctors without isActive field (old doctors)
    const verifiedWithoutIsActive = await Doctor.countDocuments({
      isVerified: true,
      isActive: { $exists: false },
    });
    // Count verified doctors matching our filter (verified AND (active OR no isActive))
    const verifiedMatchingFilter = await Doctor.countDocuments({
      isVerified: true,
      $or: [{ isActive: true }, { isActive: { $exists: false } }],
    });

    console.log(`📊 Doctor Statistics in MongoDB:`);
    console.log(`   Total doctors in DB: ${totalDoctorsInDB}`);
    console.log(`   ✅ Verified doctors: ${verifiedCount}`);
    console.log(`   ✅ Active doctors (isActive=true): ${activeCount}`);
    console.log(
      `   ✅ Verified AND Active (isActive=true): ${verifiedAndActiveCount}`
    );
    console.log(
      `   ⚠️  Verified but no isActive field: ${verifiedWithoutIsActive}`
    );
    console.log(
      `   ✅ Verified matching filter (verified + active/missing): ${verifiedMatchingFilter}`
    );
    console.log(`   ❌ Unverified doctors: ${unverifiedCount}`);
    console.log(`   ❌ Inactive doctors (isActive=false): ${inactiveCount}`);
    // Apply filters to find doctors
    let doctors = await Doctor.find(filter)
      .sort({ ratingAvg: -1, ratingCount: -1 })
      .lean();

    console.log(
      `\n🔍 Before populate: Found ${doctors.length} doctors matching filter`
    );

    // Check if specific doctor is in the results before populate
    const specificDoctorInResults = doctors.find(
      (d) => d._id.toString() === "690789003d30bfde2698ec1f"
    );
    if (specificDoctorInResults) {
      console.log(`✅ Specific doctor found in query results BEFORE populate`);
      console.log(`   Doctor data:`, {
        _id: specificDoctorInResults._id,
        fullName: specificDoctorInResults.fullName,
        userId: specificDoctorInResults.userId,
        isVerified: specificDoctorInResults.isVerified,
        isActive: specificDoctorInResults.isActive,
      });
    } else {
      console.log(
        `❌ Specific doctor NOT found in query results BEFORE populate`
      );
      // Check all doctor IDs
      console.log(
        `   All doctor IDs in results:`,
        doctors.map((d) => d._id.toString())
      );
    }

    // Now populate
    doctors = await Doctor.populate(doctors, [
      {
        path: "userId",
        select: "fullName email phone status emailVerified phoneVerified",
      },
      { path: "specializationIds", select: "name code" },
      { path: "clinicDefaultId", select: "name address phone" },
    ]);

    console.log(`🔍 After populate: ${doctors.length} doctors`);

    // Check if specific doctor still exists after populate
    const specificDoctorAfterPopulate = doctors.find(
      (d) => d._id.toString() === "690789003d30bfde2698ec1f"
    );
    if (specificDoctorAfterPopulate) {
      console.log(`✅ Specific doctor found AFTER populate`);
      console.log(
        `   userId populated:`,
        specificDoctorAfterPopulate.userId ? "yes" : "no"
      );
    } else {
      console.log(
        `❌ Specific doctor NOT found AFTER populate (this shouldn't happen)`
      );
    }

    // Calculate ratingAvg and ratingCount from Review collection for each doctor
    const doctorIds = doctors.map((d) => d._id);
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

    // Update each doctor with calculated rating data
    doctors = doctors.map((doctor) => {
      const ratingData = ratingMap.get(doctor._id.toString());
      if (ratingData) {
        return {
          ...doctor,
          ratingAvg: ratingData.ratingAvg,
          ratingCount: ratingData.ratingCount,
        };
      }
      // If no reviews, keep default values (0, 0)
      return {
        ...doctor,
        ratingAvg: doctor.ratingAvg || 0,
        ratingCount: doctor.ratingCount || 0,
      };
    });

    // Apply pagination AFTER populate and rating calculation
    const total = doctors.length; // Count before pagination
    doctors = doctors.slice(skip, skip + parseInt(limit));

    console.log(
      `🔍 After pagination (skip=${skip}, limit=${limit}): ${doctors.length} doctors`
    );

    // Check if specific doctor is in paginated results
    const specificDoctorInPaginated = doctors.find(
      (d) => d._id.toString() === "690789003d30bfde2698ec1f"
    );
    if (specificDoctorInPaginated) {
      console.log(
        `✅ Specific doctor IS in paginated results - will be returned`
      );
    } else {
      console.log(
        `❌ Specific doctor NOT in paginated results (out of page range)`
      );
      // Find its position
      const allDoctorsBeforePagination = await Doctor.find(filter)
        .sort({ ratingAvg: -1, ratingCount: -1 })
        .select("_id fullName")
        .lean();
      const doctorIndex = allDoctorsBeforePagination.findIndex(
        (d) => d._id.toString() === "690789003d30bfde2698ec1f"
      );
      if (doctorIndex >= 0) {
        console.log(
          `   Doctor is at index ${doctorIndex} of ${allDoctorsBeforePagination.length}`
        );
        console.log(
          `   Should appear on page ${Math.floor(doctorIndex / parseInt(limit)) + 1
          }`
        );
      }
    }

    const totalInDB = await Doctor.countDocuments(filter);

    console.log(
      `✅ Final result: Returning ${doctors.length} doctors out of ${totalInDB} total matching filter in DB`
    ); // Debug log

    // Log first few doctors for debugging
    if (doctors.length > 0) {
      console.log(
        `📋 Sample doctors found (first ${Math.min(3, doctors.length)}):`
      );
      doctors.slice(0, 3).forEach((doctor, index) => {
        console.log(`   ${index + 1}. ${doctor.fullName || "No name"}`, {
          doctorId: doctor._id,
          userId: doctor.userId?._id || doctor.userId,
          isVerified: doctor.isVerified,
          isActive: doctor.isActive,
          userStatus: doctor.userId?.status,
          emailVerified: doctor.userId?.emailVerified,
          phoneVerified: doctor.userId?.phoneVerified,
        });
      });
    } else {
      console.log(
        `⚠️ No doctors found matching filter. Listing sample of all doctors in database...`
      );
      const allDoctors = await Doctor.find({})
        .select("_id fullName isVerified isActive userId")
        .limit(10)
        .lean();
      console.log(`📋 Sample of all doctors in database (first 10):`);
      allDoctors.forEach((doctor, index) => {
        console.log(`   ${index + 1}. ${doctor.fullName || "No name"}`, {
          doctorId: doctor._id,
          isVerified: doctor.isVerified,
          isActive: doctor.isActive,
          userId: doctor.userId,
        });
      });

      // Show status breakdown
      const statusBreakdown = {
        verified_active: await Doctor.countDocuments({
          isVerified: true,
          isActive: true,
        }),
        verified_inactive: await Doctor.countDocuments({
          isVerified: true,
          isActive: false,
        }),
        unverified_active: await Doctor.countDocuments({
          isVerified: false,
          isActive: true,
        }),
        unverified_inactive: await Doctor.countDocuments({
          isVerified: false,
          isActive: false,
        }),
      };
      console.log(`📊 Status breakdown:`, statusBreakdown);
    }

    // Filter out picsum.photos URLs from avatarUrl
    const cleanedDoctors = doctors.map((doctor) => {
      if (doctor.avatarUrl && doctor.avatarUrl.includes("picsum.photos")) {
        doctor.avatarUrl = null;
      }
      return doctor;
    });

    return ok(res, {
      doctors: cleanedDoctors,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalInDB, // Use count from DB, not after populate
        pages: Math.ceil(totalInDB / limit),
      },
    });
  } catch (e) {
    console.error("❌ getAllDoctors error:", e);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, e.message || String(e));
  }
}

/**
 * Get consultation records (completed appointments with summaries)
 */
export async function getConsultationRecords(req, res) {
  try {
    console.log("🔍 getConsultationRecords - req.user:", req.user);

    // Firebase user object has uid, not app_user_id
    const firebaseUid = req.user?.uid;
    if (!firebaseUid) {
      return fail(res, 401, ERROR_CODES.UNAUTHORIZED, "User not authenticated");
    }

    // First, find the AuthProvider document by Firebase UID
    const authProvider = await AuthProvider.findOne({
      providerUid: firebaseUid,
      provider: "local",
    }).lean();

    if (!authProvider) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Auth provider not found");
    }

    // Then find the User document by userId from auth provider
    const user = await User.findById(authProvider.userId).lean();
    if (!user) {
      return fail(
        res,
        404,
        ERROR_CODES.NOT_FOUND,
        "User not found in database"
      );
    }

    // Find doctor profile
    const doctor = await Doctor.findOne({ userId: user._id });
    if (!doctor) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Doctor profile not found");
    }

    const { page = 1, limit = 10, search } = req.query;
    const skip = (page - 1) * limit;

    const filter = {
      doctorId: doctor._id,
      status: "done",
    };

    const appointments = await Appointment.find(filter)
      .populate("patientId", "fullName dob gender phone")
      .populate("slotId")
      .sort({ scheduledStart: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get consultation summaries for these appointments
    const appointmentIds = appointments.map((apt) => apt._id);
    const summaries = await ConsultationSummary.find({
      appointmentId: { $in: appointmentIds },
    }).lean();

    // Get prescriptions for these appointments
    const prescriptions = await Prescription.find({
      appointmentId: { $in: appointmentIds },
    }).lean();

    // Combine data
    const records = appointments.map((appointment) => {
      const summary = summaries.find(
        (s) => s.appointmentId.toString() === appointment._id.toString()
      );
      const prescription = prescriptions.find(
        (p) => p.appointmentId.toString() === appointment._id.toString()
      );

      return {
        ...appointment,
        summary: summary?.summaryText || null,
        prescription: prescription || null,
      };
    });

    const total = await Appointment.countDocuments(filter);

    return ok(res, {
      records,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (e) {
    console.error("❌ getConsultationRecords error:", e);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, e.message || String(e));
  }
}

/**
 * Create consultation summary
 */
export async function createConsultationSummary(req, res) {
  try {
    // Use email-based authentication
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
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "User not found by email");
    }

    const doctor = await Doctor.findOne({ userId: user._id });
    if (!doctor) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Doctor profile not found");
    }

    const {
      appointmentId,
      summaryText,
      reasonForVisit,
      visitDate,
      treatmentResult,
      consultationCategory,
      diagnoses,
      vitals,
      labResults,
      imagingResults,
      medications,
      procedures,
      treatmentMethod,
      nextAppointmentDate,
      followUpInstructions,
    } = req.body;

    // Debug logging
    console.log(
      "🔍 Received imagingResults:",
      JSON.stringify(imagingResults, null, 2)
    );
    console.log("🔍 Type of imagingResults:", typeof imagingResults);
    console.log("🔍 Is array:", Array.isArray(imagingResults));

    if (!appointmentId) {
      return fail(res, 400, ERROR_CODES.BAD_REQUEST, "Missing appointmentId");
    }

    // Check if appointment belongs to this doctor
    const appointment = await Appointment.findOne({
      _id: appointmentId,
      doctorId: doctor._id,
    }).populate("patientId clinicId");

    if (!appointment) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Appointment not found");
    }

    const summaryData = {
      appointmentId,
      patientId: appointment.patientId._id,
      doctorId: doctor._id,
      clinicId: appointment.clinicId?._id,
      appointmentDate: appointment.scheduledStart,
      createdBy: doctor._id,
    };

    // Add optional fields if provided
    if (summaryText !== undefined) summaryData.summaryText = summaryText;
    if (reasonForVisit !== undefined)
      summaryData.reasonForVisit = reasonForVisit;
    if (visitDate) summaryData.visitDate = new Date(visitDate);
    if (treatmentResult !== undefined)
      summaryData.treatmentResult = treatmentResult;
    if (consultationCategory !== undefined)
      summaryData.consultationCategory = consultationCategory;
    if (diagnoses && Array.isArray(diagnoses))
      summaryData.diagnoses = diagnoses;
    if (vitals && typeof vitals === "object") summaryData.vitals = vitals;
    if (labResults && Array.isArray(labResults))
      summaryData.labResults = labResults;
    if (imagingResults && Array.isArray(imagingResults)) {
      // Filter out empty imaging results and ensure proper structure
      summaryData.imagingResults = imagingResults
        .filter((img) => img && img.imageUrl)
        .map((img) => {
          // Ensure all fields are properly formatted
          const processedImg = {
            type: String(img.type || ""),
            conclusion: String(img.conclusion || ""),
            imageUrl: String(img.imageUrl || ""),
            performedAt: img.performedAt
              ? new Date(img.performedAt)
              : new Date(),
          };

          console.log("🔍 Processing individual imaging result:", processedImg);
          return processedImg;
        });
      console.log(
        "🔍 Processed imagingResults:",
        JSON.stringify(summaryData.imagingResults, null, 2)
      );
    } else if (imagingResults) {
      console.log(
        "⚠️ imagingResults is not an array:",
        typeof imagingResults,
        imagingResults
      );
    }
    if (medications && Array.isArray(medications))
      summaryData.medications = medications;
    if (procedures && Array.isArray(procedures))
      summaryData.procedures = procedures;
    if (treatmentMethod !== undefined)
      summaryData.treatmentMethod = treatmentMethod;
    if (nextAppointmentDate)
      summaryData.nextAppointmentDate = new Date(nextAppointmentDate);
    if (followUpInstructions)
      summaryData.followUpInstructions = followUpInstructions;

    console.log(
      "🔍 Final summaryData before save:",
      JSON.stringify(summaryData, null, 2)
    );

    // Validate the data before saving
    if (summaryData.imagingResults && summaryData.imagingResults.length > 0) {
      console.log("🔍 Validating imagingResults before save...");
      summaryData.imagingResults.forEach((img, index) => {
        console.log(`🔍 Imaging result ${index}:`, {
          type: typeof img.type,
          conclusion: typeof img.conclusion,
          imageUrl: typeof img.imageUrl,
          performedAt: typeof img.performedAt,
          isDate: img.performedAt instanceof Date,
        });
      });
    }

    const summary = await ConsultationSummary.create(summaryData);

    console.log("✅ Successfully created consultation summary:", summary._id);
    return ok(res, { summary });
  } catch (e) {
    console.error("❌ createConsultationSummary error:", e);
    console.error("❌ Error details:", {
      message: e.message,
      name: e.name,
      stack: e.stack,
    });
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, e.message || String(e));
  }
}

/**
 * Create consultation advice (for online appointments)
 */
export async function createConsultationAdvice(req, res) {
  try {
    const appUserId = req.user?.app_user_id;
    if (!appUserId) {
      return fail(res, 401, ERROR_CODES.UNAUTHORIZED, "User not authenticated");
    }

    const doctor = await Doctor.findOne({ userId: appUserId });
    if (!doctor) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Doctor profile not found");
    }

    const { appointmentId, notes, attachmentUrl, diagnoses, medications, treatmentMethod, aiSuggested } =
      req.body;

    if (!appointmentId || !notes) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "Missing appointmentId or notes"
      );
    }

    // Check if appointment belongs to this doctor and is online
    const appointment = await Appointment.findOne({
      _id: appointmentId,
      doctorId: doctor._id,
      mode: "online",
    }).populate("patientId clinicId");

    if (!appointment) {
      return fail(
        res,
        404,
        ERROR_CODES.NOT_FOUND,
        "Appointment not found or not online"
      );
    }

    // Import ConsultationAdvice model
    const ConsultationAdvice = (
      await import("../models/consultationAdvice.model.js")
    ).default;

    const adviceData = {
      appointmentId,
      patientId: appointment.patientId._id,
      doctorId: doctor._id,
      clinicId: appointment.clinicId?._id,
      appointmentDate: appointment.scheduledStart,
      mode: "online",
      notes: notes,
      createdBy: doctor._id,
    };

    if (attachmentUrl) adviceData.attachmentUrl = attachmentUrl;
    if (diagnoses) adviceData.diagnoses = diagnoses;
    if (medications) adviceData.medications = medications;
    if (treatmentMethod) adviceData.treatmentMethod = treatmentMethod;
    if (aiSuggested !== undefined) adviceData.aiSuggested = aiSuggested;

    const advice = await ConsultationAdvice.create(adviceData);

    return ok(res, { advice });
  } catch (e) {
    console.error("❌ createConsultationAdvice error:", e);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, e.message || String(e));
  }
}

/**
 * Get doctor's consultation summaries (medical history)
 */
export async function getDoctorConsultationSummaries(req, res) {
  try {
    // Use email-based authentication
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
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "User not found by email");
    }

    const doctor = await Doctor.findOne({ userId: user._id });
    if (!doctor) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Doctor profile not found");
    }

    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // Get consultation summaries for this doctor
    const summaries = await ConsultationSummary.find({
      doctorId: doctor._id,
    })
      .populate("patientId")
      .populate("appointmentId", "scheduledStart scheduledEnd mode reason")
      .populate("clinicId", "name address")
      .sort({ visitDate: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await ConsultationSummary.countDocuments({
      doctorId: doctor._id,
    });

    return ok(res, {
      summaries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (e) {
    console.error("❌ getDoctorConsultationSummaries error:", e);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, e.message || String(e));
  }
}

/**
 * Get doctor's consultation advice (consultation history)
 */
export async function getDoctorConsultationAdvice(req, res) {
  try {
    // Use email-based authentication
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
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "User not found by email");
    }

    const doctor = await Doctor.findOne({ userId: user._id });
    if (!doctor) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Doctor profile not found");
    }

    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // Get consultation advice for this doctor
    const advice = await ConsultationAdvice.find({
      doctorId: doctor._id,
    })
      .populate("patientId")
      .populate("appointmentId", "scheduledStart scheduledEnd mode reason")
      .populate("clinicId", "name address")
      .sort({ appointmentDate: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await ConsultationAdvice.countDocuments({
      doctorId: doctor._id,
    });

    return ok(res, {
      advice,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (e) {
    console.error("❌ getDoctorConsultationAdvice error:", e);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, e.message || String(e));
  }
}

/**
 * Create prescription
 */
export async function createPrescription(req, res) {
  try {
    // Use email-based authentication
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
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "User not found by email");
    }

    const doctor = await Doctor.findOne({ userId: user._id });
    if (!doctor) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Doctor profile not found");
    }

    const { appointmentId, diagnosis, note, items } = req.body;

    if (!appointmentId || !items || !Array.isArray(items)) {
      return fail(res, 400, ERROR_CODES.BAD_REQUEST, "Missing required fields");
    }

    // Check if appointment belongs to this doctor
    const appointment = await Appointment.findOne({
      _id: appointmentId,
      doctorId: doctor._id,
    });

    if (!appointment) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Appointment not found");
    }

    const prescription = await Prescription.create({
      appointmentId,
      diagnosis,
      note,
      items,
      createdBy: doctor._id,
    });

    return ok(res, { prescription });
  } catch (e) {
    console.error("❌ createPrescription error:", e);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, e.message || String(e));
  }
}

/**
 * Get doctor clinics
 */
export async function getDoctorClinics(req, res) {
  try {
    const { doctorId } = req.params;

    if (!doctorId) {
      return fail(res, 400, ERROR_CODES.INVALID_INPUT, "Doctor ID is required");
    }

    // Verify doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Doctor not found");
    }

    // Get doctor's default clinic and any other clinics they work at
    const clinics = [];

    // Add default clinic if exists
    if (doctor.clinicDefaultId) {
      const defaultClinic = await Clinic.findById(
        doctor.clinicDefaultId
      ).lean();
      if (defaultClinic) {
        // Format clinic data to include all necessary fields
        const formattedClinic = {
          ...defaultClinic,
          id: defaultClinic._id,
          coordinates: defaultClinic.geo?.coordinates,
        };
        clinics.push(formattedClinic);
      }
    }

    // For now, we'll just return the default clinic
    // In the future, you might want to add a many-to-many relationship
    // between doctors and clinics

    return ok(res, { clinics });
  } catch (error) {
    console.error("Error fetching doctor clinics:", error);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, "Internal server error");
  }
}

/**
 * Debug endpoint to test authentication
 */
export async function debugAuth(req, res) {
  try {
    console.log(
      "🔍 debugAuth - req.user keys:",
      req.user ? Object.keys(req.user) : "req.user is null/undefined"
    );

    return ok(res, {
      user: req.user,
      hasAppUserId: !!req.user?.app_user_id,
      hasEmail: !!req.user?.email,
      hasUid: !!req.user?.uid,
    });
  } catch (e) {
    console.error("❌ debugAuth error:", e);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, e.message || String(e));
  }
}

/**
 * Get doctor reviews
 */
export async function getDoctorReviews(req, res) {
  try {
    // Use email-based authentication
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
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "User not found by email");
    }

    const doctor = await Doctor.findOne({ userId: user._id });
    if (!doctor) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Doctor profile not found");
    }

    console.log("🔍 getDoctorReviews - Doctor found:", {
      doctorId: doctor._id,
      doctorName: doctor.fullName,
      userId: user._id,
      email: userEmail,
    });

    const { page = 1, limit = 20, rating, sortBy = "newest" } = req.query;
    const skip = (page - 1) * limit;

    const filter = { doctorId: doctor._id };

    if (rating) {
      filter.rating = parseInt(rating);
    }

    console.log("🔍 getDoctorReviews - Filter:", JSON.stringify(filter));
    console.log(
      "🔍 getDoctorReviews - Review collection name:",
      Review.collection.name
    );

    // Check if there are any reviews in the collection
    const allReviewsCount = await Review.countDocuments({});
    console.log(
      "🔍 getDoctorReviews - Total reviews in collection:",
      allReviewsCount
    );

    // Check reviews for this specific doctor
    const reviewsForDoctor = await Review.find({ doctorId: doctor._id })
      .limit(5)
      .lean();
    console.log(
      "🔍 getDoctorReviews - Sample reviews for this doctor:",
      reviewsForDoctor.length
    );
    if (reviewsForDoctor.length > 0) {
      console.log("🔍 getDoctorReviews - Sample review:", {
        _id: reviewsForDoctor[0]._id,
        doctorId: reviewsForDoctor[0].doctorId,
        rating: reviewsForDoctor[0].rating,
        comment: reviewsForDoctor[0].comment,
      });
    }

    let sort = {};
    switch (sortBy) {
      case "newest":
        sort = { createdAt: -1 };
        break;
      case "oldest":
        sort = { createdAt: 1 };
        break;
      case "highest":
        sort = { rating: -1 };
        break;
      case "lowest":
        sort = { rating: 1 };
        break;
      default:
        sort = { createdAt: -1 };
    }

    const reviews = await Review.find(filter)
      .populate("patientId", "fullName avatarUrl phone")
      .populate("appointmentId", "scheduledStart mode reason status")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Review.countDocuments(filter);

    console.log("🔍 getDoctorReviews - Query result:", {
      reviewsFound: reviews.length,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
    });

    return ok(res, {
      reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (e) {
    console.error("❌ getDoctorReviews error:", e);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, e.message || String(e));
  }
}

/**
 * Get public doctor reviews (for public viewing)
 */
export async function getPublicDoctorReviews(req, res) {
  try {
    const { doctorId } = req.params;

    // If doctorId is "me", this should not be handled by public route
    // It should be handled by the protected /me/reviews route instead
    if (doctorId === "me") {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Invalid doctor ID");
    }

    const { page = 1, limit = 10, search, rating, sort = "newest" } = req.query;
    const skip = (page - 1) * limit;

    // Verify doctor exists
    const doctor = await Doctor.findById(doctorId)
      .populate("specializationIds", "name")
      .populate("clinicDefaultId", "name address")
      .lean();

    if (!doctor) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Doctor not found");
    }

    const filter = { doctorId: new mongoose.Types.ObjectId(doctorId) };

    if (rating && rating !== "all") {
      filter.rating = parseInt(rating);
    }

    if (search) {
      filter.comment = { $regex: search, $options: "i" };
    }

    let sortObj = {};
    switch (sort) {
      case "newest":
        sortObj = { createdAt: -1 };
        break;
      case "oldest":
        sortObj = { createdAt: 1 };
        break;
      case "highest":
        sortObj = { rating: -1 };
        break;
      case "lowest":
        sortObj = { rating: 1 };
        break;
      default:
        sortObj = { createdAt: -1 };
    }

    const reviews = await Review.find(filter)
      .populate("patientId", "fullName avatarUrl")
      .populate("appointmentId", "scheduledStart mode status")
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Review.countDocuments(filter);

    // Calculate rating statistics
    const ratingStats = await Review.aggregate([
      { $match: { doctorId: new mongoose.Types.ObjectId(doctorId) } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
          ratingDistribution: {
            $push: "$rating",
          },
        },
      },
    ]);

    let ratingDistribution = {};
    if (ratingStats.length > 0) {
      const distribution = ratingStats[0].ratingDistribution;
      for (let i = 1; i <= 5; i++) {
        ratingDistribution[i] = distribution.filter((r) => r === i).length;
      }
    }

    return ok(res, {
      doctor: {
        _id: doctor._id,
        fullName: doctor.fullName,
        avatarUrl: doctor.avatarUrl,
        specializationIds: doctor.specializationIds,
        clinicDefaultId: doctor.clinicDefaultId,
        ratingAvg: ratingStats[0]?.averageRating || 0,
        ratingCount: ratingStats[0]?.totalReviews || 0,
        ratingDistribution,
      },
      reviews: reviews.map((review) => ({
        _id: review._id,
        rating: review.rating,
        comment: review.comment,
        tags: review.tags || [],
        isAnonymous: review.isAnonymous,
        doctorResponse: review.doctorResponse,
        doctorResponseAt: review.doctorResponseAt,
        helpfulCount: review.helpfulCount,
        verified: review.verified,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
        patient: {
          _id: review.patientId?._id,
          fullName: review.isAnonymous
            ? "Bệnh nhân"
            : review.patientId?.fullName || "Bệnh nhân",
          avatarUrl: review.isAnonymous ? null : review.patientId?.avatarUrl,
        },
        appointment: {
          _id: review.appointmentId?._id,
          scheduledStart: review.appointmentId?.scheduledStart,
          mode: review.appointmentId?.mode,
          status: review.appointmentId?.status,
        },
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (e) {
    console.error("❌ getPublicDoctorReviews error:", e);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, e.message || String(e));
  }
}

/**
 * Create a new review for a doctor
 */
export async function createDoctorReview(req, res) {
  try {
    const { doctorId } = req.params;
    const { appointmentId, rating, comment, tags, isAnonymous } = req.body;

    // Verify doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Doctor not found");
    }

    // Verify appointment exists and belongs to this doctor
    const appointment = await Appointment.findOne({
      _id: appointmentId,
      doctorId: doctorId,
      status: "done", // Only allow reviews for completed appointments
    });

    if (!appointment) {
      return fail(
        res,
        404,
        ERROR_CODES.NOT_FOUND,
        "Appointment not found or not completed"
      );
    }

    // Check if review already exists for this appointment
    const existingReview = await Review.findOne({ appointmentId });
    if (existingReview) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "Review already exists for this appointment"
      );
    }

    // Create new review
    const review = new Review({
      appointmentId,
      patientId: appointment.patientId,
      doctorId,
      rating,
      comment,
      tags: tags || [],
      isAnonymous: isAnonymous || false,
      verified: true,
    });

    await review.save();

    // Populate the review with patient and appointment data
    await review.populate([
      { path: "patientId", select: "fullName avatarUrl" },
      { path: "appointmentId", select: "scheduledStart mode status" },
    ]);

    return ok(res, { review }, "Review created successfully");
  } catch (e) {
    console.error("❌ createDoctorReview error:", e);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, e.message || String(e));
  }
}

/**
 * Respond to review
 */
export async function respondToReview(req, res) {
  try {
    // Use email-based authentication
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
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "User not found by email");
    }

    const doctor = await Doctor.findOne({ userId: user._id });
    if (!doctor) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Doctor profile not found");
    }

    const { reviewId } = req.params;
    const { response } = req.body;

    if (!response) {
      return fail(res, 400, ERROR_CODES.BAD_REQUEST, "Response is required");
    }

    const review = await Review.findOneAndUpdate(
      { _id: reviewId, doctorId: doctor._id },
      { doctorResponse: response, doctorResponseAt: new Date() },
      { new: true }
    );

    if (!review) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Review not found");
    }

    return ok(res, { review });
  } catch (e) {
    console.error("❌ respondToReview error:", e);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, e.message || String(e));
  }
}

/**
 * Get doctor time slots
 */
export async function getDoctorTimeSlots(req, res) {
  try {
    const userEmail = req.user?.email;
    console.log("🔍 getDoctorTimeSlots - userEmail:", userEmail);

    if (!userEmail) {
      console.log("❌ No user email found in token");
      return fail(
        res,
        401,
        ERROR_CODES.UNAUTHORIZED,
        "User email not found in token"
      );
    }

    const user = await User.findOne({ email: userEmail }).lean();
    if (!user) {
      console.log("❌ User not found by email:", userEmail);
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "User not found by email");
    }

    console.log("🔍 getDoctorTimeSlots - Found user:", {
      id: user._id,
      email: user.email,
    });

    const doctor = await Doctor.findOne({ userId: user._id });
    if (!doctor) {
      console.log("❌ Doctor profile not found for user:", user._id);
      return ok(res, {
        slots: [],
        pagination: {
          page: parseInt(req.query.page || 1),
          limit: parseInt(req.query.limit || 50),
          total: 0,
          pages: 0,
        },
      });
    }

    console.log("🔍 getDoctorTimeSlots - Found doctor:", {
      id: doctor._id,
      fullName: doctor.fullName,
      userId: doctor.userId,
      userEmail: userEmail,
    });

    const {
      page = 1,
      limit = 50,
      date,
      startDate,
      endDate,
      status,
    } = req.query;
    console.log("🔍 getDoctorTimeSlots query params:", {
      page,
      limit,
      date,
      startDate,
      endDate,
      status,
    });

    const mongoose = await import("mongoose");

    // Check if doctor._id is already an ObjectId or needs conversion
    let doctorObjectId;
    try {
      if (typeof doctor._id === "string") {
        doctorObjectId = new mongoose.default.Types.ObjectId(doctor._id);
      } else {
        doctorObjectId = doctor._id; // Already an ObjectId
      }
    } catch (error) {
      console.error("❌ Invalid doctor ID format:", doctor._id, error);
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Invalid doctor ID format"
      );
    }

    const filter = { doctorId: doctorObjectId };

    console.log("🔍 Filter with ObjectId:", {
      doctorId: doctor._id,
      convertedDoctorId: filter.doctorId,
      doctorIdType: typeof doctor._id,
      convertedType: typeof filter.doctorId,
    });

    if (date) {
      try {
        const startDate = new Date(date);
        if (isNaN(startDate.getTime())) {
          console.error("❌ Invalid single date format:", date);
          return fail(
            res,
            400,
            ERROR_CODES.INVALID_INPUT,
            "Invalid date format"
          );
        }
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        filter.startAt = { $gte: startDate, $lte: endDate };
        console.log("🔍 Single date filter applied:", {
          date: date,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        });
      } catch (dateError) {
        console.error("❌ Single date parsing error:", dateError);
        return fail(res, 400, ERROR_CODES.INVALID_INPUT, "Invalid date format");
      }
    } else if (startDate && endDate) {
      try {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          console.error("❌ Invalid date format:", { startDate, endDate });
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
        console.log("🔍 Date range filter applied:", {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          startDateParam: startDate,
          endDateParam: endDate,
        });
      } catch (dateError) {
        console.error("❌ Date parsing error:", dateError);
        return fail(res, 400, ERROR_CODES.INVALID_INPUT, "Invalid date format");
      }
    } else {
      console.log(
        "⚠️ No date filter provided, returning slots for next 7 days"
      );
      // Nếu không có date filter, trả về slot trong 7 ngày tới
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      nextWeek.setHours(23, 59, 59, 999);
      filter.startAt = { $gte: today, $lte: nextWeek };
      console.log("🔍 Default date range filter applied:", {
        startDate: today.toISOString(),
        endDate: nextWeek.toISOString(),
      });
    }

    console.log("🔍 Final filter:", filter);

    if (status) {
      filter.status = status;
    }

    const skip = (page - 1) * limit;

    try {
      const timeSlots = await DoctorTimeSlot.find(filter)
        .sort({ startAt: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      const total = await DoctorTimeSlot.countDocuments(filter);

      console.log("🔍 Database query results:", {
        filterApplied: filter,
        slotsFound: timeSlots.length,
        totalInRange: total,
        limit: parseInt(limit),
        skip: skip,
        doctorId: doctor._id,
        doctorEmail: userEmail,
      });

      if (timeSlots.length > 0) {
        console.log(
          "🔍 Sample slots:",
          timeSlots.slice(0, 3).map((slot) => ({
            id: slot._id,
            startAt: slot.startAt,
            endAt: slot.endAt,
            status: slot.status,
          }))
        );
      }

      if (timeSlots.length === 0) {
        console.log("🔍 No time slots found, returning empty array");
        console.log("🔍 Doctor ID:", doctor._id);
        console.log("🔍 Filter applied:", filter);
        return ok(res, {
          slots: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            pages: 0,
          },
        });
      }

      // Import Appointment and Patient models
      const Appointment = (await import("../models/appointment.model.js"))
        .default;
      const Patient = (await import("../models/patient.model.js")).default;
      const LeaveRequest = (await import("../models/leaveRequest.model.js"))
        .default;

      // Get slot IDs to fetch appointments
      const slotIds = timeSlots.map((slot) => slot._id);

      // Fetch leave requests that overlap with the date range of these slots
      // Get date range from slots
      const slotDates = timeSlots.map((slot) => new Date(slot.startAt));
      const minDate = new Date(Math.min(...slotDates));
      const maxDate = new Date(Math.max(...slotDates));
      minDate.setHours(0, 0, 0, 0);
      maxDate.setHours(23, 59, 59, 999);

      // Find leave requests that overlap with this date range
      // Overlap occurs when: startDate <= maxDate AND endDate >= minDate
      const leaveRequests = await LeaveRequest.find({
        doctorId: doctor._id,
        status: "pending",
        startDate: { $lte: maxDate },
        endDate: { $gte: minDate },
      }).lean();

      // Create a map of slotId -> leave request (check if slot date is within leave request range)
      const leaveRequestMap = {};
      timeSlots.forEach((slot) => {
        const slotDate = new Date(slot.startAt);
        slotDate.setHours(0, 0, 0, 0);

        // Check if this slot date falls within any pending leave request
        const matchingRequest = leaveRequests.find((lr) => {
          const lrStart = new Date(lr.startDate);
          lrStart.setHours(0, 0, 0, 0);
          const lrEnd = new Date(lr.endDate);
          lrEnd.setHours(23, 59, 59, 999);
          return slotDate >= lrStart && slotDate <= lrEnd;
        });

        if (matchingRequest) {
          const slotIdKey = slot._id.toString();
          leaveRequestMap[slotIdKey] = matchingRequest;
        }
      });

      // Fetch appointments for these slots
      // Exclude ALL rescheduled, cancelled, and pending_doctor appointments
      // pending_doctor status has been removed - all appointments are auto-accepted
      // A rescheduled appointment means the old appointment is no longer active
      // Also exclude cancelled appointments - they should not appear in the schedule
      // CRITICAL: Only show appointments that have been paid (paymentStatus = "paid")
      // Unpaid appointments should NOT appear in doctor's schedule
      const appointments = await Appointment.find({
        slotId: { $in: slotIds },
        // Filter out ALL appointments with status "rescheduled", "cancelled", or "pending_doctor"
        // Only show accepted, in_progress, done, rejected, no_show appointments
        status: { $nin: ["rescheduled", "cancelled", "pending_doctor"] },
        // Only show paid appointments
        paymentStatus: "paid",
      })
        .select(
          "reason status mode rescheduledFromId slotId patientId paymentStatus"
        ) // Explicitly select fields needed
        .populate({
          path: "patientId",
          select: "fullName",
          model: "Patient",
        })
        .lean();

      // Create a map of slotId -> appointment
      const appointmentMap = {};
      console.log("🔍 START Mapping appointments, total:", appointments.length);
      appointments.forEach((appointment) => {
        console.log("🔍 Processing appointment:", {
          _id: appointment._id?.toString(),
          slotId: appointment.slotId?.toString(),
          status: appointment.status,
          mode: appointment.mode,
        });
        // Handle both populated patientId object and ObjectId
        let patientName = "Bệnh nhân";
        if (appointment.patientId) {
          if (
            typeof appointment.patientId === "object" &&
            appointment.patientId.fullName
          ) {
            patientName = appointment.patientId.fullName;
          } else if (typeof appointment.patientId === "string") {
            // If it's still an ObjectId string, fetch the patient
            // For now, use a fallback
            patientName = "Bệnh nhân";
          }
        }

        // Convert slotId to string for consistent lookup
        const slotIdKey = appointment.slotId.toString();
        const appointmentIdStr = appointment._id?.toString();

        console.log("🔍 STORING in map:", {
          slotIdKey: slotIdKey,
          appointmentId: appointmentIdStr,
          patientName: patientName,
        });

        appointmentMap[slotIdKey] = {
          appointmentId: appointmentIdStr, // Add appointmentId
          patientName: patientName,
          reason: appointment.reason || null,
          appointmentStatus: appointment.status || "booked", // Include appointment status
          mode: appointment.mode || "offline", // Include mode (online/offline)
          rescheduledFromId: appointment.rescheduledFromId
            ? appointment.rescheduledFromId.toString()
            : null, // Include rescheduledFromId to identify rescheduled appointments
        };
      });

      console.log(
        "🔍 COMPLETED mapping, appointmentMap:",
        Object.keys(appointmentMap).length,
        "entries"
      );

      console.log("🔍 Found appointments:", appointments.length);
      console.log("🔍 Appointment map keys:", Object.keys(appointmentMap));
      if (appointments.length > 0) {
        console.log("🔍 Sample appointment:", {
          _id: appointments[0]._id,
          slotId: appointments[0].slotId?.toString(),
          patientId: appointments[0].patientId,
          reason: appointments[0].reason,
        });
      }

      const serializedSlots = timeSlots.map((slot) => {
        const slotIdStr = slot._id.toString();
        const appointment = appointmentMap[slotIdStr];

        // Map appointment status to display status
        let displayStatus = slot.status;
        if (appointment) {
          // Map appointment statuses to display statuses
          // Note: pending_doctor status has been removed - all appointments are auto-accepted
          const statusMap = {
            accepted: "accepted", // Keep as "accepted" to match frontend expectations
            in_progress: "in_progress",
            cancelled: "cancelled",
            done: "completed",
            rejected: "cancelled",
            no_show: "no_show", // Keep no_show status to display "Không đến" on frontend
          };
          displayStatus =
            statusMap[appointment.appointmentStatus] || slot.status;
        } else {
          // No appointment found for this slot
          // If slot status is "booked" but no appointment exists (e.g., rescheduled appointment was removed),
          // treat it as "available" so it appears empty
          if (slot.status === "booked") {
            displayStatus = "available";
          }
        }

        console.log("🔍 Serializing slot:", {
          slotId: slotIdStr,
          hasAppointment: !!appointment,
          patientName: appointment?.patientName || "null",
          appointmentStatus: appointment?.appointmentStatus,
          displayStatus: displayStatus,
          appointmentId: appointment?.appointmentId || "null",
          fullAppointment: appointment,
        });

        const pendingLeaveRequest = leaveRequestMap[slotIdStr];

        return {
          ...slot,
          _id: slot._id.toString(),
          doctorId: slot.doctorId.toString(),
          startAt: slot.startAt,
          endAt: slot.endAt,
          status: displayStatus, // Use mapped status instead of slot.status
          displayStatus: displayStatus, // Keep displayStatus for reference
          patientName: appointment?.patientName || null,
          reason: appointment?.reason || null,
          mode: appointment?.mode || null,
          appointmentId: appointment?.appointmentId || null, // Add appointmentId to slot - FROM appointmentMap
          rescheduledFromId: appointment?.rescheduledFromId || null, // Flag to identify rescheduled appointments
          leaveReason: slot.leaveReason || null, // Lý do nghỉ
          hasPendingLeaveRequest: !!pendingLeaveRequest, // Flag để biết có leave request đang pending
          leaveRequestId: pendingLeaveRequest?._id?.toString() || null,
        };
      });

      console.log("🔍 Serialized slots count:", serializedSlots.length);
      const bookedSlots = serializedSlots.filter((s) => s.status === "booked");
      console.log("🔍 Booked slots count:", bookedSlots.length);
      if (bookedSlots.length > 0) {
        console.log("🔍 Sample booked slot:", {
          slotId: bookedSlots[0]._id,
          status: bookedSlots[0].status,
          patientName: bookedSlots[0].patientName,
          reason: bookedSlots[0].reason,
        });
      }

      return ok(res, {
        slots: serializedSlots,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (dbError) {
      throw dbError;
    }
  } catch (e) {
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, e.message || String(e));
  }
}

/**
 * Delete a time slot
 */
export async function deleteTimeSlot(req, res) {
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

    const user = await User.findOne({ email: userEmail }).lean();
    if (!user) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "User not found by email");
    }

    const doctor = await Doctor.findOne({ userId: user._id });
    if (!doctor) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Doctor profile not found");
    }

    const { slotId } = req.params;
    if (!slotId) {
      return fail(res, 400, ERROR_CODES.INVALID_INPUT, "Slot ID is required");
    }

    // Find the slot and verify it belongs to this doctor
    const slot = await DoctorTimeSlot.findOne({
      _id: slotId,
      doctorId: doctor._id,
    });

    if (!slot) {
      return fail(
        res,
        404,
        ERROR_CODES.NOT_FOUND,
        "Time slot not found or does not belong to you"
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
    console.log(`✅ Deleted time slot ${slotId} for doctor ${doctor.fullName}`);

    return ok(res, {
      message: "Time slot deleted successfully",
      deletedSlotId: slotId,
    });
  } catch (error) {
    console.error("❌ deleteTimeSlot error:", error);
    return fail(
      res,
      500,
      ERROR_CODES.SERVER_ERROR,
      error.message || String(error)
    );
  }
}

/**
 * Generate time slots based on doctor's schedule rules
 */
export async function autoGenerateTimeSlots(req, res) {
  try {
    console.log("🔍 autoGenerateTimeSlots - req.user:", req.user);
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
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "User not found by email");
    }

    const doctor = await Doctor.findOne({ userId: user._id });
    if (!doctor) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Doctor profile not found");
    }

    console.log("🔍 autoGenerateTimeSlots - Found doctor:", {
      id: doctor._id,
      fullName: doctor.fullName,
    });

    // First, create default schedule rules if they don't exist
    await createDefaultScheduleRules(doctor._id);

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
        "No schedule rules found. Please set up your schedule rules first."
      );
    }

    console.log(
      `📋 Found ${scheduleRules.length} schedule rules for doctor ${doctor.fullName}`
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
    endDate.setMonth(today.getMonth() + 1); // 1 month instead of 14 days
    endDate.setHours(23, 59, 59, 999);

    console.log("🔍 Creating slots from:", today.toISOString().split("T")[0]);
    console.log(
      "🔍 Creating slots until:",
      endDate.toISOString().split("T")[0]
    );

    // Check how many future slots already exist
    const existingFutureSlots = await DoctorTimeSlot.countDocuments({
      doctorId: doctor._id,
      startAt: { $gte: today },
    });

    console.log(`📊 Existing future slots: ${existingFutureSlots}`);

    // Only create slots if we have less than 100 future slots
    // This prevents creating slots too frequently
    if (existingFutureSlots >= 100) {
      console.log(
        `⏭️ Skipping slot generation - already have ${existingFutureSlots} future slots (>= 100)`
      );
      return ok(res, {
        message: `No new slots created. You already have ${existingFutureSlots} future slots.`,
        createdSlots: 0,
        skippedSlots: 0,
        existingSlots: existingFutureSlots,
        note: "Slots are only auto-generated when you have less than 100 future slots.",
      });
    }

    const createdSlots = [];
    const skippedSlots = [];

    // Calculate number of days in the month
    const daysInMonth = Math.ceil(
      (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    for (let dayOffset = 0; dayOffset < daysInMonth; dayOffset++) {
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
        `📅 Processing ${currentDate.toDateString()} (weekday ${weekday}) with ${dayRule.blocks.length
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
        `🔍 Generated ${generatedSlots.length
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
      message: `Generated ${createdSlots.length} new time slots for doctor ${doctor.fullName} based on schedule rules (next month)`,
      createdSlots: createdSlots.length,
      skippedSlots: skippedSlots.length,
      totalFutureSlots: totalFutureSlots, // Total future slots after creation
      dateRange: {
        startDate: today.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      },
      scheduleRules: scheduleRules.length,
      details: {
        created: createdSlots.slice(0, 5), // Show first 5 as sample
        skipped: skippedSlots.slice(0, 5), // Show first 5 as sample
      },
    });
  } catch (error) {
    console.error("❌ autoGenerateTimeSlots error:", error);
    return fail(
      res,
      500,
      ERROR_CODES.SERVER_ERROR,
      error.message || String(error)
    );
  }
}

/**
 * Doctor creates appointment directly (no need for approval)
 */
export async function createAppointmentByDoctor(req, res) {
  try {
    console.log("🔍 createAppointmentByDoctor - req.user:", req.user);
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
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "User not found by email");
    }

    const doctor = await Doctor.findOne({ userId: user._id });
    if (!doctor) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Doctor profile not found");
    }

    const {
      slotId,
      patientName,
      patientPhone,
      reason,
      mode,
      scheduledStart,
      scheduledEnd,
    } = req.body;

    if (
      !patientName ||
      !patientPhone ||
      !reason ||
      !mode ||
      !scheduledStart ||
      !scheduledEnd
    ) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Missing required fields"
      );
    }

    if (!["online", "offline"].includes(mode)) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Mode must be 'online' or 'offline'"
      );
    }

    // Tìm hoặc tạo time slot
    let timeSlot;
    if (slotId) {
      // Nếu có slotId, tìm slot đó
      timeSlot = await DoctorTimeSlot.findById(slotId);
      if (!timeSlot) {
        return fail(res, 404, ERROR_CODES.NOT_FOUND, "Time slot not found");
      }
      if (timeSlot.doctorId.toString() !== doctor._id.toString()) {
        return fail(
          res,
          400,
          ERROR_CODES.INVALID_INPUT,
          "Time slot does not belong to this doctor"
        );
      }
    } else {
      // Nếu không có slotId, tìm slot theo thời gian hoặc tạo mới
      const startAt = new Date(scheduledStart);
      const endAt = new Date(scheduledEnd);

      // Tìm slot với khoảng thời gian gần (trong vòng 1 phút để tránh lỗi do timezone)
      const oneMinute = 60 * 1000;
      timeSlot = await DoctorTimeSlot.findOne({
        doctorId: doctor._id,
        startAt: {
          $gte: new Date(startAt.getTime() - oneMinute),
          $lte: new Date(startAt.getTime() + oneMinute),
        },
        endAt: {
          $gte: new Date(endAt.getTime() - oneMinute),
          $lte: new Date(endAt.getTime() + oneMinute),
        },
      });

      if (!timeSlot) {
        // Tạo slot mới nếu chưa có
        timeSlot = await DoctorTimeSlot.create({
          doctorId: doctor._id,
          startAt: startAt,
          endAt: endAt,
          status: "available",
        });
        console.log("✅ Created new time slot:", timeSlot._id);
      }
    }

    // Find or create patient by phone number
    let patient = await Patient.findOne({ phone: patientPhone });

    if (!patient) {
      // Tìm User có số điện thoại này
      let patientUser = await User.findOne({ phone: patientPhone });

      if (!patientUser) {
        // Tạo User mới cho bệnh nhân
        patientUser = new User({
          email: `${patientPhone}@temp.medconnect.com`, // Temporary email
          fullName: patientName,
          phone: patientPhone,
          role: "patient",
          authProvider: "phone",
        });
        await patientUser.save();
        console.log("✅ Created new user for patient:", patientUser._id);
      }

      // Tạo Patient profile
      patient = new Patient({
        userId: patientUser._id,
        fullName: patientName,
        phone: patientPhone,
        isComplete: false,
      });
      await patient.save();
      console.log("✅ Created new patient profile:", patient._id);
    } else {
      // Cập nhật tên nếu khác
      if (patient.fullName !== patientName) {
        patient.fullName = patientName;
        await patient.save();
      }
    }

    // Check if slot is already booked (chỉ check các appointment còn active)
    const existingAppointment = await Appointment.findOne({
      slotId: timeSlot._id,
      status: { $nin: ["cancelled", "rejected", "no_show"] },
    });
    if (existingAppointment) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Time slot has already been booked"
      );
    }

    // Create appointment with accepted status (doctor booked, no approval needed)
    const appointment = new Appointment({
      patientId: patient._id,
      doctorId: doctor._id,
      slotId: timeSlot._id,
      mode: mode,
      clinicId: mode === "offline" ? req.body.clinicId || null : undefined,
      scheduledStart: new Date(scheduledStart),
      scheduledEnd: new Date(scheduledEnd),
      status: "accepted", // Bác sĩ đặt nên không cần chờ duyệt
      reason: reason,
      acceptedBy: doctor._id, // Bác sĩ tự chấp nhận
    });

    await appointment.save();

    // Update time slot status to booked
    await DoctorTimeSlot.findByIdAndUpdate(slotId, { status: "booked" });

    // Create notification for patient about new appointment
    try {
      const { createBookingNotification } = await import(
        "../services/notificationService.js"
      );
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

    console.log("✅ Appointment created by doctor:", populatedAppointment._id);

    return ok(res, {
      message: "Appointment created successfully",
      appointment: populatedAppointment,
    });
  } catch (error) {
    console.error("❌ createAppointmentByDoctor error:", error);

    // Handle duplicate slot booking error
    if (error.code === 11000) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "This time slot has already been booked"
      );
    }

    return fail(
      res,
      500,
      ERROR_CODES.SERVER_ERROR,
      error.message || String(error)
    );
  }
}

/**
 * Create test time slots for a doctor (for development/testing)
 */
export async function createTestTimeSlots(req, res) {
  try {
    const { doctorId } = req.params;

    // Verify doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Doctor not found");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const createdSlots = [];

    // Create time slots for next 7 days
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + dayOffset);

      // Create slots from 9:00 AM to 5:00 PM, 30 minutes each
      for (let hour = 9; hour < 17; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const startAt = new Date(currentDate);
          startAt.setHours(hour, minute, 0, 0);

          const endAt = new Date(currentDate);
          endAt.setHours(hour, minute + 30, 0, 0);

          // Skip if slot already exists
          const existingSlot = await DoctorTimeSlot.findOne({
            doctorId: doctorId,
            startAt,
            endAt,
          });

          if (!existingSlot) {
            const slot = await DoctorTimeSlot.create({
              doctorId: doctorId,
              startAt,
              endAt,
              status: "available",
            });
            createdSlots.push(slot);
          }
        }
      }
    }

    return ok(res, {
      message: `Created ${createdSlots.length} time slots for doctor ${doctor.fullName}`,
      slots: createdSlots,
    });
  } catch (e) {
    console.error("❌ createTestTimeSlots error:", e);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, e.message || String(e));
  }
}

/**
 * Upload consultation attachment file
 */
export async function uploadConsultationFile(req, res) {
  try {
    if (!req.file) {
      return fail(res, 400, ERROR_CODES.BAD_REQUEST, "No file uploaded");
    }

    // Construct the URL for the uploaded file
    const fileUrl = `/server-uploads/consultations/${req.file.filename}`;

    return ok(res, {
      message: "File uploaded successfully",
      url: fileUrl,
      filename: req.file.filename,
    });
  } catch (e) {
    console.error("❌ uploadConsultationFile error:", e);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, e.message || String(e));
  }
}

/**
 * Get all appointments (public endpoint for fallback)
 */
export async function getAllAppointments(req, res) {
  try {
    console.log("🔍 getAllAppointments - query:", req.query);

    const { page = 1, limit = 100 } = req.query;
    const skip = (page - 1) * limit;

    // CRITICAL: Only show appointments that have been paid (paymentStatus = "paid")
    // This ensures appointments created by manager booking only appear after payment success
    const appointments = await Appointment.find({
      paymentStatus: "paid",
    })
      .populate({
        path: "patientId",
        select: "fullName dob gender phone email",
        populate: {
          path: "userId",
          select: "fullName email phone",
        },
      })
      .populate("doctorId", "fullName licenseNo")
      .populate("slotId")
      .sort({ scheduledStart: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Appointment.countDocuments({});

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
          email: apt.patientId?.email || null,
          userId: apt.patientId?.userId || null,
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

    console.log(
      "✅ getAllAppointments - found:",
      appointmentsWithDefaults.length
    );
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
    console.error("❌ getAllAppointments error:", error);
    return fail(
      res,
      500,
      ERROR_CODES.SERVER_ERROR,
      error.message || String(error)
    );
  }
}

/**
 * Get doctors for search page
 */
export async function getSearchDoctors(req, res) {
  try {
    const {
      search,
      specialization,
      location,
      page = 1,
      limit = 10,
    } = req.query;

    let filter = {};

    // Add filters for verified and active doctors (must be first)
    filter.isVerified = true;
    filter.$and = [
      {
        $or: [
          { isActive: true },
          { isActive: { $exists: false } }, // Old doctors without isActive field
        ],
      },
    ];

    // Search by name or specialty
    if (search) {
      filter.$and.push({
        $or: [
          { fullName: { $regex: search, $options: "i" } },
          { bio: { $regex: search, $options: "i" } },
        ],
      });
    }

    // Filter by specialization
    if (specialization) {
      filter.specializationIds = specialization;
    }

    // Filter by location (clinic)
    if (location) {
      filter.clinicDefaultId = location;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const doctors = await Doctor.find(filter)
      .populate("userId", "fullName email phone")
      .populate("specializationIds", "name code")
      .populate("clinicDefaultId", "name address phone")
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Doctor.countDocuments(filter);

    return ok(res, {
      doctors,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (e) {
    console.error("❌ getSearchDoctors error:", e);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, e.message || String(e));
  }
}

/**
 * Get specializations for search page
 */
export async function getSearchSpecializations(req, res) {
  try {
    const { search, page = 1, limit = 10 } = req.query;

    let filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const specializations = await Specialization.find(filter)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Count doctors for each specialization
    const specializationsWithCount = await Promise.all(
      specializations.map(async (spec) => {
        const doctorCount = await Doctor.countDocuments({
          specializationIds: spec._id,
          isActive: true,
        });
        return { ...spec, doctorCount };
      })
    );

    const total = await Specialization.countDocuments(filter);

    return ok(res, {
      specializations: specializationsWithCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (e) {
    console.error("❌ getSearchSpecializations error:", e);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, e.message || String(e));
  }
}

/**
 * Get clinics for search page
 */
export async function getSearchClinics(req, res) {
  try {
    const { search, page = 1, limit = 10 } = req.query;

    let filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { address: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const clinics = await Clinic.find(filter)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get specializations available at each clinic
    const clinicsWithSpecializations = await Promise.all(
      clinics.map(async (clinic) => {
        const doctors = await Doctor.find({
          clinicDefaultId: clinic._id,
          isActive: true,
        }).populate("specializationIds", "name");

        const specializations = [
          ...new Set(
            doctors.flatMap((doctor) =>
              doctor.specializationIds.map((spec) => spec.name)
            )
          ),
        ];

        return { ...clinic, specializations };
      })
    );

    const total = await Clinic.countDocuments(filter);

    return ok(res, {
      clinics: clinicsWithSpecializations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (e) {
    console.error("❌ getSearchClinics error:", e);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, e.message || String(e));
  }
}

/**
 * Get doctor's schedule rules
 */
export async function getDoctorScheduleRules(req, res) {
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

    const user = await User.findOne({ email: userEmail }).lean();
    if (!user) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "User not found by email");
    }

    const doctor = await Doctor.findOne({ userId: user._id });
    if (!doctor) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Doctor profile not found");
    }

    const scheduleRules = await DoctorScheduleRule.find({
      doctorId: doctor._id,
      isActive: true,
    })
      .sort({ weekday: 1 })
      .lean();

    return ok(res, {
      scheduleRules,
      doctor: {
        id: doctor._id,
        fullName: doctor.fullName,
      },
    });
  } catch (error) {
    console.error("❌ getDoctorScheduleRules error:", error);
    return fail(
      res,
      500,
      ERROR_CODES.SERVER_ERROR,
      error.message || String(error)
    );
  }
}

/**
 * Update doctor's schedule rules
 */
export async function updateDoctorScheduleRules(req, res) {
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

    const user = await User.findOne({ email: userEmail }).lean();
    if (!user) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "User not found by email");
    }

    const doctor = await Doctor.findOne({ userId: user._id });
    if (!doctor) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Doctor profile not found");
    }

    const { scheduleRules } = req.body;
    if (!scheduleRules || !Array.isArray(scheduleRules)) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "Schedule rules array is required"
      );
    }

    // Deactivate existing rules
    await DoctorScheduleRule.updateMany(
      { doctorId: doctor._id },
      { isActive: false }
    );

    // Create new rules
    const newRules = scheduleRules.map((rule) => ({
      ...rule,
      doctorId: doctor._id,
      effectiveFrom: new Date(),
      isActive: true,
    }));

    const createdRules = await DoctorScheduleRule.insertMany(newRules);

    return ok(res, {
      message: "Schedule rules updated successfully",
      scheduleRules: createdRules,
      doctor: {
        id: doctor._id,
        fullName: doctor.fullName,
      },
    });
  } catch (error) {
    console.error("❌ updateDoctorScheduleRules error:", error);
    return fail(
      res,
      500,
      ERROR_CODES.SERVER_ERROR,
      error.message || String(error)
    );
  }
}

/**
 * Create default schedule rules for a doctor
 */
/**
 * Block a single slot by slotId
 */
export async function blockSingleSlot(req, res) {
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

    const user = await User.findOne({ email: userEmail }).lean();
    if (!user) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "User not found by email");
    }

    const doctor = await Doctor.findOne({ userId: user._id });
    if (!doctor) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Doctor profile not found");
    }

    const { slotId } = req.params;
    const { reason } = req.body || {};

    if (!slotId) {
      return fail(res, 400, ERROR_CODES.INVALID_INPUT, "Slot ID is required");
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
        "Time slot not found or does not belong to you"
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
      `✅ Blocked single slot ${slotId} for doctor ${doctor.fullName} at ${slot.startAt}`
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
    console.error("❌ blockSingleSlot error:", error);
    return fail(
      res,
      500,
      ERROR_CODES.SERVER_ERROR,
      error.message || String(error)
    );
  }
}

/**
 * Block/unblock slots by date range for leave requests
 */
export async function blockSlotsByDateRange(req, res) {
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

    const user = await User.findOne({ email: userEmail }).lean();
    if (!user) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "User not found by email");
    }

    const doctor = await Doctor.findOne({ userId: user._id });
    if (!doctor) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Doctor profile not found");
    }

    const { startDate, endDate, reason } = req.body;

    if (!startDate || !endDate) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Start date and end date are required"
      );
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
      const blockedSlotIds = activeAppointments.map((apt) =>
        apt.slotId.toString()
      );
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
      `✅ Blocked ${updateResult.modifiedCount} slots for doctor ${doctor.fullName} from ${startDate} to ${endDate}`
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
    console.error("❌ blockSlotsByDateRange error:", error);
    return fail(
      res,
      500,
      ERROR_CODES.SERVER_ERROR,
      error.message || String(error)
    );
  }
}

/**
 * Unblock slots by date range
 */
export async function unblockSlotsByDateRange(req, res) {
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

    const user = await User.findOne({ email: userEmail }).lean();
    if (!user) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "User not found by email");
    }

    const doctor = await Doctor.findOne({ userId: user._id });
    if (!doctor) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Doctor profile not found");
    }

    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Start date and end date are required"
      );
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
      `✅ Unblocked ${updateResult.modifiedCount} slots for doctor ${doctor.fullName} from ${startDate} to ${endDate}`
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
    console.error("❌ unblockSlotsByDateRange error:", error);
    return fail(
      res,
      500,
      ERROR_CODES.SERVER_ERROR,
      error.message || String(error)
    );
  }
}

async function createDefaultScheduleRules(doctorId) {
  try {
    // Check which weekday rules already exist
    const existingRules = await DoctorScheduleRule.find({
      doctorId: doctorId,
      isActive: true,
    });

    // Get existing weekdays
    const existingWeekdays = new Set(existingRules.map((rule) => rule.weekday));

    console.log(
      `Existing weekdays for doctor ${doctorId}:`,
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
        doctorId: doctorId,
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
        `Created ${defaultRules.length
        } default schedule rules for doctor ${doctorId} (missing weekdays: ${defaultRules
          .map((r) => r.weekday)
          .join(", ")})`
      );
    } else {
      console.log(
        `All schedule rules already exist for doctor ${doctorId} (all 7 days)`
      );
    }
  } catch (error) {
    console.error("Error creating default schedule rules:", error);
    throw error;
  }
}
