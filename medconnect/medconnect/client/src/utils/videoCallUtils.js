/**
 * Utility functions for video call-related operations
 */

/**
 * Get time until call in human-readable format
 * @param {Date|string} scheduledStart - Scheduled start time
 * @returns {string} Time until call (e.g., "2h 30m" or "45m")
 */
export function getTimeUntilCall(scheduledStart) {
  const now = new Date();
  const appointmentTime = new Date(scheduledStart);
  const diffMs = appointmentTime - now;

  if (diffMs <= 0) return "Đã đến giờ";

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffHours > 0) {
    return `${diffHours}h ${diffMinutes}m`;
  }
  return `${diffMinutes}m`;
}

/**
 * Check if call can be joined (always true for accepted appointments)
 * @param {Date|string} scheduledStart - Scheduled start time
 * @returns {boolean} True if call can be joined
 */
export function isCallTime(scheduledStart) {
  // Allow joining anytime after appointment is accepted
  return true;
}

/**
 * Filter upcoming video calls from appointments
 * @param {Array} appointments - Array of appointments
 * @param {number} hoursAhead - Hours ahead to look for (default: 24)
 * @returns {Array} Filtered upcoming video calls
 */
export function filterUpcomingVideoCalls(appointments, hoursAhead = 24) {
  const now = new Date();
  const futureTime = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

  return appointments.filter((appointment) => {
    const appointmentTime = new Date(appointment.scheduledStart);
    return (
      appointment.status === "accepted" &&
      appointment.mode === "online" &&
      appointmentTime >= now &&
      appointmentTime <= futureTime
    );
  });
}
