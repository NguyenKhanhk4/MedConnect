/* =======================================================
 * COLLECTION: Patients
 * Hồ sơ bệnh nhân (cho phòng khám / bệnh viện tư)
 * ======================================================= */

import mongoose from "mongoose";
const { Schema, model } = mongoose;

const PatientSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    // 🧍‍♂️ Thông tin cá nhân cơ bản
    fullName: { type: String, required: true, trim: true },
    dob: Date,
    gender: { type: String, enum: ["male", "female", "other"] },
    ethnicity: String,
    occupation: String,
    citizenId: String, // CCCD / định danh cá nhân (không bắt buộc)

    // 📞 Liên hệ & địa chỉ
    phone: String,
    email: String,
    address: String,
    houseNumber: String,

    // 👨‍👩‍👧 Người đại diện / chăm sóc (dành cho bệnh nhân không tự đăng ký)
    representativeName: String,
    representativeCitizenId: String,
    representativeRelation: String,
    representativePhone: String,

    // 🧬 Tiền sử y tế
    bloodType: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"],
      default: "Unknown",
    },

    // Dị ứng, bệnh lý, tiêm chủng
    allergyNotes: { type: String, trim: true, default: "", maxlength: 500 },

    // Cho phép nhập hoặc chọn nhiều bệnh mạn tính
    medicalHistory: [{ type: String, trim: true }],

    // Bảo hiểm y tế
    healthInsurance: String, // Số thẻ BHYT
    healthInsuranceIssueDate: Date, // Ngày cấp BHYT
    healthInsuranceExpiryDate: Date, // Ngày hết hạn BHYT

    // ⚙️ Quản trị & liên thông (tối giản)
    relationshipToOwner: {
      type: String,
      enum: [
        "self",
        "father",
        "mother",
        "spouse",
        "child",
        "grandparent",
        "other",
      ],
      default: "self",
    },

    // Dự phòng cho tích hợp định danh điện tử / API VNeID
    vneidId: String,

    // Ảnh hồ sơ
    avatarUrl: String,

    // Ghi chú nội bộ (dành cho bác sĩ hoặc hệ thống)
    notes: String,

    // Tự động đánh dấu nếu hồ sơ đã đủ thông tin tối thiểu
    isProfileComplete: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false, collection: "Patients" }
);

// 🗂️ Index tối ưu tìm kiếm
PatientSchema.index({ userId: 1, fullName: 1 });
PatientSchema.index({ provinceCode: 1, districtCode: 1, wardCode: 1 });

export default model("Patient", PatientSchema);

// Thanh sua
