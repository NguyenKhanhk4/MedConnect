/* =======================================================
 * COLLECTION: Leave_Requests
 * Yêu cầu nghỉ phép của bác sĩ
 * ======================================================= */

import mongoose from "mongoose";
const { Schema, model } = mongoose;

const LeaveRequestSchema = new Schema(
  {
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true,
    },
    slotId: {
      type: Schema.Types.ObjectId,
      ref: "DoctorTimeSlot",
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    // Người phê duyệt/từ chối
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "Leave_Requests",
  }
);

// Index để tìm nhanh các request pending
LeaveRequestSchema.index({ status: 1, createdAt: -1 });
LeaveRequestSchema.index({ doctorId: 1, status: 1 });

const LeaveRequest = model("LeaveRequest", LeaveRequestSchema);

export default LeaveRequest;
