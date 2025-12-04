/**
 * ================================================================
 * FILE: email.js
 * MỤC ĐÍCH: Cấu hình và quản lý việc gửi email qua SMTP
 * CÔNG NGHỆ: Nodemailer
 * ================================================================
 */

import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

/**
 * ĐỌC CẤU HÌNH SMTP TỪ BIẾN MÔI TRƯỜNG (.env)
 * 
 * Các biến cần thiết:
 * - SMTP_HOST: Địa chỉ SMTP server (vd: smtp.gmail.com)
 * - SMTP_PORT: Port kết nối (587 cho TLS, 465 cho SSL)
 * - SMTP_SECURE: "true" cho SSL, "false" cho TLS
 * - SMTP_USERNAME: Email đăng nhập SMTP
 * - SMTP_PASSWORD: App Password (không phải mật khẩu thường)
 * - SMTP_FROMNAME: Tên người gửi hiển thị (vd: MedConnect)
 * - SMTP_FROMEMAIL: Địa chỉ email người gửi
 */
const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USERNAME,
  SMTP_PASSWORD,
  SMTP_FROMNAME,
  SMTP_FROMEMAIL,
} = process.env;

/**
 * VALIDATION CẤU HÌNH CƠ BẢN
 * 
 * Kiểm tra các biến bắt buộc để gửi email.
 * Nếu thiếu, chỉ cảnh báo không dừng server.
 */
if (!SMTP_HOST || !SMTP_PORT) {
  console.warn("SMTP_HOST or SMTP_PORT is not set. Email sending may fail.");
}

/**
 * PARSE VÀ CHUẨN HÓA GIÁ TRỊ
 * 
 * - port: Chuyển string sang number, mặc định 587 (TLS)
 * - secure: Chuyển string sang boolean (true = SSL/465, false = TLS/587)
 */
const port = parseInt(SMTP_PORT || "587", 10);
const secure = String(SMTP_SECURE).toLowerCase() === "true";

/**
 * TẠO NODEMAILER TRANSPORTER (SINGLETON)
 * 
 * Transporter được tạo MỘT LẦN duy nhất khi module load.
 * Sau đó được tái sử dụng cho tất cả các email.
 * 
 * Cấu hình:
 * - host: SMTP server address
 * - port: 587 (TLS) hoặc 465 (SSL)
 * - secure: true cho SSL, false cho TLS
 * - auth: Thông tin xác thực (username/password)
 * - tls.rejectUnauthorized: false - Cho phép self-signed certificates
 */
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: port,
  secure: secure, // true for 465 (SSL), false for other ports (TLS)
  auth: SMTP_USERNAME && SMTP_PASSWORD ? { user: SMTP_USERNAME, pass: SMTP_PASSWORD } : undefined,
  tls: {
    // Cho phép self-signed certificates (cẩn thận trong production)
    rejectUnauthorized: false,
  },
});

/**
 * HÀM GỬI EMAIL CHÍNH
 * 
 * Hàm này là core function để gửi tất cả email trong hệ thống.
 * Hỗ trợ 2 cách gọi linh hoạt.
 * 
 * @param {string|object} toOrOptions - Email người nhận HOẶC object options
 * @param {string} subject - Tiêu đề email (nếu dùng cách 1)
 * @param {string} message - Nội dung HTML email (nếu dùng cách 1)
 * 
 * @returns {Promise<object>} - Thông tin email đã gửi (messageId, response, etc.)
 * 
 * @throws {Error} - Lỗi nếu thiếu 'to' hoặc gửi email thất bại
 * 
 * @example
 * // Cách 1: Tham số riêng lẻ
 * await sendMail("user@example.com", "Tiêu đề", "<p>Nội dung HTML</p>");
 * 
 * @example
 * // Cách 2: Object options (linh hoạt hơn)
 * await sendMail({
 *   to: "user@example.com",
 *   subject: "Tiêu đề",
 *   text: "Nội dung text",
 *   html: "<p>Nội dung HTML</p>",
 *   from: "custom@example.com"  // Optional - override from
 * });
 */
export async function sendMail(toOrOptions, subject, message) {
  try {
    /**
     * BƯỚC 1: NORMALIZE ARGUMENTS
     * 
     * Chuyển đổi tham số về định dạng object thống nhất.
     * Hỗ trợ 2 cách gọi khác nhau để linh hoạt.
     */
    let mailOptions = {};

    if (toOrOptions && typeof toOrOptions === "object" && !Array.isArray(toOrOptions)) {
      // Cách 2: Nhận object options trực tiếp
      mailOptions = { ...toOrOptions };
    } else {
      // Cách 1: Nhận 3 tham số riêng lẻ
      mailOptions = {
        to: toOrOptions,
        subject: subject,
        html: message,
      };
    }

    /**
     * BƯỚC 2: THIẾT LẬP THÔNG TIN NGƯỜI GỬI
     * 
     * Tự động thêm field 'from' nếu không có.
     * Format: "Tên <email@example.com>"
     */
    const fromName = SMTP_FROMNAME || "No-Reply";
    const fromEmail = SMTP_FROMEMAIL || SMTP_USERNAME || "no-reply@example.com";

    // Chỉ set 'from' nếu chưa có (cho phép override)
    mailOptions.from = mailOptions.from || `${fromName} <${fromEmail}>`;

    /**
     * BƯỚC 3: VALIDATION NGƯỜI NHẬN
     * 
     * 'to' là field bắt buộc. Nếu thiếu → throw error.
     */
    if (!mailOptions.to) {
      const missing = new Error("Missing 'to' recipient for sendMail");
      missing.status = 400;
      throw missing;
    }

    /**
     * BƯỚC 4: GỬI EMAIL QUA NODEMAILER
     * 
     * Sử dụng transporter đã được khởi tạo ở trên.
     * Transporter tự động quản lý connection pooling.
     */
    const info = await transporter.sendMail(mailOptions);

    /**
     * BƯỚC 5: LOG THÀNH CÔNG
     * 
     * Log messageId để tracking và debugging.
     */
    console.log("Email sent: %s", info.messageId);
    return info;
  } catch (error) {
    /**
     * ERROR HANDLING
     * 
     * - Log chi tiết lỗi gốc
     * - Tạo error mới với message tiếng Việt
     * - Giữ nguyên error gốc trong err.cause
     * - Set status code 500
     * - Throw để caller xử lý
     */
    console.error("Failed to send email:", error?.message || error);
    const err = new Error("Không gửi được email. Vui lòng kiểm tra cấu hình hoặc App Password.");
    err.cause = error;
    err.status = 500;
    throw err;
  }
}