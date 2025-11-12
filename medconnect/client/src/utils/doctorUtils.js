/**
 * Utility functions for doctor-related operations
 */

/**
 * Get specialization names as comma-separated string
 * @param {Array} specializations - Array of specialization objects
 * @returns {string} Comma-separated specialization names or "Chưa xác định"
 */
export function getSpecializationNames(specializations) {
  if (!specializations || specializations.length === 0) return "Chưa xác định";
  return specializations.map((spec) => spec.name).join(", ");
}

/**
 * Get full name with "BS." prefix if not already present
 * @param {Object} doctor - Doctor object
 * @returns {string} Full name with "BS." prefix
 */
export function getFullName(doctor) {
  const fullName = doctor.fullName || "";
  return fullName.startsWith("BS.") ? fullName : `BS. ${fullName}`;
}

/**
 * Format doctor rating display
 * @param {number} ratingAvg - Average rating
 * @param {number} ratingCount - Number of ratings
 * @returns {string} Formatted rating string
 */
export function formatDoctorRating(ratingAvg, ratingCount) {
  return `${ratingAvg?.toFixed(1) || "0.0"} (${ratingCount || 0} đánh giá)`;
}
