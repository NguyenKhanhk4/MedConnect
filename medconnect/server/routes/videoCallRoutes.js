import express from 'express';
import VideoCall from '../models/videoCall.model.js';
import Appointment from '../models/appointment.model.js';

const router = express.Router();

// Create video call room
router.post('/create-room', async (req, res) => {
  try {
    console.log('🔍 createRoom - Request received:', req.body);
    const { appointmentId } = req.body;

    if (!appointmentId) {
      console.log('❌ createRoom - No appointmentId provided');
      return res.status(400).json({
        success: false,
        message: 'Appointment ID is required'
      });
    }

    console.log('🔍 createRoom - Looking up appointment:', appointmentId);
    // Check if appointment exists and is valid
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      console.log('❌ createRoom - Appointment not found:', appointmentId);
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    console.log('✅ createRoom - Appointment found:', {
      id: appointment._id,
      status: appointment.status,
      doctorId: appointment.doctorId,
      patientId: appointment.patientId
    });

    // Check if appointment is accepted or in_progress
    if (appointment.status !== 'accepted' && appointment.status !== 'in_progress') {
      console.log('❌ createRoom - Invalid appointment status:', appointment.status);
      return res.status(400).json({
        success: false,
        message: `Appointment must be accepted or in progress. Current status: ${appointment.status}`
      });
    }

    // Check if video call already exists and has endedAt set but status is in_progress (fix conflict)
    const existingVideoCall = await VideoCall.findOne({ appointmentId });
    if (existingVideoCall && existingVideoCall.endedAt && existingVideoCall.status === 'in_progress') {
      console.log('⚠️ createRoom - Found conflicting video call, clearing endedAt');
      existingVideoCall.endedAt = null;
      existingVideoCall.status = 'created';
      await existingVideoCall.save();
      console.log('✅ createRoom - Fixed video call conflict');
      
      return res.json({
        success: true,
        message: 'Video call room reset successfully',
        data: {
          videoCallId: existingVideoCall._id,
          roomId: existingVideoCall.roomId,
          appointmentId: existingVideoCall.appointmentId,
          status: existingVideoCall.status
        }
      });
    }
    if (existingVideoCall) {
      // If existing video call has OLD roomId (with timestamp), DELETE old and CREATE new with FIXED roomId
      const newRoomId = `room_medconnect_${appointmentId}`;
      const oldRoomId = existingVideoCall.roomId;
      
      if (oldRoomId !== newRoomId) {
        console.log('🔄 Migrating from old roomId format to new format:', {
          oldRoomId,
          newRoomId
        });
        
        // Delete old video call
        await VideoCall.deleteOne({ _id: existingVideoCall._id });
        console.log('✅ Deleted old video call with roomId:', oldRoomId);
        
        // Create new video call with FIXED roomId (no timestamp)
        const videoCallData = {
          appointmentId,
          provider: 'jitsi',
          roomId: newRoomId,
          status: 'created'
        };
        
        console.log('🔄 Creating new video call with FIXED roomId:', videoCallData);
        const videoCall = new VideoCall(videoCallData);
        await videoCall.save();
        console.log('✅ Created new video call with roomId:', newRoomId);
        
        return res.json({
          success: true,
          message: 'Video call room migrated successfully',
          data: {
            videoCallId: videoCall._id,
            roomId: videoCall.roomId,
            appointmentId: videoCall.appointmentId,
            status: videoCall.status
          }
        });
      }
      
      console.log('✅ Video call already exists, returning existing one:', existingVideoCall._id);
      return res.json({
        success: true,
        message: 'Video call room already exists',
        data: {
          videoCallId: existingVideoCall._id,
          roomId: existingVideoCall.roomId,
          appointmentId: existingVideoCall.appointmentId,
          status: existingVideoCall.status
        }
      });
    }
    
    console.log('✅ Creating new video call for appointment:', appointmentId);

    // Create video call room with FIXED roomId (no timestamp)
    // This ensures both doctor and patient join the SAME room
    const roomId = `room_medconnect_${appointmentId}`;
    
    const videoCallData = {
      appointmentId,
      provider: 'jitsi',
      roomId,
      status: 'created'
    };
    
    console.log('🔍 createRoom - Creating VideoCall with data:', videoCallData);
    console.log('🔍 createRoom - AppointmentId type:', typeof appointmentId, appointmentId);
    
    const videoCall = new VideoCall(videoCallData);
    console.log('🔍 createRoom - VideoCall instance created:', {
      hasAppointmentId: !!videoCall.appointmentId,
      appointmentIdValue: videoCall.appointmentId,
      roomId: videoCall.roomId
    });

    console.log('🔍 createRoom - Saving to database...');
    await videoCall.save();
    console.log('✅ createRoom - VideoCall saved successfully with ID:', videoCall._id);

    console.log('✅ Video call created successfully:', {
      videoCallId: videoCall._id,
      roomId: videoCall.roomId,
      appointmentId: videoCall.appointmentId,
      status: videoCall.status
    });

    res.json({
      success: true,
      message: 'Video call room created successfully',
      data: {
        videoCallId: videoCall._id,
        roomId: videoCall.roomId,
        appointmentId: videoCall.appointmentId,
        status: videoCall.status
      }
    });

  } catch (error) {
    console.error('❌ createRoom - Error creating video call room:', error);
    console.error('❌ createRoom - Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      stack: error.stack
    });
  }
});

// Get video call room info
router.get('/room/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;

    const videoCall = await VideoCall.findOne({ roomId });
    if (!videoCall) {
      return res.status(404).json({
        success: false,
        message: 'Video call room not found'
      });
    }

    res.json({
      success: true,
      data: videoCall
    });

  } catch (error) {
    console.error('Error getting video call room:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Start video call
router.post('/start/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;

    const videoCall = await VideoCall.findOne({ roomId });
    if (!videoCall) {
      return res.status(404).json({
        success: false,
        message: 'Video call room not found'
      });
    }

    // Update video call status
    videoCall.status = 'in_progress';
    videoCall.startedAt = new Date();
    await videoCall.save();

    res.json({
      success: true,
      message: 'Video call started successfully',
      data: videoCall
    });

  } catch (error) {
    console.error('Error starting video call:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// End video call
router.post('/end/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;

    const videoCall = await VideoCall.findOne({ roomId });
    if (!videoCall) {
      return res.status(404).json({
        success: false,
        message: 'Video call room not found'
      });
    }

    // Update video call status
    videoCall.status = 'ended';
    videoCall.endedAt = new Date();
    await videoCall.save();

    res.json({
      success: true,
      message: 'Video call ended successfully',
      data: videoCall
    });

  } catch (error) {
    console.error('Error ending video call:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// End video call by appointment ID
router.post('/end-by-appointment/:appointmentId', async (req, res) => {
  try {
    const { appointmentId } = req.params;
    console.log('🎯 [VideoCallAPI] Received request to end video call for appointmentId:', appointmentId);
    console.log('🎯 [VideoCallAPI] Request body:', req.body);
    console.log('🎯 [VideoCallAPI] Request headers:', req.headers);

    const videoCall = await VideoCall.findOne({ appointmentId });
    console.log('🔍 [VideoCallAPI] Found video call:', videoCall ? 'YES' : 'NO');
    
    if (!videoCall) {
      console.log('❌ [VideoCallAPI] Video call not found for appointment:', appointmentId);
      return res.status(404).json({
        success: false,
        message: 'Video call not found for this appointment'
      });
    }

    console.log('📞 [VideoCallAPI] Found video call:', videoCall._id, 'Current status:', videoCall.status);

    // Update video call status
    videoCall.status = 'ended';
    videoCall.endedAt = new Date();
    await videoCall.save();

    console.log('✅ [VideoCallAPI] Video call status updated to ended for appointmentId:', appointmentId);
    console.log('✅ [VideoCallAPI] Updated video call:', videoCall);

    res.json({
      success: true,
      message: 'Video call ended successfully',
      data: videoCall
    });

  } catch (error) {
    console.error('❌ [VideoCallAPI] Error ending video call by appointment:', error);
    console.error('❌ [VideoCallAPI] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get active video calls
router.get('/active', async (req, res) => {
  try {
    const activeVideoCalls = await VideoCall.find({
      status: { $in: ['created', 'in_progress'] }
    })
      .populate('appointmentId', 'patientId doctorId scheduledStart scheduledEnd status')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: activeVideoCalls
    });

  } catch (error) {
    console.error('Error getting active video calls:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get video call history for appointment (must be after /active route)
router.get('/appointment/:appointmentId', async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const videoCalls = await VideoCall.find({ appointmentId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: videoCalls
    });

  } catch (error) {
    console.error('Error getting video call history:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;
