/* =======================================================
 * COLLECTION: MedicalVisits
 *  Phiên khám trong ngày (gom nhiều appointments)
 *  Hỗ trợ duyệt của bác sĩ, không auto-refund.
 * ======================================================= */

import mongoose from "mongoose";
const { Schema, model } = mongoose;

const MedicalVisitSchema = new Schema(
  {
    // 🧍‍♀️ Bệnh nhân và ngày khám
    patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    visitDate: { type: String, required: true }, // "YYYY-MM-DD" (UTC+7)

    // 📋 Danh sách các lịch hẹn trong phiên
    appointmentIds: [{ type: Schema.Types.ObjectId, ref: "Appointment" }],

    // 🩺 Trạng thái tổng thể của phiên khám
    status: {
      type: String,
      enum: [
        "planning", // Bệnh nhân đang chọn chuyên khoa/bác sĩ
        "pending_doctor", // Đã gửi yêu cầu, chờ bác sĩ duyệt các lịch hẹn
        "scheduled", // Tất cả bác sĩ đã duyệt, phiên khám được xác nhận
        "in_progress", // Ít nhất 1 lịch hẹn đang diễn ra
        "completed", // Tất cả lịch hẹn trong phiên đã hoàn tất
        "partial_rejected", // Một số lịch bị bác sĩ từ chối
        "cancelled", // Hủy toàn bộ phiên
        "refunded", // Hoàn tiền thủ công (nếu có)
      ],
      default: "planning",
    },

    // 💰 Tổng phí (tổng hợp từ các lịch hẹn)
    totalFee: { type: Number, default: 0, min: 0 },

    // 💵 Trạng thái thanh toán (ở cấp phiên, không auto-refund)
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "refunded", "partial_paid"],
      default: "unpaid",
    },
    paidAt: { type: Date },
    refundReason: { type: String },

    // 📅 Tùy chọn thuật toán xếp lịch / buffer giữa các chuyên khoa
    preferences: {
      sameClinic: { type: Boolean, default: true },
      bufferMinutes: { type: Number, default: 10 },
    },

    // 🧠 Ghi chú / metadata phục vụ thống kê
    notes: { type: String, trim: true, default: "" },

    // ⚙️ Theo dõi hệ thống (người tạo, cập nhật)
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, versionKey: false, collection: "MedicalVisits" }
);

//
// 🔍 Index thường dùng
//
MedicalVisitSchema.index({ patientId: 1, visitDate: 1 });
MedicalVisitSchema.index({ status: 1 });
MedicalVisitSchema.index({ paymentStatus: 1 });

// Nếu muốn giới hạn mỗi bệnh nhân chỉ 1 phiên mỗi ngày:
// MedicalVisitSchema.index({ patientId: 1, visitDate: 1 }, { unique: true });

//
// 🧮 Middleware tự tính tổng phí từ các appointments (nếu có populate)
//
MedicalVisitSchema.methods.recalculateTotalFee = async function () {
  if (!this.appointmentIds?.length) return this.totalFee;
  const Appointment = mongoose.model("Appointment");
  const appts = await Appointment.find({
    _id: { $in: this.appointmentIds },
  }).select("paymentStatus");

  // Tổng phí có thể lấy từ DoctorRate hoặc Appointment.totalFee (tùy cấu trúc bạn đang có)
  const fee = appts.reduce((sum, a) => sum + (a.totalFee || 0), 0);
  this.totalFee = fee;
  return this.totalFee;
};

export default model("MedicalVisit", MedicalVisitSchema);
