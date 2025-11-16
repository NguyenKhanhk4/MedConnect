import React, { useState, useEffect } from "react";
import { Button } from "../ui/Button";
import { Calendar } from "lucide-react";
import { RescheduleModal } from "../RescheduleModal/RescheduleModal";

export function RescheduleButton({ appointment, onSuccess }) {
  const [showModal, setShowModal] = useState(false);
  const [hasRescheduleRequest, setHasRescheduleRequest] = useState(false);
  const [checkingRequest, setCheckingRequest] = useState(true);

  // Check for any reschedule request (pending, approved, or rejected)
  // Patient can only reschedule once, so if there's any request, hide the button
  useEffect(() => {
    const checkRescheduleRequest = async () => {
      if (!appointment?._id) {
        setCheckingRequest(false);
        return;
      }

      try {
        // Fetch ALL reschedule requests for this appointment (not just pending)
        const BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";
        const response = await fetch(
          `${BASE}/api/reschedule/patient/requests?status=all&limit=1000`,
          {
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.data?.requests) {
          // Check if there's ANY reschedule request (pending, approved, or rejected) for this appointment
          const requestForThisAppointment = data.data.requests.find(
            (req) =>
              (req.originalAppointmentId?._id || req.originalAppointmentId) ===
              appointment._id
          );

          // If there's any request (pending, approved, or rejected), hide the button
          setHasRescheduleRequest(!!requestForThisAppointment);
        } else {
          setHasRescheduleRequest(false);
        }
      } catch (error) {
        console.error("Error checking reschedule request:", error);
        // If error, assume no request to show button
        setHasRescheduleRequest(false);
      } finally {
        setCheckingRequest(false);
      }
    };

    checkRescheduleRequest();
  }, [appointment?._id]);

  const canReschedule = () => {
    if (!appointment) return false;

    // Don't show button if there's ANY reschedule request (pending, approved, or rejected)
    // Patient can only reschedule once
    if (hasRescheduleRequest) {
      return false;
    }

    // Check if appointment can be rescheduled
    if (!["accepted", "pending_doctor"].includes(appointment.status)) {
      return false;
    }

    // Check if more than 24 hours before appointment
    const appointmentTime = new Date(appointment.scheduledStart);
    const now = new Date();
    const hoursUntilAppointment = (appointmentTime - now) / (1000 * 60 * 60);

    return hoursUntilAppointment > 24;
  };

  const getDisabledReason = () => {
    if (!appointment) return "Không có thông tin lịch hẹn";

    if (hasRescheduleRequest) {
      return "Bạn chỉ có thể dời lịch 1 lần. Đã có yêu cầu dời lịch cho lịch hẹn này.";
    }

    if (!["accepted", "pending_doctor"].includes(appointment.status)) {
      return "Lịch hẹn không thể dời trong trạng thái hiện tại";
    }

    const appointmentTime = new Date(appointment.scheduledStart);
    const now = new Date();
    const hoursUntilAppointment = (appointmentTime - now) / (1000 * 60 * 60);

    if (hoursUntilAppointment <= 24) {
      return "Chỉ có thể dời lịch trước 24 giờ";
    }

    return null;
  };

  // Don't render button if checking or has any reschedule request
  if (checkingRequest) {
    return null; // Or show loading spinner
  }

  if (!canReschedule()) {
    // If has any reschedule request, don't show button at all
    if (hasRescheduleRequest) {
      return null;
    }

    return (
      <Button variant="default" size="sm" disabled title={getDisabledReason()}>
        <Calendar size={16} style={{ marginRight: 6 }} />
        Dời lịch
      </Button>
    );
  }

  return (
    <>
      <Button variant="default" size="sm" onClick={() => setShowModal(true)}>
        <Calendar size={16} style={{ marginRight: 6 }} />
        Dời lịch
      </Button>

      <RescheduleModal
        visible={showModal}
        appointment={appointment}
        onClose={() => setShowModal(false)}
        onSuccess={() => {
          setShowModal(false);
          // Mark as having reschedule request after successful submission
          // Patient can only reschedule once
          setHasRescheduleRequest(true);
          if (onSuccess) onSuccess();
        }}
      />
    </>
  );
}
