/* =======================================================
 * COLLECTION: Video_calls
 *  Phòng video online
 * ======================================================= */

import mongoose from "mongoose";
const { Schema, model } = mongoose;

const VideoCallSchema = new Schema(
  {
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
      unique: true,
      required: true,
    },
    provider: { 
      type: String, 
      enum: ["jitsi", "webrtc", "zego", "agora"], 
      default: "jitsi",
      required: true 
    },
    roomId: { 
      type: String, 
      required: true,
      unique: true
    },
    joinUrl: String,
    startedAt: Date,
    endedAt: Date,
    status: {
      type: String,
      enum: ["created", "in_progress", "ended", "cancelled"],
      default: "created",
      required: true
    },
    duration: {
      type: Number, // Duration in seconds
      default: 0
    },
    participants: [{
      userId: { type: Schema.Types.ObjectId, ref: "User" },
      role: { type: String, enum: ["patient", "doctor"] },
      joinedAt: { type: Date, default: Date.now },
      leftAt: Date
    }],
    quality: {
      video: { type: String, enum: ["low", "medium", "high"], default: "medium" },
      audio: { type: String, enum: ["low", "medium", "high"], default: "medium" }
    },
    recording: {
      enabled: { type: Boolean, default: false },
      url: String,
      duration: Number
    },
    notes: String, // Doctor's notes about the call
    technicalIssues: [{
      type: { type: String, enum: ["connection", "audio", "video", "other"] },
      description: String,
      timestamp: { type: Date, default: Date.now },
      resolved: { type: Boolean, default: false }
    }]
  },
  { timestamps: true, collection: "Video_calls" }
);

// Calculate duration when call ends
VideoCallSchema.pre('save', function(next) {
  if (this.isModified('endedAt') && this.endedAt && this.startedAt) {
    this.duration = Math.floor((this.endedAt - this.startedAt) / 1000);
  }
  next();
});

// Validate roomId format
VideoCallSchema.pre('validate', function(next) {
  if (this.roomId && !this.roomId.startsWith('room_')) {
    this.invalidate('roomId', 'Room ID must start with "room_"');
  }
  next();
});

// Index for better performance
VideoCallSchema.index({ status: 1, createdAt: -1 });
VideoCallSchema.index({ 'participants.userId': 1 });
VideoCallSchema.index({ startedAt: 1, endedAt: 1 });

// Virtual for call duration in minutes
VideoCallSchema.virtual('durationMinutes').get(function() {
  return this.duration ? Math.round(this.duration / 60) : 0;
});

// Method to add participant
VideoCallSchema.methods.addParticipant = function(userId, role) {
  const existingParticipant = this.participants.find(p => p.userId.toString() === userId.toString());
  
  if (existingParticipant) {
    existingParticipant.joinedAt = new Date();
    existingParticipant.leftAt = undefined;
  } else {
    this.participants.push({
      userId,
      role,
      joinedAt: new Date()
    });
  }
  
  return this.save();
};

// Method to remove participant
VideoCallSchema.methods.removeParticipant = function(userId) {
  const participant = this.participants.find(p => p.userId.toString() === userId.toString());
  
  if (participant) {
    participant.leftAt = new Date();
  }
  
  return this.save();
};

// Method to add technical issue
VideoCallSchema.methods.addTechnicalIssue = function(type, description) {
  this.technicalIssues.push({
    type,
    description,
    timestamp: new Date()
  });
  
  return this.save();
};

// Static method to get active calls
VideoCallSchema.statics.getActiveCalls = function() {
  return this.find({
    status: { $in: ['created', 'in_progress'] }
  }).populate('appointmentId', 'patientId doctorId scheduledStart scheduledEnd status');
};

// Static method to get call statistics
VideoCallSchema.statics.getCallStats = function(startDate, endDate) {
  const match = {};
  
  if (startDate && endDate) {
    match.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalDuration: { $sum: '$duration' },
        avgDuration: { $avg: '$duration' }
      }
    }
  ]);
};

export default model("VideoCall", VideoCallSchema);
