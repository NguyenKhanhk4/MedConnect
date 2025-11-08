import React, { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { message } from "antd";
import jitsiService from "../../../services/jitsiService";
import VideoCallAPI from "../../../services/videoCallAPI";
import "./TrangGoiVideo.css";

const TrangGoiVideo = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const jitsiContainerRef = useRef(null);
  const containerId = "jitsi-container-doctor";
  const hasJoinedConference = useRef(false);
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Prevent duplicate initialization
    if (hasInitialized.current) {
      console.log("⚠️ TrangGoiVideo already initialized, skipping...");
      return;
    }

    // Use FIXED roomId to ensure doctor and patient join the SAME room
    const roomId = `room_medconnect_${appointmentId}`;
    console.log("🎥 Doctor Initializing Jitsi Meet with FIXED room:", roomId);

    hasInitialized.current = true;

    // Ensure a video call record exists in DB before starting Jitsi
    (async () => {
      try {
        console.log(
          "🗄️ Creating/ensuring video call room in DB for appointment:",
          appointmentId
        );
        const createRes = await VideoCallAPI.createRoom(appointmentId);
        console.log("🗄️ Video call room ensure result:", createRes);
      } catch (e) {
        console.warn(
          "⚠️ Could not create video call room (continuing anyway):",
          e?.message
        );
      } finally {
        initializeJitsiCall(roomId);
      }
    })();

    return () => {
      // Cleanup on unmount
      hasInitialized.current = false;
      if (jitsiService.isInitialized()) {
        jitsiService.endCall();
      }
    };
  }, [appointmentId]);

  const initializeJitsiCall = async (roomId) => {
    try {
      // Set up callbacks
      jitsiService.setCallbacks({
        onConferenceJoined: async () => {
          console.log("✅ Doctor joined conference successfully");
          hasJoinedConference.current = true; // Đánh dấu đã join thành công
          // Đợi một chút rồi báo thành công
          setTimeout(() => {
            message.success("Đã kết nối cuộc gọi video thành công");
          }, 500);

          // Mark call as started in DB
          try {
            await VideoCallAPI.startCall(roomId);
          } catch (e) {
            console.warn("⚠️ Could not mark video call started:", e?.message);
          }
        },
        onParticipantJoined: (event) => {
          console.log("Participant joined:", event);
          const participantName = event?.participant?.displayName || "Unknown";
          console.log("🎉 Bệnh nhân đã tham gia!");
          message.success(`Bệnh nhân ${participantName} đã tham gia cuộc gọi`);
        },
        onParticipantLeft: (event) => {
          console.log("Participant left:", event);
          message.warning("Một người tham gia đã rời khỏi cuộc gọi");
        },
        onAudioMuteStatusChanged: (isMuted) => {
          console.log("Audio muted:", isMuted);
          if (isMuted) {
            message.info("Microphone đã tắt");
          }
        },
        onVideoMuteStatusChanged: (isMuted) => {
          console.log("Video muted:", isMuted);
          if (isMuted) {
            message.info("Camera đã tắt");
          }
        },
        onReadyToClose: async () => {
          console.log("Ready to close");
          // CHỈ redirect nếu đã thực sự join conference (không phải lỗi membersOnly)
          if (hasJoinedConference.current) {
            console.log("Closing video call window...");
            // Đóng TAB HIỆN TẠI thay vì redirect về dashboard
            window.close();
          } else {
            console.log("Not redirecting - conference failed before joining");
          }
        },
        onError: (error) => {
          console.error("Jitsi Error:", error);
          // Nếu là lỗi membersOnly, CHỈ HƯỚNG DẪN - KHÔNG REDIRECT
          if (
            error?.error === "membersOnly" ||
            error?.toString().includes("membersOnly")
          ) {
            console.log(
              'Room requires moderator. Please click "Mình là quản trị viên" button.'
            );
            message.warning(
              'Vui lòng bấm nút "Mình là quản trị viên" để bắt đầu cuộc gọi'
            );
            // KHÔNG redirect - để user bấm nút "Mình là quản trị viên"
            return;
          } else if (error?.error === "gum.permission_denied") {
            console.error("❌ Permission denied for camera/microphone");
            message.error(
              "Vui lòng cho phép truy cập camera và microphone để tham gia cuộc gọi"
            );
          } else {
            message.error("Có lỗi xảy ra trong cuộc gọi video");
          }
        },
      });

      // Initialize Jitsi Meet
      await jitsiService.initialize(containerId, roomId, {
        displayName: "Bác sĩ",
        email: "",
      });

      console.log("✅ Jitsi initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Jitsi call:", error);
      message.error("Không thể khởi tạo cuộc gọi video");
    }
  };

  const handleBack = () => {
    if (jitsiService.isInitialized()) {
      jitsiService.endCall();
    }
    navigate("/bac-si/trang-chu");
  };

  return (
    <div className="doctor-video-call-page">
      {/* Jitsi Meet Container - Fullscreen, không có nút back */}
      <div className="jitsi-container-wrapper">
        <div
          id={containerId}
          ref={jitsiContainerRef}
          style={{
            width: "100vw",
            height: "100vh",
            position: "absolute",
            top: 0,
            left: 0,
          }}
        />
      </div>
    </div>
  );
};

export default TrangGoiVideo;
