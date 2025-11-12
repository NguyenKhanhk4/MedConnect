import Notification from "../models/notification.model.js";
import mongoose from "mongoose";
import { ok, fail } from "../utils/response.js";
import { ERROR_CODES } from "../constants/index.js";

/**
 * Get notifications for current user
 */
export async function getNotifications(req, res) {
  try {
    const appUserId = req.user?.app_user_id;
    if (!appUserId) {
      return fail(res, 401, ERROR_CODES.UNAUTHORIZED, "User not authenticated");
    }

    const { page = 1, limit = 20, type, isRead } = req.query;
    const skip = (page - 1) * limit;

    // Convert appUserId to ObjectId for proper matching
    let userId;
    try {
      if (typeof appUserId === "string") {
        userId = new mongoose.Types.ObjectId(appUserId);
      } else {
        userId = appUserId;
      }
    } catch (error) {
      console.error("❌ Invalid userId format:", appUserId);
      return fail(
        res,
        400,
        ERROR_CODES.INVALID_INPUT,
        "Invalid user ID format"
      );
    }

    const filter = { userId: userId };

    if (type && type !== "all") {
      filter.type = type;
    }

    if (isRead !== undefined) {
      filter.isRead = isRead === "true";
    }

    console.log(`🔔 Fetching notifications for userId: ${userId}`);
    console.log(`🔔 Filter:`, filter);

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Notification.countDocuments(filter);

    console.log(
      `✅ Found ${notifications.length} notifications (total: ${total}) for userId: ${userId}`
    );

    return ok(res, {
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (e) {
    console.error("❌ getNotifications error:", e);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, e.message || String(e));
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(req, res) {
  try {
    const appUserId = req.user?.app_user_id;
    if (!appUserId) {
      return fail(res, 401, ERROR_CODES.UNAUTHORIZED, "User not authenticated");
    }

    const { notificationId } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId: appUserId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return fail(res, 404, ERROR_CODES.NOT_FOUND, "Notification not found");
    }

    return ok(res, { notification });
  } catch (e) {
    console.error("❌ markNotificationAsRead error:", e);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, e.message || String(e));
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(req, res) {
  try {
    const appUserId = req.user?.app_user_id;
    if (!appUserId) {
      return fail(res, 401, ERROR_CODES.UNAUTHORIZED, "User not authenticated");
    }

    const result = await Notification.updateMany(
      { userId: appUserId, isRead: false },
      { isRead: true }
    );

    return ok(res, {
      message: "All notifications marked as read",
      modifiedCount: result.modifiedCount,
    });
  } catch (e) {
    console.error("❌ markAllNotificationsAsRead error:", e);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, e.message || String(e));
  }
}

/**
 * Create notification (internal use)
 */
export async function createNotification(notificationData) {
  try {
    const notification = await Notification.create(notificationData);
    return notification;
  } catch (e) {
    console.error("❌ createNotification error:", e);
    throw e;
  }
}

/**
 * Get unread count for user
 */
export async function getUnreadCount(req, res) {
  try {
    const appUserId = req.user?.app_user_id;
    if (!appUserId) {
      return fail(res, 401, ERROR_CODES.UNAUTHORIZED, "User not authenticated");
    }

    const count = await Notification.countDocuments({
      userId: appUserId,
      isRead: false,
    });

    return ok(res, { unreadCount: count });
  } catch (e) {
    console.error("❌ getUnreadCount error:", e);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, e.message || String(e));
  }
}
