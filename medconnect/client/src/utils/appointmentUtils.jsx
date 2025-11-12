/**
 * Utility functions for appointment-related operations
 */

import { Tag } from "antd";
import { getDateRange, isDateInRange } from "./dateUtils";

/**
 * Check if status is confirmed/accepted
 * @param {string} status - Appointment status
 * @returns {boolean} True if status is confirmed/accepted
 */
export function isConfirmedStatus(status) {
  return ["confirmed", "accepted", "accept", "accecpt"].includes(status);
}

/**
 * Get status tag configuration
 * @param {string} status - Appointment status
 * @returns {Object} { color: string, text: string }
 */
export function getStatusConfig(status) {
  const statusConfig = {
    confirmed: { color: "green", text: "Đã xác nhận" },
    accepted: { color: "green", text: "Đã chấp nhận" },
    accept: { color: "green", text: "Đã xác nhận" }, // Alias for accepted
    accecpt: { color: "green", text: "Đã xác nhận" }, // Typo alias
    pending_doctor: { color: "orange", text: "Chờ xác nhận" },
    rejected: { color: "red", text: "Bị từ chối" },
    in_progress: { color: "blue", text: "Đang khám" },
    done: { color: "gray", text: "Hoàn thành" },
    cancelled: { color: "red", text: "Đã hủy" },
    no_show: { color: "red", text: "Không đến" },
  };

  return statusConfig[status] || { color: "default", text: status };
}

/**
 * Get status tag component
 * @param {string} status - Appointment status
 * @returns {JSX.Element} Tag component
 */
export function getStatusTag(status) {
  const config = getStatusConfig(status);
  return <Tag color={config.color}>{config.text}</Tag>;
}

/**
 * Format date and time for display
 * @param {string|Date} dateString - Date string or Date object
 * @param {Object} options - Format options
 * @param {boolean} options.includeWeekday - Include weekday in date (default: true)
 * @returns {Object} { date: string, time: string }
 */
export function formatDateTime(dateString, options = {}) {
  if (!dateString) {
    return { date: "Chưa xác định", time: "" };
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return { date: "Chưa xác định", time: "" };
  }

  const { includeWeekday = true } = options;

  return {
    date: date.toLocaleDateString("vi-VN", {
      ...(includeWeekday && { weekday: "long" }),
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    time: date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

/**
 * Get relationship text in Vietnamese
 * @param {string} relationship - Relationship type
 * @returns {string} Relationship text in Vietnamese
 */
export function getRelationshipText(relationship) {
  const relationshipMap = {
    father: "Bố",
    mother: "Mẹ",
    spouse: "Vợ/Chồng",
    child: "Con",
    grandparent: "Ông/Bà",
    self: "Bản thân",
    other: "Khác",
  };

  return relationshipMap[relationship] || "Khác";
}

/**
 * Get appointment mode text
 * @param {string} mode - Appointment mode (online/offline)
 * @returns {string} Mode text in Vietnamese
 */
export function getAppointmentModeText(mode) {
  return mode === "online" ? "Khám online" : "Khám tại phòng khám";
}

/**
 * Transform appointment data for display
 * @param {Object} appointment - Raw appointment from API
 * @returns {Object} Transformed appointment data
 */
export function transformAppointmentForDisplay(appointment) {
  const scheduledDate = new Date(appointment.scheduledStart);
  const day = scheduledDate.getDate();
  const month = scheduledDate.getMonth() + 1;
  const year = scheduledDate.getFullYear();
  const formattedDate = `${day}/${month}/${year}`;

  return {
    id: appointment._id,
    doctor: `BS. ${appointment.doctorId?.fullName || "Chưa xác định"}`,
    specialty:
      appointment.doctorId?.specializationIds?.[0]?.name || "Chưa xác định",
    date: formattedDate,
    time: scheduledDate.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    location:
      appointment.mode === "online"
        ? "Khám online"
        : appointment.clinicId?.name || "Phòng khám",
    status: appointment.status,
    mode: appointment.mode,
    reason: appointment.reason,
    scheduledStart: appointment.scheduledStart,
    scheduledEnd: appointment.scheduledEnd,
  };
}

/**
 * Filter appointments by status
 * @param {Array} appointments - List of appointments
 * @param {string} status - Status to filter by
 * @returns {Array} Filtered appointments
 */
export function filterByStatus(appointments, status) {
  if (!status) return appointments;
  return appointments.filter((appointment) => appointment.status === status);
}

/**
 * Filter appointments by statuses
 * @param {Array} appointments - List of appointments
 * @param {Array} statuses - Array of statuses to filter by
 * @returns {Array} Filtered appointments
 */
export function filterByStatuses(appointments, statuses) {
  if (!statuses || statuses.length === 0) return appointments;
  return appointments.filter((appointment) =>
    statuses.includes(appointment.status)
  );
}

/**
 * Get unique clinics from appointments
 * @param {Array} appointments - List of appointments
 * @returns {Array} Unique clinics
 */
export function getUniqueClinics(appointments) {
  const clinicMap = new Map();
  appointments.forEach((apt) => {
    if (apt.clinicId && apt.mode === "offline") {
      const clinicId = apt.clinicId._id || apt.clinicId;
      if (clinicId && !clinicMap.has(clinicId.toString())) {
        clinicMap.set(clinicId.toString(), {
          _id: clinicId,
          name: apt.clinicId.name || "Phòng khám",
        });
      }
    }
  });
  return Array.from(clinicMap.values());
}

/**
 * Filter appointments by clinic
 * @param {Array} appointments - List of appointments
 * @param {string} clinicId - Clinic ID to filter by
 * @returns {Array} Filtered appointments
 */
export function filterByClinic(appointments, clinicId) {
  if (!clinicId) return appointments;
  return appointments.filter(
    (appointment) =>
      appointment.clinicId?._id === clinicId ||
      appointment.clinicId?._id?.toString() === clinicId
  );
}

/**
 * Filter appointments by mode
 * @param {Array} appointments - List of appointments
 * @param {string} mode - Mode to filter by (online/offline)
 * @returns {Array} Filtered appointments
 */
export function filterByMode(appointments, mode) {
  if (!mode) return appointments;
  return appointments.filter((appointment) => appointment.mode === mode);
}

/**
 * Filter appointments by specialization
 * @param {Array} appointments - List of appointments
 * @param {string} specializationId - Specialization ID to filter by
 * @returns {Array} Filtered appointments
 */
export function filterAppointmentsBySpecialization(
  appointments,
  specializationId
) {
  if (!specializationId) return appointments;
  return appointments.filter((appointment) => {
    const specializationIds = appointment.doctorId?.specializationIds || [];
    return specializationIds.some(
      (spec) =>
        (typeof spec === "object" ? spec._id : spec) === specializationId
    );
  });
}

/**
 * Filter appointments by doctor name
 * @param {Array} appointments - List of appointments
 * @param {string} searchTerm - Search term
 * @returns {Array} Filtered appointments
 */
export function filterAppointmentsByDoctor(appointments, searchTerm) {
  if (!searchTerm?.trim()) return appointments;
  const searchLower = searchTerm.toLowerCase().trim();
  return appointments.filter((appointment) => {
    const doctorName = appointment.doctorId?.fullName?.toLowerCase() || "";
    return doctorName.includes(searchLower);
  });
}

/**
 * Apply all filters to appointments
 * @param {Array} appointments - List of appointments
 * @param {Object} filters - Filter options
 * @param {Array} specializations - List of specializations (optional, for future use)
 * @returns {Array} Filtered appointments
 */
export function applyAppointmentFilters(appointments, filters) {
  let filtered = appointments;

  // Filter by doctor name
  if (filters.doctorSearch) {
    filtered = filterAppointmentsByDoctor(filtered, filters.doctorSearch);
  }

  // Filter by specialization
  if (filters.selectedSpecialization) {
    filtered = filterAppointmentsBySpecialization(
      filtered,
      filters.selectedSpecialization
    );
  }

  // Filter by mode
  if (filters.selectedMode) {
    filtered = filterByMode(filtered, filters.selectedMode);
  }

  // Filter by clinic
  if (filters.selectedClinic) {
    filtered = filterByClinic(filtered, filters.selectedClinic);
  }

  // Filter by date range
  if (filters.customDateRange && filters.customDateRange.length === 2) {
    const [startDate, endDate] = filters.customDateRange;
    const rangeStart = new Date(startDate);
    rangeStart.setHours(0, 0, 0, 0);
    const rangeEnd = new Date(endDate);
    rangeEnd.setHours(23, 59, 59, 999);

    filtered = filtered.filter((appointment) => {
      if (!appointment.scheduledStart) return false;
      const appointmentDate = new Date(appointment.scheduledStart);
      if (!appointmentDate || isNaN(appointmentDate.getTime())) return false;
      return appointmentDate >= rangeStart && appointmentDate <= rangeEnd;
    });
  } else if (filters.selectedDateRange) {
    const range = getDateRange(filters.selectedDateRange);
    if (range) {
      filtered = filtered.filter((appointment) => {
        if (!appointment.scheduledStart) return false;
        const appointmentDate = new Date(appointment.scheduledStart);
        if (!appointmentDate || isNaN(appointmentDate.getTime())) return false;
        return isDateInRange(appointmentDate, range.start, range.end);
      });
    }
  }

  return filtered;
}
