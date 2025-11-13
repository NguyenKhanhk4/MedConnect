import express from "express";
const apiRouter = express.Router();
import authRouter from "./authRoutes.js";
import doctorRouter from "./doctors/doctor.Routes.js";
import notificationRouter from "./notificationRoutes.js";
import specializationRouter from "./specializations/specialization.route.js";
import patientRouter from "./patientRoutes.js";
import usersRouter from "./users/user.route.js";
import adminRouter from "./admin/admin.routes.js";
import clinicRouter from "./clinicRoutes.js";
import reviewRouter from "./reviewRoutes.js";
import rescheduleRouter from "./rescheduleRoutes.js";
import videoCallRouter from "./videoCallRoutes.js";
import payosRouter from "./payos.routes.js";
import medicalVisitRouter from "./medicalVisitRoutes.js";
import managerRouter from "./managerRoutes.js";
import aiRouter from "./aiRoutes.js";
import { getAllAppointments } from "../controllers/doctorController.js";
import { getAppointmentBySlotId } from "../controllers/appointmentController.js";

// Health check endpoint
apiRouter.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "API is healthy",
    timestamp: new Date().toISOString(),
  });
});

// Auth routes (register, login, forgot/reset password, etc.)
apiRouter.use("/auth", authRouter);
// Patient routes
apiRouter.use("/patients", patientRouter);
apiRouter.use("/specializations", specializationRouter); // Mount specialization router at /api/specializations
// Users routes
apiRouter.use("/users", usersRouter);
console.log("[router] mounted /api/auth");

// Doctor routes
apiRouter.use("/doctors", doctorRouter);
console.log("[router] mounted /api/doctors");

// Appointments routes (public for fallback)
apiRouter.get("/appointments", getAllAppointments);
apiRouter.get("/appointments/slot/:slotId", getAppointmentBySlotId);
console.log("[router] mounted /api/appointments");

// Notification routes
apiRouter.use("/notifications", notificationRouter);
console.log("[router] mounted /api/notifications");

// Admin routes
apiRouter.use("/admin", adminRouter);
console.log("[router] mounted /api/admin");

// Clinic routes
apiRouter.use("/clinics", clinicRouter);
console.log("[router] mounted /api/clinics");

// Review routes
apiRouter.use("/reviews", reviewRouter);
console.log("[router] mounted /api/reviews");

// Reschedule routes
apiRouter.use("/reschedule", rescheduleRouter);
console.log("[router] mounted /api/reschedule");

// Video call routes
apiRouter.use("/video-calls", videoCallRouter);
console.log("[router] mounted /api/video-calls");

// PayOS payment routes
apiRouter.use("/payments/payos", payosRouter);
console.log("[router] mounted /api/payments/payos");

// Medical Visit routes (new appointment flow with visit grouping)
apiRouter.use("/medical-visits", medicalVisitRouter);
console.log("[router] mounted /api/medical-visits");
// Manager routes
apiRouter.use("/managers", managerRouter);
console.log("[router] mounted /api/managers");

// AI routes
apiRouter.use("/ai", aiRouter);
console.log("[router] mounted /api/ai");

// Public service prices route (for doctor to get active services)
import { getActiveServicePrices } from "../controllers/servicePriceController.js";
apiRouter.get("/service-prices/active", getActiveServicePrices);
console.log("[router] mounted /api/service-prices/active");

//admin
// apiRouter.use("/doctor", adminRouter);
// //staff
// apiRouter.use("/staff", staffRouter);
// //common
// apiRouter.use("/common", commonRouter);

export default apiRouter;
