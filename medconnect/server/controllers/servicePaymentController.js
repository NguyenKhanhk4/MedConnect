/* ============================================================================
 * SERVICE PAYMENT CONTROLLER
 * ============================================================================
 * 
 * Controller này xử lý THANH TOÁN DỊCH VỤ (Service Payment)
 * Dành cho các dịch vụ bổ sung trong quá trình khám (xét nghiệm, thuốc, v.v.)
 * 
 * KHÁC BIỆT VỚI BOOKING PAYMENT:
 * - Booking Payment: Phí đặt lịch (trả TRƯỚC khi khám)
 * - Service Payment: Phí dịch vụ khám (trả SAU khi bác sĩ chỉ định dịch vụ)
 * 
 * ĐẶC ĐIỂM SERVICE PAYMENT:
 * - CHỈ dành cho offline appointments
 * - Appointment phải ở trạng thái "in_progress" hoặc "done"
 * - Bác sĩ chọn services trong quá trình khám
 * - Payment được tạo với status = "pending_manager"
 * - Manager xử lý: Chọn thanh toán tiền mặt HOẶC chuyển khoản
 * ============================================================================ */

import Appointment from "../models/appointment.model.js";
import Payment from "../models/payment.model.js";
import ServicePrice from "../models/servicePrice.model.js";
import Patient from "../models/patient.model.js";
import Doctor from "../models/doctor.model.js";
import User from "../models/user.model.js";
import { ok, fail } from "../utils/response.js";
import { ERROR_CODES } from "../constants/index.js";

/* ============================================================================
 * FUNCTION: createServicePayment
 * ============================================================================
 * Tạo yêu cầu thanh toán dịch vụ cho appointment offline
 * 
 * Endpoint: POST /api/doctors/me/appointments/:appointmentId/service-payment
 * Auth: Required (Doctor role)
 * 
 * Params:
 * - appointmentId: string (MongoDB ObjectId)
 * 
 * Request Body:
 * - serviceIds: string[] (Array of ServicePrice IDs)
 * - amount: number (tổng tiền, phải khớp với tổng giá services)
 * 
 * Response:
 * - payment: object (Payment record)
 * - message: string
 * 
 * LUỒNG XỬ LÝ:
 * 1. Validate doctor ownership (appointment phải thuộc bác sĩ này)
 * 2. Validate appointment status (phải "in_progress" hoặc "done")
 * 3. Validate appointment mode (phải "offline")
 * 4. Kiểm tra chưa có service payment (tránh duplicate)
 * 5. Lấy services từ DB và tính tổng tiền
 * 6. Validate amount khớp với calculated total
 * 7. Tạo Payment record với status = "pending_manager"
 * 8. Gửi notification cho manager
 * 9. Return payment info
 * 
 * SAU ĐÓ:
 * Manager sẽ xử lý payment request:
 * - Option 1: Thanh toán tiền mặt (processCashPayment)
 * - Option 2: Thanh toán chuyển khoản (createBankTransferPayment)
 * ============================================================================ */
export async function createServicePayment(req, res) {
  try {
    /* ------------------------------------
     * BƯỚC 1: PARSE REQUEST
     * ------------------------------------ */
    
    const { appointmentId } = req.params;
    const { serviceIds, amount } = req.body;
    const userId = req.user?.app_user_id || req.user?.uid;

    if (!userId) {
      return fail(res, 401, ERROR_CODES.UNAUTHORIZED, "User ID not found");
    }

    /* ------------------------------------
     * BƯỚC 2: VALIDATE INPUT
     * ------------------------------------ */
    
    if (!appointmentId) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Appointment ID is required"
      );
    }

    // Services phải là array không rỗng
    if (!serviceIds || !Array.isArray(serviceIds) || serviceIds.length === 0) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "At least one service must be selected"
      );
    }

    // Amount phải là số nguyên dương
    if (!amount || amount <= 0 || !Number.isInteger(Number(amount))) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Amount must be a positive integer"
      );
    }

    // Find user and doctor
    const user = await User.findById(userId);
    if (!user) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "User not found");
    }

    const doctor = await Doctor.findOne({ userId: user._id });
    if (!doctor) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Doctor profile not found");
    }

    // Find appointment
    const appointment = await Appointment.findById(appointmentId)
      .populate("patientId")
      .populate("doctorId")
      .populate("clinicId");

    if (!appointment) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Appointment not found");
    }

    // Validate appointment belongs to this doctor
    const appointmentDoctorId = appointment.doctorId._id 
      ? appointment.doctorId._id.toString() 
      : appointment.doctorId.toString();
    
    if (appointmentDoctorId !== doctor._id.toString()) {
      return fail(
        res,
        403,
        ERROR_CODES.FORBIDDEN,
        "Appointment does not belong to this doctor"
      );
    }

    // Validate appointment status and mode
    // Cho phép tạo hóa đơn khi status là "in_progress" (sau khi lưu hồ sơ) hoặc "done"
    if (appointment.status !== "in_progress" && appointment.status !== "done") {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Appointment must be in progress or completed before creating service invoice"
      );
    }

    if (appointment.mode !== "offline") {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Service invoice is only available for offline appointments"
      );
    }

    // Check if service payment already exists (chưa thanh toán hoặc đã thanh toán)
    const existingServicePayment = await Payment.findOne({
      appointmentId: appointment._id,
      invoiceType: "service",
      status: { $in: ["captured", "authorized", "pending_manager", "initiated"] },
    });

    if (existingServicePayment) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Yêu cầu thanh toán dịch vụ đã tồn tại cho cuộc hẹn này"
      );
    }

    // Get selected services
    const services = await ServicePrice.find({
      _id: { $in: serviceIds },
      isActive: true,
    }).lean();

    if (services.length !== serviceIds.length) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "One or more services not found or inactive"
      );
    }

    // Calculate total from services
    const calculatedTotal = services.reduce(
      (sum, service) => sum + service.price,
      0
    );

    // Validate amount matches calculated total
    if (parseInt(amount) !== calculatedTotal) {
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        `Amount mismatch. Expected ${calculatedTotal}, got ${amount}`
      );
    }

    // Get patient info
    let patient;
    if (appointment.patientId._id) {
      patient = await Patient.findById(appointment.patientId._id).populate(
        "userId"
      );
    } else {
      patient = await Patient.findById(appointment.patientId).populate(
        "userId"
      );
    }

    if (!patient) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Patient not found");
    }

    // Create payment record (initiated status, will be updated to captured after payment)
    const orderCode = Number(String(Date.now()).slice(-10));
    const invoiceNumber = `INV-SERVICE-${orderCode}`;

    // Create invoice items from services
    const items = services.map((service) => ({
      description: service.serviceName,
      quantity: 1,
      unitPrice: service.price,
      lineTotal: service.price,
    }));

    const payment = new Payment({
      appointmentId: appointment._id,
      invoiceType: "service",
      invoiceNumber,
      currency: "VND",
      issueDate: new Date(),
      billTo: {
        patientId: patient._id,
        name: patient.fullName || patient.userId?.fullName || "Unknown",
        email: patient.userId?.email,
        phone: patient.userId?.phoneNumber || patient.phone,
      },
      billFrom: {
        doctorId: doctor._id,
        clinicId: appointment.clinicId?._id || null,
        doctorName: doctor.fullName || "Unknown Doctor",
        clinicName: appointment.clinicId?.name || "Clinic",
      },
      items,
      subtotal: calculatedTotal,
      discount: 0,
      total: calculatedTotal,
      // Không set gateway và method khi pending_manager
      // gateway và method sẽ được set khi manager xử lý
      status: "pending_manager", // Chờ manager xử lý
      amountPaid: 0,
    });

    // Save payment with error handling for duplicate key
    // MongoDB có thể có unique index cũ trên appointmentId
    try {
      await payment.save();
    } catch (saveError) {
      // If duplicate key error, check if there's an existing payment
      if (saveError.code === 11000) {
        console.error("❌ Duplicate key error when saving payment:", saveError);
        
        // Check if there's an existing service payment for this appointment
        const existingServicePayment = await Payment.findOne({
          appointmentId: appointment._id,
          invoiceType: "service",
        });
        
        if (existingServicePayment) {
          // If existing payment is failed/cancelled/voided, delete and retry
          if (["failed", "cancelled", "voided"].includes(existingServicePayment.status)) {
            await Payment.findByIdAndDelete(existingServicePayment._id);
            console.log("✅ Deleted existing failed/cancelled/voided service payment, retrying...");
            
            // Retry saving
            await payment.save();
          } else if (existingServicePayment.status === "captured") {
            // Already paid - return error
            return fail(
              res,
              400,
              ERROR_CODES.INVALID_INPUT,
              "Yêu cầu thanh toán dịch vụ đã tồn tại và đã được thanh toán cho cuộc hẹn này"
            );
          } else {
            // Other status (pending_manager, initiated, etc.) - return error
            return fail(
              res,
              400,
              ERROR_CODES.INVALID_INPUT,
              "Yêu cầu thanh toán dịch vụ đã tồn tại cho cuộc hẹn này"
            );
          }
        } else {
          // Could be booking payment or index issue
          // Check if there's a booking payment
          const existingBookingPayment = await Payment.findOne({
            appointmentId: appointment._id,
            invoiceType: "booking",
          });
          
          if (existingBookingPayment) {
            // Booking payment exists - this is OK, but index might be unique
            // Try to delete any failed/cancelled service payment that might exist
            const failedServicePayment = await Payment.findOne({
              appointmentId: appointment._id,
              invoiceType: "service",
              status: { $in: ["failed", "cancelled", "voided"] },
            });
            
            if (failedServicePayment) {
              await Payment.findByIdAndDelete(failedServicePayment._id);
              console.log("✅ Deleted failed service payment, retrying...");
              await payment.save();
            } else {
              // Index issue - need to drop old unique index
              console.error("❌ Duplicate key error but no existing service payment found. May need to drop old unique index on appointmentId.");
              console.error("💡 Please run in MongoDB: db.Payments.dropIndex('appointmentId_1')");
              throw new Error(
                "Duplicate key error. Please contact administrator to fix database index. " +
                "Or if there's an existing payment, please delete it first."
              );
            }
          } else {
            // No payment found - index issue
            console.error("❌ Duplicate key error but no existing payment found. Index issue.");
            console.error("💡 Please run in MongoDB: db.Payments.dropIndex('appointmentId_1')");
            throw new Error(
              "Duplicate key error. Database index issue. Please contact administrator."
            );
          }
        }
      } else {
        throw saveError;
      }
    }

    // Tạo notification cho manager khi có yêu cầu thanh toán mới
    try {
      const { createServicePaymentRequestNotification } = await import(
        "../services/notificationService.js"
      );
      await createServicePaymentRequestNotification(payment._id);
      console.log(
        `✅ Service payment request notification created for managers`
      );
    } catch (notificationError) {
      console.error(
        "❌ Error creating service payment request notification:",
        notificationError
      );
      // Không throw error - payment đã được tạo thành công
    }

    // Không tạo PayOS link nữa - chỉ tạo payment record và chờ manager xử lý
    // Manager sẽ tạo PayOS link hoặc xử lý thanh toán tiền mặt
    return ok(res, {
      payment: {
        _id: payment._id,
        invoiceNumber: payment.invoiceNumber,
        total: payment.total,
        items: payment.items,
        status: payment.status,
      },
      message: "Yêu cầu thanh toán đã được gửi đến manager",
    });
  } catch (error) {
    console.error("❌ Error creating service payment:", error);
    console.error("❌ Error stack:", error.stack);
    return fail(
      res,
      500,
      ERROR_CODES.SERVER_ERROR,
      `Internal server error: ${error.message || String(error)}`
    );
  }
}

/**
 * Get service payment status for an appointment
 * GET /api/doctors/me/appointments/:appointmentId/service-payment
 */
export async function getServicePaymentStatus(req, res) {
  try {
    const { appointmentId } = req.params;
    const userId = req.user?.app_user_id || req.user?.uid;

    if (!userId) {
      return fail(res, 401, ERROR_CODES.UNAUTHORIZED, "User ID not found");
    }

    // Find user and doctor
    const user = await User.findById(userId);
    if (!user) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "User not found");
    }

    const doctor = await Doctor.findOne({ userId: user._id });
    if (!doctor) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Doctor profile not found");
    }

    // Find appointment
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Appointment not found");
    }

    // Validate appointment belongs to this doctor
    if (appointment.doctorId.toString() !== doctor._id.toString()) {
      return fail(
        res,
        403,
        ERROR_CODES.FORBIDDEN,
        "Appointment does not belong to this doctor"
      );
    }

    // Find service payment
    const servicePayment = await Payment.findOne({
      appointmentId: appointment._id,
      invoiceType: "service",
    })
      .populate("billTo.patientId")
      .lean();

    if (!servicePayment) {
      return ok(res, {
        hasServicePayment: false,
        servicePayment: null,
      });
    }

    return ok(res, {
      hasServicePayment: true,
      servicePayment: {
        _id: servicePayment._id,
        invoiceNumber: servicePayment.invoiceNumber,
        total: servicePayment.total,
        status: servicePayment.status,
        items: servicePayment.items,
        paidAt: servicePayment.paidAt,
        createdAt: servicePayment.createdAt,
      },
    });
  } catch (error) {
    console.error("Error getting service payment status:", error);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, "Internal server error");
  }
}
