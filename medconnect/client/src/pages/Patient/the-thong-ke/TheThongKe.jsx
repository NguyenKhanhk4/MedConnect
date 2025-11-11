import React, { useMemo, useRef, useEffect } from "react";
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
    title: "Đang chờ",
    icon: Clock,
    iconColor: "#f97316", // Orange
    description: "Chờ xác nhận",
    key: "pending",
    positiveText: "{count} lịch chờ",
    negativeText: "Không có lịch chờ",
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
  const iconRef = useRef(null);
  // If value is "0", show red text, otherwise show black/dark gray
  const valueNum = parseInt(stat.value) || 0;
  const trendColor = valueNum === 0 ? "#dc2626" : "#374151";
  const iconColor = stat.iconColor || "#2563eb"; // Default blue if not specified

  // Create a lighter background color for the icon container
  const getIconBackgroundColor = (color) => {
    // Convert hex to rgba with opacity for background
    const hex = color.replace("#", "");
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    // Increase opacity slightly for better visibility (0.15 instead of 0.1)
    return `rgba(${r}, ${g}, ${b}, 0.15)`;
  };

  const iconBackgroundColor = getIconBackgroundColor(iconColor);

  // Force icon color after render to override any CSS
  useEffect(() => {
    if (iconRef.current) {
      const svg = iconRef.current.querySelector("svg");
      if (svg) {
        // Set color and stroke directly on SVG
        svg.setAttribute("stroke", iconColor);
        svg.setAttribute("color", iconColor);
        svg.style.stroke = iconColor;
        svg.style.color = iconColor;

        // Set stroke on all path elements
        const paths = svg.querySelectorAll(
          "path, circle, rect, line, polyline, polygon"
        );
        paths.forEach((path) => {
          path.setAttribute("stroke", iconColor);
          path.style.stroke = iconColor;
          path.setAttribute("fill", "none");
          path.style.fill = "none";
        });
      }
    }
  }, [iconColor]);

  return (
    <div
      className="stat-card stat-card-white"
      style={{
        backgroundColor: "#ffffff",
        background: "#ffffff",
        border: "2px solid #cbd5e1",
      }}
    >
      <div className="stat-card-header">
        <div className="stat-card-content">
          <p className="stat-card-title">{stat.title}</p>
          <p className="stat-card-value">{stat.value}</p>
          <p className="stat-card-description">{stat.description}</p>
        </div>
        <div
          ref={iconRef}
          className="stat-card-icon"
          style={{
            backgroundColor: iconBackgroundColor,
            "--icon-color": iconColor,
          }}
        >
          <Icon
            className="stat-icon"
            color={iconColor}
            strokeWidth={2.5}
            size={28}
            style={{
              color: iconColor,
              stroke: iconColor,
            }}
          />
        </div>
      </div>
      <div className="stat-card-trend">
        <span style={{ color: trendColor }}>{stat.trend}</span>
      </div>
    </div>
  );
};

// Loading Skeleton Component
const LoadingSkeleton = () => (
  <div className="stats-grid">
    {[1, 2, 3, 4].map((i) => (
      <div
        key={i}
        className="stat-card stat-card-white stat-card-loading"
        style={{
          backgroundColor: "#ffffff",
          background: "#ffffff",
          border: "2px solid #cbd5e1",
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
