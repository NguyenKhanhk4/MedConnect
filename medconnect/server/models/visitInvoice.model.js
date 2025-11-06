/* =======================================================
 * COLLECTION: VisitInvoices
 *  Hóa đơn gộp cho 1 MedicalVisit (nhiều appointments)
 *  - Liên kết: medicalVisitId
 *  - Mỗi line item map tới 1 appointment
 *  - Không thay đổi bảng Payments hiện tại của bạn
 * ======================================================= */

import mongoose from "mongoose";
const { Schema, model } = mongoose;

// --- Line item: 1 appointment trong hóa đơn gộp ---
const VisitInvoiceItemSchema = new Schema(
  {
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
      index: true,
    },
    // Thông tin hiển thị (snapshot tại thời điểm tạo bill)
    doctorId: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
    clinicId: { type: Schema.Types.ObjectId, ref: "Clinic" }, // offline có thể có clinic
    mode: { type: String, enum: ["online", "offline"], required: true },
    description: { type: String, required: true }, // ví dụ: "Khám Tim mạch - BS. A"
    quantity: { type: Number, min: 1, default: 1 },
    unitPrice: { type: Number, min: 0, required: true }, // VND
    lineTotal: { type: Number, min: 0, required: true }, // = quantity * unitPrice
  },
  { _id: false }
);

// --- Thông tin người trả tiền (bệnh nhân) ---
const VisitBillToSchema = new Schema(
  {
    patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    name: { type: String, required: true },
    email: String,
    phone: String,
  },
  { _id: false }
);

const VisitInvoiceSchema = new Schema(
  {
    medicalVisitId: {
      type: Schema.Types.ObjectId,
      ref: "MedicalVisit",
      required: true,
      index: true,
    },

    // Số hóa đơn/ mã hiển thị
    invoiceNumber: { type: String, required: true, unique: true, trim: true },

    // Thông tin người trả tiền
    billTo: { type: VisitBillToSchema, required: true },

    // Danh sách line items (mỗi item = 1 appointment)
    items: {
      type: [VisitInvoiceItemSchema],
      required: true,
      validate: (v) => Array.isArray(v) && v.length > 0,
    },

    // Tổng hợp tiền
    currency: { type: String, default: "VND" },
    issueDate: { type: Date, default: () => new Date() },
    subtotal: { type: Number, min: 0, required: true },
    discount: { type: Number, min: 0, default: 0 },
    total: { type: Number, min: 0, required: true },

    // Cổng thanh toán
    gateway: {
      type: String,
      enum: ["vnpay", "momo", "vietqr", "payos"],
      required: true,
    },
    method: { type: String, enum: ["qr", "card", "bank"], required: true },

    // Trạng thái giao dịch
    status: {
      type: String,
      enum: ["initiated", "authorized", "captured", "failed", "refunded", "voided", "cancelled"],
      default: "initiated",
      index: true,
    },

    // Provider fields (PayOS/VNPAY/MoMo...)
    orderCode: { type: Number, unique: true, sparse: true, index: true },
    providerTxnId: String,
    payUrl: String,
    ipnPayload: Schema.Types.Mixed,

    authorizedAt: Date,
    capturedAt: Date,
    refundedAt: Date,
    voidedAt: Date,
    refundAmount: { type: Number, min: 0, default: 0 },
    refundReason: String,
  },
  { timestamps: true, versionKey: false, collection: "VisitInvoices" }
);

// --- Tự tính subtotal/total, chặn trùng appointment trong cùng bill ---
VisitInvoiceSchema.pre("validate", function (next) {
  if (!Array.isArray(this.items) || this.items.length === 0) {
    this.subtotal = 0;
  } else {
    // chặn trùng appointmentId
    const ids = this.items.map((it) => String(it.appointmentId));
    const hasDup = ids.some((id, i) => ids.indexOf(id) !== i);
    if (hasDup) return next(new Error("Duplicate appointmentId in items[]"));

    // tính subtotal
    this.subtotal = this.items.reduce(
      (s, it) => s + (it.lineTotal ?? (it.quantity || 1) * (it.unitPrice || 0)),
      0
    );
  }

  if (this.discount == null) this.discount = 0;
  if (this.discount > this.subtotal) this.discount = this.subtotal;
  this.total = Math.max(0, this.subtotal - this.discount);
  if (this.refundAmount > this.total) this.refundAmount = this.total;

  next();
});

// --- Index tiện truy vấn ---
VisitInvoiceSchema.index({ medicalVisitId: 1, status: 1 });
VisitInvoiceSchema.index({ "items.appointmentId": 1 });

// --- Static helper: tạo bill gộp từ 1 MedicalVisit ---
VisitInvoiceSchema.statics.buildFromVisit = async function ({
  medicalVisitId,
  invoiceNumber,
  gateway,
  method,
  patientSnapshot, // { patientId, name, email, phone }
  descriptionBuilder, // (appt) => string mô tả, optional
}) {
  const MedicalVisit = mongoose.model("MedicalVisit");
  const Appointment = mongoose.model("Appointment");
  const DoctorRate = mongoose.model("DoctorRate");

  const visit = await MedicalVisit.findById(medicalVisitId).lean();
  if (!visit) throw new Error("MedicalVisit not found");

  // Lấy danh sách appointments thuộc visit
  const appts = await Appointment.find({ _id: { $in: visit.appointmentIds || [] } })
    .select("doctorId clinicId mode scheduledStart scheduledEnd paymentStatus")
    .lean();

  if (!appts.length) throw new Error("No appointments to bill for this visit");

  // Build line items (lấy giá từ DoctorRate hoặc từ logic của bạn)
  const items = [];
  for (const a of appts) {
    // Tìm giá theo mode/clinic
    let rateQuery = { doctorId: a.doctorId, mode: a.mode, isActive: true };
    if (a.mode === "offline" && a.clinicId) rateQuery.clinicId = a.clinicId;

    const rate = await DoctorRate.findOne(rateQuery).lean();
    const unitPrice = rate?.price ?? 0;

    items.push({
      appointmentId: a._id,
      doctorId: a.doctorId,
      clinicId: a.clinicId || undefined,
      mode: a.mode,
      description:
        typeof descriptionBuilder === "function"
          ? descriptionBuilder(a)
          : `Appointment ${a._id} (${a.mode})`,
      quantity: 1,
      unitPrice,
      lineTotal: unitPrice,
    });
  }

  return this.create({
    medicalVisitId,
    invoiceNumber,
    billTo: patientSnapshot, // { patientId, name, email, phone }
    items,
    currency: "VND",
    gateway,
    method,
    // subtotal/total sẽ được pre("validate") tự tính
  });
};

// --- Instance helper: sync trạng thái "paid" về các Appointment ---
VisitInvoiceSchema.methods.markCapturedAndSyncAppointments = async function () {
  const Appointment = mongoose.model("Appointment");

  this.status = "captured";
  this.capturedAt = new Date();
  await this.save();

  // Đồng bộ paymentStatus cho từng appointment (không dùng paymentId vì bill gộp)
  const apptIds = this.items.map((it) => it.appointmentId);
  await Appointment.updateMany(
    { _id: { $in: apptIds } },
    { $set: { paymentStatus: "paid" } }
  );

  return this;
};

export default model("VisitInvoice", VisitInvoiceSchema);
