/* =======================================================
 * COLLECTION: Users
 *  Tài khoản người dùng
 * ======================================================= */

import mongoose from "mongoose";
const { Schema, model } = mongoose;

const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    firebaseUID: { type: String, unique: true, sparse: true, trim: true },
    passwordHash: {
      type: String,
      select: false,
      required: function () {
        return this.authProvider === "local";
      },
    },
    role: {
      type: String,
      enum: ["patient", "doctor", "admin", "manager"],
      default: "patient",
    },
    status: {
      type: String,
      enum: ["active", "blocked", "pending", "rejected", "banned", "suspended"],
      default: "active",
    },
    fullName: { type: String, trim: true },
    phone: { type: String, unique: true, sparse: true, trim: true },
    authProvider: {
      type: String,
      enum: ["local", "google", "phone"],
      default: "local",
    },
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false, collection: "Users" }
);

// Virtual populate for doctor profile
UserSchema.virtual("doctorProfile", {
  ref: "Doctor",
  localField: "_id",
  foreignField: "userId",
  justOne: true,
});

export default model("User", UserSchema);
