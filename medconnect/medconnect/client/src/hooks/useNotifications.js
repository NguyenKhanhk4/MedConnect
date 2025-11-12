import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { message } from "antd";

/**
 * Custom hook to fetch and manage notifications
 * @returns {Object} { notifications, loading, error, unreadCount, markAsRead, markAllAsRead, refreshNotifications }
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get("/api/notifications");

      if (response.success) {
        setNotifications(response.data.notifications || []);
        return response.data.notifications || [];
      } else {
        const errorMsg = response.message || "Không thể tải thông báo";
        setError(new Error(errorMsg));
        message.error(errorMsg);
        return [];
      }
    } catch (err) {
      const errorMsg = "Không thể tải thông báo";
      setError(err);
      message.error(errorMsg);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get("/api/notifications/unread-count");
      if (response.success) {
        setUnreadCount(response.data.unreadCount || 0);
        return response.data.unreadCount || 0;
      }
      return 0;
    } catch (err) {
      console.error("Error fetching unread count:", err);
      return 0;
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const response = await api.put(
        `/api/notifications/${notificationId}/read`
      );
      if (response.success) {
        setNotifications((prev) =>
          prev.map((notif) =>
            notif._id === notificationId ? { ...notif, isRead: true } : notif
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        return true;
      }
      return false;
    } catch (err) {
      console.error("Error marking notification as read:", err);
      return false;
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await api.put("/api/notifications/read-all");
      if (response.success) {
        setNotifications((prev) =>
          prev.map((notif) => ({ ...notif, isRead: true }))
        );
        setUnreadCount(0);
        message.success("Đã đánh dấu tất cả thông báo là đã đọc");
        return true;
      }
      return false;
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
      message.error("Không thể đánh dấu tất cả thông báo");
      return false;
    }
  };

  const refreshNotifications = async () => {
    await Promise.all([fetchNotifications(), fetchUnreadCount()]);
  };

  useEffect(() => {
    refreshNotifications();
  }, []);

  return {
    notifications,
    loading,
    error,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
  };
}
