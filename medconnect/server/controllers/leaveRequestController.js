import LeaveRequest from "../models/leaveRequest.model.js";
import DoctorTimeSlot from "../models/doctorTimeSlot.model.js";
import Appointment from "../models/appointment.model.js";
import Doctor from "../models/doctor.model.js";
import User from "../models/user.model.js";
import { ok, fail } from "../utils/response.js";
import { ERROR_CODES } from "../constants/index.js";

/**
 * Tạo yêu cầu nghỉ phép (bác sĩ) - theo date range
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

    const { startDate, endDate, reason } = req.body;

    if (!startDate || !endDate || !reason || !reason.trim()) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Start date, end date and reason are required"
      );
    }

    // Parse dates
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

    // Kiểm tra đã có leave request pending cho khoảng thời gian này chưa (overlap check)
    // Overlap occurs when: startDate <= end AND endDate >= start
    const existingRequest = await LeaveRequest.findOne({
      doctorId: doctor._id,
      status: "pending",
      startDate: { $lte: end },
      endDate: { $gte: start },
    });

    if (existingRequest) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "There is already a pending leave request that overlaps with this date range"
      );
    }

    // Tìm tất cả slot trong khoảng thời gian để kiểm tra có appointment không
    const slotsInRange = await DoctorTimeSlot.find({
      doctorId: doctor._id,
      startAt: { $gte: start, $lte: end },
    });

    if (slotsInRange.length === 0) {
      return fail(
        res,
        404,
        ERROR_CODES.NOT_FOUND,
        "No slots found in the specified date range"
      );
    }

    // Kiểm tra có slot nào có appointment active không (chỉ để thông báo, không reject)
    const slotIds = slotsInRange.map((slot) => slot._id);
    const activeAppointments = await Appointment.find({
      slotId: { $in: slotIds },
      status: {
        $in: ["pending_doctor", "accepted", "in_progress"],
      },
    }).select("slotId").lean();

    // Tạo set các slotId có appointment
    const slotsWithAppointments = new Set(
      activeAppointments.map((apt) => apt.slotId.toString())
    );

    // Đếm số slot available (không có appointment)
    const availableSlots = slotsInRange.filter(
      (slot) => !slotsWithAppointments.has(slot._id.toString())
    );

    // Chỉ báo lỗi nếu TẤT CẢ slot đều có appointment
    if (availableSlots.length === 0) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        `Cannot request leave: All slots in the date range have active appointments`
      );
    }

    // Tạo leave request
    const leaveRequest = new LeaveRequest({
      doctorId: doctor._id,
      startDate: start,
      endDate: end,
      reason: reason.trim(),
      status: "pending",
    });

    await leaveRequest.save();

    console.log(
      `✅ Leave request created: ${leaveRequest._id} for doctor ${doctor.fullName} from ${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}`
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
        startDate: leaveRequest.startDate,
        endDate: leaveRequest.endDate,
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
        path: "reviewedBy",
        select: "fullName email",
      })
      .sort({ createdAt: -1 })
      .lean();

    // Lấy thông tin appointments trong date range cho mỗi leave request
    const leaveRequestsWithAppointments = await Promise.all(
      leaveRequests.map(async (request) => {
        const start = new Date(request.startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(request.endDate);
        end.setHours(23, 59, 59, 999);

        // Tìm tất cả slot trong khoảng thời gian
        const slotsInRange = await DoctorTimeSlot.find({
          doctorId: request.doctorId._id || request.doctorId,
          startAt: { $gte: start, $lte: end },
        }).select("_id").lean();

        if (slotsInRange.length === 0) {
          return {
            ...request,
            appointments: [],
            appointmentsCount: 0,
          };
        }

        const slotIds = slotsInRange.map((slot) => slot._id);

        // Tìm tất cả appointments trong các slot này
        const appointments = await Appointment.find({
          slotId: { $in: slotIds },
          status: {
            $in: ["pending_doctor", "accepted", "in_progress"],
          },
        })
          .populate({
            path: "patientId",
            select: "fullName phone dob gender email",
            populate: {
              path: "userId",
              select: "fullName email phone",
            },
          })
          .populate({
            path: "slotId",
            select: "startAt endAt",
          })
          .select("patientId slotId scheduledStart scheduledEnd status mode reason")
          .lean();

        return {
          ...request,
          appointments: appointments || [],
          appointmentsCount: appointments?.length || 0,
        };
      })
    );

    return ok(res, {
      leaveRequests: leaveRequestsWithAppointments,
      total: leaveRequestsWithAppointments.length,
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

    // Tìm tất cả slot trong khoảng thời gian
    const start = new Date(leaveRequest.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(leaveRequest.endDate);
    end.setHours(23, 59, 59, 999);

    const slotsInRange = await DoctorTimeSlot.find({
      doctorId: leaveRequest.doctorId,
      startAt: { $gte: start, $lte: end },
    });

    if (slotsInRange.length === 0) {
      return fail(
        res,
        404,
        ERROR_CODES.NOT_FOUND,
        "No slots found in the specified date range"
      );
    }

    // Kiểm tra có slot nào có appointment active không
    const slotIds = slotsInRange.map((slot) => slot._id);
    const activeAppointments = await Appointment.find({
      slotId: { $in: slotIds },
      status: {
        $in: ["pending_doctor", "accepted", "in_progress"],
      },
    });

    if (activeAppointments.length > 0) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        `Cannot approve leave request: ${activeAppointments.length} slot(s) have active appointments`
      );
    }

    // Block tất cả slot trong range
    let blockedCount = 0;
    for (const slot of slotsInRange) {
      // Chỉ block slot available (không block slot đã booked)
      if (slot.status === "available") {
        slot.status = "blocked";
        slot.leaveReason = leaveRequest.reason;
        await slot.save();
        blockedCount++;
      }
    }

    // Update leave request
    leaveRequest.status = "approved";
    leaveRequest.reviewedBy = user._id;
    leaveRequest.reviewedAt = new Date();
    leaveRequest.blockedSlotsCount = blockedCount;
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
