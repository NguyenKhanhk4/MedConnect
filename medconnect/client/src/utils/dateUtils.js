/**
 * Utility functions for date parsing and filtering
 */

import dayjs from "dayjs";

/**
 * Parse date from various formats
 * @param {string|Date} dateSource - Date in various formats
 * @returns {Date|null} Parsed date or null if invalid
 */
export function parseDate(dateSource) {
  if (!dateSource) return null;

  // If already a Date object
  if (dateSource instanceof Date) {
    return isNaN(dateSource.getTime()) ? null : dateSource;
  }

  // If string with "/" format (DD/MM/YYYY)
  if (typeof dateSource === "string" && dateSource.includes("/")) {
    const parts = dateSource.split("/");
    if (parts.length === 3) {
      const date = new Date(
        parseInt(parts[2]),
        parseInt(parts[1]) - 1,
        parseInt(parts[0])
      );
      return isNaN(date.getTime()) ? null : date;
    }
  }

  // Try standard Date parsing
  const date = new Date(dateSource);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Get date from record (tries multiple sources)
 * @param {Object} record - Record object
 * @param {Array} dateFields - Array of field names to try
 * @returns {Date|null} Parsed date or null
 */
export function getRecordDate(record, dateFields = []) {
  const defaultFields = [
    "fullDetails?.visitDate",
    "fullDetails?.startedAt",
    "visitDate",
    "startedAt",
    "appointmentId?.scheduledStart",
    "dateTime",
    "date",
  ];

  const fieldsToTry = dateFields.length > 0 ? dateFields : defaultFields;

  for (const field of fieldsToTry) {
    const value = field.split("?.").reduce((obj, key) => obj?.[key], record);
    if (value) {
      const parsed = parseDate(value);
      if (parsed) return parsed;
    }
  }

  return null;
}

/**
 * Get date range for preset filters
 * @param {string} preset - Preset name: 'today', 'week', 'month', 'year'
 * @returns {Object} { start: Date, end: Date }
 */
export function getDateRange(preset) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  switch (preset) {
    case "today":
      return { start: todayStart, end: todayEnd };

    case "week": {
      const weekStart = new Date(todayStart);
      const dayOfWeek = now.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      weekStart.setDate(weekStart.getDate() - daysToMonday);
      weekStart.setHours(0, 0, 0, 0);
      return { start: weekStart, end: todayStart };
    }

    case "month": {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      monthStart.setHours(0, 0, 0, 0);
      return { start: monthStart, end: todayStart };
    }

    case "year": {
      const yearStart = new Date(now.getFullYear(), 0, 1);
      yearStart.setHours(0, 0, 0, 0);
      return { start: yearStart, end: todayStart };
    }

    default:
      return null;
  }
}

/**
 * Check if date is within range
 * @param {Date} date - Date to check
 * @param {Date} start - Range start
 * @param {Date} end - Range end
 * @returns {boolean}
 */
export function isDateInRange(date, start, end) {
  if (!date) return false;
  const dateOnly = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
  dateOnly.setHours(0, 0, 0, 0);
  return dateOnly >= start && dateOnly <= end;
}

/**
 * Get days in month for calendar display
 * @param {Date} date - Date to get days for
 * @returns {Array} Array of days (null for empty cells, number for day)
 */
export function getDaysInMonth(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const days = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }
  return days;
}

/**
 * Get start and end of month
 * @param {Date} date - Date to get month range for
 * @returns {Object} { start: Date, end: Date }
 */
export function getMonthRange(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0);
  return { start: startOfMonth, end: endOfMonth };
}

/**
 * Format month name in Vietnamese
 * @param {Date} date - Date to format
 * @returns {string} Formatted month name (e.g., "tháng 11 năm 2025")
 */
export function formatMonthName(date) {
  const month = date.getMonth() + 1; // 0-11 -> 1-12
  const year = date.getFullYear();
  return `tháng ${month} năm ${year}`;
}

/**
 * Check if date is in current month
 * @param {Date} date - Date to check
 * @returns {boolean} True if date is in current month
 */
export function isCurrentMonth(date) {
  const today = new Date();
  return (
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}
