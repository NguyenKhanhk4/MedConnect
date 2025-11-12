import { useState, useEffect } from "react";
import { message } from "antd";
import { api } from "../lib/api";

/**
 * Custom hook for fetching appointment details
 * @param {string|boolean} appointmentIdOrVisible - Appointment ID or visible flag (for backward compatibility)
 * @param {string} appointmentId - Appointment ID (optional, for backward compatibility)
 * @returns {Object} { appointment, loading, error, fetchAppointmentDetails }
 */
export function useAppointmentDetails(appointmentIdOrVisible, appointmentId) {
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Support both old signature (visible, appointmentId) and new signature (appointmentId)
  const actualAppointmentId =
    typeof appointmentIdOrVisible === "string"
      ? appointmentIdOrVisible
      : appointmentId;
  const visible =
    typeof appointmentIdOrVisible === "boolean" ? appointmentIdOrVisible : true;

  const fetchAppointmentDetails = async () => {
    if (!actualAppointmentId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await api.get(
        `/api/patients/me/appointments/${actualAppointmentId}`
      );

      if (response.success) {
        setAppointment(response.data);
      } else {
        const errorMsg = response.message || "Không thể tải thông tin lịch hẹn";
        setError(new Error(errorMsg));
        message.error(errorMsg);
      }
    } catch (err) {
      console.error("Error fetching appointment details:", err);
      const errorMsg = "Có lỗi xảy ra khi tải thông tin";
      setError(err);
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (actualAppointmentId) {
      if (typeof appointmentIdOrVisible === "boolean") {
        // Old signature: only fetch if visible is true
        if (visible) {
          fetchAppointmentDetails();
        } else {
          setAppointment(null);
          setError(null);
        }
      } else {
        // New signature: always fetch when appointmentId is provided
        fetchAppointmentDetails();
      }
    }
  }, [visible, actualAppointmentId]);

  return {
    appointment,
    loading,
    error,
    fetchAppointmentDetails,
  };
}
