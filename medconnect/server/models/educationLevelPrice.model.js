/* =======================================================
 * COLLECTION: EducationLevelPrices
 * PURPOSE: Bảng giá theo trình độ học vấn
 * ======================================================= */

import mongoose from "mongoose";
const { Schema, model } = mongoose;

const EducationLevelPriceSchema = new Schema(
  {
    educationLevel: {
      type: String,
      enum: ["Bác sĩ", "Thạc sĩ", "Tiến sĩ", "Phó Giáo Sư", "Giáo Sư"],
      required: true,
      // Note: unique constraint is on (educationLevel, mode) compound index below
      // This allows one record per educationLevel for each mode (online/offline)
    },
    mode: {
      type: String,
      enum: ["online", "offline"],
      required: true,
    },
    weekdayPrice: { type: Number, min: 0, required: true }, // Giá Thứ 2-6
    weekendPrice: { type: Number, min: 0, required: true }, // Giá Thứ 7-CN
    currency: { type: String, default: "VND" },
    isActive: { type: Boolean, default: true },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    collection: "EducationLevelPrices",
    timestamps: true,
    versionKey: false,
  }
);

// Unique index for (educationLevel, mode)
EducationLevelPriceSchema.index(
  { educationLevel: 1, mode: 1 },
  { unique: true }
);

export default model("EducationLevelPrice", EducationLevelPriceSchema);
