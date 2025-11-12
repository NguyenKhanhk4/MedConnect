/* =======================================================
 * COLLECTION: Doctor_time_slots
 *  Slot làm việc cụ thể
 * ======================================================= */

import mongoose from "mongoose";
const { Schema, model } = mongoose;

const DoctorTimeSlotSchema = new Schema(
  {
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true,
    },

    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date, required: true },

    status: {
      type: String,
      enum: ["available", "booked", "blocked"],
      default: "available",
      index: true,
    },

    // Lý do nghỉ (chỉ khi status = "blocked")
    leaveReason: {
      type: String,
      default: "",
    },

    // chống double-book khi đặt
    version: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false, collection: "Doctor_time_slots" }
);

DoctorTimeSlotSchema.pre("validate", function (next) {
  if (this.startAt >= this.endAt) {
    this.invalidate("endAt", "endAt must be after startAt");
  }
  next();
});

DoctorTimeSlotSchema.index(
  { doctorId: 1, startAt: 1, endAt: 1 },
  { unique: true }
);

export default model("DoctorTimeSlot", DoctorTimeSlotSchema);
