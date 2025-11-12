import React, { useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, MapPin, Video } from "lucide-react";
import { useAppointments } from "../../../hooks/useAppointments";
import {
  formatDateTime,
  getAppointmentModeText,
} from "../../../utils/appointmentUtils";
import {
  getFullName,
  getSpecializationNames,
} from "../../../utils/doctorUtils";
import "./TuVanHienTai.scss";

// Status Indicator Component
const StatusIndicator = () => (
  <div className="status-indicator">
    <div className="status-dot"></div>
    <span className="status-text">Đang diễn ra</span>
  </div>
);

// Appointment Info Component
const AppointmentInfo = ({ appointment }) => {
  const { date, time } = formatDateTime(appointment.scheduledStart, {
    includeWeekday: false,
  });
  const doctorName = getFullName(appointment.doctorId || {});
  const specialty = getSpecializationNames(
    appointment.doctorId?.specializationIds
  );
  const location = getAppointmentModeText(appointment.mode);

  return (
    <div className="appointment-info">
      <img
        src={appointment.doctorId?.avatarUrl || "/default-avatar.png"}
        alt={doctorName}
        className="doctor-avatar"
        onError={(e) => {
          e.target.src = "/default-avatar.png";
          e.target.onerror = null;
        }}
      />
      <div className="doctor-details">
        <div className="doctor-name">{doctorName}</div>
        <div className="doctor-specialty">{specialty}</div>
        <div className="appointment-meta">
          <div className="meta-item">
            <Clock className="meta-icon" />
            <span>
              {date} - {time}
            </span>
          </div>
          <div className="meta-item">
            <MapPin className="meta-icon" />
            <span>{location}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Join Call Button Component
const JoinCallButton = ({ appointmentId, onJoin }) => (
  <button className="join-call-button" onClick={onJoin}>
    <Video size={16} />
    Tham gia Video Call
  </button>
);

export function TuVanHienTai() {
  const navigate = useNavigate();
  const { appointments, loading, refreshAppointments } = useAppointments();

  // Poll for updates every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshAppointments();
    }, 10000);
    return () => clearInterval(interval);
  }, [refreshAppointments]);

  // Filter for in_progress ONLINE appointments
  const currentAppointment = useMemo(() => {
    const inProgressOnline = appointments.find(
      (apt) => apt.status === "in_progress" && apt.mode === "online"
    );
    return inProgressOnline || null;
  }, [appointments]);

  const handleJoinCall = () => {
    if (currentAppointment?._id) {
      navigate(`/benh-nhan/video-call/${currentAppointment._id}`);
    }
  };

  if (loading || !currentAppointment) {
    return null;
  }

  return (
    <div className="current-consultation">
      <div className="consultation-header">
        <h3 className="consultation-title">
          <Video size={20} className="title-icon" />
          Đang khám online
        </h3>
        <StatusIndicator />
      </div>

      <div className="consultation-content">
        <AppointmentInfo appointment={currentAppointment} />
        {currentAppointment.mode === "online" && (
          <JoinCallButton
            appointmentId={currentAppointment._id}
            onJoin={handleJoinCall}
          />
        )}
      </div>
    </div>
  );
}
