/* =======================================================
 * COLLECTION: Clinics
 *  Phòng khám/địa điểm
 * ======================================================= */

import mongoose from "mongoose";
const { Schema, model } = mongoose;

const ClinicSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["hospital", "clinic", "center"],
      default: "hospital",
    },
    location: { type: String, trim: true }, // Tên địa điểm (ví dụ: "Quận 1", "Hải Châu")
    address: String,
    latitude: Number,
    longitude: Number,
    phone: String,
    specialties: [{ type: String, trim: true }],
    doctorCount: { type: Number, default: 0 },
    rating: { type: Number, default: 4.0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    description: { type: String, trim: true },
    image: { type: String, trim: true },
    geo: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [lng, lat]
        validate: {
          validator: (v) =>
            !v ||
            (Array.isArray(v) &&
              v.length === 2 &&
              v.every((n) => typeof n === "number")),
          message: "geo.coordinates must be [lng, lat]",
        },
      },
    },
  },
  { timestamps: true, versionKey: false, collection: "Clinics" }
);

// 2dsphere index cho GeoJSON
ClinicSchema.index({ geo: "2dsphere" });

export default model("Clinic", ClinicSchema);
