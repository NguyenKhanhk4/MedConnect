import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useUserProfile } from "../../../hooks/useUserProfile";
import { api } from "../../../lib/api";
import { Calendar, Search } from "lucide-react";
import { getGreeting, getTodayDateRange } from "../../../utils/greetingUtils";
import "./PhanChaoMung.scss";

// Action Button Component
const ActionButton = ({ onClick, icon: Icon, label, variant = "primary" }) => {
  const isPrimary = variant === "primary";
  const baseStyle = {
    display: "flex",
    alignItems: "center",
    gap: "0.375rem",
    padding: "0.625rem 0.875rem",
    backgroundColor: isPrimary ? "#3b82f6" : "#ffffff",
    color: isPrimary ? "#ffffff" : "#374151",
    border: isPrimary ? "none" : "1px solid #d1d5db",
    borderRadius: "0.5rem",
    fontSize: "0.875rem",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    position: "relative",
    overflow: "hidden",
    boxShadow: isPrimary
      ? "0 2px 4px rgba(59, 130, 246, 0.2)"
      : "0 1px 3px rgba(0, 0, 0, 0.1)",
  };

  const handleMouseOver = (e) => {
    if (isPrimary) {
      e.target.style.backgroundColor = "#2563eb";
      e.target.style.boxShadow = "0 8px 20px rgba(59, 130, 246, 0.4)";
    } else {
      e.target.style.backgroundColor = "#f9fafb";
      e.target.style.borderColor = "#10b981";
      e.target.style.boxShadow = "0 8px 20px rgba(0, 0, 0, 0.15)";
    }
    e.target.style.transform = "translateY(-2px) scale(1.02)";
  };

  const handleMouseOut = (e) => {
    if (isPrimary) {
      e.target.style.backgroundColor = "#3b82f6";
      e.target.style.boxShadow = "0 2px 4px rgba(59, 130, 246, 0.2)";
    } else {
      e.target.style.backgroundColor = "#ffffff";
      e.target.style.borderColor = "#d1d5db";
      e.target.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.1)";
    }
    e.target.style.transform = "translateY(0) scale(1)";
  };

  const handleMouseDown = (e) => {
    e.target.style.transform = "translateY(0) scale(0.98)";
  };

  const handleMouseUp = (e) => {
    e.target.style.transform = "translateY(-2px) scale(1.02)";
  };

  return (
    <button
      onClick={onClick}
      style={baseStyle}
      onMouseOver={handleMouseOver}
      onMouseOut={handleMouseOut}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      <Icon
        style={{
          width: "0.875rem",
          height: "0.875rem",
          transition: "transform 0.3s ease",
        }}
      />
      {label}
    </button>
  );
};

export function PhanChaoMung() {
  const { userProfile } = useUserProfile();
  const navigate = useNavigate();
  const [todayAppointments, setTodayAppointments] = useState(0);
  const [loading, setLoading] = useState(true);

  const greeting = useMemo(() => getGreeting(), []);
  const userName = useMemo(
    () => userProfile?.fullName || userProfile?.displayName || "Người dùng",
    [userProfile]
  );

  useEffect(() => {
    fetchTodayAppointments();
  }, []);

  const fetchTodayAppointments = async () => {
    try {
      setLoading(true);
      const { startOfDay, endOfDay } = getTodayDateRange();

      const response = await api.get(
        `/api/patients/me/appointments?startDate=${startOfDay.toISOString()}&endDate=${endOfDay.toISOString()}`
      );

      if (response.success) {
        const appointments = response.data.appointments || [];
        setTodayAppointments(appointments.length);
      }
    } catch (error) {
      console.error("Error fetching today's appointments:", error);
      setTodayAppointments(0);
    } finally {
      setLoading(false);
    }
  };

  const handleBookAppointment = () => {
    navigate("/dat-lich");
  };

  const handleFindDoctor = () => {
    navigate("/benh-nhan/tim-bac-si");
  };

  const subtitle = useMemo(() => {
    if (loading) return "Đang tải thông tin lịch hẹn...";
    if (todayAppointments > 0) return "Hãy chuẩn bị sẵn sàng cho buổi khám.";
    return "Hôm nay bạn chưa có lịch hẹn nào. Hãy đặt lịch khám để được chăm sóc tốt nhất.";
  }, [loading, todayAppointments]);

  return (
    <div className="welcome-section-container">
      {/* Header with Gradient Background */}
      <div className="welcome-header">
        <div className="welcome-header-content">
          <div className="welcome-header-text">
            <h1 className="welcome-page-title">
              {greeting}, {userName}
            </h1>
            <p className="welcome-page-subtitle">{subtitle}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="welcome-actions-wrapper">
          <ActionButton
            onClick={handleBookAppointment}
            icon={Calendar}
            label="Đặt lịch ngay"
            variant="primary"
          />
          <ActionButton
            onClick={handleFindDoctor}
            icon={Search}
            label="Tìm bác sĩ"
            variant="secondary"
          />
        </div>
      </div>
    </div>
  );
}
