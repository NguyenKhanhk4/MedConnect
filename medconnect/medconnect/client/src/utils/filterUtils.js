/**
 * Utility functions for filtering records
 */

import { getRecordDate, getDateRange, isDateInRange } from "./dateUtils";

/**
 * Filter records by doctor name
 * @param {Array} records - Records to filter
 * @param {string} searchTerm - Search term
 * @returns {Array} Filtered records
 */
export function filterByDoctor(records, searchTerm) {
  if (!searchTerm?.trim()) return records;
  const searchLower = searchTerm.toLowerCase().trim();
  return records.filter((record) => {
    const doctorName = record.doctor?.toLowerCase() || "";
    return doctorName.includes(searchLower);
  });
}

/**
 * Filter records by specialization
 * @param {Array} records - Records to filter
 * @param {string} specializationId - Specialization ID
 * @param {Array} specializations - List of specializations
 * @returns {Array} Filtered records
 */
export function filterBySpecialization(
  records,
  specializationId,
  specializations
) {
  if (!specializationId) return records;
  const spec = specializations.find((s) => s._id === specializationId);
  if (!spec) return records;

  return records.filter((record) => {
    const recordSpecialty = record.specialty?.toLowerCase() || "";
    return recordSpecialty.includes(spec.name.toLowerCase());
  });
}

/**
 * Filter records by consultation type
 * @param {Array} records - Records to filter
 * @param {string} type - Consultation type
 * @returns {Array} Filtered records
 */
export function filterByConsultationType(records, type) {
  if (!type) return records;
  return records.filter((record) => {
    const recordType = record.type?.toLowerCase() || "";
    return recordType.includes(type.toLowerCase());
  });
}

/**
 * Filter records by date range
 * @param {Array} records - Records to filter
 * @param {string} preset - Preset date range ('today', 'week', 'month', 'year')
 * @param {Array} customRange - Custom date range [start, end]
 * @param {Array} dateFields - Date fields to check in record
 * @returns {Array} Filtered records
 */
export function filterByDateRange(
  records,
  preset,
  customRange,
  dateFields = []
) {
  // Custom range has priority
  if (customRange && customRange.length === 2) {
    const [startDate, endDate] = customRange;
    const rangeStart = new Date(startDate);
    rangeStart.setHours(0, 0, 0, 0);
    const rangeEnd = new Date(endDate);
    rangeEnd.setHours(23, 59, 59, 999);

    return records.filter((record) => {
      const recordDate = getRecordDate(record, dateFields);
      if (!recordDate) return false;
      return recordDate >= rangeStart && recordDate <= rangeEnd;
    });
  }

  // Preset range
  if (preset) {
    const range = getDateRange(preset);
    if (!range) return records;

    return records.filter((record) => {
      const recordDate = getRecordDate(record, dateFields);
      if (!recordDate) return false;
      return isDateInRange(recordDate, range.start, range.end);
    });
  }

  return records;
}

/**
 * Apply all filters to records
 * @param {Array} records - Records to filter
 * @param {Object} filters - Filter options
 * @param {Array} specializations - List of specializations
 * @param {Array} dateFields - Date fields to check
 * @returns {Array} Filtered records
 */
export function applyFilters(
  records,
  filters,
  specializations = [],
  dateFields = []
) {
  let filtered = records;

  // Filter by doctor
  filtered = filterByDoctor(filtered, filters.doctorSearch);

  // Filter by specialization
  filtered = filterBySpecialization(
    filtered,
    filters.selectedSpecialization,
    specializations
  );

  // Filter by consultation type
  if (filters.selectedConsultationType) {
    filtered = filterByConsultationType(
      filtered,
      filters.selectedConsultationType
    );
  }

  // Filter by date range
  filtered = filterByDateRange(
    filtered,
    filters.selectedDateRange,
    filters.customDateRange,
    dateFields
  );

  return filtered;
}
