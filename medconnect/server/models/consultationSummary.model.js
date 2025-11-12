/* =======================================================
 * COLLECTION: Consultation_summaries
 * Hồ sơ khám bệnh (EHR) - dành cho khám trực tiếp tại cơ sở
 * ======================================================= */

import mongoose from "mongoose";
const { Schema, model } = mongoose;

const ConsultationSummarySchema = new Schema(
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

    // 🩺 Hình thức khám luôn là "offline"
    visitType: { type: String, enum: ["offline"], default: "offline" },

    reasonForVisit: String, // Lý do khám
    visitDate: { type: Date, default: Date.now },
    treatmentResult: {
      type: String,
      enum: ["recovered", "improved", "unchanged"],
      default: "improved",
    },

    // 💬 Chẩn đoán
    diagnoses: [
      {
        name: String,
      },
    ],

    // ❤️ Chỉ số cơ bản (vitals)
    vitals: {
      height: Number,
      weight: Number,
      bloodPressure: String,
      heartRate: Number,
      temperature: Number,
    },

    // 🧪 Xét nghiệm / cận lâm sàng
    labResults: [
      {
        testName: String,
        result: String,
        performedAt: Date,
      },
    ],

    // 🩻 Hình ảnh chẩn đoán
    imagingResults: [
      {
        type: { type: String, default: '' }, // "X-ray", "Ultrasound", ...
        conclusion: { type: String, default: '' },
        imageUrl: { type: String, default: '' },
        performedAt: { type: Date, default: Date.now },
      },
    ],

    // 💊 Đơn thuốc
    medications: [
      {
        name: String,
        instruction: String,
        quantity: String,
        notes: String, // Ghi chú về thuốc
      },
    ],

    // 📋 Tóm tắt và hướng dẫn
    summaryText: String,
    treatmentMethod: String,
    nextAppointmentDate: Date,
    followUpInstructions: String,

    // 👨‍⚕️ Thông tin bác sĩ
    createdBy: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },

    // ⚙️ Trạng thái hồ sơ
    status: { type: String, enum: ["draft", "final"], default: "final" },
  },
  { timestamps: true, versionKey: false, collection: "Consultation_summaries" }
);

// 🔍 Index giúp truy vấn nhanh
ConsultationSummarySchema.index({ patientId: 1, visitDate: -1 });
ConsultationSummarySchema.index({ doctorId: 1, visitDate: -1 });

export default model("ConsultationSummary", ConsultationSummarySchema);
