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
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
      // Bỏ unique để cho phép nhiều payment cho 1 appointment (booking + service)
    },

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
PaymentSchema.index({ pendingOrderCode: 1 });

PaymentSchema.pre("validate", function (next) {
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
