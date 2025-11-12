import Notification from "../models/notification.model.js";
import Appointment from "../models/appointment.model.js";
import Patient from "../models/patient.model.js";
import Doctor from "../models/doctor.model.js";
import User from "../models/user.model.js";

/**
 * Notification Service for Appointment Management
 * Handles automatic notifications for appointment status changes
 */

/**
 * Create notification for appointment status change
 */
export async function createAppointmentNotification(
  appointmentId,
  status,
  additionalData = {}
) {
  try {
    // Get appointment with populated data
    const appointment = await Appointment.findById(appointmentId)
      .populate("patientId", "userId fullName")
      .populate("doctorId", "userId fullName")
      .populate("patientId.userId", "email phone")
      .populate("doctorId.userId", "email phone")
      .lean();

    if (!appointment) {
      console.error("❌ Appointment not found:", appointmentId);
      return null;
    }

    const patientUser = appointment.patientId?.userId;
    const doctorUser = appointment.doctorId?.userId;
    const patientName = appointment.patientId?.fullName || "Bệnh nhân";
    const doctorName = appointment.doctorId?.fullName || "Bác sĩ";

    // Format appointment time
    const appointmentTime = new Date(appointment.scheduledStart).toLocaleString(
      "vi-VN",
      {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );

    let notifications = [];

    // Create notification based on status
    switch (status) {
      case "accepted":
        // Notify patient that appointment is confirmed
        if (patientUser) {
          notifications.push({
            userId: patientUser._id,
            type: "appointment",
            title: "Lịch hẹn đã được xác nhận",
            message: `Lịch hẹn khám với BS. ${doctorName} vào ${appointmentTime} đã được xác nhận. Vui lòng chuẩn bị đến khám đúng giờ.`,
            priority: "high",
            relatedId: appointmentId,
            relatedType: "appointment",
            metadata: {
              appointmentId,
              doctorName,
              appointmentTime,
              status: "confirmed",
              ...additionalData,
            },
          });
        }
        break;

      case "rejected":
        // Notify patient that appointment is rejected
        if (patientUser) {
          notifications.push({
            userId: patientUser._id,
            type: "appointment",
            title: "Lịch hẹn bị từ chối",
            message: `Lịch hẹn khám với BS. ${doctorName} vào ${appointmentTime} đã bị từ chối. Vui lòng đặt lịch khác hoặc liên hệ phòng khám.`,
            priority: "high",
            relatedId: appointmentId,
            relatedType: "appointment",
            metadata: {
              appointmentId,
              doctorName,
              appointmentTime,
              status: "rejected",
              reason: additionalData.rejectReason,
              ...additionalData,
            },
          });
        }
        break;

      case "cancelled":
        // Notify doctor that patient cancelled
        if (doctorUser) {
          notifications.push({
            userId: doctorUser._id,
            type: "appointment",
            title: "Bệnh nhân đã hủy lịch hẹn",
            message: `Bệnh nhân ${patientName} đã hủy lịch hẹn vào ${appointmentTime}.`,
            priority: "medium",
            relatedId: appointmentId,
            relatedType: "appointment",
            metadata: {
              appointmentId,
              patientName,
              appointmentTime,
              status: "cancelled",
              reason: additionalData.cancelReason,
              ...additionalData,
            },
          });
        }
        break;

      case "rescheduled":
        // Format new datetime if provided
        const newDateTime = additionalData.newDateTime
          ? new Date(additionalData.newDateTime).toLocaleString("vi-VN", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : appointmentTime;

        // Notify patient about reschedule
        if (patientUser) {
          notifications.push({
            userId: patientUser._id,
            type: "appointment",
            title:
              additionalData.rescheduledByType === "manager"
                ? "Lịch hẹn đã được dời bởi quản lý"
                : "Lịch hẹn đã được dời",
            message: `Lịch hẹn khám với BS. ${doctorName} đã được dời đến ${newDateTime}.${
              additionalData.reason ? ` Lý do: ${additionalData.reason}` : ""
            }`,
            priority: "high",
            relatedId: appointmentId,
            relatedType: "appointment",
            metadata: {
              appointmentId,
              doctorName,
              appointmentTime,
              newDateTime: additionalData.newDateTime || appointmentTime,
              status: "rescheduled",
              ...additionalData,
            },
          });
        }

        // Notify doctor about reschedule (if notifyDoctor flag is set or rescheduledByType is manager)
        if (
          doctorUser &&
          (additionalData.notifyDoctor ||
            additionalData.rescheduledByType === "manager")
        ) {
          notifications.push({
            userId: doctorUser._id,
            type: "appointment",
            title:
              additionalData.rescheduledByType === "manager"
                ? "Lịch hẹn đã được dời bởi quản lý"
                : "Lịch hẹn đã được dời",
            message: `Lịch hẹn với bệnh nhân ${patientName} đã được dời đến ${newDateTime}.${
              additionalData.reason ? ` Lý do: ${additionalData.reason}` : ""
            }`,
            priority: "medium",
            relatedId: appointmentId,
            relatedType: "appointment",
            metadata: {
              appointmentId,
              patientName,
              appointmentTime,
              newDateTime: additionalData.newDateTime || appointmentTime,
              status: "rescheduled",
              ...additionalData,
            },
          });
        }
        break;

      case "reschedule_requested":
        // Notify doctor about reschedule request
        if (doctorUser) {
          notifications.push({
            userId: doctorUser._id,
            type: "appointment",
            title: "Có yêu cầu dời lịch",
            message: `Bệnh nhân ${patientName} yêu cầu dời lịch từ ${additionalData.originalDateTime} đến ${additionalData.newDateTime}. Lý do: ${additionalData.reason}`,
            priority: "high",
            relatedId: appointmentId,
            relatedType: "reschedule_request",
            metadata: {
              appointmentId,
              patientName,
              originalDateTime: additionalData.originalDateTime,
              newDateTime: additionalData.newDateTime,
              reason: additionalData.reason,
              status: "pending",
              ...additionalData,
            },
          });
        }
        break;

      case "reschedule_rejected":
        // Notify patient about reschedule rejection
        if (patientUser) {
          notifications.push({
            userId: patientUser._id,
            type: "appointment",
            title: "Yêu cầu dời lịch bị từ chối",
            message: `Yêu cầu dời lịch khám với BS. ${doctorName} đã bị từ chối. ${
              additionalData.reviewNotes || ""
            }`,
            priority: "medium",
            relatedId: appointmentId,
            relatedType: "reschedule_request",
            metadata: {
              appointmentId,
              doctorName,
              reason: additionalData.reason,
              reviewNotes: additionalData.reviewNotes,
              status: "rejected",
              ...additionalData,
            },
          });
        }
        break;

      case "reminder":
        // Send reminder notification (24 hours before)
        if (patientUser) {
          notifications.push({
            userId: patientUser._id,
            type: "appointment",
            title: "Nhắc nhở lịch hẹn",
            message: `Bạn có lịch hẹn khám với BS. ${doctorName} vào ngày mai (${appointmentTime}). Vui lòng chuẩn bị đến khám đúng giờ.`,
            priority: "medium",
            relatedId: appointmentId,
            relatedType: "appointment",
            metadata: {
              appointmentId,
              doctorName,
              appointmentTime,
              status: "reminder",
              ...additionalData,
            },
          });
        }
        break;

      default:
        console.log("⚠️ Unknown appointment status:", status);
        return null;
    }

    // Create notifications in database
    if (notifications.length > 0) {
      const createdNotifications = await Notification.insertMany(notifications);
      console.log(
        `✅ Created ${createdNotifications.length} notifications for appointment ${appointmentId}`
      );
      return createdNotifications;
    }

    return null;
  } catch (error) {
    console.error("❌ Error creating appointment notification:", error);
    throw error;
  }
}

/**
 * Create notification for service payment completion (for doctor)
 */
export async function createServicePaymentNotification(
  paymentId,
  appointmentId
) {
  try {
    // Get payment with populated data
    const Payment = (await import("../models/payment.model.js")).default;
    const payment = await Payment.findById(paymentId)
      .populate("appointmentId")
      .lean();

    if (!payment) {
      console.error("❌ Payment not found:", paymentId);
      return null;
    }

    // Get appointment with populated data
    const appointment = await Appointment.findById(appointmentId)
      .populate("patientId", "fullName userId")
      .populate("doctorId", "userId fullName")
      .populate("doctorId.userId", "email phone")
      .lean();

    if (!appointment) {
      console.error("❌ Appointment not found:", appointmentId);
      return null;
    }

    const doctorUser = appointment.doctorId?.userId;
    const patientName = appointment.patientId?.fullName || "Bệnh nhân";

    if (!doctorUser) {
      console.error("❌ Doctor user not found for appointment:", appointmentId);
      return null;
    }

    // Format số tiền
    const formattedAmount = new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(payment.total);

    // Format danh sách dịch vụ
    const servicesList = payment.items
      .map((item) => `${item.description} - ${new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
      }).format(item.unitPrice)}`)
      .join(", ");

    // Create notification for doctor
    const notification = await Notification.create({
      userId: doctorUser._id,
      type: "payment",
      title: "Xác nhận thanh toán dịch vụ",
      message: `Bệnh nhân ${patientName} đã thanh toán thành công ${formattedAmount} cho dịch vụ: ${servicesList}. Mã hóa đơn: ${payment.invoiceNumber}`,
      priority: "high",
      relatedId: paymentId,
      relatedType: "payment",
      metadata: {
        appointmentId: appointmentId,
        paymentId: paymentId,
        invoiceNumber: payment.invoiceNumber,
        total: payment.total,
        services: payment.items,
        patientName: patientName,
      },
    });

    console.log(
      `✅ Created service payment notification for doctor ${doctorUser._id}`
    );
    return notification;
  } catch (error) {
    console.error("❌ Error creating service payment notification:", error);
    throw error;
  }
}

/**
 * Create notification for new appointment booking
 * @param {string} appointmentId - The appointment ID
 * @param {object} options - Additional options
 * @param {boolean} options.createdByManager - Whether appointment was created by manager
 */
export async function createBookingNotification(appointmentId, options = {}) {
  try {
    const appointment = await Appointment.findById(appointmentId)
      .populate("patientId", "userId fullName")
      .populate("doctorId", "userId fullName")
      .populate("doctorId.userId", "email phone")
      .lean();

    if (!appointment) {
      console.error("❌ Appointment not found:", appointmentId);
      return null;
    }

    const doctorUser = appointment.doctorId?.userId;
    const patientName = appointment.patientId?.fullName || "Bệnh nhân";
    const doctorName = appointment.doctorId?.fullName || "Bác sĩ";

    const appointmentTime = new Date(appointment.scheduledStart).toLocaleString(
      "vi-VN",
      {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );

    // Notify doctor about new appointment request
    if (doctorUser) {
      const title = options.createdByManager
        ? "Có lịch hẹn mới (Quản lý tạo)"
        : "Có lịch hẹn mới";
      const message = options.createdByManager
        ? `Quản lý đã tạo lịch hẹn khám cho bệnh nhân ${patientName} vào ${appointmentTime}. Vui lòng xác nhận hoặc từ chối.`
        : `Bệnh nhân ${patientName} đã đặt lịch hẹn khám vào ${appointmentTime}. Vui lòng xác nhận hoặc từ chối.`;

      const notification = await Notification.create({
        userId: doctorUser._id,
        type: "appointment",
        title,
        message,
        priority: "high",
        relatedId: appointmentId,
        relatedType: "appointment",
        metadata: {
          appointmentId,
          patientName,
          appointmentTime,
          status: "pending_confirmation",
          createdByManager: options.createdByManager || false,
        },
      });

      console.log(`✅ Created booking notification for doctor ${doctorName}`);
      return notification;
    }

    return null;
  } catch (error) {
    console.error("❌ Error creating booking notification:", error);
    throw error;
  }
}

/**
 * Send appointment reminder (called by cron job)
 */
export async function sendAppointmentReminders() {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    // Find appointments scheduled for tomorrow
    const appointments = await Appointment.find({
      scheduledStart: {
        $gte: tomorrow,
        $lte: tomorrowEnd,
      },
      status: "accepted",
    })
      .populate("patientId", "userId fullName")
      .populate("doctorId", "userId fullName")
      .lean();

    console.log(`🔔 Found ${appointments.length} appointments for reminder`);

    for (const appointment of appointments) {
      await createAppointmentNotification(appointment._id, "reminder");
    }

    return appointments.length;
  } catch (error) {
    console.error("❌ Error sending appointment reminders:", error);
    throw error;
  }
}

/**
 * Create notification for leave request (notify all managers)
 */
export async function createLeaveRequestNotification(leaveRequestId) {
  try {
    const LeaveRequest = (await import("../models/leaveRequest.model.js"))
      .default;

    const leaveRequest = await LeaveRequest.findById(leaveRequestId)
      .populate({
        path: "doctorId",
        select: "fullName userId",
      })
      .populate({
        path: "slotId",
        select: "startAt endAt",
      })
      .lean();

    if (!leaveRequest) {
      console.error("❌ Leave request not found:", leaveRequestId);
      return null;
    }

    // Get all managers
    const managers = await User.find({ role: "manager" }).lean();

    if (managers.length === 0) {
      console.log("⚠️ No managers found to notify");
      return null;
    }

    const doctorName = leaveRequest.doctorId?.fullName || "Bác sĩ";
    const slotStart = new Date(leaveRequest.slotId?.startAt);
    const slotEnd = new Date(leaveRequest.slotId?.endAt);
    const slotTime = `${slotStart.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })} - ${slotEnd.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;

    const notifications = managers.map((manager) => ({
      userId: manager._id,
      type: "leave_request",
      title: "Yêu cầu nghỉ phép mới",
      message: `BS. ${doctorName} đã gửi yêu cầu nghỉ phép vào ${slotTime}. Lý do: ${leaveRequest.reason}`,
      priority: "high",
      relatedId: leaveRequestId,
      relatedType: "leave_request",
      metadata: {
        leaveRequestId: leaveRequestId.toString(),
        doctorId: leaveRequest.doctorId?._id?.toString(),
        doctorName,
        slotId: leaveRequest.slotId?._id?.toString(),
        slotTime,
        reason: leaveRequest.reason,
        status: "pending",
      },
    }));

    console.log(
      `📢 Creating notifications for ${managers.length} managers:`,
      managers.map((m) => ({ id: m._id.toString(), email: m.email }))
    );

    const createdNotifications = await Notification.insertMany(notifications);
    console.log(
      `✅ Created ${createdNotifications.length} leave request notifications for managers`
    );
    console.log(
      `📋 Created notification IDs:`,
      createdNotifications.map((n) => n._id.toString())
    );
    console.log(
      `📋 Created notification userIds:`,
      createdNotifications.map((n) => n.userId.toString())
    );
    return createdNotifications;
  } catch (error) {
    console.error("❌ Error creating leave request notification:", error);
    throw error;
  }
}

/**
 * Create notification for leave request approval/rejection (notify doctor)
 */
export async function createLeaveRequestStatusNotification(
  leaveRequestId,
  status // "approved" or "rejected"
) {
  try {
    const LeaveRequest = (await import("../models/leaveRequest.model.js"))
      .default;
    const Doctor = (await import("../models/doctor.model.js")).default;

    const leaveRequest = await LeaveRequest.findById(leaveRequestId)
      .populate({
        path: "doctorId",
        select: "userId fullName",
      })
      .populate({
        path: "slotId",
        select: "startAt endAt",
      })
      .populate({
        path: "reviewedBy",
        select: "fullName",
      })
      .lean();

    if (!leaveRequest) {
      console.error("❌ Leave request not found:", leaveRequestId);
      return null;
    }

    const doctor = await Doctor.findById(leaveRequest.doctorId).populate(
      "userId",
      "_id email fullName"
    );

    if (!doctor || !doctor.userId) {
      console.error(
        "❌ Doctor or doctor userId not found for leave request:",
        leaveRequestId
      );
      return null;
    }

    const doctorUserId = doctor.userId._id || doctor.userId;
    const slotStart = new Date(leaveRequest.slotId?.startAt);
    const slotEnd = new Date(leaveRequest.slotId?.endAt);
    const slotTime = `${slotStart.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })} - ${slotEnd.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;

    const managerName = leaveRequest.reviewedBy?.fullName || "Quản lý";

    let notification;
    if (status === "approved") {
      notification = {
        userId: doctorUserId,
        type: "leave_request",
        title: "Yêu cầu nghỉ phép đã được chấp nhận",
        message: `Yêu cầu nghỉ phép của bạn vào ${slotTime} đã được ${managerName} chấp nhận.`,
        priority: "high",
        relatedId: leaveRequestId,
        relatedType: "leave_request",
        metadata: {
          leaveRequestId: leaveRequestId.toString(),
          status: "approved",
          slotId: leaveRequest.slotId?._id?.toString(),
          slotTime,
          reason: leaveRequest.reason,
          reviewedBy: managerName,
          reviewedAt: leaveRequest.reviewedAt,
        },
      };
    } else if (status === "rejected") {
      notification = {
        userId: doctorUserId,
        type: "leave_request",
        title: "Yêu cầu nghỉ phép bị từ chối",
        message: `Yêu cầu nghỉ phép của bạn vào ${slotTime} đã bị ${managerName} từ chối.${
          leaveRequest.rejectionReason
            ? ` Lý do: ${leaveRequest.rejectionReason}`
            : ""
        }`,
        priority: "high",
        relatedId: leaveRequestId,
        relatedType: "leave_request",
        metadata: {
          leaveRequestId: leaveRequestId.toString(),
          status: "rejected",
          slotId: leaveRequest.slotId?._id?.toString(),
          slotTime,
          reason: leaveRequest.reason,
          rejectionReason: leaveRequest.rejectionReason,
          reviewedBy: managerName,
          reviewedAt: leaveRequest.reviewedAt,
        },
      };
    } else {
      console.error(
        "❌ Invalid status for leave request notification:",
        status
      );
      return null;
    }

    const createdNotification = await Notification.create(notification);
    console.log(
      `✅ Created leave request ${status} notification for doctor: ${doctor.fullName}`
    );
    return createdNotification;
  } catch (error) {
    console.error(
      "❌ Error creating leave request status notification:",
      error
    );
    throw error;
  }
}

/**
 * Get notification statistics for admin
 */
export async function getNotificationStats() {
  try {
    const stats = await Notification.aggregate([
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
          unread: {
            $sum: {
              $cond: [{ $eq: ["$isRead", false] }, 1, 0],
            },
          },
        },
      },
    ]);

    const totalNotifications = await Notification.countDocuments();
    const totalUnread = await Notification.countDocuments({ isRead: false });

    return {
      totalNotifications,
      totalUnread,
      byType: stats,
    };
  } catch (error) {
    console.error("❌ Error getting notification stats:", error);
    throw error;
  }
}
