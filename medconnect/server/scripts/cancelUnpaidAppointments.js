/**
 * Script để tự động hủy các appointments chưa thanh toán sau 10 phút
 * Chạy định kỳ bằng cron job
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import Appointment from "../models/appointment.model.js";
import DoctorTimeSlot from "../models/doctorTimeSlot.model.js";
import Payment from "../models/payment.model.js";
import Notification from "../models/notification.model.js";
import Patient from "../models/patient.model.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URL || "mongodb://localhost:27017/MedConnect";

async function cancelUnpaidAppointments() {
  try {
    console.log("🔍 Checking for unpaid appointments past deadline...");

    const now = new Date();
    console.log(`⏰ Current time: ${now.toISOString()}`);
    
    // Tìm appointments chưa thanh toán và đã quá deadline
    // KHÔNG hủy appointments có pendingOrderCode (đang chờ webhook/check-status)
    const unpaidAppointments = await Appointment.find({
      paymentStatus: "unpaid",
      paymentDeadline: { $lt: now }, // Deadline đã qua
      status: { $ne: "cancelled" }, // Chưa bị hủy
      $or: [
        { pendingOrderCode: { $exists: false } }, // Không có pendingOrderCode
        { pendingOrderCode: null } // Hoặc pendingOrderCode = null
      ]
    })
    .populate("patientId", "userId fullName")
    .populate("doctorId", "userId fullName");

    if (unpaidAppointments.length === 0) {
      console.log("✅ No unpaid appointments to cancel");
      return { cancelled: 0, slotsReleased: 0 };
    }

    console.log(`⚠️  Found ${unpaidAppointments.length} unpaid appointment(s) to cancel`);
    unpaidAppointments.forEach(apt => {
      console.log(`   - Appointment ${apt._id}: deadline ${apt.paymentDeadline?.toISOString()}, status ${apt.status}, payment ${apt.paymentStatus}`);
    });

    let cancelledCount = 0;
    let slotReleasedCount = 0;

    for (const appointment of unpaidAppointments) {
      try {
        // DOUBLE CHECK: Không hủy nếu có dấu hiệu đã thanh toán
        if (appointment.paymentStatus === "paid" || appointment.pendingOrderCode) {
          console.log(`   ⚠️  Skipping appointment ${appointment._id} - has payment indicators`);
          continue;
        }

        // 1. Hủy appointment
        appointment.status = "cancelled";
        appointment.cancelReason = "Không thanh toán trong thời hạn 10 phút";
        appointment.cancelledAt = new Date();
        appointment.pendingOrderCode = undefined; // Xóa pendingOrderCode
        await appointment.save();

        console.log(`❌ Cancelled appointment ${appointment._id}`);
        cancelledCount++;

        // 2. Gửi thông báo cho patient
        try {
          const patientUserId = appointment.patientId?.userId;
          const doctorName = appointment.doctorId?.fullName || "Bác sĩ";
          
          const appointmentTime = new Date(appointment.scheduledStart).toLocaleString("vi-VN", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

          if (patientUserId) {
            await Notification.create({
              userId: patientUserId,
              type: "appointment",
              title: "Lịch hẹn đã bị hủy",
              message: `Lịch hẹn khám với BS. ${doctorName} vào ${appointmentTime} đã bị hủy do không thanh toán trong thời hạn 10 phút. Vui lòng đặt lịch mới nếu cần.`,
              priority: "high",
              relatedId: appointment._id,
              relatedType: "appointment",
              metadata: {
                appointmentId: appointment._id,
                doctorName,
                appointmentTime,
                status: "cancelled",
                reason: "Không thanh toán trong thời hạn 10 phút",
              },
            });
            console.log(`📧 Sent cancellation notification to patient`);
          }
        } catch (notifError) {
          console.error(`❌ Error sending notification:`, notifError);
        }

        // 3. Giải phóng time slot
        if (appointment.slotId) {
          await DoctorTimeSlot.findByIdAndUpdate(appointment.slotId, {
            status: "available",
          });
          console.log(`🔓 Released time slot ${appointment.slotId}`);
          slotReleasedCount++;
        }

        // 4. Payment record sẽ không tồn tại nếu chưa thanh toán thành công
        // (với flow mới, payment chỉ được tạo sau khi webhook xác nhận thanh toán)
        const payment = await Payment.findOne({ appointmentId: appointment._id });
        if (payment && !["captured", "authorized"].includes(payment.status)) {
          payment.status = "cancelled";
          await payment.save();
          console.log(`🗑️  Cancelled payment ${payment._id} for appointment ${appointment._id}`);
        }

      } catch (error) {
        console.error(`❌ Error cancelling appointment ${appointment._id}:`, error);
      }
    }

    console.log(`✅ Cancellation complete: ${cancelledCount} appointment(s) cancelled, ${slotReleasedCount} slot(s) released`);

    return {
      cancelled: cancelledCount,
      slotsReleased: slotReleasedCount,
    };

  } catch (error) {
    console.error("❌ Error in cancelUnpaidAppointments:", error);
    throw error;
  }
}

// Nếu chạy trực tiếp (không import)
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      console.log("🚀 Connecting to MongoDB...");
      await mongoose.connect(MONGODB_URI);
      console.log("✅ Connected to MongoDB");

      const result = await cancelUnpaidAppointments();
      console.log("📊 Result:", result);

      await mongoose.disconnect();
      console.log("👋 Disconnected from MongoDB");
      process.exit(0);
    } catch (error) {
      console.error("💥 Fatal error:", error);
      process.exit(1);
    }
  })();
}

export default cancelUnpaidAppointments;

