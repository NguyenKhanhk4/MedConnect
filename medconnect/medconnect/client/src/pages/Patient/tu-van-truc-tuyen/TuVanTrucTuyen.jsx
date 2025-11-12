import React from "react";
import { useNavigate } from "react-router-dom";
import { Video, MessageCircle, Calendar, Clock, User } from "lucide-react";
import { Spin } from "antd";
import { useConsultations } from "../../../hooks/useConsultations";
import "./TuVanTrucTuyen.scss";

// Loading State Component
const LoadingState = () => (
  <div className="online-consultation-page">
    <div className="loading-container">
      <Spin size="large">
        <div style={{ padding: "50px" }}>
          <div style={{ textAlign: "center", marginTop: "20px" }}>
            Đang tải dữ liệu tư vấn...
          </div>
        </div>
      </Spin>
    </div>
  </div>
);

// Error State Component
const ErrorState = ({ error, onRetry }) => (
  <div className="online-consultation-page">
    <div className="container">
      <div className="error-state">
        <h2>Lỗi tải dữ liệu</h2>
        <p>{error}</p>
        <button onClick={onRetry} className="retry-button">
          Thử lại
        </button>
      </div>
    </div>
  </div>
);

// Empty State Component
const EmptyState = ({ message }) => (
  <div className="empty-state">
    <p>{message}</p>
  </div>
);

// Consultation Card Component
const ConsultationCard = ({
  consultation,
  isHistory = false,
  onJoin,
  onMessage,
}) => {
  const [avatarError, setAvatarError] = React.useState(false);

  return (
    <div className="consultation-card">
      <div className="doctor-avatar">
        {consultation.doctor.avatar && !avatarError ? (
          <img
            src={consultation.doctor.avatar}
            alt={consultation.doctor.name}
            className="avatar-image"
            onError={() => setAvatarError(true)}
          />
        ) : (
          <User className="default-avatar" />
        )}
      </div>

      <div className="consultation-content">
        <div className="doctor-info-section">
          <div className="doctor-name-row">
            <div className="doctor-name">{consultation.doctor.name}</div>
            <div className={`status-badge ${consultation.statusType}`}>
              {consultation.status}
            </div>
          </div>
          <div className="doctor-specialty">
            {consultation.doctor.specialty}
          </div>
        </div>

        <div className="consultation-details">
          <div className="detail-item">
            <Calendar className="detail-icon" />
            <span>{consultation.date}</span>
          </div>
          <div className="detail-item">
            <Clock className="detail-icon" />
            <span>{consultation.time}</span>
          </div>
        </div>

        {!isHistory && (
          <div className="consultation-actions">
            <button
              className="action-button join-button"
              onClick={() => onJoin(consultation.id)}
            >
              <Video className="button-icon" />
              Tham gia
            </button>
            <button
              className="action-button message-button"
              onClick={() => onMessage(consultation.doctor.id)}
            >
              <MessageCircle className="button-icon" />
              Nhắn tin
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export function TuVanTrucTuyen() {
  const navigate = useNavigate();
  const {
    upcomingConsultations,
    consultationHistory,
    loading,
    error,
    refreshConsultations,
  } = useConsultations();

  const handleJoinConsultation = (consultationId) => {
    navigate(`/benh-nhan/video-call/${consultationId}`);
  };

  const handleMessageDoctor = (doctorId) => {
    // TODO: Implement chat functionality
    navigate(`/benh-nhan/chat/${doctorId}`);
  };

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={refreshConsultations} />;
  }

  return (
    <div className="online-consultation-page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Tư vấn trực tuyến</h1>
          <p className="page-description">
            Quản lý các buổi tư vấn video với bác sĩ
          </p>
        </div>

        <div className="consultation-section">
          <h2 className="section-title">Buổi tư vấn sắp tới</h2>
          <div className="consultations-grid">
            {upcomingConsultations.length > 0 ? (
              upcomingConsultations.map((consultation) => (
                <ConsultationCard
                  key={consultation.id}
                  consultation={consultation}
                  isHistory={false}
                  onJoin={handleJoinConsultation}
                  onMessage={handleMessageDoctor}
                />
              ))
            ) : (
              <EmptyState message="Không có buổi tư vấn sắp tới nào." />
            )}
          </div>
        </div>

        <div className="consultation-section">
          <h2 className="section-title">Lịch sử tư vấn</h2>
          <div className="consultations-grid">
            {consultationHistory.length > 0 ? (
              consultationHistory.map((consultation) => (
                <ConsultationCard
                  key={consultation.id}
                  consultation={consultation}
                  isHistory={true}
                  onJoin={handleJoinConsultation}
                  onMessage={handleMessageDoctor}
                />
              ))
            ) : (
              <EmptyState message="Chưa có lịch sử tư vấn nào." />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
