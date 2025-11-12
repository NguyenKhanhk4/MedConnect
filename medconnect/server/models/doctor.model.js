/* =======================================================
 * COLLECTION: Doctors
 *  Thông tin bác sĩ
 * ======================================================= */

import mongoose from "mongoose";
const { Schema, model } = mongoose;

const DoctorSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    fullName: { type: String, required: true, trim: true },
    licenseNo: { type: String }, // Store license image file path/URL
    yearsExperience: { type: Number, min: 0, default: 0 },
    bio: { type: String, trim: true },
    avatarUrl: { type: String },
    educationLevel: {
      type: String,
      enum: ["Bác sĩ", "Thạc sĩ", "Tiến sĩ", "Phó Giáo Sư", "Giáo Sư"],
      trim: true,
    }, // Trình độ học vấn

    // Chuyên khoa
    specializationIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Specialization",
      },
    ],

    // Phòng khám
    clinicDefaultId: {
      type: Schema.Types.ObjectId,
      ref: "Clinic",
    },

    // Đánh giá
    ratingAvg: { type: Number, min: 0, max: 5, default: 0 },
    ratingCount: { type: Number, min: 0, default: 0 },

    // Trạng thái
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },

    // Thông tin phê duyệt/từ chối
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    rejectedBy: { type: Schema.Types.ObjectId, ref: "User" },
    rejectedAt: { type: Date },
    rejectionReason: { type: String, trim: true },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "Doctors",
  }
);

// Indexes
DoctorSchema.index({ specializationIds: 1 });
DoctorSchema.index({ isVerified: 1, isActive: 1 });
DoctorSchema.index({ ratingAvg: -1, ratingCount: -1 });

export default model("Doctor", DoctorSchema);
