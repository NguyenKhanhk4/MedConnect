import { PayOS } from "@payos/node";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Appointment from "../models/appointment.model.js";
import Payment from "../models/payment.model.js";
import Patient from "../models/patient.model.js";
import Doctor from "../models/doctor.model.js";
import Clinic from "../models/clinic.model.js";
import DoctorTimeSlot from "../models/doctorTimeSlot.model.js";
import { sendMail } from "../utils/email.js";

dotenv.config();

const payos = new PayOS(
  process.env.PAYOS_CLIENT_ID,
  process.env.PAYOS_API_KEY,
  process.env.PAYOS_CHECKSUM_KEY
);

/**
 * Tạo link thanh toán PayOS cho appointment hoặc medical visit
 * @param {string} userId - ID của user
 * @param {object} paymentData - Dữ liệu thanh toán {appointmentId, medicalVisitId, amount, description}
 * @returns {object} - {payUrl, orderCode}
 */
export const createPayosPaymentLink = async (userId, paymentData) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid User ID");
  }

  const {
    appointmentId,
    medicalVisitId,
    paymentId,
    amount,
    description = "Payment for appointment",
  } = paymentData || {};

  // Validate: must have either appointmentId OR medicalVisitId OR paymentId
  if (!appointmentId && !medicalVisitId && !paymentId) {
    throw new Error(
      "Appointment ID, Medical Visit ID, hoặc Payment ID không được trống"
    );
  }

  // Count how many IDs are provided
  const idCount = [appointmentId, medicalVisitId, paymentId].filter(
    Boolean
  ).length;
  if (idCount > 1) {
    throw new Error(
      "Chỉ được cung cấp một trong: appointmentId, medicalVisitId, hoặc paymentId"
    );
  }

  if (!amount || amount <= 0) throw new Error("Số tiền không hợp lệ");

  // Kiểm tra patient
  const patient = await Patient.findOne({ userId: userId }).populate("userId");
  if (!patient) throw new Error("Patient not found");

  let orderCode;
  let returnUrl;
  let cancelUrl;

  if (paymentId) {
    // Pre-payment flow: Payment created before visit/appointments (NEW)
    const payment = await Payment.findById(paymentId);
    if (!payment) throw new Error("Payment not found");

    // Check if payment belongs to this user or their family member
    // Get the patient from payment.billTo.patientId
    const paymentPatient = await Patient.findById(payment.billTo.patientId);
    if (!paymentPatient) {
      throw new Error("Payment patient not found");
    }

    // Check if payment patient belongs to this user (either self or family member)
    // All family members share the same userId
    if (paymentPatient.userId.toString() !== userId.toString()) {
      throw new Error("Unauthorized: Payment does not belong to this user");
    }

    // Check if already paid
    if (payment.status === "captured") {
      throw new Error("Payment already captured");
    }

    // Use orderCode from payment
    if (payment.orderCode) {
      orderCode = payment.orderCode;
    } else {
      // Generate new orderCode if not exists
      orderCode = Number(String(Date.now()).slice(-10));
      payment.orderCode = orderCode;
      payment.pendingOrderCode = orderCode;
      await payment.save();
    }

    returnUrl = `${process.env.FRONTEND_URL}/dat-lich/payment-result?status=success&orderCode=${orderCode}&type=visit`;
    cancelUrl = `${process.env.FRONTEND_URL}/dat-lich/payment-result?status=failed&cancel=true&orderCode=${orderCode}&type=visit`;
  } else if (medicalVisitId) {
    // Multiple appointments payment (medical visit - existing flow)
    const MedicalVisit = (await import("../models/medicalVisit.model.js"))
      .default;
    const visit = await MedicalVisit.findById(medicalVisitId);
    if (!visit) throw new Error("Medical Visit not found");

    // Check if visit belongs to this user or their family member
    // Get the patient from visit.patientId
    const visitPatient = await Patient.findById(visit.patientId);
    if (!visitPatient) {
      throw new Error("Medical visit patient not found");
    }

    // Check if visit patient belongs to this user (either self or family member)
    // All family members share the same userId
    if (visitPatient.userId.toString() !== userId.toString()) {
      throw new Error(
        "Unauthorized: Medical Visit does not belong to this user"
      );
    }

    // Check if already paid
    if (visit.paymentStatus === "paid") {
      throw new Error("Medical Visit already paid");
    }

    // Get orderCode from existing payment if exists
    const existingPayment = await Payment.findOne({
      medicalVisitId: medicalVisitId,
      invoiceType: "booking",
      status: { $in: ["initiated", "captured", "authorized"] },
    });

    if (existingPayment && existingPayment.orderCode) {
      orderCode = existingPayment.orderCode;
    } else {
      // Generate new orderCode
      orderCode = Number(String(Date.now()).slice(-10));
    }

    returnUrl = `${process.env.FRONTEND_URL}/dat-lich/payment-result?status=success&orderCode=${orderCode}&type=visit`;
    cancelUrl = `${process.env.FRONTEND_URL}/dat-lich/payment-result?status=failed&cancel=true&orderCode=${orderCode}&type=visit`;
  } else {
    // Single appointment payment (existing flow)
    const appointment = await Appointment.findById(appointmentId)
      .populate("patientId")
      .populate("doctorId")
      .populate("clinicId");

    if (!appointment) throw new Error("Appointment not found");

    // Get the appointment's patient
    const appointmentPatient = await Patient.findById(
      appointment.patientId._id
    );
    if (!appointmentPatient) throw new Error("Appointment patient not found");

    // Check if appointment's patient belongs to this user (support family members)
    if (appointmentPatient.userId.toString() !== userId.toString()) {
      throw new Error("Unauthorized: Appointment does not belong to this user");
    }

    // Kiểm tra trạng thái appointment
    if (appointment.status === "cancelled") {
      throw new Error("Cannot pay for cancelled appointment");
    }

    // Tạo orderCode 10 chữ số (int)
    orderCode = Number(String(Date.now()).slice(-10));

    // Kiểm tra xem đã thanh toán thành công chưa
    const existingPayment = await Payment.findOne({ appointmentId });
    if (
      existingPayment &&
      ["captured", "authorized"].includes(existingPayment.status)
    ) {
      throw new Error("Appointment already paid");
    }

    // Lưu orderCode vào appointment (chưa tạo payment record) - chỉ khi không có payment record
    if (!existingPayment) {
      appointment.pendingOrderCode = orderCode;
      await appointment.save();
    } else if (existingPayment.orderCode) {
      orderCode = existingPayment.orderCode;
    }

    returnUrl = `${process.env.FRONTEND_URL}/dat-lich/payment-result?status=success&orderCode=${orderCode}`;
    cancelUrl = `${process.env.FRONTEND_URL}/dat-lich/payment-result?status=failed&cancel=true&orderCode=${orderCode}`;
  }

  // Ensure description is max 25 characters (PayOS requirement)
  let finalDescription =
    description || `MedConnect ${String(orderCode).slice(-8)}`;
  if (finalDescription.length > 25) {
    console.warn(
      `⚠️ Description too long (${finalDescription.length} chars), truncating to 25 chars: "${finalDescription}"`
    );
    finalDescription = finalDescription.substring(0, 25);
  }

  const payosPaymentData = {
    orderCode,
    amount: parseInt(amount),
    description: finalDescription, // Max 25 chars (PayOS requirement)
    returnUrl: returnUrl,
    cancelUrl: cancelUrl,
    // webhookUrl có thể cấu hình trực tiếp trên PayOS dashboard
  };

  const link = await payos.paymentRequests.create(payosPaymentData);
  return {
    payUrl: link.checkoutUrl,
    orderCode: orderCode,
  };
};

/**
 * Xử lý webhook từ PayOS
 * @param {object} webhookBody - Dữ liệu webhook từ PayOS
 * @param {boolean} skipVerification - Bỏ qua verify chữ ký (cho fallback manual)
 * @returns {object} - Kết quả xử lý
 */
export const handlePayosWebhook = async (
  webhookBody,
  skipVerification = false
) => {
  try {
    console.log(`🔔 Webhook received from PayOS`);

    // Verify chữ ký - throws nếu sai (trừ khi skipVerification = true)
    const verified = skipVerification
      ? webhookBody
      : await payos.webhooks.verify(webhookBody);
    const { data } = verified || {};
    const { orderCode, description, code, amount } = data || {};

    console.log(`🔔 Webhook data:`, {
      orderCode,
      description,
      code,
      amount,
      hasData: !!data,
    });

    if (!orderCode) throw new Error("Missing orderCode in webhook data");

    // Chỉ xử lý payment cho appointment (check cả "MedConnect", "MC Apt", "MC Visit" và "MC Service")
    const desc = String(description || "").toLowerCase();
    console.log(`🔔 Webhook description check:`, {
      description: description,
      descLowerCase: desc,
      includesMedConnect: desc.includes("medconnect"),
      includesMCApt: desc.includes("mc apt"),
      includesMCVisit: desc.includes("mc visit"),
      includesMCService: desc.includes("mc service"),
    });

    // Check if this is an appointment/visit payment (not service payment)
    const isAppointmentPayment =
      desc.includes("medconnect") ||
      desc.includes("mc apt") ||
      desc.includes("mc visit");
    const isServicePayment =
      desc.includes("mc service") || desc.includes("service");

    if (!isAppointmentPayment && !isServicePayment) {
      console.log(`⚠️ Webhook ignored: Not an appointment or service payment`);
      return {
        ignored: true,
        message: "Not an appointment or service payment",
      };
    }

    // Phân biệt booking payment và service payment
    // Booking payment: orderCode lưu trong appointment.pendingOrderCode hoặc payment, description: "MedConnect ...", "MC Apt ...", "MC Visit ..."
    // Service payment: orderCode lưu trong payment.pendingOrderCode, description: "MC Service ..." hoặc "MedConnect Service ..."
    // Note: isServicePayment và isAppointmentPayment đã được xác định ở trên
    console.log(`🔔 Payment type detected:`, {
      isServicePayment,
      isAppointmentPayment,
      orderCode,
      description: description,
    });

    let appointment = null;
    let existingPayment = null;
    let invoiceType = "booking";

    if (isServicePayment) {
      console.log(
        `🔔 Processing service payment webhook for orderCode: ${orderCode}`
      );

      // Service payment: tìm payment bằng pendingOrderCode
      existingPayment = await Payment.findOne({
        pendingOrderCode: orderCode,
        invoiceType: "service",
      })
        .populate("appointmentId")
        .lean();

      console.log(`🔔 Service payment lookup:`, {
        orderCode,
        found: !!existingPayment,
        paymentId: existingPayment?._id?.toString() || "NOT FOUND",
        paymentStatus: existingPayment?.status || "NOT FOUND",
        appointmentId:
          existingPayment?.appointmentId?._id?.toString() ||
          existingPayment?.appointmentId?.toString() ||
          "NOT FOUND",
      });

      if (!existingPayment) {
        console.log(
          `⚠️ Service payment not found for orderCode: ${orderCode}. Possibly already processed.`
        );
        return { already: true, orderCode };
      }

      // Check if already captured - CHẶN thanh toán lại (idempotent)
      if (existingPayment.status === "captured") {
        console.log(
          `ℹ️ Service payment already captured: ${existingPayment._id} - BLOCKING duplicate payment attempt`
        );
        // Nếu đã captured nhưng appointment status chưa là "done", cập nhật lại
        const Appointment = (await import("../models/appointment.model.js"))
          .default;
        const appointmentId =
          existingPayment.appointmentId?._id || existingPayment.appointmentId;
        if (appointmentId) {
          const appointmentToCheck = await Appointment.findById(appointmentId);
          if (appointmentToCheck && appointmentToCheck.status !== "done") {
            console.log(
              `🔔 Updating appointment status for already-captured payment: ${appointmentToCheck._id}`
            );
            appointmentToCheck.status = "done";
            await appointmentToCheck.save();
            console.log(
              `✅ Appointment status updated to "done" for already-captured payment: ${appointmentToCheck._id}`
            );
          }
        }
        // Return already=true để webhook KHÔNG xử lý lại (idempotent)
        return {
          already: true,
          orderCode,
          paymentId: existingPayment._id,
          message: "Payment already processed - duplicate webhook blocked",
        };
      }

      // Get appointment from payment
      const appointmentId = existingPayment.appointmentId._id
        ? existingPayment.appointmentId._id
        : existingPayment.appointmentId;

      appointment = await Appointment.findById(appointmentId)
        .populate("patientId")
        .populate("doctorId")
        .populate("clinicId");

      if (!appointment) {
        console.error(
          `❌ Appointment not found for payment ${existingPayment._id}`
        );
        return { already: true, orderCode };
      }
    } else {
      // Booking payment: Tìm payment bằng orderCode hoặc pendingOrderCode
      // Có thể là single appointment hoặc medical visit (multiple appointments)
      // IMPORTANT: Tìm cả khi orderCode là string hoặc number
      existingPayment = await Payment.findOne({
        $or: [
          { orderCode: orderCode, invoiceType: "booking" },
          { orderCode: String(orderCode), invoiceType: "booking" },
          { orderCode: Number(orderCode), invoiceType: "booking" },
          { pendingOrderCode: orderCode, invoiceType: "booking" },
          { pendingOrderCode: String(orderCode), invoiceType: "booking" },
          { pendingOrderCode: Number(orderCode), invoiceType: "booking" },
        ],
      }).lean();
      
      // Log để debug
      if (!existingPayment) {
        console.log(`⚠️ Payment not found for orderCode: ${orderCode} (type: ${typeof orderCode})`);
        // Thử tìm tất cả payments với status initiated để debug
        const initiatedPayments = await Payment.find({
          status: "initiated",
          invoiceType: "booking",
        })
          .select("_id orderCode pendingOrderCode invoiceNumber createdAt")
          .lean();
        console.log(`🔍 Found ${initiatedPayments.length} initiated payments:`, initiatedPayments);
      }

      if (existingPayment) {
        console.log(`✅ Found booking payment: ${existingPayment._id}`);
        console.log(`🔔 Payment type:`, {
          hasMedicalVisitId: !!existingPayment.medicalVisitId,
          hasAppointmentId: !!existingPayment.appointmentId,
          hasAppointmentIds: !!existingPayment.appointmentIds?.length,
        });

        // Check if already captured
        if (existingPayment.status === "captured") {
          console.log(
            `ℹ️ Booking payment already captured: ${existingPayment._id}`
          );
          return { already: true, orderCode, paymentId: existingPayment._id };
        }

        // Check if this is a medical visit payment (multiple appointments)
        if (
          existingPayment.medicalVisitId &&
          existingPayment.appointmentIds?.length > 0
        ) {
          console.log(
            `🔔 Medical visit payment detected: ${existingPayment.medicalVisitId}`
          );
          // Don't populate single appointment, we'll handle multiple appointments in webhook
          // appointment will be null for medical visit payment
        } else if (existingPayment.appointmentId) {
          // Single appointment payment
          const appointmentId =
            existingPayment.appointmentId?._id || existingPayment.appointmentId;
          appointment = await Appointment.findById(appointmentId)
            .populate("patientId")
            .populate("doctorId")
            .populate("clinicId");

          if (!appointment) {
            console.error(
              `❌ Appointment not found for payment ${existingPayment._id}`
            );
            return { already: true, orderCode };
          }
        }
      } else {
        // Fallback: Legacy flow - tìm appointment bằng pendingOrderCode
        appointment = await Appointment.findOne({
          pendingOrderCode: orderCode,
        })
          .populate("patientId")
          .populate("doctorId")
          .populate("clinicId");

        if (!appointment) {
          console.log(
            `⚠️ Booking payment or appointment not found for orderCode: ${orderCode}. Possibly already processed.`
          );
          return { already: true, orderCode };
        }

        // Kiểm tra xem đã có booking payment chưa (idempotent)
        existingPayment = await Payment.findOne({
          appointmentId: appointment._id,
          invoiceType: "booking",
        }).lean();

        if (existingPayment && existingPayment.status === "captured") {
          console.log(
            `ℹ️ Booking payment already captured for appointment: ${appointment._id}`
          );
          return { already: true, orderCode, paymentId: existingPayment._id };
        }
      }
    }

    const isPaid =
      String(code) === "00" ||
      verified.success === true ||
      String(data.code) === "00";

    if (isPaid) {
      let payment = null;
      let patient = null;
      let doctor = null;

      if (isServicePayment) {
        // Service payment: update existing payment record
        payment = await Payment.findById(existingPayment._id)
          .populate("billTo.patientId", "fullName userId")
          .populate("billFrom.doctorId", "fullName userId specializationIds")
          .populate("billFrom.clinicId", "name address");

        if (!payment) {
          return { already: true, orderCode };
        }

        // Update payment status
        payment.status = "captured";
        payment.orderCode = orderCode;
        payment.providerTxnId = String(orderCode);
        payment.amountPaid = payment.total; // Cập nhật amountPaid = total khi thanh toán qua PayOS
        payment.paidAt = new Date();
        payment.capturedAt = new Date();
        payment.pendingOrderCode = undefined; // Clear pendingOrderCode
        await payment.save();

        // Populate appointment và lấy patient, doctor - giống booking payment flow
        appointment = await Appointment.findById(payment.appointmentId)
          .populate("patientId")
          .populate("doctorId")
          .populate("clinicId");

        if (!appointment) {
          console.error(`❌ Appointment not found for payment ${payment._id}`);
          return { already: true, orderCode };
        }

        // Lấy patient và doctor - giống booking payment (đơn giản hóa)
        // Patient: giống booking payment - populate userId
        if (appointment.patientId) {
          const patientIdToQuery =
            appointment.patientId._id || appointment.patientId;
          patient = await Patient.findById(patientIdToQuery).populate("userId");
        }

        // Doctor: giống booking payment
        if (appointment.doctorId) {
          const doctorIdToQuery =
            appointment.doctorId._id || appointment.doctorId;
          doctor = await Doctor.findById(doctorIdToQuery);
        }

        if (!patient || !doctor || !appointment) {
          console.error(
            `❌ Patient, Doctor or Appointment not found for payment ${payment._id}`,
            {
              appointmentId: payment.appointmentId?.toString(),
              patientFound: !!patient,
              doctorFound: !!doctor,
              appointmentFound: !!appointment,
              appointmentPatientId:
                appointment?.patientId?._id?.toString() ||
                appointment?.patientId?.toString() ||
                "NOT FOUND",
              appointmentDoctorId:
                appointment?.doctorId?._id?.toString() ||
                appointment?.doctorId?.toString() ||
                "NOT FOUND",
            }
          );
        }

        // Import notification service
        const { createServicePaymentNotification } = await import(
          "./notificationService.js"
        );

        // Gửi email cho bệnh nhân - giống booking payment flow (đơn giản hóa)

        try {
          await sendServicePaymentConfirmationEmail(
            appointment,
            payment,
            patient,
            doctor
          );
          console.log(
            `✅ Service payment confirmation email sent successfully for appointment ${appointment._id}`
          );

          // Create in-app notification for patient about successful service payment
          try {
            const Notification = (await import("../models/notification.model.js")).default;
            const patientUserId = patient?.userId?._id || patient?.userId;
            
            if (patientUserId) {
              // Format payment amount
              const formattedAmount = new Intl.NumberFormat("vi-VN", {
                style: "currency",
                currency: "VND",
              }).format(payment.total);

              // Format services list
              const servicesList = payment.items
                .map((item) => item.description)
                .join(", ");

              const doctorName = doctor?.fullName || "Bác sĩ";

              await Notification.create({
                userId: patientUserId,
                type: "payment",
                title: "Thanh toán dịch vụ thành công",
                message: `Bạn đã thanh toán thành công ${formattedAmount} cho dịch vụ: ${servicesList}. Mã hóa đơn: ${payment.invoiceNumber}.`,
                priority: "high",
                relatedId: payment._id,
                relatedType: "payment",
                metadata: {
                  paymentId: payment._id.toString(),
                  invoiceNumber: payment.invoiceNumber,
                  total: payment.total,
                  services: payment.items,
                  appointmentId: appointment?._id?.toString(),
                  doctorName,
                  status: "paid",
                  paymentType: "service",
                },
              });

              console.log(
                `✅ Created service payment success notification for patient ${patientUserId}`
              );
            }
          } catch (notificationError) {
            console.error(
              "❌ Error creating service payment success notification:",
              notificationError
            );
            // Don't fail the whole process if notification fails
          }
        } catch (emailError) {
          console.error(
            "❌ Error sending service payment confirmation email:",
            emailError
          );
          console.error("Email error message:", emailError.message);
          console.error("Email error stack:", emailError.stack);
        }

        // Gửi notification cho bác sĩ
        if (appointment && payment) {
          try {
            await createServicePaymentNotification(
              payment._id,
              appointment._id
            );
            console.log(`✅ Service payment notification created for doctor`);
          } catch (notificationError) {
            console.error(
              "❌ Error creating service payment notification:",
              notificationError
            );
            console.error(
              "Notification error details:",
              notificationError.stack
            );
          }
        } else {
          console.error(
            "⚠️ Cannot create notification: missing appointment or payment data"
          );
        }

        // Cập nhật appointment: amountPaid, paymentStatus và status
        // Lấy appointmentId trực tiếp từ payment (không populate) để đảm bảo chính xác
        try {
          const Payment = (await import("../models/payment.model.js")).default;
          const paymentForId = await Payment.findById(payment._id)
            .select("appointmentId")
            .lean();

          if (!paymentForId || !paymentForId.appointmentId) {
            console.error(
              `❌ Cannot get appointmentId from payment ${payment._id}`
            );
          } else {
            const appointmentIdToUpdate = paymentForId.appointmentId;
            const Appointment = (await import("../models/appointment.model.js"))
              .default;
            const appointmentToUpdate = await Appointment.findById(
              appointmentIdToUpdate
            );

            if (appointmentToUpdate) {
              // Tính tổng amountPaid từ tất cả service payments của appointment này
              const allServicePayments = await Payment.find({
                appointmentId: appointmentToUpdate._id,
                invoiceType: "service",
              });

              const totalAmountPaid = allServicePayments.reduce(
                (sum, p) => sum + (p.amountPaid || 0),
                0
              );

              // Cập nhật totalPay từ services nếu chưa có
              if (
                !appointmentToUpdate.totalPay ||
                appointmentToUpdate.totalPay === 0
              ) {
                const totalPay = allServicePayments.reduce(
                  (sum, p) => sum + (p.total || 0),
                  0
                );
                appointmentToUpdate.totalPay = totalPay;
              }

              appointmentToUpdate.amountPaid = totalAmountPaid;

              // Cập nhật paymentStatus
              if (totalAmountPaid >= appointmentToUpdate.totalPay) {
                appointmentToUpdate.paymentStatus = "paid";
              } else {
                appointmentToUpdate.paymentStatus = "unpaid";
              }

              // Cập nhật status thành "done" nếu chưa phải
              if (appointmentToUpdate.status !== "done") {
                const oldStatus = appointmentToUpdate.status;
                appointmentToUpdate.status = "done";
                console.log(
                  `✅ Appointment status updated from "${oldStatus}" to "done" after service payment: ${appointmentToUpdate._id}`
                );
              }

              await appointmentToUpdate.save();
              console.log(
                `✅ Appointment synced: amountPaid=${totalAmountPaid}, paymentStatus=${appointmentToUpdate.paymentStatus}, totalPay=${appointmentToUpdate.totalPay}`
              );

              // Cập nhật appointment object trong memory để đồng bộ
              appointment.amountPaid = totalAmountPaid;
              appointment.paymentStatus = appointmentToUpdate.paymentStatus;
              appointment.status = appointmentToUpdate.status;
            } else {
              console.error(
                `❌ Cannot find appointment ${appointmentIdToUpdate} to update`
              );
            }
          }
        } catch (appointmentUpdateError) {
          console.error(
            "❌ Error updating appointment:",
            appointmentUpdateError
          );
          console.error(
            "Appointment update error details:",
            appointmentUpdateError.message
          );
          // Không throw error vì payment đã thành công
        }

        console.log(
          `✅ Service payment processed successfully for appointment ${appointment._id}`
        );
        return {
          paid: true,
          orderCode,
          appointmentId: appointment._id,
          paymentId: payment._id,
          invoiceType: "service",
        };
      } else {
        // Booking payment: Update existing payment if found, or create new (legacy flow)
        // Khai báo các biến ở phạm vi rộng hơn để có thể sử dụng sau này
        let isPrePaymentFlow = false;
        let visitCreated = false;
        let createdAppointments = []; // Khai báo ở scope rộng để dùng khi gửi email
        
        if (existingPayment) {
          // Update existing payment
          payment = await Payment.findById(existingPayment._id);
          if (!payment) {
            return { already: true, orderCode };
          }

          // Check if this is a pre-payment flow (has appointmentData but no medicalVisitId)
          isPrePaymentFlow =
            payment.appointmentData &&
            payment.appointmentData.length > 0 &&
            !payment.medicalVisitId &&
            !payment.appointmentId &&
            (!payment.appointmentIds || payment.appointmentIds.length === 0);

          // IMPORTANT: Kiểm tra xem payment đã được xử lý chưa (idempotent check)
          // Nếu đã có medicalVisitId hoặc appointmentId/appointmentIds, nghĩa là đã được xử lý rồi
          if (payment.medicalVisitId || payment.appointmentId || (payment.appointmentIds && payment.appointmentIds.length > 0)) {
            console.log(`ℹ️ Payment already processed - has appointments/visit. Updating status only.`);
            // Chỉ cập nhật status nếu chưa captured
            if (payment.status !== "captured") {
              payment.status = "captured";
              payment.orderCode = orderCode;
              payment.providerTxnId = String(orderCode);
              payment.amountPaid = payment.total;
              payment.paidAt = new Date();
              payment.capturedAt = new Date();
              payment.pendingOrderCode = undefined;
              payment.gateway = "payos";
              payment.method = "qr";
              await payment.save();
              console.log(`✅ Payment status updated to captured: ${payment._id}`);
            }
            // Return success để tránh xử lý lại
            return {
              paid: true,
              orderCode,
              paymentId: payment._id,
              already: true,
              invoiceType: "booking",
            };
          }

          if (isPrePaymentFlow) {
            // Pre-payment flow: Create appointments after payment success
            console.log(
              `🔔 Processing pre-payment flow: Creating appointments from payment.appointmentData`
            );
            console.log(
              `🔔 Appointment data length: ${payment.appointmentData.length}`
            );

            const MedicalVisit = (
              await import("../models/medicalVisit.model.js")
            ).default;
            const Appointment = (await import("../models/appointment.model.js"))
              .default;
            const DoctorTimeSlot = (
              await import("../models/doctorTimeSlot.model.js")
            ).default;

            // Get patient from payment
            const patientId = payment.billTo.patientId;
            patient = await Patient.findById(patientId).populate("userId");
            if (!patient) {
              console.error(`❌ Patient not found: ${patientId}`);
              return { already: true, orderCode };
            }

            // Get self patient (the logged-in user's own profile) for fallback
            let selfPatient = null;
            if (patient.userId && patient.userId._id) {
              selfPatient = await Patient.findOne({
                userId: patient.userId._id,
                relationshipToOwner: "self",
              });
              if (!selfPatient) {
                selfPatient = patient;
              }
            } else {
              selfPatient = patient;
            }

            // Check if this is a single appointment (length === 1) or multiple appointments (length > 1)
            const isSingleAppointment = payment.appointmentData.length === 1;

            if (isSingleAppointment) {
              // Single appointment: Create appointment directly (no MedicalVisit)
              const aptData = payment.appointmentData[0];

              // Debug log để kiểm tra patientId trong appointmentData
              console.log("🔍 Webhook - Processing appointment data:", {
                appointmentId: aptData._id,
                doctorId: aptData.doctorId?.toString(),
                slotId: aptData.slotId?.toString(),
                patientIdFromData: aptData.patientId?.toString() || "NOT SET",
                selfPatientId: selfPatient._id.toString(),
                paymentId: payment._id.toString(),
              });

              // Validate patientId if provided (must belong to the same user)
              let targetPatientId = selfPatient._id; // Default to self patient
              if (aptData.patientId) {
                // Verify that the patientId belongs to the same user
                const familyPatient = await Patient.findOne({
                  _id: aptData.patientId,
                  userId: patient.userId._id, // Must belong to the same user
                }).lean();

                if (familyPatient) {
                  targetPatientId = familyPatient._id;
                  console.log(
                    `✅ Using family member patient: ${targetPatientId} (${familyPatient.relationshipToOwner})`
                  );
                } else {
                  console.warn(
                    `⚠️ Invalid patientId ${aptData.patientId} - not found or doesn't belong to user. Using self patient instead.`
                  );
                  // Fallback to self patient if validation fails
                  targetPatientId = selfPatient._id;
                }
              } else {
                console.log(
                  `ℹ️ No patientId in appointmentData, using self patient: ${targetPatientId}`
                );
              }

              const newAppointment = new Appointment({
                patientId: targetPatientId,
                doctorId: aptData.doctorId,
                slotId: aptData.slotId,
                mode: aptData.mode,
                clinicId: aptData.clinicId,
                scheduledStart: aptData.scheduledStart,
                scheduledEnd: aptData.scheduledEnd,
                status: "accepted",
                reason: aptData.reason || "",
                paymentStatus: "paid",
                paymentId: payment._id,
              });
              await newAppointment.save();
              appointment = newAppointment;
              console.log(
                `✅ Single appointment created: ${appointment._id} with patientId: ${targetPatientId}`
              );

              // Mark slot as "booked"
              if (aptData.slotId) {
                await DoctorTimeSlot.findByIdAndUpdate(aptData.slotId, {
                  status: "booked",
                  appointmentId: appointment._id,
                });
                console.log(`✅ Slot ${aptData.slotId} marked as booked`);
              }

              // Update payment with appointmentId (single appointment)
              payment.appointmentId = appointment._id;
              payment.status = "captured";
              payment.orderCode = orderCode;
              payment.providerTxnId = String(orderCode);
              payment.amountPaid = payment.total;
              payment.paidAt = new Date();
              payment.capturedAt = new Date();
              payment.pendingOrderCode = undefined;
              payment.gateway = "payos";
              payment.method = "qr";
              await payment.save();

              console.log(
                `✅ Single appointment pre-payment flow completed: Appointment ${appointment._id}`
              );

              // Get doctor for email
              doctor = await Doctor.findById(appointment.doctorId);

              // Send notification for appointment
              try {
                const { createBookingNotification } = await import(
                  "../services/notificationService.js"
                );
                await createBookingNotification(appointment._id, {
                  createdByManager: false,
                  paymentCompleted: true,
                });
                console.log(
                  `📬 Booking notification sent for appointment ${appointment._id}`
                );
              } catch (notificationError) {
                console.error(
                  "❌ Error sending booking notification:",
                  notificationError
                );
              }
            } else {
              // Multiple appointments: Create MedicalVisit and appointments
              console.log(`🔔 Multiple appointments pre-payment flow`);

              // Extract visitDate from first appointment's scheduledStart (or use current date)
              const firstAppointmentData = payment.appointmentData[0];
              const visitDate = firstAppointmentData.scheduledStart
                ? new Date(firstAppointmentData.scheduledStart)
                    .toISOString()
                    .split("T")[0]
                : new Date().toISOString().split("T")[0];

              // Create MedicalVisit
              const visitPatientId =
                firstAppointmentData.patientId || selfPatient._id;
              const visit = new MedicalVisit({
                patientId: visitPatientId,
                visitDate: visitDate,
                status: "scheduled", // All appointments are auto-accepted, so visit is scheduled
                appointmentIds: [],
                totalFee: payment.total,
                paymentStatus: "paid",
                paidAt: new Date(),
                createdBy: patient.userId?._id || patient.userId,
              });
              await visit.save();
              visitCreated = true;
              console.log(`✅ MedicalVisit created: ${visit._id}`);

              // Create all appointments from appointmentData
              // IMPORTANT: Với multiple appointments, KHÔNG set paymentId cho từng appointment
              // vì unique index chỉ cho phép 1 appointment có cùng paymentId
              // Thay vào đó, chỉ lưu paymentId trong payment.appointmentIds và payment.medicalVisitId
              // Sử dụng biến createdAppointments đã khai báo ở scope rộng hơn
              createdAppointments = [];
              for (const aptData of payment.appointmentData) {
                const targetPatientId = aptData.patientId || selfPatient._id;
                
                // Kiểm tra xem đã có appointment với visitId và slotId này chưa (idempotent)
                let existingAppointment = await Appointment.findOne({
                  visitId: visit._id,
                  slotId: aptData.slotId,
                });
                
                let newAppointment;
                if (existingAppointment) {
                  console.log(`ℹ️ Appointment already exists for visit ${visit._id} and slot ${aptData.slotId}, skipping creation`);
                  newAppointment = existingAppointment;
                  // Đảm bảo paymentStatus được set
                  if (newAppointment.paymentStatus !== "paid") {
                    newAppointment.paymentStatus = "paid";
                    await newAppointment.save();
                  }
                } else {
                  newAppointment = new Appointment({
                    visitId: visit._id,
                    patientId: targetPatientId,
                    doctorId: aptData.doctorId,
                    slotId: aptData.slotId,
                    mode: aptData.mode,
                    clinicId: aptData.clinicId,
                    scheduledStart: aptData.scheduledStart,
                    scheduledEnd: aptData.scheduledEnd,
                    status: "accepted",
                    reason: aptData.reason || "",
                    paymentStatus: "paid",
                    // KHÔNG set paymentId cho multiple appointments (unique index conflict)
                    // paymentId sẽ được lưu trong payment.appointmentIds
                  });
                  try {
                    await newAppointment.save();
                  } catch (error) {
                    // Nếu lỗi duplicate key hoặc lỗi khác, tìm appointment đã tồn tại
                    if (error.code === 11000) {
                      console.log(`⚠️ Duplicate key detected, finding existing appointment`);
                      existingAppointment = await Appointment.findOne({
                        visitId: visit._id,
                        slotId: aptData.slotId,
                      });
                      if (existingAppointment) {
                        newAppointment = existingAppointment;
                        // Đảm bảo paymentStatus được set
                        if (newAppointment.paymentStatus !== "paid") {
                          newAppointment.paymentStatus = "paid";
                          await newAppointment.save();
                        }
                        console.log(`✅ Found existing appointment: ${newAppointment._id}`);
                      } else {
                        throw error; // Re-throw nếu không tìm thấy
                      }
                    } else {
                      throw error; // Re-throw các lỗi khác
                    }
                  }
                }
                
                // Chỉ thêm vào visit.appointmentIds nếu chưa có
                if (!visit.appointmentIds.includes(newAppointment._id)) {
                  visit.appointmentIds.push(newAppointment._id);
                }
                createdAppointments.push(newAppointment);

                // Mark slot as "booked"
                if (aptData.slotId) {
                  await DoctorTimeSlot.findByIdAndUpdate(aptData.slotId, {
                    status: "booked",
                    appointmentId: newAppointment._id,
                  });
                  console.log(`✅ Slot ${aptData.slotId} marked as booked`);
                }
              }
              await visit.save();

              // Update payment with medicalVisitId and appointmentIds
              payment.medicalVisitId = visit._id;
              payment.appointmentIds = createdAppointments.map(
                (apt) => apt._id
              );
              payment.status = "captured";
              payment.orderCode = orderCode;
              payment.providerTxnId = String(orderCode);
              payment.amountPaid = payment.total;
              payment.paidAt = new Date();
              payment.capturedAt = new Date();
              payment.pendingOrderCode = undefined;
              payment.gateway = "payos";
              payment.method = "qr";
              await payment.save();

              // IMPORTANT: Populate appointments để có đầy đủ thông tin cho email
              const appointmentIds = createdAppointments.map(apt => apt._id);
              createdAppointments = await Appointment.find({
                _id: { $in: appointmentIds }
              })
                .populate("doctorId", "fullName specializationIds")
                .populate("patientId")
                .populate("clinicId", "name")
                .sort({ scheduledStart: 1 });

              console.log(
                `✅ Multiple appointments pre-payment flow completed: Visit ${visit._id} with ${createdAppointments.length} appointments`
              );
              console.log(`🔍 Populated appointments for email:`, {
                count: createdAppointments.length,
                appointmentIds: createdAppointments.map(apt => ({
                  id: apt._id,
                  doctor: apt.doctorId?.fullName || "N/A",
                  scheduledStart: apt.scheduledStart,
                })),
              });

              // Get first appointment and doctor for email (backward compatibility)
              const firstAppointment = createdAppointments[0];
              if (firstAppointment) {
                doctor = await Doctor.findById(firstAppointment.doctorId);
                appointment = firstAppointment;
              }
              
              // IMPORTANT: Đảm bảo payment đã được save với appointmentIds trước khi gửi email
              // Log để debug
              console.log(`🔍 Payment after creating appointments:`, {
                paymentId: payment._id,
                medicalVisitId: payment.medicalVisitId,
                appointmentIdsLength: payment.appointmentIds?.length || 0,
                appointmentIds: payment.appointmentIds,
                createdAppointmentsLength: createdAppointments.length,
              });
              
              // Đảm bảo payment object có đầy đủ thông tin (không reload vì có thể mất dữ liệu)
              // Payment đã được save ở trên với medicalVisitId và appointmentIds

              // Send notifications for all appointments
              try {
                const { createBookingNotification } = await import(
                  "../services/notificationService.js"
                );
                for (const apt of createdAppointments) {
                  await createBookingNotification(apt._id, {
                    createdByManager: false,
                    paymentCompleted: true,
                  });
                }
                console.log(
                  `📬 Booking notifications sent for ${createdAppointments.length} appointments`
                );
              } catch (notificationError) {
                console.error(
                  "❌ Error sending booking notifications:",
                  notificationError
                );
              }
            }
          } else {
            // Check if this is a medical visit payment (multiple appointments - existing flow)
            const isMedicalVisitPayment =
              payment.medicalVisitId && payment.appointmentIds?.length > 0;

            if (isMedicalVisitPayment) {
              // Medical visit payment (multiple appointments)
              console.log(
                `🔔 Processing medical visit payment: ${payment.medicalVisitId}`
              );

              // Update payment status
              payment.status = "captured";
              payment.orderCode = orderCode;
              payment.providerTxnId = String(orderCode);
              payment.amountPaid = payment.total;
              payment.paidAt = new Date();
              payment.capturedAt = new Date();
              payment.pendingOrderCode = undefined; // Clear pendingOrderCode
              payment.gateway = "payos";
              payment.method = "qr";
              await payment.save();

              // Update all appointments in appointmentIds array
              const Appointment = (
                await import("../models/appointment.model.js")
              ).default;
              const appointmentsToUpdate = await Appointment.find({
                _id: { $in: payment.appointmentIds },
              });

              for (const apt of appointmentsToUpdate) {
                apt.paymentStatus = "paid";
                apt.paymentId = payment._id;
                apt.pendingOrderCode = undefined;
                await apt.save();

                // Mark slot as "booked"
                if (apt.slotId) {
                  const DoctorTimeSlot = (
                    await import("../models/doctorTimeSlot.model.js")
                  ).default;
                  await DoctorTimeSlot.findByIdAndUpdate(apt.slotId, {
                    status: "booked",
                    appointmentId: apt._id,
                  });
                  console.log(
                    `✅ Slot ${apt.slotId} marked as booked after payment success`
                  );
                }
              }

              // Update MedicalVisit paymentStatus
              const MedicalVisit = (
                await import("../models/medicalVisit.model.js")
              ).default;
              const visit = await MedicalVisit.findById(payment.medicalVisitId);
              if (visit) {
                visit.paymentStatus = "paid";
                visit.paidAt = new Date();
                await visit.save();
                console.log(
                  `✅ MedicalVisit ${visit._id} paymentStatus updated to paid`
                );
              }

              // Get patient and first appointment for email
              const firstAppointment = appointmentsToUpdate[0];
              if (firstAppointment) {
                patient = await Patient.findById(
                  firstAppointment.patientId._id || firstAppointment.patientId
                ).populate("userId");
                doctor = await Doctor.findById(
                  firstAppointment.doctorId._id || firstAppointment.doctorId
                );
                appointment = firstAppointment; // For email sending
              }

              console.log(
                `✅ Medical visit payment processed successfully for ${appointmentsToUpdate.length} appointments`
              );
            } else {
              // Single appointment payment (existing flow)
              // Get patient and doctor for email
              if (appointment) {
                patient = await Patient.findById(
                  appointment.patientId._id || appointment.patientId
                ).populate("userId");
                doctor = await Doctor.findById(
                  appointment.doctorId._id || appointment.doctorId
                );
              }

              // Update payment status
              payment.status = "captured";
              payment.orderCode = orderCode;
              payment.providerTxnId = String(orderCode);
              payment.amountPaid = payment.total;
              payment.paidAt = new Date();
              payment.capturedAt = new Date();
              payment.pendingOrderCode = undefined; // Clear pendingOrderCode
              payment.gateway = "payos";
              payment.method = "qr";
              await payment.save();

              // Cập nhật trạng thái thanh toán của appointment
              if (appointment) {
                appointment.paymentStatus = "paid";
                appointment.paymentId = payment._id;
                appointment.pendingOrderCode = undefined; // Xóa pendingOrderCode
                await appointment.save();

                // Mark slot as "booked" after payment success (for manager booking)
                if (appointment.slotId) {
                  const DoctorTimeSlot = (
                    await import("../models/doctorTimeSlot.model.js")
                  ).default;
                  await DoctorTimeSlot.findByIdAndUpdate(appointment.slotId, {
                    status: "booked",
                    appointmentId: appointment._id,
                  });
                  console.log(
                    `✅ Slot ${appointment.slotId} marked as booked after payment success`
                  );
                }
              }
            }
          }
        } else {
          // Legacy patient booking flow: Create new payment record
          if (appointment) {
            patient = await Patient.findById(
              appointment.patientId._id
            ).populate("userId");
            doctor = await Doctor.findById(appointment.doctorId._id);

            const invoiceNumber = `INV-PAYOS-${orderCode}`;

            payment = new Payment({
              appointmentId: appointment._id,
              invoiceType: "booking",
              invoiceNumber,
              currency: "VND",
              issueDate: new Date(),
              billTo: {
                patientId: patient._id,
                name: patient.fullName || patient.userId?.fullName || "Unknown",
                email: patient.userId?.email,
                phone: patient.userId?.phoneNumber,
              },
              billFrom: {
                doctorId: doctor._id,
                clinicId: appointment.clinicId?._id,
                doctorName: doctor.fullName || "Unknown Doctor",
                clinicName: appointment.clinicId?.name || "Online Consultation",
              },
              items: [
                {
                  description: "Medical Consultation",
                  quantity: 1,
                  unitPrice: parseInt(amount),
                  lineTotal: parseInt(amount),
                },
              ],
              subtotal: parseInt(amount),
              discount: 0,
              total: parseInt(amount),
              gateway: "payos",
              method: "qr",
              status: "captured",
              orderCode: orderCode,
              providerTxnId: String(orderCode),
              paidAt: new Date(),
              capturedAt: new Date(),
            });

            await payment.save();

            // Cập nhật trạng thái thanh toán của appointment
            appointment.paymentStatus = "paid";
            appointment.paymentId = payment._id;
            appointment.pendingOrderCode = undefined; // Xóa pendingOrderCode
            await appointment.save();

            // Mark slot as "booked" after payment success
            if (appointment.slotId) {
              const DoctorTimeSlot = (
                await import("../models/doctorTimeSlot.model.js")
              ).default;
              await DoctorTimeSlot.findByIdAndUpdate(appointment.slotId, {
                status: "booked",
                appointmentId: appointment._id,
              });
              console.log(
                `✅ Slot ${appointment.slotId} marked as booked after payment success`
              );
            }
          }
        }

        // Gửi email thông báo thanh toán thành công cho khách hàng
        // Với multiple appointments, lấy tất cả appointments để hiển thị trong email
        if (payment && patient) {
          try {
            let appointmentsForEmail = [];
            let doctorForEmail = doctor;
            
            // Kiểm tra xem có multiple appointments không
            // Ưu tiên 1: Pre-payment flow với createdAppointments đã có sẵn
            if (createdAppointments && createdAppointments.length > 0) {
              // Pre-payment flow: dùng createdAppointments đã có sẵn (đã populate)
              appointmentsForEmail = createdAppointments;
              console.log(`📧 Using createdAppointments for email: ${appointmentsForEmail.length} appointments`);
              
              // Lấy doctor đầu tiên cho backward compatibility
              if (appointmentsForEmail.length > 0 && appointmentsForEmail[0].doctorId) {
                doctorForEmail = appointmentsForEmail[0].doctorId;
              }
            } 
            // Ưu tiên 2: Payment có medicalVisitId và appointmentIds
            else if (payment.medicalVisitId && payment.appointmentIds && payment.appointmentIds.length > 0) {
              // Multiple appointments - existing flow: lấy từ database
              const Appointment = (await import("../models/appointment.model.js")).default;
              appointmentsForEmail = await Appointment.find({
                _id: { $in: payment.appointmentIds }
              })
                .populate("doctorId", "fullName specializationIds")
                .populate("patientId")
                .populate("clinicId", "name")
                .sort({ scheduledStart: 1 }); // Sắp xếp theo thời gian
              
              console.log(`📧 Loaded appointments from database: ${appointmentsForEmail.length} appointments`);
              
              // Lấy doctor đầu tiên cho backward compatibility
              if (appointmentsForEmail.length > 0 && appointmentsForEmail[0].doctorId) {
                doctorForEmail = appointmentsForEmail[0].doctorId;
              }
            } 
            // Ưu tiên 3: Single appointment
            else if (appointment) {
              // Single appointment
              appointmentsForEmail = [appointment];
              console.log(`📧 Using single appointment for email`);
            }
            
            if (appointmentsForEmail.length > 0) {
              await sendPaymentConfirmationEmail(
                appointmentsForEmail,
                payment,
                patient,
                doctorForEmail
              );
              console.log(
                `📧 Payment confirmation email sent for ${appointmentsForEmail.length} appointment(s)`
              );

              // Create in-app notification for patient about successful payment
              try {
                const Notification = (await import("../models/notification.model.js")).default;
                const patientUserId = patient?.userId?._id || patient?.userId;
                
                if (patientUserId) {
                  // Format payment amount
                  const formattedAmount = new Intl.NumberFormat("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  }).format(payment.total);

                  // Get appointment info for notification
                  const firstAppointment = appointmentsForEmail[0];
                  const doctorName = firstAppointment?.doctorId?.fullName || "Bác sĩ";
                  const appointmentTime = firstAppointment?.scheduledStart 
                    ? new Date(firstAppointment.scheduledStart).toLocaleString("vi-VN", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "";

                  await Notification.create({
                    userId: patientUserId,
                    type: "payment",
                    title: "Thanh toán thành công",
                    message: `Bạn đã thanh toán thành công ${formattedAmount} cho lịch hẹn khám với BS. ${doctorName}${appointmentTime ? ` vào ${appointmentTime}` : ""}. Mã hóa đơn: ${payment.invoiceNumber}. Lịch hẹn đã được xác nhận.`,
                    priority: "high",
                    relatedId: payment._id,
                    relatedType: "payment",
                    metadata: {
                      paymentId: payment._id.toString(),
                      invoiceNumber: payment.invoiceNumber,
                      total: payment.total,
                      appointmentIds: appointmentsForEmail.map(apt => apt._id.toString()),
                      doctorName,
                      appointmentTime,
                      status: "paid",
                    },
                  });

                  console.log(
                    `✅ Created payment success notification for patient ${patientUserId}`
                  );
                }
              } catch (notificationError) {
                console.error(
                  "❌ Error creating payment success notification:",
                  notificationError
                );
                // Don't fail the whole process if notification fails
              }
            } else {
              console.log(`⚠️ No appointments found for email - payment:`, {
                paymentId: payment._id,
                hasMedicalVisitId: !!payment.medicalVisitId,
                appointmentIdsLength: payment.appointmentIds?.length || 0,
                hasAppointment: !!appointment,
                createdAppointmentsLength: createdAppointments?.length || 0,
              });
            }
          } catch (emailError) {
            console.error(
              "❌ Error sending payment confirmation email:",
              emailError
            );
          }
        } else {
          console.log(`⚠️ Cannot send email - missing payment or patient:`, {
            hasPayment: !!payment,
            hasPatient: !!patient,
          });
        }

        // Gửi notification cho doctor về lịch hẹn mới (sau khi thanh toán thành công)
        // Only send notification if appointment exists and not already sent in pre-payment flow
        if (appointment && !isPrePaymentFlow) {
          try {
            const { createBookingNotification } = await import(
              "../services/notificationService.js"
            );
            await createBookingNotification(appointment._id, {
              createdByManager: true,
              paymentCompleted: true,
            });
            console.log(
              `📬 Booking notification sent to doctor for appointment ${appointment._id}`
            );
          } catch (notificationError) {
            console.error(
              "❌ Error sending booking notification to doctor:",
              notificationError
            );
          }
        }

        if (appointment) {
          console.log(
            `✅ Booking payment processed successfully for appointment ${appointment._id}`
          );
          return {
            paid: true,
            orderCode,
            appointmentId: appointment._id,
            paymentId: payment._id,
            invoiceType: "booking",
          };
        } else {
          // Pre-payment flow: return success with visit info
          console.log(
            `✅ Pre-payment flow completed successfully: Payment ${payment._id}`
          );
          return {
            paid: true,
            orderCode,
            paymentId: payment._id,
            medicalVisitId: payment.medicalVisitId,
            invoiceType: "booking",
          };
        }
      }
    } else {
      // Payment failed
      console.log(`❌ Payment failed for orderCode: ${orderCode}`);

      if (isServicePayment) {
        // Service payment failed - cleanup payment record
        if (existingPayment) {
          try {
            const payment = await Payment.findById(existingPayment._id);
            if (payment) {
              payment.status = "failed";
              await payment.save();
              console.log(
                `❌ Service payment marked as failed: ${payment._id}`
              );
            }
          } catch (error) {
            console.error(`❌ Error updating service payment status:`, error);
          }
        }
        return { paid: false, orderCode, invoiceType: "service" };
      } else {
        // Booking payment failed - XÓA appointment và giải phóng slot
        if (appointment) {
          try {
            // Giải phóng time slot trước
            if (appointment.slotId) {
              await DoctorTimeSlot.findByIdAndUpdate(appointment.slotId, {
                status: "available",
              });
              console.log(
                `🔓 Released time slot ${appointment.slotId} for failed payment`
              );
            }

            // Xóa appointment
            await Appointment.findByIdAndDelete(appointment._id);
            console.log(
              `🗑️ Deleted appointment ${appointment._id} due to failed payment`
            );
          } catch (deleteError) {
            console.error(
              `❌ Error deleting appointment ${appointment._id}:`,
              deleteError
            );
          }
        }

        return {
          paid: false,
          orderCode,
          appointmentDeleted: true,
          invoiceType: "booking",
        };
      }
    }
  } catch (error) {
    console.error("❌ Error in handlePayosWebhook:", error);
    throw error;
  }
};

/**
 * Kiểm tra trạng thái thanh toán
 * @param {number} orderCode - Mã đơn hàng
 * @returns {object} - Thông tin thanh toán
 */
export const checkPaymentStatus = async (orderCode) => {
  try {
    const paymentInfo = await payos.paymentRequests.get(orderCode);
    return paymentInfo;
  } catch (error) {
    console.error("❌ Error checking payment status:", error);
    throw error;
  }
};

/**
 * Hủy link thanh toán
 * @param {number} orderCode - Mã đơn hàng
 * @returns {object} - Kết quả hủy
 */
export const cancelPaymentLink = async (orderCode) => {
  try {
    const result = await payos.paymentRequests.cancel(orderCode);
    console.log(
      `✅ PayOS payment request cancelled for orderCode: ${orderCode}`
    );
  } catch (error) {
    // PayOS có thể trả lỗi nếu đã cancel rồi hoặc chưa tồn tại
    // Không throw error vì chúng ta vẫn cần cleanup
    console.log(`⚠️ PayOS cancel status: ${error.message}`);
  }

  // Kiểm tra xem là service payment hay booking payment
  // Service payment: pendingOrderCode trong Payment record
  // Booking payment: pendingOrderCode trong Appointment record
  const servicePayment = await Payment.findOne({
    pendingOrderCode: orderCode,
    invoiceType: "service",
  });

  if (servicePayment) {
    // Service payment: đánh dấu payment là failed hoặc xóa nếu chưa thanh toán
    try {
      if (servicePayment.status === "initiated") {
        servicePayment.status = "failed";
        servicePayment.pendingOrderCode = undefined;
        await servicePayment.save();
        console.log(
          `❌ Service payment marked as failed: ${servicePayment._id}`
        );
      } else {
        // Nếu đã thanh toán, chỉ xóa pendingOrderCode
        servicePayment.pendingOrderCode = undefined;
        await servicePayment.save();
        console.log(
          `ℹ️ Cleared pendingOrderCode for paid service payment ${servicePayment._id}`
        );
      }
    } catch (error) {
      console.error(
        `❌ Error updating service payment ${servicePayment._id}:`,
        error
      );
    }
    return { success: true, orderCode, invoiceType: "service" };
  }

  // Booking payment: tìm appointment có pendingOrderCode này
  const appointment = await Appointment.findOne({
    pendingOrderCode: orderCode,
  });

  if (appointment) {
    // Nếu appointment chưa thanh toán, XÓA appointment và giải phóng slot
    if (appointment.paymentStatus === "unpaid" && !appointment.paymentId) {
      try {
        // Giải phóng time slot trước
        if (appointment.slotId) {
          await DoctorTimeSlot.findByIdAndUpdate(appointment.slotId, {
            status: "available",
          });
          console.log(
            `🔓 Released time slot ${appointment.slotId} for cancelled payment`
          );
        }

        // Xóa appointment
        await Appointment.findByIdAndDelete(appointment._id);
        console.log(
          `🗑️ Deleted appointment ${appointment._id} due to cancelled payment`
        );
      } catch (deleteError) {
        console.error(
          `❌ Error deleting appointment ${appointment._id}:`,
          deleteError
        );
        throw deleteError;
      }
    } else {
      // Nếu đã thanh toán, chỉ xóa pendingOrderCode
      appointment.pendingOrderCode = undefined;
      await appointment.save();
      console.log(
        `ℹ️ Cleared pendingOrderCode for paid appointment ${appointment._id}`
      );
    }
    return { success: true, orderCode, invoiceType: "booking" };
  }

  console.log(
    `ℹ️ No appointment or service payment found for orderCode: ${orderCode}`
  );
  return { success: true, orderCode };
};

/**
 * Gửi email xác nhận thanh toán và thông tin lịch hẹn cho khách hàng
 * @param {array|object} appointments - Appointment object hoặc array of appointments
 * @param {object} payment - Payment object
 * @param {object} patient - Patient object (có thể là người thân)
 * @param {object} doctor - Doctor object (cho backward compatibility)
 */
async function sendPaymentConfirmationEmail(
  appointments,
  payment,
  patient,
  doctor
) {
  // Normalize: nếu là single appointment, convert thành array
  const appointmentsArray = Array.isArray(appointments) ? appointments : [appointments];
  const firstAppointment = appointmentsArray[0];
  
  if (!firstAppointment) {
    console.log("⚠️ No appointments provided for email");
    return;
  }
  try {
    // Lấy email từ người đặt (owner), không phải từ người thân
    let patientEmail = null;
    let ownerName = null;
    let isFamilyMemberBooking = false;
    let familyMemberName = null;

    // Kiểm tra xem patient có phải là người thân không
    // Lấy patient từ appointment đầu tiên để đảm bảo đúng patient của appointment
    let actualPatient = patient;
    if (firstAppointment && firstAppointment.patientId) {
      const Patient = (await import("../models/patient.model.js")).default;
      const appointmentPatientId = firstAppointment.patientId._id || firstAppointment.patientId;
      const appointmentPatient = await Patient.findById(appointmentPatientId).populate("userId");
      if (appointmentPatient) {
        actualPatient = appointmentPatient;
      }
    }

    // Kiểm tra relationshipToOwner - chỉ khi có giá trị VÀ không phải "self" thì mới là người thân
    // Nếu relationshipToOwner là undefined, null, hoặc "self" → đặt cho chính mình
    const relationship = actualPatient.relationshipToOwner;
    const isFamilyMember = relationship && relationship !== "self";

    // Debug log
    console.log("📧 Email debug - Patient info:", {
      patientId: actualPatient._id?.toString(),
      fullName: actualPatient.fullName,
      relationshipToOwner: relationship,
      isFamilyMember: isFamilyMember,
      hasUserId: !!actualPatient.userId,
      userIdEmail: actualPatient.userId?.email,
    });

    if (isFamilyMember) {
      // Đây là người thân, cần lấy email từ owner
      isFamilyMemberBooking = true;
      familyMemberName = actualPatient.fullName;
      
      // Lấy owner (self patient) từ userId
      if (actualPatient.userId && actualPatient.userId._id) {
        const Patient = (await import("../models/patient.model.js")).default;
        const selfPatient = await Patient.findOne({
          userId: actualPatient.userId._id,
          relationshipToOwner: "self",
        }).populate("userId");
        
        if (selfPatient && selfPatient.userId && selfPatient.userId.email) {
          patientEmail = selfPatient.userId.email;
          ownerName = selfPatient.fullName || selfPatient.userId.fullName || "Khách hàng";
        } else {
          // Fallback: thử lấy từ actualPatient.userId trực tiếp
          patientEmail = actualPatient.userId.email;
          ownerName = actualPatient.userId.fullName || "Khách hàng";
        }
      }
    } else {
      // Đây là đặt cho chính mình
      patientEmail = actualPatient.userId?.email;
      ownerName = actualPatient.fullName || actualPatient.userId?.fullName || "Khách hàng";
    }

    if (!patientEmail) {
      console.log("⚠️ No email address found for patient, skipping email");
      return;
    }

    // Lấy thông tin specialization cho doctor đầu tiên (backward compatibility)
    const Specialization = (await import("../models/specialization.model.js"))
      .default;
    let specializationName = "Chuyên khoa";
    if (doctor && doctor.specializationIds && doctor.specializationIds.length > 0) {
      const spec = await Specialization.findById(doctor.specializationIds[0]);
      if (spec) {
        specializationName = spec.name;
      }
    }

    // Kiểm tra xem có nhiều appointments không
    const hasMultipleAppointments = appointmentsArray.length > 1;
    
    // Format appointments để hiển thị trong email
    let appointmentsHtml = "";
    
    // Populate specialization cho tất cả appointments
    for (const apt of appointmentsArray) {
      if (apt.doctorId && apt.doctorId.specializationIds && apt.doctorId.specializationIds.length > 0) {
        const spec = await Specialization.findById(apt.doctorId.specializationIds[0]);
        if (spec) {
          apt.specializationName = spec.name;
        }
      }
    }
    
    if (hasMultipleAppointments) {
      // Hiển thị tất cả appointments
      appointmentsHtml = appointmentsArray.map((apt, index) => {
        const aptDate = new Date(apt.scheduledStart);
        const formattedAptDate = aptDate.toLocaleDateString("vi-VN", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        const formattedAptTime = aptDate.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        });
        
        // Lấy thông tin doctor
        const aptDoctor = apt.doctorId?._id ? apt.doctorId : apt.doctorId;
        const aptDoctorName = aptDoctor?.fullName || "Unknown Doctor";
        const aptSpecializationName = apt.specializationName || "Chuyên khoa";
        
        return `
          <div style="background-color: #f0f0f0; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #667eea;">
            <h4 style="margin-top: 0; color: #667eea;">Lịch hẹn ${index + 1}</h4>
            <div class="info-row">
              <span class="info-label">Bác sĩ:</span>
              <span class="info-value">${aptDoctorName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Chuyên khoa:</span>
              <span class="info-value">${aptSpecializationName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Ngày hẹn:</span>
              <span class="info-value">${formattedAptDate}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Giờ hẹn:</span>
              <span class="info-value">${formattedAptTime}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Hình thức:</span>
              <span class="info-value">${apt.mode === "online" ? "Khám trực tuyến" : "Khám tại phòng khám"}</span>
            </div>
            ${apt.clinicId?.name ? `
            <div class="info-row">
              <span class="info-label">Phòng khám:</span>
              <span class="info-value">${apt.clinicId.name}</span>
            </div>
            ` : ""}
            ${apt.reason ? `
            <div class="info-row">
              <span class="info-label">Lý do khám:</span>
              <span class="info-value">${apt.reason}</span>
            </div>
            ` : ""}
          </div>
        `;
      }).join("");
    } else {
      // Single appointment - format như cũ
      const appointmentDate = new Date(firstAppointment.scheduledStart);
      const formattedDate = appointmentDate.toLocaleDateString("vi-VN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const formattedTime = appointmentDate.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
      
      appointmentsHtml = `
        <div class="info-row">
          <span class="info-label">Ngày hẹn:</span>
          <span class="info-value">${formattedDate}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Giờ hẹn:</span>
          <span class="info-value">${formattedTime}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Bác sĩ:</span>
          <span class="info-value">${doctor?.fullName || "Unknown Doctor"}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Chuyên khoa:</span>
          <span class="info-value">${specializationName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Hình thức khám:</span>
          <span class="info-value">${firstAppointment.mode === "online" ? "Khám trực tuyến" : "Khám tại phòng khám"}</span>
        </div>
        ${firstAppointment.clinicId?.name ? `
        <div class="info-row">
          <span class="info-label">Phòng khám:</span>
          <span class="info-value">${firstAppointment.clinicId.name}</span>
        </div>
        ` : ""}
        ${firstAppointment.reason ? `
        <div class="info-row">
          <span class="info-label">Lý do khám:</span>
          <span class="info-value">${firstAppointment.reason}</span>
        </div>
        ` : ""}
      `;
    }

    // Format số tiền
    const formattedAmount = new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(payment.total);

    // Template email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Xác nhận thanh toán - MedConnect</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
          }
          .container {
            background-color: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
          }
          .content {
            padding: 30px 20px;
          }
          .success-badge {
            display: inline-block;
            background-color: #52c41a;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            margin-bottom: 20px;
          }
          .info-section {
            background-color: #f9f9f9;
            border-left: 4px solid #667eea;
            padding: 20px;
            margin: 20px 0;
            border-radius: 5px;
          }
          .info-section h3 {
            margin-top: 0;
            color: #667eea;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
          }
          .info-row:last-child {
            border-bottom: none;
          }
          .info-label {
            font-weight: bold;
            color: #666;
          }
          .info-value {
            color: #333;
          }
          .invoice-section {
            background-color: #fff8e1;
            border: 2px solid #ffc107;
            padding: 20px;
            margin: 20px 0;
            border-radius: 5px;
          }
          .invoice-section h3 {
            margin-top: 0;
            color: #f57c00;
          }
          .invoice-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
          }
          .invoice-total {
            border-top: 2px solid #f57c00;
            margin-top: 10px;
            padding-top: 10px;
            font-size: 18px;
            font-weight: bold;
            color: #f57c00;
          }
          .button {
            display: inline-block;
            background-color: #667eea;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 10px 10px 0;
            text-align: center;
          }
          .button:hover {
            background-color: #5568d3;
          }
          .footer {
            background-color: #f9f9f9;
            padding: 20px;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
          .footer a {
            color: #667eea;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>MedConnect</h1>
            <p style="margin: 10px 0 0 0;">Hệ thống đặt lịch khám bệnh trực tuyến</p>
          </div>
          
          <div class="content">
            <div class="success-badge">✓ Thanh toán thành công</div>
            
            <p>Xin chào <strong>${ownerName}</strong>,</p>
            
            ${
              isFamilyMemberBooking
                ? `<p>Cảm ơn bạn đã sử dụng dịch vụ của MedConnect. Thanh toán của bạn đã được xác nhận thành công. Lịch hẹn khám cho <strong>${familyMemberName}</strong> đã được đặt và đang chờ bác sĩ xác nhận.</p>`
                : `<p>Cảm ơn bạn đã sử dụng dịch vụ của MedConnect. Thanh toán của bạn đã được xác nhận thành công. Lịch hẹn khám của bạn đã được đặt và đang chờ bác sĩ xác nhận.</p>`
            }
            
            <div class="info-section">
              <h3>📅 Thông tin lịch hẹn${hasMultipleAppointments ? ` (${appointmentsArray.length} lịch hẹn)` : ""}</h3>
              ${
                isFamilyMemberBooking
                  ? `
              <div class="info-row">
                <span class="info-label">Người khám:</span>
                <span class="info-value">${familyMemberName}</span>
              </div>
              `
                  : ""
              }
              ${appointmentsHtml}
            </div>
            
            <div class="invoice-section">
              <h3>🧾 Hóa đơn thanh toán</h3>
              <div class="invoice-row">
                <span class="info-label">Mã đơn hàng:</span>
                <span class="info-value">${payment.orderCode}</span>
              </div>
              <div class="invoice-row">
                <span class="info-label">Mã hóa đơn:</span>
                <span class="info-value">${payment.invoiceNumber}</span>
              </div>
              <div class="invoice-row">
                <span class="info-label">Ngày thanh toán:</span>
                <span class="info-value">${new Date(
                  payment.paidAt
                ).toLocaleDateString("vi-VN")}</span>
              </div>
              <div class="invoice-row">
                <span class="info-label">Phương thức thanh toán:</span>
                <span class="info-value">PayOS (QR Code)</span>
              </div>
              <div class="invoice-row">
                <span class="info-label">Dịch vụ:</span>
                <span class="info-value">Tư vấn y tế</span>
              </div>
              <div class="invoice-row invoice-total">
                <span class="info-label">Tổng tiền:</span>
                <span class="info-value">${formattedAmount}</span>
              </div>
            </div>
            
            <div style="margin: 30px 0;">
              <p><strong>Lưu ý quan trọng:</strong></p>
              <ul style="color: #666;">
                <li>Vui lòng đến khám đúng giờ hẹn hoặc chuẩn bị sẵn sàng cho cuộc gọi trực tuyến</li>
                <li>Mang theo CMND/CCCD khi khám tại phòng khám</li>
                <li>Bác sĩ có thể liên hệ với bạn trước giờ hẹn</li>
                <li>Bạn có thể theo dõi trạng thái lịch hẹn trong ứng dụng</li>
              </ul>
            </div>
            
            <p>Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi qua email hoặc hotline hỗ trợ.</p>
            
            <p>Chúc bạn sức khỏe tốt!</p>
            <p><strong>Trân trọng,<br>Đội ngũ MedConnect</strong></p>
          </div>
          
          <div class="footer">
            <p>Email này được gửi tự động từ hệ thống MedConnect.</p>
            <p>© ${new Date().getFullYear()} MedConnect. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendMail({
      to: patientEmail,
      subject: `Xác nhận thanh toán và lịch hẹn - ${payment.invoiceNumber}`,
      html: emailHtml,
    });

    console.log(
      `📧 Payment confirmation email sent successfully to ${patientEmail}`
    );
  } catch (error) {
    console.error("❌ Error in sendPaymentConfirmationEmail:", error);
    throw error;
  }
}

/**
 * Gửi email xác nhận thanh toán dịch vụ cho bệnh nhân
 * @param {object} appointment - Appointment object
 * @param {object} payment - Payment object (service type)
 * @param {object} patient - Patient object
 * @param {object} doctor - Doctor object
 */
async function sendServicePaymentConfirmationEmail(
  appointment,
  payment,
  patient,
  doctor
) {
  try {
    // Đơn giản hóa logic - giống sendPaymentConfirmationEmail
    const patientEmail = patient.userId?.email;
    if (!patientEmail) {
      console.error("❌ No email address found for patient, skipping email");
      console.error("Patient debug:", {
        hasPatient: !!patient,
        hasUserId: !!patient?.userId,
        userIdType: patient?.userId ? typeof patient.userId : "null",
        userIdEmail: patient?.userId?.email || "NOT FOUND",
        patientEmailField: patient?.email || "NOT FOUND",
      });
      return;
    }

    console.log(`📧 Sending service payment email to: ${patientEmail}`);

    // Lấy thông tin specialization
    const Specialization = (await import("../models/specialization.model.js"))
      .default;
    let specializationName = "Chuyên khoa";
    if (doctor.specializationIds && doctor.specializationIds.length > 0) {
      const spec = await Specialization.findById(doctor.specializationIds[0]);
      if (spec) {
        specializationName = spec.name;
      }
    }

    // Format ngày giờ
    const appointmentDate = new Date(appointment.scheduledStart);
    const formattedDate = appointmentDate.toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const formattedTime = appointmentDate.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Format số tiền
    const formattedAmount = new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(payment.total);

    // Format danh sách dịch vụ
    const servicesList = payment.items
      .map(
        (item, index) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${
            index + 1
          }</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${
            item.description
          }</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${new Intl.NumberFormat(
            "vi-VN",
            {
              style: "currency",
              currency: "VND",
            }
          ).format(item.unitPrice)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${
            item.quantity
          }</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${new Intl.NumberFormat(
            "vi-VN",
            {
              style: "currency",
              currency: "VND",
            }
          ).format(item.lineTotal)}</td>
        </tr>
      `
      )
      .join("");

    // Template email HTML - giống với booking payment
    const emailHtml = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Xác nhận thanh toán dịch vụ - MedConnect</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
          }
          .container {
            background-color: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
          }
          .content {
            padding: 30px 20px;
          }
          .success-badge {
            display: inline-block;
            background-color: #52c41a;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            margin-bottom: 20px;
          }
          .info-section {
            background-color: #f9f9f9;
            border-left: 4px solid #667eea;
            padding: 20px;
            margin: 20px 0;
            border-radius: 5px;
          }
          .info-section h3 {
            margin-top: 0;
            color: #667eea;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
          }
          .info-row:last-child {
            border-bottom: none;
          }
          .info-label {
            font-weight: bold;
            color: #666;
          }
          .info-value {
            color: #333;
          }
          .invoice-section {
            background-color: #fff8e1;
            border: 2px solid #ffc107;
            padding: 20px;
            margin: 20px 0;
            border-radius: 5px;
          }
          .invoice-section h3 {
            margin-top: 0;
            color: #f57c00;
          }
          .invoice-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
          }
          .invoice-total {
            border-top: 2px solid #f57c00;
            margin-top: 10px;
            padding-top: 10px;
            font-size: 18px;
            font-weight: bold;
            color: #f57c00;
          }
          .services-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
          }
          .services-table th {
            background-color: #f57c00;
            color: white;
            padding: 10px;
            text-align: left;
            font-weight: bold;
          }
          .services-table td {
            padding: 8px;
            border-bottom: 1px solid #eee;
          }
          .button {
            display: inline-block;
            background-color: #667eea;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 10px 10px 0;
            text-align: center;
          }
          .button:hover {
            background-color: #5568d3;
          }
          .footer {
            background-color: #f9f9f9;
            padding: 20px;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
          .footer a {
            color: #667eea;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>MedConnect</h1>
            <p style="margin: 10px 0 0 0;">Hệ thống đặt lịch khám bệnh trực tuyến</p>
          </div>
          
          <div class="content">
            <div class="success-badge">✓ Thanh toán dịch vụ thành công</div>
            
            <p>Xin chào <strong>${
              patient.fullName || "Khách hàng"
            }</strong>,</p>
            
            <p>Cảm ơn bạn đã sử dụng dịch vụ của MedConnect. Thanh toán dịch vụ của bạn đã được xác nhận thành công.</p>
            
            <div class="info-section">
              <h3>📅 Thông tin lịch hẹn</h3>
              <div class="info-row">
                <span class="info-label">Ngày hẹn:</span>
                <span class="info-value">${formattedDate}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Giờ hẹn:</span>
                <span class="info-value">${formattedTime}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Bác sĩ:</span>
                <span class="info-value">${
                  doctor.fullName || "Unknown Doctor"
                }</span>
              </div>
              <div class="info-row">
                <span class="info-label">Chuyên khoa:</span>
                <span class="info-value">${specializationName}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Hình thức khám:</span>
                <span class="info-value">${
                  appointment.mode === "online"
                    ? "Khám trực tuyến"
                    : "Khám tại phòng khám"
                }</span>
              </div>
              ${
                appointment.clinicId && appointment.clinicId.name
                  ? `
              <div class="info-row">
                <span class="info-label">Phòng khám:</span>
                <span class="info-value">${appointment.clinicId.name}</span>
              </div>
              `
                  : ""
              }
              ${
                appointment.reason
                  ? `
              <div class="info-row">
                <span class="info-label">Lý do khám:</span>
                <span class="info-value">${appointment.reason}</span>
              </div>
              `
                  : ""
              }
            </div>
            
            <div class="invoice-section">
              <h3>🧾 Hóa đơn thanh toán</h3>
              <div class="invoice-row">
                <span class="info-label">Mã đơn hàng:</span>
                <span class="info-value">${payment.orderCode || "N/A"}</span>
              </div>
              <div class="invoice-row">
                <span class="info-label">Mã hóa đơn:</span>
                <span class="info-value">${payment.invoiceNumber}</span>
              </div>
              <div class="invoice-row">
                <span class="info-label">Ngày thanh toán:</span>
                <span class="info-value">${
                  payment.paidAt
                    ? new Date(payment.paidAt).toLocaleDateString("vi-VN")
                    : new Date().toLocaleDateString("vi-VN")
                }</span>
              </div>
              <div class="invoice-row">
                <span class="info-label">Phương thức thanh toán:</span>
                <span class="info-value">PayOS (QR Code)</span>
              </div>
              <div class="invoice-row">
                <span class="info-label">Loại hóa đơn:</span>
                <span class="info-value">Thanh toán dịch vụ</span>
              </div>
              
              <h4 style="margin-top: 20px; margin-bottom: 10px; color: #f57c00;">Danh sách dịch vụ đã sử dụng:</h4>
              <table class="services-table">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Tên dịch vụ</th>
                    <th>Đơn giá</th>
                    <th>Số lượng</th>
                    <th>Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  ${servicesList}
                </tbody>
              </table>
              
              <div class="invoice-row invoice-total">
                <span class="info-label">Tổng tiền:</span>
                <span class="info-value">${formattedAmount}</span>
              </div>
            </div>
            
            <div style="margin: 30px 0;">
              <p><strong>Lưu ý quan trọng:</strong></p>
              <ul style="color: #666;">
                <li>Hóa đơn này đã được thanh toán đầy đủ</li>
                <li>Bạn có thể lưu email này làm biên lai thanh toán</li>
                <li>Nếu có thắc mắc, vui lòng liên hệ với phòng khám</li>
                <li>Bạn có thể theo dõi thông tin lịch hẹn trong ứng dụng</li>
              </ul>
            </div>
            
            <p>Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi qua email hoặc hotline hỗ trợ.</p>
            
            <p>Chúc bạn sức khỏe tốt!</p>
            <p><strong>Trân trọng,<br>Đội ngũ MedConnect</strong></p>
          </div>
          
          <div class="footer">
            <p>Email này được gửi tự động từ hệ thống MedConnect.</p>
            <p>© ${new Date().getFullYear()} MedConnect. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendMail({
      to: patientEmail,
      subject: `Xác nhận thanh toán dịch vụ - ${payment.invoiceNumber}`,
      html: emailHtml,
    });

    console.log(
      `✅ Service payment confirmation email sent successfully to ${patientEmail}`
    );
  } catch (error) {
    console.error("❌ Error in sendServicePaymentConfirmationEmail:", error);
    throw error;
  }
}

/**
 * Gửi email thông báo hoàn thành cuộc hẹn cho bệnh nhân
 * Hỗ trợ cả single và multiple appointments, và đặt cho người thân
 * @param {array|object} appointments - Appointment object hoặc array of appointments
 * @param {object} patient - Patient object (có thể là người thân)
 * @param {object} doctor - Doctor object (cho backward compatibility)
 */
export async function sendAppointmentCompletedEmail(
  appointments,
  patient,
  doctor
) {
  // Normalize: nếu là single appointment, convert thành array
  const appointmentsArray = Array.isArray(appointments) ? appointments : [appointments];
  const firstAppointment = appointmentsArray[0];
  
  if (!firstAppointment) {
    console.log("⚠️ No appointments provided for completion email");
    return;
  }
  
  try {
    // Lấy email từ người đặt (owner), không phải từ người thân
    let patientEmail = null;
    let ownerName = null;
    let isFamilyMemberBooking = false;
    let familyMemberName = null;

    // Kiểm tra xem patient có phải là người thân không
    // Lấy patient từ appointment đầu tiên để đảm bảo đúng patient của appointment
    let actualPatient = patient;
    if (firstAppointment && firstAppointment.patientId) {
      const Patient = (await import("../models/patient.model.js")).default;
      const appointmentPatientId = firstAppointment.patientId._id || firstAppointment.patientId;
      const appointmentPatient = await Patient.findById(appointmentPatientId).populate("userId");
      if (appointmentPatient) {
        actualPatient = appointmentPatient;
      }
    }

    // Kiểm tra relationshipToOwner - chỉ khi có giá trị VÀ không phải "self" thì mới là người thân
    // Nếu relationshipToOwner là undefined, null, hoặc "self" → đặt cho chính mình
    const relationship = actualPatient.relationshipToOwner;
    const isFamilyMember = relationship && relationship !== "self";

    // Debug log
    console.log("📧 Completion email debug - Patient info:", {
      patientId: actualPatient._id?.toString(),
      fullName: actualPatient.fullName,
      relationshipToOwner: relationship,
      isFamilyMember: isFamilyMember,
      hasUserId: !!actualPatient.userId,
      userIdEmail: actualPatient.userId?.email,
    });

    if (isFamilyMember) {
      // Đây là người thân, cần lấy email từ owner
      isFamilyMemberBooking = true;
      familyMemberName = actualPatient.fullName;
      
      // Lấy owner (self patient) từ userId
      if (actualPatient.userId && actualPatient.userId._id) {
        const Patient = (await import("../models/patient.model.js")).default;
        const selfPatient = await Patient.findOne({
          userId: actualPatient.userId._id,
          relationshipToOwner: "self",
        }).populate("userId");
        
        if (selfPatient && selfPatient.userId && selfPatient.userId.email) {
          patientEmail = selfPatient.userId.email;
          ownerName = selfPatient.fullName || selfPatient.userId.fullName || "Khách hàng";
        } else {
          // Fallback: thử lấy từ actualPatient.userId trực tiếp
          patientEmail = actualPatient.userId.email;
          ownerName = actualPatient.userId.fullName || "Khách hàng";
        }
      }
    } else {
      // Đây là đặt cho chính mình
      patientEmail = actualPatient.userId?.email;
      ownerName = actualPatient.fullName || actualPatient.userId?.fullName || "Khách hàng";
    }

    if (!patientEmail) {
      console.log("⚠️ No email address found for patient, skipping completion email");
      return;
    }

    // Lấy thông tin specialization cho doctor đầu tiên (backward compatibility)
    const Specialization = (await import("../models/specialization.model.js"))
      .default;
    let specializationName = "Chuyên khoa";
    if (doctor && doctor.specializationIds && doctor.specializationIds.length > 0) {
      const spec = await Specialization.findById(doctor.specializationIds[0]);
      if (spec) {
        specializationName = spec.name;
      }
    }

    // Kiểm tra xem có nhiều appointments không
    const hasMultipleAppointments = appointmentsArray.length > 1;
    
    // Format appointments để hiển thị trong email
    let appointmentsHtml = "";
    
    // Populate specialization cho tất cả appointments
    for (const apt of appointmentsArray) {
      if (apt.doctorId && apt.doctorId.specializationIds && apt.doctorId.specializationIds.length > 0) {
        const spec = await Specialization.findById(apt.doctorId.specializationIds[0]);
        if (spec) {
          apt.specializationName = spec.name;
        }
      }
    }
    
    if (hasMultipleAppointments) {
      // Hiển thị tất cả appointments
      appointmentsHtml = appointmentsArray.map((apt, index) => {
        const aptDate = new Date(apt.scheduledStart);
        const aptEndDate = apt.scheduledEnd ? new Date(apt.scheduledEnd) : aptDate;
        const formattedAptDate = aptDate.toLocaleDateString("vi-VN", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        const formattedAptTime = `${aptDate.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        })} - ${aptEndDate.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        })}`;
        
        // Lấy thông tin doctor
        const aptDoctor = apt.doctorId?._id ? apt.doctorId : apt.doctorId;
        const aptDoctorName = aptDoctor?.fullName || "Unknown Doctor";
        const aptSpecializationName = apt.specializationName || "Chuyên khoa";
        const aptModeText = apt.mode === "online" ? "Khám trực tuyến" : "Khám tại phòng khám";
        
        return `
          <div style="background-color: #ecfdf5; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #059669;">
            <h4 style="margin-top: 0; color: #047857;">Lịch hẹn ${index + 1}</h4>
            <p style="margin: 8px 0;"><strong>Bác sĩ:</strong> ${aptDoctorName}</p>
            <p style="margin: 8px 0;"><strong>Chuyên khoa:</strong> ${aptSpecializationName}</p>
            <p style="margin: 8px 0;"><strong>Ngày khám:</strong> ${formattedAptDate}</p>
            <p style="margin: 8px 0;"><strong>Giờ:</strong> ${formattedAptTime}</p>
            <p style="margin: 8px 0;"><strong>Hình thức:</strong> ${aptModeText}</p>
            ${apt.clinicId?.name ? `<p style="margin: 8px 0;"><strong>Phòng khám:</strong> ${apt.clinicId.name}</p>` : ""}
            ${apt.reason ? `<p style="margin: 8px 0;"><strong>Lý do khám:</strong> ${apt.reason}</p>` : ""}
          </div>
        `;
      }).join("");
    } else {
      // Single appointment - format như cũ
      const appointmentDate = new Date(firstAppointment.scheduledStart);
      const appointmentEndDate = firstAppointment.scheduledEnd 
        ? new Date(firstAppointment.scheduledEnd) 
        : appointmentDate;
      const formattedDate = appointmentDate.toLocaleDateString("vi-VN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const formattedTime = `${appointmentDate.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      })} - ${appointmentEndDate.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
      const modeText = firstAppointment.mode === "online" ? "Khám trực tuyến" : "Khám tại phòng khám";
      
      appointmentsHtml = `
        <p style="margin: 8px 0;"><strong>Bác sĩ:</strong> ${doctor?.fullName || "Unknown Doctor"}</p>
        <p style="margin: 8px 0;"><strong>Chuyên khoa:</strong> ${specializationName}</p>
        <p style="margin: 8px 0;"><strong>Ngày khám:</strong> ${formattedDate}</p>
        <p style="margin: 8px 0;"><strong>Giờ:</strong> ${formattedTime}</p>
        <p style="margin: 8px 0;"><strong>Hình thức:</strong> ${modeText}</p>
        ${firstAppointment.clinicId?.name ? `<p style="margin: 8px 0;"><strong>Phòng khám:</strong> ${firstAppointment.clinicId.name}</p>` : ""}
        ${firstAppointment.reason ? `<p style="margin: 8px 0;"><strong>Lý do khám:</strong> ${firstAppointment.reason}</p>` : ""}
      `;
    }

    // Template email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Hoàn thành khám bệnh - MedConnect</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
          }
          .container {
            background-color: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #059669 0%, #047857 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
          }
          .content {
            padding: 30px 20px;
          }
          .success-badge {
            display: inline-block;
            background-color: #059669;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            margin-bottom: 20px;
          }
          .info-section {
            background-color: #ecfdf5;
            border-left: 4px solid #059669;
            padding: 20px;
            margin: 20px 0;
            border-radius: 5px;
          }
          .info-section h3 {
            margin-top: 0;
            color: #047857;
          }
          .reminder-section {
            background-color: #fffbeb;
            border-left: 4px solid #f59e0b;
            padding: 20px;
            margin: 20px 0;
            border-radius: 5px;
          }
          .reminder-section h3 {
            margin-top: 0;
            color: #d97706;
          }
          .reminder-section ul {
            margin: 10px 0;
            padding-left: 20px;
          }
          .button {
            display: inline-block;
            background-color: #0ea5e9;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 10px 10px 0;
            text-align: center;
          }
          .button:hover {
            background-color: #0284c7;
          }
          .footer {
            background-color: #f9f9f9;
            padding: 20px;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
          .footer a {
            color: #667eea;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>MedConnect</h1>
            <p style="margin: 10px 0 0 0;">Hệ thống đặt lịch khám bệnh trực tuyến</p>
          </div>
          
          <div class="content">
            <div class="success-badge">✓ Hoàn thành khám bệnh</div>
            
            <p>Xin chào <strong>${ownerName}</strong>,</p>
            
            ${
              isFamilyMemberBooking
                ? `<p>Cảm ơn bạn đã sử dụng dịch vụ khám bệnh của MedConnect. Chúng tôi xin thông báo rằng <strong style="color: #059669;">buổi khám của <strong>${familyMemberName}</strong> đã hoàn thành</strong>.</p>`
                : `<p>Cảm ơn bạn đã sử dụng dịch vụ khám bệnh của MedConnect. Chúng tôi xin thông báo rằng <strong style="color: #059669;">buổi khám của bạn đã hoàn thành</strong>.</p>`
            }
            
            <div class="info-section">
              <h3>📅 Thông tin buổi khám${hasMultipleAppointments ? ` (${appointmentsArray.length} lịch hẹn)` : ""}</h3>
              ${
                isFamilyMemberBooking
                  ? `<p style="margin: 8px 0;"><strong>Người khám:</strong> ${familyMemberName}</p>`
                  : ""
              }
              ${appointmentsHtml}
            </div>

            <div class="info-section" style="background-color: #f0f9ff; border-left-color: #0ea5e9;">
              <h3 style="color: #0284c7;">📋 Hồ sơ bệnh án</h3>
              <p style="margin: 0;">Hồ sơ bệnh án ${
                isFamilyMemberBooking ? `của ${familyMemberName} ` : ""
              }đã được cập nhật và lưu trữ trong hệ thống. Bạn có thể xem chi tiết trong phần "Hồ sơ bệnh án" trên ứng dụng MedConnect.</p>
            </div>

            <div class="reminder-section">
              <h3>💡 Lời nhắc</h3>
              <ul>
                <li>Vui lòng tuân thủ theo đơn thuốc và chỉ dẫn của bác sĩ</li>
                <li>Đặt lịch hẹn tái khám nếu cần thiết</li>
                <li>Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ với bác sĩ hoặc phòng khám</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${
                process.env.CLIENT_URL || "http://localhost:5173"
              }/benh-an" 
                 class="button">
                Xem hồ sơ bệnh án
              </a>
            </div>
            
            <p style="margin-top: 30px;">Chúng tôi hy vọng bạn đã có trải nghiệm tốt với dịch vụ của MedConnect. Chúc bạn luôn khỏe mạnh!</p>
            
            <p style="margin-top: 30px;"><strong>Trân trọng,<br>Đội ngũ MedConnect</strong></p>
          </div>
          
          <div class="footer">
            <p>Email này được gửi tự động từ hệ thống MedConnect.</p>
            <p>© ${new Date().getFullYear()} MedConnect. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendMail({
      to: patientEmail,
      subject: `Hoàn thành khám bệnh - MedConnect${hasMultipleAppointments ? ` (${appointmentsArray.length} lịch hẹn)` : ""}`,
      html: emailHtml,
    });

    console.log(
      `📧 Appointment completion email sent successfully to ${patientEmail} for ${appointmentsArray.length} appointment(s)`
    );
  } catch (error) {
    console.error("❌ Error in sendAppointmentCompletedEmail:", error);
    throw error;
  }
}