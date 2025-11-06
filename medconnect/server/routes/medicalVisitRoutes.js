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
  doctorApproveAppointment,
  checkTimeConflicts,
  replaceRejectedAppointment,
  getVisitDetails,
  getDoctorPendingAppointments,
  cancelAppointmentInVisit,
  getPatientVisits,
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

// Bệnh nhân: Hoàn thành planning và tạo visit với tất cả appointments (status pending_doctor)
router.post("/complete-planning", authGuard, completePlanningAndCreateVisit);

// Bệnh nhân: Kiểm tra xung đột trùng giờ
router.get("/check-conflicts", authGuard, checkTimeConflicts);

// Bệnh nhân: Thay thế appointment bị từ chối
router.post("/replace-appointment", authGuard, replaceRejectedAppointment);

// Bệnh nhân: Hủy appointment trong visit
router.post("/cancel-appointment", authGuard, cancelAppointmentInVisit);

// Bệnh nhân: Lấy chi tiết visit
router.get("/:visitId", authGuard, getVisitDetails);

// Bác sĩ: Lấy danh sách appointments cần duyệt
router.get("/doctor/pending-appointments", authGuard, getDoctorPendingAppointments);

// Bác sĩ: Duyệt appointment (accept/reject)
router.post("/doctor/approve-appointment", authGuard, doctorApproveAppointment);

export default router;

