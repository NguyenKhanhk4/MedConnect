import mongoose from "mongoose";
import RescheduleRequest from "../models/rescheduleRequest.model.js";
import Appointment from "../models/appointment.model.js";
import Doctor from "../models/doctor.model.js";
import Patient from "../models/patient.model.js";
import User from "../models/user.model.js";
import DoctorTimeSlot from "../models/doctorTimeSlot.model.js";
import { createAppointmentNotification } from "../services/notificationService.js";
import { ok, fail } from "../utils/response.js";
import { ERROR_CODES } from "../constants/index.js";
import { sendMail } from "../utils/email.js";

/**
 * Request reschedule for an appointment
 */
export async function requestReschedule(req, res) {
  try {
    const { appointmentId, newDateTime, reason, mode, clinicId } = req.body;
    const userId = req.user.app_user_id;

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

    // Find the appointment
    const appointment = await Appointment.findById(appointmentId)
      .populate("patientId", "userId fullName")
      .populate("doctorId", "userId fullName")
      .lean();

    if (!appointment) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Appointment not found");
    }

    // Check if user owns this appointment (patient)
    if (appointment.patientId.userId.toString() !== userId) {
      return fail(
        res,
        403,
        ERROR_CODES.FORBIDDEN,
        "You can only reschedule your own appointments"
      );
    }

    // Check if reschedule is allowed
    const canReschedule = RescheduleRequest.canReschedule(
      appointment.scheduledStart
    );
    if (!canReschedule) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Cannot reschedule appointment less than 24 hours before scheduled time"
      );
    }

    // Check if appointment can be rescheduled
    if (!["pending_doctor", "accepted"].includes(appointment.status)) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Appointment cannot be rescheduled in current status"
      );
    }

    // Check if there's already a pending reschedule request
    const existingRequest = await RescheduleRequest.findOne({
      originalAppointmentId: appointmentId,
      status: "pending",
    });

    if (existingRequest) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "There is already a pending reschedule request for this appointment"
      );
    }

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

    // Create reschedule request
    const rescheduleRequest = new RescheduleRequest({
      originalAppointmentId: appointmentId,
      requestedBy: userId,
      newDateTime: newDate,
      reason: reason.trim(),
      mode: mode,
      clinicId: mode === "offline" ? clinicId : undefined,
    });

    await rescheduleRequest.save();

    // Send notification to doctor
    try {
      await createAppointmentNotification(
        appointmentId,
        "reschedule_requested",
        {
          reason: reason,
          newDateTime: newDate,
          patientName: appointment.patientId.fullName,
          originalDateTime: appointment.scheduledStart,
        }
      );
      console.log(
        `✅ Reschedule request notification sent for appointment ${appointmentId}`
      );
    } catch (notificationError) {
      console.error(
        "❌ Error creating reschedule notification:",
        notificationError
      );
      // Don't fail the main request if notification fails
    }

    return ok(res, {
      message: "Reschedule request sent successfully",
      request: rescheduleRequest,
    });
  } catch (error) {
    console.error("❌ Error requesting reschedule:", error);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, error.message);
  }
}

/**
 * Get reschedule requests for a doctor
 */
export async function getRescheduleRequests(req, res) {
  try {
    const userId = req.user.app_user_id;
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // Find doctor by userId
    const doctor = await Doctor.findOne({ userId });
    if (!doctor) {
      return fail(res, 404, ERROR_CODES.USER_NOT_FOUND, "Doctor not found");
    }

    // Find doctor's appointments
    const doctorAppointments = await Appointment.find({
      doctorId: doctor._id,
    }).select("_id");
    const appointmentIds = doctorAppointments.map((apt) => apt._id);

    // Build filter
    const filter = { originalAppointmentId: { $in: appointmentIds } };
    if (status && status !== "all") {
      filter.status = status;
    }

    // Get reschedule requests
    const requests = await RescheduleRequest.find(filter)
      .populate("requestedBy", "fullName email")
      .populate("reviewedBy", "fullName")
      .populate({
        path: "originalAppointmentId",
        populate: [
          {
            path: "patientId",
            populate: { path: "userId", select: "fullName" },
          },
          {
            path: "doctorId",
            populate: { path: "userId", select: "fullName" },
          },
          { path: "clinicId", select: "name" },
        ],
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await RescheduleRequest.countDocuments(filter);

    // Manually populate metadata for each request if not already populated
    for (let i = 0; i < requests.length; i++) {
      if (!requests[i].metadata || !requests[i].metadata.originalDateTime) {
        const originalAppointment = requests[i].originalAppointmentId;

        if (originalAppointment) {
          requests[i].metadata = {
            patientName:
              originalAppointment.patientId?.userId?.fullName || "Bệnh nhân",
            doctorName:
              originalAppointment.doctorId?.userId?.fullName || "Bác sĩ",
            originalDateTime: originalAppointment.scheduledStart,
            clinicName: originalAppointment.clinicId?.name || "Phòng khám",
          };
        }
      }
    }

    console.log(
      `🔍 Found ${requests.length} reschedule requests for doctor ${doctor._id}`
    );

    return ok(res, {
      requests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("❌ Error getting reschedule requests:", error);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, error.message);
  }
}

/**
 * Approve reschedule request
 */
export async function approveReschedule(req, res) {
  try {
    const { requestId } = req.params;
    const userId = req.user.app_user_id;

    // Find doctor by userId
    const doctor = await Doctor.findOne({ userId });
    if (!doctor) {
      return fail(res, 404, ERROR_CODES.USER_NOT_FOUND, "Doctor not found");
    }

    // Find reschedule request with populated patient data
    const request = await RescheduleRequest.findById(requestId).populate({
      path: "originalAppointmentId",
      populate: {
        path: "patientId",
        select: "fullName userId",
        populate: {
          path: "userId",
          select: "email fullName",
        },
      },
    });

    if (!request) {
      return fail(
        res,
        404,
        ERROR_CODES.NOT_FOUND,
        "Reschedule request not found"
      );
    }

    if (request.status !== "pending") {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Request has already been processed"
      );
    }

    const originalAppointment = request.originalAppointmentId;

    // Check if doctor owns this appointment
    if (originalAppointment.doctorId.toString() !== doctor._id.toString()) {
      return fail(
        res,
        403,
        ERROR_CODES.FORBIDDEN,
        "You can only approve reschedule requests for your own appointments"
      );
    }

    // Start transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Update original appointment status
      await Appointment.findByIdAndUpdate(
        originalAppointment._id,
        {
          status: "rescheduled",
          rescheduledToId: null, // Will be set after creating new appointment
          rescheduledBy: doctor._id,
          rescheduledAt: new Date(),
          rescheduleReason: request.reason,
        },
        { session }
      );

      // Calculate appointment duration
      const appointmentDuration =
        originalAppointment.scheduledEnd.getTime() -
        originalAppointment.scheduledStart.getTime();

      const newScheduledStart = request.newDateTime;
      const newScheduledEnd = new Date(
        request.newDateTime.getTime() + appointmentDuration
      );

      // Find or create a time slot for the new datetime
      let newTimeSlot = await DoctorTimeSlot.findOne({
        doctorId: doctor._id,
        startAt: newScheduledStart,
        endAt: newScheduledEnd,
      }).session(session);

      if (!newTimeSlot) {
        // Create new time slot for the rescheduled appointment
        newTimeSlot = new DoctorTimeSlot({
          doctorId: doctor._id,
          startAt: newScheduledStart,
          endAt: newScheduledEnd,
          status: "available", // Will be set to "booked" after appointment creation
        });
        await newTimeSlot.save({ session });
        console.log(
          `✅ Created new time slot ${newTimeSlot._id} for rescheduled appointment`
        );
      }

      // Verify slot is available
      if (newTimeSlot.status !== "available") {
        await session.abortTransaction();
        return fail(
          res,
          400,
          ERROR_CODES.INVALID_INPUT,
          "Time slot for new datetime is no longer available"
        );
      }

      // Create new appointment with the NEW time slot
      // Use mode and clinicId from reschedule request if provided, otherwise use from original appointment
      const newMode = request.mode || originalAppointment.mode;
      const newAppointmentData = {
        patientId: originalAppointment.patientId,
        doctorId: originalAppointment.doctorId,
        clinicId:
          newMode === "offline"
            ? request.clinicId || originalAppointment.clinicId
            : undefined,
        slotId: newTimeSlot._id, // Use the NEW slot, not the old one
        scheduledStart: newScheduledStart,
        scheduledEnd: newScheduledEnd,
        mode: newMode,
        status: "accepted",
        reason:
          originalAppointment.reason || originalAppointment.reasonForVisit,
        rescheduledFromId: originalAppointment._id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const newAppointment = new Appointment(newAppointmentData);
      await newAppointment.save({ session });

      // Mark the new time slot as booked
      await DoctorTimeSlot.findByIdAndUpdate(
        newTimeSlot._id,
        { status: "booked" },
        { session }
      );

      // Free the old slot by setting it to "available"
      // This allows the old slot to be reused since the appointment has been moved
      const oldSlotId =
        originalAppointment.slotId?._id || originalAppointment.slotId;
      if (oldSlotId) {
        await DoctorTimeSlot.findByIdAndUpdate(
          oldSlotId,
          { status: "available" },
          { session }
        );
        console.log(
          `✅ Freed old slot ${oldSlotId} - set to available after reschedule`
        );
      }

      // Update original appointment with new appointment ID
      await Appointment.findByIdAndUpdate(
        originalAppointment._id,
        { rescheduledToId: newAppointment._id },
        { session }
      );

      // Update reschedule request
      await RescheduleRequest.findByIdAndUpdate(
        requestId,
        {
          status: "approved",
          reviewedBy: doctor._id,
          reviewedAt: new Date(),
        },
        { session }
      );

      // Commit transaction
      await session.commitTransaction();

      // Send notifications
      try {
        await createAppointmentNotification(
          originalAppointment._id,
          "rescheduled",
          {
            reason: request.reason,
            newDateTime: request.newDateTime,
            approvedBy: doctor._id,
          }
        );
        console.log(
          `✅ Reschedule approved notification sent for appointment ${originalAppointment._id}`
        );
      } catch (notificationError) {
        console.error(
          "❌ Error creating reschedule approved notification:",
          notificationError
        );
      }

      // Send email notification to patient
      try {
        await sendAppointmentRescheduledEmail(
          originalAppointment,
          newAppointment,
          request.reason,
          doctor
        );
        console.log("✅ Reschedule confirmation email sent successfully");
      } catch (emailError) {
        console.error(
          "⚠️ Failed to send reschedule confirmation email:",
          emailError.message
        );
        // Don't block reschedule if email fails
      }

      return ok(res, {
        message: "Reschedule request approved successfully",
        newAppointment: newAppointment,
        originalAppointment: originalAppointment._id,
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error("❌ Error approving reschedule:", error);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, error.message);
  }
}

/**
 * Reject reschedule request
 */
export async function rejectReschedule(req, res) {
  try {
    const { requestId } = req.params;
    const { reviewNotes } = req.body;
    const userId = req.user.app_user_id;

    // Find doctor by userId
    const doctor = await Doctor.findOne({ userId });
    if (!doctor) {
      return fail(res, 404, ERROR_CODES.USER_NOT_FOUND, "Doctor not found");
    }

    // Find reschedule request
    const request = await RescheduleRequest.findById(requestId).populate(
      "originalAppointmentId"
    );

    if (!request) {
      return fail(
        res,
        404,
        ERROR_CODES.NOT_FOUND,
        "Reschedule request not found"
      );
    }

    if (request.status !== "pending") {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Request has already been processed"
      );
    }

    const originalAppointment = request.originalAppointmentId;

    // Check if doctor owns this appointment
    if (originalAppointment.doctorId.toString() !== doctor._id.toString()) {
      return fail(
        res,
        403,
        ERROR_CODES.FORBIDDEN,
        "You can only reject reschedule requests for your own appointments"
      );
    }

    // Update reschedule request
    const updatedRequest = await RescheduleRequest.findByIdAndUpdate(
      requestId,
      {
        status: "rejected",
        reviewedBy: doctor._id,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes || "Request rejected by doctor",
      },
      { new: true }
    );

    // Send notification to patient
    try {
      await createAppointmentNotification(
        originalAppointment._id,
        "reschedule_rejected",
        {
          reason: request.reason,
          rejectedBy: doctor._id,
          reviewNotes: reviewNotes,
        }
      );
      console.log(
        `✅ Reschedule rejected notification sent for appointment ${originalAppointment._id}`
      );
    } catch (notificationError) {
      console.error(
        "❌ Error creating reschedule rejected notification:",
        notificationError
      );
    }

    return ok(res, {
      message: "Reschedule request rejected",
      request: updatedRequest,
    });
  } catch (error) {
    console.error("❌ Error rejecting reschedule:", error);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, error.message);
  }
}

/**
 * Get reschedule requests for a patient
 */
export async function getPatientRescheduleRequests(req, res) {
  try {
    const userId = req.user.app_user_id;
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = { requestedBy: userId };
    if (status && status !== "all") {
      filter.status = status;
    }

    // Get reschedule requests
    const requests = await RescheduleRequest.find(filter)
      .populate("originalAppointmentId", "scheduledStart scheduledEnd status")
      .populate("reviewedBy", "fullName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await RescheduleRequest.countDocuments(filter);

    return ok(res, {
      requests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("❌ Error getting patient reschedule requests:", error);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, error.message);
  }
}

/**
 * Helper function: Send reschedule confirmation email to patient
 */
export async function sendAppointmentRescheduledEmail(
  originalAppointment,
  newAppointment,
  reason,
  doctor
) {
  try {
    console.log(`📧 sendAppointmentRescheduledEmail called with:`, {
      originalAppointmentId: originalAppointment?._id,
      newAppointmentId: newAppointment?._id,
      patientEmail: originalAppointment?.patientId?.userId?.email,
    });

    // Lấy email từ Patient userId
    let patientEmail = null;

    if (
      originalAppointment?.patientId?.userId &&
      typeof originalAppointment.patientId.userId === "object" &&
      originalAppointment.patientId.userId.email
    ) {
      // userId đã được populate
      patientEmail = originalAppointment.patientId.userId.email;
      console.log(`📧 Found email from populated userId: ${patientEmail}`);
    } else if (originalAppointment?.patientId?.userId) {
      // userId là ObjectId, cần query
      console.log(
        `📧 Querying User for email, userId: ${originalAppointment.patientId.userId}`
      );
      const patientUser = await User.findById(
        originalAppointment.patientId.userId
      )
        .select("email fullName")
        .lean();
      if (patientUser) {
        patientEmail = patientUser.email;
        console.log(`📧 Found email from User query: ${patientEmail}`);
      } else {
        console.log(
          `⚠️ User not found for userId: ${originalAppointment.patientId.userId}`
        );
      }
    }

    // Nếu vẫn không có email, không gửi
    if (!patientEmail) {
      console.log(
        "⚠️ Patient email not found, skipping reschedule email notification. Patient data:",
        {
          patientId: originalAppointment?.patientId?._id,
          userId: originalAppointment?.patientId?.userId,
        }
      );
      return;
    }

    console.log(`📧 Sending reschedule confirmation email to: ${patientEmail}`);

    // Format thời gian cũ
    const oldScheduledStart = new Date(originalAppointment.scheduledStart);
    const oldScheduledEnd = new Date(originalAppointment.scheduledEnd);
    const oldDateStr = oldScheduledStart.toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const oldTimeStr = `${oldScheduledStart.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    })} - ${oldScheduledEnd.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;

    // Format thời gian mới
    const newScheduledStart = new Date(newAppointment.scheduledStart);
    const newScheduledEnd = new Date(newAppointment.scheduledEnd);
    const newDateStr = newScheduledStart.toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const newTimeStr = `${newScheduledStart.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    })} - ${newScheduledEnd.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;

    const oldModeText =
      originalAppointment.mode === "online"
        ? "Online"
        : "Trực tiếp tại phòng khám";
    const newModeText =
      newAppointment.mode === "online" ? "Online" : "Trực tiếp tại phòng khám";

    // Lấy tên bác sĩ và bệnh nhân
    const doctorName = doctor?.fullName || "Bác sĩ";
    const patientName =
      originalAppointment?.patientId?.fullName ||
      originalAppointment?.patientId?.userId?.fullName ||
      "Bệnh nhân";
    const approvalDate = new Date().toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Tạo nội dung email
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #059669; border-bottom: 2px solid #059669; padding-bottom: 10px;">
          Lịch hẹn của bạn đã được dời thành công
        </h2>
        <p>Xin chào <strong>${patientName}</strong>,</p>
        <p>Chúng tôi xin thông báo rằng yêu cầu dời lịch hẹn của bạn đã được <strong style="color: #059669;">bác sĩ chấp thuận</strong>.</p>
        
        <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 15px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #0284c7;">Thông tin bác sĩ:</h3>
          <p style="margin: 8px 0;"><strong>Bác sĩ:</strong> ${doctorName}</p>
          ${
            originalAppointment.reason
              ? `<p style="margin: 8px 0;"><strong>Lý do khám:</strong> ${originalAppointment.reason}</p>`
              : ""
          }
        </div>

        <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #b91c1c;">Thời gian cũ (đã hủy):</h3>
          <p style="margin: 8px 0;"><strong>Ngày:</strong> ${oldDateStr}</p>
          <p style="margin: 8px 0;"><strong>Giờ:</strong> ${oldTimeStr}</p>
          <p style="margin: 8px 0;"><strong>Hình thức:</strong> ${oldModeText}</p>
        </div>

        <div style="background-color: #ecfdf5; border-left: 4px solid #059669; padding: 15px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #047857;">Thời gian mới:</h3>
          <p style="margin: 8px 0;"><strong>Ngày:</strong> ${newDateStr}</p>
          <p style="margin: 8px 0;"><strong>Giờ:</strong> ${newTimeStr}</p>
          <p style="margin: 8px 0;"><strong>Hình thức:</strong> ${newModeText}</p>
          <p style="margin: 8px 0;"><strong>Trạng thái:</strong> <span style="color: #059669; font-weight: bold;">Đã xác nhận</span></p>
        </div>

        ${
          reason
            ? `
        <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #d97706;">Lý do dời lịch:</h3>
          <p style="margin: 0; white-space: pre-wrap;">${reason}</p>
        </div>
        `
            : ""
        }

        <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 15px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #0284c7;">Lưu ý:</h3>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>Vui lòng đảm bảo bạn có mặt đúng giờ hẹn mới</li>
            <li>Thời gian cũ của bạn đã được hủy</li>
            ${
              newAppointment.mode === "online"
                ? "<li><strong>Lưu ý:</strong> Đây là cuộc hẹn online. Vui lòng chuẩn bị kết nối internet ổn định và tham gia cuộc gọi video đúng giờ.</li>"
                : ""
            }
          </ul>
        </div>

        <p style="margin-top: 30px;">Cảm ơn bạn đã sử dụng dịch vụ của MedConnect.</p>
        
        <p style="margin-top: 30px;">Trân trọng,<br><strong>MedConnect</strong></p>
      </div>
    `;

    const textContent = `
Lịch hẹn của bạn đã được dời thành công

Xin chào ${patientName},

Chúng tôi xin thông báo rằng yêu cầu dời lịch hẹn của bạn đã được bác sĩ chấp thuận.

Thông tin bác sĩ:
- Bác sĩ: ${doctorName}
${
  originalAppointment.reason
    ? `- Lý do khám: ${originalAppointment.reason}`
    : ""
}

Thời gian cũ (đã hủy):
- Ngày: ${oldDateStr}
- Giờ: ${oldTimeStr}
- Hình thức: ${oldModeText}

Thời gian mới:
- Ngày: ${newDateStr}
- Giờ: ${newTimeStr}
- Hình thức: ${newModeText}
- Trạng thái: Đã xác nhận

${reason ? `Lý do dời lịch: ${reason}` : ""}

Lưu ý:
- Vui lòng đảm bảo bạn có mặt đúng giờ hẹn mới
- Thời gian cũ của bạn đã được hủy
${
  newAppointment.mode === "online"
    ? "- Lưu ý: Đây là cuộc hẹn online. Vui lòng chuẩn bị kết nối internet ổn định và tham gia cuộc gọi video đúng giờ."
    : ""
}

Cảm ơn bạn đã sử dụng dịch vụ của MedConnect.

Trân trọng,
MedConnect
    `;

    console.log(
      `📧 Attempting to send reschedule confirmation email via sendMail...`
    );
    const emailResult = await sendMail({
      to: patientEmail,
      subject: "Lịch hẹn của bạn đã được dời thành công - MedConnect",
      text: textContent,
      html: htmlContent,
    });

    console.log(
      `✅ Reschedule confirmation email sent successfully to ${patientEmail}`
    );
    console.log(`📧 Email result:`, {
      messageId: emailResult?.messageId,
      response: emailResult?.response,
    });
  } catch (error) {
    console.error(
      "❌ Error sending reschedule confirmation email:",
      error?.message || error
    );
    // Không throw error để không ảnh hưởng đến flow chính
  }
}
