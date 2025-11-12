/* =======================================================
 * COLLECTION: Auth_providers
 *  Liên kết đăng nhập
 * ======================================================= */


import mongoose from "mongoose";
const { Schema, model } = mongoose;

const AuthProviderSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    provider: { type: String, enum: ["google", "local", "phone"], required: true },
    providerUid: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    verified: { type: Boolean, default: false },
    linkedAt: { type: Date, default: Date.now },
  },
  { timestamps: false, versionKey: false, collection: "Auth_providers" }
);

AuthProviderSchema.index({ provider: 1, providerUid: 1 }, { unique: true });
AuthProviderSchema.index({ userId: 1, provider: 1 }, { unique: true });

export default model("AuthProvider", AuthProviderSchema);

