/* ============================================================================
 * PAYOS CONTROLLER - Controller layer cho PayOS integration
 * ============================================================================
 * 
 * File này chứa các HTTP request handlers cho PayOS endpoints
 * Các handlers này gọi đến service layer (payos.service.js) để xử lý logic
 * 
 * ENDPOINTS:
 * 1. POST /api/payments/payos/create-payment - Tạo link thanh toán
 * 2. POST /api/payments/payos/webhook - Nhận webhook từ PayOS
 * 3. GET /api/payments/payos/check-status/:orderCode - Kiểm tra trạng thái
 * 4. POST /api/payments/payos/cancel/:orderCode - Hủy link thanh toán
 * ============================================================================ */

import {
  createPayosPaymentLink,
  handlePayosWebhook,
  checkPaymentStatus,
  cancelPaymentLink,
} from "../services/payos.service.js";

/* ============================================================================
 * CONTROLLER: createPayosPaymentLinkController
 * ============================================================================
 * Tạo link thanh toán PayOS
 * 
 * Endpoint: POST /api/payments/payos/create-payment
 * Auth: Required (authGuard middleware)
 * 
 * Request Body:
 * - appointmentId: string (MongoDB ObjectId)
 * - amount: number (số tiền VND)
 * - description: string (mô tả thanh toán, max 25 chars)
 * 
 * Response:
 * - success: boolean
 * - data: { payUrl: string, orderCode: number }
 * - message: string
 * 
 * LƯU Ý: Controller này CHỈ validate cơ bản, logic chính ở service layer
 * ============================================================================ */
export const createPayosPaymentLinkController = async (req, res) => {
  try {
    // Parse request body
    const { appointmentId, amount, description } = req.body;
    
    /* ------------------------------------
     * VALIDATE INPUT
     * ------------------------------------ */
    
    if (!appointmentId) {
      return res.status(400).json({
        success: false,
        message: "Appointment ID không được trống",
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Số tiền không hợp lệ",
      });
    }

    /* ------------------------------------
     * AUTHENTICATE USER
     * ------------------------------------ */
    
    // req.user được set từ authGuard middleware (decoded JWT token)
    // Token có thể chứa:
    // - uid: Firebase UID
    // - app_user_id: MongoDB User ID
    const userId = req.user?.app_user_id || req.user?.uid;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - User ID not found",
      });
    }

    /* ------------------------------------
     * CALL SERVICE LAYER
     * ------------------------------------ */
    
    // Gọi service function để tạo PayOS link
    const paymentResult = await createPayosPaymentLink(userId, {
      appointmentId,
      amount,
      description,
    });

    /* ------------------------------------
     * RETURN RESPONSE
     * ------------------------------------ */
    
    return res.status(200).json({
      success: true,
      data: {
        payUrl: paymentResult.payUrl,      // URL để redirect user đến PayOS
        orderCode: paymentResult.orderCode, // Mã đơn hàng
      },
      message: "Tạo link thanh toán PayOS thành công",
    });
  } catch (err) {
    // Log error và return error response
    console.error("❌ Error creating PayOS payment link:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Internal error",
    });
  }
};

/* ============================================================================
 * CONTROLLER: handlePayosWebhookController
 * ============================================================================
 * Xử lý webhook từ PayOS (server-to-server callback)
 * 
 * Endpoint: POST /api/payments/payos/webhook
 * Auth: KHÔNG cần (PayOS server gọi trực tiếp)
 * 
 * Request Body: Webhook payload từ PayOS (signature được verify trong service)
 * 
 * Response: LUÔN trả 200 OK để PayOS không retry
 * 
 * QUAN TRỌNG:
 * - Webhook có thể được gọi NHIỀU LẦN (retry mechanism của PayOS)
 * - Service layer phải đảm bảo IDEMPOTENCY
 * - LUÔN trả 200 để PayOS không retry liên tục
 * - Nếu có lỗi, log và return 200 với success=false
 * ============================================================================ */
export const handlePayosWebhookController = async (req, res) => {
  try {
    // Gọi service layer để xử lý webhook
    // Service sẽ verify signature, update payment, tạo appointments, gửi email, v.v.
    const result = await handlePayosWebhook(req.body);
    
    /* ------------------------------------
     * LUÔN TRẢ 200 OK
     * ------------------------------------ */
    
    // Trả 200 để PayOS biết webhook đã được nhận và không retry
    return res.status(200).json({
      success: true,
      data: result || {},
      message: "Xử lý webhook PayOS thành công",
    });
  } catch (error) {
    // Log error chi tiết
    console.error("❌ Lỗi xử lý webhook PayOS:", error.message);
    
    /* ------------------------------------
     * VẪN TRẢ 200 NGAY CẢ KHI CÓ LỖI
     * ------------------------------------ */
    
    // Vẫn trả 200 để ngăn PayOS retry (tùy chiến lược)
    // Nếu muốn PayOS retry → trả 4xx hoặc 5xx
    return res.status(200).json({
      success: false,
      message: "Đã nhận webhook nhưng có lỗi nội bộ",
      error: error.message,
    });
  }
};

/* ============================================================================
 * CONTROLLER: checkPaymentStatusController
 * ============================================================================
 * Kiểm tra trạng thái thanh toán từ PayOS
 * 
 * Endpoint: GET /api/payments/payos/check-status/:orderCode
 * Auth: Required (authGuard middleware)
 * 
 * Params:
 * - orderCode: number (mã đơn hàng PayOS)
 * 
 * Response:
 * - success: boolean
 * - data: PaymentInfo object từ PayOS
 * - message: string
 * 
 * FALLBACK MECHANISM (QUAN TRỌNG):
 * -----------------------------------
 * Endpoint này có chức năng kép:
 * 1. Kiểm tra trạng thái thanh toán từ PayOS API
 * 2. FALLBACK cho webhook (nếu webhook không chạy được)
 * 
 * Trong development (localhost), webhook không thể nhận được vì:
 * - PayOS không thể gọi đến localhost
 * - Cần public URL hoặc ngrok
 * 
 * Giải pháp: Frontend poll endpoint này sau khi thanh toán
 * - Nếu phát hiện thanh toán thành công (status === "PAID")
 * - Tự động gọi handlePayosWebhook() để xử lý như webhook thật
 * - Đảm bảo payment được xử lý ngay cả khi không có webhook
 * 
 * LƯU Ý: Production nên dùng webhook chính thức (nhanh hơn, realtime hơn)
 * ============================================================================ */
export const checkPaymentStatusController = async (req, res) => {
  try {
    // Lấy orderCode từ URL params
    const { orderCode } = req.params;
    
    if (!orderCode) {
      return res.status(400).json({
        success: false,
        message: "Order code không được trống",
      });
    }

    // 1. Check với PayOS
    const paymentInfo = await checkPaymentStatus(Number(orderCode));
    
    console.log(`📋 PayOS paymentInfo for ${orderCode}:`, JSON.stringify(paymentInfo, null, 2));
    
    // 2. Nếu thanh toán thành công, tự động xử lý (fallback cho webhook)
    if (paymentInfo && (paymentInfo.status === "PAID" || paymentInfo.status === "paid")) {
      try {
        // Xác định loại payment từ database để có description đúng
        const Payment = (await import("../models/payment.model.js")).default;
        const Appointment = (await import("../models/appointment.model.js")).default;
        
        // Tìm payment bằng orderCode hoặc pendingOrderCode
        let paymentRecord = await Payment.findOne({
          $or: [
            { orderCode: Number(orderCode) },
            { pendingOrderCode: Number(orderCode) }
          ]
        });
        
        // Nếu không tìm thấy payment, tìm appointment
        let isServicePayment = false;
        let description = paymentInfo.description || `MedConnect ${orderCode}`;
        
        if (paymentRecord) {
          // Tìm thấy payment - kiểm tra invoiceType
          isServicePayment = paymentRecord.invoiceType === "service";
          if (isServicePayment) {
            description = `MC Service ${String(orderCode).slice(-7)}`;
          } else {
            description = `MedConnect ${String(orderCode).slice(-8)}`;
          }
          console.log(`📋 Payment record found:`, {
            paymentId: paymentRecord._id?.toString(),
            invoiceType: paymentRecord.invoiceType,
            isServicePayment,
            description
          });
        } else {
          // Tìm appointment bằng pendingOrderCode
          const appointment = await Appointment.findOne({
            pendingOrderCode: Number(orderCode)
          });
          
          if (appointment) {
            // Booking payment
            isServicePayment = false;
            description = `MedConnect ${String(orderCode).slice(-8)}`;
            console.log(`📋 Appointment found for booking payment:`, {
              appointmentId: appointment._id?.toString(),
              isServicePayment: false
            });
          } else {
            // Không tìm thấy, thử kiểm tra payment bằng description
            const desc = String(paymentInfo.description || "");
            isServicePayment = desc.includes("Service") || desc.includes("MC Service");
            description = paymentInfo.description || (isServicePayment ? `MC Service ${String(orderCode).slice(-7)}` : `MedConnect ${String(orderCode).slice(-8)}`);
            console.log(`📋 No payment/appointment found, using description:`, {
              originalDescription: paymentInfo.description,
              isServicePayment,
              finalDescription: description
            });
          }
        }
        
        const webhookData = {
          data: {
            orderCode: Number(orderCode),
            description: description,
            code: "00",
            amount: paymentInfo.amount,
          },
          success: true
        };
        
        console.log(`📋 Calling webhook handler with:`, {
          orderCode,
          description,
          isServicePayment,
          amount: paymentInfo.amount
        });
        
        const result = await handlePayosWebhook(webhookData, true); // skipVerification = true for fallback
        console.log(`✅ Auto-processed payment via check-status: ${orderCode}`, result);
      } catch (webhookError) {
        // Nếu webhook handler lỗi (có thể đã xử lý rồi), log chi tiết
        console.error(`❌ Webhook handler error for ${orderCode}:`, webhookError);
        console.error("Webhook error details:", webhookError.message);
        console.error("Webhook error stack:", webhookError.stack);
      }
    }

    return res.status(200).json({
      success: true,
      data: paymentInfo,
      message: "Lấy thông tin thanh toán thành công",
    });
  } catch (error) {
    console.error("❌ Error checking payment status:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal error",
    });
  }
};

/**
 * Controller hủy link thanh toán
 * POST /api/payments/payos/cancel/:orderCode
 */
export const cancelPaymentLinkController = async (req, res) => {
  try {
    const { orderCode } = req.params;
    
    if (!orderCode) {
      return res.status(400).json({
        success: false,
        message: "Order code không được trống",
      });
    }

    const result = await cancelPaymentLink(Number(orderCode));

    return res.status(200).json({
      success: true,
      data: result,
      message: "Hủy link thanh toán thành công",
    });
  } catch (error) {
    console.error("❌ Error canceling payment link:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal error",
    });
  }
};

