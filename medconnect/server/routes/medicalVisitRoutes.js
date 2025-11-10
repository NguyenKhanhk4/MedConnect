/* =======================================================
 * Medical Visit Routes
 * Routes cho luồng đặt lịch mới với phiên khám
 * ======================================================= */

import express from "express";
import {
  getOrCreateVisit,
  getAvailableDoctorsAndSlots,
  addAppointmentToVisit,
  completePlanningAndCreateVisit,
  calculatePaymentSummary,
  doctorApproveAppointment,
  checkTimeConflicts,
  replaceRejectedAppointment,
  getVisitDetails,
  getDoctorPendingAppointments,
  cancelAppointmentInVisit,
  getPatientVisits,
  getPaymentSummary,
  createPaymentForVisit,
} from "../controllers/medicalVisitController.js";
import { authGuard } from "../middleware/auth.js";

const router = express.Router();

// Bệnh nhân: Lấy danh sách tất cả visits
router.get("/", authGuard, getPatientVisits);

// Bệnh nhân: Tạo hoặc lấy phiên khám trong ngày
router.get("/get-or-create", authGuard, getOrCreateVisit);

// Bệnh nhân: Lấy danh sách bác sĩ và time slots theo chuyên khoa
router.get("/available-doctors", authGuard, getAvailableDoctorsAndSlots);

// Bệnh nhân: Thêm appointment vào visit
router.post("/add-appointment", authGuard, addAppointmentToVisit);

// Bệnh nhân: Hoàn thành planning và tính toán payment summary (NEW FLOW - không tạo visit/appointments)
router.post("/complete-planning", authGuard, completePlanningAndCreateVisit);

// Bệnh nhân: Tính toán payment summary từ appointments data (NEW FLOW)
router.post("/calculate-payment-summary", authGuard, calculatePaymentSummary);

// Bệnh nhân: Tạo payment cho appointments (NEW FLOW - pre-payment)
router.post("/create-payment", authGuard, createPaymentForVisit);

// Bệnh nhân: Kiểm tra xung đột trùng giờ
router.get("/check-conflicts", authGuard, checkTimeConflicts);

// Bệnh nhân: Thay thế appointment bị từ chối
router.post("/replace-appointment", authGuard, replaceRejectedAppointment);

// Bệnh nhân: Hủy appointment trong visit
router.post("/cancel-appointment", authGuard, cancelAppointmentInVisit);

// Bác sĩ: Lấy danh sách appointments cần duyệt (đặt trước /:visitId để tránh conflict)
router.get("/doctor/pending-appointments", authGuard, getDoctorPendingAppointments);

// Bác sĩ: Duyệt appointment (accept/reject)
router.post("/doctor/approve-appointment", authGuard, doctorApproveAppointment);

// IMPORTANT: Payment routes must be BEFORE /:visitId route to avoid route conflicts
// Express matches routes in order, so more specific routes (like /:visitId/payment-summary) 
// should be defined BEFORE generic routes (like /:visitId)
// However, Express doesn't support nested route params like /:visitId/payment-summary
// We need to use a different approach: check the full path in the route handler

// Bệnh nhân: Lấy payment summary cho visit (BACKWARD COMPATIBILITY - for existing visits)
router.get("/:visitId/payment-summary", authGuard, getPaymentSummary);

// Bệnh nhân: Tạo payment cho visit (BACKWARD COMPATIBILITY - for existing visits)
router.post("/:visitId/create-payment", authGuard, createPaymentForVisit);

// Bệnh nhân: Lấy chi tiết visit (đặt CUỐI CÙNG vì có param :visitId)
router.get("/:visitId", authGuard, getVisitDetails);

export default router;

