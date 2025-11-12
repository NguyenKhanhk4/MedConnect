import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Typography, Button, Space, Spin } from "antd";
import { ArrowLeftOutlined, VideoCameraOutlined } from "@ant-design/icons";
import VideoCallManager from "../../../components/VideoCall/VideoCallManager";
import { useAppointmentDetails } from "../../../hooks/useAppointmentDetails";
import "./TrangGoiVideo.css";

const { Title, Text } = Typography;

// Loading Component
const LoadingState = () => (
  <div className="video-call-page-loading">
    <Spin size="large" />
    <Text>Đang tải thông tin...</Text>
  </div>
);

// Error Component
const ErrorState = ({ onBack }) => (
  <div className="video-call-page-error">
    <Card>
      <Title level={4}>Không tìm thấy lịch hẹn</Title>
      <Text type="secondary">
        Lịch hẹn không tồn tại hoặc bạn không có quyền truy cập.
      </Text>
      <br />
      <Button type="primary" onClick={onBack} style={{ marginTop: 16 }}>
        Quay lại
      </Button>
    </Card>
  </div>
);

// Instructions Component
const InstructionsCard = () => {
  const instructions = [
    {
      title: "1. Kiểm tra thiết bị:",
      text: "Đảm bảo camera và microphone hoạt động bình thường",
    },
    {
      title: "2. Kết nối mạng:",
      text: "Đảm bảo kết nối internet ổn định để có chất lượng video tốt",
    },
    {
      title: "3. Thời gian:",
      text: "Cuộc gọi chỉ có thể bắt đầu trong thời gian cho phép (15 phút trước và sau giờ hẹn)",
    },
    {
      title: "4. Quyền riêng tư:",
      text: "Đảm bảo bạn ở nơi riêng tư và có ánh sáng đầy đủ",
    },
  ];

  return (
    <Card className="instructions-card">
      <Title level={4}>Hướng dẫn sử dụng</Title>
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        {instructions.map((instruction, index) => (
          <div key={index} className="instruction-item">
            <Text strong>{instruction.title}</Text>
            <Text>{instruction.text}</Text>
          </div>
        ))}
      </Space>
    </Card>
  );
};

const TrangGoiVideo = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const [isInCall, setIsInCall] = useState(false);
  const { appointment, loading, error } = useAppointmentDetails(appointmentId);

  const handleBack = () => {
    navigate("/benh-nhan");
  };

  if (loading) {
    return <LoadingState />;
  }

  if (error || !appointment) {
    return <ErrorState onBack={handleBack} />;
  }

  return (
    <div className={`video-call-page ${isInCall ? "video-call-active" : ""}`}>
      <div className="video-call-page-container">
        <div className="page-header">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={handleBack}
            className="back-button"
          >
            Quay lại
          </Button>

          <div className="header-content">
            <Title level={2} className="page-title">
              <VideoCameraOutlined className="title-icon" />
              Cuộc gọi video khám bệnh
            </Title>
            <Text type="secondary" className="page-subtitle">
              Kết nối với bác sĩ qua video call
            </Text>
          </div>
        </div>

        <div className="video-call-content">
          <VideoCallManager
            appointmentId={appointmentId}
            userRole="patient"
            onCallStateChange={setIsInCall}
          />
        </div>

        <InstructionsCard />
      </div>
    </div>
  );
};

export default TrangGoiVideo;
