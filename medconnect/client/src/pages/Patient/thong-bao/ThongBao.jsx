import React from "react";
import { List, Button, Spin, Badge, Empty } from "antd";
import { Bell, Calendar, User, AlertCircle } from "lucide-react";
import { useNotifications } from "../../../hooks/useNotifications";
import {
  getNotificationIcon,
  formatNotificationDateTime,
} from "../../../utils/notificationUtils";
import "./ThongBao.scss";

// Notification Item Component
const NotificationItem = ({ notification, onMarkAsRead }) => {
  const handleClick = () => {
    if (!notification.isRead) {
      onMarkAsRead(notification._id);
    }
  };

  return (
    <List.Item
      className={`notification-item ${!notification.isRead ? "unread" : ""}`}
      onClick={handleClick}
    >
      <div className="notification-content">
        <div className="notification-header">
          <div className="notification-icon-wrapper">
            {getNotificationIcon(notification.type, notification.priority)}
          </div>
          <div className="notification-info">
            <h3 className="notification-title">{notification.title}</h3>
            <p className="notification-message">{notification.message}</p>
          </div>
          <div className="notification-meta">
            <span className="notification-time">
              {formatNotificationDateTime(notification.createdAt)}
            </span>
            {!notification.isRead && <div className="unread-indicator" />}
          </div>
        </div>

        {notification.metadata && (
          <div className="notification-metadata">
            {notification.metadata.appointmentId && (
              <span className="metadata-item">
                <Calendar size={14} />
                ID: {notification.metadata.appointmentId}
              </span>
            )}
            {notification.metadata.doctorName && (
              <span className="metadata-item">
                <User size={14} />
                {notification.metadata.doctorName}
              </span>
            )}
            {notification.metadata.reason && (
              <span className="metadata-item">
                <AlertCircle size={14} />
                {notification.metadata.reason}
              </span>
            )}
          </div>
        )}
      </div>
    </List.Item>
  );
};

// Loading Component
const LoadingState = () => (
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

export function ThongBao() {
  const { notifications, loading, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();

  if (loading) {
    return <LoadingState />;
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
              <NotificationItem
                notification={notification}
                onMarkAsRead={markAsRead}
              />
            )}
          />
        )}
      </div>
    </div>
  );
}
