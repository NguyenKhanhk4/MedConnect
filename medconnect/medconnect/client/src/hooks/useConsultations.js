import { useState, useEffect } from "react";
import { api } from "../lib/api";

export function useConsultations() {
  const [upcomingConsultations, setUpcomingConsultations] = useState([]);
  const [consultationHistory, setConsultationHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchConsultations = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch upcoming appointments (online mode, status: accepted - đã lên lịch)
      // Tạm thời fetch tất cả để debug
      const upcomingResponse = await api.get("/api/patients/me/appointments", {
        params: {
          limit: 20,
        },
      });

      // Fetch completed appointments (online mode, status: done)
      const historyResponse = await api.get("/api/patients/me/appointments", {
        params: {
          status: "done",
          limit: 10,
        },
      });

      if (upcomingResponse.success) {
        console.log("Upcoming API Response:", upcomingResponse.data);

        // Filter chỉ lấy appointments đã được xác nhận (đã lên lịch)
        const onlineUpcoming = upcomingResponse.data.appointments.filter(
          (appointment) =>
            appointment.mode === "online" &&
            (appointment.status === "accept" ||
              appointment.status === "accecpt" ||
              appointment.status === "confirmed" ||
              appointment.status === "accepted")
        );

        console.log("Online Accepted Appointments:", onlineUpcoming);

        const upcomingData = onlineUpcoming.map((appointment) => ({
          id: appointment._id,
          doctor: {
            id: appointment.doctorId._id,
            name: `BS. ${appointment.doctorId.fullName}`,
            avatar: appointment.doctorId.avatarUrl || null,
            specialty:
              appointment.doctorId.specializationIds?.[0]?.name ||
              "Chưa xác định",
          },
          status: getStatusText(appointment.status),
          statusType: getStatusType(appointment.status),
          date: formatDate(appointment.scheduledStart),
          time: formatTime(
            appointment.scheduledStart,
            appointment.scheduledEnd
          ),
          scheduledStart: appointment.scheduledStart,
          scheduledEnd: appointment.scheduledEnd,
          mode: appointment.mode,
          appointmentId: appointment._id,
        }));

        console.log("Mapped Upcoming Data:", upcomingData);
        setUpcomingConsultations(upcomingData);
      }

      if (historyResponse.success) {
        console.log("History API Response:", historyResponse.data);

        // Filter only online appointments with status "done" (đã hoàn thành)
        const onlineHistory = historyResponse.data.appointments.filter(
          (appointment) =>
            appointment.mode === "online" && appointment.status === "done"
        );

        console.log("Online Completed Appointments (done):", onlineHistory);

        const historyData = onlineHistory.map((appointment) => {
          console.log(`Appointment ${appointment._id}:`, {
            doctor: appointment.doctorId.fullName,
            actualStatus: appointment.status,
            scheduledStart: appointment.scheduledStart,
          });

          return {
            id: appointment._id,
            doctor: {
              id: appointment.doctorId._id,
              name: `BS. ${appointment.doctorId.fullName}`,
              avatar: appointment.doctorId.avatarUrl || null,
              specialty:
                appointment.doctorId.specializationIds?.[0]?.name ||
                "Chưa xác định",
            },
            status: getStatusText(appointment.status),
            statusType: getStatusType(appointment.status),
            date: formatDate(appointment.scheduledStart),
            time: formatTime(
              appointment.scheduledStart,
              appointment.scheduledEnd
            ),
            scheduledStart: appointment.scheduledStart,
            scheduledEnd: appointment.scheduledEnd,
            mode: appointment.mode,
            appointmentId: appointment._id,
          };
        });

        console.log("Mapped History Data:", historyData);
        setConsultationHistory(historyData);
      }
    } catch (err) {
      console.error("Error fetching consultations:", err);
      setError(err.message || "Có lỗi xảy ra khi tải dữ liệu tư vấn");
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "confirmed":
        return "Đã xác nhận";
      case "accept":
        return "Đã lên lịch";
      case "accepted":
        return "Đã lên lịch";
      case "pending_doctor":
        return "Chờ bác sĩ";
      case "in_progress":
        return "Đang diễn ra";
      case "done":
        return "Đã hoàn thành";
      case "cancelled":
        return "Đã hủy";
      default:
        return "Chưa xác định";
    }
  };

  const getStatusType = (status) => {
    switch (status) {
      case "confirmed":
      case "accept":
      case "accepted":
      case "in_progress":
        return "scheduled";
      case "done":
        return "completed";
      case "cancelled":
        return "cancelled";
      default:
        return "pending";
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatTime = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const duration = Math.round((end - start) / (1000 * 60)); // duration in minutes

    return `${start.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    })} (${duration} phút)`;
  };

  useEffect(() => {
    fetchConsultations();
  }, []);

  const refreshConsultations = () => {
    fetchConsultations();
  };

  return {
    upcomingConsultations,
    consultationHistory,
    loading,
    error,
    refreshConsultations,
  };
}
