/* =======================================================
 * COLLECTION: payments
 *  Hóa đơn/Thanh toán
 * ======================================================= */


import mongoose from "mongoose";
const { Schema, model } = mongoose;

const isInt = (v) => Number.isInteger(v);

const InvoiceItemSchema = new Schema(
  {
    description: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    unitPrice: { type: Number, required: true, min: 0, validate: isInt }, // VND
    lineTotal: { type: Number, required: true, min: 0, validate: isInt }, // VND
  },
  { _id: false }
);

const BillToSchema = new Schema(
  {
    patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    name: { type: String, required: true },
    email: String,
    phone: String,
  },
  { _id: false }
);

const BillFromSchema = new Schema(
  {
    doctorId: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
    clinicId: { type: Schema.Types.ObjectId, ref: "Clinic" },
    doctorName: { type: String, required: true },
    clinicName: String,
  },
  { _id: false }
);

const PaymentSchema = new Schema(
  {
    // Single appointment (backward compatible)
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
      required: false, // Explicitly set to false - không required
      // Validation sẽ được thực hiện trong pre('validate') hook
      // Bỏ unique để cho phép nhiều payment cho 1 appointment (booking + service)
    },

    // Multiple appointments (NEW - for medical visit)
    medicalVisitId: {
      type: Schema.Types.ObjectId,
      ref: "MedicalVisit",
      required: false,
      index: true,
    },

    // Array of appointment IDs for multiple appointments payment
    appointmentIds: [{
      type: Schema.Types.ObjectId,
      ref: "Appointment",
    }],

    // Appointment data (before creating appointments in DB) - for medical visit payment
    // This stores the appointment information that will be created after payment success
    appointmentData: [{
      doctorId: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
      slotId: { type: Schema.Types.ObjectId, ref: "DoctorTimeSlot", required: true },
      mode: { type: String, enum: ["online", "offline"], required: true },
      clinicId: { type: Schema.Types.ObjectId, ref: "Clinic" },
      scheduledStart: { type: Date, required: true },
      scheduledEnd: { type: Date, required: true },
      reason: { type: String, default: "" },
    }],

    invoiceType: {
      type: String,
      enum: ["booking", "service"],
      required: true,
      default: "booking",
    },

    invoiceNumber: { type: String, required: true, unique: true, trim: true },
    currency: { type: String, default: "VND" },
    issueDate: { type: Date, default: () => new Date() },

    billTo: { type: BillToSchema, required: true },
    billFrom: { type: BillFromSchema, required: true },
    items: {
      type: [InvoiceItemSchema],
      required: true,
      validate: (v) => v.length > 0,
    },

    subtotal: { type: Number, required: true, min: 0, validate: isInt },
    discount: { type: Number, min: 0, default: 0, validate: isInt },
    total: { type: Number, required: true, min: 0, validate: isInt },

    gateway: {
      type: String,
      enum: ["vnpay", "momo", "vietqr", "payos", "cash"],
      required: false, // Không required khi pending_manager
    },
    method: { 
      type: String, 
      enum: ["qr", "card", "bank", "cash"], 
      required: false, // Không required khi pending_manager
    },

    status: {
      type: String,
      enum: [
        "pending_manager", // Chờ manager xử lý 
        "initiated", // Đã tạo link PayOS, chờ thanh toán
        "authorized",
        "captured",
        "failed",
        "refunded",
        "voided",
        "cancelled",
      ],
      default: "pending_manager",
    },

    // Số tiền đã thanh toán (cho thanh toán một phần)
    amountPaid: { 
      type: Number, 
      min: 0, 
      default: 0, 
      validate: isInt 
    },

    // PayOS orderCode để tracking và webhook lookup
    orderCode: { type: Number, unique: true, sparse: true, index: true },
    
    // Lưu tạm orderCode khi tạo payment link (chưa thanh toán) - cho service payment
    pendingOrderCode: { type: Number, sparse: true, index: true },
    
    providerTxnId: String,
    authorizedAt: Date,
    authorizationExpiresAt: Date,
    capturedAt: Date,
    paidAt: Date,
    voidedAt: Date,
    voidReason: String,

    bankCode: String,
    payUrl: String,
    ipnPayload: Schema.Types.Mixed,

    refundAmount: { type: Number, min: 0, default: 0, validate: isInt },
    refundedAt: Date,
    refundReason: String,
  },
  { timestamps: true, versionKey: false, collection: "Payments" }
);

// Index để query nhanh
//  index cho phép nhiều payment cho 1 appointment (booking + service)
PaymentSchema.index({ appointmentId: 1, invoiceType: 1 }, { unique: false });
PaymentSchema.index({ medicalVisitId: 1, invoiceType: 1 }, { unique: false });

// Validation: either appointmentId (single) OR (medicalVisitId + appointmentIds) (multiple) OR appointmentData (pre-payment)
// IMPORTANT: This hook runs BEFORE Mongoose's built-in required validation
PaymentSchema.pre("validate", function (next) {
  // Validate: must have either:
  // 1. appointmentId (single appointment - backward compatible)
  // 2. medicalVisitId + appointmentIds (multiple appointments - existing visits)
  // 3. appointmentData (pre-payment - appointments will be created after payment)
  
  // Check if appointmentData array exists and has items (pre-payment flow - highest priority)
  // This is the primary indicator for pre-payment flow
  const hasPrePaymentData = this.appointmentData && 
    Array.isArray(this.appointmentData) && 
    this.appointmentData.length > 0;
  
  // Check if appointmentId is set (single appointment - backward compatible)
  // Only check if NOT in pre-payment flow
  const hasSingleAppointment = !hasPrePaymentData && 
    this.appointmentId !== undefined && 
    this.appointmentId !== null;
  
  // Check if medicalVisitId exists and appointmentIds array is populated (multiple appointments)
  // Only check if NOT in pre-payment flow
  const hasMultipleAppointments = !hasPrePaymentData && 
    this.medicalVisitId && 
    Array.isArray(this.appointmentIds) && 
    this.appointmentIds.length > 0;

  // Log để debug
  console.log("🔍 Payment validation check:", {
    hasSingleAppointment,
    hasMultipleAppointments,
    hasPrePaymentData,
    appointmentId: this.appointmentId?.toString(),
    appointmentIdExists: this.appointmentId !== undefined && this.appointmentId !== null,
    medicalVisitId: this.medicalVisitId?.toString(),
    appointmentIdsLength: this.appointmentIds?.length || 0,
    appointmentDataLength: this.appointmentData?.length || 0,
  });

  // If appointmentData is present (pre-payment flow), this is valid - skip other validations
  if (hasPrePaymentData) {
    console.log("✅ Pre-payment flow detected - validation passed");
    // For pre-payment flow, explicitly clear appointmentId, medicalVisitId, and appointmentIds
    // to avoid any validation conflicts
    if (this.appointmentId !== undefined) {
      delete this.appointmentId;
      this.unmarkModified('appointmentId');
    }
    if (this.medicalVisitId !== undefined) {
      delete this.medicalVisitId;
      this.unmarkModified('medicalVisitId');
    }
    if (this.appointmentIds !== undefined) {
      this.appointmentIds = undefined;
      this.unmarkModified('appointmentIds');
    }
    // Skip to calculation step - pre-payment flow is valid
    // Don't check appointmentId or medicalVisitId in this case
  } else {
    // Validate other flows (single appointment or multiple appointments)
    // Validate that at least one of the required fields is present
    if (!hasSingleAppointment && !hasMultipleAppointments) {
      // If none of the required fields are present, this is invalid
      const error = new Error("Payment must have either appointmentId (single) OR medicalVisitId + appointmentIds (multiple) OR appointmentData (pre-payment)");
      return next(error);
    }

    // If medicalVisitId is provided without appointmentIds, it's invalid
    if (this.medicalVisitId && (!Array.isArray(this.appointmentIds) || this.appointmentIds.length === 0)) {
      const error = new Error("If medicalVisitId is provided, appointmentIds must be a non-empty array");
      return next(error);
    }
    
    // Validation passed - at least one valid combination is present
    console.log("✅ Payment validation passed (single or multiple appointments)");
  }

  // Calculate subtotal from items
  if (this.items?.length) {
    this.subtotal = this.items.reduce(
      (s, it) => s + (it.lineTotal ?? it.quantity * it.unitPrice),
      0
    );
  } else {
    this.subtotal = 0;
  }
  if (this.discount == null) this.discount = 0;
  if (this.discount > this.subtotal) this.discount = this.subtotal;
  this.total = Math.max(0, this.subtotal - this.discount);
  if (this.refundAmount > this.total) this.refundAmount = this.total;
  next();
});

export default model("Payment", PaymentSchema);
