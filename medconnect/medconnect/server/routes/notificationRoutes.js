import express from "express";
import { authGuard } from "../middleware/auth.js";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadCount
} from "../controllers/notificationController.js";

const router = express.Router();

// All routes require authentication
router.use(authGuard);

// Notification routes
router.get("/", getNotifications);
router.get("/unread-count", getUnreadCount);
router.put("/:notificationId/read", markNotificationAsRead);
router.put("/read-all", markAllNotificationsAsRead);

export default router;
