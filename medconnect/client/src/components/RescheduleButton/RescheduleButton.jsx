import React, { useState } from "react";
import { Button } from "../ui/Button";
import { Calendar } from "lucide-react";
import { RescheduleModal } from "../RescheduleModal/RescheduleModal";

export function RescheduleButton({ appointment, onSuccess }) {
  const [showModal, setShowModal] = useState(false);

  const canReschedule = () => {
    if (!appointment) return false;

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

  if (!canReschedule()) {
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
          if (onSuccess) onSuccess();
        }}
      />
    </>
  );
}
