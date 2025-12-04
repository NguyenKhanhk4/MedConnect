import express from "express";
import { authGuard } from "../../middleware/auth.js";
import {
  // Dashboard controllers
  getDashboardStats,
  getDashboardActivities,
  getSystemStatus,

  // Doctors controllers
  getAllDoctors,
  getPendingDoctors,
  getVerifiedDoctors,
  getRejectedDoctors,
  approveDoctor,
  rejectDoctor,

  // Users controllers
  getAllUsers,
  banUser,
  suspendUser,
  activateUser,
  getUserDetails,
  updateUser,
  changeUserPassword,
  deleteUser,
  createUser,

  // Specializations controllers
  getAllSpecializations,
  addSpecialization,
  updateSpecialization,
  getDoctorsBySpecialization,
  deleteSpecialization,

  // Appointments controllers
  getAllAppointments,
  updateAppointmentStatus,
  deleteAppointment,

  // Cleanup controller
  cleanupUnpaidAppointments,

  // Payment revenue controller
  getPaymentRevenueStats,
  getAdminInvoices,
  
  // Statistics controller
  getStatistics,
  
  // Top patients controller
  getTop5PatientsByVisitCount
} from '../../controllers/adminController.js';

const adminRouter = express.Router();

// Apply auth middleware to all admin routes
adminRouter.use(authGuard);

// ================== DASHBOARD ROUTES ==================
adminRouter.get("/dashboard/stats", getDashboardStats);
adminRouter.get("/dashboard/activities", getDashboardActivities);
adminRouter.get("/dashboard/system-status", getSystemStatus);

// ================== DOCTORS ROUTES ==================
adminRouter.get("/doctors", getAllDoctors);
adminRouter.get("/doctors/pending", getPendingDoctors);
adminRouter.get("/doctors/verified", getVerifiedDoctors);
adminRouter.get("/doctors/rejected", getRejectedDoctors);
adminRouter.post("/doctors/:id/approve", approveDoctor);
adminRouter.post("/doctors/:id/reject", rejectDoctor);

// ================== USERS ROUTES ==================
adminRouter.get("/users", getAllUsers);
adminRouter.post("/users", createUser);
adminRouter.get("/users/:id", getUserDetails);
adminRouter.put("/users/:id", updateUser);
adminRouter.put("/users/:id/password", changeUserPassword);
adminRouter.delete("/users/:id", deleteUser);
adminRouter.post("/users/:id/ban", banUser);
adminRouter.post("/users/:id/suspend", suspendUser);
adminRouter.post("/users/:id/activate", activateUser);

// ================== SPECIALIZATIONS ROUTES ==================
adminRouter.get("/specializations", getAllSpecializations);
adminRouter.post("/specializations", addSpecialization);
adminRouter.put("/specializations/:id", updateSpecialization);
adminRouter.get("/specializations/:id/doctors", getDoctorsBySpecialization);
adminRouter.delete("/specializations/:id", deleteSpecialization);

// ================== APPOINTMENTS ROUTES ==================
adminRouter.get("/appointments", getAllAppointments);
adminRouter.put("/appointments/:id/status", updateAppointmentStatus);
adminRouter.delete("/appointments/:id", deleteAppointment);

// ================== CLEANUP ROUTES ==================
adminRouter.post("/cleanup/unpaid-appointments", cleanupUnpaidAppointments);

// ================== PAYMENT ROUTES ==================
adminRouter.get("/payment/revenue-stats", getPaymentRevenueStats);
adminRouter.get("/payment/invoices", getAdminInvoices);

// ================== STATISTICS ROUTES ==================
adminRouter.get('/statistics', getStatistics);

// ================== PATIENTS ROUTES ==================
adminRouter.get('/patients/top-5-visits', getTop5PatientsByVisitCount);

export default adminRouter;
