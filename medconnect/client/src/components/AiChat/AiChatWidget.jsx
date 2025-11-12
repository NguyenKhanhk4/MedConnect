import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Bot, User, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import {
  createAiConversation,
  sendAiMessage,
  getAiConversationMessages,
} from "../../lib/api";
import "./AiChatWidget.scss";

// Component để render message text với action button nếu có
function MessageText({ text, isAuthenticated }) {
  const navigate = useNavigate();
  
  if (!text) return null;
  
  // Parse action từ text: [ACTION:REGISTER] hoặc [ACTION:BOOK_APPOINTMENT]
  const actionMatch = text.match(/\[ACTION:(REGISTER|BOOK_APPOINTMENT)\]/);
  const action = actionMatch ? actionMatch[1] : null;
  
  // Loại bỏ action tag khỏi text để hiển thị
  const displayText = text.replace(/\[ACTION:(REGISTER|BOOK_APPOINTMENT)\]/g, "").trim();
  
  // Double-check: Nếu frontend nghĩ chưa đăng nhập nhưng có [ACTION:BOOK_APPOINTMENT], thì đổi thành REGISTER
  // Nếu frontend nghĩ đã đăng nhập nhưng có [ACTION:REGISTER], thì đổi thành BOOK_APPOINTMENT
  let finalAction = action;
  if (!isAuthenticated && action === "BOOK_APPOINTMENT") {
    console.log("⚠️ Frontend: User not authenticated but got BOOK_APPOINTMENT, changing to REGISTER");
    finalAction = "REGISTER";
  } else if (isAuthenticated && action === "REGISTER") {
    console.log("⚠️ Frontend: User authenticated but got REGISTER, changing to BOOK_APPOINTMENT");
    finalAction = "BOOK_APPOINTMENT";
  }
  
  const handleActionClick = () => {
    if (finalAction === "REGISTER") {
      navigate("/dang-ky");
    } else if (finalAction === "BOOK_APPOINTMENT") {
      navigate("/dat-lich");
    }
  };
  
  return (
    <>
      <div className="ai-chat-message-text">
        {displayText.split("\n").map((line, i, arr) => (
          <React.Fragment key={i}>
            {line}
            {i < arr.length - 1 && <br />}
          </React.Fragment>
        ))}
      </div>
      {finalAction && (
        <div className="ai-chat-action-button-wrapper">
          <button
            className="ai-chat-action-button"
            onClick={handleActionClick}
          >
            {finalAction === "REGISTER" ? "Đăng ký ngay" : "Đặt lịch ngay"}
          </button>
        </div>
      )}
    </>
  );
}

export function AiChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  const isAuthenticated = !!user;

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Initialize conversation when opening chat
  const initializeConversation = async () => {
    if (conversationId) return;

    try {
      setIsLoading(true);
      const response = await createAiConversation();
      if (response.success && response.data?.conversation) {
        setConversationId(response.data.conversation._id);
        // Load existing messages if any
        await loadMessages(response.data.conversation._id);
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load messages for conversation
  const loadMessages = async (convId) => {
    try {
      const response = await getAiConversationMessages(convId);
      if (response.success && response.data?.messages) {
        setMessages(response.data.messages);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  // Handle opening chat
  const handleOpenChat = async () => {
    if (isOpen) {
      // Nếu đang mở thì đóng
      setIsOpen(false);
    } else {
      // Nếu đang đóng thì mở
      setIsOpen(true);
      if (!conversationId) {
        await initializeConversation();
      }
    }
  };

  // Handle sending message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || isSending || !conversationId) return;

    const userMessageText = inputText.trim();
    setInputText("");
    setIsSending(true);

    // Add user message to UI immediately
    const tempUserMessage = {
      _id: `temp-${Date.now()}`,
      role: "user",
      text: userMessageText,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      const response = await sendAiMessage(conversationId, userMessageText, isAuthenticated);
      if (response.success && response.data?.message) {
        // Replace temp message with real user message and add AI response
        setMessages((prev) => {
          const filtered = prev.filter((m) => m._id !== tempUserMessage._id);
          // Add user message (we need to get it from the conversation or create a proper one)
          // For now, keep the temp message but update it, and add AI response
          return [
            ...filtered,
            {
              ...tempUserMessage,
              _id: `user-${Date.now()}`,
            },
            {
              _id: response.data.message._id,
              role: "assistant",
              text: response.data.message.text,
              createdAt: response.data.message.createdAt,
            },
          ];
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // Remove temp message on error
      setMessages((prev) => prev.filter((m) => m._id !== tempUserMessage._id));
      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          _id: `error-${Date.now()}`,
          role: "assistant",
          text: "Xin lỗi, tôi đang gặp sự cố. Bạn vui lòng thử lại sau nhé.",
          createdAt: new Date(),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  // Format time
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        className={`ai-chat-button ${isOpen ? "active" : ""}`}
        onClick={handleOpenChat}
        aria-label="Mở AI Chat"
      >
        {isOpen ? (
          <X size={24} />
        ) : (
          <>
            <Bot size={24} />
            <span className="ai-chat-badge">AI</span>
          </>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="ai-chat-window">
          {/* Header */}
          <div className="ai-chat-header">
            <div className="ai-chat-header-content">
              <div className="ai-chat-avatar">
                <Bot size={20} />
              </div>
              <div className="ai-chat-header-text">
                <h3>Trợ lý AI MedConnect</h3>
                <p>Hỏi tôi bất cứ điều gì về dịch vụ y tế</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="ai-chat-messages">
            {isLoading ? (
              <div className="ai-chat-loading">
                <Loader2 className="spinner" size={24} />
                <p>Đang khởi tạo...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="ai-chat-welcome">
                <Bot size={48} className="welcome-icon" />
                <h4>Xin chào! Tôi là trợ lý AI của MedConnect</h4>
                <p>
                  Tôi có thể giúp bạn:
                  <br />• Tìm bác sĩ phù hợp
                  <br />• Hướng dẫn đặt lịch khám
                  <br />• Tư vấn về dịch vụ y tế
                  <br />• Trả lời câu hỏi thường gặp
                </p>
                <p className="welcome-note">
                  Hãy bắt đầu cuộc trò chuyện bằng cách gửi tin nhắn!
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message._id}
                  className={`ai-chat-message ${
                    message.role === "user" ? "user-message" : "ai-message"
                  }`}
                >
                  <div className="ai-chat-message-avatar">
                    {message.role === "user" ? (
                      <User size={16} />
                    ) : (
                      <Bot size={16} />
                    )}
                  </div>
                  <div className="ai-chat-message-content">
                    <MessageText text={message.text} isAuthenticated={isAuthenticated} />
                    <div className="ai-chat-message-time">
                      {formatTime(message.createdAt)}
                    </div>
                  </div>
                </div>
              ))
            )}
            {isSending && (
              <div className="ai-chat-message ai-message">
                <div className="ai-chat-message-avatar">
                  <Bot size={16} />
                </div>
                <div className="ai-chat-message-content">
                  <div className="ai-chat-typing">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form className="ai-chat-input-form" onSubmit={handleSendMessage}>
            <input
              ref={inputRef}
              type="text"
              className="ai-chat-input"
              placeholder="Nhập câu hỏi của bạn..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isSending || isLoading || !conversationId}
            />
            <button
              type="submit"
              className="ai-chat-send-btn"
              disabled={!inputText.trim() || isSending || isLoading || !conversationId}
            >
              {isSending ? (
                <Loader2 className="spinner" size={20} />
              ) : (
                <Send size={20} />
              )}
            </button>
          </form>
        </div>
      )}
    </>
  );
}

