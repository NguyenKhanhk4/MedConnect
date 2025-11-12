import React, { useState } from "react";
import { Modal, Rate, Input, message, Button as AntButton } from "antd";
import { Star } from "lucide-react";
import { api } from "../../../lib/api";
import {
  getRatingText,
  validateReview,
  formatAppointmentDateTime,
} from "../../../utils/reviewUtils";
import {
  getFullName,
  getSpecializationNames,
} from "../../../utils/doctorUtils";

const { TextArea } = Input;

export default function ModalDanhGia({
  visible,
  onClose,
  appointment,
  onReviewSubmitted,
}) {
  const [formData, setFormData] = useState({ rating: 0, comment: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const validation = validateReview(formData);
    if (!validation.isValid) {
      message.warning(validation.error);
      return;
    }

    try {
      setLoading(true);

      const reviewData = {
        appointmentId: appointment._id,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId._id,
        rating: formData.rating,
        comment: formData.comment.trim(),
        tags: [], // Có thể thêm tags sau này
        isAnonymous: false,
      };

      const response = await api.post("/api/reviews", reviewData);

      if (response.success) {
        message.success("Đánh giá đã được gửi thành công!");
        onReviewSubmitted && onReviewSubmitted();
        handleClose();
      } else {
        message.error(response.message || "Có lỗi xảy ra khi gửi đánh giá");
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      message.error("Có lỗi xảy ra khi gửi đánh giá");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ rating: 0, comment: "" });
    onClose();
  };

  const handleRatingChange = (rating) => {
    setFormData((prev) => ({ ...prev, rating }));
  };

  const handleCommentChange = (e) => {
    setFormData((prev) => ({ ...prev, comment: e.target.value }));
  };

  if (!appointment) return null;

  const doctorName = getFullName(appointment.doctorId || {});
  const specialty = getSpecializationNames(
    appointment.doctorId?.specializationIds || []
  );
  const { dateText, timeText } = formatAppointmentDateTime(
    appointment.scheduledStart
  );

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Star size={20} style={{ color: "#fbbf24" }} />
          <span>Đánh giá bác sĩ</span>
        </div>
      }
      open={visible}
      onCancel={handleClose}
      footer={null}
      width={600}
      centered
      maskClosable={false}
    >
      <div style={{ padding: "20px 0" }}>
        {/* Thông tin lịch hẹn */}
        <div
          style={{
            background: "#f8fafc",
            padding: 16,
            borderRadius: 12,
            marginBottom: 24,
            border: "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 999,
                background: "#e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 600,
                fontSize: 16,
              }}
            >
              BS
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>
                {doctorName}
              </div>
              <div style={{ color: "#64748b", fontSize: 14 }}>{specialty}</div>
            </div>
          </div>
          <div style={{ color: "#64748b", fontSize: 14 }}>
            📅 {dateText} • 🕐 {timeText}
          </div>
        </div>

        {/* Đánh giá sao */}
        <div style={{ marginBottom: 24 }}>
          <label
            style={{ display: "block", marginBottom: 12, fontWeight: 500 }}
          >
            Đánh giá của bạn *
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Rate
              value={formData.rating}
              onChange={handleRatingChange}
              style={{ fontSize: 32 }}
              allowClear={false}
            />
            <span style={{ color: "#64748b", fontSize: 14 }}>
              {getRatingText(formData.rating)}
            </span>
          </div>
        </div>

        {/* Nhận xét */}
        <div style={{ marginBottom: 24 }}>
          <label
            style={{ display: "block", marginBottom: 12, fontWeight: 500 }}
          >
            Nhận xét của bạn *
          </label>
          <TextArea
            value={formData.comment}
            onChange={handleCommentChange}
            placeholder="Hãy chia sẻ trải nghiệm của bạn về bác sĩ và chất lượng dịch vụ..."
            rows={4}
            maxLength={500}
            showCount
            style={{ fontSize: 14 }}
          />
        </div>

        {/* Nút hành động */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <AntButton onClick={handleClose} disabled={loading}>
            Hủy
          </AntButton>
          <AntButton
            type="primary"
            onClick={handleSubmit}
            loading={loading}
            disabled={formData.rating === 0 || !formData.comment.trim()}
            style={{
              background: "#3b82f6",
              borderColor: "#3b82f6",
            }}
          >
            Gửi đánh giá
          </AntButton>
        </div>
      </div>
    </Modal>
  );
}
