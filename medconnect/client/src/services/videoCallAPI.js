import { api } from '../lib/api';

class VideoCallAPI {
  // Create video call room
  static async createRoom(appointmentId) {
    try {
      const response = await api.post('/api/video-calls/create-room', {
        appointmentId
      });
      return response.data;
    } catch (error) {
      console.error('Error creating video call room:', error);
      throw error;
    }
  }

  // Get video call room info
  static async getRoomInfo(roomId) {
    try {
      const response = await api.get(`/api/video-calls/room/${roomId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting room info:', error);
      throw error;
    }
  }

  // Start video call
  static async startCall(roomId) {
    try {
      const response = await api.post(`/api/video-calls/start/${roomId}`);
      return response.data;
    } catch (error) {
      console.error('Error starting video call:', error);
      throw error;
    }
  }

  // End video call
  static async endCall(roomId) {
    try {
      const response = await api.post(`/api/video-calls/end/${roomId}`);
      return response.data;
    } catch (error) {
      console.error('Error ending video call:', error);
      throw error;
    }
  }

  // Get video call history for appointment
  static async getCallHistory(appointmentId) {
    try {
      const response = await api.get(`/api/video-calls/appointment/${appointmentId}`);
      // Response from backend is { success: true, data: [...] }
      return response.data || [];
    } catch (error) {
      console.error('Error getting call history:', error);
      // Return empty array if no video call exists
      return [];
    }
  }

  // Get active video calls
  static async getActiveCalls() {
    try {
      const response = await api.get('/api/video-calls/active');
      return response.data;
    } catch (error) {
      console.error('Error getting active calls:', error);
      throw error;
    }
  }

  // Get call statistics
  static async getCallStats(startDate, endDate) {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await api.get(`/api/video-calls/stats?${params}`);
      return response.data;
    } catch (error) {
      console.error('Error getting call stats:', error);
      throw error;
    }
  }

  // End video call by appointment ID
  static async endCallByAppointmentId(appointmentId) {
    try {
      console.log('🔍 VideoCallAPI.endCallByAppointmentId - Called with appointmentId:', appointmentId);
      const response = await api.post(`/api/video-calls/end-by-appointment/${appointmentId}`);
      console.log('🔍 VideoCallAPI.endCallByAppointmentId - Response:', response);
      return response.data;
    } catch (error) {
      console.error('❌ VideoCallAPI.endCallByAppointmentId - Error:', error);
      console.error('❌ VideoCallAPI.endCallByAppointmentId - Error details:', error.response?.data);
      throw error;
    }
  }
}

export default VideoCallAPI;
