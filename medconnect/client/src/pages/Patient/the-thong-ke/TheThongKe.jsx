import React, { useMemo } from "react";
import { Calendar, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Spin } from "antd";
import { useAppointments } from "../../../hooks/useAppointments";
import {
  calculateAppointmentStats,
  getTrendText,
} from "../../../utils/statsUtils";
import "./TheThongKe.scss";

// Stat card configuration
const STAT_CONFIG = [
  {
    title: "Đã xác nhận",
    icon: Calendar,
    iconColor: "#3b82f6", // Blue
    description: "Lịch đã được xác nhận",
    key: "confirmed",
    positiveText: "{count} lịch đã xác nhận",
    negativeText: "Chưa có lịch xác nhận",
    trendUp: (count) => count > 0,
  },
  {
    title: "ĐANG KHÁM",
    icon: Clock,
    iconColor: "#f97316", // Orange
    description: "Đang khám",
    key: "in_progress",
    positiveText: "{count} lịch đang khám",
    negativeText: "Không có lịch đang khám",
    trendUp: () => null,
  },
  {
    title: "Đã hoàn thành",
    icon: CheckCircle2,
    iconColor: "#22c55e", // Green
    description: "Đã khám xong",
    key: "completed",
    positiveText: "{count} lịch hoàn thành",
    negativeText: "Chưa có lịch hoàn thành",
    trendUp: (count) => count > 0,
  },
  {
    title: "Đã hủy",
    icon: XCircle,
    iconColor: "#ef4444", // Red
    description: "Đã hủy",
    key: "cancelled",
    positiveText: "{count} lịch đã hủy",
    negativeText: "Không có lịch hủy",
    trendUp: () => false,
  },
];

// Default error stats
const DEFAULT_ERROR_STATS = STAT_CONFIG.map((config) => ({
  ...config,
  value: "0",
  description: "Không thể tải dữ liệu",
  trend: "Lỗi kết nối",
  trendUp: null,
}));

// Stat Card Component
const StatCard = ({ stat }) => {
  const Icon = stat.icon;
  // If value is "0", show red text, otherwise show black/dark gray
  const valueNum = parseInt(stat.value) || 0;
  const trendColor = valueNum === 0 ? "#dc2626" : "#374151";
  const iconColor = stat.iconColor || "#2563eb"; // Default blue if not specified

  // Get border color based on stat type (for visual distinction)
  const getBorderColor = () => {
    switch (stat.key) {
      case "confirmed":
        return "#bfdbfe"; // Blue border
      case "pending":
        return "#fed7aa"; // Orange border
      case "in_progress":
        return "#fed7aa"; // Orange border
      case "completed":
        return "#bbf7d0"; // Green border
      case "cancelled":
        return "#fecaca"; // Red border
      default:
        return "#cbd5e1"; // Gray border
    }
  };

  return (
    <div
      className="stat-card stat-card-white"
      data-stat-type={stat.key}
      style={{
        // Force white background and remove gradients/images from any CSS
        backgroundColor: "#ffffff",
        background: "#ffffff",
        // subtle colored border per type
        border: `2px solid ${getBorderColor()}`,
        // ensure text is dark for readability on white
        color: "#0f172a",
      }}
    >
      <div
        className="stat-card-header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div className="stat-card-content" style={{ paddingRight: 12 }}>
          <p
            className="stat-card-title"
            style={{ color: "#0f172a", fontWeight: 600, margin: 0 }}
          >
            {stat.title}
          </p>
          <p
            className="stat-card-value"
            style={{
              color: "#0b1220",
              fontSize: "1.75rem",
              fontWeight: 700,
              margin: "6px 0",
            }}
          >
            {stat.value}
          </p>
          <p
            className="stat-card-description"
            style={{ color: "#4b5563", margin: 0 }}
          >
            {stat.description}
          </p>
        </div>
        <div
          className="stat-card-icon"
          style={{
            // remove any colored circle behind icon from existing styles
            background: "transparent",
            boxShadow: "none",
            padding: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 6,
          }}
        >
          <Icon
            className="stat-icon"
            style={{ color: iconColor, width: 28, height: 28 }}
          />
        </div>
      </div>
      <div className="stat-card-trend" style={{ marginTop: 8 }}>
        <span style={{ color: trendColor, fontSize: 13 }}>{stat.trend}</span>
      </div>
    </div>
  );
};

// Loading Skeleton Component
const LoadingSkeleton = () => (
  <div className="stats-grid" style={{ gap: 16 }}>
    {[1, 2, 3, 4].map((i) => (
      <div
        key={i}
        className="stat-card stat-card-white stat-card-loading"
        style={{
          backgroundColor: "#ffffff",
          background: "#ffffff",
          border: "2px solid #e2e8f0",
          color: "#0f172a",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: 120,
        }}
      >
        <Spin size="large" />
      </div>
    ))}
  </div>
);

export function TheThongKe() {
  const { appointments, loading, error } = useAppointments();

  const stats = useMemo(() => {
    if (error || !appointments) {
      return DEFAULT_ERROR_STATS;
    }

    const statsData = calculateAppointmentStats(appointments);

    return STAT_CONFIG.map((config) => {
      const count = statsData[config.key] || 0;
      return {
        ...config,
        value: count.toString(),
        trend: getTrendText(count, config.positiveText, config.negativeText),
        trendUp: config.trendUp(count),
      };
    });
  }, [appointments, error]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="stats-grid">
      {stats.map((stat) => (
        <StatCard key={stat.title} stat={stat} />
      ))}
    </div>
  );
}
