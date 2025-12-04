/* =======================================================
 * COLLECTION: payments
 *  Hóa đơn/Thanh toán
 * ======================================================= */

import mongoose from "mongoose";
const { Schema, model } = mongoose;

// Hàm validate số nguyên
const isInt = (v) => Number.isInteger(v);

/**
 * Schema cho các mục trong hóa đơn (invoice items)
 * Mỗi item đại diện cho một dịch vụ/sản phẩm được thanh toán
 */
const InvoiceItemSchema = new Schema(
  {
    description: { type: String, required: true }, // Mô tả dịch vụ/sản phẩm
    quantity: { type: Number, required: true, min: 1, default: 1 }, // Số lượng
    unitPrice: { type: Number, required: true, min: 0, validate: isInt }, // Đơn giá (VND)
    lineTotal: { type: Number, required: true, min: 0, validate: isInt }, // Tổng tiền dòng (VND)
  },
  { _id: false }
);

/**
 * Schema thông tin người nhận hóa đơn (bệnh nhân)
 */
const BillToSchema = new Schema(
  {
    patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true }, // ID bệnh nhân
    name: { type: String, required: true }, // Tên bệnh nhân
    email: String, // Email (dùng để gửi hóa đơn)
    phone: String, // Số điện thoại
  },
  { _id: false }
);

/**
 * Schema thông tin người xuất hóa đơn (bác sĩ/phòng khám)
 */
const BillFromSchema = new Schema(
  {
    doctorId: { type: Schema.Types.ObjectId, ref: "Doctor", required: true }, // ID bác sĩ
    clinicId: { type: Schema.Types.ObjectId, ref: "Clinic" }, // ID phòng khám (optional)
    doctorName: { type: String, required: true }, // Tên bác sĩ
    clinicName: String, // Tên phòng khám
  },
  { _id: false }
);

/**
 * Payment Schema - Schema chính cho thanh toán
 * 
 * HỆ THỐNG HỖ TRỢ 3 LOẠI PAYMENT FLOW:
 * 1. Single Appointment (backward compatible): appointmentId
 * 2. Multiple Appointments (medical visit): medicalVisitId + appointmentIds
 * 3. Pre-Payment Flow (NEW): appointmentData (tạo appointments SAU KHI thanh toán thành công)
 */
const PaymentSchema = new Schema(
  {
    /* ============================================
     * LIÊN KẾT VỚI APPOINTMENTS
     * ============================================ */
    
    // Flow 1: Single appointment (flow cũ, backward compatible)
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
      required: false, // Không required - validation trong pre('validate') hook
      // Bỏ unique để cho phép nhiều payment cho 1 appointment (booking + service)
    },

    // Flow 2: Multiple appointments (cho medical visit - appointments đã tồn tại)
    medicalVisitId: {
      type: Schema.Types.ObjectId,
      ref: "MedicalVisit",
      required: false,
      index: true,
    },

    // Mảng các appointment IDs cho multiple appointments payment
    appointmentIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Appointment",
      },
    ],

    // Flow 3: Pre-payment (NEW) - Lưu appointment data TRƯỚC KHI tạo trong DB
    // Data này sẽ được dùng để tạo appointments SAU KHI thanh toán thành công
    appointmentData: [
      {
        doctorId: {
          type: Schema.Types.ObjectId,
          ref: "Doctor",
          required: true,
        },
        slotId: {
          type: Schema.Types.ObjectId,
          ref: "DoctorTimeSlot",
          required: true,
        },
        mode: { type: String, enum: ["online", "offline"], required: true }, // Hình thức khám
        clinicId: { type: Schema.Types.ObjectId, ref: "Clinic" }, // Optional cho offline
        scheduledStart: { type: Date, required: true }, // Thời gian bắt đầu
        scheduledEnd: { type: Date, required: true }, // Thời gian kết thúc
        reason: { type: String, default: "" }, // Lý do khám
        patientId: { type: Schema.Types.ObjectId, ref: "Patient" }, // Optional: cho booking người thân
      },
    ],

    /* ============================================
     * THÔNG TIN HÓA ĐƠN
     * ============================================ */

    // Loại hóa đơn
    invoiceType: {
      type: String,
      enum: ["booking", "service"], // booking: phí đặt lịch, service: phí dịch vụ khám
      required: true,
      default: "booking",
    },

    invoiceNumber: { type: String, required: true, unique: true, trim: true }, // Mã hóa đơn
    currency: { type: String, default: "VND" }, // Đơn vị tiền tệ
    issueDate: { type: Date, default: () => new Date() }, // Ngày xuất hóa đơn

    billTo: { type: BillToSchema, required: true }, // Thông tin người nhận hóa đơn
    billFrom: { type: BillFromSchema, required: true }, // Thông tin người xuất hóa đơn
    items: {
      type: [InvoiceItemSchema], // Các mục trong hóa đơn
      required: true,
      validate: (v) => v.length > 0, // Phải có ít nhất 1 item
    },

    subtotal: { type: Number, required: true, min: 0, validate: isInt }, // Tổng tiền trước giảm giá
    discount: { type: Number, min: 0, default: 0, validate: isInt }, // Số tiền giảm giá
    total: { type: Number, required: true, min: 0, validate: isInt }, // Tổng tiền sau giảm giá

    /* ============================================
     * THÔNG TIN THANH TOÁN
     * ============================================ */

    // Cổng thanh toán
    gateway: {
      type: String,
      enum: ["vnpay", "momo", "vietqr", "payos", "cash"],
      required: false, // Không required khi pending_manager (chưa chọn phương thức)
    },
    
    // Phương thức thanh toán
    method: {
      type: String,
      enum: ["qr", "card", "bank", "cash"],
      required: false, // Không required khi pending_manager
    },

    // Trạng thái thanh toán
    status: {
      type: String,
      enum: [
        "pending_manager", // Chờ manager xử lý (dùng cho service payment)
        "initiated",       // Đã tạo link PayOS, chờ khách thanh toán
        "authorized",      // Đã ủy quyền (chưa capture tiền)
        "captured",        // Đã thanh toán thành công (tiền đã được capture)
        "failed",          // Thanh toán thất bại
        "refunded",        // Đã hoàn tiền
        "voided",          // Đã hủy authorization
        "cancelled",       // Đã hủy
      ],
      default: "pending_manager",
    },

    // Số tiền đã thanh toán (cho phép thanh toán một phần)
    amountPaid: {
      type: Number,
      min: 0,
      default: 0,
      validate: isInt,
    },

    /* ============================================
     * THÔNG TIN PAYOS
     * ============================================ */

    // orderCode chính thức (sau khi thanh toán thành công)
    // Dùng để tracking và webhook lookup
    orderCode: { type: Number, unique: true, sparse: true, index: true },

    // orderCode tạm thời (khi tạo payment link, chưa thanh toán)
    // Sẽ được clear sau khi thanh toán thành công
    pendingOrderCode: { type: Number, sparse: true, index: true },

    /* ============================================
     * METADATA VÀ TIMESTAMPS
     * ============================================ */

    providerTxnId: String, // Transaction ID từ payment gateway
    authorizedAt: Date, // Thời điểm authorize
    authorizationExpiresAt: Date, // Thời điểm hết hạn authorization
    capturedAt: Date, // Thời điểm capture tiền
    paidAt: Date, // Thời điểm thanh toán
    voidedAt: Date, // Thời điểm void
    voidReason: String, // Lý do void

    bankCode: String, // Mã ngân hàng
    payUrl: String, // URL thanh toán từ PayOS
    ipnPayload: Schema.Types.Mixed, // Raw webhook payload từ payment gateway

    // Thông tin hoàn tiền
    refundAmount: { type: Number, min: 0, default: 0, validate: isInt },
    refundedAt: Date,
    refundReason: String,
  },
  { timestamps: true, versionKey: false, collection: "Payments" }
);

/* ============================================
 * INDEXES - Tối ưu hóa query
 * ============================================ */

// Index compound để query nhanh theo appointmentId và invoiceType
// Không unique vì 1 appointment có thể có nhiều payment (booking + service)
PaymentSchema.index({ appointmentId: 1, invoiceType: 1 }, { unique: false });

// Index compound cho medical visit
PaymentSchema.index({ medicalVisitId: 1, invoiceType: 1 }, { unique: false });

/* ============================================
 * VALIDATION HOOK
 * ============================================ */

/**
 * Pre-validate hook: Kiểm tra và tính toán trước khi save
 * 
 * LOGIC VALIDATION:
 * Payment PHẢI có một trong 3 trường hợp sau:
 * 1. appointmentId (single appointment - flow cũ)
 * 2. medicalVisitId + appointmentIds (multiple appointments - đã tạo)
 * 3. appointmentData (pre-payment - chưa tạo, sẽ tạo sau khi thanh toán)
 * 
 * ƯU TIÊN: appointmentData > appointmentId > medicalVisitId
 */
PaymentSchema.pre("validate", function (next) {
  // 1. Kiểm tra Pre-Payment Flow (ưu tiên cao nhất)
  // Pre-payment flow = có appointmentData nhưng chưa có appointmentId/medicalVisitId
  const hasPrePaymentData =
    this.appointmentData &&
    Array.isArray(this.appointmentData) &&
    this.appointmentData.length > 0;

  // 2. Kiểm tra Single Appointment Flow (flow cũ, backward compatible)
  // Chỉ check nếu KHÔNG phải pre-payment flow
  const hasSingleAppointment =
    !hasPrePaymentData &&
    this.appointmentId !== undefined &&
    this.appointmentId !== null;

  // 3. Kiểm tra Multiple Appointments Flow (medical visit)
  // Chỉ check nếu KHÔNG phải pre-payment flow
  const hasMultipleAppointments =
    !hasPrePaymentData &&
    this.medicalVisitId &&
    Array.isArray(this.appointmentIds) &&
    this.appointmentIds.length > 0;

  // Log để debug
  console.log("🔍 Payment validation check:", {
    hasSingleAppointment,
    hasMultipleAppointments,
    hasPrePaymentData,
    appointmentId: this.appointmentId?.toString(),
    appointmentIdExists:
      this.appointmentId !== undefined && this.appointmentId !== null,
    medicalVisitId: this.medicalVisitId?.toString(),
    appointmentIdsLength: this.appointmentIds?.length || 0,
    appointmentDataLength: this.appointmentData?.length || 0,
  });

  // Xử lý Pre-Payment Flow
  if (hasPrePaymentData) {
    console.log("✅ Pre-payment flow detected - validation passed");
    
    // Clear các trường không cần thiết để tránh conflict
    // Vì pre-payment flow không cần appointmentId/medicalVisitId (sẽ set sau khi thanh toán)
    if (this.appointmentId !== undefined) {
      delete this.appointmentId;
      this.unmarkModified("appointmentId");
    }
    if (this.medicalVisitId !== undefined) {
      delete this.medicalVisitId;
      this.unmarkModified("medicalVisitId");
    }
    if (this.appointmentIds !== undefined) {
      this.appointmentIds = undefined;
      this.unmarkModified("appointmentIds");
    }
    // Pre-payment flow hợp lệ - skip sang bước tính toán
  } else {
    // Xử lý các flow khác (single hoặc multiple appointments)
    
    // Validate: Phải có ít nhất 1 trong 2 flow
    if (!hasSingleAppointment && !hasMultipleAppointments) {
      const error = new Error(
        "Payment must have either appointmentId (single) OR medicalVisitId + appointmentIds (multiple) OR appointmentData (pre-payment)"
      );
      return next(error);
    }

    // Validate: Nếu có medicalVisitId thì PHẢI có appointmentIds
    if (
      this.medicalVisitId &&
      (!Array.isArray(this.appointmentIds) || this.appointmentIds.length === 0)
    ) {
      const error = new Error(
        "If medicalVisitId is provided, appointmentIds must be a non-empty array"
      );
      return next(error);
    }

    console.log(
      "✅ Payment validation passed (single or multiple appointments)"
    );
  }

  /* ============================================
   * TỰ ĐỘNG TÍNH TOÁN CÁC GIÁ TRỊ
   * ============================================ */

  // Tính subtotal từ items
  if (this.items?.length) {
    this.subtotal = this.items.reduce(
      (s, it) => s + (it.lineTotal ?? it.quantity * it.unitPrice),
      0
    );
  } else {
    this.subtotal = 0;
  }
  
  // Tính discount và total
  if (this.discount == null) this.discount = 0;
  if (this.discount > this.subtotal) this.discount = this.subtotal; // Discount không được lớn hơn subtotal
  this.total = Math.max(0, this.subtotal - this.discount); // Total = subtotal - discount
  
  // Validate refund amount
  if (this.refundAmount > this.total) this.refundAmount = this.total; // Refund không được lớn hơn total
  
  next();
});

export default model("Payment", PaymentSchema);
