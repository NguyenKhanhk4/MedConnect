/**
 * Service để tự động hủy appointments chưa thanh toán
 * Sử dụng cron job để chạy định kỳ
 */

import cron from "node-cron";
import cancelUnpaidAppointments from "../scripts/cancelUnpaidAppointments.js";

let cronJob = null;

/**
 * Khởi động cron job để tự động hủy appointments chưa thanh toán
 * Chạy mỗi 5 phút
 */
export function startAppointmentCleanupJob() {
  if (cronJob) {
    console.log("⚠️  Appointment cleanup job is already running");
    return;
  }

  // Chạy mỗi 5 phút
  cronJob = cron.schedule("*/5 * * * *", async () => {
    console.log("\n⏰ [Cron] Running appointment cleanup job...");
    try {
      const result = await cancelUnpaidAppointments();
      console.log(`✅ [Cron] Cleanup completed: ${result.cancelled} cancelled, ${result.slotsReleased} slots released\n`);
    } catch (error) {
      console.error("❌ [Cron] Cleanup job failed:", error);
    }
  });

  console.log("✅ Appointment cleanup cron job started (runs every 5 minutes)");
}

/**
 * Dừng cron job
 */
export function stopAppointmentCleanupJob() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    console.log("⏹️  Appointment cleanup job stopped");
  }
}

/**
 * Chạy cleanup ngay lập tức (không đợi cron)
 */
export async function runCleanupNow() {
  console.log("🔄 Running cleanup immediately...");
  return await cancelUnpaidAppointments();
}

