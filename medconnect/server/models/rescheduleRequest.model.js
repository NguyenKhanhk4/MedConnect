/* =======================================================
 * COLLECTION: RescheduleRequests
 *  Yêu cầu dời lịch hẹn
 * ======================================================= */

import mongoose from "mongoose";
const { Schema, model } = mongoose;

/**
 * RescheduleRequest: Yêu cầu dời lịch hẹn từ bệnh nhân hoặc bác sĩ
 * - Bệnh nhân có thể yêu cầu dời lịch trước 24h
 * - Bác sĩ có thể chấp nhận hoặc từ chối
 * - Khi chấp nhận, tạo appointment mới và cập nhật appointment cũ
 */
const RescheduleRequestSchema = new Schema(
  {
    originalAppointmentId: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    newDateTime: {
      type: Date,
      required: true,
    },
    mode: {
      type: String,
      enum: ["online", "offline"],
      required: true,
    },
    clinicId: {
      type: Schema.Types.ObjectId,
      ref: "Clinic",
      required: function () {
        return this.mode === "offline";
      },
    },
    reason: {
      type: String,
      required: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewNotes: {
      type: String,
      maxlength: 500,
      default: null,
    },
    // Metadata for notifications
    metadata: {
      patientName: String,
      doctorName: String,
      originalDateTime: Date,
      clinicName: String,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "RescheduleRequests",
  }
);

// Indexes for performance
RescheduleRequestSchema.index({ originalAppointmentId: 1 });
RescheduleRequestSchema.index({ requestedBy: 1 });
RescheduleRequestSchema.index({ status: 1 });
RescheduleRequestSchema.index({ createdAt: -1 });

// Virtual for formatted date
RescheduleRequestSchema.virtual("formattedNewDateTime").get(function () {
  return this.newDateTime.toLocaleString("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
});

RescheduleRequestSchema.virtual("formattedOriginalDateTime").get(function () {
  return this.metadata?.originalDateTime?.toLocaleString("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
});

// Ensure virtual fields are serialized
RescheduleRequestSchema.set("toJSON", { virtuals: true });
RescheduleRequestSchema.set("toObject", { virtuals: true });

// Pre-save middleware to populate metadata
RescheduleRequestSchema.pre("save", async function (next) {
  if (this.isNew && !this.metadata) {
    try {
      const Appointment = mongoose.model("Appointment");
      const appointment = await Appointment.findById(this.originalAppointmentId)
        .populate("patientId", "fullName")
        .populate("doctorId", "fullName")
        .populate("clinicId", "name")
        .lean();

      if (appointment) {
        this.metadata = {
          patientName: appointment.patientId?.fullName || "Bệnh nhân",
          doctorName: appointment.doctorId?.fullName || "Bác sĩ",
          originalDateTime: appointment.scheduledStart,
          clinicName: appointment.clinicId?.name || null,
        };
      }
    } catch (error) {
      console.error("Error populating reschedule request metadata:", error);
    }
  }
  next();
});

// Static method to check if reschedule is allowed
RescheduleRequestSchema.statics.canReschedule = function (appointmentDateTime) {
  const appointmentTime = new Date(appointmentDateTime);
  const now = new Date();
  const hoursUntilAppointment = (appointmentTime - now) / (1000 * 60 * 60);

  // Allow reschedule if more than 24 hours before appointment
  return hoursUntilAppointment > 24;
};

// Instance method to check if request is expired
RescheduleRequestSchema.methods.isExpired = function () {
  const now = new Date();
  const hoursSinceRequest = (now - this.createdAt) / (1000 * 60 * 60);

  // Request expires after 48 hours if not reviewed
  return this.status === "pending" && hoursSinceRequest > 48;
};

export default model("RescheduleRequest", RescheduleRequestSchema);
