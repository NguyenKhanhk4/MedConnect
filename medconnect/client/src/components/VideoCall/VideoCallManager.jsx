import React, { useState, useEffect } from 'react';
import { Button, Card, Space, Typography, message, Modal, Spin, Row, Col } from 'antd';
import {
  VideoCameraOutlined,
  PhoneOutlined,
  UserOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import VideoCall from './VideoCall';
import VideoCallAPI from '../../services/videoCallAPI';
import { api } from '../../lib/api';

const { Title, Text, Paragraph } = Typography;

const VideoCallManager = ({ appointmentId, userRole = 'patient', onCallStateChange }) => {
  const [videoCallData, setVideoCallData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInCall, setIsInCall] = useState(false);
  const [showStartCallModal, setShowStartCallModal] = useState(false);
  const [appointmentInfo, setAppointmentInfo] = useState(null);

  // Notify parent when call state changes
  useEffect(() => {
    onCallStateChange?.(isInCall);
  }, [isInCall, onCallStateChange]);

  useEffect(() => {
    fetchAppointmentInfo();
    
    // Poll for video call status updates every 5 seconds
    const interval = setInterval(() => {
      fetchVideoCallStatus();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [appointmentId]);

  const fetchAppointmentInfo = async () => {
    try {
      setIsLoading(true);
      
      // Fetch appointment details based on user role
      const appointmentResponse = userRole === 'patient'
        ? await api.get(`/api/patients/me/appointments/${appointmentId}`)
        : await api.get(`/api/doctors/me/appointments/${appointmentId}`);
      
      console.log('Appointment response:', appointmentResponse);
      
      if (appointmentResponse.success) {
        // response structure is { success: true, data: appointment }
        console.log('Appointment data:', appointmentResponse.data);
        setAppointmentInfo(appointmentResponse.data);
      } else {
        throw new Error(appointmentResponse.message || 'Failed to fetch appointment');
      }
      
      // Check if video call already exists (optional, don't fail if error)
      try {
        const videoCallResponse = await VideoCallAPI.getCallHistory(appointmentId);
        console.log('Video call history response:', videoCallResponse);
        if (videoCallResponse && Array.isArray(videoCallResponse) && videoCallResponse.length > 0) {
          setVideoCallData(videoCallResponse[0]);
        }
      } catch (videoCallError) {
        console.log('No video call history found for this appointment:', videoCallError.message);
        // Don't fail the whole fetch if video call history doesn't exist
      }
      
    } catch (error) {
      console.error('Error fetching appointment info:', error);
      message.error('Không thể tải thông tin cuộc hẹn');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVideoCallStatus = async () => {
    try {
      // Only fetch if we have video call data
      if (!videoCallData) return;
      
      const videoCallResponse = await VideoCallAPI.getCallHistory(appointmentId);
      if (videoCallResponse && Array.isArray(videoCallResponse) && videoCallResponse.length > 0) {
        const latestVideoCall = videoCallResponse[0];
        // Only update if status has changed
        if (latestVideoCall.status !== videoCallData.status) {
          console.log('🔄 Video call status updated:', latestVideoCall.status);
          setVideoCallData(latestVideoCall);
        }
      }
    } catch (error) {
      console.log('Error fetching video call status:', error.message);
      // Silent error - don't show to user during polling
    }
  };

  const createVideoCallRoom = async () => {
    try {
      setIsLoading(true);
      
      const response = await VideoCallAPI.createRoom(appointmentId);
      
      if (response.success) {
        setVideoCallData(response.data);
        message.success('Phòng video call đã được tạo thành công');
        setShowStartCallModal(false);
      } else {
        message.error(response.message || 'Không thể tạo phòng video call');
      }
      
    } catch (error) {
      console.error('Error creating video call room:', error);
      message.error('Không thể tạo phòng video call');
    } finally {
      setIsLoading(false);
    }
  };

  const startVideoCall = async () => {
    try {
      console.log('🎥 startVideoCall - Starting video call...', {
        appointmentId,
        userRole,
        hasVideoCallData: !!videoCallData,
        roomId: videoCallData?.roomId
      });

      // Use FIXED roomId based on appointmentId (no timestamp)
      // This ensures both doctor and patient join the SAME room
      const fixedRoomId = `room_medconnect_${appointmentId}`;
      console.log('🎥 startVideoCall - Using FIXED roomId:', fixedRoomId);

      // For patient: Just join the call with fixed roomId
      // The doctor has already started/created the room
      setIsInCall(true);
      console.log('✅ startVideoCall - Patient joining call with roomId:', fixedRoomId);
      
      // Store the fixed roomId in state for VideoCall component
      setVideoCallData({
        ...videoCallData,
        roomId: fixedRoomId
      });
      
    } catch (error) {
      console.error('❌ startVideoCall - Error joining video call:', error);
      message.error('Không thể tham gia cuộc gọi video');
    }
  };

  const endVideoCall = async () => {
    try {
      console.log('🔚 endVideoCall - Leaving video call (not ending, status remains)');
      
      if (!videoCallData) {
        console.log('⚠️ No video call data');
        return;
      }

      // DON'T update video call status to "ended" here
      // The status should only be "ended" when doctor clicks "Complete" button
      // Just close the video call UI
      
      setIsInCall(false);
      // Keep videoCallData, just exit the call view
      message.success('Đã rời khỏi cuộc gọi video');
      
      console.log('✅ endVideoCall - Left video call, status unchanged:', videoCallData.status);
      
    } catch (error) {
      console.error('❌ endVideoCall - Error leaving video call:', error);
      message.error('Không thể rời khỏi cuộc gọi video');
    }
  };

  const canStartCall = () => {
    if (!appointmentInfo) {
      console.log('No appointment info');
      return false;
    }
    
    console.log('Checking canStartCall:', {
      userRole,
      status: appointmentInfo.status,
      appointmentInfo
    });
    
    // Check if appointment is accepted or in_progress
    // Doctor can call anytime when appointment is accepted
    // Patient can join when doctor has started the call (in_progress)
    if (userRole === 'doctor') {
      const canStart = appointmentInfo.status === 'accepted' || appointmentInfo.status === 'in_progress';
      console.log('Doctor can start:', canStart);
      return canStart;
    } else {
      // Patient can join when doctor has initiated the call AND video call exists
      const hasInProgressStatus = appointmentInfo.status === 'in_progress';
      const hasVideoCall = !!videoCallData;
      const canJoin = hasInProgressStatus && hasVideoCall;
      
      console.log('Patient can join check:', {
        status: appointmentInfo.status,
        hasInProgressStatus,
        hasVideoCall,
        canJoin
      });
      
      return canJoin;
    }
  };

  const getCallStatusText = () => {
    if (!videoCallData) return 'Chưa có cuộc gọi';
    
    switch (videoCallData.status) {
      case 'created':
        return 'Sẵn sàng bắt đầu';
      case 'in_progress':
        return 'Đang diễn ra';
      case 'ended':
        return 'Đã kết thúc';
      default:
        return 'Không xác định';
    }
  };

  const getCallStatusColor = () => {
    if (!videoCallData) return '#d9d9d9';
    
    switch (videoCallData.status) {
      case 'created':
        return '#52c41a';
      case 'in_progress':
        return '#1890ff';
      case 'ended':
        return '#ff4d4f';
      default:
        return '#d9d9d9';
    }
  };

  if (isLoading) {
    return (
      <div className="video-call-manager-loading">
        <Spin size="large" />
        <Text>Đang tải thông tin...</Text>
      </div>
    );
  }

  // Always use FIXED roomId based on appointmentId when in call
  // NEVER use videoCallData.roomId (it might have old timestamp format)
  const fixedRoomId = `room_medconnect_${appointmentId}`;
  
  if (isInCall) {
    // ALWAYS use fixedRoomId, ignore videoCallData.roomId completely
    const roomIdToUse = fixedRoomId;
    
    console.log('🎥 Rendering VideoCall component:', {
      roomId: roomIdToUse,
      userRole,
      appointmentId,
      videoCallDataOldRoomId: videoCallData?.roomId, // Log old roomId for debugging
      videoCallData
    });
    
    const userName = userRole === 'patient' 
      ? appointmentInfo?.patientId?.name || 'Patient'
      : appointmentInfo?.doctorId?.name || 'Doctor';
    
    return (
      <VideoCall
        roomId={roomIdToUse}
        onCallEnd={endVideoCall}
        appointmentId={appointmentId}
        doctorInfo={appointmentInfo?.doctorId}
        patientInfo={appointmentInfo?.patientId}
        userName={userName}
      />
    );
  }

  return (
    <div className="video-call-manager">
      <Card className="video-call-manager-card">
        <div className="manager-header">
          <Title level={3}>Cuộc gọi video khám bệnh</Title>
          <Text type="secondary">Quản lý cuộc gọi video với bác sĩ</Text>
        </div>

        {appointmentInfo && (
          <div className="appointment-info">
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Card size="small" className="info-card">
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <div className="info-item">
                      <CalendarOutlined className="info-icon" />
                      <Text strong>Ngày khám:</Text>
                      <Text>{new Date(appointmentInfo.scheduledStart).toLocaleDateString('vi-VN')}</Text>
                    </div>
                    <div className="info-item">
                      <ClockCircleOutlined className="info-icon" />
                      <Text strong>Thời gian:</Text>
                      <Text>
                        {new Date(appointmentInfo.scheduledStart).toLocaleTimeString('vi-VN', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })} - {new Date(appointmentInfo.scheduledEnd).toLocaleTimeString('vi-VN', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </Text>
                    </div>
                    <div className="info-item">
                      <UserOutlined className="info-icon" />
                      <Text strong>Bác sĩ:</Text>
                      <Text>{appointmentInfo.doctorId?.name || appointmentInfo.doctorId?.fullName || 'Chưa xác định'}</Text>
                    </div>
                    <div className="info-item">
                      <Text strong>Trạng thái:</Text>
                      <Text style={{ color: getCallStatusColor() }}>{getCallStatusText()}</Text>
                    </div>
                  </Space>
                </Card>
              </Col>
            </Row>
          </div>
        )}

        <div className="call-actions">
          {/* Patient can only join existing calls, not create them */}
          {userRole === 'patient' ? (
            videoCallData ? (
              (videoCallData.status === 'created' || videoCallData.status === 'in_progress') ? (
                <Button
                  type="primary"
                  size="large"
                  icon={<PhoneOutlined />}
                  onClick={startVideoCall}
                  className="action-button"
                >
                  Tham gia cuộc gọi
                </Button>
              ) : videoCallData.status === 'ended' ? (
                <Text type="secondary">Cuộc gọi đã kết thúc</Text>
              ) : null
            ) : canStartCall() ? (
              <Button
                type="default"
                size="large"
                icon={<ClockCircleOutlined />}
                disabled
                className="action-button"
              >
                Đang chờ bác sĩ bắt đầu cuộc gọi...
              </Button>
            ) : (
              <Text type="secondary">Chờ bác sĩ bắt đầu cuộc gọi</Text>
            )
          ) : (
            /* Doctor can create and start calls */
            !videoCallData ? (
              <Button
                type="primary"
                size="large"
                icon={<VideoCameraOutlined />}
                onClick={() => setShowStartCallModal(true)}
                disabled={!canStartCall()}
                className="action-button"
              >
                Tạo cuộc gọi video
              </Button>
            ) : videoCallData.status === 'created' ? (
              <Button
                type="primary"
                size="large"
                icon={<PhoneOutlined />}
                onClick={startVideoCall}
                disabled={!canStartCall()}
                className="action-button"
              >
                Bắt đầu cuộc gọi
              </Button>
            ) : videoCallData.status === 'ended' ? (
              <Text type="secondary">Cuộc gọi đã kết thúc</Text>
            ) : null
          )}

          {!canStartCall() && userRole !== 'patient' && (
            <Text type="secondary" className="warning-text">
              Cuộc gọi chỉ có thể bắt đầu khi lịch hẹn đã được chấp nhận
            </Text>
          )}
        </div>
      </Card>

      {/* Start Call Confirmation Modal */}
      <Modal
        title="Tạo cuộc gọi video"
        open={showStartCallModal}
        onOk={createVideoCallRoom}
        onCancel={() => setShowStartCallModal(false)}
        okText="Tạo"
        cancelText="Hủy"
        confirmLoading={isLoading}
        icon={<ExclamationCircleOutlined />}
      >
        <p>Bạn có chắc chắn muốn tạo cuộc gọi video cho lịch hẹn này?</p>
        <p><Text type="secondary">Cuộc gọi sẽ được tạo và sẵn sàng để bắt đầu.</Text></p>
      </Modal>
    </div>
  );
};

export default VideoCallManager;
