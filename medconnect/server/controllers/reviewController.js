import Review from "../models/review.model.js";
import Appointment from "../models/appointment.model.js";
import User from "../models/user.model.js";
import { ok, fail } from "../utils/response.js";
import { createReviewNotification } from "../services/notificationService.js";

/**
 * Tạo đánh giá mới
 * POST /api/reviews
 */
export const createReview = async (req, res) => {
  try {
    const {
      appointmentId,
      patientId,
      doctorId,
      rating,
      comment,
      tags,
      isAnonymous,
    } = req.body;

    // Lấy email từ token
    const userEmail = req.user?.email;
    console.log("🔍 User email from token:", userEmail);

    // Kiểm tra dữ liệu đầu vào
    if (!appointmentId || !doctorId || !rating || !comment) {
      return fail(res, 400, {}, "Thiếu thông tin bắt buộc");
    }

    if (rating < 1 || rating > 5) {
      return fail(res, 400, {}, "Đánh giá phải từ 1 đến 5 sao");
    }

    // Tìm User bằng email
    if (!userEmail) {
      return fail(res, 401, {}, "Không xác định được người dùng");
    }

    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return fail(res, 404, {}, "Không tìm thấy người dùng");
    }

    console.log("✅ Found user:", { userId: user._id, email: user.email });

    // Kiểm tra appointment có tồn tại và thuộc về bệnh nhân này không
    const appointment = await Appointment.findById(appointmentId)
      .populate({
        path: "patientId",
        select: "userId fullName",
      })
      .populate("doctorId");

    if (!appointment) {
      return fail(res, 404, {}, "Không tìm thấy lịch hẹn");
    }

    console.log(
      "- appointment.patientId.userId:",
      appointment.patientId.userId
    );
    console.log("- appointment.status:", appointment.status);

    // Kiểm tra appointment có thuộc về bệnh nhân này không
    // So sánh User._id với appointment.patientId.userId
    if (appointment.patientId.userId.toString() !== user._id.toString()) {
      console.log("❌ User ID mismatch:", {
        currentUser: user._id.toString(),
        appointmentPatientUserId: appointment.patientId.userId.toString(),
      });
      return fail(res, 403, {}, "Bạn không có quyền đánh giá lịch hẹn này");
    }

    // Kiểm tra appointment đã hoàn thành chưa
    if (appointment.status !== "done") {
      return fail(res, 400, {}, "Chỉ có thể đánh giá lịch hẹn đã hoàn thành");
    }

    // Kiểm tra đã đánh giá chưa - sử dụng Patient._id (ObjectId)
    const existingReview = await Review.findOne({
      appointmentId: appointmentId,
      patientId: appointment.patientId._id,
    });

    if (existingReview) {
      console.log("❌ Review already exists:", existingReview);
      return fail(res, 400, {}, "Bạn đã đánh giá lịch hẹn này rồi");
    }

    // Tạo đánh giá mới - sử dụng Patient._id (ObjectId của Patient document)
    const review = new Review({
      appointmentId,
      patientId: appointment.patientId._id, // Sử dụng ObjectId của Patient
      doctorId,
      rating,
      comment: comment.trim(),
      tags: tags || [],
      isAnonymous: isAnonymous || false,
      verified: true,
    });

    await review.save();

    // Populate thông tin để trả về
    await review.populate([
      { path: "patientId", select: "fullName email" },
      { path: "doctorId", select: "fullName specializationIds" },
      { path: "appointmentId", select: "scheduledStart mode" },
    ]);

    // Create notification for doctor about new review
    try {
      await createReviewNotification(review._id);
      console.log(`✅ Review notification created for review ${review._id}`);
    } catch (notificationError) {
      console.error(
        "❌ Error creating review notification:",
        notificationError
      );
      // Don't fail the main request if notification fails
    }

    return ok(res, review, {}, 201, "Đánh giá đã được tạo thành công");
  } catch (error) {
    console.error("Error creating review:", error);
    return fail(res, 500, {}, "Có lỗi xảy ra khi tạo đánh giá");
  }
};

/**
 * Lấy đánh giá theo bác sĩ
 * GET /api/reviews/doctor/:doctorId
 */
export const getReviewsByDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { page = 1, limit = 10, rating } = req.query;

    const query = { doctorId };
    if (rating) {
      query.rating = parseInt(rating);
    }

    const reviews = await Review.find(query)
      .populate([
        { path: "patientId", select: "fullName" },
        { path: "appointmentId", select: "scheduledStart mode" },
      ])
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Review.countDocuments(query);

    return ok(
      res,
      {
        reviews,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
        },
      },
      {},
      200,
      "Lấy danh sách đánh giá thành công"
    );
  } catch (error) {
    console.error("Error getting reviews by doctor:", error);
    return fail(res, 500, {}, "Có lỗi xảy ra khi lấy đánh giá");
  }
};

/**
 * Lấy đánh giá theo bệnh nhân
 * GET /api/reviews/patient
 */
export const getReviewsByPatient = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { page = 1, limit = 10 } = req.query;

    const reviews = await Review.find({ patientId: userId })
      .populate([
        { path: "doctorId", select: "fullName specializationIds" },
        { path: "appointmentId", select: "scheduledStart mode" },
      ])
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Review.countDocuments({ patientId: userId });

    return ok(
      res,
      {
        reviews,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
        },
      },
      {},
      200,
      "Lấy danh sách đánh giá thành công"
    );
  } catch (error) {
    console.error("Error getting reviews by patient:", error);
    return fail(res, 500, {}, "Có lỗi xảy ra khi lấy đánh giá");
  }
};
