import User from "../models/user.model.js";
import Doctor from "../models/doctor.model.js";
import Specialization from "../models/specialization.model.js";
import Appointment from "../models/appointment.model.js";
import Patient from "../models/patient.model.js";
import Clinic from "../models/clinic.model.js";
import Payment from "../models/payment.model.js";
import DoctorTimeSlot from "../models/doctorTimeSlot.model.js";
import DoctorScheduleRule from "../models/doctor_schedule_rules.model.js";
import Review from "../models/review.model.js";
import EducationLevelPrice from "../models/educationLevelPrice.model.js";
import Prescription from "../models/prescription.model.js";
import ConsultationAdvice from "../models/consultationAdvice.model.js";
import ConsultationSummary from "../models/consultationSummary.model.js";
import VideoCall from "../models/videoCall.model.js";
import PatientFavorite from "../models/patientFavorite.model.js";
import RescheduleRequest from "../models/rescheduleRequest.model.js";
import Notification from "../models/notification.model.js";
import { runCleanupNow } from "../services/appointmentCleanupService.js";
import fs from "fs";
import path from "path";

// ================== HELPER FUNCTIONS ==================

/**
 * Kiểm tra xem bác sĩ có đủ thông tin để được kích hoạt không
 * Các trường bắt buộc: yearsExperience > 0, bio (không rỗng), và educationLevel
 * @param {string} doctorId - ID của bác sĩ cần kiểm tra
 * @returns {Promise<{canBeActive: boolean, reason?: string}>} - Kết quả kiểm tra
 */
async function checkDoctorCanBeActive(doctorId) {
  try {
    const doctor = await Doctor.findById(doctorId).lean();
    if (!doctor) {
      return { canBeActive: false, reason: "Doctor not found" };
    }

    // Check yearsExperience
    if (!doctor.yearsExperience || doctor.yearsExperience <= 0) {
      return {
        canBeActive: false,
        reason: "Số năm kinh nghiệm chưa được điền hoặc bằng 0",
      };
    }

    // Check bio
    if (!doctor.bio || doctor.bio.trim().length === 0) {
      return {
        canBeActive: false,
        reason: "Lời giới thiệu chưa được điền",
      };
    }

    // Check educationLevel
    if (!doctor.educationLevel || !doctor.educationLevel.trim()) {
      return {
        canBeActive: false,
        reason: "Trình độ học vấn chưa được chọn",
      };
    }

    return { canBeActive: true };
  } catch (error) {
    console.error("Error checking doctor can be active:", error);
    return {
      canBeActive: false,
      reason: "Lỗi khi kiểm tra thông tin bác sĩ",
    };
  }
}

/**
 * Hàm helper: Tính toán và trả về thời gian đã trôi qua từ một ngày cụ thể
 * Thuật toán: Tính khoảng cách thời gian theo phút, sau đó chuyển đổi sang phút/giờ/ngày
 * @param {Date} date - Ngày cần so sánh
 * @returns {string} - Chuỗi mô tả thời gian đã trôi qua (ví dụ: "5 phút trước", "2 giờ trước", "3 ngày trước")
 */
function getTimeAgo(date) {
  const now = new Date();
  // Tính số phút đã trôi qua: (hiện tại - ngày cũ) / (1000ms * 60s)
  const diffInMinutes = Math.floor((now - date) / (1000 * 60));

  // Nếu chưa đến 1 giờ (60 phút), hiển thị theo phút
  if (diffInMinutes < 60) {
    return `${diffInMinutes} phút trước`;
  }
  // Nếu chưa đến 1 ngày (1440 phút = 24 giờ), hiển thị theo giờ
  else if (diffInMinutes < 1440) {
    const hours = Math.floor(diffInMinutes / 60);
    return `${hours} giờ trước`;
  }
  // Nếu hơn 1 ngày, hiển thị theo ngày
  else {
    const days = Math.floor(diffInMinutes / 1440);
    return `${days} ngày trước`;
  }
}

/**
 * Hàm helper: Định dạng ngày tháng theo định dạng Việt Nam
 * @param {Date|string} date - Ngày cần định dạng
 * @returns {string} - Chuỗi ngày đã được định dạng (ví dụ: "12/11/2025")
 */
function formatDate(date) {
  if (!date) return "Chưa có ngày";
  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return "Chưa có ngày";
    }
    return dateObj.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch (error) {
    console.error("Error formatting date:", error, date);
    return "Chưa có ngày";
  }
}

/**
 * Hàm helper: Định dạng thời gian theo định dạng Việt Nam
 * @param {Date|string} date - Ngày cần định dạng
 * @returns {string} - Chuỗi thời gian đã được định dạng (ví dụ: "14:30")
 */
function formatTime(date) {
  return new Date(date).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Hàm helper: Lấy màu sắc tương ứng với tên chuyên khoa
 * Thuật toán: Sử dụng Map để ánh xạ tên chuyên khoa với mã màu hex
 * @param {string} name - Tên chuyên khoa
 * @returns {string} - Mã màu hex (ví dụ: "#ff4d4f")
 */
function getColorForSpecialization(name) {
  const colorMap = {
    "Tim mạch": "#ff4d4f",
    "Nội khoa": "#722ed1",
    "Da liễu": "#fa8c16",
    "Nha khoa": "#8c8c8c",
    "Tai mũi họng": "#faad14",
    Mắt: "#52c41a",
    "Thần kinh": "#1890ff",
    "Nhi khoa": "#faad14",
  };
  return colorMap[name] || "#1890ff";
}

// ================== DASHBOARD CONTROLLERS ==================

// Dashboard stats
export const getDashboardStats = async (req, res) => {
  try {
    // Get real data from database
    const totalUsers = await User.countDocuments();
    const verifiedDoctors = await Doctor.countDocuments({ isVerified: true });
    const pendingDoctors = await Doctor.countDocuments({ isVerified: false });

    // Get total appointments (all time)
    const totalAppointments = await Appointment.countDocuments({});

    // Revenue calculation using MongoDB aggregation for accurate and efficient calculation
    // Calculate total revenue from all successful payments (captured or authorized status)
    // Total revenue = sum of (payment.total - refundAmount) for all successful payments
    const revenueResult = await Payment.aggregate([
      {
        $match: {
          status: { $in: ['captured', 'authorized'] }
        }
      },
      {
        $project: {
          netRevenue: {
            $subtract: [
              { $ifNull: ['$total', 0] },
              { $ifNull: ['$refundAmount', 0] }
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$netRevenue' }
        }
      }
    ]);

    // Extract revenue from aggregation result, default to 0 if no payments found
    const revenue = revenueResult.length > 0 && revenueResult[0].totalRevenue
      ? revenueResult[0].totalRevenue
      : 0;

    const stats = {
      totalUsers,
      verifiedDoctors,
      pendingDoctors,
      monthlyAppointments: totalAppointments, // Using totalAppointments for "Tổng số lịch hẹn"
      revenue,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tải thống kê dashboard",
    });
  }
};

// Dashboard activities
export const getDashboardActivities = async (req, res) => {
  try {
    // Get recent activities from database
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(3)
      .select("fullName role createdAt")
      .lean();

    const recentDoctors = await Doctor.find()
      .populate({
        path: "userId",
        select: "fullName",
        options: { lean: true },
      })
      .sort({ createdAt: -1 })
      .limit(2)
      .select("userId isVerified createdAt")
      .lean();

    const activities = [];

    // Add user registrations
    recentUsers.forEach((user) => {
      try {
        if (user && user.createdAt) {
          const roleText = user.role === "doctor" ? "bác sĩ" : "bệnh nhân";
          activities.push({
            title: `${user.fullName || "Người dùng"
              } đã đăng ký tài khoản ${roleText}`,
            time: getTimeAgo(user.createdAt),
            createdAt: user.createdAt, // Store original date for sorting
          });
        }
      } catch (err) {
        console.error("Error processing user activity:", err);
      }
    });

    // Add doctor verifications
    recentDoctors.forEach((doctor) => {
      if (
        doctor &&
        doctor.isVerified &&
        doctor.createdAt &&
        doctor.userId &&
        doctor.userId.fullName
      ) {
        activities.push({
          title: `BS. ${doctor.userId.fullName} đã được xác minh`,
          time: getTimeAgo(doctor.createdAt),
          createdAt: doctor.createdAt, // Store original date for sorting
        });
      }
    });

    // Sort by createdAt (most recent first) before formatting
    activities.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateB - dateA;
    });

    // Remove createdAt before sending response
    const formattedActivities = activities
      .slice(0, 4)
      .map(({ createdAt, ...rest }) => rest);

    res.json({
      success: true,
      data: formattedActivities,
    });
  } catch (error) {
    console.error("Error fetching dashboard activities:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tải hoạt động gần đây",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Dashboard system status
export const getSystemStatus = async (req, res) => {
  try {
    // Get real system metrics - use same logic as dashboard stats
    const activeUsers = await User.countDocuments({ status: "active" });
    const totalDoctors = await Doctor.countDocuments({ isActive: true });
    const pendingDoctors = await Doctor.countDocuments({ isVerified: false }); // Use same logic as dashboard stats

    const systemStatus = [
      {
        label: "Người dùng hoạt động",
        value: activeUsers.toString(),
        status: "success",
      },
      {
        label: "Bác sĩ đang hoạt động",
        value: totalDoctors.toString(),
        status: "success",
      },
      {
        label: "Chờ xác minh",
        value: pendingDoctors.toString(),
        status: "success",
      },
      { label: "Uptime", value: "99.9%", status: "success" },
    ];

    res.json({
      success: true,
      data: systemStatus,
    });
  } catch (error) {
    console.error("Error fetching system status:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tải tình trạng hệ thống",
    });
  }
};

// ================== DOCTORS CONTROLLERS ==================

// Get all doctors
export const getAllDoctors = async (req, res) => {
  try {
    const { search, status, specialization } = req.query;

    let query = {};

    // Add search filter
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { licenseNo: { $regex: search, $options: "i" } },
      ];
    }

    // Add status filter
    if (status === "verified") {
      query.isVerified = true;
    } else if (status === "pending") {
      query.isVerified = false;
    }

    // Add specialization filter
    if (specialization) {
      query.specializationIds = { $in: [specialization] };
    }

    const doctors = await Doctor.find(query)
      .populate("userId", "fullName email")
      .populate("specializationIds", "name")
      .select(
        "userId fullName licenseNo yearsExperience bio avatarUrl specializationIds isVerified createdAt updatedAt"
      )
      .sort({ createdAt: -1 });

    const formattedDoctors = doctors.map((doctor) => {
      // Format specialty - handle null, undefined, or empty array
      let specialty = "Chưa chọn chuyên khoa";
      if (
        doctor.specializationIds &&
        Array.isArray(doctor.specializationIds) &&
        doctor.specializationIds.length > 0
      ) {
        const specialtyNames = doctor.specializationIds
          .filter((s) => s && s.name) // Filter out null/undefined
          .map((s) => s.name);
        if (specialtyNames.length > 0) {
          specialty = specialtyNames.join(", ");
        }
      }

      // Filter out picsum.photos URLs - replace with null to use default avatar
      let avatarUrl = doctor.avatarUrl || null;
      if (avatarUrl && avatarUrl.includes("picsum.photos")) {
        avatarUrl = null;
      }

      return {
        id: doctor._id,
        name: doctor.fullName || doctor.userId?.fullName || "Chưa có tên",
        email: doctor.userId?.email || "Chưa có email",
        specialty: specialty,
        experience: `${doctor.yearsExperience || 0} năm kinh nghiệm`,
        license: doctor.licenseNo || "Chưa có giấy phép",
        status: doctor.isVerified ? "verified" : "pending",
        submittedDate: formatDate(doctor.createdAt),
        avatar: avatarUrl,
      };
    });

    res.json({
      success: true,
      data: formattedDoctors,
    });
  } catch (error) {
    console.error("Error fetching doctors:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tải danh sách bác sĩ",
    });
  }
};

// Get pending doctors
export const getPendingDoctors = async (req, res) => {
  try {
    // Get doctors that are not verified AND not rejected (no rejectedAt)
    const pendingDoctors = await Doctor.find({
      isVerified: false,
      rejectedAt: { $exists: false } // Exclude rejected doctors
    })
      .populate("userId", "fullName email phone")
      .populate("specializationIds", "name")
      .populate("clinicDefaultId", "name address")
      .select(
        "userId fullName licenseNo yearsExperience bio avatarUrl specializationIds clinicDefaultId createdAt"
      )
      .sort({ createdAt: -1 })
      .lean(); // Use lean() to convert to plain objects

    // Format doctors data - license image comes from licenseNo field
    const doctorUploadDir = path.resolve('uploads/doctors');

    const formattedDoctors = pendingDoctors.map((doctor) => {
      try {
        // Build license image URL - if licenseNo exists, it's a filename in uploads/doctors/
        // Check if file actually exists before returning URL
        let licenseImageUrl = null;
        if (doctor.licenseNo) {
          const filePath = path.join(doctorUploadDir, doctor.licenseNo);
          if (fs.existsSync(filePath)) {
            licenseImageUrl = `/server-uploads/doctors/${doctor.licenseNo}`;
          } else {
            console.warn(`⚠️ License file not found for doctor ${doctor._id}: ${doctor.licenseNo}`);
            // Don't return licenseImageUrl if file doesn't exist
          }
        }

        // Format specialty - handle null, undefined, or empty array
        let specialty = "Chưa chọn chuyên khoa";
        if (
          doctor.specializationIds &&
          Array.isArray(doctor.specializationIds) &&
          doctor.specializationIds.length > 0
        ) {
          const specialtyNames = doctor.specializationIds
            .filter((s) => s && s && s.name) // Filter out null/undefined
            .map((s) => s.name)
            .filter((name) => name); // Filter out empty names
          if (specialtyNames.length > 0) {
            specialty = specialtyNames.join(", ");
          }
        }

        // Filter out picsum.photos URLs - replace with null to use default avatar
        let avatarUrl = doctor.avatarUrl || null;
        if (avatarUrl && avatarUrl.includes("picsum.photos")) {
          avatarUrl = null;
        }

        // Safe access to userId
        const userId = doctor.userId || {};
        const clinicDefaultId = doctor.clinicDefaultId || {};

        return {
          id: doctor._id?.toString() || null,
          name: doctor.fullName || userId.fullName || "Chưa có tên",
          email: userId.email || "Chưa có email",
          phone: userId.phone || "Chưa có số điện thoại",
          specialty: specialty,
          experience: `${doctor.yearsExperience || 0} năm kinh nghiệm`,
          hospital: clinicDefaultId.name || "Chưa cập nhật",
          license: doctor.licenseNo || "Chưa có giấy phép",
          licenseImageUrl: licenseImageUrl,
          bio: doctor.bio || "Chưa có mô tả",
          submittedDate: formatDate(doctor.createdAt),
          avatar: avatarUrl,
        };
      } catch (formatError) {
        console.error("Error formatting doctor:", doctor._id, formatError);
        // Return a minimal safe object
        return {
          id: doctor._id?.toString() || "unknown",
          name: "Lỗi khi tải thông tin",
          email: "N/A",
          phone: "N/A",
          specialty: "N/A",
          experience: "N/A",
          hospital: "N/A",
          license: "N/A",
          licenseImageUrl: null,
          bio: "N/A",
          submittedDate: "N/A",
          avatar: null,
        };
      }
    });

    res.json({
      success: true,
      data: formattedDoctors,
    });
  } catch (error) {
    console.error("Error fetching pending doctors:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      success: false,
      message:
        "Lỗi khi tải danh sách bác sĩ chờ xác minh: " +
        (error.message || String(error)),
    });
  }
};

// Get verified doctors
export const getVerifiedDoctors = async (req, res) => {
  try {
    const verifiedDoctors = await Doctor.find({ isVerified: true })
      .populate("userId", "fullName email phone")
      .populate("specializationIds", "name")
      .populate("clinicDefaultId", "name address")
      .select(
        "userId fullName licenseNo yearsExperience bio avatarUrl specializationIds clinicDefaultId createdAt updatedAt isVerified isActive"
      )
      .sort({ updatedAt: -1 });

    const formattedDoctors = verifiedDoctors.map((doctor) => {
      // Build license image URL - if licenseNo exists, it's a filename in uploads/doctors/
      const licenseImageUrl = doctor.licenseNo
        ? `/server-uploads/doctors/${doctor.licenseNo}`
        : null;

      // Format specialty - handle null, undefined, or empty array
      let specialty = "Chưa chọn chuyên khoa";
      if (
        doctor.specializationIds &&
        Array.isArray(doctor.specializationIds) &&
        doctor.specializationIds.length > 0
      ) {
        const specialtyNames = doctor.specializationIds
          .filter((s) => s && s.name) // Filter out null/undefined
          .map((s) => s.name);
        if (specialtyNames.length > 0) {
          specialty = specialtyNames.join(", ");
        }
      }

      // Filter out picsum.photos URLs - replace with null to use default avatar
      let avatarUrl = doctor.avatarUrl || null;
      if (avatarUrl && avatarUrl.includes("picsum.photos")) {
        avatarUrl = null;
      }

      return {
        id: doctor._id,
        name: doctor.fullName || doctor.userId?.fullName || "Chưa có tên",
        email: doctor.userId?.email || "Chưa có email",
        phone: doctor.userId?.phone || "Chưa có số điện thoại",
        specialty: specialty,
        experience: `${doctor.yearsExperience || 0} năm kinh nghiệm`,
        hospital: doctor.clinicDefaultId?.name || "Chưa cập nhật",
        license: doctor.licenseNo || "Chưa có giấy phép",
        licenseImageUrl: licenseImageUrl,
        bio: doctor.bio || "Chưa có mô tả",
        submittedDate: doctor.createdAt
          ? formatDate(doctor.createdAt)
          : (doctor._id ? formatDate(doctor._id.getTimestamp()) : "Chưa có ngày"),
        verifiedDate: formatDate(doctor.updatedAt),
        verifiedBy: "Admin", // Would need to track who verified
        avatar: avatarUrl,
      };
    });

    res.json({
      success: true,
      data: formattedDoctors,
    });
  } catch (error) {
    console.error("Error fetching verified doctors:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tải danh sách bác sĩ đã xác minh",
    });
  }
};

// Get rejected doctors
export const getRejectedDoctors = async (req, res) => {
  try {
    // Get doctors that have been rejected (have rejectedAt field)
    const rejectedDoctors = await Doctor.find({
      rejectedAt: { $exists: true, $ne: null } // Has rejection date
    })
      .populate("userId", "fullName email phone")
      .populate("specializationIds", "name")
      .populate("clinicDefaultId", "name address")
      .select(
        "userId fullName licenseNo yearsExperience bio avatarUrl specializationIds clinicDefaultId createdAt rejectedAt rejectionReason"
      )
      .sort({ rejectedAt: -1 }) // Sort by rejection date, newest first
      .lean();

    // Format doctors data - license image comes from licenseNo field
    const doctorUploadDir = path.resolve('uploads/doctors');

    const formattedDoctors = rejectedDoctors.map((doctor) => {
      try {
        // Build license image URL - if licenseNo exists, it's a filename in uploads/doctors/
        // Check if file actually exists before returning URL
        let licenseImageUrl = null;
        if (doctor.licenseNo) {
          const filePath = path.join(doctorUploadDir, doctor.licenseNo);
          if (fs.existsSync(filePath)) {
            licenseImageUrl = `/server-uploads/doctors/${doctor.licenseNo}`;
          } else {
            console.warn(`⚠️ License file not found for doctor ${doctor._id}: ${doctor.licenseNo}`);
            // Don't return licenseImageUrl if file doesn't exist
          }
        }

        // Format specialty - handle null, undefined, or empty array
        let specialty = "Chưa chọn chuyên khoa";
        if (
          doctor.specializationIds &&
          Array.isArray(doctor.specializationIds) &&
          doctor.specializationIds.length > 0
        ) {
          const specialtyNames = doctor.specializationIds
            .filter((s) => s && s && s.name) // Filter out null/undefined
            .map((s) => s.name)
            .filter((name) => name); // Filter out empty names
          if (specialtyNames.length > 0) {
            specialty = specialtyNames.join(", ");
          }
        }

        // Filter out picsum.photos URLs - replace with null to use default avatar
        let avatarUrl = doctor.avatarUrl || null;
        if (avatarUrl && avatarUrl.includes("picsum.photos")) {
          avatarUrl = null;
        }

        // Safe access to userId
        const userId = doctor.userId || {};
        const clinicDefaultId = doctor.clinicDefaultId || {};

        return {
          id: doctor._id?.toString() || null,
          name: doctor.fullName || userId.fullName || "Chưa có tên",
          email: userId.email || "Chưa có email",
          phone: userId.phone || "Chưa có số điện thoại",
          specialty: specialty,
          experience: `${doctor.yearsExperience || 0} năm kinh nghiệm`,
          hospital: clinicDefaultId.name || "Chưa cập nhật",
          license: doctor.licenseNo || "Chưa có giấy phép",
          licenseImageUrl: licenseImageUrl,
          bio: doctor.bio || "Chưa có mô tả",
          submittedDate: formatDate(doctor.createdAt),
          rejectedDate: doctor.rejectedAt
            ? formatDate(doctor.rejectedAt)
            : "Chưa có ngày",
          rejectionReason: doctor.rejectionReason || "Không có lý do",
          avatar: avatarUrl,
        };
      } catch (formatError) {
        console.error("Error formatting doctor:", doctor._id, formatError);
        // Return a minimal safe object
        return {
          id: doctor._id?.toString() || "unknown",
          name: "Lỗi khi tải thông tin",
          email: "N/A",
          phone: "N/A",
          specialty: "N/A",
          experience: "N/A",
          hospital: "N/A",
          license: "N/A",
          licenseImageUrl: null,
          bio: "N/A",
          submittedDate: "N/A",
          rejectedDate: "N/A",
          rejectionReason: "N/A",
          avatar: null,
        };
      }
    });

    res.json({
      success: true,
      data: formattedDoctors,
    });
  } catch (error) {
    console.error("Error fetching rejected doctors:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tải danh sách bác sĩ bị từ chối",
    });
  }
};

// Helper function: Send approval email to doctor
async function sendDoctorApprovalEmail(doctor, user, canBeActive = true, activeCheck = null) {
  try {
    if (!user || !user.email) {
      return;
    }
    const doctorName = doctor.fullName || user.fullName || "Bác sĩ";
    const approvalDate = new Date().toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Xác định thông tin còn thiếu
    const missingInfo = [];
    if (!doctor.yearsExperience || doctor.yearsExperience <= 0) {
      missingInfo.push("Số năm kinh nghiệm (phải lớn hơn 0)");
    }
    if (!doctor.bio || doctor.bio.trim().length === 0) {
      missingInfo.push("Lời giới thiệu về bản thân (bio)");
    }
    if (!doctor.educationLevel || !doctor.educationLevel.trim()) {
      missingInfo.push("Trình độ học vấn");
    }

    // Tạo nội dung email dựa trên canBeActive
    let htmlContent = "";
    let subject = "";

    if (canBeActive && missingInfo.length === 0) {
      // Trường hợp đầy đủ thông tin - email phê duyệt thông thường
      subject = "Tài khoản bác sĩ của bạn đã được phê duyệt - MedConnect";
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #059669; border-bottom: 2px solid #059669; padding-bottom: 10px;">
            Tài khoản bác sĩ của bạn đã được phê duyệt
          </h2>
          <p>Xin chào <strong>${doctorName}</strong>,</p>
          <p>Chúng tôi vui mừng thông báo rằng <strong style="color: #059669;">tài khoản bác sĩ của bạn đã được phê duyệt</strong> thành công bởi ban quản trị.</p>
          
          <div style="background-color: #ecfdf5; border-left: 4px solid #059669; padding: 15px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #047857;">Thông tin tài khoản:</h3>
            <p style="margin: 8px 0;"><strong>Họ và tên:</strong> ${doctorName}</p>
            <p style="margin: 8px 0;"><strong>Email đăng nhập:</strong> ${user.email}</p>
            <p style="margin: 8px 0;"><strong>Ngày phê duyệt:</strong> ${approvalDate}</p>
          </div>

          <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 15px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #0284c7;">Hướng dẫn đăng nhập:</h3>
            <p>Bạn có thể đăng nhập vào hệ thống MedConnect bằng:</p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li><strong>Email:</strong> ${user.email}</li>
              <li><strong>Mật khẩu:</strong> Mật khẩu bạn đã đăng ký</li>
            </ul>
            <p style="margin-top: 15px;">
              <a href="${process.env.CLIENT_URL || "http://localhost:5173"}/auth/login" 
                 style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Đăng nhập ngay
              </a>
            </p>
          </div>

          <p style="margin-top: 30px;"><strong>Lưu ý:</strong></p>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>Đảm bảo bạn sử dụng đúng email và mật khẩu đã đăng ký</li>
            <li>Nếu quên mật khẩu, bạn có thể sử dụng chức năng "Quên mật khẩu" trên trang đăng nhập</li>
            <li>Vui lòng cập nhật đầy đủ thông tin hồ sơ sau khi đăng nhập</li>
          </ul>
          
          <p style="margin-top: 30px;">Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi.</p>
          
          <p style="margin-top: 30px;">Trân trọng,<br><strong>MedConnect - Đội ngũ quản trị</strong></p>
        </div>
      `;
    } else {
      // Trường hợp thiếu thông tin - email như trong ảnh
      subject = "Tài khoản của bạn đã được xác minh - Cần bổ sung thông tin";
      const missingInfoList = missingInfo.map(info => `<li>${info}</li>`).join("");

      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #f59e0b; border-bottom: 2px solid #f59e0b; padding-bottom: 10px; font-size: 24px;">
            Tài khoản của bạn đã được xác minh - Cần bổ sung thông tin
          </h2>
          <p>Xin chào <strong>${doctorName}</strong>,</p>
          <p>Tài khoản bác sĩ của bạn đã được <strong style="color: #059669;">xác minh thành công</strong> vào ngày ${approvalDate}.</p>
          
          <div style="background-color: #fff7ed; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #d97706;">
              <span style="font-size: 20px;">⚠️</span> Thông tin quan trọng:
            </h3>
            <p style="margin: 8px 0;">Tài khoản của bạn hiện đang ở trạng thái <strong style="color: #f59e0b;">tạm khóa</strong> vì chưa điền đầy đủ thông tin cần thiết.</p>
            <p style="margin: 8px 0;">Để bắt đầu hoạt động, bạn cần điền đầy đủ các thông tin sau:</p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              ${missingInfoList}
            </ul>
          </div>

          <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 15px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #0284c7;">Hướng dẫn:</h3>
            <ol style="margin: 10px 0; padding-left: 20px;">
              <li>Đăng nhập vào hệ thống MedConnect bằng email: <a href="mailto:${user.email}" style="color: #0ea5e9; text-decoration: underline;">${user.email}</a></li>
              <li>Vào phần "Cài đặt" hoặc "Hồ sơ" để cập nhật thông tin</li>
              <li>Điền đầy đủ các thông tin còn thiếu</li>
              <li>Sau khi điền đủ thông tin, tài khoản của bạn sẽ tự động được kích hoạt</li>
            </ol>
            <p style="margin-top: 15px;">
              <a href="${process.env.CLIENT_URL || "http://localhost:5173"}/auth/login" 
                 style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Đăng nhập ngay
              </a>
            </p>
          </div>

          <div style="background-color: #ecfdf5; border-left: 4px solid #059669; padding: 15px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #047857;">Lưu ý:</h3>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Bạn có thể đăng nhập vào hệ thống để cập nhật thông tin cá nhân</li>
              <li>Tài khoản của bạn sẽ không hiển thị trong danh sách bác sĩ cho bệnh nhân chọn cho đến khi bạn điền đủ thông tin</li>
              <li>Sau khi điền đủ thông tin, tài khoản sẽ tự động được kích hoạt và bạn có thể nhận lịch hẹn</li>
            </ul>
          </div>
          
          <p style="margin-top: 30px;">Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi.</p>
          
          <p style="margin-top: 30px;">Trân trọng,<br><strong>MedConnect - Đội ngũ quản trị</strong></p>
        </div>
      `;
    }

    // Tạo text content tương ứng
    let textContent = "";
    if (canBeActive && missingInfo.length === 0) {
      textContent = `
Tài khoản bác sĩ của bạn đã được phê duyệt

Xin chào ${doctorName},

Chúng tôi vui mừng thông báo rằng tài khoản bác sĩ của bạn đã được phê duyệt thành công bởi ban quản trị.

Thông tin tài khoản:
- Họ và tên: ${doctorName}
- Email đăng nhập: ${user.email}
- Ngày phê duyệt: ${approvalDate}

Hướng dẫn đăng nhập:
Bạn có thể đăng nhập vào hệ thống MedConnect bằng:
- Email: ${user.email}
- Mật khẩu: Mật khẩu bạn đã đăng ký

Link đăng nhập: ${process.env.CLIENT_URL || "http://localhost:5173"}/auth/login

Lưu ý:
- Đảm bảo bạn sử dụng đúng email và mật khẩu đã đăng ký
- Nếu quên mật khẩu, bạn có thể sử dụng chức năng "Quên mật khẩu" trên trang đăng nhập
- Vui lòng cập nhật đầy đủ thông tin hồ sơ sau khi đăng nhập

Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi.

Trân trọng,
MedConnect - Đội ngũ quản trị
      `;
    } else {
      const missingInfoText = missingInfo.map((info, index) => `${index + 1}. ${info}`).join("\n");
      textContent = `
Tài khoản của bạn đã được xác minh - Cần bổ sung thông tin

Xin chào ${doctorName},

Tài khoản bác sĩ của bạn đã được xác minh thành công vào ngày ${approvalDate}.

⚠️ Thông tin quan trọng:
Tài khoản của bạn hiện đang ở trạng thái tạm khóa vì chưa điền đầy đủ thông tin cần thiết.

Để bắt đầu hoạt động, bạn cần điền đầy đủ các thông tin sau:
${missingInfoText}

Hướng dẫn:
1. Đăng nhập vào hệ thống MedConnect bằng email: ${user.email}
2. Vào phần "Cài đặt" hoặc "Hồ sơ" để cập nhật thông tin
3. Điền đầy đủ các thông tin còn thiếu
4. Sau khi điền đủ thông tin, tài khoản của bạn sẽ tự động được kích hoạt

Link đăng nhập: ${process.env.CLIENT_URL || "http://localhost:5173"}/auth/login

Lưu ý:
- Bạn có thể đăng nhập vào hệ thống để cập nhật thông tin cá nhân
- Tài khoản của bạn sẽ không hiển thị trong danh sách bác sĩ cho bệnh nhân chọn cho đến khi bạn điền đủ thông tin
- Sau khi điền đủ thông tin, tài khoản sẽ tự động được kích hoạt và bạn có thể nhận lịch hẹn

Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi.

Trân trọng,
MedConnect - Đội ngũ quản trị
      `;
    }

    const { sendMail } = await import("../utils/email.js");

    await sendMail({
      to: user.email,
      subject: subject,
      text: textContent,
      html: htmlContent,
    });
  } catch (error) {
    console.error("Error sending doctor approval email:", error);
    // Không throw error để không ảnh hưởng đến flow chính
  }
}

// Helper function: Send suspension email to doctor (after verification but missing info)
async function sendDoctorSuspensionEmail(doctor, user) {
  try {
    if (!user || !user.email) {
      return;
    }

    const doctorName = doctor.fullName || user.fullName || "Bác sĩ";
    const verificationDate = new Date().toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #f59e0b; border-bottom: 2px solid #f59e0b; padding-bottom: 10px;">
          Tài khoản của bạn đã được xác minh - Cần bổ sung thông tin
        </h2>
        <p>Xin chào <strong>${doctorName}</strong>,</p>
        <p>Tài khoản bác sĩ của bạn đã được <strong style="color: #059669;">xác minh thành công</strong> vào ngày <strong>${verificationDate}</strong>.</p>
        
        <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #d97706;">⚠️ Thông tin quan trọng:</h3>
          <p style="margin: 8px 0;">Tài khoản của bạn hiện đang ở trạng thái <strong>tạm khóa</strong> vì chưa điền đầy đủ thông tin cần thiết.</p>
          <p style="margin: 8px 0;">Để bắt đầu hoạt động, bạn cần điền đầy đủ các thông tin sau:</p>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>Số năm kinh nghiệm (phải lớn hơn 0)</li>
            <li>Lời giới thiệu về bản thân (bio)</li>
          </ul>
        </div>

        <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 15px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #0284c7;">Hướng dẫn:</h3>
          <p>1. Đăng nhập vào hệ thống MedConnect bằng email: <strong>${user.email
      }</strong></p>
          <p>2. Vào phần <strong>"Cài đặt"</strong> hoặc <strong>"Hồ sơ"</strong> để cập nhật thông tin</p>
          <p>3. Điền đầy đủ các thông tin còn thiếu</p>
          <p>4. Sau khi điền đủ thông tin, tài khoản của bạn sẽ tự động được kích hoạt</p>
          <p style="margin-top: 15px;">
            <a href="${process.env.CLIENT_URL || "http://localhost:5173"
      }/auth/login" 
               style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Đăng nhập ngay
            </a>
          </p>
        </div>

        <div style="background-color: #ecfdf5; border-left: 4px solid #059669; padding: 15px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #047857;">Lưu ý:</h3>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>Bạn có thể đăng nhập vào hệ thống để cập nhật thông tin cá nhân</li>
            <li>Tài khoản của bạn sẽ không hiển thị trong danh sách bác sĩ cho bệnh nhân chọn cho đến khi bạn điền đủ thông tin</li>
            <li>Sau khi điền đủ thông tin, tài khoản sẽ tự động được kích hoạt và bạn có thể nhận lịch hẹn</li>
          </ul>
        </div>
        
        <p style="margin-top: 30px;">Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi.</p>
        
        <p style="margin-top: 30px;">Trân trọng,<br><strong>MedConnect - Đội ngũ quản trị</strong></p>
      </div>
    `;

    const textContent = `
Tài khoản của bạn đã được xác minh - Cần bổ sung thông tin

Xin chào ${doctorName},

Tài khoản bác sĩ của bạn đã được xác minh thành công vào ngày ${verificationDate}.

⚠️ Thông tin quan trọng:
Tài khoản của bạn hiện đang ở trạng thái tạm khóa vì chưa điền đầy đủ thông tin cần thiết.

Để bắt đầu hoạt động, bạn cần điền đầy đủ các thông tin sau:
- Số năm kinh nghiệm (phải lớn hơn 0)
- Lời giới thiệu về bản thân (bio)

Hướng dẫn:
1. Đăng nhập vào hệ thống MedConnect bằng email: ${user.email}
2. Vào phần "Cài đặt" hoặc "Hồ sơ" để cập nhật thông tin
3. Điền đầy đủ các thông tin còn thiếu
4. Sau khi điền đủ thông tin, tài khoản của bạn sẽ tự động được kích hoạt

Link đăng nhập: ${process.env.CLIENT_URL || "http://localhost:5173"}/auth/login

Lưu ý:
- Bạn có thể đăng nhập vào hệ thống để cập nhật thông tin cá nhân
- Tài khoản của bạn sẽ không hiển thị trong danh sách bác sĩ cho bệnh nhân chọn cho đến khi bạn điền đủ thông tin
- Sau khi điền đủ thông tin, tài khoản sẽ tự động được kích hoạt và bạn có thể nhận lịch hẹn

Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi.

Trân trọng,
MedConnect - Đội ngũ quản trị
    `;

    const { sendMail } = await import("../utils/email.js");
    const emailResult = await sendMail({
      to: user.email,
      subject:
        "Tài khoản của bạn đã được xác minh - Cần bổ sung thông tin - MedConnect",
      text: textContent,
      html: htmlContent,
    });
  } catch (error) {
    console.error("❌ Error sending doctor suspension email:", error);
    // Không throw error để không ảnh hưởng đến flow chính
  }
}

// Helper function: Send rejection email to doctor
async function sendDoctorRejectionEmail(doctor, user, reason, rejectedBy) {
  try {
    if (!user || !user.email) {
      return;
    }
    const doctorName = doctor.fullName || user.fullName || "Bác sĩ";
    const rejectionDate = new Date().toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const adminName = rejectedBy?.fullName || "Ban quản trị";

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 10px;">
          Thông báo về đơn đăng ký tài khoản bác sĩ
        </h2>
        <p>Xin chào <strong>${doctorName}</strong>,</p>
        <p>Chúng tôi rất tiếc phải thông báo rằng <strong style="color: #dc2626;">đơn đăng ký tài khoản bác sĩ của bạn đã không được phê duyệt</strong>.</p>
        
        <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #b91c1c;">Thông tin đơn đăng ký:</h3>
          <p style="margin: 8px 0;"><strong>Họ và tên:</strong> ${doctorName}</p>
          <p style="margin: 8px 0;"><strong>Email:</strong> ${user.email}</p>
          <p style="margin: 8px 0;"><strong>Ngày xử lý:</strong> ${rejectionDate}</p>
          <p style="margin: 8px 0;"><strong>Người xử lý:</strong> ${adminName}</p>
        </div>

        <div style="background-color: #fff7ed; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #d97706;">Lý do từ chối:</h3>
          <div style="background-color: white; padding: 15px; border-radius: 4px; border: 1px solid #fcd34d;">
            <p style="margin: 0; white-space: pre-wrap;">${reason || "Không có lý do cụ thể"
      }</p>
          </div>
        </div>

        <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 15px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #0284c7;">Bước tiếp theo:</h3>
          <p>Bạn có thể:</p>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>Đăng ký lại với thông tin đã được cập nhật và tuân thủ các yêu cầu</li>
            <li>Liên hệ với chúng tôi nếu bạn có thắc mắc về quyết định này</li>
            <li>Kiểm tra lại các tài liệu đã gửi và đảm bảo chúng đáp ứng đầy đủ yêu cầu</li>
          </ul>
          <p style="margin-top: 15px;">
            <a href="${process.env.CLIENT_URL || "http://localhost:5173"
      }/auth/doctor-register" 
               style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Đăng ký lại
            </a>
          </p>
        </div>
        
        <p style="margin-top: 30px;">Nếu bạn có bất kỳ câu hỏi hoặc cần hỗ trợ, vui lòng liên hệ với chúng tôi qua email hoặc số điện thoại hỗ trợ.</p>
        
        <p style="margin-top: 30px;">Trân trọng,<br><strong>MedConnect - Đội ngũ quản trị</strong></p>
      </div>
    `;

    const textContent = `
Thông báo về đơn đăng ký tài khoản bác sĩ

Xin chào ${doctorName},

Chúng tôi rất tiếc phải thông báo rằng đơn đăng ký tài khoản bác sĩ của bạn đã không được phê duyệt.

Thông tin đơn đăng ký:
- Họ và tên: ${doctorName}
- Email: ${user.email}
- Ngày xử lý: ${rejectionDate}
- Người xử lý: ${adminName}

Lý do từ chối:
${reason || "Không có lý do cụ thể"}

Bước tiếp theo:
Bạn có thể:
- Đăng ký lại với thông tin đã được cập nhật và tuân thủ các yêu cầu
- Liên hệ với chúng tôi nếu bạn có thắc mắc về quyết định này
- Kiểm tra lại các tài liệu đã gửi và đảm bảo chúng đáp ứng đầy đủ yêu cầu

Link đăng ký lại: ${process.env.CLIENT_URL || "http://localhost:5173"
      }/auth/doctor-register

Nếu bạn có bất kỳ câu hỏi hoặc cần hỗ trợ, vui lòng liên hệ với chúng tôi.

Trân trọng,
MedConnect - Đội ngũ quản trị
    `;

    const { sendMail } = await import("../utils/email.js");

    await sendMail({
      to: user.email,
      subject: "Thông báo về đơn đăng ký tài khoản bác sĩ - MedConnect",
      text: textContent,
      html: htmlContent,
    });
  } catch (error) {
    console.error("Error sending doctor rejection email:", error);
    // Không throw error để không ảnh hưởng đến flow chính
  }
}

// Approve doctor
export const approveDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;

    // Find the doctor first and populate userId
    const doctor = await Doctor.findById(id).populate(
      "userId",
      "fullName email"
    );

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bác sĩ",
      });
    }

    // Get reviewer User if available
    let reviewer = null;
    if (req.user?.email) {
      reviewer = await User.findOne({ email: req.user.email });
    }

    // Check if doctor can be active (has all required fields)
    const activeCheck = await checkDoctorCanBeActive(doctor._id);
    const canBeActive = activeCheck.canBeActive;

    // Update doctor verification status with approval info
    doctor.isVerified = true;
    // Only set isActive = true if doctor has all required information
    doctor.isActive = canBeActive;
    doctor.approvedBy = reviewer ? reviewer._id : null;
    doctor.approvedAt = new Date();
    // Clear rejection info if exists
    doctor.rejectedBy = null;
    doctor.rejectedAt = null;
    doctor.rejectionReason = null;
    await doctor.save();

    // Verify the update was successful
    const updatedDoctor = await Doctor.findById(id);
    if (!updatedDoctor || !updatedDoctor.isVerified) {
      console.error(
        "⚠️ Warning: Doctor verification update may not have persisted"
      );
      await Doctor.updateOne(
        { _id: id },
        {
          isVerified: true,
          isActive: canBeActive,
          approvedBy: reviewer ? reviewer._id : null,
          approvedAt: new Date(),
          $unset: { rejectedBy: "", rejectedAt: "", rejectionReason: "" },
        }
      );
    }

    // Log the status for admin information
    if (!canBeActive) {
      console.warn(
        `⚠️ Doctor ${doctor.fullName} (ID: ${doctor._id}) has been verified but is set to inactive due to: ${activeCheck.reason}`
      );
    }

    // Update User status based on whether doctor can be active
    if (doctor.userId) {
      // Handle both ObjectId and populated object
      const userId = doctor.userId._id || doctor.userId;

      // If doctor can be active, set status to "active", otherwise set to "suspended"
      const userStatus = canBeActive ? "active" : "suspended";

      const user = await User.findByIdAndUpdate(
        userId,
        {
          status: userStatus,
          emailVerified: true, // Verify email when doctor is approved
          phoneVerified: true, // Verify phone when doctor is approved
        },
        { new: true }
      );

      if (!user) {
        console.error(`❌ User not found with ID: ${userId}`);
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy thông tin người dùng liên kết với bác sĩ",
        });
      }

      // Verify the update was successful
      if (!user.emailVerified || !user.phoneVerified) {
        console.warn(
          `⚠️ WARNING: User verification fields not updated correctly!`
        );
        console.warn(
          `   emailVerified: ${user.emailVerified}, phoneVerified: ${user.phoneVerified}`
        );
        // Try to update again using updateOne to ensure it works
        await User.updateOne(
          { _id: userId },
          {
            emailVerified: true,
            phoneVerified: true,
          }
        );
        // Reload user to verify
        await User.findById(userId);
      }

      // Gửi email xác minh tài khoản bác sĩ thành công (khi isVerified = true)
      // Gửi email cho tất cả trường hợp phê duyệt, không phụ thuộc vào canBeActive
      try {
        // Gửi email approval cho tất cả trường hợp phê duyệt (isVerified = true)
        // Không phụ thuộc vào canBeActive
        // Đảm bảo có user object với email
        let userForEmail = user;

        if (!userForEmail || !userForEmail.email) {
          // Nếu user chưa có hoặc không có email, lấy từ doctor.userId
          if (doctor.userId) {
            if (typeof doctor.userId === "object" && doctor.userId.email) {
              // userId đã được populate
              userForEmail = doctor.userId;
            } else {
              // userId là ObjectId, cần query
              const User = (await import("../models/user.model.js")).default;
              const userIdToQuery = doctor.userId._id || doctor.userId;
              userForEmail = await User.findById(userIdToQuery).lean();
            }
          }
        }

        if (userForEmail && userForEmail.email) {
          await sendDoctorApprovalEmail(doctor, userForEmail, canBeActive, activeCheck);
        }
      } catch (emailError) {
        console.error("Failed to send email:", emailError);
        // Continue even if email fails
      }

      // Create in-app notification for doctor
      try {
        const { createDoctorRegistrationNotification } = await import(
          "../services/notificationService.js"
        );
        await createDoctorRegistrationNotification(id, "approved", {
          adminNotes: adminNotes || "",
          adminName: reviewer?.fullName || "Quản trị viên",
        });
      } catch (notificationError) {
        console.error(
          "❌ Error creating approval notification:",
          notificationError
        );
        // Don't fail the main request if notification fails
      }
    }

    // Final verification: Check if Doctor record still exists and is verified
    const finalCheck = await Doctor.findById(id);
    if (!finalCheck) {
      console.error(
        `❌ CRITICAL: Doctor record not found after approval! ID: ${id}`
      );
      return res.status(500).json({
        success: false,
        message: "Lỗi: Bản ghi bác sĩ không tồn tại sau khi phê duyệt",
      });
    }

    // Also verify by userId to ensure consistency
    const userId = doctor.userId._id || doctor.userId;
    const doctorByUserId = await Doctor.findOne({ userId: userId });

    if (!doctorByUserId) {
      console.error(`❌ WARNING: Doctor record not found by userId: ${userId}`);
      console.error(`   But Doctor record exists with ID: ${id}`);
      console.error(`   This suggests userId mismatch!`);
    } else if (doctorByUserId._id.toString() !== id.toString()) {
      console.error(`❌ WARNING: Doctor ID mismatch!`);
      console.error(`   Requested ID: ${id}`);
      console.error(`   Found by userId: ${doctorByUserId._id}`);
    }

    res.json({
      success: true,
      message: "Đã phê duyệt bác sĩ thành công",
      data: {
        doctorId: id,
        doctorName: finalCheck.fullName,
        userId: finalCheck.userId,
        isVerified: true,
      },
    });
  } catch (error) {
    console.error("Error approving doctor:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi phê duyệt bác sĩ: " + error.message,
    });
  }
};

// Reject doctor
export const rejectDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Validate reason is required
    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập lý do từ chối",
      });
    }

    // Find the doctor first and populate userId
    const doctor = await Doctor.findById(id).populate(
      "userId",
      "fullName email"
    );

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bác sĩ",
      });
    }

    // Get reviewer User if available
    let reviewer = null;
    if (req.user?.email) {
      reviewer = await User.findOne({ email: req.user.email });
    }

    // Update doctor with rejection info
    doctor.isVerified = false;
    doctor.isActive = false;
    doctor.rejectedBy = reviewer ? reviewer._id : null;
    doctor.rejectedAt = new Date();
    doctor.rejectionReason = reason.trim();
    // Clear approval info if exists
    doctor.approvedBy = null;
    doctor.approvedAt = null;
    await doctor.save();

    // Update User status to 'rejected' (allows re-registration)
    if (doctor.userId) {
      const userId = doctor.userId._id || doctor.userId;
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { status: "rejected" },
        { new: true }
      );

      // Gửi email từ chối tài khoản bác sĩ
      try {
        // Đảm bảo có user object với email
        let userForEmail = updatedUser;

        if (!userForEmail || !userForEmail.email) {
          // Nếu user chưa có hoặc không có email, lấy từ doctor.userId
          if (doctor.userId) {
            if (typeof doctor.userId === "object" && doctor.userId.email) {
              // userId đã được populate
              userForEmail = doctor.userId;
            } else {
              // userId là ObjectId, cần query
              const User = (await import("../models/user.model.js")).default;
              const userId = doctor.userId._id || doctor.userId;
              userForEmail = await User.findById(userId).lean();
            }
          }
        }

        if (userForEmail && userForEmail.email) {
          await sendDoctorRejectionEmail(
            doctor,
            userForEmail,
            reason,
            reviewer
          );
        }
      } catch (emailError) {
        console.error("Failed to send rejection email:", emailError);
        // Continue even if email fails
      }
    }

    // Create in-app notification for doctor
    try {
      const { createDoctorRegistrationNotification } = await import(
        "../services/notificationService.js"
      );
      await createDoctorRegistrationNotification(id, "rejected", {
        adminName: reviewer?.fullName || "Quản trị viên",
      });
    } catch (notificationError) {
      console.error(
        "❌ Error creating rejection notification:",
        notificationError
      );
      // Don't fail the main request if notification fails
    }

    res.json({
      success: true,
      message: "Đã từ chối bác sĩ thành công",
    });
  } catch (error) {
    console.error("Error rejecting doctor:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi từ chối bác sĩ: " + error.message,
    });
  }
};

// ================== USERS CONTROLLERS ==================

// Get all users
export const getAllUsers = async (req, res) => {
  try {
    const { search, role } = req.query;

    // Build query
    let query = {};

    if (role && role !== "all") {
      query.role = role;
    }

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // Get verified doctors' userIds if we need to filter doctors
    let verifiedDoctorUserIds = null;
    let verifiedDoctorUserIdsForQuery = [];
    if (role === "doctor" || role === "all" || !role) {
      const verifiedDoctors = await Doctor.find({ isVerified: true })
        .select("userId")
        .lean();
      verifiedDoctorUserIdsForQuery = verifiedDoctors.map((doc) => doc.userId);
      verifiedDoctorUserIds = new Set(
        verifiedDoctorUserIdsForQuery.map((id) => id.toString())
      );

      // If filtering by doctor, only show verified doctors in query
      if (role === "doctor") {
        query._id = { $in: verifiedDoctorUserIdsForQuery };
      }
    }

    const users = await User.find(query)
      .select("fullName email role status createdAt updatedAt")
      .sort({ createdAt: -1 });

    console.log(`📊 getAllUsers: Found ${users.length} users from database (role filter: ${role || 'all'})`);

    // For admin user management page, show ALL users including unverified doctors
    // Only filter when specifically filtering by "doctor" role (which should show verified doctors)
    let filteredUsers = users;
    // Remove the filter for unverified doctors - admin should see all users
    // Admin needs to see ALL users for management purposes
    console.log(`📊 getAllUsers: After filtering, ${filteredUsers.length} users will be returned`);

    // Fetch avatars for all users in parallel
    const formattedUsers = await Promise.all(
      filteredUsers.map(async (user) => {
        let avatarUrl = null;

        // Fetch avatar based on role
        if (user.role === "patient") {
          try {
            const patient = await Patient.findOne({ userId: user._id })
              .select("avatarUrl")
              .lean();
            avatarUrl = patient?.avatarUrl || null;
          } catch (error) {
            console.error(
              `Error fetching patient avatar for user ${user._id}:`,
              error
            );
          }
        } else if (user.role === "doctor") {
          try {
            const doctor = await Doctor.findOne({ userId: user._id })
              .select("avatarUrl isActive yearsExperience bio")
              .lean();
            avatarUrl = doctor?.avatarUrl || null;
            // For doctors, check if they can be active (even if isActive = true)
            // This ensures old doctors without required fields are marked as suspended
            if (doctor) {
              const canBeActiveCheck = await checkDoctorCanBeActive(doctor._id);
              if (!canBeActiveCheck.canBeActive) {
                user._canBeActive = false; // Flag to indicate doctor cannot be active
                // Also update the doctor's isActive status in database
                if (doctor.isActive) {
                  await Doctor.updateOne(
                    { _id: doctor._id },
                    { isActive: false }
                  );
                }
                // If user status is "active" but doctor cannot be active, set to "suspended"
                if (user.status === "active") {
                  await User.findByIdAndUpdate(user._id, {
                    status: "suspended",
                  });
                  user.status = "suspended";
                }
              } else {
                // Doctor can be active - set flag and ensure status is correct
                user._canBeActive = true;
                // If doctor is verified and can be active, ensure isActive = true
                const fullDoctor = await Doctor.findById(doctor._id);
                if (
                  fullDoctor &&
                  fullDoctor.isVerified &&
                  !fullDoctor.isActive
                ) {
                  await Doctor.updateOne(
                    { _id: doctor._id },
                    { isActive: true }
                  );
                }
                // If user status is "suspended" but doctor can be active, auto-activate
                if (user.status === "suspended") {
                  await User.findByIdAndUpdate(user._id, { status: "active" });
                  user.status = "active";
                  console.log(
                    `✅ Auto-activated User ${user._id} status from 'suspended' to 'active' in getAllUsers (doctor can be active)`
                  );
                }
              }
            }
          } catch (error) {
            console.error(
              `Error fetching doctor avatar for user ${user._id}:`,
              error
            );
          }
        }

        // Determine status - prioritize user.status over _canBeActive check
        let userStatus;
        if (user.status === "banned") {
          userStatus = "banned";
        } else if (user.status === "active") {
          // If user status is active, trust it (it may have been auto-updated)
          userStatus = "active";
        } else if (user.status === "suspended") {
          // If suspended, check if doctor can now be active (might have been updated)
          if (user.role === "doctor" && user._canBeActive === true) {
            // Doctor can be active now, use active status (already updated above)
            userStatus = "active";
          } else {
            userStatus = "suspended";
          }
        } else if (user.role === "doctor" && user._canBeActive === false) {
          // Doctor cannot be active (missing required fields) → show as "suspended" (Tạm khóa)
          userStatus = "suspended";
        } else if (user.status === "blocked") {
          userStatus = "suspended";
        } else {
          userStatus = "inactive";
        }

        return {
          id: user._id,
          name: user.fullName || "Chưa có tên",
          email: user.email,
          role: user.role,
          status: userStatus,
          joinDate: formatDate(user.createdAt),
          lastActive: formatDate(user.updatedAt),
          avatar: avatarUrl,
        };
      })
    );

    console.log(`📊 getAllUsers: Returning ${formattedUsers.length} formatted users`);

    res.json({
      success: true,
      data: formattedUsers,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tải danh sách người dùng",
    });
  }
};

// Ban user - Account vẫn tồn tại nhưng không thể đăng nhập và đăng ký lại với thông tin cũ
export const banUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndUpdate(
      id,
      { status: "banned" },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    // If user is a doctor, also set isActive = false
    if (user.role === "doctor") {
      await Doctor.findOneAndUpdate({ userId: id }, { isActive: false });
    }

    // Create in-app notification for user
    try {
      const { createUserStatusNotification } = await import(
        "../services/notificationService.js"
      );
      const adminUser = await User.findOne({ email: req.user?.email });
      await createUserStatusNotification(id, "banned", {
        adminName: adminUser?.fullName || "Quản trị viên",
        reason: req.body.reason || "",
      });
    } catch (notificationError) {
      console.error("❌ Error creating ban notification:", notificationError);
      // Don't fail the main request if notification fails
    }

    res.json({
      success: true,
      message: "Đã cấm người dùng",
    });
  } catch (error) {
    console.error("Error banning user:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi cấm người dùng",
    });
  }
};

// Suspend user - Có thể đăng nhập nhưng chỉ sửa thông tin cá nhân, không dùng được chức năng khác
export const suspendUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndUpdate(
      id,
      { status: "suspended" },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    // If user is a doctor, also set isActive = false so they don't appear in doctor list
    if (user.role === "doctor") {
      await Doctor.findOneAndUpdate({ userId: id }, { isActive: false });
    }

    // Create in-app notification for user
    try {
      const { createUserStatusNotification } = await import(
        "../services/notificationService.js"
      );
      const adminUser = await User.findOne({ email: req.user?.email });
      await createUserStatusNotification(id, "suspended", {
        adminName: adminUser?.fullName || "Quản trị viên",
        reason: req.body.reason || "",
      });
    } catch (notificationError) {
      console.error("❌ Error creating suspend notification:", notificationError);
      // Don't fail the main request if notification fails
    }

    res.json({
      success: true,
      message: "Đã tạm khóa người dùng",
    });
  } catch (error) {
    console.error("Error suspending user:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tạm khóa người dùng",
    });
  }
};

// Activate user
export const activateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndUpdate(
      id,
      { status: "active" },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    // Create in-app notification for user
    try {
      const { createUserStatusNotification } = await import(
        "../services/notificationService.js"
      );
      const adminUser = await User.findOne({ email: req.user?.email });
      await createUserStatusNotification(id, "activated", {
        adminName: adminUser?.fullName || "Quản trị viên",
      });
    } catch (notificationError) {
      console.error("❌ Error creating activate notification:", notificationError);
      // Don't fail the main request if notification fails
    }

    res.json({
      success: true,
      message: "Đã kích hoạt người dùng",
    });
  } catch (error) {
    console.error("Error activating user:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi kích hoạt người dùng",
    });
  }
};

// Get user details
export const getUserDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    let roleSpecificData = null;

    // Fetch avatar and role-specific data based on user role
    let avatarUrl = null;

    if (user.role === "patient") {
      try {
        const patient = await Patient.findOne({ userId: id })
          .populate("userId", "fullName email phone")
          .select("-__v");
        if (patient) {
          roleSpecificData = patient;
          avatarUrl = patient.avatarUrl || null;
        }
      } catch (error) {
        console.error("Error fetching patient data:", error);
        // Continue without role-specific data
      }
    } else if (user.role === "doctor") {
      try {
        const doctor = await Doctor.findOne({ userId: id })
          .populate("userId", "fullName email phone")
          .populate("specializationIds", "name description avatar")
          .populate("clinicDefaultId", "name address")
          .select("-__v");
        if (doctor) {
          roleSpecificData = doctor;
          avatarUrl = doctor.avatarUrl || null;

          // Check if doctor can actually be active (even if isActive = true)
          // This ensures old doctors without required fields are marked as suspended
          const canBeActiveCheck = await checkDoctorCanBeActive(doctor._id);
          if (!canBeActiveCheck.canBeActive) {
            // Update isActive in database if it's still true
            if (doctor.isActive) {
              await Doctor.updateOne({ _id: doctor._id }, { isActive: false });
              // Update the roleSpecificData to reflect the change
              roleSpecificData.isActive = false;
            }
            // If user status is "active" but doctor cannot be active, set to "suspended"
            if (user.status === "active") {
              await User.findByIdAndUpdate(id, { status: "suspended" });
              user.status = "suspended";
            }
          } else {
            // Doctor can be active - ensure status is correct
            // If doctor is verified and can be active, ensure isActive = true
            if (doctor.isVerified && !doctor.isActive) {
              await Doctor.updateOne({ _id: doctor._id }, { isActive: true });
              roleSpecificData.isActive = true;
            }
            // If user status is "suspended" but doctor can be active, auto-activate
            if (user.status === "suspended") {
              await User.findByIdAndUpdate(id, { status: "active" });
              user.status = "active";
              console.log(
                `✅ Auto-activated User ${id} status from 'suspended' to 'active' in getUserDetails (doctor can be active)`
              );
            }
          }
        }
      } catch (error) {
        console.error("Error fetching doctor data:", error);
        // Continue without role-specific data
      }
    } else if (user.role === "manager") {
      // Manager doesn't have additional profile data
      roleSpecificData = null;
    }

    // Determine final status for response - prioritize user.status
    let finalStatus = user.status;
    if (user.status === "banned") {
      finalStatus = "banned";
    } else if (user.status === "active") {
      // If user status is active, trust it (it may have been auto-updated)
      finalStatus = "active";
    } else if (user.status === "suspended") {
      // If suspended, check if doctor can now be active (might have been updated above)
      if (user.role === "doctor" && roleSpecificData) {
        const canBeActiveCheck = await checkDoctorCanBeActive(
          roleSpecificData._id
        );
        if (canBeActiveCheck.canBeActive && roleSpecificData.isActive) {
          // Doctor can be active now, use active status (already updated above)
          finalStatus = "active";
        } else {
          finalStatus = "suspended";
        }
      } else {
        finalStatus = "suspended";
      }
    } else if (user.role === "doctor" && roleSpecificData) {
      // Check if doctor can be active (for other statuses)
      const canBeActiveCheck = await checkDoctorCanBeActive(
        roleSpecificData._id
      );
      if (!canBeActiveCheck.canBeActive || !roleSpecificData.isActive) {
        finalStatus = "suspended"; // Show as "Tạm khóa" for inactive doctors
      } else {
        finalStatus = "active";
      }
    } else if (user.status === "blocked") {
      finalStatus = "suspended";
    }

    // Combine user data with role-specific data and avatar
    const userDetails = {
      ...user.toObject(),
      status: finalStatus, // Use the determined status
      avatar: avatarUrl,
      roleSpecificData: roleSpecificData,
    };

    res.json({
      success: true,
      data: userDetails,
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tải thông tin người dùng",
    });
  }
};

// Update user
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove password from update data if present
    delete updateData.password;

    // Remove role from update data - role cannot be changed, only displayed
    delete updateData.role;

    // Extract doctor-specific fields
    const {
      specializationIds,
      yearsExperience,
      bio,
      clinicDefaultId,
      status,
      educationLevel,
    } = updateData;

    // Remove doctor-specific fields from user update data
    const userUpdateData = { ...updateData };
    delete userUpdateData.specializationIds;
    delete userUpdateData.yearsExperience;
    delete userUpdateData.bio;
    delete userUpdateData.clinicDefaultId;
    delete userUpdateData.educationLevel;

    // Handle status field: "suspended" is only for display (doctor isActive = false)
    // User model only accepts: "active", "blocked", "pending", "rejected"
    if (status === "suspended") {
      // For doctors, "suspended" means isActive = false in Doctor model
      // User status should remain "active" but Doctor.isActive controls visibility
      // So we don't update User.status if it's "suspended"
      delete userUpdateData.status;
    } else if (
      status &&
      !["active", "blocked", "pending", "rejected"].includes(status)
    ) {
      // Invalid status value, remove it
      delete userUpdateData.status;
    }

    const user = await User.findByIdAndUpdate(id, userUpdateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    // If user is a doctor, update doctor profile
    if (user.role === "doctor") {
      const doctorUpdateData = {};

      if (specializationIds !== undefined) {
        // Handle both array and single value, filter out invalid values
        if (Array.isArray(specializationIds)) {
          doctorUpdateData.specializationIds = specializationIds.filter(
            (id) => id != null && id !== ""
          );
        } else if (specializationIds != null && specializationIds !== "") {
          doctorUpdateData.specializationIds = [specializationIds];
        } else {
          doctorUpdateData.specializationIds = [];
        }
      }
      if (yearsExperience !== undefined && yearsExperience !== null) {
        const parsed = parseInt(yearsExperience);
        doctorUpdateData.yearsExperience = isNaN(parsed) ? 0 : parsed;
      }
      if (bio !== undefined) {
        doctorUpdateData.bio = bio || "";
      }
      if (clinicDefaultId !== undefined) {
        doctorUpdateData.clinicDefaultId =
          clinicDefaultId && clinicDefaultId !== "" ? clinicDefaultId : null;
      }
      if (educationLevel !== undefined) {
        doctorUpdateData.educationLevel = educationLevel || null;
      }

      if (Object.keys(doctorUpdateData).length > 0) {
        try {
          const doctor = await Doctor.findOneAndUpdate(
            { userId: id },
            doctorUpdateData,
            { new: true, runValidators: true }
          );

          if (!doctor) {
            console.warn(
              `Doctor profile not found for user ${id}, but user update succeeded`
            );
          } else {
            // Education level is now used directly from EducationLevelPrice, no sync needed

            // If doctor is verified but not active, check if they can now be active
            // (doctor might have just filled in required fields: yearsExperience, bio, educationLevel)
            if (doctor.isVerified && !doctor.isActive) {
              try {
                const activeCheck = await checkDoctorCanBeActive(doctor._id);
                if (activeCheck.canBeActive) {
                  doctor.isActive = true;
                  await doctor.save();

                  // Auto-activate user status from "suspended" to "active" when doctor fills in all required info
                  if (user.status === "suspended") {
                    await User.findByIdAndUpdate(id, { status: "active" });
                    console.log(
                      `✅ Auto-activated User ${id} status from 'suspended' to 'active' (doctor filled in all required info)`
                    );
                  }
                }
              } catch (activeCheckError) {
                console.error(
                  "Error checking if doctor can be active:",
                  activeCheckError
                );
                // Don't fail the update if active check fails, just log it
              }
            }
          }
        } catch (doctorUpdateError) {
          console.error("Error updating doctor profile:", doctorUpdateError);
          console.error("Doctor update error details:", {
            message: doctorUpdateError.message,
            name: doctorUpdateError.name,
            code: doctorUpdateError.code,
            errors: doctorUpdateError.errors,
          });
          // If doctor update fails, still allow user update to succeed
          // But log the error for debugging
          throw new Error(
            `Không thể cập nhật thông tin bác sĩ: ${doctorUpdateError.message}`
          );
        }
      }
    }

    res.json({
      success: true,
      message: "Cập nhật thông tin người dùng thành công",
      data: user,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    console.error("Error stack:", error.stack);
    console.error("Error details:", {
      message: error.message,
      name: error.name,
      code: error.code,
    });
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật thông tin người dùng",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Change user password
export const changeUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu không được để trống",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    // Hash the new password
    const bcrypt = await import("bcryptjs");
    const hashedPassword = await bcrypt.default.hash(password, 10);

    user.passwordHash = hashedPassword;
    await user.save();

    // Create in-app notification for user
    try {
      const { createUserStatusNotification } = await import(
        "../services/notificationService.js"
      );
      const adminUser = await User.findOne({ email: req.user?.email });
      await createUserStatusNotification(id, "password_changed", {
        adminName: adminUser?.fullName || "Quản trị viên",
      });
    } catch (notificationError) {
      console.error("❌ Error creating password change notification:", notificationError);
      // Don't fail the main request if notification fails
    }

    res.json({
      success: true,
      message: "Đổi mật khẩu thành công",
    });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi đổi mật khẩu",
    });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Find user first to check role before deleting
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    // Cascade delete based on role
    if (user.role === "doctor") {
      // Find doctor record
      const doctor = await Doctor.findOne({ userId: id });

      if (doctor) {
        const doctorId = doctor._id;

        // Step 1: Get all appointments for this doctor first
        const appointments = await Appointment.find({ doctorId });
        const appointmentIds = appointments.map((a) => a._id);

        // Step 2: Delete records linked to appointments
        if (appointmentIds.length > 0) {
          await Promise.all([
            Prescription.deleteMany({ appointmentId: { $in: appointmentIds } }),
            ConsultationAdvice.deleteMany({
              appointmentId: { $in: appointmentIds },
            }),
            ConsultationSummary.deleteMany({
              appointmentId: { $in: appointmentIds },
            }),
            VideoCall.deleteMany({ appointmentId: { $in: appointmentIds } }),
          ]);
        }

        // Step 3: Delete doctor-specific records and appointments
        await Promise.all([
          // Delete doctor-specific records (DoctorRate no longer exists - using EducationLevelPrice)
          DoctorScheduleRule.deleteMany({ doctorId }),
          DoctorTimeSlot.deleteMany({ doctorId }),

          // Delete reviews
          Review.deleteMany({ doctorId }),

          // Delete all appointments
          Appointment.deleteMany({ doctorId }),

          // Finally, delete doctor record
          Doctor.findByIdAndDelete(doctorId),
        ]);
      }
    } else if (user.role === "patient") {
      // Find patient record
      const patient = await Patient.findOne({ userId: id });

      if (patient) {
        const patientId = patient._id;

        // Step 1: Get all appointments for this patient first
        const appointments = await Appointment.find({ patientId });
        const appointmentIds = appointments.map((a) => a._id);

        // Step 2: Delete records linked to appointments
        if (appointmentIds.length > 0) {
          await Promise.all([
            Prescription.deleteMany({ appointmentId: { $in: appointmentIds } }),
            ConsultationAdvice.deleteMany({
              appointmentId: { $in: appointmentIds },
            }),
            ConsultationSummary.deleteMany({
              appointmentId: { $in: appointmentIds },
            }),
            VideoCall.deleteMany({ appointmentId: { $in: appointmentIds } }),
            Payment.deleteMany({ appointmentId: { $in: appointmentIds } }),
            RescheduleRequest.deleteMany({
              originalAppointmentId: { $in: appointmentIds },
            }),
          ]);
        }

        // Step 3: Delete patient-specific records
        await Promise.all([
          // Delete patient-specific records
          PatientFavorite.deleteMany({ patientId }),
          Review.deleteMany({ patientId }),

          // Delete all appointments
          Appointment.deleteMany({ patientId }),

          // Delete notifications for this user
          Notification.deleteMany({ userId: id }),

          // Finally, delete patient record
          Patient.findByIdAndDelete(patientId),
        ]);
      } else {
        // If no patient record found, just delete notifications
        await Notification.deleteMany({ userId: id });
      }
    }

    // Finally, delete user
    await User.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Đã xóa người dùng và tất cả dữ liệu liên quan",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi xóa người dùng",
    });
  }
};

// Create user (for admin/manager)
export const createUser = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      password,
      role,
      status = "active",
    } = req.body;

    // Validate required fields
    if (!fullName || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng điền đầy đủ thông tin bắt buộc",
      });
    }

    // Validate role
    const allowedRoles = ["patient", "doctor", "admin", "manager"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Vai trò không hợp lệ",
      });
    }

    // Check if email already exists
    const existingUserByEmail = await User.findOne({
      email: email.toLowerCase().trim(),
    }).lean();

    if (existingUserByEmail) {
      return res.status(409).json({
        success: false,
        message: "Email này đã được sử dụng",
      });
    }

    // Check if phone already exists (if provided)
    if (phone) {
      const existingUserByPhone = await User.findOne({
        phone: phone.trim(),
      }).lean();

      if (existingUserByPhone) {
        return res.status(409).json({
          success: false,
          message: "Số điện thoại này đã được sử dụng",
        });
      }
    }

    // Hash password
    const bcrypt = await import("bcryptjs");
    const hashedPassword = await bcrypt.default.hash(password, 10);

    // Create user
    const userDoc = await User.create({
      email: email.toLowerCase().trim(),
      passwordHash: hashedPassword,
      role: role,
      status: status,
      fullName: fullName.trim(),
      phone: phone ? phone.trim() : undefined,
      authProvider: "local",
      emailVerified: true,
    });

    // Create role-specific profile if needed
    if (role === "patient") {
      await Patient.create({
        userId: userDoc._id,
        fullName: fullName.trim(),
        phone: phone ? phone.trim() : undefined,
        isProfileComplete: false,
      });
    } else if (role === "doctor") {
      await Doctor.create({
        userId: userDoc._id,
        fullName: fullName.trim(),
        isActive: true,
        isVerified: false, // Needs verification
      });
    }
    // For manager and admin, no additional profile needed

    // Create in-app notification for user
    try {
      const { createUserStatusNotification } = await import(
        "../services/notificationService.js"
      );
      const adminUser = await User.findOne({ email: req.user?.email });
      await createUserStatusNotification(userDoc._id, "created", {
        adminName: adminUser?.fullName || "Quản trị viên",
      });
    } catch (notificationError) {
      console.error("❌ Error creating user creation notification:", notificationError);
      // Don't fail the main request if notification fails
    }

    res.json({
      success: true,
      message: "Tạo người dùng thành công",
      data: {
        id: userDoc._id,
        fullName: userDoc.fullName,
        email: userDoc.email,
        role: userDoc.role,
        status: userDoc.status,
      },
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tạo người dùng: " + (error.message || "Unknown error"),
    });
  }
};

// ================== SPECIALIZATIONS CONTROLLERS ==================

// Get all specializations
export const getAllSpecializations = async (req, res) => {
  try {
    const specializations = await Specialization.find()
      .select("name description avatar createdAt")
      .sort({ name: 1 });

    // Get doctor count for each specialization
    const specializationsWithCount = await Promise.all(
      specializations.map(async (spec) => {
        // Don't filter by isActive since all doctors have isActive: false in the database
        const doctorsWithSpec = await Doctor.find({
          specializationIds: { $in: [spec._id.toString()] },
        }).select("fullName specializationIds");

        const doctorCount = doctorsWithSpec.length;

        return {
          id: spec._id,
          name: spec.name,
          description: spec.description,
          doctorCount,
          color: getColorForSpecialization(spec.name),
          avatar: spec.avatar || null,
        };
      })
    );

    res.json({
      success: true,
      data: specializationsWithCount,
    });
  } catch (error) {
    console.error("Error fetching specializations:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tải danh sách chuyên khoa",
    });
  }
};

// Add specialization
export const addSpecialization = async (req, res) => {
  try {
    const { name, description, avatar } = req.body;

    // Check if specialization already exists
    const existingSpec = await Specialization.findOne({ name });
    if (existingSpec) {
      return res.status(400).json({
        success: false,
        message: "Chuyên khoa đã tồn tại",
      });
    }

    const specialization = new Specialization({
      name,
      description: description || `Chuyên khoa ${name}`,
      avatar: avatar || null,
    });

    await specialization.save();

    res.json({
      success: true,
      message: "Đã thêm chuyên khoa thành công",
      data: {
        id: specialization._id,
        name: specialization.name,
        description: specialization.description,
        color: getColorForSpecialization(name),
        doctorCount: 0,
        avatar: specialization.avatar,
      },
    });
  } catch (error) {
    console.error("Error adding specialization:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi thêm chuyên khoa",
    });
  }
};

// Update specialization
export const updateSpecialization = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, avatar } = req.body;

    const specialization = await Specialization.findByIdAndUpdate(
      id,
      {
        name,
        description: description || `Chuyên khoa ${name}`,
        avatar: avatar || null,
      },
      { new: true }
    );

    if (!specialization) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy chuyên khoa",
      });
    }

    res.json({
      success: true,
      message: "Đã cập nhật chuyên khoa thành công",
      data: {
        id: specialization._id,
        name: specialization.name,
        description: specialization.description,
        color: getColorForSpecialization(name),
        avatar: specialization.avatar,
      },
    });
  } catch (error) {
    console.error("Error updating specialization:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật chuyên khoa",
    });
  }
};

// Get doctors by specialization
export const getDoctorsBySpecialization = async (req, res) => {
  try {
    const { id } = req.params;

    // Don't filter by isActive since all doctors have isActive: false in the database
    const doctors = await Doctor.find({
      specializationIds: { $in: [id] },
    })
      .populate("userId", "fullName email")
      .select(
        "userId fullName licenseNo bio avatarUrl yearsExperience ratingAvg"
      )
      .sort({ fullName: 1 });

    const formattedDoctors = doctors.map((doctor) => ({
      id: doctor._id,
      fullName: doctor.fullName || doctor.userId?.fullName || "Chưa có tên",
      email: doctor.userId?.email || "Chưa có email",
      licenseNo: doctor.licenseNo || null,
      bio: doctor.bio || null,
      avatarUrl: doctor.avatarUrl || null,
      yearsExperience: doctor.yearsExperience || 0,
      ratingAvg: doctor.ratingAvg || 0,
    }));

    res.json({
      success: true,
      data: formattedDoctors,
    });
  } catch (error) {
    console.error("Error fetching doctors by specialization:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tải danh sách bác sĩ",
    });
  }
};

// Delete specialization
export const deleteSpecialization = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if any doctors are using this specialization
    const doctors = await Doctor.find({ specializationIds: id });
    const doctorCount = doctors.length;

    // If there are doctors using this specialization, remove it from their specializationIds
    if (doctorCount > 0) {
      // Remove this specialization from all doctors' specializationIds array
      await Doctor.updateMany(
        { specializationIds: id },
        { $pull: { specializationIds: id } }
      );
    }

    // Delete the specialization
    const specialization = await Specialization.findByIdAndDelete(id);

    if (!specialization) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy chuyên khoa",
      });
    }

    // Return success message with info about doctors affected
    const message =
      doctorCount > 0
        ? `Đã xóa chuyên khoa thành công. Đã tự động xóa chuyên khoa này khỏi ${doctorCount} bác sĩ.`
        : "Đã xóa chuyên khoa thành công";

    res.json({
      success: true,
      message,
      doctorsAffected: doctorCount,
    });
  } catch (error) {
    console.error("Error deleting specialization:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi xóa chuyên khoa",
    });
  }
};

// ================== APPOINTMENTS CONTROLLERS ==================

// Get all appointments
export const getAllAppointments = async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;

    // Build query
    let query = {};

    if (status && status !== "all") {
      query.status = status;
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // End of day

      query.scheduledStart = {
        $gte: start,
        $lte: end,
      };
    }

    const appointments = await Appointment.find(query)
      .populate({
        path: "patientId",
        select: "fullName phone address userId",
        populate: {
          path: "userId",
          select: "fullName email",
        },
      })
      .populate({
        path: "doctorId",
        select:
          "fullName licenseNo yearsExperience ratingAvg bio userId specializationIds",
        populate: [
          {
            path: "userId",
            select: "fullName email",
          },
          {
            path: "specializationIds",
            select: "name",
          },
        ],
      })
      .populate("clinicId", "name")
      .select(
        "patientId doctorId clinicId scheduledStart scheduledEnd status mode reason createdAt cancelledAt cancelledBy cancelReason services totalPay amountPaid paymentStatus"
      )
      .sort({ scheduledStart: -1 });

    // Ensure new fields have default values for backward compatibility
    // Also ensure patientId is properly populated
    const appointmentsWithDefaults = appointments.map((apt) => {
      const aptObj = apt.toObject();

      // Ensure patientId is properly populated
      let patientId = aptObj.patientId;
      if (
        !patientId ||
        (typeof patientId === "object" && !patientId.fullName)
      ) {
        console.warn(
          `⚠️ Appointment ${aptObj._id} has invalid patientId:`,
          patientId
        );
        patientId = {
          _id: aptObj.patientId?._id || aptObj.patientId || null,
          fullName: aptObj.patientId?.fullName || "Không có thông tin",
          phone: aptObj.patientId?.phone || null,
          address: aptObj.patientId?.address || null,
          userId: aptObj.patientId?.userId || null,
        };
      }

      return {
        ...aptObj,
        patientId, // Use properly populated patientId
        services: aptObj.services || [],
        totalPay:
          aptObj.totalPay !== undefined && aptObj.totalPay !== null
            ? aptObj.totalPay
            : 0,
        amountPaid:
          aptObj.amountPaid !== undefined && aptObj.amountPaid !== null
            ? aptObj.amountPaid
            : 0,
        paymentStatus: aptObj.paymentStatus || "unpaid",
      };
    });

    const formattedAppointments = appointmentsWithDefaults.map(
      (appointment, index) => {
        const patient = appointment.patientId;
        const doctor = appointment.doctorId;
        const specializations = appointment.doctorId?.specializationIds;
        const clinic = appointment.clinicId;

        return {
          id: appointment._id,
          sequentialId: index + 1, // ID bắt đầu từ 1

          // Thông tin bệnh nhân
          patientName: patient?.fullName || "Chưa có tên",
          patientEmail: patient?.userId?.email || "Chưa có email",
          patientPhone: patient?.phone || null,
          patientAddress: patient?.address || null,

          // Thông tin bác sĩ
          doctorName:
            doctor?.fullName || doctor?.userId?.fullName || "Chưa có tên",
          doctorEmail: doctor?.userId?.email || "Chưa có email",
          doctorSpecialty:
            specializations?.map((s) => s.name).join(", ") ||
            "Chưa chọn chuyên khoa",
          doctorLicense: doctor?.licenseNo || null,
          doctorBio: doctor?.bio || null,

          // Thông tin phòng khám
          clinicName: clinic?.name || null,

          // Thông tin lịch hẹn
          appointmentDate: formatDate(appointment.scheduledStart),
          appointmentTime: formatTime(appointment.scheduledStart),
          scheduledStart: appointment.scheduledStart,
          scheduledEnd: appointment.scheduledEnd,
          status: appointment.status,
          mode: appointment.mode,
          reason: appointment.reason || "Không có lý do",

          // Overtime Calculation (Operational Workflow Support)
          overtimeMinutes: (() => {
            if (appointment.status === 'in_progress') {
              const now = new Date();
              const end = new Date(appointment.scheduledEnd);
              if (now > end) {
                return Math.floor((now - end) / (1000 * 60));
              }
            }
            return 0;
          })(),
          isOvertime: (() => {
            if (appointment.status === 'in_progress') {
              const now = new Date();
              const end = new Date(appointment.scheduledEnd);
              return now > end;
            }
            return false;
          })(),

          // Thông tin thanh toán mới
          services: appointment.services || [],
          totalPay: appointment.totalPay || 0,
          amountPaid: appointment.amountPaid || 0,
          paymentStatus: appointment.paymentStatus || "unpaid",

          // Thông tin hủy lịch
          cancelledAt: appointment.cancelledAt,
          cancelledBy: appointment.cancelledBy,
          cancelReason: appointment.cancelReason,

          // Thông tin hệ thống
          createdAt: appointment.createdAt,
          updatedAt: appointment.updatedAt,
        };
      }
    );

    res.json({
      success: true,
      data: formattedAppointments,
    });
  } catch (error) {
    console.error("Error fetching appointments:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tải danh sách lịch hẹn",
    });
  }
};


// Update appointment status
export const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const appointment = await Appointment.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lịch hẹn",
      });
    }

    res.json({
      success: true,
      message: "Đã cập nhật trạng thái lịch hẹn",
    });
  } catch (error) {
    console.error("Error updating appointment status:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật trạng thái lịch hẹn",
    });
  }
};

// Delete appointment
export const deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await Appointment.findByIdAndDelete(id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lịch hẹn",
      });
    }

    res.json({
      success: true,
      message: "Đã xóa lịch hẹn",
    });
  } catch (error) {
    console.error("Error deleting appointment:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi xóa lịch hẹn",
    });
  }
};

// ================== CLEANUP CONTROLLER ==================

/**
 * Chạy cleanup appointments chưa thanh toán ngay lập tức
 * GET /api/admin/cleanup/unpaid-appointments
 */
export const cleanupUnpaidAppointments = async (req, res) => {
  try {
    const result = await runCleanupNow();

    res.json({
      success: true,
      data: result,
      message: `Đã hủy ${result.cancelled} lịch hẹn và giải phóng ${result.slotsReleased} slot`,
    });
  } catch (error) {
    console.error("Error running cleanup:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi chạy cleanup: " + error.message,
    });
  }
};

// ================== PAYMENT REVENUE CONTROLLER ==================

/**
 * Hàm helper: Tính toán khoảng thời gian (startDate, endDate) dựa trên period được chọn
 * Thuật toán: Sử dụng switch-case để xử lý các period khác nhau (today, week, month, year, custom, ...)
 * @param {string} period - Chu kỳ thời gian (today, thisWeek, thisMonth, thisYear, custom, ...)
 * @param {Object} req - Request object (dùng khi period = 'custom' để lấy startDate/endDate từ query)
 * @returns {{startDate: Date, endDate: Date}} - Object chứa ngày bắt đầu và kết thúc
 */
function getDateRange(period, req = null) {
  const now = new Date();
  // Tạo ngày hôm nay với thời gian 00:00:00
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let startDate, endDate;

  // Xử lý các trường hợp period khác nhau
  switch (period) {
    case "today":
      startDate = new Date(today);
      endDate = new Date(now);
      break;
    case "thisWeek":
      startDate = new Date(today);
      startDate.setDate(today.getDate() - today.getDay());
      endDate = new Date(now);
      break;
    case "thisMonth":
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date(now);
      break;
    case "threeMonths":
      startDate = new Date(today);
      startDate.setMonth(today.getMonth() - 3);
      endDate = new Date(now);
      break;
    case "thisYear":
      startDate = new Date(today.getFullYear(), 0, 1);
      endDate = new Date(now);
      break;
    case "24hours":
      startDate = new Date(now);
      startDate.setHours(startDate.getHours() - 24);
      endDate = new Date(now);
      break;
    case "7days":
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 7);
      endDate = new Date(now);
      break;
    case "30days":
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 30);
      endDate = new Date(now);
      break;
    case "1year":
      startDate = new Date(today);
      startDate.setFullYear(startDate.getFullYear() - 1);
      endDate = new Date(now);
      break;
    case "all":
      startDate = new Date(0); // Beginning of time
      endDate = new Date(now);
      break;
    case "custom":
      // Custom date range will be passed via query params
      if (req && req.query.startDate && req.query.endDate) {
        startDate = new Date(req.query.startDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(req.query.endDate);
        endDate.setHours(23, 59, 59, 999);
      } else {
        startDate = new Date(today);
        endDate = new Date(now);
      }
      break;
    default:
      startDate = new Date(today);
      endDate = new Date(now);
  }

  return { startDate, endDate };
}

/**
 * Lấy thống kê doanh thu từ thanh toán
 * Thuật toán: 
 * 1. Tính toán khoảng thời gian dựa trên period
 * 2. Lấy tất cả payments trong khoảng thời gian đó (status = captured hoặc authorized)
 * 3. Tính toán doanh thu = tổng (total - refundAmount)
 * 4. So sánh với kỳ trước để tính phần trăm thay đổi
 * 5. Phân tích doanh thu theo kênh thanh toán và xu hướng theo thời gian
 * 
 * GET /api/admin/payment/revenue-stats?period=yesterday
 */
export const getPaymentRevenueStats = async (req, res) => {
  try {
    const {
      period = "today",
      startDate: startDateParam,
      endDate: endDateParam,
    } = req.query;
    let startDate, endDate;

    // Xử lý period custom: lấy startDate và endDate từ query params
    if (period === "custom" && startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      startDate.setHours(0, 0, 0, 0); // Bắt đầu từ 00:00:00
      endDate = new Date(endDateParam);
      endDate.setHours(23, 59, 59, 999); // Kết thúc lúc 23:59:59
    } else {
      // Sử dụng hàm helper để tính toán khoảng thời gian
      const range = getDateRange(period, req);
      startDate = range.startDate;
      endDate = range.endDate;
    }

    // Lấy tất cả payments trong kỳ hiện tại (chỉ lấy payments đã thanh toán thành công)
    const currentPayments = await Payment.find({
      status: { $in: ["captured", "authorized"] }, // Chỉ lấy payments đã thanh toán thành công
      createdAt: { $gte: startDate, $lte: endDate }, // Lọc theo thời gian tạo payment
    }).populate("appointmentId"); // Populate để lấy thông tin appointment liên quan

    // Tính toán kỳ trước để so sánh
    // Thuật toán: Lấy khoảng thời gian hiện tại, trừ đi chính khoảng đó để được kỳ trước
    const previousPeriodStart = new Date(startDate);
    const previousPeriodEnd = new Date(endDate);
    const periodDiff = endDate - startDate; // Độ dài kỳ hiện tại (milliseconds)

    // Trừ đi khoảng thời gian để được kỳ trước
    previousPeriodStart.setTime(previousPeriodStart.getTime() - periodDiff - 1);
    previousPeriodEnd.setTime(previousPeriodEnd.getTime() - periodDiff - 1);

    const previousPayments = await Payment.find({
      status: { $in: ["captured", "authorized"] },
      createdAt: { $gte: previousPeriodStart, $lte: previousPeriodEnd },
    });

    // Tính tổng doanh thu kỳ hiện tại
    // Thuật toán: Duyệt qua tất cả payments, cộng dồn (total - refundAmount)
    // refundAmount là số tiền đã hoàn lại, nên phải trừ đi để có doanh thu thực tế
    const totalRevenue = currentPayments.reduce((sum, payment) => {
      return sum + (payment.total - (payment.refundAmount || 0));
    }, 0);

    // Tính tổng doanh thu kỳ trước (để so sánh)
    const previousRevenue = previousPayments.reduce((sum, payment) => {
      return sum + (payment.total - (payment.refundAmount || 0));
    }, 0);

    // Tính phần trăm thay đổi doanh thu
    // Thuật toán: ((doanh thu hiện tại - doanh thu trước) / doanh thu trước) * 100
    // Nếu kỳ trước = 0 và kỳ hiện tại > 0 → tăng 100%
    // Nếu cả hai = 0 → không thay đổi (0%)
    const revenueChange =
      previousRevenue > 0
        ? Math.round(((totalRevenue - previousRevenue) / previousRevenue) * 100)
        : totalRevenue > 0
          ? 100
          : 0;

    // Count completed orders (payments)
    const totalCompletedOrders = currentPayments.length;
    const previousCompletedOrders = previousPayments.length;

    const ordersChange =
      previousCompletedOrders > 0
        ? Math.round(
          ((totalCompletedOrders - previousCompletedOrders) /
            previousCompletedOrders) *
          100
        )
        : totalCompletedOrders > 0
          ? 100
          : 0;

    // Phân tích doanh thu theo kênh thanh toán
    // Thuật toán: Duyệt qua tất cả payments, nhóm theo gateway (kênh thanh toán)
    // Mỗi kênh sẽ có tổng doanh thu riêng
    const revenueByChannel = {};
    currentPayments.forEach((payment) => {
      const channelName = payment.gateway || "MedConnect"; // Nếu không có gateway, mặc định là "MedConnect"
      if (!revenueByChannel[channelName]) {
        revenueByChannel[channelName] = 0; // Khởi tạo nếu chưa có
      }
      // Cộng dồn doanh thu cho kênh này
      revenueByChannel[channelName] +=
        payment.total - (payment.refundAmount || 0);
    });

    const revenueByChannelArray = Object.entries(revenueByChannel).map(
      ([name, amount]) => ({
        name,
        amount,
      })
    );

    // Order status statistics
    const allPayments = await Payment.find({
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const paidCount = allPayments.filter((p) =>
      ["captured", "authorized"].includes(p.status)
    ).length;
    const cancelledCount = allPayments.filter((p) =>
      ["cancelled", "voided", "failed"].includes(p.status)
    ).length;

    // Xu hướng doanh thu theo thời gian
    // Thuật toán: 
    // - Nếu period = today/yesterday/24hours → chia theo giờ (24 điểm dữ liệu)
    // - Nếu period = threeMonths → chia theo tháng
    // - Các trường hợp khác → chia theo ngày
    let revenueTrend = [];
    if (period === "today" || period === "yesterday" || period === "24hours") {
      // Xu hướng theo giờ: duyệt qua 24 giờ trong ngày
      for (let hour = 0; hour < 24; hour++) {
        const hourStart = new Date(startDate);
        hourStart.setHours(hour, 0, 0, 0);
        const hourEnd = new Date(startDate);
        hourEnd.setHours(hour, 59, 59, 999);

        const hourPayments = currentPayments.filter((p) => {
          const paymentDate = new Date(p.createdAt);
          return paymentDate >= hourStart && paymentDate <= hourEnd;
        });

        const hourRevenue = hourPayments.reduce(
          (sum, p) => sum + (p.total - (p.refundAmount || 0)),
          0
        );
        const hourTransactionCount = hourPayments.length;

        const dateStr = `${(startDate.getMonth() + 1)
          .toString()
          .padStart(2, "0")}-${startDate
            .getDate()
            .toString()
            .padStart(2, "0")}`;
        revenueTrend.push({
          label: `Th${dateStr} ${hour.toString().padStart(2, "0")}`,
          amount: hourRevenue,
          transactionCount: hourTransactionCount,
        });
      }
    } else if (period === "threeMonths") {
      // Monthly trend for 3-month period
      const monthlyRevenue = {};
      currentPayments.forEach((payment) => {
        const paymentDate = new Date(payment.createdAt);
        const monthKey = `${paymentDate.getFullYear()}-${(
          paymentDate.getMonth() + 1
        )
          .toString()
          .padStart(2, "0")}`;

        if (!monthlyRevenue[monthKey]) {
          monthlyRevenue[monthKey] = {
            amount: 0,
            transactionCount: 0,
          };
        }

        monthlyRevenue[monthKey].amount +=
          payment.total - (payment.refundAmount || 0);
        monthlyRevenue[monthKey].transactionCount += 1;
      });

      // Generate all months in the range, even if no revenue
      const currentMonth = new Date(startDate);
      while (currentMonth <= endDate) {
        const monthKey = `${currentMonth.getFullYear()}-${(
          currentMonth.getMonth() + 1
        )
          .toString()
          .padStart(2, "0")}`;
        const monthData = monthlyRevenue[monthKey] || {
          amount: 0,
          transactionCount: 0,
        };

        revenueTrend.push({
          label: `Th${currentMonth.getMonth() + 1}`,
          amount: monthData.amount,
          transactionCount: monthData.transactionCount,
        });

        // Move to next month
        currentMonth.setMonth(currentMonth.getMonth() + 1);
      }
    } else {
      // Daily trend for weekly/monthly periods
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dayStart = new Date(currentDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(currentDate);
        dayEnd.setHours(23, 59, 59, 999);

        const dayPayments = currentPayments.filter((p) => {
          const paymentDate = new Date(p.createdAt);
          return paymentDate >= dayStart && paymentDate <= dayEnd;
        });

        const dayRevenue = dayPayments.reduce(
          (sum, p) => sum + (p.total - (p.refundAmount || 0)),
          0
        );
        const dayTransactionCount = dayPayments.length;

        const dateStr = `${(dayStart.getMonth() + 1)
          .toString()
          .padStart(2, "0")}-${dayStart.getDate().toString().padStart(2, "0")}`;
        // Format: Th10-30 (without day of week here, will be added in frontend)
        revenueTrend.push({
          label: `Th${dateStr}`,
          amount: dayRevenue,
          transactionCount: dayTransactionCount,
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    res.json({
      success: true,
      data: {
        totalRevenue,
        totalCompletedOrders,
        revenueChange,
        ordersChange,
        revenueByChannel: revenueByChannelArray,
        orderStatus: {
          paid: paidCount,
          cancelled: cancelledCount,
          total: allPayments.length,
        },
        revenueTrend,
        totalTransactions: currentPayments.length,
      },
    });
  } catch (error) {
    console.error("Error fetching payment revenue stats:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tải thống kê doanh thu",
    });
  }
};

/**
 * Get invoices/payments list
 * GET /api/admin/payment/invoices?period=yesterday
 */
export const getAdminInvoices = async (req, res) => {
  try {
    const {
      period = "today",
      startDate: startDateParam,
      endDate: endDateParam,
    } = req.query;
    let startDate, endDate;

    if (period === "custom" && startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(endDateParam);
      endDate.setHours(23, 59, 59, 999);
    } else {
      const range = getDateRange(period, req);
      startDate = range.startDate;
      endDate = range.endDate;
    }

    // Get payments for the selected period, sorted by latest first
    const payments = await Payment.find({
      createdAt: { $gte: startDate, $lte: endDate },
    })
      .populate("appointmentId", "scheduledStart status")
      .populate("billTo.patientId", "fullName")
      .populate("billFrom.doctorId", "fullName")
      .sort({ createdAt: -1 })
      .limit(100); // Limit to latest 100 invoices

    const formattedInvoices = payments.map((payment) => ({
      _id: payment._id,
      invoiceNumber: payment.invoiceNumber,
      orderCode: payment.orderCode,
      appointmentId: payment.appointmentId?._id,
      patientName: payment.billTo?.name,
      doctorName: payment.billFrom?.doctorName,
      gateway: payment.gateway,
      method: payment.method,
      status: payment.status,
      subtotal: payment.subtotal,
      discount: payment.discount || 0,
      total: payment.total,
      refundAmount: payment.refundAmount || 0,
      paidAt: payment.paidAt || payment.capturedAt || payment.createdAt,
      createdAt: payment.createdAt,
      currency: payment.currency || "VND",
    }));

    res.json({
      success: true,
      data: formattedInvoices,
    });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tải danh sách hóa đơn",
    });
  }
};

/**
 * Lấy thống kê tổng hợp cho trang thống kê
 * 
 * Thuật toán tổng quát:
 * 1. Xử lý period và tính toán khoảng thời gian (startDate, endDate)
 * 2. Tính toán các chỉ số chính:
 *    - Tổng số bác sĩ (so với tháng trước)
 *    - Tổng số bệnh nhân (so với tuần trước)
 *    - Tổng số lịch hẹn (so với kỳ trước)
 *    - Tổng doanh thu (so với kỳ trước)
 * 3. Tính toán top 3:
 *    - Top 3 bác sĩ khám online nhiều nhất
 *    - Top 3 bác sĩ khám offline nhiều nhất
 *    - Top 3 bệnh nhân đến khám nhiều nhất (kèm tổng chi tiêu)
 * 4. Tính tỷ lệ loại khám (online vs offline)
 * 5. Tính xu hướng doanh thu theo thời gian
 * 
 * GET /api/admin/statistics?period=today&startDate=...&endDate=...
 */
export const getStatistics = async (req, res) => {
  try {
    let { period = 'today', startDate: startDateParam, endDate: endDateParam } = req.query;

    // Ánh xạ các key period từ frontend sang backend
    // Frontend gửi 'week', 'month', 'year' → Backend cần 'thisWeek', 'thisMonth', 'thisYear'
    const periodMap = {
      'week': 'thisWeek',
      'month': 'thisMonth',
      'year': 'thisYear',
      'today': 'today'
    };
    const originalPeriod = period; // Lưu period gốc để dùng cho logic so sánh
    period = periodMap[period] || period; // Chuyển đổi sang key backend

    const today = new Date();
    let startDate, endDate;

    // Xử lý period custom: lấy startDate và endDate từ query params
    if (originalPeriod === 'custom' && startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      startDate.setHours(0, 0, 0, 0); // Bắt đầu từ 00:00:00
      endDate = new Date(endDateParam);
      endDate.setHours(23, 59, 59, 999); // Kết thúc lúc 23:59:59
    } else {
      // Sử dụng hàm helper để tính toán khoảng thời gian
      const range = getDateRange(period, req);
      startDate = range.startDate;
      endDate = range.endDate;

      // Đảm bảo dates được set đúng cho từng period để lấy đầy đủ dữ liệu
      // Đặc biệt quan trọng: endDate phải là cuối ngày (23:59:59) để bao gồm cả ngày hôm nay
      if (period === 'thisYear' || originalPeriod === 'year') {
        // Start from beginning of year
        startDate = new Date(today.getFullYear(), 0, 1, 0, 0, 0, 0);
        // End at end of today
        endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
      } else if (period === 'today' || originalPeriod === 'today') {
        // For today, end at end of today
        endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
        startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
      } else if (period === 'thisWeek' || originalPeriod === 'week') {
        // For week: tính từ đầu tuần (Chủ nhật) đến cuối tuần (Thứ 7)
        // Tuần bắt đầu từ Chủ nhật (getDay() = 0) đến Thứ 7 (getDay() = 6)
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay()); // Về Chủ nhật đầu tuần
        startDate = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate(), 0, 0, 0, 0);

        // Kết thúc ở cuối Thứ 7 của tuần này (6 ngày sau Chủ nhật)
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        endDate = new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate(), 23, 59, 59, 999);
      } else if (period === 'thisMonth' || originalPeriod === 'month') {
        // For month: tính từ đầu tháng đến cuối tháng
        startDate = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0);
        // Kết thúc ở ngày cuối cùng của tháng hiện tại
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
        endDate = monthEnd;
      }
    }

    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // ========== 1. TỔNG BÁC SĨ - So với tháng trước ==========
    // Đếm tổng số bác sĩ đã được xác minh (isVerified = true)
    const totalDoctors = await Doctor.countDocuments({ isVerified: true });

    // Tính ngày cuối tháng trước (để so sánh)
    // Thuật toán: new Date(year, month, 0) → trả về ngày cuối cùng của tháng trước
    const previousMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);

    // Đếm số bác sĩ đã được tạo trước tháng này
    const previousTotalDoctors = await Doctor.countDocuments({
      isVerified: true,
      createdAt: { $lte: previousMonthEnd } // Chỉ lấy những bác sĩ được tạo trước hoặc bằng cuối tháng trước
    });
    // Tính sự thay đổi: số bác sĩ hiện tại - số bác sĩ tháng trước
    const doctorsChange = totalDoctors - previousTotalDoctors;

    // ========== 2. TỔNG BỆNH NHÂN - So với tuần trước ==========
    // Đếm tổng số bệnh nhân (users có role = 'patient')
    const totalPatients = await User.countDocuments({ role: 'patient' });

    // Phân bổ người dùng theo vai trò (role)
    // Thuật toán: Đếm số lượng users theo từng role để tính phần trăm phân bổ
    const totalUsers = await User.countDocuments({});
    const adminCount = await User.countDocuments({ role: 'admin' });
    const doctorUserCount = await User.countDocuments({ role: 'doctor' });
    const patientUserCount = await User.countDocuments({ role: 'patient' });
    const managerCount = await User.countDocuments({ role: 'manager' });

    // Tính ngày cuối tuần trước để so sánh
    // Thuật toán: 
    // - today.getDay() trả về 0-6 (0 = Chủ nhật, 1 = Thứ 2, ...)
    // - Trừ đi today.getDay() để về đầu tuần (Chủ nhật)
    // - Trừ thêm 1 ngày để được cuối tuần trước
    const currentWeekStart = new Date(todayStart);
    currentWeekStart.setDate(todayStart.getDate() - todayStart.getDay()); // Đầu tuần này (Chủ nhật)
    const previousWeekEnd = new Date(currentWeekStart);
    previousWeekEnd.setDate(previousWeekEnd.getDate() - 1); // Cuối tuần trước (Thứ 7)

    // Đếm số bệnh nhân đã được tạo trước tuần này
    const previousTotalPatients = await User.countDocuments({
      role: 'patient',
      createdAt: { $lte: previousWeekEnd }
    });
    // Tính sự thay đổi: số bệnh nhân hiện tại - số bệnh nhân tuần trước
    const patientsChange = totalPatients - previousTotalPatients;

    // ========== 3. LỊCH HẸN - Dựa trên period được chọn ==========
    // Đếm tất cả appointments trong khoảng thời gian (không phân biệt status)
    // Lưu ý: Sử dụng scheduledStart (thời gian đặt lịch) thay vì createdAt để đảm bảo tính nhất quán

    let appointmentQuery = {};
    if (originalPeriod === 'year') {
      // Nếu period = year: đếm tất cả appointments được lên lịch trong năm hiện tại
      // Bao gồm cả các appointments trong tương lai (nếu có)
      const yearStart = new Date(today.getFullYear(), 0, 1, 0, 0, 0, 0); // 1/1/năm hiện tại
      const yearEnd = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999); // 31/12/năm hiện tại
      appointmentQuery = {
        scheduledStart: { $gte: yearStart, $lte: yearEnd }
      };
    } else {
      // Các period khác: sử dụng startDate và endDate đã tính toán
      appointmentQuery = {
        scheduledStart: { $gte: startDate, $lte: endDate }
      };
    }

    // Đếm số appointments trong khoảng thời gian
    const periodAppointments = await Appointment.countDocuments(appointmentQuery);

    // Tính toán kỳ trước để so sánh số lượng appointments
    // Thuật toán: Tùy theo period, tính toán khoảng thời gian tương ứng ở kỳ trước
    let previousPeriodAppointmentsStart, previousPeriodAppointmentsEnd;
    const periodDurationMsForComparison = endDate - startDate; // Độ dài kỳ hiện tại (milliseconds) - dùng cho so sánh

    if (originalPeriod === 'year') {
      // So sánh với năm trước: cùng ngày tháng nhưng năm trước
      previousPeriodAppointmentsStart = new Date(today.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
      previousPeriodAppointmentsEnd = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate(), 23, 59, 59, 999);
    } else if (originalPeriod === 'month') {
      // So sánh với tháng trước: cùng ngày nhưng tháng trước
      previousPeriodAppointmentsStart = new Date(today.getFullYear(), today.getMonth() - 1, 1, 0, 0, 0, 0);
      previousPeriodAppointmentsEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999); // Ngày 0 = ngày cuối tháng trước
    } else if (originalPeriod === 'week') {
      // So sánh với tuần trước: trừ đi 7 ngày
      const weekStart = new Date(startDate);
      previousPeriodAppointmentsEnd = new Date(weekStart);
      previousPeriodAppointmentsEnd.setDate(previousPeriodAppointmentsEnd.getDate() - 1); // Cuối tuần trước
      previousPeriodAppointmentsEnd.setHours(23, 59, 59, 999);
      previousPeriodAppointmentsStart = new Date(previousPeriodAppointmentsEnd);
      previousPeriodAppointmentsStart.setDate(previousPeriodAppointmentsStart.getDate() - 6); // Đầu tuần trước (7 ngày)
      previousPeriodAppointmentsStart.setHours(0, 0, 0, 0);
    } else if (originalPeriod === 'today') {
      // So sánh với hôm qua: trừ đi 1 ngày
      previousPeriodAppointmentsStart = new Date(startDate);
      previousPeriodAppointmentsStart.setDate(previousPeriodAppointmentsStart.getDate() - 1);
      previousPeriodAppointmentsEnd = new Date(previousPeriodAppointmentsStart);
      previousPeriodAppointmentsEnd.setHours(23, 59, 59, 999);
      previousPeriodAppointmentsStart.setHours(0, 0, 0, 0);
    } else if (originalPeriod === 'custom') {
      // So sánh với cùng độ dài trước kỳ custom
      // Thuật toán: Lấy startDate, trừ 1 ngày để được cuối kỳ trước, sau đó trừ đi periodDurationMsForComparison
      previousPeriodAppointmentsEnd = new Date(startDate);
      previousPeriodAppointmentsEnd.setDate(previousPeriodAppointmentsEnd.getDate() - 1);
      previousPeriodAppointmentsEnd.setHours(23, 59, 59, 999);
      previousPeriodAppointmentsStart = new Date(previousPeriodAppointmentsEnd.getTime() - periodDurationMsForComparison);
      previousPeriodAppointmentsStart.setHours(0, 0, 0, 0);
    } else {
      // Mặc định: so sánh với hôm qua
      previousPeriodAppointmentsStart = new Date(startDate);
      previousPeriodAppointmentsStart.setDate(previousPeriodAppointmentsStart.getDate() - 1);
      previousPeriodAppointmentsEnd = new Date(previousPeriodAppointmentsStart);
      previousPeriodAppointmentsEnd.setHours(23, 59, 59, 999);
      previousPeriodAppointmentsStart.setHours(0, 0, 0, 0);
    }

    const previousPeriodAppointments = await Appointment.countDocuments({
      scheduledStart: { $gte: previousPeriodAppointmentsStart, $lte: previousPeriodAppointmentsEnd }
    });

    const appointmentsChange = previousPeriodAppointments > 0
      ? periodAppointments - previousPeriodAppointments
      : periodAppointments;

    // ========== 4. DOANH THU - Dựa trên period được chọn ==========
    // Tính doanh thu cho khoảng thời gian đã chọn
    // Lưu ý: Sử dụng createdAt của payment (thời gian thanh toán) để tính doanh thu
    // Thuật toán: Lấy tất cả payments đã thanh toán thành công, tính tổng (total - refundAmount)
    const periodPayments = await Payment.find({
      status: { $in: ['captured', 'authorized'] }, // Chỉ lấy payments đã thanh toán thành công
      createdAt: { $gte: startDate, $lte: endDate } // Lọc theo thời gian tạo payment
    });

    // Tính tổng doanh thu: duyệt qua tất cả payments, cộng dồn (total - refundAmount)
    // refundAmount là số tiền đã hoàn lại, nên phải trừ đi để có doanh thu thực tế
    const periodRevenue = periodPayments.reduce((sum, payment) => {
      return sum + (payment.total - (payment.refundAmount || 0));
    }, 0);

    // Tính doanh thu kỳ trước để so sánh
    let previousPeriodStart, previousPeriodEnd;
    const periodDuration = endDate - startDate; // Thời lượng tính bằng mili giây

    if (originalPeriod === 'year') {
      // So sánh với năm trước
      previousPeriodStart = new Date(today.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
      previousPeriodEnd = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate(), 23, 59, 59, 999);
    } else if (originalPeriod === 'month') {
      // So sánh với tháng trước
      previousPeriodStart = new Date(today.getFullYear(), today.getMonth() - 1, 1, 0, 0, 0, 0);
      previousPeriodEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
    } else if (originalPeriod === 'week') {
      // So sánh với tuần trước
      const weekStart = new Date(startDate);
      previousPeriodEnd = new Date(weekStart);
      previousPeriodEnd.setDate(previousPeriodEnd.getDate() - 1);
      previousPeriodEnd.setHours(23, 59, 59, 999);
      previousPeriodStart = new Date(previousPeriodEnd);
      previousPeriodStart.setDate(previousPeriodStart.getDate() - 6);
      previousPeriodStart.setHours(0, 0, 0, 0);
    } else if (originalPeriod === 'today') {
      // So sánh với hôm qua
      previousPeriodStart = new Date(startDate);
      previousPeriodStart.setDate(previousPeriodStart.getDate() - 1);
      previousPeriodEnd = new Date(previousPeriodStart);
      previousPeriodEnd.setHours(23, 59, 59, 999);
      previousPeriodStart.setHours(0, 0, 0, 0);
    } else if (originalPeriod === 'custom') {
      // So sánh với cùng khoảng thời gian trước kỳ tùy chỉnh
      previousPeriodEnd = new Date(startDate);
      previousPeriodEnd.setDate(previousPeriodEnd.getDate() - 1);
      previousPeriodEnd.setHours(23, 59, 59, 999);
      previousPeriodStart = new Date(previousPeriodEnd.getTime() - periodDuration);
      previousPeriodStart.setHours(0, 0, 0, 0);
    } else {
      // Mặc định: so sánh với tháng trước
      previousPeriodStart = new Date(today.getFullYear(), today.getMonth() - 1, 1, 0, 0, 0, 0);
      previousPeriodEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
    }

    const previousPeriodPayments = await Payment.find({
      status: { $in: ['captured', 'authorized'] },
      createdAt: { $gte: previousPeriodStart, $lte: previousPeriodEnd }
    });
    const previousPeriodRevenue = previousPeriodPayments.reduce((sum, payment) => {
      return sum + (payment.total - (payment.refundAmount || 0));
    }, 0);
    const revenueChangePercent = previousPeriodRevenue > 0
      ? Math.round(((periodRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100)
      : (periodRevenue > 0 ? 100 : 0);

    // ========== 5. TOP 3 BÁC SĨ KHÁM ONLINE NHIỀU NHẤT ==========
    // Logic này giống với trang quản lý hóa đơn của manager - lấy từ payments
    // Thuật toán:
    // 1. Lấy tất cả payments thành công (captured/authorized)
    // 2. Populate appointmentId và appointmentIds để lấy mode và doctorId
    // 3. Nhóm theo doctorId, đếm số appointments unique có mode = 'online'
    // 4. Sắp xếp và lấy top 3
    // 5. Populate thông tin doctor và user để lấy tên

    // Lấy tất cả payments thành công
    const allSuccessfulPayments = await Payment.find({
      status: { $in: ['captured', 'authorized'] }
    })
      .populate('appointmentId', 'mode doctorId')
      .populate('appointmentIds', 'mode doctorId')
      .lean();

    // Thu thập tất cả appointmentIds chưa được populate để query một lần
    const unpopulatedAppointmentIds = new Set();
    allSuccessfulPayments.forEach(payment => {
      if (payment.appointmentIds && Array.isArray(payment.appointmentIds)) {
        payment.appointmentIds.forEach(apt => {
          // Nếu chưa được populate (không có _id hoặc mode), thêm vào set để query sau
          if (!apt._id && !apt.mode) {
            unpopulatedAppointmentIds.add(apt.toString());
          }
        });
      }
    });

    // Query tất cả appointments chưa được populate một lần
    const appointmentMap = new Map();
    if (unpopulatedAppointmentIds.size > 0) {
      const appointments = await Appointment.find({
        _id: { $in: Array.from(unpopulatedAppointmentIds) }
      })
        .select('mode doctorId')
        .lean();

      appointments.forEach(apt => {
        appointmentMap.set(apt._id.toString(), apt);
      });
    }

    // Nhóm appointments theo doctorId và mode
    const doctorMap = new Map(); // doctorId -> { onlineCount: Set, offlineCount: Set }

    // Xử lý payments
    for (const payment of allSuccessfulPayments) {
      // Xử lý appointmentId (single appointment)
      if (payment.appointmentId) {
        const apt = payment.appointmentId;
        const doctorId = apt.doctorId?.toString() || apt.doctorId;
        const mode = apt.mode;

        if (doctorId) {
          if (!doctorMap.has(doctorId)) {
            doctorMap.set(doctorId, {
              onlineAppointments: new Set(),
              offlineAppointments: new Set()
            });
          }

          const aptId = apt._id?.toString() || apt.toString();
          if (mode === 'online') {
            doctorMap.get(doctorId).onlineAppointments.add(aptId);
          } else if (mode === 'offline') {
            doctorMap.get(doctorId).offlineAppointments.add(aptId);
          }
        }
      }

      // Xử lý appointmentIds (multiple appointments)
      if (payment.appointmentIds && Array.isArray(payment.appointmentIds)) {
        for (const apt of payment.appointmentIds) {
          // apt có thể là ObjectId hoặc populated object
          let aptId, mode, doctorId;

          if (apt._id || apt.mode) {
            // Đã được populate
            aptId = apt._id?.toString() || apt.toString();
            mode = apt.mode;
            doctorId = apt.doctorId?.toString() || apt.doctorId;
          } else {
            // Chưa được populate, lấy từ appointmentMap đã query trước
            aptId = apt.toString();
            const appointment = appointmentMap.get(aptId);
            if (appointment) {
              mode = appointment.mode;
              doctorId = appointment.doctorId?.toString() || appointment.doctorId;
            }
          }

          if (doctorId && mode) {
            if (!doctorMap.has(doctorId)) {
              doctorMap.set(doctorId, {
                onlineAppointments: new Set(),
                offlineAppointments: new Set()
              });
            }

            if (mode === 'online') {
              doctorMap.get(doctorId).onlineAppointments.add(aptId);
            } else if (mode === 'offline') {
              doctorMap.get(doctorId).offlineAppointments.add(aptId);
            }
          }
        }
      }

      // Xử lý appointmentData (pre-payment flow)
      if (payment.appointmentData && Array.isArray(payment.appointmentData)) {
        for (const aptData of payment.appointmentData) {
          const doctorId = aptData.doctorId?.toString() || aptData.doctorId;
          const mode = aptData.mode;

          if (doctorId) {
            if (!doctorMap.has(doctorId)) {
              doctorMap.set(doctorId, {
                onlineAppointments: new Set(),
                offlineAppointments: new Set()
              });
            }

            // Với appointmentData, không có appointmentId thực tế, nên dùng payment._id + index làm unique key
            const uniqueKey = `${payment._id}_${aptData.scheduledStart}`;
            if (mode === 'online') {
              doctorMap.get(doctorId).onlineAppointments.add(uniqueKey);
            } else if (mode === 'offline') {
              doctorMap.get(doctorId).offlineAppointments.add(uniqueKey);
            }
          }
        }
      }
    }

    // Chuyển Map thành array và tính count
    const doctorsWithCounts = Array.from(doctorMap.entries()).map(([doctorId, data]) => ({
      doctorId,
      onlineCount: data.onlineAppointments.size,
      offlineCount: data.offlineAppointments.size
    }));

    // Sắp xếp và lấy top 3 online
    const topDoctorsOnlineArray = doctorsWithCounts
      .sort((a, b) => b.onlineCount - a.onlineCount)
      .slice(0, 3);

    // Sắp xếp và lấy top 3 offline
    const topDoctorsOfflineArray = doctorsWithCounts
      .sort((a, b) => b.offlineCount - a.offlineCount)
      .slice(0, 3);

    // Populate thông tin doctor và user cho online
    const onlineAppointments = await Promise.all(
      topDoctorsOnlineArray.map(async (item) => {
        const doctor = await Doctor.findById(item.doctorId).lean();
        if (!doctor) return null;

        const user = await User.findById(doctor.userId).lean();
        const doctorName = user?.fullName || doctor.fullName || `Bác sĩ ${item.doctorId}`;

        return {
          doctorId: item.doctorId,
          name: doctorName,
          count: item.onlineCount
        };
      })
    );

    // Populate thông tin doctor và user cho offline
    const offlineAppointments = await Promise.all(
      topDoctorsOfflineArray.map(async (item) => {
        const doctor = await Doctor.findById(item.doctorId).lean();
        if (!doctor) return null;

        const user = await User.findById(doctor.userId).lean();
        const doctorName = user?.fullName || doctor.fullName || `Bác sĩ ${item.doctorId}`;

        return {
          doctorId: item.doctorId,
          name: doctorName,
          count: item.offlineCount
        };
      })
    );

    // Filter out nulls
    const onlineAppointmentsFiltered = onlineAppointments.filter(item => item !== null);
    const offlineAppointmentsFiltered = offlineAppointments.filter(item => item !== null);

    // ========== 7. TOP 3 BỆNH NHÂN ĐẾN KHÁM NHIỀU NHẤT ==========
    // Thuật toán:
    // 1. Lấy tất cả appointments trong khoảng thời gian
    // 2. Lấy tất cả payments liên quan đến các appointments đó
    // 3. Tạo Map: appointmentId -> payment amount (để tra cứu nhanh)
    // 4. Nhóm appointments theo patientId, tính:
    //    - visitCount: số lần khám
    //    - lastVisit: lần khám gần nhất
    //    - totalSpending: tổng chi tiêu (từ paymentMap)
    // 5. Sắp xếp theo visitCount giảm dần, lấy top 3
    // 6. Populate thông tin patient và user để lấy tên

    // Sử dụng cùng logic date range như appointments query để đảm bảo tính nhất quán
    let topPatientsDateQuery = {};
    if (originalPeriod === 'year') {
      const yearStart = new Date(today.getFullYear(), 0, 1, 0, 0, 0, 0);
      const yearEnd = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
      topPatientsDateQuery = {
        scheduledStart: { $gte: yearStart, $lte: yearEnd }
      };
    } else {
      topPatientsDateQuery = {
        scheduledStart: { $gte: startDate, $lte: endDate }
      };
    }

    // Bước 1: Lấy tất cả appointments trong khoảng thời gian
    // Chỉ lấy các trường cần thiết: _id, patientId, scheduledStart, paymentId
    const appointmentsInPeriod = await Appointment.find({
      ...topPatientsDateQuery,
      status: { $in: ['accepted', 'in_progress', 'done', 'pending_doctor', 'no_show'] }, // Chỉ lấy các status hợp lệ
      patientId: { $exists: true, $ne: null } // Đảm bảo có patientId
    }).select('_id patientId scheduledStart paymentId').lean(); // Thêm paymentId để query payments trực tiếp

    // Bước 2: Lấy tất cả payments liên quan đến các appointments này
    const appointmentIds = appointmentsInPeriod.map(apt => apt._id);

    // Query TẤT CẢ payments liên quan đến appointments này
    // Một appointment có thể có nhiều payments: booking payment + service payment
    // Cần query qua cả paymentId (từ appointment) và appointmentId/appointmentIds (từ payment)
    let paymentsInPeriod = [];

    // Cách 1: Query payments từ paymentId trong appointments (booking payments)
    const paymentIdsFromAppointments = appointmentsInPeriod
      .filter(apt => apt.paymentId)
      .map(apt => apt.paymentId);

    if (paymentIdsFromAppointments.length > 0) {
      const paymentsFromPaymentId = await Payment.find({
        _id: { $in: paymentIdsFromAppointments },
        status: { $in: ['captured', 'authorized'] } // Chỉ lấy payments đã thanh toán thành công
      }).lean();

      paymentsInPeriod = paymentsFromPaymentId;
      console.log(`📊 Top Patients: Found ${paymentsInPeriod.length} payments via paymentId from appointments`);
    }

    // Cách 2: Query payments có appointmentId hoặc appointmentIds (bao gồm cả booking và service payments)
    // QUAN TRỌNG: Một appointment có thể có nhiều payments (booking + service)
    // Cần query tất cả payments, không chỉ paymentId trong appointment
    if (appointmentIds.length > 0) {
      const paymentsByAppointmentId = await Payment.find({
        $or: [
          { appointmentId: { $in: appointmentIds } }, // Payments có appointmentId trong danh sách
          { appointmentIds: { $in: appointmentIds } } // Payments có appointmentIds chứa ID trong danh sách
        ],
        status: { $in: ['captured', 'authorized'] } // Chỉ lấy payments đã thanh toán thành công
      }).lean();

      // Merge với payments đã tìm được (tránh duplicate)
      const existingPaymentIds = new Set(paymentsInPeriod.map(p => p._id.toString()));
      paymentsByAppointmentId.forEach(payment => {
        if (!existingPaymentIds.has(payment._id.toString())) {
          paymentsInPeriod.push(payment);
        }
      });

      console.log(`📊 Top Patients: Found ${paymentsByAppointmentId.length} payments via appointmentId/appointmentIds, total: ${paymentsInPeriod.length}`);
    }

    // Debug: Log số lượng payments tìm được và chi tiết
    console.log(`📊 Top Patients Debug: Found ${paymentsInPeriod.length} payments for ${appointmentIds.length} appointments`);
    if (paymentsInPeriod.length > 0) {
      console.log(`📊 Sample payments:`, paymentsInPeriod.slice(0, 3).map(p => ({
        _id: p._id.toString(),
        appointmentId: p.appointmentId?.toString(),
        appointmentIds: p.appointmentIds?.map(id => id.toString()),
        total: p.total,
        refundAmount: p.refundAmount || 0,
        netAmount: p.total - (p.refundAmount || 0)
      })));
    } else {
      // Nếu không tìm thấy payments qua appointments, thử query tất cả payments trong khoảng thời gian
      // (có thể payments chưa có appointmentId được set)
      const allPaymentsInPeriod = await Payment.find({
        status: { $in: ['captured', 'authorized'] },
        createdAt: { $gte: startDate, $lte: endDate }
      }).lean();

      console.log(`📊 Alternative: Found ${allPaymentsInPeriod.length} payments by createdAt in period`);
      if (allPaymentsInPeriod.length > 0) {
        const paymentsWithAppointmentId = allPaymentsInPeriod.filter(p =>
          p.appointmentId || (p.appointmentIds && Array.isArray(p.appointmentIds) && p.appointmentIds.length > 0)
        );
        console.log(`📊 Payments with appointmentId/appointmentIds: ${paymentsWithAppointmentId.length}`);

        // Chỉ lấy payments có appointmentId/appointmentIds và match với appointments trong period
        paymentsInPeriod = paymentsWithAppointmentId.filter(p => {
          if (p.appointmentId) {
            return appointmentIds.some(id => id.toString() === p.appointmentId.toString());
          }
          if (p.appointmentIds && Array.isArray(p.appointmentIds)) {
            return p.appointmentIds.some(aptId =>
              appointmentIds.some(id => id.toString() === aptId.toString())
            );
          }
          return false;
        });

        console.log(`📊 Filtered payments matching appointments: ${paymentsInPeriod.length}`);
      }
    }

    // Bước 3: Tạo Map để tra cứu nhanh: appointmentId -> payment amount
    // Sử dụng Map thay vì Object để tối ưu hiệu suất
    const paymentMap = new Map();

    // Tạo Map: paymentId -> payment để tra cứu nhanh
    const paymentByIdMap = new Map();
    paymentsInPeriod.forEach(payment => {
      paymentByIdMap.set(payment._id.toString(), payment);
    });

    // Map TẤT CẢ payments vào appointments
    // QUAN TRỌNG: Một appointment có thể có nhiều payments (booking + service)
    // Cần cộng dồn tất cả payments, không chỉ lấy một payment
    // Sử dụng Set để track payments đã được map qua paymentId (tránh duplicate)
    const paymentsMappedViaPaymentId = new Set();

    // Cách 1: Map payments từ appointments thông qua paymentId (ưu tiên - đảm bảo không bỏ sót)
    appointmentsInPeriod.forEach(apt => {
      if (apt.paymentId) {
        const payment = paymentByIdMap.get(apt.paymentId.toString());
        if (payment) {
          const amount = payment.total - (payment.refundAmount || 0); // Doanh thu thực tế
          const aptIdKey = apt._id.toString();
          const existing = paymentMap.get(aptIdKey) || 0;
          paymentMap.set(aptIdKey, existing + amount);
          paymentsMappedViaPaymentId.add(payment._id.toString()); // Đánh dấu payment đã được map
          console.log(`📊 Payment Map: Added ${amount} VND (${payment.invoiceType}) for appointment ${aptIdKey} via paymentId (total: ${existing + amount})`);
        }
      }
    });

    // Cách 2: Map payments từ appointmentId/appointmentIds (bao gồm cả payments không có trong paymentId)
    // QUAN TRỌNG: Một appointment có thể có nhiều payments (booking + service)
    // Cần cộng dồn tất cả payments, không chỉ lấy một payment
    // Chỉ map payments chưa được map qua paymentId (tránh duplicate)
    paymentsInPeriod.forEach(payment => {
      const paymentIdStr = payment._id.toString();
      // Bỏ qua nếu payment đã được map qua paymentId
      if (paymentsMappedViaPaymentId.has(paymentIdStr)) {
        return;
      }

      const amount = payment.total - (payment.refundAmount || 0); // Doanh thu thực tế = total - refundAmount

      // Xử lý appointmentId (single) - có thể là booking hoặc service payment
      if (payment.appointmentId) {
        const aptIdKey = payment.appointmentId.toString();
        // Kiểm tra xem appointment này có trong danh sách appointments trong period không
        if (appointmentIds.some(id => id.toString() === aptIdKey)) {
          // Cộng dồn vào map (không kiểm tra has, vì một appointment có thể có nhiều payments)
          const existing = paymentMap.get(aptIdKey) || 0;
          paymentMap.set(aptIdKey, existing + amount);
          console.log(`📊 Payment Map: Added ${amount} VND (${payment.invoiceType}) for appointment ${aptIdKey} via appointmentId (total: ${existing + amount})`);
        }
      }

      // Xử lý appointmentIds (array) - chia đều amount cho các appointments
      if (payment.appointmentIds && Array.isArray(payment.appointmentIds) && payment.appointmentIds.length > 0) {
        const amountPerAppointment = amount / payment.appointmentIds.length;
        payment.appointmentIds.forEach(aptId => {
          const aptIdKey = aptId.toString();
          // Chỉ thêm nếu appointment này trong khoảng thời gian
          if (appointmentIds.some(id => id.toString() === aptIdKey)) {
            // Cộng dồn vào map (không kiểm tra has, vì một appointment có thể có nhiều payments)
            const existing = paymentMap.get(aptIdKey) || 0;
            paymentMap.set(aptIdKey, existing + amountPerAppointment);
            console.log(`📊 Payment Map: Added ${amountPerAppointment} VND (${payment.invoiceType}) for appointment ${aptIdKey} from array (total: ${existing + amountPerAppointment})`);
          }
        });
      }
    });



    // Bước 4: Nhóm appointments theo patientId
    // Sử dụng Map để nhóm và tính toán thống kê cho mỗi patient
    const patientMap = new Map();
    appointmentsInPeriod.forEach(apt => {
      const patientId = apt.patientId.toString(); // Chuyển sang string để dùng làm key

      // Nếu chưa có trong Map, khởi tạo
      if (!patientMap.has(patientId)) {
        patientMap.set(patientId, {
          patientId: apt.patientId, // Giữ ObjectId để query sau
          visitCount: 0, // Số lần khám
          lastVisit: apt.scheduledStart, // Lần khám gần nhất
          appointmentIds: [], // Danh sách appointment IDs (để debug)
          totalSpending: 0 // Tổng chi tiêu
        });
      }

      const patient = patientMap.get(patientId);
      patient.visitCount += 1; // Tăng số lần khám

      // Cập nhật lần khám gần nhất (nếu appointment này mới hơn)
      if (apt.scheduledStart > patient.lastVisit) {
        patient.lastVisit = apt.scheduledStart;
      }

      patient.appointmentIds.push(apt._id); // Lưu appointment ID

      // Lấy payment amount từ paymentMap và cộng vào totalSpending
      const aptIdStr = apt._id.toString();
      const paymentAmount = paymentMap.get(aptIdStr) || 0;
      patient.totalSpending += paymentAmount;

      // Debug: Log nếu có payment amount
      if (paymentAmount > 0) {
        console.log(`📊 Patient ${patientId}: Added ${paymentAmount} VND for appointment ${aptIdStr} (total spending: ${patient.totalSpending})`);
      }
    });

    // Bước 5: Tính số lần khám và chi tiêu từ payments cho TẤT CẢ patients (không chỉ trong period)
    // Sau đó sắp xếp và lấy top 3
    // Logic này giống với trang quản lý hóa đơn của manager - lấy từ payments
    const allPatientsWithPaymentData = await Promise.all(
      Array.from(patientMap.values()).map(async (patient) => {
        // Tính số lần khám và chi tiêu từ TẤT CẢ payments của patient
        // Logic này giống với trang quản lý hóa đơn của manager - lấy từ payments
        const allPatientPayments = await Payment.find({
          "billTo.patientId": patient.patientId,
          status: { $in: ['captured', 'authorized'] }
        })
          .populate('appointmentId', 'scheduledStart')
          .populate('appointmentIds', 'scheduledStart')
          .sort({ createdAt: -1 })
          .lean();

        // Tính tổng chi tiêu
        const totalSpending = allPatientPayments.reduce((sum, payment) => {
          return sum + (payment.total - (payment.refundAmount || 0));
        }, 0);

        // Tính số lần khám từ appointments unique trong payments
        // Mỗi appointment unique = 1 lần khám
        const uniqueAppointmentIds = new Set();
        allPatientPayments.forEach(payment => {
          // Xử lý appointmentId (single appointment)
          if (payment.appointmentId) {
            const aptId = payment.appointmentId._id?.toString() || payment.appointmentId.toString();
            uniqueAppointmentIds.add(aptId);
          }
          // Xử lý appointmentIds (multiple appointments)
          if (payment.appointmentIds && Array.isArray(payment.appointmentIds)) {
            payment.appointmentIds.forEach(apt => {
              // apt có thể là ObjectId hoặc populated object
              const aptId = apt._id?.toString() || apt.toString();
              uniqueAppointmentIds.add(aptId);
            });
          }
        });

        const visitCount = uniqueAppointmentIds.size > 0 ? uniqueAppointmentIds.size : allPatientPayments.length;

        // Lấy lần khám gần nhất từ payments
        let lastVisitFromPayments = patient.lastVisit;
        if (allPatientPayments.length > 0) {
          // Tìm appointment date gần nhất từ payments
          const appointmentDates = allPatientPayments
            .map(p => p.appointmentId?.scheduledStart)
            .filter(date => date)
            .sort((a, b) => new Date(b) - new Date(a));

          if (appointmentDates.length > 0) {
            lastVisitFromPayments = new Date(appointmentDates[0]);
          } else {
            // Nếu không có appointment date, dùng payment date
            lastVisitFromPayments = new Date(allPatientPayments[0].createdAt);
          }
        }

        return {
          ...patient,
          visitCount, // Số lần khám từ payments
          totalSpending, // Chi tiêu từ payments
          lastVisit: lastVisitFromPayments // Lần khám gần nhất từ payments
        };
      })
    );

    // Sắp xếp theo visitCount giảm dần và lấy top 5
    const topPatientsArray = allPatientsWithPaymentData
      .sort((a, b) => b.visitCount - a.visitCount) // Sắp xếp giảm dần theo số lần khám từ payments
      .slice(0, 5); // Lấy top 5 bệnh nhân đầu tiên

    // Bước 6: Populate thông tin patient và user để lấy tên
    const topPatients = await Promise.all(
      topPatientsArray.map(async (patient) => {
        const patientDoc = await Patient.findById(patient.patientId).lean();
        if (!patientDoc) {
          console.warn(`⚠️ Patient not found: ${patient.patientId}`);
          return null;
        }

        // Ưu tiên dùng patient.fullName, nếu không có thì dùng user.fullName
        let patientName = patientDoc.fullName;
        if (!patientName && patientDoc.userId) {
          const user = await User.findById(patientDoc.userId).lean();
          if (user) {
            patientName = user.fullName;
          }
        }

        // Sử dụng dữ liệu đã tính từ payments ở Bước 5 (visitCount, totalSpending, lastVisit)
        // Debug: Log thông tin patient
        console.log(`📊 Patient ${patient.patientId}: visits=${patient.visitCount}, spending=${patient.totalSpending}, name=${patientName}`);

        return {
          patientId: patient.patientId,
          name: patientName || `Bệnh nhân`,
          visitCount: patient.visitCount, // Đã tính từ payments ở Bước 5
          lastVisit: patient.lastVisit, // Đã tính từ payments ở Bước 5
          totalSpending: patient.totalSpending // Đã tính từ payments ở Bước 5
        };
      })
    );

    // Filter out nulls and map to final format
    const topPatientsFinal = topPatients
      .filter(p => p !== null)
      .map((item, index) => ({
        rank: index + 1,
        name: item.name,
        visitCount: item.visitCount,
        lastVisit: item.lastVisit,
        totalSpending: item.totalSpending || 0
      }));

    // 8. Tỷ Lệ Loại Khám (Online vs Offline) - Use same query as periodAppointments for consistency
    let appointmentRatioQuery = {};
    if (originalPeriod === 'year') {
      // For year, use same logic as periodAppointments
      const yearStart = new Date(today.getFullYear(), 0, 1, 0, 0, 0, 0);
      const yearEnd = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
      appointmentRatioQuery = {
        scheduledStart: { $gte: yearStart, $lte: yearEnd }
      };
    } else {
      appointmentRatioQuery = {
        scheduledStart: { $gte: startDate, $lte: endDate }
      };
    }

    const totalAppointmentsInPeriod = await Appointment.countDocuments(appointmentRatioQuery);
    const onlineCount = await Appointment.countDocuments({
      ...appointmentRatioQuery,
      mode: 'online'
    });
    const offlineCount = await Appointment.countDocuments({
      ...appointmentRatioQuery,
      mode: 'offline'
    });

    const onlinePercent = totalAppointmentsInPeriod > 0
      ? Math.round((onlineCount / totalAppointmentsInPeriod) * 100)
      : 0;
    const offlinePercent = totalAppointmentsInPeriod > 0
      ? Math.round((offlineCount / totalAppointmentsInPeriod) * 100)
      : 0;

    // ========== 9. XU HƯỚNG DOANH THU THEO THỜI GIAN ==========
    // Thuật toán:
    // - Nếu period = "today": chia theo giờ (24 điểm dữ liệu)
    // - Nếu period <= 7 ngày: chia theo ngày
    // - Nếu period > 7 ngày: chia theo tháng
    // Mỗi điểm dữ liệu sẽ có: online revenue, offline revenue, total revenue
    // 
    // Lưu ý: Thay vì query payments theo createdAt, ta query appointments trong khoảng thời gian
    // rồi tìm payments liên quan đến các appointments đó (đảm bảo tính nhất quán với appointment count)

    const revenueTrend = [];
    const periodDurationMs = endDate - startDate; // Độ dài kỳ hiện tại (milliseconds)
    const daysDiff = Math.ceil(periodDurationMs / (1000 * 60 * 60 * 24)); // Tính số ngày trong period

    if (originalPeriod === "today") {
      // Xu hướng theo giờ cho hôm nay: duyệt qua 24 giờ
      // Sửa: Query appointments trong khoảng thời gian, rồi lấy payments qua paymentId
      // Đảm bảo payments có liên kết với appointments và có thể lấy được mode
      for (let hour = 0; hour < 24; hour++) {
        const hourStart = new Date(startDate);
        hourStart.setHours(hour, 0, 0, 0);
        const hourEnd = new Date(startDate);
        hourEnd.setHours(hour, 59, 59, 999);

        // Query payments được tạo (thanh toán) trong giờ này
        // Đây là thời điểm thanh toán thực tế
        const hourPayments = await Payment.find({
          status: { $in: ["captured", "authorized"] },
          createdAt: { $gte: hourStart, $lte: hourEnd }
        }).lean();

        // Lấy tất cả paymentIds từ payments (ObjectId)
        const paymentIds = hourPayments.map(p => p._id);

        // Query appointments có paymentId trong danh sách payments này
        // Để lấy mode (online/offline) của appointments
        const hourAppointments = await Appointment.find({
          paymentId: { $in: paymentIds }
        }).select("_id mode paymentId").lean();

        // Tạo map: paymentId -> appointments để lấy mode
        const paymentToAppointmentsMap = new Map();
        hourAppointments.forEach(apt => {
          if (apt.paymentId) {
            const paymentIdStr = apt.paymentId.toString();
            if (!paymentToAppointmentsMap.has(paymentIdStr)) {
              paymentToAppointmentsMap.set(paymentIdStr, []);
            }
            paymentToAppointmentsMap.get(paymentIdStr).push(apt);
          }
        });

        // Debug: Log số lượng payments tìm được
        if (hour === 0 || hour === 12) {
          console.log(`📊 Revenue Trend Hour ${hour}: Found ${hourAppointments.length} appointments, ${hourPayments.length} payments`);
          if (hourPayments.length > 0) {
            const samplePayment = hourPayments[0];
            const sampleAppointments = paymentToAppointmentsMap.get(samplePayment._id.toString()) || [];
            console.log(`📊 Sample payment:`, {
              total: samplePayment.total,
              paymentId: samplePayment._id.toString(),
              appointmentsCount: sampleAppointments.length,
              appointmentModes: sampleAppointments.map((apt) => apt.mode),
            });
          }
        }

        // Tính doanh thu cho từng loại (online/offline)
        let onlineRevenue = 0;
        let offlineRevenue = 0;

        hourPayments.forEach(payment => {
          const netAmount = payment.total - (payment.refundAmount || 0);
          const paymentIdStr = payment._id.toString();
          const appointments = paymentToAppointmentsMap.get(paymentIdStr) || [];

          if (appointments.length > 0) {
            // Tính doanh thu theo mode của appointments
            appointments.forEach(apt => {
              if (apt.mode === "online") {
                // Chia đều doanh thu nếu có nhiều appointments
                onlineRevenue += netAmount / appointments.length;
              } else if (apt.mode === "offline") {
                offlineRevenue += netAmount / appointments.length;
              }
            });
          } else {
            // Fallback: nếu không có appointments, thử query từ payment.appointmentId/appointmentIds
            // (giữ lại logic cũ để tương thích)
            console.warn(`⚠️ Revenue Trend: Payment ${payment._id.toString()} has no appointments in map`);
          }
        });

        revenueTrend.push({
          date: `${hour.toString().padStart(2, "0")}:00`,
          online: Math.round(onlineRevenue),
          offline: Math.round(offlineRevenue),
          total: Math.round(onlineRevenue + offlineRevenue)
        });
      }
    } else if (daysDiff <= 7) {
      // Daily trend for week
      // Sửa: Query payments theo createdAt, rồi lấy appointments từ paymentId
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dayStart = new Date(currentDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(currentDate);
        dayEnd.setHours(23, 59, 59, 999);

        // Query payments được tạo (thanh toán) trong ngày này
        const dayPayments = await Payment.find({
          status: { $in: ['captured', 'authorized'] },
          createdAt: { $gte: dayStart, $lte: dayEnd }
        }).lean();

        // Lấy paymentIds và query appointments
        const paymentIds = dayPayments.map(p => p._id);
        const dayAppointments = await Appointment.find({
          paymentId: { $in: paymentIds }
        }).select('_id mode paymentId').lean();

        // Tạo map: paymentId -> appointments
        const paymentToAppointmentsMap = new Map();
        dayAppointments.forEach(apt => {
          if (apt.paymentId) {
            const paymentIdStr = apt.paymentId.toString();
            if (!paymentToAppointmentsMap.has(paymentIdStr)) {
              paymentToAppointmentsMap.set(paymentIdStr, []);
            }
            paymentToAppointmentsMap.get(paymentIdStr).push(apt);
          }
        });

        let onlineRevenue = 0;
        let offlineRevenue = 0;

        for (const payment of dayPayments) {
          const netAmount = payment.total - (payment.refundAmount || 0);
          const paymentIdStr = payment._id.toString();
          const appointments = paymentToAppointmentsMap.get(paymentIdStr) || [];

          if (appointments.length > 0) {
            appointments.forEach(apt => {
              if (apt.mode === 'online') {
                onlineRevenue += netAmount / appointments.length;
              } else if (apt.mode === 'offline') {
                offlineRevenue += netAmount / appointments.length;
              }
            });
          }
        }

        const dateStr = `${currentDate.getDate().toString().padStart(2, '0')}/${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
        revenueTrend.push({
          date: dateStr,
          online: Math.round(onlineRevenue),
          offline: Math.round(offlineRevenue),
          total: Math.round(onlineRevenue + offlineRevenue)
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }
    } else {
      // Monthly trend for month/year
      // Sửa: Query payments theo createdAt, rồi lấy appointments từ paymentId
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999);

        // Query payments được tạo (thanh toán) trong tháng này
        const monthPayments = await Payment.find({
          status: { $in: ['captured', 'authorized'] },
          createdAt: { $gte: monthStart, $lte: monthEnd }
        }).lean();

        // Lấy paymentIds và query appointments
        const paymentIds = monthPayments.map(p => p._id);
        const monthAppointments = await Appointment.find({
          paymentId: { $in: paymentIds }
        }).select('_id mode paymentId').lean();

        // Tạo map: paymentId -> appointments
        const paymentToAppointmentsMap = new Map();
        monthAppointments.forEach(apt => {
          if (apt.paymentId) {
            const paymentIdStr = apt.paymentId.toString();
            if (!paymentToAppointmentsMap.has(paymentIdStr)) {
              paymentToAppointmentsMap.set(paymentIdStr, []);
            }
            paymentToAppointmentsMap.get(paymentIdStr).push(apt);
          }
        });

        let onlineRevenue = 0;
        let offlineRevenue = 0;

        for (const payment of monthPayments) {
          const netAmount = payment.total - (payment.refundAmount || 0);
          const paymentIdStr = payment._id.toString();
          const appointments = paymentToAppointmentsMap.get(paymentIdStr) || [];

          if (appointments.length > 0) {
            appointments.forEach(apt => {
              if (apt.mode === 'online') {
                onlineRevenue += netAmount / appointments.length;
              } else if (apt.mode === 'offline') {
                offlineRevenue += netAmount / appointments.length;
              }
            });
          }
        }

        revenueTrend.push({
          date: `Th${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`,
          online: Math.round(onlineRevenue),
          offline: Math.round(offlineRevenue),
          total: Math.round(onlineRevenue + offlineRevenue)
        });

        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    }

    // Debug logging
    console.log('📊 Statistics Debug:', {
      period: originalPeriod,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      startDateFormatted: `${startDate.getDate()}/${startDate.getMonth() + 1}/${startDate.getFullYear()}`,
      endDateFormatted: `${endDate.getDate()}/${endDate.getMonth() + 1}/${endDate.getFullYear()}`,
      onlineAppointmentsCount: onlineAppointments.length,
      offlineAppointmentsCount: offlineAppointments.length,
      topPatientsCount: topPatientsFinal.length,
      periodAppointments
    });

    const statistics = {
      totalDoctors: {
        value: totalDoctors,
        change: doctorsChange,
        changeLabel: doctorsChange >= 0
          ? `+${doctorsChange} so với tháng trước`
          : `${doctorsChange} so với tháng trước`
      },
      totalPatients: {
        value: totalPatients,
        change: patientsChange,
        changeLabel: patientsChange >= 0
          ? `+${patientsChange} so với tuần trước`
          : `${patientsChange} so với tuần trước`
      },
      todayAppointments: {
        value: periodAppointments,
        change: appointmentsChange,
        changeLabel: (() => {
          let periodLabel = 'hôm qua';
          if (originalPeriod === 'year') periodLabel = 'năm trước';
          else if (originalPeriod === 'month') periodLabel = 'tháng trước';
          else if (originalPeriod === 'week') periodLabel = 'tuần trước';
          else if (originalPeriod === 'today') periodLabel = 'hôm qua';
          else if (originalPeriod === 'custom') periodLabel = 'kỳ trước';

          return appointmentsChange >= 0
            ? `+${appointmentsChange} so với ${periodLabel}`
            : `${appointmentsChange} so với ${periodLabel}`;
        })()
      },
      monthRevenue: {
        value: periodRevenue,
        changePercent: revenueChangePercent,
        changeLabel: (() => {
          let periodLabel = 'tháng trước';
          if (originalPeriod === 'year') periodLabel = 'năm trước';
          else if (originalPeriod === 'month') periodLabel = 'tháng trước';
          else if (originalPeriod === 'week') periodLabel = 'tuần trước';
          else if (originalPeriod === 'today') periodLabel = 'hôm qua';
          else if (originalPeriod === 'custom') periodLabel = 'kỳ trước';

          return revenueChangePercent >= 0
            ? `+${revenueChangePercent}% so với ${periodLabel}`
            : `${revenueChangePercent}% so với ${periodLabel}`;
        })()
      },
      topDoctorsOnline: onlineAppointmentsFiltered.map((item, index) => ({
        rank: index + 1,
        name: item.name || `Dr. ${index + 1}`,
        count: item.count
      })),
      topDoctorsOffline: offlineAppointmentsFiltered.map((item, index) => ({
        rank: index + 1,
        name: item.name || `Dr. ${index + 1}`,
        count: item.count
      })),
      topPatients: topPatientsFinal,
      appointmentRatio: {
        online: onlinePercent,
        offline: offlinePercent,
        onlineCount: onlineCount,
        offlineCount: offlineCount,
        total: totalAppointmentsInPeriod
      },
      userDistribution: {
        total: totalUsers,
        admin: adminCount,
        doctor: doctorUserCount,
        patient: patientUserCount,
        manager: managerCount || 0,
        adminPercent: totalUsers > 0 ? Math.round((adminCount / totalUsers) * 100) : 0,
        doctorPercent: totalUsers > 0 ? Math.round((doctorUserCount / totalUsers) * 100) : 0,
        patientPercent: totalUsers > 0 ? Math.round((patientUserCount / totalUsers) * 100) : 0,
        managerPercent: totalUsers > 0 ? Math.round(((managerCount || 0) / totalUsers) * 100) : 0
      },
      revenueTrend: revenueTrend
    };

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error("Error fetching statistics:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tải thống kê"
    });
  }
};

/**
 * Lấy top 5 bệnh nhân đến khám nhiều nhất
 * GET /api/admin/patients/top-5-visits
 */
export const getTop5PatientsByVisitCount = async (req, res) => {
  try {
    // Sử dụng aggregation để đếm số lần khám (appointments với status = "done") theo patientId
    const topPatients = await Appointment.aggregate([
      // Lọc chỉ lấy appointments đã hoàn thành
      {
        $match: {
          status: "done",
          patientId: { $exists: true, $ne: null }
        }
      },
      // Nhóm theo patientId và đếm số lần khám
      {
        $group: {
          _id: "$patientId",
          visitCount: { $sum: 1 },
          lastVisit: { $max: "$scheduledStart" }
        }
      },
      // Sắp xếp theo số lần khám giảm dần
      {
        $sort: { visitCount: -1 }
      },
      // Lấy top 5
      {
        $limit: 5
      }
    ]);

    // Populate thông tin patient và user
    const topPatientsWithDetails = await Promise.all(
      topPatients.map(async (item) => {
        const patient = await Patient.findById(item._id)
          .populate("userId", "fullName email phone")
          .lean();

        if (!patient) {
          return null;
        }

        return {
          patientId: item._id,
          fullName: patient.fullName || patient.userId?.fullName || "Không có tên",
          email: patient.email || patient.userId?.email || "",
          phone: patient.phone || patient.userId?.phone || "",
          visitCount: item.visitCount,
          lastVisit: item.lastVisit
        };
      })
    );

    // Lọc bỏ các bệnh nhân không tìm thấy
    const filteredTopPatients = topPatientsWithDetails.filter(item => item !== null);

    res.json({
      success: true,
      data: filteredTopPatients
    });
  } catch (error) {
    console.error("Error fetching top 5 patients by visit count:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tải danh sách bệnh nhân đến khám nhiều nhất"
    });
  }
};
