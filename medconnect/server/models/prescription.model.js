/* =======================================================
 * COLLECTION: Prescriptions
 *  Toa thuốc
 * ======================================================= */

import mongoose from "mongoose";
const { Schema, model } = mongoose;

const PrescriptionItemSchema = new Schema(
  {
    drugName: { type: String, required: true },
    dosage: { type: String, required: true },
    frequency: String,
    durationDays: Number,
    instructions: String,
  },
  { _id: false }
);

const PrescriptionSchema = new Schema(
  {
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
      unique: true,
      required: true,
    },
    diagnosis: String,
    note: String,
    createdBy: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
    items: [PrescriptionItemSchema],
  },
  { timestamps: true, collection: "Prescriptions" }
);

export default model("Prescription", PrescriptionSchema);
