import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { message } from "antd";

/**
 * Custom hook to fetch patient appointments
 * @returns {Object} { appointments, loading, error, refreshAppointments }
 */
export function useAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/api/patients/me/appointments?limit=1000");
      if (res.success) {
        setAppointments(res.data.appointments || []);
        return res.data.appointments || [];
      } else {
        const errorMsg = "Không thể tải lịch hẹn";
        message.error(errorMsg);
        setError(new Error(errorMsg));
        return [];
      }
    } catch (e) {
      const errorMsg = "Có lỗi khi tải lịch hẹn";
      message.error(errorMsg);
      setError(e);
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const refreshAppointments = async () => {
    return await fetchAppointments();
  };

  return {
    appointments,
    loading,
    error,
    refreshAppointments,
    setAppointments,
  };
}
