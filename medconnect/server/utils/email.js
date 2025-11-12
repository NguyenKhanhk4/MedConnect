import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USERNAME,
  SMTP_PASSWORD,
  SMTP_FROMNAME,
  SMTP_FROMEMAIL,
} = process.env;

// Basic validation
if (!SMTP_HOST || !SMTP_PORT) {
  console.warn("SMTP_HOST or SMTP_PORT is not set. Email sending may fail.");
}

const port = parseInt(SMTP_PORT || "587", 10);
const secure = String(SMTP_SECURE).toLowerCase() === "true";

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: port,
  secure: secure, // true for 465, false for other ports
  auth: SMTP_USERNAME && SMTP_PASSWORD ? { user: SMTP_USERNAME, pass: SMTP_PASSWORD } : undefined,
  tls: {
    // allow self-signed certs if explicitly configured; keep false by default
    rejectUnauthorized: false,
  },
});

export async function sendMail(toOrOptions, subject, message) {
  try {
    // Normalize arguments: allow either
    // 1) sendMail(to, subject, message) OR
    // 2) sendMail({ to, subject, text, html, from, ... })
    let mailOptions = {};

    if (toOrOptions && typeof toOrOptions === "object" && !Array.isArray(toOrOptions)) {
      mailOptions = { ...toOrOptions };
    } else {
      mailOptions = {
        to: toOrOptions,
        subject: subject,
        html: message,
      };
    }

    const fromName = SMTP_FROMNAME || "No-Reply";
    const fromEmail = SMTP_FROMEMAIL || SMTP_USERNAME || "no-reply@example.com";

    // Ensure `from` is present
    mailOptions.from = mailOptions.from || `${fromName} <${fromEmail}>`;

    // Basic validation: `to` must be defined
    if (!mailOptions.to) {
      const missing = new Error("Missing 'to' recipient for sendMail");
      missing.status = 400;
      throw missing;
    }

    const info = await transporter.sendMail(mailOptions);

    console.log("Email sent: %s", info.messageId);
    return info;
  } catch (error) {
    console.error("Failed to send email:", error?.message || error);
    const err = new Error("Không gửi được email. Vui lòng kiểm tra cấu hình hoặc App Password.");
    err.cause = error;
    err.status = 500;
    throw err;
  }
}