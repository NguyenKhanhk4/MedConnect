/**
 * Service để tự động gửi email nhắc nhở bệnh nhân 10 phút trước khi cuộc gọi video bắt đầu
 * Sử dụng cron job để chạy định kỳ
 */

import cron from "node-cron";
import Appointment from "../models/appointment.model.js";
import Patient from "../models/patient.model.js";
import Doctor from "../models/doctor.model.js";
import User from "../models/user.model.js";
import VideoCall from "../models/videoCall.model.js";
import { sendMail } from "../utils/email.js";

let cronJob = null;
const sentReminders = new Set(); // Track đã gửi reminder để tránh gửi trùng

/**
 * Khởi động cron job để tự động gửi email nhắc 10 phút trước cuộc gọi video
 * Chạy mỗi phút để check chính xác
 */
export function startVideoCallReminderJob() {
  if (cronJob) {
    console.log("⚠️  Video call reminder job is already running");
    return;
  }

  // Chạy mỗi phút để check chính xác
  cronJob = cron.schedule("* * * * *", async () => {
    console.log("\n⏰ [Cron] Checking for video call reminders...");
    try {
      const result = await sendVideoCallReminders();
      if (result.sent > 0) {
        console.log(`✅ [Cron] Sent ${result.sent} video call reminders`);
      }
    } catch (error) {
      console.error("❌ [Cron] Video call reminder job failed:", error);
    }
  });

  console.log("✅ Video call reminder cron job started (runs every minute)");
}

/**
 * Dừng cron job
 */
export function stopVideoCallReminderJob() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    console.log("⏹️  Video call reminder job stopped");
  }
  sentReminders.clear();
}

/**
 * Send video call reminders for appointments starting in 10 minutes
 */
export async function sendVideoCallReminders() {
  try {
    const now = new Date();
    const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);
    
    // Calculate time range: from now+10min to now+11min (1 minute window)
    const windowStart = new Date(now.getTime() + 10 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 11 * 60 * 1000);

    // Find appointments that:
    // 1. Are online mode
    // 2. Are accepted or in_progress
    // 3. Scheduled to start in the next 10-11 minutes
    const appointments = await Appointment.find({
      mode: "online",
      status: { $in: ["accepted", "in_progress"] },
      scheduledStart: {
        $gte: windowStart,
        $lt: windowEnd,
      },
    })
      .populate("patientId", "userId fullName email")
      .populate("doctorId", "userId fullName")
      .lean();

    console.log(`🔔 Found ${appointments.length} online appointments starting in 10 minutes`);

    let sent = 0;
    let skipped = 0;

    for (const appointment of appointments) {
      // Tạo unique key để track reminder
      const reminderKey = `${appointment._id.toString()}_10min`;
      
      // Check if already sent
      if (sentReminders.has(reminderKey)) {
        console.log(`⏭️  Already sent reminder for appointment ${appointment._id}`);
        skipped++;
        continue;
      }

      try {
        // Get patient email
        let patientEmail = appointment.patientId?.email;
        
        // If patient doesn't have email, get from User
        if (!patientEmail && appointment.patientId?.userId) {
          const patientUser = await User.findById(appointment.patientId.userId)
            .select("email")
            .lean();
          if (patientUser) {
            patientEmail = patientUser.email;
          }
        }

        // Skip if no email
        if (!patientEmail) {
          console.log(`⚠️  No email found for appointment ${appointment._id}`);
          skipped++;
          continue;
        }

        // Get doctor name
        let doctorName = appointment.doctorId?.fullName;
        if (!doctorName && appointment.doctorId?.userId) {
          const doctorUser = await User.findById(appointment.doctorId.userId)
            .select("fullName")
            .lean();
          if (doctorUser) {
            doctorName = doctorUser.fullName;
          }
        }
        doctorName = doctorName || "Bác sĩ";

        // Check if video call exists
        const videoCall = await VideoCall.findOne({
          appointmentId: appointment._id,
        }).lean();

        // Format appointment time
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

        const patientName = appointment.patientId?.fullName || "Bệnh nhân";

        // Create email content
        const htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 10px;">
              ⏰ Nhắc nhở: Cuộc gọi video sẽ bắt đầu trong 10 phút
            </h2>
            <p>Xin chào <strong>${patientName}</strong>,</p>
            <p>Chúng tôi xin nhắc nhở bạn rằng <strong style="color: #dc2626;">cuộc gọi video khám trực tuyến</strong> của bạn sẽ bắt đầu trong <strong style="color: #dc2626;">10 phút nữa</strong>.</p>
            
            <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #991b1b;">Thông tin cuộc gọi:</h3>
              <p style="margin: 8px 0;"><strong>Bác sĩ:</strong> BS. ${doctorName}</p>
              <p style="margin: 8px 0;"><strong>Thời gian:</strong> ${dateStr}</p>
              <p style="margin: 8px 0;"><strong>Giờ:</strong> ${timeStr}</p>
              <p style="margin: 8px 0;"><strong>Hình thức:</strong> Online (Video Call)</p>
              ${appointment.reason ? `<p style="margin: 8px 0;"><strong>Lý do khám:</strong> ${appointment.reason}</p>` : ""}
            </div>

            <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #92400e;">📋 Chuẩn bị trước khi gọi:</h3>
              <ul style="margin: 8px 0; padding-left: 20px;">
                <li>Kiểm tra kết nối internet ổn định</li>
                <li>Chuẩn bị thiết bị có camera và microphone hoạt động tốt</li>
                <li>Chọn không gian yên tĩnh, đủ ánh sáng</li>
                <li>Sẵn sàng danh sách câu hỏi và thông tin cần trao đổi với bác sĩ</li>
                <li>Đăng nhập vào hệ thống và vào trang video call 5 phút trước giờ hẹn</li>
              </ul>
            </div>

            <p style="margin-top: 20px;"><strong>Lưu ý quan trọng:</strong></p>
            <p style="color: #dc2626; font-weight: bold;">Cuộc gọi sẽ bắt đầu đúng lúc. Vui lòng chuẩn bị sẵn sàng!</p>
            
            <p style="margin-top: 30px;">Trân trọng,<br><strong>MedConnect</strong></p>
          </div>
        `;

        const textContent = `
⏰ Nhắc nhở: Cuộc gọi video sẽ bắt đầu trong 10 phút

Xin chào ${patientName},

Chúng tôi xin nhắc nhở bạn rằng cuộc gọi video khám trực tuyến của bạn sẽ bắt đầu trong 10 phút nữa.

Thông tin cuộc gọi:
- Bác sĩ: BS. ${doctorName}
- Thời gian: ${dateStr}
- Giờ: ${timeStr}
- Hình thức: Online (Video Call)
${appointment.reason ? `- Lý do khám: ${appointment.reason}` : ""}

📋 Chuẩn bị trước khi gọi:
- Kiểm tra kết nối internet ổn định
- Chuẩn bị thiết bị có camera và microphone hoạt động tốt
- Chọn không gian yên tĩnh, đủ ánh sáng
- Sẵn sàng danh sách câu hỏi và thông tin cần trao đổi với bác sĩ
- Đăng nhập vào hệ thống và vào trang video call 5 phút trước giờ hẹn

Lưu ý quan trọng: Cuộc gọi sẽ bắt đầu đúng lúc. Vui lòng chuẩn bị sẵn sàng!

Trân trọng,
MedConnect
        `;

        // Send email
        await sendMail({
          to: patientEmail,
          subject: "⏰ Nhắc nhở: Cuộc gọi video bắt đầu trong 10 phút - MedConnect",
          text: textContent,
          html: htmlContent,
        });

        console.log(`✅ Sent video call reminder email to ${patientEmail} for appointment ${appointment._id}`);
        
        // Mark as sent
        sentReminders.add(reminderKey);
        sent++;

      } catch (error) {
        console.error(`❌ Error sending reminder for appointment ${appointment._id}:`, error.message);
      }
    }

    // Clean up old reminders from set (older than 1 hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const key of sentReminders) {
      // Extract timestamp from key if exists, otherwise skip cleanup
      const parts = key.split('_');
      if (parts.length > 2) {
        const timestamp = parseInt(parts[parts.length - 1]);
        if (!isNaN(timestamp) && timestamp < oneHourAgo) {
          sentReminders.delete(key);
        }
      }
    }

    return { sent, skipped, total: appointments.length };
  } catch (error) {
    console.error("❌ Error sending video call reminders:", error);
    throw error;
  }
}

/**
 * Chạy reminder ngay lập tức (không đợi cron) - for testing
 */
export async function runReminderNow() {
  console.log("🔄 Running video call reminder immediately...");
  return await sendVideoCallReminders();
}

