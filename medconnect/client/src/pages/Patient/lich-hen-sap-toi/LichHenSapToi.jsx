import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, MapPin, User } from "lucide-react";
import { Spin } from "antd";
import ChiTietLichHen from "../chi-tiet-lich-hen/ChiTietLichHen";
import { useAppointments } from "../../../hooks/useAppointments";
import {
  filterByStatuses,
  transformAppointmentForDisplay,
  getStatusConfig,
  isConfirmedStatus,
} from "../../../utils/appointmentUtils";
import "./LichHenSapToi.scss";

export function LichHenSapToi() {
  const navigate = useNavigate();
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Fetch appointments
  const {
    appointments: allAppointments,
    loading,
    refreshAppointments,
  } = useAppointments();

  // Filter and transform appointments
  const appointments = useMemo(() => {
    // Filter only upcoming appointments with accepted and pending status
    // Exclude in_progress as they are shown in CurrentConsultation component
    const upcomingAppointments = filterByStatuses(allAppointments, [
      "pending_doctor",
      "accepted",
    ]);

    // Transform API data to match component format
    const transformedAppointments = upcomingAppointments.map(
      transformAppointmentForDisplay
    );

    // Return only first 3 appointments
    return transformedAppointments.slice(0, 3);
  }, [allAppointments]);

  const handleShowDetail = (appointmentId) => {
    setSelectedAppointmentId(appointmentId);
    setShowDetailModal(true);
  };

  const handleCloseDetail = () => {
    setShowDetailModal(false);
    setSelectedAppointmentId(null);
  };

  if (loading) {
    return (
      <div
        style={{
          backgroundColor: "#ffffff",
          border: "2px solid #cbd5e1",
          borderRadius: "1rem",
          padding: "1.5rem",
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "200px",
        }}
      >
        <div className="flex items-center justify-center">
          <Spin size="large" />
          <span className="ml-2">Đang tải lịch hẹn...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        border: "2px solid #cbd5e1",
        borderRadius: "1rem",
        padding: "1.5rem",
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.5rem",
        }}
      >
        <h3
          style={{
            fontSize: "1.125rem",
            fontWeight: "600",
            color: "#1e293b",
            margin: 0,
          }}
        >
          Lịch hẹn sắp tới
        </h3>
        <button
          style={{
            color: "#1e293b",
            fontSize: "0.875rem",
            fontWeight: "500",
            background: "none",
            border: "none",
            cursor: "pointer",
            textDecoration: "none",
            padding: "0.5rem 1rem",
            borderRadius: "0.375rem",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            position: "relative",
          }}
          onClick={() => navigate("/benh-nhan/lich-hen-cua-toi")}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = "#f1f5f9";
            e.target.style.transform = "translateY(-1px)";
            e.target.style.color = "#3b82f6";
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = "transparent";
            e.target.style.transform = "translateY(0)";
            e.target.style.color = "#1e293b";
          }}
          onMouseDown={(e) => {
            e.target.style.transform = "translateY(0) scale(0.98)";
          }}
          onMouseUp={(e) => {
            e.target.style.transform = "translateY(-1px) scale(1)";
          }}
        >
          Xem tất cả
        </button>
      </div>

      {/* Appointments List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {appointments.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "2rem",
              color: "#6b7280",
            }}
          >
            <p style={{ margin: 0, fontSize: "1rem" }}>
              Bạn chưa có lịch hẹn nào. Hãy đặt lịch khám để bắt đầu!
            </p>
          </div>
        ) : (
          appointments.map((appointment) => (
            <div
              key={appointment.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "1rem",
                border: "2px solid #cbd5e1",
                borderRadius: "0.75rem",
                backgroundColor: "#ffffff",
              }}
            >
              {/* Left side - Appointment info */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                {/* Doctor avatar */}
                <div
                  style={{
                    width: "2.5rem",
                    height: "2.5rem",
                    borderRadius: "50%",
                    backgroundColor: "#f3f4f6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <User
                    style={{
                      width: "1.25rem",
                      height: "1.25rem",
                      color: "#6b7280",
                    }}
                  />
                </div>

                {/* Doctor details */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.25rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "1rem",
                        fontWeight: "600",
                        color: "#1e293b",
                      }}
                    >
                      {appointment.doctor}
                    </span>
                    <span
                      style={{
                        fontSize: "0.875rem",
                        fontWeight: "500",
                        color: isConfirmedStatus(appointment.status)
                          ? "#ffffff"
                          : "#1e293b",
                        backgroundColor: isConfirmedStatus(appointment.status)
                          ? "#3b82f6"
                          : "#f3f4f6",
                        padding: "0.125rem 0.5rem",
                        borderRadius: "9999px",
                      }}
                    >
                      {getStatusConfig(appointment.status)?.text ||
                        appointment.status}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "0.875rem",
                      color: "#1e293b",
                    }}
                  >
                    {appointment.specialty}
                  </span>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      marginTop: "0.25rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                      }}
                    >
                      <Clock
                        style={{
                          width: "0.875rem",
                          height: "0.875rem",
                          color: "#6b7280",
                        }}
                      />
                      <span
                        style={{
                          fontSize: "0.875rem",
                          color: "#1e293b",
                        }}
                      >
                        {appointment.date} - {appointment.time}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                      }}
                    >
                      <MapPin
                        style={{
                          width: "0.875rem",
                          height: "0.875rem",
                          color: "#6b7280",
                        }}
                      />
                      <span
                        style={{
                          fontSize: "0.875rem",
                          color: "#1e293b",
                        }}
                      >
                        {appointment.location}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right side - Action buttons */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                  minWidth: "120px", // Fixed width for consistent button sizing
                }}
              >
                <button
                  style={{
                    padding: "0.5rem 1rem",
                    backgroundColor: "#3b82f6",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "0.375rem",
                    fontSize: "0.75rem",
                    fontWeight: "500",
                    cursor: "pointer",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    position: "relative",
                    overflow: "hidden",
                    boxShadow: "0 2px 4px rgba(59, 130, 246, 0.2)",
                    width: "100%", // Fixed width
                    minWidth: "120px", // Minimum width
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = "#2563eb";
                    e.target.style.transform = "translateY(-1px) scale(1.02)";
                    e.target.style.boxShadow =
                      "0 4px 12px rgba(59, 130, 246, 0.3)";
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = "#3b82f6";
                    e.target.style.transform = "translateY(0) scale(1)";
                    e.target.style.boxShadow =
                      "0 2px 4px rgba(59, 130, 246, 0.2)";
                  }}
                  onMouseDown={(e) => {
                    e.target.style.transform = "translateY(0) scale(0.98)";
                  }}
                  onMouseUp={(e) => {
                    e.target.style.transform = "translateY(-1px) scale(1.02)";
                  }}
                  onClick={() => handleShowDetail(appointment.id)}
                >
                  Chi tiết
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Appointment Detail Modal */}
      <ChiTietLichHen
        visible={showDetailModal}
        onClose={handleCloseDetail}
        appointmentId={selectedAppointmentId}
      />
    </div>
  );
}
