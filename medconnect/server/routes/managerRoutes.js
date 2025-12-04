import express from "express";
import { authGuard } from "../middleware/auth.js";
import {
  getAllDoctorsForManager,
  getDoctorTimeSlotsForManager,
  getAppointmentDetailForManager,
  createAppointmentByManager,
  generateSlotsForManager,
  deleteTimeSlotForManager,
  blockSingleSlotForManager,
  blockSlotsByDateRangeForManager,
  unblockSlotsByDateRangeForManager,
  rescheduleAppointmentByManager,
  getManagerInvoices,
  deleteManagerInvoice,
  getAllPatientsForManager,
  getEducationLevelPrices,
  setEducationLevelPrice,
  deleteEducationLevelPrice,
  getPendingServicePayments,
  processCashPayment,
  createBankTransferPayment,
  createBookingPaymentByManager,
  getAllAppointmentsForManager,
} from "../controllers/managerController.js";
import {
  getLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest,
} from "../controllers/leaveRequestController.js";
import {
  getAllServicePrices,
  getServicePriceById,
  createServicePrice,
  updateServicePrice,
  deleteServicePrice,
} from "../controllers/servicePriceController.js";

const router = express.Router();

// All manager routes require authentication and manager role check
// Manager role check should be done in middleware if needed

router.get("/doctors", authGuard, getAllDoctorsForManager);
router.get("/patients", authGuard, getAllPatientsForManager);
router.get(
  "/doctors/:doctorId/time-slots",
  authGuard,
  getDoctorTimeSlotsForManager
);
router.post(
  "/doctors/:doctorId/generate-slots",
  authGuard,
  generateSlotsForManager
);
router.delete(
  "/doctors/:doctorId/time-slots/:slotId",
  authGuard,
  deleteTimeSlotForManager
);
router.post(
  "/doctors/:doctorId/time-slots/:slotId/block",
  authGuard,
  blockSingleSlotForManager
);
router.post(
  "/doctors/:doctorId/time-slots/block",
  authGuard,
  blockSlotsByDateRangeForManager
);
router.post(
  "/doctors/:doctorId/time-slots/unblock",
  authGuard,
  unblockSlotsByDateRangeForManager
);
router.get(
  "/appointments/:appointmentId",
  authGuard,
  getAppointmentDetailForManager
);
router.get("/appointments", authGuard, getAllAppointmentsForManager);
router.post("/appointments", authGuard, createAppointmentByManager);
router.put(
  "/appointments/:appointmentId/reschedule",
  authGuard,
  rescheduleAppointmentByManager
);

// Booking payment - creates payment BEFORE appointment (appointment created after payment success)
router.post("/booking-payments", authGuard, createBookingPaymentByManager);

// Leave request routes
router.get("/leave-requests", authGuard, getLeaveRequests);
router.post(
  "/leave-requests/:leaveRequestId/approve",
  authGuard,
  approveLeaveRequest
);
router.post(
  "/leave-requests/:leaveRequestId/reject",
  authGuard,
  rejectLeaveRequest
);

// Service price management routes (only for manager)
router.get("/service-prices", authGuard, getAllServicePrices);
router.get("/service-prices/:id", authGuard, getServicePriceById);
router.post("/service-prices", authGuard, createServicePrice);
router.put("/service-prices/:id", authGuard, updateServicePrice);
router.delete("/service-prices/:id", authGuard, deleteServicePrice);

// Invoice management routes (only for manager)
router.get("/invoices", authGuard, getManagerInvoices);
router.delete("/invoices/:invoiceId", authGuard, deleteManagerInvoice);

// Service payment management routes (only for manager)
router.get("/service-payments/pending", authGuard, getPendingServicePayments);
router.post("/service-payments/:paymentId/cash", authGuard, processCashPayment);
router.post(
  "/service-payments/:paymentId/bank-transfer",
  authGuard,
  createBankTransferPayment
);

// Education level price routes
router.get("/education-level-prices", authGuard, getEducationLevelPrices);
router.post("/education-level-prices", authGuard, setEducationLevelPrice);
router.delete(
  "/education-level-prices/:id",
  authGuard,
  deleteEducationLevelPrice
);

export default router;
