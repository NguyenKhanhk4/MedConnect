import {
  createPayosPaymentLink,
  handlePayosWebhook,
  checkPaymentStatus,
  cancelPaymentLink,
} from "../services/payos.service.js";

/**
 * Controller tạo link thanh toán PayOS
 * POST /api/payments/payos/create-payment
 * body: { appointmentId, amount, description }
 */
export const createPayosPaymentLinkController = async (req, res) => {
  try {
    const { appointmentId, amount, description } = req.body;
    
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

    // req.user được set từ auth middleware (decoded token)
    // decoded có uid (Firebase UID) hoặc app_user_id (MongoDB User ID)
    const userId = req.user?.app_user_id || req.user?.uid;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - User ID not found",
      });
    }

    const paymentResult = await createPayosPaymentLink(userId, {
      appointmentId,
      amount,
      description,
    });

    return res.status(200).json({
      success: true,
      data: {
        payUrl: paymentResult.payUrl,
        orderCode: paymentResult.orderCode,
      },
      message: "Tạo link thanh toán PayOS thành công",
    });
  } catch (err) {
    console.error("❌ Error creating PayOS payment link:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Internal error",
    });
  }
};

/**
 * Controller xử lý webhook từ PayOS
 * POST /api/payments/payos/webhook
 */
export const handlePayosWebhookController = async (req, res) => {
  try {
    const result = await handlePayosWebhook(req.body);
    
    // Trả 200 để PayOS không retry
    return res.status(200).json({
      success: true,
      data: result || {},
      message: "Xử lý webhook PayOS thành công",
    });
  } catch (error) {
    console.error("❌ Lỗi xử lý webhook PayOS:", error.message);
    
    // Vẫn trả 200 để ngăn retry (tùy chiến lược)
    return res.status(200).json({
      success: false,
      message: "Đã nhận webhook nhưng có lỗi nội bộ",
      error: error.message,
    });
  }
};

/**
 * Controller kiểm tra trạng thái thanh toán
 * GET /api/payments/payos/check-status/:orderCode
 * 
 * FALLBACK MECHANISM: Nếu thanh toán thành công nhưng webhook chưa xử lý
 * (do localhost không nhận được webhook), tự động xử lý payment
 */
export const checkPaymentStatusController = async (req, res) => {
  try {
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

