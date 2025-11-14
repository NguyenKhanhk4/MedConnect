/**
 * Utility functions for statistics calculations
 */

/**
 * Calculate appointment statistics
 * @param {Array} appointments - Array of appointments
 * @returns {Object} Statistics object with counts for each status
 */
export function calculateAppointmentStats(appointments) {
  const stats = {
    confirmed: 0,
    pending: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
  };

  appointments.forEach((appointment) => {
    const status = appointment.status;
    if (status === "accepted") {
      stats.confirmed++;
    } else if (status === "pending_doctor") {
      stats.pending++;
    } else if (status === "in_progress") {
      stats.in_progress++;
    } else if (status === "done") {
      stats.completed++;
    } else if (status === "cancelled") {
      stats.cancelled++;
    }
  });

  return stats;
}

/**
 * Get trend text based on count
 * @param {number} count - Count value
 * @param {string} positiveText - Text when count > 0 (may contain {count} placeholder)
 * @param {string} negativeText - Text when count === 0
 * @returns {string} Trend text
 */
export function getTrendText(count, positiveText, negativeText) {
  if (count > 0) {
    return positiveText.replace(/{count}/g, count.toString());
  }
  return negativeText;
}
