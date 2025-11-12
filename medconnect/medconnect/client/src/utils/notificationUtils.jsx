/**
 * Utility functions for notification-related operations
 */

import { Calendar, Clock, Bell, AlertCircle } from "lucide-react";

/**
 * Get notification icon based on type
 * @param {string} type - Notification type
 * @param {string} priority - Notification priority
 * @returns {JSX.Element} Icon component
 */
export function getNotificationIcon(type, priority) {
  const iconProps = {
    size: 20,
    className: `notification-icon ${priority}`,
  };

  switch (type) {
    case "appointment":
      return <Calendar {...iconProps} />;
    case "reschedule_request":
      return <Clock {...iconProps} />;
    case "system":
      return <Bell {...iconProps} />;
    default:
      return <AlertCircle {...iconProps} />;
  }
}

/**
 * Get priority color
 * @param {string} priority - Notification priority
 * @returns {string} Color hex code
 */
export function getPriorityColor(priority) {
  const priorityColors = {
    high: "#ef4444",
    medium: "#f59e0b",
    low: "#10b981",
  };

  return priorityColors[priority] || "#6b7280";
}

/**
 * Format date and time for display
 * @param {Date|string} dateTime - Date to format
 * @returns {string} Formatted date string
 */
export function formatNotificationDateTime(dateTime) {
  const date = new Date(dateTime);
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
