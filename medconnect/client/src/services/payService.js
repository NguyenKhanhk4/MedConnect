const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

/**
 * Tạo link thanh toán PayOS cho appointment
 * @param {object} paymentData - { appointmentId, amount, description }
 * @returns {Promise<{success: boolean, data: {payUrl: string}, message: string}>}
 */
export async function createPayOSPayment(paymentData) {
  const resp = await fetch(`${API_BASE}/api/payments/payos/create-payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // cookie auth
    body: JSON.stringify(paymentData),
  });
  
  const data = await resp.json();
  
  if (!resp.ok) {
    throw new Error(data.message || "Create payment failed");
  }
  
  return data;
}

/**
 * Kiểm tra trạng thái thanh toán
 * @param {number} orderCode - Mã đơn hàng
 * @returns {Promise<object>}
 */
export async function checkPayOSStatus(orderCode) {
  const resp = await fetch(`${API_BASE}/api/payments/payos/check-status/${orderCode}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  
  const data = await resp.json();
  
  if (!resp.ok) {
    throw new Error(data.message || "Check status failed");
  }
  
  return data;
}

/**
 * Hủy link thanh toán
 * @param {number} orderCode - Mã đơn hàng
 * @returns {Promise<object>}
 */
export async function cancelPayOSPayment(orderCode) {
  const resp = await fetch(`${API_BASE}/api/payments/payos/cancel/${orderCode}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  
  const data = await resp.json();
  
  if (!resp.ok) {
    throw new Error(data.message || "Cancel payment failed");
  }
  
  return data;
}
