import React, { useMemo, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, MapPin, Video, Calendar } from "lucide-react";
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

// Doctor Avatar Component
const DoctorAvatar = ({ appointment }) => {
  const avatarUrl = appointment?.doctorId?.avatarUrl;
  const doctorName = getFullName(appointment?.doctorId || {});

  return (
    <div className="doctor-avatar-container">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={doctorName}
          className="doctor-avatar"
          onError={(e) => {
            e.target.style.display = "none";
            const fallback = e.target.nextElementSibling;
            if (fallback) fallback.style.display = "flex";
          }}
        />
      ) : null}
      <div 
        className="doctor-avatar-fallback" 
        style={{ display: avatarUrl ? "none" : "flex" }}
      >
        <span className="avatar-emoji">👨‍⚕️</span>
      </div>
    </div>
  );
};

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
    <div className="doctor-details">
      <h3 className="doctor-name">{doctorName}</h3>
      <p className="doctor-specialty">{specialty}</p>
      <div className="appointment-meta">
        <div className="meta-item">
          <Calendar className="meta-icon" />
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
  );
};

export function TuVanHienTai() {
  const navigate = useNavigate();
  const { appointments, loading, refreshAppointments } = useAppointments();
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Get avatar URL for current appointment
  const currentAppointment = useMemo(() => {
    if (!appointments || appointments.length === 0) {
      return null;
    }
    const inProgressOnline = appointments.find(
      (apt) => apt.status === "in_progress" && apt.mode === "online"
    );
    return inProgressOnline || null;
  }, [appointments]);
  
  // Poll for updates every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshAppointments();
    }, 10000);
    return () => clearInterval(interval);
  }, [refreshAppointments]);

  // Track initial load to prevent flickering
  useEffect(() => {
    if (!loading) {
      setIsInitialLoad(false);
    }
  }, [loading]);

  const handleJoinCall = () => {
    if (currentAppointment?._id) {
      navigate(`/benh-nhan/video-call/${currentAppointment._id}`);
    }
  };

  // Only show loading state on initial load, not on subsequent refreshes
  if (isInitialLoad && loading) {
    return null;
  }

  // Don't render if no appointment (but don't show loading after initial load)
  if (!currentAppointment) {
    return null;
  }

  return (
    <div className="current-consultation">
      {/* Header with title and status */}
      <div className="consultation-header">
        <div className="title-wrapper">
          <div className="pulse-dot"></div>
          <h2 className="consultation-title">Đang khám</h2>
        </div>
        <span className="status-text">● Đang diễn ra</span>
      </div>

      {/* Appointment Details */}
      <div className="consultation-content">
        {/* Doctor Info */}
        <div className="doctor-info-section">
          <DoctorAvatar appointment={currentAppointment} />
          <AppointmentInfo appointment={currentAppointment} />
        </div>

        {/* Action Button */}
        {currentAppointment.mode === "online" && (
          <div className="action-button-wrapper">
            <button className="join-call-button" onClick={handleJoinCall}>
              <Video className="button-icon" />
              Tham gia Video Call
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
