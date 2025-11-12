import express from "express";
import {
  getAllClinics,
  getClinicById,
  createClinic,
  updateClinic,
  deleteClinic,
  getUniqueLocations,
} from "../controllers/clinicController.js";
import { authGuard } from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.get("/", getAllClinics);
router.get("/locations", getUniqueLocations); // Get unique locations
router.get("/:id", getClinicById);

// Protected routes (require authentication)
router.post("/", authGuard, createClinic);
router.put("/:id", authGuard, updateClinic);
router.delete("/:id", authGuard, deleteClinic);

export default router;
