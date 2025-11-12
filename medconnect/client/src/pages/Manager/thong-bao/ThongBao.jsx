import React, { useState, useEffect } from "react";
import { Card, List, Button, Spin, Badge, Empty, message } from "antd";
import {
  Bell,
  Calendar,
  User,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
} from "lucide-react";
import { api } from "../../../lib/api";
import "./ThongBao.scss";

export function ThongBao() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/notifications");

      if (response.success) {
        setNotifications(response.data.notifications || []);
      } else {
        console.error("Error fetching notifications:", response.message);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      message.error("Không thể tải thông báo");
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get("/api/notifications/unread-count");
      if (response.success) {
        setUnreadCount(response.data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Error fetching unread count:", error);
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
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
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
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      message.error("Không thể đánh dấu tất cả thông báo");
    }
  };

  const getNotificationIcon = (type, priority) => {
    const iconProps = {
      size: 20,
      className: `notification-icon ${priority}`,
    };

    switch (type) {
      case "appointment":
        return <Calendar {...iconProps} />;
      case "reschedule_request":
        return <Clock {...iconProps} />;
      case "leave_request":
        return <FileText {...iconProps} />;
      case "system":
        return <Bell {...iconProps} />;
      default:
        return <AlertCircle {...iconProps} />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "#ef4444";
      case "medium":
        return "#f59e0b";
      case "low":
        return "#10b981";
      default:
        return "#6b7280";
    }
  };

  const formatDateTime = (dateTime) => {
    const date = new Date(dateTime);
    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="notifications-page">
        <div className="notifications-header">
          <div className="notifications-title">
            <Bell className="notifications-icon" />
            <h1>Thông báo</h1>
          </div>
        </div>
        <div className="notifications-loading">
          <Spin size="large" />
          <p>Đang tải thông báo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <div className="notifications-title">
          <Bell className="notifications-icon" />
          <h1>Thông báo</h1>
          {unreadCount > 0 && (
            <Badge count={unreadCount} className="unread-badge" />
          )}
        </div>
        {notifications.length > 0 && (
          <Button
            type="primary"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
          >
            Đánh dấu tất cả đã đọc
          </Button>
        )}
      </div>

      <div className="notifications-content">
        {notifications.length === 0 ? (
          <Empty
            description="Chưa có thông báo nào"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <List
            dataSource={notifications}
            renderItem={(notification) => (
              <List.Item
                className={`notification-item ${
                  !notification.isRead ? "unread" : ""
                }`}
                onClick={() =>
                  !notification.isRead && markAsRead(notification._id)
                }
              >
                <div className="notification-content">
                  <div className="notification-header">
                    <div className="notification-icon-wrapper">
                      {getNotificationIcon(
                        notification.type,
                        notification.priority
                      )}
                    </div>
                    <div className="notification-info">
                      <h3 className="notification-title">
                        {notification.title}
                      </h3>
                      <p className="notification-message">
                        {notification.message}
                      </p>
                    </div>
                    <div className="notification-meta">
                      <span className="notification-time">
                        {formatDateTime(notification.createdAt)}
                      </span>
                      {!notification.isRead && (
                        <div className="unread-indicator" />
                      )}
                    </div>
                  </div>

                  {notification.metadata && (
                    <div className="notification-metadata">
                      {notification.metadata.leaveRequestId && (
                        <span className="metadata-item">
                          <FileText size={14} />
                          Mã yêu cầu: {notification.metadata.leaveRequestId}
                        </span>
                      )}
                      {notification.metadata.doctorName && (
                        <span className="metadata-item">
                          <User size={14} />
                          {notification.metadata.doctorName}
                        </span>
                      )}
                      {notification.metadata.slotTime && (
                        <span className="metadata-item">
                          <Calendar size={14} />
                          {notification.metadata.slotTime}
                        </span>
                      )}
                      {notification.metadata.reason && (
                        <span className="metadata-item">
                          <AlertCircle size={14} />
                          Lý do: {notification.metadata.reason}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </List.Item>
            )}
          />
        )}
      </div>
    </div>
  );
}
