/**
 * Validation utility functions for forms
 */

/**
 * Validate Vietnamese phone number
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid
 */
export function isValidVietnamesePhone(phone) {
  if (!phone) return false;
  return /^(\+84|84|0)[1-9][0-9]{8,9}$/.test(phone.replace(/\s/g, ""));
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
export function isValidEmail(email) {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate date in DD/MM/YYYY format
 * @param {string} dateString - Date string to validate
 * @returns {Object} { isValid: boolean, date: Date|null, error: string|null }
 */
export function validateDateDDMMYYYY(dateString) {
  if (!dateString) {
    return { isValid: false, date: null, error: null };
  }

  const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  if (!dateRegex.test(dateString)) {
    return {
      isValid: false,
      date: null,
      error: "Phải có định dạng DD/MM/YYYY",
    };
  }

  const [, day, month, year] = dateString.match(dateRegex);
  const date = new Date(year, month - 1, day);

  if (isNaN(date.getTime())) {
    return { isValid: false, date: null, error: "Ngày không hợp lệ" };
  }

  return { isValid: true, date, error: null };
}

/**
 * Validate birth date
 * @param {string} dateString - Date string in DD/MM/YYYY format
 * @returns {string|null} Error message or null if valid
 */
export function validateBirthDate(dateString) {
  if (!dateString) return null;

  const validation = validateDateDDMMYYYY(dateString);
  if (!validation.isValid) {
    return `Ngày sinh ${validation.error}`;
  }

  const { date } = validation;
  const today = new Date();
  const age = today.getFullYear() - date.getFullYear();

  if (date > today) {
    return "Ngày sinh không thể là tương lai";
  }
  if (age > 120) {
    return "Tuổi không hợp lệ";
  }

  return null;
}

/**
 * Validate citizen ID (Vietnamese CCCD - 12 digits)
 * @param {string} citizenId - Citizen ID to validate
 * @returns {string|null} Error message or null if valid
 */
export function validateCitizenId(citizenId) {
  if (!citizenId) return null;
  if (!/^[0-9]{12}$/.test(citizenId)) {
    return "Căn cước công dân phải có đúng 12 chữ số";
  }
  return null;
}

/**
 * Validate representative citizen ID (9-12 digits)
 * @param {string} citizenId - Citizen ID to validate
 * @returns {string|null} Error message or null if valid
 */
export function validateRepresentativeCitizenId(citizenId) {
  if (!citizenId) return null;
  if (!/^[0-9]{9,12}$/.test(citizenId)) {
    return "CCCD/CMND người đại diện phải có 9-12 chữ số";
  }
  return null;
}

/**
 * Validate full name
 * @param {string} name - Name to validate
 * @param {boolean} required - Whether field is required
 * @returns {string|null} Error message or null if valid
 */
export function validateFullName(name, required = false) {
  if (!name?.trim()) {
    return required ? "Họ và tên là bắt buộc" : null;
  }
  if (name.trim().length < 2) {
    return "Họ và tên phải có ít nhất 2 ký tự";
  }
  return null;
}

/**
 * Validate representative name
 * @param {string} name - Name to validate
 * @returns {string|null} Error message or null if valid
 */
export function validateRepresentativeName(name) {
  if (!name) return null;
  if (name.trim().length < 2) {
    return "Họ tên người đại diện phải có ít nhất 2 ký tự";
  }
  if (name.length > 100) {
    return "Họ tên người đại diện không được quá 100 ký tự";
  }
  if (!/^[a-zA-ZÀ-ỹ\s]+$/.test(name)) {
    return "Họ tên chỉ được chứa chữ cái và khoảng trắng";
  }
  return null;
}

/**
 * Validate password
 * @param {string} password - Password to validate
 * @param {number} minLength - Minimum length (default: 8)
 * @param {number} maxLength - Maximum length (default: 50)
 * @returns {string|null} Error message or null if valid
 */
export function validatePassword(password, minLength = 8, maxLength = 50) {
  if (!password) return null;
  if (password.length < minLength) {
    return `Mật khẩu phải có ít nhất ${minLength} ký tự`;
  }
  if (password.length > maxLength) {
    return `Mật khẩu không được quá ${maxLength} ký tự`;
  }
  return null;
}

/**
 * Validate text length
 * @param {string} text - Text to validate
 * @param {number} maxLength - Maximum length
 * @param {string} fieldName - Field name for error message
 * @returns {string|null} Error message or null if valid
 */
export function validateTextLength(text, maxLength, fieldName) {
  if (!text) return null;
  if (text.length > maxLength) {
    return `${fieldName} không được quá ${maxLength} ký tự`;
  }
  return null;
}
