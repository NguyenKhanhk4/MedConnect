import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { useNotifications } from "../../../hooks/useNotifications";
import {
  getNotificationIcon,
  formatNotificationDateTime,
  getPriorityColor,
} from "../../../utils/notificationUtils";
import "./TrungTamThongBao.scss";

// Notification Item Component
const NotificationItem = ({ notification, onMarkAsRead }) => {
  const IconElement = getNotificationIcon(
    notification.type,
    notification.priority
  );
  const timeText = formatNotificationDateTime(notification.createdAt);
  const priorityColor = getPriorityColor(notification.priority || "low");

  return (
    <div
      className={`rounded-lg border p-3 hover:bg-muted/50 transition-colors ${
        !notification.isRead ? "bg-primary/5 border-primary/20" : "bg-card"
      }`}
      onClick={() => !notification.isRead && onMarkAsRead(notification._id)}
    >
      <div className="flex items-start gap-3">
        <div
          className="rounded-full bg-background p-2"
          style={{ color: priorityColor }}
        >
          {IconElement}
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-foreground leading-tight">
              {notification.title}
            </p>
            {!notification.isRead && (
              <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
            )}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {notification.message}
          </p>
          <p className="text-xs text-muted-foreground">{timeText}</p>
        </div>
      </div>
    </div>
  );
};

export function TrungTamThongBao() {
  const navigate = useNavigate();
  const { notifications, loading, unreadCount, markAsRead } =
    useNotifications();

  const recentNotifications = useMemo(() => {
    return notifications.slice(0, 5);
  }, [notifications]);

  const handleViewAll = () => {
    navigate("/benh-nhan/thong-bao");
  };

  if (loading) {
    return (
      <Card className="medical-card fade-in">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Thông báo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Đang tải...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="medical-card fade-in">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-2">
          <CardTitle className="text-xl font-semibold">Thông báo</CardTitle>
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="h-5 min-w-5 rounded-full px-1.5"
            >
              {unreadCount}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-primary"
          onClick={handleViewAll}
        >
          Xem tất cả
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {recentNotifications.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Chưa có thông báo nào
          </p>
        ) : (
          recentNotifications.map((notification) => (
            <NotificationItem
              key={notification._id}
              notification={notification}
              onMarkAsRead={markAsRead}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
