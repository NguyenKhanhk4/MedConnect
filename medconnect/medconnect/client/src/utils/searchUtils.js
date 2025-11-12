/**
 * Utility functions for search and filtering operations
 */

/**
 * Filter doctors by search term
 * @param {Array} doctors - Array of doctor objects
 * @param {string} searchTerm - Search term
 * @returns {Array} Filtered doctors
 */
export function filterDoctorsBySearch(doctors, searchTerm) {
  if (!searchTerm || !searchTerm.trim()) return doctors;

  const term = searchTerm.toLowerCase().trim();
  return doctors.filter((doctor) => {
    const name = (
      doctor.userId?.fullName ||
      doctor.fullName ||
      ""
    ).toLowerCase();
    const specialty = (doctor.specializationIds?.[0]?.name || "").toLowerCase();
    const bio = (doctor.bio || "").toLowerCase();
    const email = (doctor.userId?.email || "").toLowerCase();
    const phone = (doctor.userId?.phone || "").toLowerCase();

    return (
      name.includes(term) ||
      specialty.includes(term) ||
      bio.includes(term) ||
      email.includes(term) ||
      phone.includes(term)
    );
  });
}

/**
 * Format price in Vietnamese currency
 * @param {number} price - Price value
 * @returns {string} Formatted price string
 */
export function formatPrice(price) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
}
