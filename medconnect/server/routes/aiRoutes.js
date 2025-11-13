import express from "express";
import {
  createConversation,
  sendMessage,
  getConversationMessages,
  getUserConversations,
  deleteConversation,
} from "../controllers/aiController.js";
import { authGuard, optionalAuth } from "../middleware/auth.js";

const aiRouter = express.Router();

// Tất cả routes đều có thể dùng không cần auth (cho guest users)
// Nhưng nếu có auth thì sẽ lưu userId/patientId

// Tạo conversation mới
aiRouter.post("/conversations", optionalAuth, createConversation);

// Gửi message - sử dụng optionalAuth để kiểm tra trạng thái đăng nhập
aiRouter.post("/messages", optionalAuth, sendMessage);

// Lấy messages của conversation
aiRouter.get("/conversations/:conversationId/messages", getConversationMessages);

// Lấy danh sách conversations của user (cần auth)
aiRouter.get("/conversations", authGuard, getUserConversations);

// Xóa conversation
aiRouter.delete("/conversations/:conversationId", deleteConversation);

export default aiRouter;

