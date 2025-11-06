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
 * Tạo link thanh toán PayOS cho appointment
 * @param {string} userId - ID của user
 * @param {object} paymentData - Dữ liệu thanh toán {appointmentId, amount, description}
 * @returns {string} - URL thanh toán
 */
export const createPayosPaymentLink = async (userId, paymentData) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid User ID");
  }

  const {
    appointmentId,
    amount,
    description = "Payment for appointment",
  } = paymentData || {};

  if (!appointmentId) throw new Error("Appointment ID không được trống");
  if (!amount || amount <= 0) throw new Error("Số tiền không hợp lệ");

  // Kiểm tra appointment tồn tại và thuộc về user
  const appointment = await Appointment.findById(appointmentId)
    .populate("patientId")
    .populate("doctorId")
    .populate("clinicId");

  if (!appointment) throw new Error("Appointment not found");

  // Kiểm tra xem patient có thuộc về user này không
  // Support family member booking: patient should belong to the user OR any of user's patients
  const patient = await Patient.findOne({ userId: userId }).populate("userId");
  if (!patient) throw new Error("Patient not found");

  // Get the appointment's patient
  const appointmentPatient = await Patient.findById(appointment.patientId._id);
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
  const orderCode = Number(String(Date.now()).slice(-10));

  // Kiểm tra xem đã thanh toán thành công chưa
  const existingPayment = await Payment.findOne({ appointmentId });
  if (
    existingPayment &&
    ["captured", "authorized"].includes(existingPayment.status)
  ) {
    throw new Error("Appointment already paid");
  }

  // Lưu orderCode vào appointment (chưa tạo payment record)
  appointment.pendingOrderCode = orderCode;
  await appointment.save();

  const payosPaymentData = {
    orderCode,
    amount: parseInt(amount),
    description: `MedConnect ${String(orderCode).slice(-8)}`, // Max 25 chars (18 chars)
    returnUrl: `${process.env.FRONTEND_URL}/dat-lich/payment-result?status=success&orderCode=${orderCode}`,
    cancelUrl: `${process.env.FRONTEND_URL}/dat-lich/payment-result?status=failed&cancel=true&orderCode=${orderCode}`,
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

    // Chỉ xử lý payment cho appointment (check cả "MedConnect" và "MC" cho service payment)
    const desc = String(description || "");
    console.log(`🔔 Webhook description check:`, {
      description: desc,
      includesMedConnect: desc.includes("MedConnect"),
      includesMCService: desc.includes("MC Service"),
    });

    if (!desc.includes("MedConnect") && !desc.includes("MC Service")) {
      console.log(`⚠️ Webhook ignored: Not an appointment payment`);
      return { ignored: true, message: "Not an appointment payment" };
    }

    // Phân biệt booking payment và service payment
    // Booking payment: orderCode lưu trong appointment.pendingOrderCode, description: "MedConnect ..."
    // Service payment: orderCode lưu trong payment.pendingOrderCode, description: "MC Service ..." hoặc "MedConnect Service ..."
    const isServicePayment =
      desc.includes("Service") || desc.includes("MC Service");
    console.log(`🔔 Payment type detected:`, {
      isServicePayment,
      orderCode,
      description: desc,
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
      // Booking payment: Tìm payment bằng pendingOrderCode (manager booking flow)
      // Hoặc tìm appointment bằng pendingOrderCode (legacy patient booking flow)
      existingPayment = await Payment.findOne({
        pendingOrderCode: orderCode,
        invoiceType: "booking",
      }).lean();

      if (existingPayment) {
        console.log(`✅ Found booking payment: ${existingPayment._id}`);

        // Check if already captured
        if (existingPayment.status === "captured") {
          console.log(
            `ℹ️ Booking payment already captured: ${existingPayment._id}`
          );
          return { already: true, orderCode, paymentId: existingPayment._id };
        }

        // Get appointment from payment
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
        if (existingPayment) {
          // Manager booking flow: Update existing payment
          payment = await Payment.findById(existingPayment._id);
          if (!payment) {
            return { already: true, orderCode };
          }

          // Get patient and doctor for email
          patient = await Patient.findById(
            appointment.patientId._id || appointment.patientId
          ).populate("userId");
          doctor = await Doctor.findById(
            appointment.doctorId._id || appointment.doctorId
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
        } else {
          // Legacy patient booking flow: Create new payment record
          patient = await Patient.findById(appointment.patientId._id).populate(
            "userId"
          );
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
        }

        // Cập nhật trạng thái thanh toán của appointment
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

        // Gửi email thông báo thanh toán thành công cho khách hàng
        try {
          await sendPaymentConfirmationEmail(
            appointment,
            payment,
            patient,
            doctor
          );
          console.log(
            `📧 Payment confirmation email sent for appointment ${appointment._id}`
          );
        } catch (emailError) {
          console.error(
            "❌ Error sending payment confirmation email:",
            emailError
          );
        }

        // Gửi notification cho doctor về lịch hẹn mới (sau khi thanh toán thành công)
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
 * @param {object} appointment - Appointment object
 * @param {object} payment - Payment object
 * @param {object} patient - Patient object
 * @param {object} doctor - Doctor object
 */
async function sendPaymentConfirmationEmail(
  appointment,
  payment,
  patient,
  doctor
) {
  try {
    const patientEmail = patient.userId?.email;
    if (!patientEmail) {
      console.log("⚠️ No email address found for patient, skipping email");
      return;
    }

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
            
            <p>Xin chào <strong>${
              patient.fullName || "Khách hàng"
            }</strong>,</p>
            
            <p>Cảm ơn bạn đã sử dụng dịch vụ của MedConnect. Thanh toán của bạn đã được xác nhận thành công. Lịch hẹn khám của bạn đã được đặt và đang chờ bác sĩ xác nhận.</p>
            
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
