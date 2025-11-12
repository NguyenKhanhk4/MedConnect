/**
 * Image utility functions
 */

/**
 * Resize and compress image
 * @param {File} file - Image file
 * @param {number} maxWidth - Maximum width
 * @param {number} maxHeight - Maximum height
 * @param {number} quality - Image quality (0-1, default: 0.8)
 * @returns {Promise<string>} Data URL of compressed image
 */
export function resizeImage(file, maxWidth, maxHeight, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedDataUrl);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Validate image file
 * @param {File} file - File to validate
 * @param {number} maxSizeMB - Maximum size in MB (default: 5)
 * @param {Array<string>} allowedTypes - Allowed MIME types
 * @returns {Object} { isValid: boolean, error: string|null }
 */
export function validateImageFile(
  file,
  maxSizeMB = 5,
  allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
) {
  if (!file) {
    return { isValid: false, error: "Không có file được chọn" };
  }

  // Check file size
  if (file.size > maxSizeMB * 1024 * 1024) {
    return {
      isValid: false,
      error: `Ảnh quá lớn, vui lòng chọn ảnh nhỏ hơn ${maxSizeMB}MB`,
    };
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: "Chỉ chấp nhận file ảnh (JPG, PNG, WebP)",
    };
  }

  return { isValid: true, error: null };
}
