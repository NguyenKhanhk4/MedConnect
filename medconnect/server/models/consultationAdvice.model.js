/* =======================================================
 * COLLECTION: Consultation_advices
 * Buổi tư vấn (Online) - có thể kèm chẩn đoán & thuốc
 * ======================================================= */

import mongoose from "mongoose";
const { Schema, model } = mongoose;

const ConsultationAdviceSchema = new Schema(
  {
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
      unique: true,
      required: true,
    },
    patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
    clinicId: { type: Schema.Types.ObjectId, ref: "Clinic" },

    // 🧭 Hình thức buổi tư vấn (thường là online)
    mode: { type: String, enum: ["online"], default: "online" },


    // 📅 Ngày giờ slot khám
    appointmentDate: { type: Date, required: true },

    // 💊 Cho phép kê thuốc (tùy chọn)
    medications: [
      {
        name: String,
        instruction: String,
        quantity: String,
      },
    ],

    // 💬 Cho phép thêm chẩn đoán tham khảo
    diagnoses: [
      {
        name: String,
      },
    ],

    // 📎 File đính kèm (PDF, ảnh hướng dẫn)
    attachmentUrl: String,
    notes: String,

    // 💊 Phương pháp điều trị (có thể từ AI gợi ý)
    treatmentMethod: String,

    // 🤖 Đánh dấu nếu có sử dụng gợi ý từ AI
    aiSuggested: { type: Boolean, default: false },

    // 👨‍⚕️ Bác sĩ phụ trách
    createdBy: { type: Schema.Types.ObjectId, ref: "Doctor" },
  },
  { timestamps: true, versionKey: false, collection: "Consultation_advices" }
);

// 🔍 Index phục vụ thống kê
ConsultationAdviceSchema.index({ patientId: 1, startedAt: -1 });
ConsultationAdviceSchema.index({ doctorId: 1, startedAt: -1 });

export default model("ConsultationAdvice", ConsultationAdviceSchema);
