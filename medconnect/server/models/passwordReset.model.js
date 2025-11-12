/* =======================================================
 * COLLECTION: Password_Resets
 * OTP/Reset codes
 * ======================================================= */

import mongoose from "mongoose";
const { Schema, model } = mongoose;

const PasswordResetSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    email: { type: String, required: true },
    codeHash: { type: String, required: true },
    otp: { type: String, required: true }, // Store the actual OTP for verification
    type: { type: String, enum: ["reset", "verify"], required: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
    attempts: { type: Number, default: 0 }, // Track failed attempts
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "Password_Resets" }
);

PasswordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default model("PasswordReset", PasswordResetSchema);
