/**
 * Utility functions for review-related operations
 */

/**
 * Get rating text based on rating value
 * @param {number} rating - Rating value (0-5)
 * @returns {string} Rating text description
 */
export function getRatingText(rating) {
  const ratingTexts = {
    0: "Chọn số sao",
    1: "Rất không hài lòng",
    2: "Không hài lòng",
    3: "Bình thường",
    4: "Hài lòng",
    5: "Rất hài lòng",
  };

  return ratingTexts[rating] || "Chọn số sao";
}

/**
 * Validate review data
 * @param {Object} reviewData - Review data object
 * @returns {Object} { isValid: boolean, error: string }
 */
export function validateReview(reviewData) {
  const { rating, comment } = reviewData;

  if (rating === 0) {
    return { isValid: false, error: "Vui lòng chọn số sao đánh giá" };
  }

  if (!comment || !comment.trim()) {
    return { isValid: false, error: "Vui lòng nhập nhận xét" };
  }

  return { isValid: true, error: null };
}

/**
 * Format appointment date and time for display
 * @param {Date|string} date - Appointment date
 * @returns {Object} { dateText: string, timeText: string }
 */
export function formatAppointmentDateTime(date) {
  const dateObj = date instanceof Date ? date : new Date(date);
  const dateText = dateObj.toLocaleDateString("vi-VN");
  const timeText = dateObj.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return { dateText, timeText };
}
