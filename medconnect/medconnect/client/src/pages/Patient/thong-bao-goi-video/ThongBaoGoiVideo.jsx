import React, { useMemo } from "react";
import { Card, Button, Typography, Badge } from "antd";
import {
  VideoCameraOutlined,
  ClockCircleOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAppointments } from "../../../hooks/useAppointments";
import {
  filterUpcomingVideoCalls,
  getTimeUntilCall,
  isCallTime,
} from "../../../utils/videoCallUtils";
import { formatDateTime } from "../../../utils/appointmentUtils";
import {
  getFullName,
  getSpecializationNames,
} from "../../../utils/doctorUtils";
import "./VideoCallNotification.css";

const { Title, Text } = Typography;

// Video Call Item Component
const VideoCallItem = ({ appointment, onJoin }) => {
  const doctorName = getFullName(appointment.doctorId || {});
  const specialty = getSpecializationNames(
    appointment.doctorId?.specializationIds || []
  );
  const { date: dateText, time: timeText } = formatDateTime(
    appointment.scheduledStart,
    { includeWeekday: false }
  );
  const timeUntil = getTimeUntilCall(appointment.scheduledStart);
  const canJoin = isCallTime(appointment.scheduledStart);

  return (
    <div className="call-item">
      <div className="call-info">
        <div className="doctor-info">
          <UserOutlined className="doctor-icon" />
          <div className="doctor-details">
            <Text strong>{doctorName}</Text>
            <Text type="secondary" className="specialty">
              {specialty}
            </Text>
          </div>
        </div>

        <div className="time-info">
          <div className="appointment-time">
            <ClockCircleOutlined className="time-icon" />
            <Text>
              {dateText} - {timeText}
            </Text>
          </div>
          <div className="time-until">
            <Text type={canJoin ? "success" : "secondary"}>
              {canJoin ? "Có thể tham gia" : `Còn ${timeUntil}`}
            </Text>
          </div>
        </div>
      </div>

      <div className="call-actions">
        <Button
          type="primary"
          icon={<VideoCameraOutlined />}
          onClick={() => onJoin(appointment._id)}
          disabled={!canJoin}
          className="join-call-button"
        >
          {canJoin ? "Tham gia ngay" : "Chờ đến giờ"}
        </Button>
      </div>
    </div>
  );
};

// Loading Component
const LoadingState = () => (
  <Card className="video-call-notification-card">
    <div className="loading-content">
      <Text>Đang tải...</Text>
    </div>
  </Card>
);

const VideoCallNotification = () => {
  const navigate = useNavigate();
  const { appointments, loading } = useAppointments();

  const upcomingVideoCalls = useMemo(() => {
    if (!appointments || appointments.length === 0) return [];
    return filterUpcomingVideoCalls(appointments, 24);
  }, [appointments]);

  const handleJoinVideoCall = (appointmentId) => {
    navigate(`/benh-nhan/video-call/${appointmentId}`);
  };

  if (loading) {
    return <LoadingState />;
  }

  if (upcomingVideoCalls.length === 0) {
    return null;
  }

  return (
    <Card className="video-call-notification-card">
      <div className="notification-header">
        <Title level={4} className="notification-title">
          <VideoCameraOutlined className="title-icon" />
          Cuộc gọi video sắp tới
        </Title>
        <Badge count={upcomingVideoCalls.length} />
      </div>

      <div className="upcoming-calls-list">
        {upcomingVideoCalls.map((appointment) => (
          <VideoCallItem
            key={appointment._id}
            appointment={appointment}
            onJoin={handleJoinVideoCall}
          />
        ))}
      </div>

      <div className="notification-footer">
        <Button
          type="link"
          onClick={() => navigate("/benh-nhan/lich-hen-cua-toi")}
          className="view-all-button"
        >
          Xem tất cả lịch hẹn
        </Button>
      </div>
    </Card>
  );
};

export default VideoCallNotification;
