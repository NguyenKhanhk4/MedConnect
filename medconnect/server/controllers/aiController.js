import { ok, fail } from "../utils/response.js";
import AiConversation from "../models/AiConversation.model.js";
import AiMessage from "../models/AiMessage.model.js";
import Patient from "../models/patient.model.js";
import User from "../models/user.model.js";
import Specialization from "../models/specialization.model.js";
import Faq from "../models/Faq.model.js";
import { callMedConnectAI } from "../services/openaiService.js";

/**
 * Tạo conversation mới
 */
export async function createConversation(req, res) {
  try {
    const firebaseUid = req.user?.uid || null;
    let userId = null;
    let patientId = null;

    // Tìm userId từ firebaseUID nếu có
    if (firebaseUid) {
      const user = await User.findOne({ firebaseUID: firebaseUid }).select("_id");
      if (user) {
        userId = user._id.toString();
        // Tìm patientId từ userId
        const patient = await Patient.findOne({ userId: user._id }).select("_id");
        if (patient) {
          patientId = patient._id;
        }
      }
    }

    const conversation = new AiConversation({
      userId: userId || null,
      patientId: patientId,
      startedAt: new Date(),
      model: "gpt-4o-mini",
      locale: "vi-VN",
      channel: "web",
      metadata: {
        firebaseUid: firebaseUid || null,
      },
    });

    await conversation.save();

    return ok(res, { conversation }, {}, 201, "Conversation created");
  } catch (error) {
    console.error("Error creating conversation:", error);
    return fail(res, 500, "INTERNAL_ERROR", error.message);
  }
}

/**
 * Gửi message và nhận phản hồi từ AI
 */
export async function sendMessage(req, res) {
  try {
    const { conversationId, text, isAuthenticated: frontendIsAuthenticated } = req.body;

    if (!conversationId || !text || !text.trim()) {
      return fail(
        res,
        400,
        "BAD_REQUEST",
        "conversationId và text là bắt buộc"
      );
    }

    // Tìm conversation
    const conversation = await AiConversation.findById(conversationId);
    if (!conversation) {
      return fail(res, 404, "NOT_FOUND", "Conversation không tồn tại");
    }

    // Kiểm tra quyền truy cập (nếu có userId)
    if (conversation.userId) {
      const user = await User.findById(conversation.userId).select("firebaseUID");
      if (user && user.firebaseUID !== req.user?.uid) {
        return fail(res, 403, "FORBIDDEN", "Không có quyền truy cập");
      }
    }

    const startTime = Date.now();

    // Lưu user message
    const userMessage = new AiMessage({
      conversationId: conversation._id,
      role: "user",
      text: text.trim(),
      createdAt: new Date(),
    });
    await userMessage.save();

    // Lấy lịch sử messages để context
    const previousMessages = await AiMessage.find({
      conversationId: conversation._id,
    })
      .sort({ createdAt: 1 })
      .limit(10); // Lấy 10 messages gần nhất

    // Xây dựng context từ lịch sử
    const messageHistory = previousMessages.map((msg) => ({
      role: msg.role,
      content: msg.text,
    }));

    // Tìm FAQ liên quan trước (tiết kiệm chi phí OpenAI)
    const userQuery = text.trim().toLowerCase();
    let relevantFaqs = [];
    let faqAnswer = null;

    // Tìm FAQ bằng text search (MongoDB text index)
    try {
      const faqResults = await Faq.find({
        $text: { $search: userQuery },
      })
        .limit(3)
        .lean();

      if (faqResults && faqResults.length > 0) {
        relevantFaqs = faqResults;
        // Nếu có FAQ match tốt (score cao), có thể dùng trực tiếp
        // Hoặc đưa vào context cho AI
      }
    } catch (error) {
      // Nếu text index chưa được tạo, fallback sang tìm kiếm thông thường
      console.warn("Text index chưa được tạo, sử dụng tìm kiếm thông thường");
      const faqResults = await Faq.find({
        $or: [
          { question: { $regex: userQuery, $options: "i" } },
          { answer: { $regex: userQuery, $options: "i" } },
          { tags: { $in: userQuery.split(" ") } },
        ],
      })
        .limit(3)
        .lean();

      if (faqResults && faqResults.length > 0) {
        relevantFaqs = faqResults;
      }
    }

    // Lấy danh sách chuyên khoa để AI có thể gợi ý
    const specializations = await Specialization.find()
      .select("name description")
      .sort({ name: 1 })
      .lean();

    // Kiểm tra xem user đã đăng nhập chưa
    // Ưu tiên dùng giá trị từ frontend (Firebase auth state) thay vì chỉ dựa vào cookie
    // Vì có thể cookie còn nhưng Firebase auth đã mất (refresh page, logout Firebase)
    const backendIsAuthenticated = !!req.user?.uid;
    const isAuthenticated = frontendIsAuthenticated !== undefined 
      ? frontendIsAuthenticated  // Ưu tiên giá trị từ frontend
      : backendIsAuthenticated;  // Fallback về cookie nếu frontend không gửi
    console.log("🔍 AI Controller - frontendIsAuthenticated:", frontendIsAuthenticated);
    console.log("🔍 AI Controller - backendIsAuthenticated:", backendIsAuthenticated);
    console.log("🔍 AI Controller - Final isAuthenticated:", isAuthenticated);
    console.log("🔍 AI Controller - req.user:", req.user ? { uid: req.user.uid, email: req.user.email } : null);
    console.log("🔍 AI Controller - User message:", text.trim());

    // Gọi AI với danh sách chuyên khoa, FAQs, lịch sử và trạng thái đăng nhập
    const aiResponse = await callMedConnectAI(
      text.trim(),
      specializations,
      messageHistory,
      relevantFaqs,
      isAuthenticated
    );

    // Lưu thông tin về tools đã sử dụng
    const usedTools = [];
    if (relevantFaqs.length > 0) {
      usedTools.push("searchFaqs");
    }

    const latencyMs = Date.now() - startTime;

    // Lưu AI response với thông tin về FAQs đã sử dụng
    const assistantMessage = new AiMessage({
      conversationId: conversation._id,
      role: "assistant",
      text: aiResponse,
      latencyMs: latencyMs,
      usedTools: usedTools,
      createdAt: new Date(),
    });
    await assistantMessage.save();

    // Cập nhật conversation
    conversation.lastIntent = "help"; // Có thể phân tích intent từ message
    await conversation.save();

    return ok(
      res,
      {
        message: assistantMessage,
        conversation: conversation,
      },
      {},
      200,
      "Message sent successfully"
    );
  } catch (error) {
    console.error("Error sending message:", error);
    return fail(res, 500, "INTERNAL_ERROR", error.message);
  }
}

/**
 * Lấy lịch sử messages của conversation
 */
export async function getConversationMessages(req, res) {
  try {
    const { conversationId } = req.params;

    if (!conversationId) {
      return fail(res, 400, "BAD_REQUEST", "conversationId là bắt buộc");
    }

    // Tìm conversation
    const conversation = await AiConversation.findById(conversationId);
    if (!conversation) {
      return fail(res, 404, "NOT_FOUND", "Conversation không tồn tại");
    }

    // Kiểm tra quyền truy cập
    if (conversation.userId) {
      const user = await User.findById(conversation.userId).select("firebaseUID");
      if (user && user.firebaseUID !== req.user?.uid) {
        return fail(res, 403, "FORBIDDEN", "Không có quyền truy cập");
      }
    }

    // Lấy messages
    const messages = await AiMessage.find({
      conversationId: conversation._id,
    })
      .sort({ createdAt: 1 })
      .limit(50);

    return ok(
      res,
      {
        conversation,
        messages,
      },
      {},
      200,
      "Messages retrieved successfully"
    );
  } catch (error) {
    console.error("Error getting messages:", error);
    return fail(res, 500, "INTERNAL_ERROR", error.message);
  }
}

/**
 * Lấy danh sách conversations của user
 */
export async function getUserConversations(req, res) {
  try {
    const firebaseUid = req.user?.uid || null;

    if (!firebaseUid) {
      return fail(res, 401, "UNAUTHORIZED", "Cần đăng nhập");
    }

    // Tìm userId từ firebaseUID
    const user = await User.findOne({ firebaseUID: firebaseUid }).select("_id");
    if (!user) {
      return fail(res, 404, "NOT_FOUND", "Không tìm thấy user");
    }

    const userId = user._id;

    // Tìm patientId
    const patient = await Patient.findOne({ userId: userId }).select("_id");
    const patientId = patient?._id || null;

    // Lấy conversations
    const conversations = await AiConversation.find({
      $or: [{ userId: userId }, { patientId: patientId }],
    })
      .sort({ startedAt: -1 })
      .limit(20);

    return ok(
      res,
      { conversations },
      {},
      200,
      "Conversations retrieved successfully"
    );
  } catch (error) {
    console.error("Error getting conversations:", error);
    return fail(res, 500, "INTERNAL_ERROR", error.message);
  }
}

/**
 * Xóa conversation
 */
export async function deleteConversation(req, res) {
  try {
    const { conversationId } = req.params;

    if (!conversationId) {
      return fail(res, 400, "BAD_REQUEST", "conversationId là bắt buộc");
    }

    // Tìm conversation
    const conversation = await AiConversation.findById(conversationId);
    if (!conversation) {
      return fail(res, 404, "NOT_FOUND", "Conversation không tồn tại");
    }

    // Kiểm tra quyền truy cập
    if (conversation.userId) {
      const user = await User.findById(conversation.userId).select("firebaseUID");
      if (user && user.firebaseUID !== req.user?.uid) {
        return fail(res, 403, "FORBIDDEN", "Không có quyền truy cập");
      }
    }

    // Xóa messages
    await AiMessage.deleteMany({ conversationId: conversation._id });

    // Xóa conversation
    await AiConversation.findByIdAndDelete(conversationId);

    return ok(res, {}, {}, 200, "Conversation deleted successfully");
  } catch (error) {
    console.error("Error deleting conversation:", error);
    return fail(res, 500, "INTERNAL_ERROR", error.message);
  }
}

