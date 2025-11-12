import { useState, useEffect } from "react";
import { api } from "../lib/api";

export function usePatientAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAppointments = async (status = null) => {
    try {
      setLoading(true);
      setError(null);

      // Use the same logic as MyAppointments: fetch all appointments and filter client-side
      const params = {};
      if (status) {
        params.status = status;
      }
      params.limit = 50; // Get more appointments

      const queryString = new URLSearchParams(params).toString();
      const url = `/api/patients/me/appointments${
        queryString ? `?${queryString}` : ""
      }`;

      console.log("Fetching appointments from:", url);

      const response = await api.get(url);
      console.log("Appointments response:", response);

      if (response.success) {
        const allAppointments = response.data.appointments || [];

        // Apply the same filter logic as MyAppointments: only filter by status, not by date
        const filteredAppointments = allAppointments.filter((appointment) =>
          ["pending_doctor", "accepted"].includes(appointment.status)
        );

        setAppointments(filteredAppointments);
      } else {
        throw new Error(response.message || "Failed to fetch appointments");
      }
    } catch (err) {
      console.error("Error fetching appointments:", err);
      setError(err.message || "Failed to fetch appointments");
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshAppointments = () => {
    fetchAppointments();
  };

  // Function to fetch all appointments without any filtering
  const fetchAllAppointments = async () => {
    try {
      const response = await api.get("/api/patients/me/appointments?limit=100");

      if (response.success) {
        const allAppts = response.data.appointments || [];
      }
    } catch (err) {
      console.error("Error fetching all appointments:", err);
    }
  };

  useEffect(() => {
    fetchAppointments();

    // Auto refresh every 30 seconds to catch new appointments
    const interval = setInterval(() => {
      fetchAppointments();
    }, 30000);

    // Refresh when window gains focus (user comes back to tab)
    const handleFocus = () => {
      fetchAppointments();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  // Since we already filter in fetchAppointments (same as MyAppointments), all appointments are upcoming with correct status
  const upcomingAppointments = appointments;

  // Debug logging
  console.log(
    "usePatientAppointments - Upcoming appointments (accepted + pending_doctor):",
    appointments.length
  );
  console.log(
    "usePatientAppointments - Appointments data:",
    appointments.map((a) => ({
      id: a._id,
      status: a.status,
      doctor: a.doctorId?.fullName,
      scheduledStart: a.scheduledStart,
    }))
  );

  const pastAppointments = appointments.filter((appointment) => {
    const appointmentDate = new Date(appointment.scheduledStart);
    return (
      appointmentDate <= now ||
      ["done", "cancelled", "auto_cancelled", "no_show"].includes(
        appointment.status
      )
    );
  });

  // Get appointments by status
  const getAppointmentsByStatus = (status) => {
    return appointments.filter((appointment) => appointment.status === status);
  };

  // Get pending appointments (waiting for doctor confirmation)
  const pendingAppointments = getAppointmentsByStatus("pending_doctor");

  // Debug logging
  console.log("All appointments:", appointments);
  console.log("Pending appointments:", pendingAppointments);
  console.log("Upcoming appointments:", upcomingAppointments);

  return {
    appointments,
    upcomingAppointments,
    pastAppointments,
    pendingAppointments,
    loading,
    error,
    refreshAppointments,
    fetchAppointments,
    fetchAllAppointments,
    getAppointmentsByStatus,
  };
}
