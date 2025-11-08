/**
 * Form utility functions
 */

/**
 * Format date for display (DD/MM/YYYY)
 * @param {string|Date} dateString - Date to format
 * @returns {string} Formatted date string
 */
export function formatDateForDisplay(dateString) {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  } catch (error) {
    return "";
  }
}

/**
 * Format date for API (ISO string)
 * @param {string} dateString - Date in DD/MM/YYYY format
 * @returns {string|null} ISO date string or null
 */
export function formatDateForAPI(dateString) {
  if (!dateString) return null;
  try {
    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    if (dateRegex.test(dateString)) {
      const [, day, month, year] = dateString.match(dateRegex);
      const date = new Date(year, month - 1, day);
      if (isNaN(date.getTime())) return null;
      return date.toISOString();
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Auto-format date input (DD/MM/YYYY)
 * @param {string} value - Input value
 * @returns {string} Formatted value
 */
export function formatDateInput(value) {
  // Remove all non-digit characters
  const digitsOnly = value.replace(/\D/g, "");

  // Limit to 8 digits (DDMMYYYY)
  const limitedDigits = digitsOnly.slice(0, 8);

  // Format: DD/MM/YYYY
  if (limitedDigits.length <= 2) {
    // DD
    return limitedDigits;
  } else if (limitedDigits.length <= 4) {
    // DD/MM
    return `${limitedDigits.slice(0, 2)}/${limitedDigits.slice(2)}`;
  } else {
    // DD/MM/YYYY
    return `${limitedDigits.slice(0, 2)}/${limitedDigits.slice(
      2,
      4
    )}/${limitedDigits.slice(4)}`;
  }
}

/**
 * Handle date input keydown event
 * @param {KeyboardEvent} e - Keyboard event
 */
export function handleDateInputKeyDown(e) {
  // Allow: backspace, delete, tab, escape, enter, and numbers
  if (
    [46, 8, 9, 27, 13, 110, 190].indexOf(e.keyCode) !== -1 ||
    // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
    (e.keyCode === 65 && e.ctrlKey === true) ||
    (e.keyCode === 67 && e.ctrlKey === true) ||
    (e.keyCode === 86 && e.ctrlKey === true) ||
    (e.keyCode === 88 && e.ctrlKey === true) ||
    // Allow: home, end, left, right, down, up
    (e.keyCode >= 35 && e.keyCode <= 40)
  ) {
    return;
  }
  // Ensure that it is a number and stop the keypress
  if (
    (e.shiftKey || e.keyCode < 48 || e.keyCode > 57) &&
    (e.keyCode < 96 || e.keyCode > 105)
  ) {
    e.preventDefault();
  }
}

/**
 * Get initial form data structure
 * @returns {Object} Initial form data object
 */
export function getInitialFormData() {
  return {
    fullName: "",
    phone: "",
    gender: "",
    email: "",
    birthDate: "",
    bloodType: "",
    address: "",
    allergies: "",
    ethnicity: "",
    occupation: "",
    citizenId: "",
    houseNumber: "",
    representativeName: "",
    representativeCitizenId: "",
    representativeRelation: "",
    representativePhone: "",
    medicalHistory: [],
    healthInsurance: "",
    healthInsuranceIssueDate: "",
    healthInsuranceExpiryDate: "",
    notes: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  };
}

/**
 * Map user profile to form data
 * @param {Object} userProfile - User profile object
 * @returns {Object} Form data object
 */
export function mapProfileToFormData(userProfile) {
  if (!userProfile) return getInitialFormData();

  return {
    fullName: userProfile.fullName || userProfile.displayName || "",
    phone: userProfile.phone || "",
    gender: userProfile.gender || "",
    email: userProfile.email || "",
    birthDate: formatDateForDisplay(userProfile.dob),
    bloodType: userProfile.bloodType || "",
    address: userProfile.address || "",
    allergies: userProfile.allergyNotes || "",
    ethnicity: userProfile.ethnicity || "",
    occupation: userProfile.occupation || "",
    citizenId: userProfile.citizenId || "",
    houseNumber: userProfile.houseNumber || "",
    representativeName: userProfile.representativeName || "",
    representativeCitizenId: userProfile.representativeCitizenId || "",
    representativeRelation: userProfile.representativeRelation || "",
    representativePhone: userProfile.representativePhone || "",
    medicalHistory: userProfile.medicalHistory || [],
    healthInsurance: userProfile.healthInsurance || "",
    healthInsuranceIssueDate: formatDateForDisplay(
      userProfile.healthInsuranceIssueDate
    ),
    healthInsuranceExpiryDate: formatDateForDisplay(
      userProfile.healthInsuranceExpiryDate
    ),
    notes: userProfile.notes || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  };
}
