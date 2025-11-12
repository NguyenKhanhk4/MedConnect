import express from "express";
import { authGuard } from "../middleware/auth.js";
import {
  requestReschedule,
  getRescheduleRequests,
  approveReschedule,
  rejectReschedule,
  getPatientRescheduleRequests,
} from "../controllers/rescheduleController.js";

const router = express.Router();

// All routes require authentication
router.use(authGuard);

// Patient routes
router.post("/request", requestReschedule);
router.get("/patient/requests", getPatientRescheduleRequests);

// Doctor routes
router.get("/requests", getRescheduleRequests);
router.put("/:requestId/approve", approveReschedule);
router.put("/:requestId/reject", rejectReschedule);

export default router;
