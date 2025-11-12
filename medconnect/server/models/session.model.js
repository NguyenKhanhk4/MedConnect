/* =======================================================
 * COLLECTION: Sessions
 *  Phiên đăng nhập (Refresh token)
 * ======================================================= */

import mongoose from "mongoose";
const { Schema, model } = mongoose;

const SessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    refreshTokenHash: { type: String, required: true },
    ip: String,
    userAgent: String,
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true }, // TTL
    revoked: { type: Boolean, default: false },
  },
  { collection: "Sessions" }
);

SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default model("Session", SessionSchema);
