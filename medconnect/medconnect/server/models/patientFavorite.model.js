/* =======================================================
 * COLLECTION: PatientFavorites
 * Danh sách bác sĩ ưa thích của bệnh nhân
 * ======================================================= */

import mongoose from "mongoose";
const { Schema, model } = mongoose;

const PatientFavoriteSchema = new Schema(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    // Thêm thời gian favorite để có thể sắp xếp
    favoritedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true, versionKey: false, collection: "PatientFavorites" }
);

// Composite unique index: một patient không thể favorite cùng một doctor hai lần
PatientFavoriteSchema.index({ patientId: 1, doctorId: 1 }, { unique: true });

// Index để query nhanh
PatientFavoriteSchema.index({ patientId: 1, favoritedAt: -1 });

export default model("PatientFavorite", PatientFavoriteSchema);
