# PHÂN TÍCH LUỒNG CHẠY CHỨC NĂNG THANH TOÁN

## TỔNG QUAN

Hệ thống thanh toán sử dụng PayOS làm cổng thanh toán chính. Có 2 loại thanh toán:
1. **Booking Payment** - Thanh toán đặt lịch khám (trước khi khám)
2. **Service Payment** - Thanh toán dịch vụ (sau khi khám xong, bác sĩ tạo hóa đơn)

---

## LUỒNG TỔNG QUAN

```
Client → API Route → Controller → Service → PayOS API
                      ↓
                   Database (Payment, Appointment)
                      ↓
                   Webhook từ PayOS
                      ↓
                   Cập nhật trạng thái thanh toán
```

---

## CHI TIẾT TỪNG BƯỚC

### 1. KHỞI TẠO SERVER VÀ ROUTING

#### 1.1. Server khởi động (`server/index.js`)
```javascript
// Dòng 13: Import router chính
import apiRouter from "./routes/api.router.js";

// Dòng 93: Mount router tại /api
app.use("/api", apiRouter);
```

**Luồng chạy:**
- Server Express khởi động tại port 3000
- Mount router chính tại `/api`
- Tất cả request bắt đầu với `/api` sẽ được xử lý bởi `apiRouter`

---

#### 1.2. API Router (`server/routes/api.router.js`)
```javascript
// Dòng 14: Import PayOS router
import payosRouter from "./payos.routes.js";

// Dòng 72: Mount PayOS routes tại /api/payments/payos
apiRouter.use("/payments/payos", payosRouter);
```

**Luồng chạy:**
- Request đến `/api/payments/payos/*` được chuyển đến `payosRouter`
- Các endpoint PayOS:
  - `POST /api/payments/payos/create-payment` - Tạo link thanh toán
  - `POST /api/payments/payos/webhook` - Nhận webhook từ PayOS
  - `GET /api/payments/payos/check-status/:orderCode` - Kiểm tra trạng thái
  - `POST /api/payments/payos/cancel/:orderCode` - Hủy link thanh toán

---

#### 1.3. PayOS Routes (`server/routes/payos.routes.js`)
```javascript
// Dòng 1-6: Import controller và middleware
import {
  createPayosPaymentLinkController,
  handlePayosWebhookController,
  checkPaymentStatusController,
  cancelPaymentLinkController,
} from "../controllers/payos.controller.js";
import { authGuard } from "../middleware/auth.js";

// Dòng 11: Tạo link thanh toán (yêu cầu auth)
router.post("/create-payment", authGuard, createPayosPaymentLinkController);

// Dòng 14: Webhook (không cần auth - server-to-server)
router.post("/webhook", handlePayosWebhookController);

// Dòng 17: Kiểm tra trạng thái (yêu cầu auth)
router.get("/check-status/:orderCode", authGuard, checkPaymentStatusController);

// Dòng 20: Hủy link (yêu cầu auth)
router.post("/cancel/:orderCode", authGuard, cancelPaymentLinkController);
```

**Luồng chạy:**
- `authGuard` middleware kiểm tra authentication trước khi xử lý (trừ webhook)
- Webhook không cần auth vì là server-to-server communication
- Mỗi route gọi controller tương ứng

---

### 2. TẠO LINK THANH TOÁN (CREATE PAYMENT LINK)

#### 2.1. Controller (`server/controllers/payos.controller.js`)

**Hàm: `createPayosPaymentLinkController`**

```javascript
export const createPayosPaymentLinkController = async (req, res) => {
  try {
    // Bước 1: Lấy dữ liệu từ request body
    const { appointmentId, amount, description } = req.body;
    
    // Bước 2: Validate input
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

    // Bước 3: Lấy userId từ token (đã được decode bởi authGuard)
    const userId = req.user?.app_user_id || req.user?.uid;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - User ID not found",
      });
    }

    // Bước 4: Gọi service để tạo link thanh toán
    const paymentResult = await createPayosPaymentLink(userId, {
      appointmentId,
      amount,
      description,
    });

    // Bước 5: Trả về link thanh toán và orderCode
    return res.status(200).json({
      success: true,
      data: {
        payUrl: paymentResult.payUrl,
        orderCode: paymentResult.orderCode,
      },
      message: "Tạo link thanh toán PayOS thành công",
    });
  } catch (err) {
    console.error("Error creating PayOS payment link:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Internal error",
    });
  }
};
```

**Luồng chạy:**
1. Nhận request từ client với `appointmentId`, `amount`, `description`
2. Validate input (appointmentId, amount > 0)
3. Lấy `userId` từ `req.user` (đã được set bởi `authGuard` middleware)
4. Gọi `createPayosPaymentLink` service
5. Trả về `payUrl` và `orderCode` cho client

---

#### 2.2. Service (`server/services/payos.service.js`)

**Hàm: `createPayosPaymentLink`**

```javascript
export const createPayosPaymentLink = async (userId, paymentData) => {
  // Bước 1: Validate User ID
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid User ID");
  }

  // Bước 2: Extract dữ liệu từ paymentData
  const {
    appointmentId,
    medicalVisitId,
    paymentId,
    amount,
    description = "Payment for appointment",
  } = paymentData || {};

  // Bước 3: Validate - phải có 1 trong 3: appointmentId, medicalVisitId, paymentId
  if (!appointmentId && !medicalVisitId && !paymentId) {
    throw new Error("Appointment ID, Medical Visit ID, hoặc Payment ID không được trống");
  }

  // Bước 4: Validate amount
  if (!amount || amount <= 0) throw new Error("Số tiền không hợp lệ");

  // Bước 5: Kiểm tra patient tồn tại
  const patient = await Patient.findOne({ userId: userId }).populate("userId");
  if (!patient) throw new Error("Patient not found");

  // Bước 6: Xử lý theo loại payment
  let orderCode;
  let returnUrl;
  let cancelUrl;

  if (paymentId) {
    // Pre-payment flow: Payment được tạo trước khi tạo appointment
    // ... (xử lý paymentId)
  } else if (medicalVisitId) {
    // Multiple appointments payment (medical visit)
    // ... (xử lý medicalVisitId)
  } else {
    // Single appointment payment (flow chính)
    const appointment = await Appointment.findById(appointmentId)
      .populate("patientId")
      .populate("doctorId")
      .populate("clinicId");

    if (!appointment) throw new Error("Appointment not found");

    // Kiểm tra quyền: appointment phải thuộc về user hoặc thành viên gia đình
    const appointmentPatient = await Patient.findById(appointment.patientId._id);
    if (appointmentPatient.userId.toString() !== userId.toString()) {
      throw new Error("Unauthorized: Appointment does not belong to this user");
    }

    // Kiểm tra trạng thái appointment
    if (appointment.status === "cancelled") {
      throw new Error("Cannot pay for cancelled appointment");
    }

    // Tạo orderCode (10 chữ số) từ timestamp
    orderCode = Number(String(Date.now()).slice(-10));

    // Kiểm tra xem đã thanh toán chưa
    const existingPayment = await Payment.findOne({ appointmentId });
    if (existingPayment && ["captured", "authorized"].includes(existingPayment.status)) {
      throw new Error("Appointment already paid");
    }

    // Lưu orderCode vào appointment (nếu chưa có payment record)
    if (!existingPayment) {
      appointment.pendingOrderCode = orderCode;
      await appointment.save();
    } else if (existingPayment.orderCode) {
      orderCode = existingPayment.orderCode;
    }

    // Tạo returnUrl và cancelUrl
    returnUrl = `${process.env.FRONTEND_URL}/dat-lich/payment-result?status=success&orderCode=${orderCode}`;
    cancelUrl = `${process.env.FRONTEND_URL}/dat-lich/payment-result?status=failed&cancel=true&orderCode=${orderCode}`;
  }

  // Bước 7: Chuẩn hóa description (max 25 ký tự - yêu cầu PayOS)
  let finalDescription = description || `MedConnect ${String(orderCode).slice(-8)}`;
  if (finalDescription.length > 25) {
    finalDescription = finalDescription.substring(0, 25);
  }

  // Bước 8: Tạo payment request với PayOS
  const payosPaymentData = {
    orderCode,
    amount: parseInt(amount),
    description: finalDescription,
    returnUrl: returnUrl,
    cancelUrl: cancelUrl,
  };

  // Bước 9: Gọi PayOS API để tạo link thanh toán
  const link = await payos.paymentRequests.create(payosPaymentData);
  
  // Bước 10: Trả về payUrl và orderCode
  return {
    payUrl: link.checkoutUrl,
    orderCode: orderCode,
  };
};
```

**Luồng chạy chi tiết:**

1. **Validate User ID**: Kiểm tra userId có hợp lệ không
2. **Extract Data**: Lấy `appointmentId`, `medicalVisitId`, `paymentId`, `amount`, `description`
3. **Validate Input**: Đảm bảo có ít nhất 1 trong 3 ID và amount > 0
4. **Kiểm tra Patient**: Tìm patient theo userId
5. **Xử lý theo loại:**
   - **PaymentId**: Pre-payment flow (tạo payment trước, tạo appointment sau)
   - **MedicalVisitId**: Thanh toán nhiều appointments cùng lúc
   - **AppointmentId**: Thanh toán single appointment (flow chính)
6. **Kiểm tra quyền**: Appointment phải thuộc về user hoặc thành viên gia đình
7. **Tạo orderCode**: Từ timestamp (10 chữ số cuối)
8. **Kiểm tra trùng lặp**: Nếu đã thanh toán rồi thì throw error
9. **Lưu pendingOrderCode**: Lưu vào appointment để tracking
10. **Tạo PayOS Payment Request**: Gọi PayOS API
11. **Trả về link**: `payUrl` và `orderCode`

---

### 3. XỬ LÝ WEBHOOK (PAYMENT CALLBACK)

#### 3.1. Controller (`server/controllers/payos.controller.js`)

**Hàm: `handlePayosWebhookController`**

```javascript
export const handlePayosWebhookController = async (req, res) => {
  try {
    // Bước 1: Gọi service xử lý webhook
    const result = await handlePayosWebhook(req.body);
    
    // Bước 2: Trả về 200 để PayOS không retry
    return res.status(200).json({
      success: true,
      data: result || {},
      message: "Xử lý webhook PayOS thành công",
    });
  } catch (error) {
    console.error("Lỗi xử lý webhook PayOS:", error.message);
    
    // Bước 3: Vẫn trả về 200 để ngăn retry (tùy chiến lược)
    return res.status(200).json({
      success: false,
      message: "Đã nhận webhook nhưng có lỗi nội bộ",
      error: error.message,
    });
  }
};
```

**Luồng chạy:**
1. Nhận webhook từ PayOS (POST request)
2. Gọi `handlePayosWebhook` service với `req.body`
3. Trả về 200 ngay cả khi có lỗi (để PayOS không retry)

---

#### 3.2. Service (`server/services/payos.service.js`)

**Hàm: `handlePayosWebhook`**

```javascript
export const handlePayosWebhook = async (webhookBody, skipVerification = false) => {
  try {
    console.log(`Webhook received from PayOS`);

    // Bước 1: Verify chữ ký (trừ khi skipVerification = true)
    const verified = skipVerification
      ? webhookBody
      : await payos.webhooks.verify(webhookBody);
    
    const { data } = verified || {};
    const { orderCode, description, code, amount } = data || {};

    // Bước 2: Validate orderCode
    if (!orderCode) throw new Error("Missing orderCode in webhook data");

    // Bước 3: Xác định loại payment (booking vs service)
    const desc = String(description || "").toLowerCase();
    const isAppointmentPayment = 
      desc.includes("medconnect") || 
      desc.includes("mc apt") || 
      desc.includes("mc visit");
    const isServicePayment = desc.includes("mc service") || desc.includes("service");

    if (!isAppointmentPayment && !isServicePayment) {
      return { ignored: true, message: "Not an appointment or service payment" };
    }

    // Bước 4: Tìm payment record trong database
    let appointment = null;
    let existingPayment = null;
    let invoiceType = "booking";

    if (isServicePayment) {
      // Service payment: Tìm bằng pendingOrderCode
      existingPayment = await Payment.findOne({
        pendingOrderCode: orderCode,
        invoiceType: "service",
      }).populate("appointmentId").lean();

      if (!existingPayment) {
        return { already: true, orderCode };
      }

      // Kiểm tra đã captured chưa (idempotent)
      if (existingPayment.status === "captured") {
        return {
          already: true,
          orderCode,
          paymentId: existingPayment._id,
          message: "Payment already processed - duplicate webhook blocked",
        };
      }

      // Lấy appointment từ payment
      const appointmentId = existingPayment.appointmentId._id
        ? existingPayment.appointmentId._id
        : existingPayment.appointmentId;
      appointment = await Appointment.findById(appointmentId)
        .populate("patientId")
        .populate("doctorId")
        .populate("clinicId");
    } else {
      // Booking payment: Tìm bằng orderCode hoặc pendingOrderCode
      existingPayment = await Payment.findOne({
        $or: [
          { orderCode: orderCode, invoiceType: "booking" },
          { pendingOrderCode: orderCode, invoiceType: "booking" },
        ],
      }).lean();

      if (existingPayment) {
        // Kiểm tra đã captured chưa
        if (existingPayment.status === "captured") {
          return { already: true, orderCode, paymentId: existingPayment._id };
        }

        // Xử lý medical visit (nhiều appointments) hoặc single appointment
        if (existingPayment.medicalVisitId && existingPayment.appointmentIds?.length > 0) {
          // Medical visit payment
        } else if (existingPayment.appointmentId) {
          // Single appointment payment
          const appointmentId = existingPayment.appointmentId?._id || existingPayment.appointmentId;
          appointment = await Appointment.findById(appointmentId)
            .populate("patientId")
            .populate("doctorId")
            .populate("clinicId");
        }
      } else {
        // Fallback: Tìm appointment bằng pendingOrderCode (legacy flow)
        appointment = await Appointment.findOne({
          pendingOrderCode: orderCode,
        }).populate("patientId").populate("doctorId").populate("clinicId");

        if (!appointment) {
          return { already: true, orderCode };
        }
      }
    }

    // Bước 5: Kiểm tra thanh toán thành công
    const isPaid = String(code) === "00" || verified.success === true;

    if (isPaid) {
      // Bước 6: Xử lý thanh toán thành công
      if (isServicePayment) {
        // Service payment flow
        payment = await Payment.findById(existingPayment._id);
        payment.status = "captured";
        payment.orderCode = orderCode;
        payment.providerTxnId = String(orderCode);
        payment.amountPaid = payment.total;
        payment.paidAt = new Date();
        payment.capturedAt = new Date();
        payment.pendingOrderCode = undefined;
        await payment.save();

        // Cập nhật appointment
        appointment.amountPaid = totalAmountPaid;
        appointment.paymentStatus = "paid";
        appointment.status = "done";
        await appointment.save();

        // Gửi email xác nhận
        await sendServicePaymentConfirmationEmail(appointment, payment, patient, doctor);

        // Tạo notification cho bác sĩ
        await createServicePaymentNotification(payment._id, appointment._id);
      } else {
        // Booking payment flow
        if (existingPayment) {
          // Update existing payment
          payment = await Payment.findById(existingPayment._id);
          payment.status = "captured";
          payment.orderCode = orderCode;
          payment.providerTxnId = String(orderCode);
          payment.amountPaid = payment.total;
          payment.paidAt = new Date();
          payment.capturedAt = new Date();
          payment.pendingOrderCode = undefined;
          await payment.save();

          // Xử lý pre-payment flow (tạo appointments từ appointmentData)
          if (payment.appointmentData && payment.appointmentData.length > 0) {
            // Tạo appointments từ appointmentData
            // ... (tạo appointments và update payment)
          }

          // Gửi email xác nhận
          await sendPaymentConfirmationEmail(appointment, payment, patient, doctor);

          // Tạo notification
          await createBookingNotification(appointment._id, {
            createdByManager: false,
            paymentCompleted: true,
          });
        } else {
          // Legacy flow: Tạo payment record mới
          // ... (tạo payment record và update appointment)
        }
      }
    } else {
      // Bước 7: Xử lý thanh toán thất bại
      if (isServicePayment) {
        // Mark payment as failed
        payment.status = "failed";
        await payment.save();
      } else {
        // Xóa appointment và giải phóng slot
        if (appointment.slotId) {
          await DoctorTimeSlot.findByIdAndUpdate(appointment.slotId, {
            status: "available",
          });
        }
        await Appointment.findByIdAndDelete(appointment._id);
      }
    }

    return { paid: isPaid, orderCode, appointmentId: appointment._id };
  } catch (error) {
    console.error("Error in handlePayosWebhook:", error);
    throw error;
  }
};
```

**Luồng chạy chi tiết:**

1. **Verify Webhook**: Xác thực chữ ký từ PayOS (trừ khi skipVerification)
2. **Extract Data**: Lấy `orderCode`, `description`, `code`, `amount`
3. **Xác định loại payment**: Dựa vào description (booking vs service)
4. **Tìm payment record**: 
   - Service payment: Tìm bằng `pendingOrderCode` + `invoiceType: "service"`
   - Booking payment: Tìm bằng `orderCode` hoặc `pendingOrderCode` + `invoiceType: "booking"`
5. **Kiểm tra idempotent**: Nếu đã captured thì return (tránh xử lý trùng)
6. **Kiểm tra trạng thái thanh toán**: `code === "00"` = thành công
7. **Xử lý thanh toán thành công:**
   - **Service Payment:**
     - Update payment: `status = "captured"`, `amountPaid = total`, `paidAt`, `capturedAt`
     - Update appointment: `amountPaid`, `paymentStatus = "paid"`, `status = "done"`
     - Gửi email xác nhận
     - Tạo notification cho bác sĩ
   - **Booking Payment:**
     - Update payment: `status = "captured"`, `amountPaid = total`
     - Xử lý pre-payment flow (nếu có `appointmentData`)
     - Update appointment: `paymentStatus = "paid"`, `status = "pending_doctor"`
     - Gửi email xác nhận
     - Tạo notification
8. **Xử lý thanh toán thất bại:**
   - Service payment: Mark payment as failed
   - Booking payment: Xóa appointment và giải phóng slot

---

### 4. KIỂM TRA TRẠNG THÁI THANH TOÁN (CHECK STATUS)

#### 4.1. Controller (`server/controllers/payos.controller.js`)

**Hàm: `checkPaymentStatusController`**

```javascript
export const checkPaymentStatusController = async (req, res) => {
  try {
    const { orderCode } = req.params;
    
    if (!orderCode) {
      return res.status(400).json({
        success: false,
        message: "Order code không được trống",
      });
    }

    // Bước 1: Kiểm tra trạng thái với PayOS
    const paymentInfo = await checkPaymentStatus(Number(orderCode));
    
    // Bước 2: Nếu thanh toán thành công, tự động xử lý (fallback cho webhook)
    if (paymentInfo && (paymentInfo.status === "PAID" || paymentInfo.status === "paid")) {
      try {
        // Tìm payment record trong database
        const Payment = (await import("../models/payment.model.js")).default;
        const Appointment = (await import("../models/appointment.model.js")).default;
        
        let paymentRecord = await Payment.findOne({
          $or: [
            { orderCode: Number(orderCode) },
            { pendingOrderCode: Number(orderCode) }
          ]
        });
        
        // Xác định loại payment (service vs booking)
        let isServicePayment = false;
        let description = paymentInfo.description || `MedConnect ${orderCode}`;
        
        if (paymentRecord) {
          isServicePayment = paymentRecord.invoiceType === "service";
        } else {
          // Tìm appointment bằng pendingOrderCode
          const appointment = await Appointment.findOne({
            pendingOrderCode: Number(orderCode)
          });
          
          if (appointment) {
            isServicePayment = false;
          }
        }
        
        // Gọi webhook handler (skipVerification = true)
        const webhookData = {
          data: {
            orderCode: Number(orderCode),
            description: description,
            code: "00",
            amount: paymentInfo.amount,
          },
          success: true
        };
        
        const result = await handlePayosWebhook(webhookData, true);
      } catch (webhookError) {
        console.error(`Webhook handler error for ${orderCode}:`, webhookError);
      }
    }

    return res.status(200).json({
      success: true,
      data: paymentInfo,
      message: "Lấy thông tin thanh toán thành công",
    });
  } catch (error) {
    console.error("Error checking payment status:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal error",
    });
  }
};
```

**Luồng chạy:**
1. Lấy `orderCode` từ params
2. Gọi PayOS API để kiểm tra trạng thái
3. Nếu thanh toán thành công nhưng webhook chưa xử lý (fallback):
   - Tìm payment record trong database
   - Xác định loại payment
   - Gọi webhook handler với `skipVerification = true`
4. Trả về thông tin trạng thái

---

#### 4.2. Service (`server/services/payos.service.js`)

**Hàm: `checkPaymentStatus`**

```javascript
export const checkPaymentStatus = async (orderCode) => {
  try {
    // Gọi PayOS API để lấy thông tin payment
    const paymentInfo = await payos.paymentRequests.get(orderCode);
    return paymentInfo;
  } catch (error) {
    console.error("Error checking payment status:", error);
    throw error;
  }
};
```

**Luồng chạy:**
1. Gọi PayOS API: `payos.paymentRequests.get(orderCode)`
2. Trả về thông tin payment (status, amount, description, etc.)

---

### 5. HỦY LINK THANH TOÁN (CANCEL PAYMENT)

#### 5.1. Controller (`server/controllers/payos.controller.js`)

**Hàm: `cancelPaymentLinkController`**

```javascript
export const cancelPaymentLinkController = async (req, res) => {
  try {
    const { orderCode } = req.params;
    
    if (!orderCode) {
      return res.status(400).json({
        success: false,
        message: "Order code không được trống",
      });
    }

    // Gọi service để hủy link
    const result = await cancelPaymentLink(Number(orderCode));

    return res.status(200).json({
      success: true,
      data: result,
      message: "Hủy link thanh toán thành công",
    });
  } catch (error) {
    console.error("Error canceling payment link:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal error",
    });
  }
};
```

---

#### 5.2. Service (`server/services/payos.service.js`)

**Hàm: `cancelPaymentLink`**

```javascript
export const cancelPaymentLink = async (orderCode) => {
  try {
    // Bước 1: Hủy link trên PayOS
    const result = await payos.paymentRequests.cancel(orderCode);
  } catch (error) {
    // PayOS có thể trả lỗi nếu đã cancel rồi hoặc chưa tồn tại
    console.log(`PayOS cancel status: ${error.message}`);
  }

  // Bước 2: Kiểm tra loại payment (service vs booking)
  const servicePayment = await Payment.findOne({
    pendingOrderCode: orderCode,
    invoiceType: "service",
  });

  if (servicePayment) {
    // Service payment: Đánh dấu failed hoặc xóa pendingOrderCode
    if (servicePayment.status === "initiated") {
      servicePayment.status = "failed";
      servicePayment.pendingOrderCode = undefined;
      await servicePayment.save();
    } else {
      servicePayment.pendingOrderCode = undefined;
      await servicePayment.save();
    }
    return { success: true, orderCode, invoiceType: "service" };
  }

  // Bước 3: Booking payment: Tìm appointment
  const appointment = await Appointment.findOne({
    pendingOrderCode: orderCode,
  });

  if (appointment) {
    // Nếu chưa thanh toán, xóa appointment và giải phóng slot
    if (appointment.paymentStatus === "unpaid" && !appointment.paymentId) {
      if (appointment.slotId) {
        await DoctorTimeSlot.findByIdAndUpdate(appointment.slotId, {
          status: "available",
        });
      }
      await Appointment.findByIdAndDelete(appointment._id);
    } else {
      // Nếu đã thanh toán, chỉ xóa pendingOrderCode
      appointment.pendingOrderCode = undefined;
      await appointment.save();
    }
    return { success: true, orderCode, invoiceType: "booking" };
  }

  return { success: true, orderCode };
};
```

**Luồng chạy:**
1. Gọi PayOS API để hủy link thanh toán
2. Kiểm tra loại payment (service vs booking)
3. **Service Payment:**
   - Nếu status = "initiated": Mark as "failed"
   - Xóa `pendingOrderCode`
4. **Booking Payment:**
   - Nếu chưa thanh toán: Xóa appointment và giải phóng slot
   - Nếu đã thanh toán: Chỉ xóa `pendingOrderCode`

---

### 6. SERVICE PAYMENT (THANH TOÁN DỊCH VỤ)

#### 6.1. Controller (`server/controllers/servicePaymentController.js`)

**Hàm: `createServicePayment`**

```javascript
export async function createServicePayment(req, res) {
  try {
    const { appointmentId } = req.params;
    const { serviceIds, amount } = req.body;
    const userId = req.user?.app_user_id || req.user?.uid;

    // Bước 1: Validate input
    if (!appointmentId || !serviceIds || !amount) {
      return fail(res, 400, ERROR_CODES.INVALID_INPUT, "Missing required fields");
    }

    // Bước 2: Tìm doctor
    const user = await User.findById(userId);
    const doctor = await Doctor.findOne({ userId: user._id });

    // Bước 3: Tìm appointment
    const appointment = await Appointment.findById(appointmentId)
      .populate("patientId")
      .populate("doctorId")
      .populate("clinicId");

    // Bước 4: Validate appointment thuộc về doctor này
    if (appointment.doctorId._id.toString() !== doctor._id.toString()) {
      return fail(res, 403, ERROR_CODES.FORBIDDEN, "Appointment does not belong to this doctor");
    }

    // Bước 5: Validate appointment status và mode
    if (appointment.status !== "in_progress" && appointment.status !== "done") {
      return fail(res, 400, ERROR_CODES.INVALID_INPUT, "Appointment must be in progress or completed");
    }

    if (appointment.mode !== "offline") {
      return fail(res, 400, ERROR_CODES.INVALID_INPUT, "Service invoice is only available for offline appointments");
    }

    // Bước 6: Kiểm tra service payment đã tồn tại chưa
    const existingServicePayment = await Payment.findOne({
      appointmentId: appointment._id,
      invoiceType: "service",
      status: { $in: ["captured", "authorized", "pending_manager", "initiated"] },
    });

    if (existingServicePayment) {
      return fail(res, 400, ERROR_CODES.INVALID_INPUT, "Service payment already exists");
    }

    // Bước 7: Lấy thông tin services
    const services = await ServicePrice.find({
      _id: { $in: serviceIds },
      isActive: true,
    }).lean();

    // Bước 8: Tính tổng tiền
    const calculatedTotal = services.reduce((sum, service) => sum + service.price, 0);

    // Bước 9: Validate amount
    if (parseInt(amount) !== calculatedTotal) {
      return fail(res, 400, ERROR_CODES.INVALID_INPUT, "Amount mismatch");
    }

    // Bước 10: Tạo payment record
    const orderCode = Number(String(Date.now()).slice(-10));
    const invoiceNumber = `INV-SERVICE-${orderCode}`;

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
        name: patient.fullName,
        email: patient.userId?.email,
        phone: patient.userId?.phoneNumber,
      },
      billFrom: {
        doctorId: doctor._id,
        clinicId: appointment.clinicId?._id,
        doctorName: doctor.fullName,
        clinicName: appointment.clinicId?.name,
      },
      items: items,
      subtotal: calculatedTotal,
      discount: 0,
      total: calculatedTotal,
      status: "initiated",
      pendingOrderCode: orderCode,
    });

    await payment.save();

    // Bước 11: Trả về payment record
    return ok(res, {
      payment: payment,
      message: "Service payment created successfully",
    });
  } catch (error) {
    return fail(res, 500, ERROR_CODES.INTERNAL_ERROR, error.message);
  }
}
```

**Luồng chạy:**
1. Validate input (appointmentId, serviceIds, amount)
2. Tìm doctor và appointment
3. Validate appointment thuộc về doctor này
4. Validate appointment status (in_progress hoặc done) và mode (offline)
5. Kiểm tra service payment đã tồn tại chưa
6. Lấy thông tin services từ database
7. Tính tổng tiền từ services
8. Validate amount khớp với calculatedTotal
9. Tạo payment record với:
   - `invoiceType: "service"`
   - `status: "initiated"`
   - `pendingOrderCode: orderCode`
10. Trả về payment record

---

## TÓM TẮT LUỒNG HOÀN CHỈNH

### BOOKING PAYMENT FLOW:

```
1. Client gọi POST /api/payments/payos/create-payment
   → Controller: createPayosPaymentLinkController
   → Service: createPayosPaymentLink
   → Tạo orderCode, lưu pendingOrderCode vào appointment
   → Gọi PayOS API tạo link thanh toán
   → Trả về payUrl và orderCode

2. User thanh toán trên PayOS
   → PayOS gọi webhook POST /api/payments/payos/webhook
   → Controller: handlePayosWebhookController
   → Service: handlePayosWebhook
   → Verify webhook, tìm payment/appointment
   → Nếu thành công: Update payment status = "captured"
   → Update appointment: paymentStatus = "paid", status = "pending_doctor"
   → Gửi email xác nhận
   → Tạo notification

3. Client redirect về returnUrl
   → Client gọi GET /api/payments/payos/check-status/:orderCode (fallback)
   → Nếu webhook chưa xử lý, tự động xử lý payment
```

### SERVICE PAYMENT FLOW:

```
1. Doctor tạo service payment
   → POST /api/doctors/me/appointments/:appointmentId/service-payment
   → Controller: createServicePayment
   → Tạo payment record với invoiceType: "service", status: "initiated"
   → Lưu pendingOrderCode

2. Patient thanh toán
   → Client gọi POST /api/payments/payos/create-payment với paymentId
   → Service: createPayosPaymentLink (với paymentId)
   → Tạo link thanh toán PayOS
   → Trả về payUrl

3. User thanh toán trên PayOS
   → PayOS gọi webhook
   → Service: handlePayosWebhook (isServicePayment = true)
   → Update payment: status = "captured", amountPaid = total
   → Update appointment: amountPaid, paymentStatus = "paid", status = "done"
   → Gửi email xác nhận
   → Tạo notification cho doctor
```

---

## CÁC ĐIỂM QUAN TRỌNG

1. **Idempotent**: Webhook handler kiểm tra `status === "captured"` để tránh xử lý trùng
2. **Fallback Mechanism**: `checkPaymentStatus` tự động xử lý payment nếu webhook chưa xử lý
3. **Family Member Support**: Hỗ trợ thanh toán cho thành viên gia đình (cùng userId)
4. **Pre-payment Flow**: Hỗ trợ tạo payment trước, tạo appointments sau
5. **Multiple Appointments**: Hỗ trợ thanh toán nhiều appointments cùng lúc (medical visit)
6. **Error Handling**: Luôn trả về 200 cho webhook để tránh retry
7. **Email Notification**: Gửi email xác nhận sau khi thanh toán thành công
8. **Database Sync**: Đồng bộ payment status với appointment status

---

## DATABASE SCHEMA

### Payment Model:
- `appointmentId`: Single appointment (backward compatible)
- `medicalVisitId`: Multiple appointments (medical visit)
- `appointmentIds`: Array of appointment IDs
- `appointmentData`: Pre-payment flow data
- `invoiceType`: "booking" | "service"
- `status`: "pending_manager" | "initiated" | "authorized" | "captured" | "failed" | "refunded" | "voided" | "cancelled"
- `orderCode`: PayOS order code (unique)
- `pendingOrderCode`: Temporary order code before payment
- `amountPaid`: Số tiền đã thanh toán
- `total`: Tổng tiền
- `paidAt`: Thời gian thanh toán
- `capturedAt`: Thời gian capture payment

### Appointment Model:
- `pendingOrderCode`: Order code chờ thanh toán
- `paymentStatus`: "paid" | "unpaid"
- `amountPaid`: Số tiền đã thanh toán (tổng từ service payments)
- `totalPay`: Tổng tiền cần thanh toán (từ service prices)
- `status`: "pending_doctor" | "accepted" | "in_progress" | "done" | "cancelled" | "rejected"

---

## KẾT LUẬN

Hệ thống thanh toán được thiết kế với các tính năng:
- Hỗ trợ 2 loại payment: booking và service
- Xử lý webhook từ PayOS
- Fallback mechanism khi webhook không hoạt động
- Idempotent để tránh xử lý trùng
- Hỗ trợ family members
- Email notification
- Database sync giữa payment và appointment

