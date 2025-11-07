/**
 * Utility functions for greeting and time-related operations
 */

/**
 * Get greeting based on current hour
 * @returns {string} Greeting text
 */
export function getGreeting() {
  const currentHour = new Date().getHours();
  if (currentHour < 12) return "Chào buổi sáng";
  if (currentHour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

/**
 * Get today's date range (start and end of day)
 * @returns {Object} { startOfDay: Date, endOfDay: Date }
 */
export function getTodayDateRange() {
  const today = new Date();
  const startOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const endOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1
  );
  return { startOfDay, endOfDay };
}
