import LeaveRequest from "../models/leaveRequest.model.js";
import DoctorTimeSlot from "../models/doctorTimeSlot.model.js";
import Appointment from "../models/appointment.model.js";
import Doctor from "../models/doctor.model.js";
import User from "../models/user.model.js";
import { ok, fail } from "../utils/response.js";
import { ERROR_CODES } from "../constants/index.js";

/**
 * Tạo yêu cầu nghỉ phép (bác sĩ)
 */
export async function createLeaveRequest(req, res) {
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
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "User not found");
    }

    const doctor = await Doctor.findOne({ userId: user._id });
    if (!doctor) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Doctor profile not found");
    }

    const { slotId, reason } = req.body;

    if (!slotId || !reason || !reason.trim()) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Slot ID and reason are required"
      );
    }

    // Kiểm tra slot có tồn tại và thuộc về bác sĩ này không
    const slot = await DoctorTimeSlot.findOne({
      _id: slotId,
      doctorId: doctor._id,
    });

    if (!slot) {
      return fail(
        res,
        404,
        ERROR_CODES.NOT_FOUND,
        "Slot not found or does not belong to this doctor"
      );
    }

    // Kiểm tra slot đã có appointment chưa
    const existingAppointment = await Appointment.findOne({
      slotId: slot._id,
      status: {
        $in: ["pending_doctor", "accepted", "in_progress"],
      },
    });

    if (existingAppointment) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Cannot request leave for a slot with an active appointment"
      );
    }

    // Kiểm tra đã có leave request pending cho slot này chưa
    const existingRequest = await LeaveRequest.findOne({
      slotId: slot._id,
      status: "pending",
    });

    if (existingRequest) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "There is already a pending leave request for this slot"
      );
    }

    // Tạo leave request
    const leaveRequest = new LeaveRequest({
      doctorId: doctor._id,
      slotId: slot._id,
      reason: reason.trim(),
      status: "pending",
    });

    await leaveRequest.save();

    console.log(
      `✅ Leave request created: ${leaveRequest._id} for doctor ${doctor.fullName} at slot ${slot.startAt}`
    );

    // Send notification to all managers
    try {
      const { createLeaveRequestNotification } = await import(
        "../services/notificationService.js"
      );
      await createLeaveRequestNotification(leaveRequest._id);
    } catch (notificationError) {
      console.error(
        "❌ Error creating leave request notification:",
        notificationError
      );
      // Don't fail the request if notification fails
    }

    return ok(res, {
      message: "Leave request created successfully",
      leaveRequest: {
        _id: leaveRequest._id,
        slotId: leaveRequest.slotId,
        reason: leaveRequest.reason,
        status: leaveRequest.status,
        createdAt: leaveRequest.createdAt,
      },
    });
  } catch (error) {
    console.error("❌ createLeaveRequest error:", error);
    return fail(
      res,
      500,
      ERROR_CODES.SERVER_ERROR,
      error.message || String(error)
    );
  }
}

/**
 * Lấy danh sách leave requests (manager)
 */
export async function getLeaveRequests(req, res) {
  try {
    const { status, doctorId } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    }
    if (doctorId) {
      query.doctorId = doctorId;
    }

    const leaveRequests = await LeaveRequest.find(query)
      .populate({
        path: "doctorId",
        select: "fullName avatarUrl specializationIds",
        populate: {
          path: "specializationIds",
          select: "name",
        },
      })
      .populate({
        path: "slotId",
        select: "startAt endAt status",
      })
      .populate({
        path: "reviewedBy",
        select: "fullName email",
      })
      .sort({ createdAt: -1 })
      .lean();

    return ok(res, {
      leaveRequests,
      total: leaveRequests.length,
    });
  } catch (error) {
    console.error("❌ getLeaveRequests error:", error);
    return fail(
      res,
      500,
      ERROR_CODES.SERVER_ERROR,
      error.message || String(error)
    );
  }
}

/**
 * Phê duyệt leave request (manager)
 */
export async function approveLeaveRequest(req, res) {
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
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "User not found");
    }

    if (user.role !== "manager" && user.role !== "admin") {
      return fail(
        res,
        403,
        ERROR_CODES.FORBIDDEN,
        "Only managers and admins can approve leave requests"
      );
    }

    const { leaveRequestId } = req.params;

    const leaveRequest = await LeaveRequest.findById(leaveRequestId).populate(
      "slotId"
    );

    if (!leaveRequest) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Leave request not found");
    }

    if (leaveRequest.status !== "pending") {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        `Leave request is already ${leaveRequest.status}`
      );
    }

    // Kiểm tra slot có appointment active không
    const existingAppointment = await Appointment.findOne({
      slotId: leaveRequest.slotId._id,
      status: {
        $in: ["pending_doctor", "accepted", "in_progress"],
      },
    });

    if (existingAppointment) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Cannot approve leave request for a slot with an active appointment"
      );
    }

    // Block slot
    leaveRequest.slotId.status = "blocked";
    leaveRequest.slotId.leaveReason = leaveRequest.reason;
    await leaveRequest.slotId.save();

    // Update leave request
    leaveRequest.status = "approved";
    leaveRequest.reviewedBy = user._id;
    leaveRequest.reviewedAt = new Date();
    await leaveRequest.save();

    console.log(
      `✅ Leave request approved: ${leaveRequest._id} by manager ${user.fullName}`
    );

    // Send notification to doctor about approval
    try {
      const { createLeaveRequestStatusNotification } = await import(
        "../services/notificationService.js"
      );
      await createLeaveRequestStatusNotification(leaveRequest._id, "approved");
    } catch (notificationError) {
      console.error(
        "❌ Error creating leave request approval notification:",
        notificationError
      );
      // Don't fail the request if notification fails
    }

    return ok(res, {
      message: "Leave request approved successfully",
      leaveRequest: {
        _id: leaveRequest._id,
        status: leaveRequest.status,
        reviewedBy: leaveRequest.reviewedBy,
        reviewedAt: leaveRequest.reviewedAt,
      },
    });
  } catch (error) {
    console.error("❌ approveLeaveRequest error:", error);
    return fail(
      res,
      500,
      ERROR_CODES.SERVER_ERROR,
      error.message || String(error)
    );
  }
}

/**
 * Từ chối leave request (manager)
 */
export async function rejectLeaveRequest(req, res) {
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
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "User not found");
    }

    if (user.role !== "manager" && user.role !== "admin") {
      return fail(
        res,
        403,
        ERROR_CODES.FORBIDDEN,
        "Only managers and admins can reject leave requests"
      );
    }

    const { leaveRequestId } = req.params;
    const { rejectionReason } = req.body || {};

    const leaveRequest = await LeaveRequest.findById(leaveRequestId);

    if (!leaveRequest) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Leave request not found");
    }

    if (leaveRequest.status !== "pending") {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        `Leave request is already ${leaveRequest.status}`
      );
    }

    // Update leave request
    leaveRequest.status = "rejected";
    leaveRequest.reviewedBy = user._id;
    leaveRequest.reviewedAt = new Date();
    if (rejectionReason) {
      leaveRequest.rejectionReason = rejectionReason.trim();
    }
    await leaveRequest.save();

    console.log(
      `✅ Leave request rejected: ${leaveRequest._id} by manager ${user.fullName}`
    );

    // Send notification to doctor about rejection
    try {
      const { createLeaveRequestStatusNotification } = await import(
        "../services/notificationService.js"
      );
      await createLeaveRequestStatusNotification(leaveRequest._id, "rejected");
    } catch (notificationError) {
      console.error(
        "❌ Error creating leave request rejection notification:",
        notificationError
      );
      // Don't fail the request if notification fails
    }

    return ok(res, {
      message: "Leave request rejected successfully",
      leaveRequest: {
        _id: leaveRequest._id,
        status: leaveRequest.status,
        reviewedBy: leaveRequest.reviewedBy,
        reviewedAt: leaveRequest.reviewedAt,
        rejectionReason: leaveRequest.rejectionReason,
      },
    });
  } catch (error) {
    console.error("❌ rejectLeaveRequest error:", error);
    return fail(
      res,
      500,
      ERROR_CODES.SERVER_ERROR,
      error.message || String(error)
    );
  }
}
