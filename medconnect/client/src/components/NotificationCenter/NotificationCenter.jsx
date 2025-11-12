import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Bell,
  X,
  Check,
  AlertCircle,
  Calendar,
  User,
  Clock,
} from "lucide-react";
import { api } from "../../lib/api";
import "./NotificationCenter.scss";

export function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch notifications (limited for dropdown)
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      // Limit to 5 most recent notifications for dropdown
      const response = await api.get("/api/notifications?limit=5");

      if (response.success) {
        setNotifications(response.data.notifications);
        setUnreadCount(
          response.data.notifications.filter((n) => !n.isRead).length
        );
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch unread count
  const fetchUnreadCount = async () => {
    try {
      const response = await api.get("/api/notifications/unread-count");
      if (response.success) {
        setUnreadCount(response.data.unreadCount);
      }
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      const response = await api.put(
        `/api/notifications/${notificationId}/read`
      );
      if (response.success) {
        setNotifications((prev) =>
          prev.map((n) =>
            n._id === notificationId ? { ...n, isRead: true } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const response = await api.put("/api/notifications/read-all");
      if (response.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
        console.log("✅ All notifications marked as read");
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      alert("Không thể đánh dấu tất cả thông báo: " + error.message);
    }
  };

  const handleViewAllNotifications = () => {
    setIsOpen(false);
    // Navigate to notifications page based on current location
    if (location.pathname.startsWith("/bac-si")) {
      navigate("/bac-si/thong-bao");
    } else {
      navigate("/benh-nhan/thong-bao");
    }
  };

  // Get notification icon
  const getNotificationIcon = (type, priority) => {
    const iconClass = `notification-icon priority-${priority}`;

    switch (type) {
      case "appointment":
        return <Calendar className={iconClass} />;
      case "payment":
        return <Check className={iconClass} />;
      case "system":
        return <AlertCircle className={iconClass} />;
      case "message":
        return <User className={iconClass} />;
      case "video":
        return <Clock className={iconClass} />;
      default:
        return <Bell className={iconClass} />;
    }
  };

  // Format notification time
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;

    return date.toLocaleDateString("vi-VN");
  };

  useEffect(() => {
    fetchNotifications();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="notification-center">
      {/* Notification Bell */}
      <button className="notification-bell" onClick={() => setIsOpen(!isOpen)}>
        <Bell className="bell-icon" />
        {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Thông báo</h3>
            <div className="header-actions">
              {unreadCount > 0 && (
                <button className="mark-all-read-btn" onClick={markAllAsRead}>
                  Đánh dấu tất cả đã đọc
                </button>
              )}
              <button className="close-btn" onClick={() => setIsOpen(false)}>
                <X />
              </button>
            </div>
          </div>

          <div className="notification-list">
            {loading ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Đang tải thông báo...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="empty-state">
                <Bell className="empty-icon" />
                <p>Chưa có thông báo nào</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`notification-item ${
                    !notification.isRead ? "unread" : ""
                  }`}
                  onClick={() =>
                    !notification.isRead && markAsRead(notification._id)
                  }
                >
                  <div className="notification-content">
                    <div className="notification-icon-wrapper">
                      {getNotificationIcon(
                        notification.type,
                        notification.priority
                      )}
                    </div>
                    <div className="notification-text">
                      <h4 className="notification-title">
                        {notification.title}
                      </h4>
                      <p className="notification-message">
                        {notification.message}
                      </p>
                      <span className="notification-time">
                        {formatTime(notification.createdAt)}
                      </span>
                    </div>
                  </div>
                  {!notification.isRead && (
                    <div className="unread-indicator"></div>
                  )}
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="notification-footer">
              <button
                className="view-all-btn"
                onClick={handleViewAllNotifications}
              >
                Xem tất cả thông báo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
