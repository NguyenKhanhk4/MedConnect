import express from "express";
import {
  createPayosPaymentLinkController,
  handlePayosWebhookController,
  checkPaymentStatusController,
  cancelPaymentLinkController,
} from "../controllers/payos.controller.js";
import { authGuard } from "../middleware/auth.js";

const router = express.Router();

// Tạo link thanh toán (yêu cầu authentication)
router.post("/create-payment", authGuard, createPayosPaymentLinkController);

// Webhook từ PayOS (server-to-server, không cần auth)
router.post("/webhook", handlePayosWebhookController);

// Kiểm tra trạng thái thanh toán (yêu cầu authentication)
router.get("/check-status/:orderCode", authGuard, checkPaymentStatusController);

// Hủy link thanh toán (yêu cầu authentication)
router.post("/cancel/:orderCode", authGuard, cancelPaymentLinkController);

export default router;

