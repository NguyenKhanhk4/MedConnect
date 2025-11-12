/* =======================================================
 * UPDATE: Appointment – thêm services, totalPay, amountPaid
 * ======================================================= */

import mongoose from "mongoose";
const { Schema, model } = mongoose;

// Item dịch vụ (snapshot tại thời điểm bác sĩ chọn)
const AppointmentServiceItemSchema = new Schema(
  {
    serviceId: { type: Schema.Types.ObjectId, ref: "ServicePrice", required: true, index: true },
    serviceName: { type: String, required: true, trim: true }, // snapshot
    unitPrice: { // VND (integer), snapshot
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'unitPrice must be an integer'
      },
    },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    lineTotal: { // unitPrice * quantity
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'lineTotal must be an integer'
      },
    },
  },
  { _id: false }
);

const AppointmentSchema = new Schema(
  {
    // (giữ các field cũ)
    visitId: { type: Schema.Types.ObjectId, ref: "MedicalVisit", default: null },
    patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
    slotId: { type: Schema.Types.ObjectId, ref: "DoctorTimeSlot", required: true },

    mode: { type: String, enum: ["online", "offline"], required: true },
    clinicId: {
      type: Schema.Types.ObjectId,
      ref: "Clinic",
      required: function () { return this.mode === "offline"; },
    },

    scheduledStart: { type: Date, required: true },
    scheduledEnd: { type: Date, required: true },

    status: {
      type: String,
      enum: [
        "pending_doctor",
        "accepted",
        "rejected",
        "in_progress",
        "cancelled",
        "done",
        "no_show",
        "rescheduled",
      ],
      default: "pending_doctor",
    },

    reason: String,
    cancelledAt: Date,
    cancelledBy: { type: Schema.Types.ObjectId, ref: "User" },
    cancelReason: String,

    // Reschedule
    rescheduledFromId: { type: Schema.Types.ObjectId, ref: "Appointment" },
    rescheduledToId: { type: Schema.Types.ObjectId, ref: "Appointment" },
    rescheduleReason: String,
    rescheduledBy: { type: Schema.Types.ObjectId, ref: "User" },
    rescheduledAt: Date,

    acceptedBy: { type: Schema.Types.ObjectId, ref: "Doctor" },
    rejectedBy: { type: Schema.Types.ObjectId, ref: "Doctor" },
    rejectReason: String,

    // ====== NEW: Dịch vụ & thanh toán chi tiết ======
    services: {
      type: [AppointmentServiceItemSchema],
      default: [],
    },

    // Tổng tiền phải trả cho danh sách services (VND)
    totalPay: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'totalPay must be an integer'
      },
    },

    // Tổng tiền đã thanh toán (VND)
    amountPaid: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'amountPaid must be an integer'
      },
    },

    // Giữ nguyên các trường Payment hiện có
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: "Payment",
      unique: true,
      sparse: true,
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "refunded"],
      default: "unpaid",
    },
    paymentDeadline: { type: Date },

    pendingOrderCode: { type: Number, sparse: true, index: true },
  },
  { timestamps: true, versionKey: false, collection: "Appointments" }
);

// Validate thời gian
AppointmentSchema.pre("validate", function (next) {
  if (this.scheduledStart && this.scheduledEnd && this.scheduledStart >= this.scheduledEnd) {
    this.invalidate("scheduledEnd", "scheduledEnd must be after scheduledStart");
  }
  if (this.isNew && this.scheduledStart && this.scheduledStart < new Date()) {
    this.invalidate("scheduledStart", "scheduledStart must be in the future");
  }
  next();
});

// Tự tính lineTotal và totalPay trước khi save
AppointmentSchema.pre("save", function (next) {
  // Đảm bảo services là array
  if (!Array.isArray(this.services)) {
    this.services = [];
  }

  // Đảm bảo totalPay và amountPaid có giá trị mặc định
  if (this.totalPay === undefined || this.totalPay === null) {
    this.totalPay = 0;
  }
  if (this.amountPaid === undefined || this.amountPaid === null) {
    this.amountPaid = 0;
  }

  // Đảm bảo là số nguyên
  this.totalPay = Math.round(this.totalPay);
  this.amountPaid = Math.round(this.amountPaid);

  // Tính toán totalPay từ services
  if (Array.isArray(this.services) && this.services.length > 0) {
    let sum = 0;
    this.services.forEach((it) => {
      const qty = Math.max(1, it.quantity || 1);
      it.quantity = qty;
      const unitPrice = Math.round(it.unitPrice || 0);
      it.unitPrice = unitPrice;
      it.lineTotal = Math.round(unitPrice * qty);
      sum += it.lineTotal;
    });
    this.totalPay = Math.round(sum);
  } else {
    // Nếu không có services, đảm bảo totalPay = 0
    this.totalPay = 0;
  }

  // Không cho amountPaid vượt quá totalPay (tránh lỗi nhập liệu)
  if (this.amountPaid > this.totalPay) {
    this.invalidate("amountPaid", "amountPaid cannot exceed totalPay");
  }

  // Đồng bộ paymentStatus cơ bản
  if (this.totalPay === 0) {
    // Không có dịch vụ, coi như unpaid nhưng không yêu cầu thanh toán
    if (this.amountPaid !== 0) this.amountPaid = 0;
    this.paymentStatus = this.paymentStatus || "unpaid";
  } else {
    this.paymentStatus = (this.amountPaid >= this.totalPay) ? "paid" : "unpaid";
  }

  next();
});

// Virtual: còn thiếu bao nhiêu
AppointmentSchema.virtual("balance").get(function () {
  return Math.max(0, (this.totalPay || 0) - (this.amountPaid || 0));
});

AppointmentSchema.virtual("paidInFull").get(function () {
  return (this.totalPay || 0) > 0 && (this.amountPaid || 0) >= (this.totalPay || 0);
});

// Index hay dùng (giữ nguyên + bổ sung)
AppointmentSchema.index({ doctorId: 1, scheduledStart: 1 });
AppointmentSchema.index({ patientId: 1, scheduledStart: 1 });
AppointmentSchema.index({ status: 1, scheduledStart: 1 });
AppointmentSchema.index({ mode: 1, scheduledStart: 1 });
AppointmentSchema.index({ clinicId: 1, scheduledStart: 1 });
AppointmentSchema.index({ paymentStatus: 1, paymentDeadline: 1 });
AppointmentSchema.index({ visitId: 1, scheduledStart: 1 });
// KHÓA SLOT 1-1
AppointmentSchema.index(
  { slotId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ["pending_doctor", "accepted", "in_progress", "done"] },
    },
  }
);

export default model("Appointment", AppointmentSchema);
