/**
 * Utility functions for payment-related operations
 */

/**
 * Format payment amount
 * @param {number} amount - Payment amount
 * @returns {string} Formatted amount string
 */
export function formatPaymentAmount(amount) {
  if (typeof amount !== "number") return "0 ₫";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

/**
 * Get payment status badge config
 * @param {string} status - Payment status
 * @returns {Object} { icon: Component, text: string, color: string }
 */
export function getPaymentStatusConfig(status) {
  const statusConfig = {
    paid: {
      text: "Đã thanh toán",
      color: "#16a34a",
      className: "text-green-600",
    },
    refunded: {
      text: "Đã hoàn tiền",
      color: "#d97706",
      className: "text-amber-600",
    },
    pending: {
      text: "Đang xử lý",
      color: "#3b82f6",
      className: "text-blue-600",
    },
    failed: {
      text: "Thất bại",
      color: "#dc2626",
      className: "text-red-600",
    },
  };

  return (
    statusConfig[status] || {
      text: status,
      color: "#6b7280",
      className: "text-gray-600",
    }
  );
}

/**
 * Format payment method display name
 * @param {string} method - Payment method code
 * @returns {string} Formatted payment method name
 */
export function formatPaymentMethod(method) {
  const methodMap = {
    VNPAY: "VNPAY",
    MoMo: "MoMo",
    VietQR: "VietQR",
    ZaloPay: "ZaloPay",
    cash: "Tiền mặt",
    bank_transfer: "Chuyển khoản",
  };

  return methodMap[method] || method;
}
