import React, { useState, useEffect, useRef } from 'react';
import { Card, Typography, message, Modal, Spin } from 'antd';
import {
  UserOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import jitsiService from '../../services/jitsiService';
import './VideoCall.css';

const { Title, Text } = Typography;

const VideoCall = ({ 
  roomId, 
  onCallEnd, 
  appointmentId,
  doctorInfo,
  patientInfo,
  userName
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [callStatus, setCallStatus] = useState('connecting');
  const [showEndCallModal, setShowEndCallModal] = useState(false);
  
  const jitsiContainerRef = useRef(null);
  const containerId = 'jitsi-container';
  const hasInitialized = useRef(false);
  const loadingTimeoutRef = useRef(null);

  useEffect(() => {
    console.log('🎥 VideoCall useEffect triggered with roomId:', roomId);
    
    // Prevent duplicate initialization
    if (hasInitialized.current) {
      console.log('⚠️ VideoCall already initialized, skipping...');
      return;
    }
    
    hasInitialized.current = true;
    initializeCall();
    
    return () => {
      // Cleanup on unmount
      hasInitialized.current = false;
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      if (jitsiService.isInitialized()) {
        jitsiService.endCall();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const initializeCall = async () => {
    try {
      console.log('🎥 initializeCall started with roomId:', roomId);
      setIsLoading(true);
      setCallStatus('connecting');

      // Set up callbacks
      jitsiService.setCallbacks({
        onConferenceJoined: () => {
          console.log('✅ Conference joined - hiding loading');
          setCallStatus('connected');
          setIsLoading(false);
          // Clear timeout if conference joined
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
            loadingTimeoutRef.current = null;
          }
        },
        onParticipantJoined: (event) => {
          console.log('Participant joined:', event);
          message.success('Đã có người tham gia cuộc gọi');
        },
        onParticipantLeft: (event) => {
          console.log('Participant left:', event);
        },
        onAudioMuteStatusChanged: (isMuted) => {
          console.log('Audio muted:', isMuted);
        },
        onVideoMuteStatusChanged: (isMuted) => {
          console.log('Video muted:', isMuted);
        },
        onReadyToClose: () => {
          console.log('Ready to close');
          setCallStatus('ended');
          onCallEnd?.();
        },
        onError: (error) => {
          console.error('Jitsi Error:', error);
          message.error('Có lỗi xảy ra trong cuộc gọi video');
          setCallStatus('error');
          setIsLoading(false);
        }
      });

      // Initialize Jitsi Meet
      await jitsiService.initialize(containerId, roomId, {
        displayName: userName || 'Người dùng',
        email: ''
      });

      // Fallback: Auto-hide loading after 8 seconds if conference event doesn't fire
      loadingTimeoutRef.current = setTimeout(() => {
        console.log('⚠️ Auto-hiding loading overlay after 8s timeout');
        setIsLoading(false);
        setCallStatus('connected');
      }, 8000);

    } catch (error) {
      console.error('Failed to initialize call:', error);
      message.error('Không thể khởi tạo cuộc gọi video');
      setCallStatus('error');
      setIsLoading(false);
    }
  };

  const handleEndCall = () => {
    setShowEndCallModal(true);
  };

  const confirmEndCall = () => {
    if (jitsiService.isInitialized()) {
      jitsiService.endCall();
    }
    setShowEndCallModal(false);
    onCallEnd?.();
  };

  const getStatusText = () => {
    switch (callStatus) {
      case 'connecting':
        return 'Đang kết nối...';
      case 'connected':
        return 'Đã kết nối';
      case 'disconnected':
        return 'Mất kết nối';
      case 'ended':
        return 'Cuộc gọi đã kết thúc';
      case 'error':
        return 'Có lỗi xảy ra';
      default:
        return 'Đang khởi tạo...';
    }
  };

  const getStatusColor = () => {
    switch (callStatus) {
      case 'connected':
        return '#52c41a';
      case 'connecting':
        return '#1890ff';
      case 'disconnected':
      case 'ended':
      case 'error':
        return '#ff4d4f';
      default:
        return '#d9d9d9';
    }
  };

  return (
    <div className="video-call-container">
      {/* Jitsi Meet will render inside this container */}
      <div className="jitsi-wrapper">
        <div 
          id={containerId} 
          ref={jitsiContainerRef}
          style={{ width: '100%', height: '100vh' }}
        />
        
        {isLoading && (
          <div className="video-call-loading-overlay">
            <Card className="loading-card">
              <div className="loading-content">
                <Spin size="large" />
                <Title level={4}>Đang khởi tạo cuộc gọi video...</Title>
                <Text type="secondary">{getStatusText()}</Text>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* End Call Confirmation Modal */}
      <Modal
        title="Kết thúc cuộc gọi"
        open={showEndCallModal}
        onOk={confirmEndCall}
        onCancel={() => setShowEndCallModal(false)}
        okText="Kết thúc"
        cancelText="Hủy"
        okButtonProps={{ danger: true }}
        icon={<ExclamationCircleOutlined />}
      >
        <p>Bạn có chắc chắn muốn kết thúc cuộc gọi video này?</p>
      </Modal>
    </div>
  );
};

export default VideoCall;
