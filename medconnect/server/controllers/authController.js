import admin from "firebase-admin";
/* ======= ADD: Forgot/Verify OTP/Reset Password ======= */
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendMail } from "../utils/email.js";

import { verifyPassword, hashPassword, toE164 } from "../helpers/auth.js";
import User from "../models/user.model.js";
import Patient from "../models/patient.model.js";
import Doctor from "../models/doctor.model.js";
import AuthProvider from "../models/auth_providers.model.js";
import PasswordReset from "../models/passwordReset.model.js";
import EducationLevelPrice from "../models/educationLevelPrice.model.js";
import Notification from "../models/notification.model.js";
import { ok, fail } from "../utils/response.js";
import {
  COOKIE_NAME,
  SESSION_EXPIRES_IN,
  ERROR_CODES,
} from "../constants/index.js";

const isProd = process.env.NODE_ENV === "production";
/**
 * Password login controller
 */
export async function loginPassword(req, res) {
  try {
    const { identifier, password } = req.body || {};
    if (!identifier || !password) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "Vui lòng nhập email/số điện thoại và mật khẩu"
      );
    }

    console.log("[login] identifier:", identifier);

    // 🔧 LẤY KÈM passwordHash (vì trong schema đang select:false)
    let user;
    if (String(identifier || "").includes("@")) {
      user = await User.findOne({
        email: String(identifier).toLowerCase().trim(),
      }).select("+passwordHash");
    } else {
      const phone = toE164(identifier);
      if (phone) {
        user = await User.findOne({
          phone,
        }).select("+passwordHash");
      }
    }

    if (!user) {
      console.log("[login] user not found");
      return fail(
        res,
        404,
        ERROR_CODES.USER_NOT_FOUND,
        "Không tìm thấy người dùng"
      );
    }

    // Check user status
    if (user.status === "blocked") {
      return fail(
        res,
        403,
        ERROR_CODES.FORBIDDEN,
        "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ admin."
      );
    }

    if (user.status === "pending") {
      if (user.role === "doctor") {
        // Check if doctor has been verified - auto sync User status
        const Doctor = (await import("../models/doctor.model.js")).default;
        const doctor = await Doctor.findOne({ userId: user._id });
        if (doctor && doctor.isVerified) {
          // Auto sync: doctor is verified but User status is still pending
          user.status = "active";
          await user.save();
          console.log(
            `✅ Auto-synced User ${user._id} status to 'active' (doctor is verified)`
          );
        } else {
          return fail(
            res,
            403,
            ERROR_CODES.FORBIDDEN,
            "Tài khoản này đang chờ xác nhận"
          );
        }
      } else {
        return fail(
          res,
          403,
          ERROR_CODES.FORBIDDEN,
          "Tài khoản của bạn đang chờ kích hoạt. Vui lòng đợi thông báo từ email."
        );
      }
    }

    // Check banned status - cannot login
    if (user.status === "banned") {
      return fail(
        res,
        403,
        ERROR_CODES.FORBIDDEN,
        "Tài khoản của bạn đã bị cấm. Vui lòng liên hệ quản trị viên."
      );
    }

    // Check suspended status - can login but only to edit profile
    if (user.status === "suspended") {
      // Allow login for suspended users - they can only edit their profile
      // We'll handle this in the frontend/middleware to restrict functionality
    } else if (user.status !== "active") {
      return fail(
        res,
        403,
        ERROR_CODES.FORBIDDEN,
        "Tài khoản của bạn chưa được kích hoạt."
      );
    }

    // 🔧 ĐÚNG THỨ TỰ so sánh: (plain, hash)
    const okPwd = await verifyPassword(user.passwordHash, password);
    if (!okPwd) {
      return fail(
        res,
        401,
        ERROR_CODES.INVALID_CREDENTIALS,
        "Email/số điện thoại hoặc mật khẩu không đúng"
      );
    }

    const uid = `app_${user._id}`;
    const customToken = await admin.auth().createCustomToken(uid, {
      app_user_id: String(user._id),
      role: user.role,
      email: user.email, // Thêm email vào custom claims
    });

    return ok(res, {
      customToken,
      role: user.role || null,
      user: { fullName: user.fullName, email: user.email },
    });
  } catch (e) {
    console.error("❌ /api/auth/login-password error:", e);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, e.message || String(e));
  }
}
/**
 * Google login controller
 */
export async function googleLogin(req, res) {
  try {
    const { idToken } = req.body || {};
    if (!idToken) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "Thiếu mã xác thực Google"
      );
    }

    const decoded = await admin.auth().verifyIdToken(idToken, true);
    const email = decoded.email?.toLowerCase();
    if (!email) {
      return fail(
        res,
        403,
        ERROR_CODES.FORBIDDEN,
        "Không tìm thấy email trong mã xác thực"
      );
    }

    const dbUser = await User.findOne({
      email: email,
      status: "active",
    }).lean();
    if (!dbUser) {
      return fail(
        res,
        403,
        ERROR_CODES.FORBIDDEN,
        "Không tìm thấy người dùng trong hệ thống"
      );
    }

    const sessionCookie = await admin.auth().createSessionCookie(idToken, {
      expiresIn: SESSION_EXPIRES_IN,
    });

    res.cookie(COOKIE_NAME, sessionCookie, {
      maxAge: SESSION_EXPIRES_IN,
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
    });

    return ok(res, { role: dbUser.role ?? null });
  } catch (e) {
    console.error("❌ /api/auth/google-login error:", e);
    return fail(res, 401, ERROR_CODES.UNAUTHORIZED, e.message || String(e));
  }
}
/**
 * Create session controller
 */
export async function createSession(req, res) {
  try {
    const { idToken } = req.body || {};
    if (!idToken) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "Thiếu mã xác thực Google"
      );
    }

    const sessionCookie = await admin.auth().createSessionCookie(idToken, {
      expiresIn: SESSION_EXPIRES_IN,
    });

    res.cookie(COOKIE_NAME, sessionCookie, {
      maxAge: SESSION_EXPIRES_IN,
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
    });

    return ok(res);
  } catch (e) {
    console.error("❌ /api/auth/session error:", e);
    return fail(res, 401, ERROR_CODES.UNAUTHORIZED, e.message || String(e));
  }
}
/**
 * Get current user controller
 */
export function getCurrentUser(req, res) {
  const claims = req.user || {};
  return ok(res, {
    user: {
      uid: claims.uid || null,
      email: claims.email || null,
      phone: claims.phone_number || null,
      role: claims.role ?? null,
      appUserId: claims.app_user_id ?? null,
    },
  });
}

/**
 * Doctor register controller
 */
export async function registerDoctor(req, res) {
  try {
    const { fullName, email, phone, password, specialty, clinicDefaultId } =
      req.body || {};

    if (!fullName || !email || !phone || !password || !specialty) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "Vui lòng điền đầy đủ thông tin bắt buộc"
      );
    }

    // Get uploaded file info
    const licenseFile = req.file;
    if (!licenseFile) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "Vui lòng tải lên ảnh chứng chỉ hành nghề"
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
    if (!emailRegex.test(email)) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "Email không đúng định dạng"
      );
    }

    // Validate phone format (Vietnamese)
    const phoneRegex = /^\+84\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "Số điện thoại không đúng định dạng (VD: 0xxxxxxxxx hoặc +84xxxxxxxxx)"
      );
    }

    // Validate password length
    if (password.length < 8) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "Mật khẩu phải có ít nhất 8 ký tự"
      );
    }

    // Check if user already exists
    const existingUserByEmail = await User.findOne({
      email: email.toLowerCase(),
    }).lean();
    if (existingUserByEmail) {
      // If user is banned, don't allow re-registration with same email
      if (existingUserByEmail.status === "banned") {
        return fail(
          res,
          403,
          ERROR_CODES.FORBIDDEN,
          "Email này đã bị cấm. Vui lòng liên hệ quản trị viên."
        );
      }
      return fail(
        res,
        409,
        ERROR_CODES.CONFLICT,
        "Email này đã được sử dụng. Vui lòng sử dụng email khác"
      );
    }

    // Normalize phone and check
    const normalizedPhone = toE164(phone);
    if (!normalizedPhone) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "Số điện thoại không đúng định dạng"
      );
    }
    const existingUserByPhone = await User.findOne({
      phone: normalizedPhone,
    }).lean();
    if (existingUserByPhone) {
      // If user is banned, don't allow re-registration with same phone
      if (existingUserByPhone.status === "banned") {
        return fail(
          res,
          403,
          ERROR_CODES.FORBIDDEN,
          "Số điện thoại này đã bị cấm. Vui lòng liên hệ quản trị viên."
        );
      }
      return fail(
        res,
        409,
        ERROR_CODES.CONFLICT,
        "Số điện thoại này đã được sử dụng. Vui lòng sử dụng số điện thoại khác"
      );
    }

    // Note: License number check removed since we're storing file path, not unique number

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user in MongoDB
    const userDoc = await User.create({
      email: email.toLowerCase().trim(),
      passwordHash: hashedPassword,
      role: "doctor",
      status: "pending", // Bác sĩ cần được admin phê duyệt
      fullName: fullName.trim(),
      phone: normalizedPhone,
    });

    if (!userDoc) {
      return fail(
        res,
        500,
        ERROR_CODES.SERVER_ERROR,
        "Không thể tạo tài khoản. Vui lòng thử lại sau"
      );
    }

    // Find specialization by ID or name
    let specializationIds = [];
    if (specialty) {
      const Specialization = (await import("../models/specialization.model.js"))
        .default;
      try {
        // Try to find by ID first (if it's a valid ObjectId)
        const mongoose = (await import("mongoose")).default;
        if (mongoose.Types.ObjectId.isValid(specialty)) {
          const spec = await Specialization.findById(specialty);
          if (spec) {
            specializationIds = [spec._id];
          }
        } else {
          // If not valid ObjectId, try to find by name
          const spec = await Specialization.findOne({ name: specialty.trim() });
          if (spec) {
            specializationIds = [spec._id];
          }
        }
      } catch (specError) {
        console.warn("Error finding specialization:", specError);
        // Continue without specialization - doctor can add it later
      }
    }

    // Validate clinic if provided
    let clinicId = null;
    if (clinicDefaultId) {
      const Clinic = (await import("../models/clinic.model.js")).default;
      const mongoose = (await import("mongoose")).default;
      if (mongoose.Types.ObjectId.isValid(clinicDefaultId)) {
        const clinic = await Clinic.findById(clinicDefaultId);
        if (clinic) {
          clinicId = clinic._id;
        } else {
          console.warn(
            `Clinic ${clinicDefaultId} not found, continuing without clinic`
          );
        }
      }
    }

    // Create doctor document
    let doctorDoc = null;
    try {
      const doctorData = {
        userId: userDoc._id,
        fullName: fullName.trim(),
        licenseNo: licenseFile.filename, // Store uploaded file name
        specializationIds: specializationIds, // Store specialization IDs
        isVerified: false, // Cần admin phê duyệt
        isActive: false, // Chưa được kích hoạt
        bio: "",
      };

      if (clinicId) {
        doctorData.clinicDefaultId = clinicId;
      }

      doctorDoc = await Doctor.create(doctorData);
      console.log(`✅ Doctor record created successfully:`, {
        doctorId: doctorDoc._id,
        userId: doctorDoc.userId,
        fullName: doctorDoc.fullName,
        isVerified: doctorDoc.isVerified,
      });
    } catch (doctorError) {
      console.error("❌ Error creating Doctor record:", doctorError);

      // If Doctor creation fails, we should clean up the User
      await User.findByIdAndDelete(userDoc._id);
      console.log(
        `🧹 Cleaned up User ${userDoc._id} due to Doctor creation failure`
      );

      return fail(
        res,
        500,
        ERROR_CODES.SERVER_ERROR,
        "Không thể tạo hồ sơ bác sĩ. Lỗi: " +
          (doctorError.message || String(doctorError))
      );
    }

    // Verify Doctor was created
    if (!doctorDoc) {
      console.error("❌ Doctor document is null after creation!");
      await User.findByIdAndDelete(userDoc._id);
      return fail(
        res,
        500,
        ERROR_CODES.SERVER_ERROR,
        "Không thể tạo hồ sơ bác sĩ"
      );
    }

    // Verify Doctor exists in database
    const verifyDoctor = await Doctor.findById(doctorDoc._id);
    if (!verifyDoctor) {
      console.error(
        `❌ Doctor ${doctorDoc._id} not found in database after creation!`
      );
      await User.findByIdAndDelete(userDoc._id);
      return fail(
        res,
        500,
        ERROR_CODES.SERVER_ERROR,
        "Hồ sơ bác sĩ không được lưu vào cơ sở dữ liệu"
      );
    }

    console.log(`✅ Verified Doctor exists in database:`, {
      doctorId: verifyDoctor._id,
      userId: verifyDoctor.userId,
      fullName: verifyDoctor.fullName,
    });

    // Create AuthProvider record for local login
    try {
      await AuthProvider.create({
        userId: userDoc._id,
        provider: "local",
        providerUid: String(userDoc._id),
        email: userDoc.email,
        phone: userDoc.phone,
        verified: false, // Chưa được xác thực
      });
    } catch (e) {
      console.warn("Failed to create AuthProvider record:", e.message || e);
      // Don't fail the registration if AuthProvider creation fails
    }

    console.log("[registerDoctor] success for user:", userDoc._id);

    // Create welcome notification for doctor
    try {
      await Notification.create({
        userId: userDoc._id,
        type: "system",
        title: "Đăng ký thành công!",
        message: `Xin chào ${userDoc.fullName}! Tài khoản của bạn đang được admin phê duyệt. Vui lòng đợi thông báo từ email bạn đã đăng ký.`,
        priority: "medium",
        relatedId: userDoc._id,
        relatedType: "registration",
        metadata: {
          registrationDate: new Date().toISOString(),
          role: userDoc.role,
          status: userDoc.status,
        },
      });
      console.log("✅ Doctor welcome notification created successfully");
    } catch (notificationError) {
      console.error(
        "⚠️ Failed to create doctor welcome notification:",
        notificationError.message
      );
      // Don't block registration if notification fails
    }

    return ok(res, {
      message:
        "Đăng ký thành công! Tài khoản của bạn đang được admin phê duyệt. Vui lòng đợi thông báo từ email bạn đã đăng ký.",
      user: {
        id: userDoc._id,
        fullName: userDoc.fullName,
        email: userDoc.email,
        phone: userDoc.phone,
        role: userDoc.role,
        status: userDoc.status,
      },
    });
  } catch (e) {
    console.error("❌ /api/auth/register-doctor error:", e);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, e.message || String(e));
  }
}

/**
 * Register controller
 */
export async function register(req, res) {
  try {
    const {
      fullName,
      email,
      phone,
      password,
      role = "PATIENT",
    } = req.body || {};

    if (!fullName || !email || !phone || !password) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "Vui lòng điền đầy đủ thông tin bắt buộc"
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
    if (!emailRegex.test(email)) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "Email không đúng định dạng"
      );
    }

    // Validate phone format (Vietnamese)
    const phoneRegex = /^\+84\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "Số điện thoại không đúng định dạng"
      );
    }

    // Validate password length
    if (password.length < 8) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "Password must be at least 8 characters"
      );
    }

    // Check if user already exists
    // Check existing email
    const existingUserByEmail = await User.findOne({
      email: email.toLowerCase(),
    }).lean();
    if (existingUserByEmail) {
      // If user is banned, don't allow re-registration with same email
      if (existingUserByEmail.status === "banned") {
        return fail(
          res,
          403,
          ERROR_CODES.FORBIDDEN,
          "Email này đã bị cấm. Vui lòng liên hệ quản trị viên."
        );
      }
      return fail(
        res,
        409,
        ERROR_CODES.CONFLICT,
        "Email này đã được sử dụng. Vui lòng sử dụng email khác"
      );
    }

    // Normalize phone and check
    const normalizedPhone = toE164(phone);
    if (!normalizedPhone) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "Số điện thoại không đúng định dạng"
      );
    }
    const existingUserByPhone = await User.findOne({
      phone: normalizedPhone,
    }).lean();
    if (existingUserByPhone) {
      // If user is banned, don't allow re-registration with same phone
      if (existingUserByPhone.status === "banned") {
        return fail(
          res,
          403,
          ERROR_CODES.FORBIDDEN,
          "Số điện thoại này đã bị cấm. Vui lòng liên hệ quản trị viên."
        );
      }
      return fail(
        res,
        409,
        ERROR_CODES.CONFLICT,
        "Số điện thoại này đã được sử dụng. Vui lòng sử dụng số điện thoại khác"
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user in MongoDB
    const userDoc = await User.create({
      email: email.toLowerCase().trim(),
      passwordHash: hashedPassword,
      role: (role || "patient").toLowerCase(),
      status: "active",
      fullName: fullName.trim(),
      phone: normalizedPhone,
      emailVerified: true, // Set to true for local registration
      phoneVerified: true, // Set to true for local registration
    });

    if (!userDoc) {
      return fail(
        res,
        500,
        ERROR_CODES.SERVER_ERROR,
        "Không thể tạo tài khoản. Vui lòng thử lại sau"
      );
    }

    // Create patient document when role is patient
    if ((role || "patient").toLowerCase() === "patient") {
      const patientDoc = await Patient.create({
        userId: userDoc._id,
        fullName: fullName.trim(),
        phone: normalizedPhone,
      });
      console.log("✅ Patient record created successfully:", {
        patientId: patientDoc._id,
        userId: patientDoc.userId,
        fullName: patientDoc.fullName,
      });
    }

    // Create Firebase custom token
    const uid = `app_${userDoc._id}`;
    const customToken = await admin.auth().createCustomToken(uid, {
      app_user_id: String(userDoc._id),
      role: userDoc.role,
      email: userDoc.email, // Thêm email vào custom claims
    });

    console.log("[register] success for user:", userDoc._id);

    // Create AuthProvider record for local login
    try {
      await AuthProvider.create({
        userId: userDoc._id,
        provider: "local",
        providerUid: String(userDoc._id),
        email: userDoc.email,
        phone: userDoc.phone,
        verified: true,
      });
    } catch (e) {
      console.warn("Failed to create AuthProvider record:", e.message || e);
    }

    // For patients: send welcome email and create welcome notification
    // Frontend will handle auto-login using the customToken
    if ((role || "patient").toLowerCase() === "patient") {
      try {
        await sendPatientWelcomeEmail(userDoc);
        console.log("✅ Patient welcome email sent successfully");
      } catch (emailError) {
        console.error(
          "⚠️ Failed to send patient welcome email:",
          emailError.message
        );
        // Don't block registration if email fails
      }

      // Create welcome notification for patient
      try {
        await Notification.create({
          userId: userDoc._id,
          type: "system",
          title: "Chào mừng đến với MedConnect!",
          message: `Xin chào ${userDoc.fullName}! Cảm ơn bạn đã đăng ký tài khoản tại MedConnect. Bạn có thể bắt đầu đặt lịch hẹn với bác sĩ ngay bây giờ.`,
          priority: "low",
          relatedId: userDoc._id,
          relatedType: "registration",
          metadata: {
            registrationDate: new Date().toISOString(),
            role: userDoc.role,
          },
        });
        console.log("✅ Welcome notification created successfully");
      } catch (notificationError) {
        console.error(
          "⚠️ Failed to create welcome notification:",
          notificationError.message
        );
        // Don't block registration if notification fails
      }
    }

    return ok(res, {
      customToken,
      role: userDoc.role,
      user: {
        id: userDoc._id,
        fullName: userDoc.fullName,
        email: userDoc.email,
        phone: userDoc.phone,
        role: userDoc.role,
      },
    });
  } catch (e) {
    console.error("❌ /api/auth/register error:", e);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, e.message || String(e));
  }
}
/**
 * Google register controller (đã sửa)
 * - find-or-create theo email (tránh E11000 email trùng)
 * - không set phone khi không có (tránh phone: null)
 * - chỉ tạo Patient nếu chưa có
 * - upsert AuthProvider, phát hiện xung đột providerUid
 */
export async function googleRegister(req, res) {
  try {
    const { idToken, fullName, role = "PATIENT" } = req.body || {};
    if (!idToken)
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "Thiếu mã xác thực Google"
      );

    // verify idToken
    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(idToken, true);
      console.log("[GG-REG] decoded:", {
        uid: decoded?.uid,
        email: decoded?.email,
        name: decoded?.name,
        phone: decoded?.phone_number,
      });
    } catch (err) {
      console.error("[GG-REG] verifyIdToken FAILED:", err?.message);
      return fail(
        res,
        401,
        ERROR_CODES.UNAUTHORIZED,
        "Invalid or expired idToken"
      );
    }

    const email = decoded.email?.toLowerCase();
    if (!email)
      return fail(
        res,
        403,
        ERROR_CODES.FORBIDDEN,
        "Không tìm thấy email trong mã xác thực"
      );

    const normalizedRole = (role || "patient").toLowerCase();

    // 1) find-or-create User theo email
    let userDoc = await User.findOne({ email });
    let isNewUser = false;
    if (!userDoc) {
      try {
        userDoc = await User.create({
          email,
          passwordHash: null, // Google không cần mật khẩu
          role: normalizedRole, // "patient" | "doctor" | "admin"
          status: "active",
          fullName: fullName || decoded.name || "Google User",
          // chỉ set phone nếu có, KHÔNG set null
          ...(decoded.phone_number ? { phone: decoded.phone_number } : {}),
          authProvider: "google",
        });
        isNewUser = true;
        console.log("[GG-REG] User.create OK:", String(userDoc._id));
      } catch (e) {
        console.error("[GG-REG] User.create FAILED:", {
          name: e?.name,
          code: e?.code,
          keyValue: e?.keyValue,
          message: e?.message,
        });
        return fail(
          res,
          500,
          ERROR_CODES.SERVER_ERROR,
          e?.message || String(e)
        );
      }
    } else {
      // đã có user cùng email → có thể cập nhật nhẹ nhàng nếu muốn
      // (KHÔNG ghi đè phone/null)
      console.log("[GG-REG] user existed:", String(userDoc._id));
    }

    // 2) tạo Patient nếu role là patient và chưa có
    if (normalizedRole === "patient") {
      const existsPatient = await Patient.findOne({
        userId: userDoc._id,
      }).lean();
      if (!existsPatient) {
        await Patient.create({
          userId: userDoc._id,
          fullName: userDoc.fullName,
          phone: userDoc.phone || null,
        });
        console.log("[GG-REG] Patient.create OK");
      }
    }

    // 3) upsert AuthProvider cho Google
    const ap = await AuthProvider.findOne({
      provider: "google",
      providerUid: decoded.uid,
    }).lean();

    if (ap && String(ap.userId) !== String(userDoc._id)) {
      // providerUid này đã liên kết user khác → báo xung đột
      return fail(
        res,
        409,
        ERROR_CODES.CONFLICT,
        "Google account is linked to another user"
      );
    }

    await AuthProvider.updateOne(
      { provider: "google", providerUid: decoded.uid },
      {
        $setOnInsert: {
          provider: "google",
          providerUid: decoded.uid,
          userId: userDoc._id,
          email: userDoc.email,
          phone: userDoc.phone || null,
          verified: true,
          linkedAt: new Date(),
        },
      },
      { upsert: true }
    );

    console.log("[GG-REG] SUCCESS userId:", String(userDoc._id));

    // Create welcome notification for new users (only if user was just created)
    if (isNewUser && normalizedRole === "patient") {
      try {
        // Check if notification already exists to avoid duplicates
        const existingNotification = await Notification.findOne({
          userId: userDoc._id,
          relatedType: "registration",
        });

        if (!existingNotification) {
          await Notification.create({
            userId: userDoc._id,
            type: "system",
            title: "Chào mừng đến với MedConnect!",
            message: `Xin chào ${userDoc.fullName}! Cảm ơn bạn đã đăng ký tài khoản tại MedConnect qua Google. Bạn có thể bắt đầu đặt lịch hẹn với bác sĩ ngay bây giờ.`,
            priority: "low",
            relatedId: userDoc._id,
            relatedType: "registration",
            metadata: {
              registrationDate: new Date().toISOString(),
              role: userDoc.role,
              provider: "google",
            },
          });
          console.log(
            "✅ Google registration welcome notification created for patient"
          );
        }
      } catch (notificationError) {
        console.error(
          "⚠️ Failed to create Google registration welcome notification:",
          notificationError.message
        );
        // Don't block registration if notification fails
      }
    }

    // For patients: automatically create session cookie to auto-login
    if (normalizedRole === "patient") {
      try {
        // Create session cookie using the idToken from Google
        const sessionCookie = await admin.auth().createSessionCookie(idToken, {
          expiresIn: SESSION_EXPIRES_IN,
        });

        res.cookie(COOKIE_NAME, sessionCookie, {
          maxAge: SESSION_EXPIRES_IN,
          httpOnly: true,
          secure: isProd,
          sameSite: "lax",
          path: "/",
        });

        console.log(
          "✅ Auto-login session created for patient after Google registration"
        );
      } catch (sessionError) {
        console.warn(
          "Failed to create session cookie for Google registration:",
          sessionError.message
        );
        // Continue anyway - frontend might handle it
      }
    }

    return ok(res, {
      role: userDoc.role,
      user: {
        id: userDoc._id,
        fullName: userDoc.fullName,
        email: userDoc.email,
        phone: userDoc.phone,
        role: userDoc.role,
      },
    });
  } catch (e) {
    console.error("❌ /api/auth/google-register error:", {
      name: e?.name,
      code: e?.code,
      keyValue: e?.keyValue,
      message: e?.message,
    });
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, e?.message || String(e));
  }
}
/**
 * Logout controller
 */
export function logout(req, res) {
  try {
    res.clearCookie(COOKIE_NAME, { path: "/" });
    return ok(res);
  } catch (e) {
    console.error("❌ /api/auth/logout error:", e);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, e.message || String(e));
  }
}

// -------------------------------------------------- OTP & RESET PASSWORD

/* Helper gửi mail OTP đơn giản, dùng cấu hình SMTP từ .env */
async function sendOtpMail(to, otp) {
  await sendMail({
    to,
    subject: "Mã OTP đặt lại mật khẩu (hiệu lực 10 phút)",
    text: `Mã OTP của bạn là: ${otp}. Mã sẽ hết hạn sau 10 phút.`,
    html: `<p>Mã OTP của bạn là: <b>${otp}</b></p><p>Mã sẽ hết hạn sau <b>10 phút</b>.</p>`,
  });
}

/* Helper tạo OTP 6 số ngẫu nhiên từ 100000 đến 999999 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/* Helper function: Send welcome email to patient */
async function sendPatientWelcomeEmail(user) {
  try {
    if (!user || !user.email) {
      console.warn("⚠️ Patient email not found, skipping welcome email");
      return;
    }

    const patientName = user.fullName || "Bệnh nhân";
    const registrationDate = new Date().toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #059669; border-bottom: 2px solid #059669; padding-bottom: 10px;">
          Chào mừng bạn đến với MedConnect
        </h2>
        <p>Xin chào <strong>${patientName}</strong>,</p>
        <p>Chúng tôi rất vui mừng chào đón bạn tham gia vào cộng đồng MedConnect - nền tảng chăm sóc sức khỏe trực tuyến hàng đầu.</p>
        
        <div style="background-color: #ecfdf5; border-left: 4px solid #059669; padding: 15px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #047857;">Thông tin tài khoản của bạn:</h3>
          <p style="margin: 8px 0;"><strong>Họ và tên:</strong> ${patientName}</p>
          <p style="margin: 8px 0;"><strong>Email:</strong> ${user.email}</p>
          <p style="margin: 8px 0;"><strong>Ngày đăng ký:</strong> ${registrationDate}</p>
        </div>

        <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 15px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #0284c7;">Những gì bạn có thể làm với MedConnect:</h3>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>Đặt lịch hẹn với bác sĩ phù hợp với nhu cầu của bạn</li>
            <li>Theo dõi lịch sử khám bệnh và kết quả điều trị</li>
            <li>Nhận tư vấn sức khỏe từ các chuyên gia hàng đầu</li>
            <li>Tương tác với bác sĩ qua video call hoặc tin nhắn</li>
            <li>Truy cập hồ sơ bệnh án điện tử của bạn mọi lúc, mọi nơi</li>
          </ul>
        </div>

        <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #d97706;">Lưu ý quan trọng:</h3>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>Vui lòng bảo mật thông tin đăng nhập của bạn</li>
            <li>Kiểm tra và cập nhật thông tin cá nhân để sử dụng dịch vụ tốt nhất</li>
            <li>Liên hệ với chúng tôi nếu bạn có bất kỳ câu hỏi nào</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${
            process.env.CLIENT_URL || "http://localhost:5173"
          }/auth/login" 
             style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Bắt đầu sử dụng
          </a>
        </div>
        
        <p style="margin-top: 30px;">Chúng tôi cam kết mang đến cho bạn trải nghiệm chăm sóc sức khỏe tốt nhất. Chúc bạn luôn khỏe mạnh!</p>
        
        <p style="margin-top: 30px;">Trân trọng,<br><strong>MedConnect - Đội ngũ chăm sóc khách hàng</strong></p>
      </div>
    `;

    const textContent = `
Chào mừng bạn đến với MedConnect

Xin chào ${patientName},

Chúng tôi rất vui mừng chào đón bạn tham gia vào cộng đồng MedConnect - nền tảng chăm sóc sức khỏe trực tuyến hàng đầu.

Thông tin tài khoản của bạn:
- Họ và tên: ${patientName}
- Email: ${user.email}
- Ngày đăng ký: ${registrationDate}

Những gì bạn có thể làm với MedConnect:
- Đặt lịch hẹn với bác sĩ phù hợp với nhu cầu của bạn
- Theo dõi lịch sử khám bệnh và kết quả điều trị
- Nhận tư vấn sức khỏe từ các chuyên gia hàng đầu
- Tương tác với bác sĩ qua video call hoặc tin nhắn
- Truy cập hồ sơ bệnh án điện tử của bạn mọi lúc, mọi nơi

Lưu ý quan trọng:
- Vui lòng bảo mật thông tin đăng nhập của bạn
- Kiểm tra và cập nhật thông tin cá nhân để sử dụng dịch vụ tốt nhất
- Liên hệ với chúng tôi nếu bạn có bất kỳ câu hỏi nào

Chúng tôi cam kết mang đến cho bạn trải nghiệm chăm sóc sức khỏe tốt nhất. Chúc bạn luôn khỏe mạnh!

Trân trọng,
MedConnect - Đội ngũ chăm sóc khách hàng
    `;

    console.log(`📧 Attempting to send patient welcome email via sendMail...`);
    const emailResult = await sendMail({
      to: user.email,
      subject: "Chào mừng bạn đến với MedConnect",
      text: textContent,
      html: htmlContent,
    });

    console.log(`✅ Patient welcome email sent successfully to ${user.email}`);
    console.log(`📧 Email result:`, {
      messageId: emailResult?.messageId,
      response: emailResult?.response,
    });
  } catch (error) {
    console.error(
      "❌ Error sending patient welcome email:",
      error?.message || error
    );
    // Không throw error để không ảnh hưởng đến flow chính
  }
}
/**
 * POST /api/auth/forgot
 * body: { email }
 * Kiểm tra email có trong database hay không và trả về thông báo phù hợp
 */
export async function forgotPassword(req, res) {
  try {
    const { email } = req.body || {};
    if (!email) return fail(res, 400, ERROR_CODES.BAD_REQUEST, "Thiếu email");

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
    if (!emailRegex.test(email)) {
      return fail(res, 400, ERROR_CODES.BAD_REQUEST, "Email không hợp lệ");
    }

    const user = await User.findOne({
      email: String(email).toLowerCase().trim(),
      status: "active",
    });

    // Nếu không tìm thấy user, trả về lỗi để yêu cầu kiểm tra lại email
    if (!user) {
      return fail(
        res,
        404,
        ERROR_CODES.USER_NOT_FOUND,
        "Email không tồn tại trong hệ thống. Vui lòng kiểm tra lại email."
      );
    }

    // Kiểm tra xem có OTP đang hoạt động không
    const existingReset = await PasswordReset.findOne({
      userId: user._id,
      type: "reset",
      used: false,
      expiresAt: { $gt: new Date() },
    });

    // Hạn chế brute-force: tối đa 5 lần thử khi OTP còn hiệu lực
    if (existingReset && existingReset.attempts >= 5) {
      return fail(
        res,
        429,
        ERROR_CODES.TOO_MANY_REQUESTS,
        "Bạn đã thử quá nhiều lần. Vui lòng đợi một lúc rồi thử lại."
      );
    }

    // Tạo OTP mới
    const otp = generateOTP();
    const codeHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 phút

    // Xóa các OTP cũ của user này
    await PasswordReset.deleteMany({
      userId: user._id,
      type: "reset",
    });

    // Tạo record mới trong Password_Resets
    await PasswordReset.create({
      userId: user._id,
      email: user.email,
      codeHash: codeHash,
      otp: otp, // Lưu OTP thực để so sánh
      type: "reset",
      expiresAt: expiresAt,
      used: false,
      attempts: 0,
    });

    await sendOtpMail(user.email, otp);

    return ok(res, {
      ok: true,
      message:
        "Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.",
      email: user.email, // Trả về email để frontend có thể sử dụng
    });
  } catch (e) {
    console.error("forgotPassword error:", e);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, e.message || String(e));
  }
}
/**
 * POST /api/auth/verify-otp
 * body: { email, otp }
 * return: { resetToken }
 */
export async function verifyPasswordOtp(req, res) {
  try {
    const { email, otp } = req.body || {};
    if (!email || !otp)
      return fail(res, 400, ERROR_CODES.BAD_REQUEST, "Thiếu dữ liệu");

    const user = await User.findOne({
      email: String(email).toLowerCase().trim(),
      status: "active",
    });

    if (!user)
      return fail(res, 400, ERROR_CODES.BAD_REQUEST, "OTP không hợp lệ");

    // Tìm OTP record trong Password_Resets
    const resetRecord = await PasswordReset.findOne({
      userId: user._id,
      email: user.email,
      type: "reset",
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!resetRecord) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "OTP không hợp lệ hoặc đã hết hạn"
      );
    }

    // Kiểm tra số lần thử
    if (resetRecord.attempts >= 5) {
      return fail(
        res,
        429,
        ERROR_CODES.TOO_MANY_REQUESTS,
        "Quá số lần thử. Vui lòng yêu cầu OTP mới."
      );
    }

    // So sánh OTP (so sánh trực tiếp với OTP đã lưu)
    if (String(otp) !== resetRecord.otp) {
      // Tăng số lần thử
      resetRecord.attempts += 1;
      await resetRecord.save();
      return fail(res, 400, ERROR_CODES.BAD_REQUEST, "OTP không hợp lệ");
    }

    // OTP hợp lệ → cấp resetToken ngắn hạn (JWT)
    const resetToken = jwt.sign(
      { sub: String(user._id), purpose: "reset" },
      process.env.JWT_RESET_SECRET,
      { expiresIn: process.env.JWT_RESET_EXPIRES || "15m" }
    );
    const tokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Cập nhật record với resetToken
    resetRecord.codeHash = tokenHash;
    resetRecord.expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 phút cho reset token
    resetRecord.used = false; // Chưa dùng để reset password
    await resetRecord.save();

    return ok(res, { resetToken });
  } catch (e) {
    console.error("verifyPasswordOtp error:", e);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, e.message || String(e));
  }
}
/**
 * POST /api/auth/reset
 * body: { token, email, newPassword, confirmPassword }
 * Yêu cầu nhập email tài khoản, mật khẩu mới và xác nhận mật khẩu
 */
export async function resetPassword(req, res) {
  try {
    const { token, email, newPassword, confirmPassword } = req.body || {};
    if (!token || !email || !newPassword || !confirmPassword) {
      return fail(res, 400, ERROR_CODES.BAD_REQUEST, "Thiếu dữ liệu bắt buộc");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
    if (!emailRegex.test(email)) {
      return fail(res, 400, ERROR_CODES.BAD_REQUEST, "Email không hợp lệ");
    }

    // Validate password length
    if (newPassword.length < 8) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "Mật khẩu phải có ít nhất 8 ký tự"
      );
    }

    // Validate password confirmation
    if (newPassword !== confirmPassword) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "Mật khẩu xác nhận không khớp"
      );
    }

    // verify JWT
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_RESET_SECRET);
      if (payload?.purpose !== "reset") throw new Error("bad purpose");
    } catch {
      console.warn(
        "[resetPassword] JWT verify failed for token (first 120 chars):",
        String(token).slice(0, 120)
      );
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "Mã xác thực không hợp lệ"
      );
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    console.debug("[resetPassword] tokenHash:", tokenHash);
    console.debug("[resetPassword] payload.sub:", payload?.sub);

    // Tìm reset record trong Password_Resets
    const resetRecord = await PasswordReset.findOne({
      userId: payload.sub,
      codeHash: tokenHash,
      type: "reset",
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!resetRecord) {
      console.warn(
        "[resetPassword] No matching PasswordReset found for userId and tokenHash. Listing recent PasswordReset records for this user:"
      );
      try {
        const recent = await PasswordReset.find({ userId: payload.sub })
          .sort({ createdAt: -1 })
          .limit(10)
          .lean();
        console.warn(JSON.stringify(recent, null, 2));
      } catch (listErr) {
        console.warn(
          "[resetPassword] Failed to list recent PasswordReset records:",
          listErr?.message || listErr
        );
      }
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "Mã xác thực không hợp lệ hoặc đã hết hạn"
      );
    }

    // Tìm user và kiểm tra email có khớp không
    const user = await User.findById(payload.sub).select("+passwordHash");
    if (!user) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "Người dùng không tồn tại"
      );
    }

    // Kiểm tra email có khớp với email trong reset record không
    if (user.email.toLowerCase() !== email.toLowerCase()) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "Email không khớp với tài khoản đã gửi OTP"
      );
    }

    // Đặt mật khẩu mới
    const hashed = await hashPassword(newPassword);
    user.passwordHash = hashed;
    await user.save();

    // Đánh dấu reset record đã được sử dụng
    resetRecord.used = true;
    await resetRecord.save();

    return ok(res, { ok: true, message: "Đổi mật khẩu thành công" });
  } catch (e) {
    console.error("resetPassword error:", e);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, e.message || String(e));
  }
}
/**
 * GET /api/auth/test-email
 * Test email configuration
 */
export async function testEmail(req, res) {
  try {
    const isValid = await testEmailConfig();
    if (isValid) {
      return ok(res, {
        ok: true,
        message: "Email configuration is valid",
      });
    } else {
      return fail(
        res,
        500,
        ERROR_CODES.SERVER_ERROR,
        "Email configuration is invalid"
      );
    }
  } catch (e) {
    console.error("testEmail error:", e);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, e.message || String(e));
  }
}

/**
 * POST /api/auth/change-password
 * body: { currentPassword, newPassword }
 *
 * Đổi mật khẩu khi đã đăng nhập vào tài khoản.
 * Không cần OTP - chỉ cần nhập đúng mật khẩu hiện tại.
 * Yêu cầu: người dùng phải đã đăng nhập (authGuard).
 */
export async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "Thiếu mật khẩu hiện tại hoặc mật khẩu mới"
      );
    }

    // Validate password length
    if (newPassword.length < 8) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "Mật khẩu mới phải có ít nhất 8 ký tự"
      );
    }

    // Lấy user từ req.user (đã được authGuard xác thực)
    const userId = req.user?.app_user_id;
    if (!userId) {
      return fail(
        res,
        401,
        ERROR_CODES.UNAUTHORIZED,
        "Không tìm thấy thông tin người dùng"
      );
    }

    // Tìm user và lấy passwordHash
    const user = await User.findById(userId).select("+passwordHash");
    if (!user) {
      return fail(
        res,
        404,
        ERROR_CODES.USER_NOT_FOUND,
        "Người dùng không tồn tại"
      );
    }

    // Kiểm tra mật khẩu hiện tại
    const isCurrentPasswordValid = await verifyPassword(
      user.passwordHash,
      currentPassword
    );
    if (!isCurrentPasswordValid) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "Mật khẩu hiện tại không đúng"
      );
    }

    // Kiểm tra mật khẩu mới có khác mật khẩu cũ không
    const isSamePassword = await verifyPassword(user.passwordHash, newPassword);
    if (isSamePassword) {
      return fail(
        res,
        400,
        ERROR_CODES.BAD_REQUEST,
        "Mật khẩu mới phải khác mật khẩu hiện tại"
      );
    }

    // Hash mật khẩu mới và lưu vào database
    const hashedNewPassword = await hashPassword(newPassword);
    user.passwordHash = hashedNewPassword;
    await user.save();

    return ok(res, {
      ok: true,
      message: "Đổi mật khẩu thành công",
    });
  } catch (e) {
    console.error("changePassword error:", e);
    return fail(res, 500, ERROR_CODES.SERVER_ERROR, e.message || String(e));
  }
}

//------------------------------------------------- OTP & RESET PASSWORD
