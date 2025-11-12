import express from "express";
import {
  createReview,
  getReviewsByDoctor,
  getReviewsByPatient,
} from "../controllers/reviewController.js";
import { authGuard } from "../middleware/auth.js";

const router = express.Router();

// Tạo đánh giá mới (chỉ bệnh nhân)
router.post("/", authGuard, createReview);

// Lấy đánh giá theo bác sĩ (public)
router.get("/doctor/:doctorId", getReviewsByDoctor);

// Lấy đánh giá theo bệnh nhân (chỉ bệnh nhân đó)
router.get("/patient", authGuard, getReviewsByPatient);

export default router;
