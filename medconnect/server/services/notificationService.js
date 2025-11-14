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

      case "done":
      case "completed":
        // Notify patient that appointment is completed
        if (patientUser) {
          const modeText = appointment.mode === "online" ? "trực tuyến" : "tại phòng khám";
          notifications.push({
            userId: patientUser._id,
            type: "appointment",
            title: "Cuộc hẹn đã hoàn thành",
            message: `Cuộc hẹn khám ${modeText} với BS. ${doctorName} vào ${appointmentTime} đã hoàn thành. Hồ sơ bệnh án của bạn đã được cập nhật. Vui lòng kiểm tra trong phần "Hồ sơ bệnh án".`,
            priority: "high",
            relatedId: appointmentId,
            relatedType: "appointment",
            metadata: {
              appointmentId,
              doctorName,
              appointmentTime,
              mode: appointment.mode,
              status: "completed",
              ...additionalData,
            },
          });
        }
        break;

      case "no_show":
        // Notify patient that they didn't show up
        if (patientUser) {
          notifications.push({
            userId: patientUser._id,
            type: "appointment",
            title: "Bạn đã không đến khám",
            message: `Bạn đã không đến khám với BS. ${doctorName} vào ${appointmentTime}. Vui lòng liên hệ phòng khám nếu bạn muốn đặt lịch lại.`,
            priority: "medium",
            relatedId: appointmentId,
            relatedType: "appointment",
            metadata: {
              appointmentId,
              doctorName,
              appointmentTime,
              status: "no_show",
              ...additionalData,
            },
          });
        }
        break;

      case "in_progress":
        // Notify patient that appointment has started
        if (patientUser) {
          const modeText = appointment.mode === "online" ? "trực tuyến" : "tại phòng khám";
          notifications.push({
            userId: patientUser._id,
            type: "appointment",
            title: "Cuộc hẹn đã bắt đầu",
            message: `Cuộc hẹn khám ${modeText} với BS. ${doctorName} đã bắt đầu. Vui lòng tham gia cuộc hẹn.`,
            priority: "high",
            relatedId: appointmentId,
            relatedType: "appointment",
            metadata: {
              appointmentId,
              doctorName,
              appointmentTime,
              mode: appointment.mode,
              status: "in_progress",
              ...additionalData,
            },
          });
        }
        break;

      default:
        return null;
    }

    // Create notifications in database
    if (notifications.length > 0) {
      const createdNotifications = await Notification.insertMany(notifications);
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
      .populate("patientId.userId", "email phone")
      .populate("doctorId.userId", "email phone")
      .lean();

    if (!appointment) {
      console.error("❌ Appointment not found:", appointmentId);
      return null;
    }

    const doctorUser = appointment.doctorId?.userId;
    const patientUser = appointment.patientId?.userId;
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

    const notifications = [];

    // Notify patient about successful booking (if appointment is auto-accepted)
    // Skip if paymentCompleted is true (payment notification already covers this)
    if (patientUser && appointment.status === "accepted" && !options.paymentCompleted) {
      const modeText = appointment.mode === "online" ? "trực tuyến" : "tại phòng khám";
      notifications.push({
        userId: patientUser._id,
        type: "appointment",
        title: "Đặt lịch hẹn thành công",
        message: `Bạn đã đặt lịch hẹn khám ${modeText} với BS. ${doctorName} vào ${appointmentTime}. Lịch hẹn đã được xác nhận. Vui lòng chuẩn bị đến khám đúng giờ.`,
        priority: "high",
        relatedId: appointmentId,
        relatedType: "appointment",
        metadata: {
          appointmentId,
          doctorName,
          appointmentTime,
          mode: appointment.mode,
          status: "accepted",
          ...options,
        },
      });
    }

    // Notify doctor about new appointment request
    // CHỈ thông báo cho bác sĩ nếu:
    // 1. Appointment cần xác nhận (status !== "accepted") HOẶC
    // 2. Được tạo bởi manager (cần bác sĩ xác nhận)
    // KHÔNG thông báo nếu appointment đã được tự động chấp nhận (status = "accepted" và không phải manager tạo)
    if (doctorUser) {
      const shouldNotifyDoctor = 
        appointment.status !== "accepted" || // Cần xác nhận
        options.createdByManager; // Manager tạo thì vẫn cần bác sĩ xác nhận

      if (shouldNotifyDoctor) {
        const title = options.createdByManager
          ? "Có lịch hẹn mới (Quản lý tạo)"
          : "Có lịch hẹn mới";
        const message = options.createdByManager
          ? `Quản lý đã tạo lịch hẹn khám cho bệnh nhân ${patientName} vào ${appointmentTime}. Vui lòng xác nhận hoặc từ chối.`
          : `Bệnh nhân ${patientName} đã đặt lịch hẹn khám vào ${appointmentTime}. Vui lòng xác nhận hoặc từ chối.`;

        notifications.push({
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
            status: appointment.status === "accepted" ? "accepted" : "pending_confirmation",
            createdByManager: options.createdByManager || false,
          },
        });
      }
    }

    // Create all notifications
    if (notifications.length > 0) {
      const createdNotifications = await Notification.insertMany(notifications);
      return createdNotifications;
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
      .lean();

    if (!leaveRequest) {
      console.error("❌ Leave request not found:", leaveRequestId);
      return null;
    }

    // Get all managers
    const managers = await User.find({ role: "manager" }).lean();

    if (managers.length === 0) {
      return null;
    }

    const doctorName = leaveRequest.doctorId?.fullName || "Bác sĩ";
    const startDate = new Date(leaveRequest.startDate);
    const endDate = new Date(leaveRequest.endDate);
    const dateRange = `${startDate.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })} - ${endDate.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })}`;

    const notifications = managers.map((manager) => ({
      userId: manager._id,
      type: "leave_request",
      title: "Yêu cầu nghỉ phép mới",
      message: `BS. ${doctorName} đã gửi yêu cầu nghỉ phép từ ${dateRange}. Lý do: ${leaveRequest.reason}`,
      priority: "high",
      relatedId: leaveRequestId,
      relatedType: "leave_request",
      metadata: {
        leaveRequestId: leaveRequestId.toString(),
        doctorId: leaveRequest.doctorId?._id?.toString(),
        doctorName,
        startDate: leaveRequest.startDate,
        endDate: leaveRequest.endDate,
        dateRange,
        reason: leaveRequest.reason,
        status: "pending",
      },
    }));

    const createdNotifications = await Notification.insertMany(notifications);
    return createdNotifications;
  } catch (error) {
    console.error("❌ Error creating leave request notification:", error);
    throw error;
  }
}

/**
 * Create notification for service payment request (notify all managers)
 */
export async function createServicePaymentRequestNotification(paymentId) {
  try {
    const Payment = (await import("../models/payment.model.js")).default;
    
    const payment = await Payment.findById(paymentId)
      .populate("appointmentId")
      .populate("billFrom.doctorId", "fullName userId")
      .populate("billTo.patientId", "fullName")
      .lean();

    if (!payment) {
      console.error("❌ Payment not found:", paymentId);
      return null;
    }

    // Only create notification for pending_manager status
    if (payment.status !== "pending_manager") {
      return null;
    }

    // Get all managers
    const managers = await User.find({ role: "manager" }).lean();

    if (managers.length === 0) {
      return null;
    }

    const doctorName = payment.billFrom?.doctorName || "Bác sĩ";
    const patientName = payment.billTo?.name || "Bệnh nhân";
    
    // Format số tiền
    const formattedAmount = new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(payment.total);

    // Format danh sách dịch vụ
    const servicesList = payment.items
      .map((item) => item.description)
      .join(", ");

    const notifications = managers.map((manager) => ({
      userId: manager._id,
      type: "payment",
      title: "Yêu cầu thanh toán hóa đơn mới",
      message: `BS. ${doctorName} đã gửi yêu cầu thanh toán ${formattedAmount} cho bệnh nhân ${patientName}. Dịch vụ: ${servicesList}. Mã hóa đơn: ${payment.invoiceNumber}`,
      priority: "high",
      relatedId: paymentId,
      relatedType: "payment",
      metadata: {
        paymentId: paymentId.toString(),
        invoiceNumber: payment.invoiceNumber,
        appointmentId: payment.appointmentId?._id?.toString(),
        doctorName,
        patientName,
        total: payment.total,
        services: payment.items,
        status: "pending_manager",
      },
    }));

    const createdNotifications = await Notification.insertMany(notifications);
    return createdNotifications;
  } catch (error) {
    console.error("❌ Error creating service payment request notification:", error);
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
    const startDate = new Date(leaveRequest.startDate);
    const endDate = new Date(leaveRequest.endDate);
    const dateRange = `${startDate.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })} - ${endDate.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })}`;

    const managerName = leaveRequest.reviewedBy?.fullName || "Quản lý";

    let notification;
    if (status === "approved") {
      notification = {
        userId: doctorUserId,
        type: "leave_request",
        title: "Yêu cầu nghỉ phép đã được chấp nhận",
        message: `Yêu cầu nghỉ phép của bạn từ ${dateRange} đã được ${managerName} chấp nhận.`,
        priority: "high",
        relatedId: leaveRequestId,
        relatedType: "leave_request",
        metadata: {
          leaveRequestId: leaveRequestId.toString(),
          status: "approved",
          startDate: leaveRequest.startDate,
          endDate: leaveRequest.endDate,
          dateRange,
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
        message: `Yêu cầu nghỉ phép của bạn từ ${dateRange} đã bị ${managerName} từ chối.${
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
          startDate: leaveRequest.startDate,
          endDate: leaveRequest.endDate,
          dateRange,
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

/**
 * Create notification for doctor registration approval/rejection (notify doctor)
 */
export async function createDoctorRegistrationNotification(
  doctorId,
  status, // "approved" or "rejected"
  additionalData = {}
) {
  try {
    const Doctor = (await import("../models/doctor.model.js")).default;
    const doctor = await Doctor.findById(doctorId)
      .populate("userId", "_id email fullName")
      .populate("approvedBy", "fullName")
      .populate("rejectedBy", "fullName")
      .lean();

    if (!doctor || !doctor.userId) {
      console.error("❌ Doctor or doctor userId not found:", doctorId);
      return null;
    }

    const doctorUserId = doctor.userId._id || doctor.userId;
    const doctorName = doctor.fullName || "Bác sĩ";

    let notification;
    if (status === "approved") {
      const adminName = doctor.approvedBy?.fullName || "Quản trị viên";
      notification = {
        userId: doctorUserId,
        type: "system",
        title: "Đơn đăng ký bác sĩ đã được phê duyệt",
        message: `Đơn đăng ký tài khoản bác sĩ của bạn đã được ${adminName} phê duyệt. Bạn có thể bắt đầu sử dụng hệ thống.${additionalData.adminNotes ? ` Ghi chú: ${additionalData.adminNotes}` : ""}`,
        priority: "high",
        relatedId: doctorId,
        relatedType: "doctor",
        metadata: {
          doctorId: doctorId.toString(),
          status: "approved",
          approvedBy: adminName,
          approvedAt: doctor.approvedAt || new Date(),
          adminNotes: additionalData.adminNotes,
          ...additionalData,
        },
      };
    } else if (status === "rejected") {
      const adminName = doctor.rejectedBy?.fullName || "Quản trị viên";
      notification = {
        userId: doctorUserId,
        type: "system",
        title: "Đơn đăng ký bác sĩ bị từ chối",
        message: `Đơn đăng ký tài khoản bác sĩ của bạn đã bị ${adminName} từ chối.${doctor.rejectionReason ? ` Lý do: ${doctor.rejectionReason}` : ""} Vui lòng liên hệ quản trị viên nếu bạn có thắc mắc.`,
        priority: "high",
        relatedId: doctorId,
        relatedType: "doctor",
        metadata: {
          doctorId: doctorId.toString(),
          status: "rejected",
          rejectedBy: adminName,
          rejectedAt: doctor.rejectedAt || new Date(),
          rejectionReason: doctor.rejectionReason,
          ...additionalData,
        },
      };
    } else {
      console.error("❌ Invalid status for doctor registration notification:", status);
      return null;
    }

    const createdNotification = await Notification.create(notification);
    return createdNotification;
  } catch (error) {
    console.error("❌ Error creating doctor registration notification:", error);
    throw error;
  }
}

/**
 * Create notification for user status change (ban, suspend, activate, etc.)
 */
export async function createUserStatusNotification(
  userId,
  action, // "banned", "suspended", "activated", "deleted", "created", "password_changed"
  additionalData = {}
) {
  try {
    const User = (await import("../models/user.model.js")).default;
    const user = await User.findById(userId).lean();

    if (!user) {
      console.error("❌ User not found:", userId);
      return null;
    }

    const adminName = additionalData.adminName || "Quản trị viên";

    let notification;
    switch (action) {
      case "banned":
        notification = {
          userId: userId,
          type: "system",
          title: "Tài khoản của bạn đã bị cấm",
          message: `Tài khoản của bạn đã bị ${adminName} cấm. Bạn không thể đăng nhập vào hệ thống. Vui lòng liên hệ quản trị viên nếu bạn có thắc mắc.${additionalData.reason ? ` Lý do: ${additionalData.reason}` : ""}`,
          priority: "high",
          relatedId: userId,
          relatedType: "user",
          metadata: {
            userId: userId.toString(),
            action: "banned",
            adminName,
            reason: additionalData.reason,
            ...additionalData,
          },
        };
        break;

      case "suspended":
        notification = {
          userId: userId,
          type: "system",
          title: "Tài khoản của bạn đã bị tạm khóa",
          message: `Tài khoản của bạn đã bị ${adminName} tạm khóa. Bạn không thể sử dụng một số chức năng của hệ thống. Vui lòng liên hệ quản trị viên nếu bạn có thắc mắc.${additionalData.reason ? ` Lý do: ${additionalData.reason}` : ""}`,
          priority: "high",
          relatedId: userId,
          relatedType: "user",
          metadata: {
            userId: userId.toString(),
            action: "suspended",
            adminName,
            reason: additionalData.reason,
            ...additionalData,
          },
        };
        break;

      case "activated":
        notification = {
          userId: userId,
          type: "system",
          title: "Tài khoản của bạn đã được kích hoạt",
          message: `Tài khoản của bạn đã được ${adminName} kích hoạt. Bạn có thể sử dụng đầy đủ các chức năng của hệ thống.`,
          priority: "medium",
          relatedId: userId,
          relatedType: "user",
          metadata: {
            userId: userId.toString(),
            action: "activated",
            adminName,
            ...additionalData,
          },
        };
        break;

      case "created":
        notification = {
          userId: userId,
          type: "system",
          title: "Tài khoản của bạn đã được tạo",
          message: `Tài khoản của bạn đã được ${adminName} tạo. Email: ${user.email}. Vui lòng đăng nhập và đổi mật khẩu.`,
          priority: "high",
          relatedId: userId,
          relatedType: "user",
          metadata: {
            userId: userId.toString(),
            action: "created",
            adminName,
            email: user.email,
            role: user.role,
            ...additionalData,
          },
        };
        break;

      case "password_changed":
        notification = {
          userId: userId,
          type: "system",
          title: "Mật khẩu của bạn đã được đổi",
          message: `Mật khẩu tài khoản của bạn đã được ${adminName} đổi. Nếu bạn không thực hiện thay đổi này, vui lòng liên hệ quản trị viên ngay lập tức.`,
          priority: "high",
          relatedId: userId,
          relatedType: "user",
          metadata: {
            userId: userId.toString(),
            action: "password_changed",
            adminName,
            ...additionalData,
          },
        };
        break;

      default:
        console.error("❌ Invalid action for user status notification:", action);
        return null;
    }

    const createdNotification = await Notification.create(notification);
    return createdNotification;
  } catch (error) {
    console.error("❌ Error creating user status notification:", error);
    throw error;
  }
}

/**
 * Create notification for new doctor registration (notify all admins)
 */
export async function createNewDoctorRegistrationNotification(doctorId) {
  try {
    const doctor = await Doctor.findById(doctorId)
      .populate("userId", "email fullName")
      .lean();

    if (!doctor || !doctor.userId) {
      console.error("❌ Doctor or doctor userId not found:", doctorId);
      return null;
    }

    // Get all admins
    const admins = await User.find({ role: "admin" }).lean();

    if (admins.length === 0) {
      return null;
    }

    const doctorName = doctor.fullName || doctor.userId.fullName || "Bác sĩ";
    const doctorEmail = doctor.userId.email || "Chưa có email";
    const registrationDate = doctor.createdAt
      ? new Date(doctor.createdAt).toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : new Date().toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });

    const notifications = admins.map((admin) => ({
      userId: admin._id,
      type: "system",
      title: "Có đơn đăng ký bác sĩ mới",
      message: `BS. ${doctorName} (${doctorEmail}) đã đăng ký tài khoản vào ngày ${registrationDate}. Vui lòng xem xét và phê duyệt.`,
      priority: "high",
      relatedId: doctorId,
      relatedType: "doctor",
      metadata: {
        doctorId: doctorId.toString(),
        doctorName,
        doctorEmail,
        registrationDate,
        status: "pending",
      },
    }));

    const createdNotifications = await Notification.insertMany(notifications);
    return createdNotifications;
  } catch (error) {
    console.error("❌ Error creating new doctor registration notification:", error);
    throw error;
  }
}
