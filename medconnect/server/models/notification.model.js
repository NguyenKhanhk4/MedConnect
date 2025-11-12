/* =======================================================
 * COLLECTION: Notifications
 *  Thông báo người dùng
 * ======================================================= */

import mongoose from "mongoose";
const { Schema, model } = mongoose;

const NotificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: [
        "appointment",
        "payment",
        "system",
        "message",
        "video",
        "leave_request",
        "reschedule_request",
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    relatedId: { type: Schema.Types.ObjectId }, // ID của appointment, payment, etc.
    relatedType: { type: String }, // appointment, payment, etc.
    metadata: { type: Schema.Types.Mixed }, // Additional data
  },
  { timestamps: true, collection: "Notifications" }
);

export default model("Notification", NotificationSchema);
