import { useState, useEffect } from "react";
import { Card, List, Button, Modal, Input, message, Badge } from "antd";
import {
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined,
  CheckOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { api } from "../../../../lib/api";
import "./YeuCauDoiLich.scss";

const { TextArea } = Input;

export function YeuCauDoiLich() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      console.log("🔍 Fetching reschedule requests...");
      const response = await api.get("/api/reschedule/requests");
      console.log("📋 Reschedule requests response:", response);

      if (response.success) {
        setRequests(response.data.requests);
        console.log(
          `✅ Loaded ${response.data.requests.length} reschedule requests`
        );
      } else {
        console.error(
          "❌ Failed to fetch reschedule requests:",
          response.message
        );
        message.error("Không thể tải danh sách yêu cầu dời lịch");
      }
    } catch (error) {
      console.error("❌ Error fetching reschedule requests:", error);
      message.error("Có lỗi xảy ra khi tải danh sách");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (requestId) => {
    try {
      setApprovingId(requestId);
      const response = await api.put(`/api/reschedule/${requestId}/approve`);

      if (response.success) {
        message.success("Đã chấp nhận yêu cầu dời lịch");
        fetchRequests(); // Refresh list
      } else {
        message.error(response.message || "Không thể chấp nhận yêu cầu");
      }
    } catch (error) {
      console.error("Error approving reschedule:", error);
      message.error("Có lỗi xảy ra khi chấp nhận yêu cầu");
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectingId) return;

    try {
      const response = await api.put(`/api/reschedule/${rejectingId}/reject`, {
        reviewNotes: rejectReason || "Yêu cầu bị từ chối",
      });

      if (response.success) {
        message.success("Đã từ chối yêu cầu dời lịch");
        setShowRejectModal(false);
        setRejectReason("");
        setRejectingId(null);
        fetchRequests(); // Refresh list
      } else {
        message.error(response.message || "Không thể từ chối yêu cầu");
      }
    } catch (error) {
      console.error("Error rejecting reschedule:", error);
      message.error("Có lỗi xảy ra khi từ chối yêu cầu");
    }
  };

  const openRejectModal = (requestId) => {
    setRejectingId(requestId);
    setShowRejectModal(true);
  };

  const formatDateTime = (dateTime) => {
    if (!dateTime) return "Không xác định";

    const date = new Date(dateTime);
    if (isNaN(date.getTime())) {
      return "Không xác định";
    }

    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: "orange", text: "Chờ xử lý" },
      approved: { color: "green", text: "Đã chấp nhận" },
      rejected: { color: "red", text: "Đã từ chối" },
    };

    const config = statusConfig[status] || statusConfig.pending;
    return <Badge color={config.color} text={config.text} />;
  };

  const pendingRequests = requests.filter((req) => req.status === "pending");
  const processedRequests = requests.filter((req) => req.status !== "pending");

  return (
    <div className="reschedule-requests-page">
      <div className="page-header">
        <h2>Quản lý yêu cầu dời lịch</h2>
        <p>Xem xét và xử lý các yêu cầu dời lịch từ bệnh nhân</p>
      </div>

      <div className="requests-container">
        {/* Pending Requests */}
        <Card
          title={
            <div className="card-title">
              <ClockCircleOutlined className="title-icon" />
              <span>Yêu cầu chờ xử lý</span>
              {pendingRequests.length > 0 && (
                <Badge
                  count={pendingRequests.length}
                  style={{ marginLeft: 8 }}
                />
              )}
            </div>
          }
          className="pending-requests-card"
        >
          <List
            loading={loading}
            dataSource={pendingRequests}
            locale={{ emptyText: "Không có yêu cầu nào chờ xử lý" }}
            renderItem={(request) => (
              <List.Item
                className="request-item pending"
                actions={[
                  <Button
                    key="approve"
                    type="primary"
                    icon={<CheckOutlined />}
                    loading={approvingId === request._id}
                    onClick={() => handleApprove(request._id)}
                    className="approve-btn"
                  >
                    Chấp nhận
                  </Button>,
                  <Button
                    key="reject"
                    danger
                    icon={<CloseOutlined />}
                    onClick={() => openRejectModal(request._id)}
                    className="reject-btn"
                  >
                    Từ chối
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <div className="request-avatar">
                      <UserOutlined />
                    </div>
                  }
                  title={
                    <div className="request-title">
                      <span className="patient-name">
                        {request.metadata?.patientName || "Bệnh nhân"}
                      </span>
                      {getStatusBadge(request.status)}
                    </div>
                  }
                  description={
                    <div className="request-details">
                      <div className="time-info">
                        <div className="time-item">
                          <CalendarOutlined className="time-icon" />
                          <span className="time-label">Lịch cũ:</span>
                          <span className="time-value">
                            {formatDateTime(request.metadata?.originalDateTime)}
                          </span>
                        </div>
                        <div className="time-item">
                          <ClockCircleOutlined className="time-icon" />
                          <span className="time-label">Lịch mới:</span>
                          <span className="time-value">
                            {formatDateTime(request.newDateTime)}
                          </span>
                        </div>
                      </div>
                      <div className="reason-section">
                        <span className="reason-label">Lý do:</span>
                        <span className="reason-text">{request.reason}</span>
                      </div>
                      <div className="request-meta">
                        <span className="request-date">
                          Yêu cầu lúc: {formatDateTime(request.createdAt)}
                        </span>
                      </div>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </Card>

        {/* Processed Requests */}
        <Card
          title={
            <div className="card-title">
              <CalendarOutlined className="title-icon" />
              <span>Lịch sử xử lý</span>
            </div>
          }
          className="processed-requests-card"
        >
          <List
            loading={loading}
            dataSource={processedRequests}
            locale={{ emptyText: "Chưa có yêu cầu nào được xử lý" }}
            renderItem={(request) => (
              <List.Item className="request-item processed">
                <List.Item.Meta
                  avatar={
                    <div className="request-avatar">
                      <UserOutlined />
                    </div>
                  }
                  title={
                    <div className="request-title">
                      <span className="patient-name">
                        {request.metadata?.patientName || "Bệnh nhân"}
                      </span>
                      {getStatusBadge(request.status)}
                    </div>
                  }
                  description={
                    <div className="request-details">
                      <div className="time-info">
                        <div className="time-item">
                          <CalendarOutlined className="time-icon" />
                          <span className="time-label">Lịch cũ:</span>
                          <span className="time-value">
                            {formatDateTime(request.metadata?.originalDateTime)}
                          </span>
                        </div>
                        <div className="time-item">
                          <ClockCircleOutlined className="time-icon" />
                          <span className="time-label">Lịch mới:</span>
                          <span className="time-value">
                            {formatDateTime(request.newDateTime)}
                          </span>
                        </div>
                      </div>
                      <div className="reason-section">
                        <span className="reason-label">Lý do:</span>
                        <span className="reason-text">{request.reason}</span>
                      </div>
                      <div className="request-meta">
                        <span className="request-date">
                          Yêu cầu lúc: {formatDateTime(request.createdAt)}
                        </span>
                        {request.reviewedAt && (
                          <span className="review-date">
                            Xử lý lúc: {formatDateTime(request.reviewedAt)}
                          </span>
                        )}
                        {request.reviewNotes && (
                          <span className="review-notes">
                            Ghi chú: {request.reviewNotes}
                          </span>
                        )}
                      </div>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      </div>

      {/* Reject Modal */}
      <Modal
        title="Từ chối yêu cầu dời lịch"
        open={showRejectModal}
        onOk={handleReject}
        onCancel={() => {
          setShowRejectModal(false);
          setRejectReason("");
          setRejectingId(null);
        }}
        okText="Từ chối"
        cancelText="Hủy"
        okButtonProps={{ danger: true }}
      >
        <div className="reject-modal-content">
          <p>Bạn có chắc chắn muốn từ chối yêu cầu dời lịch này?</p>
          <div className="form-group">
            <label>Lý do từ chối (tùy chọn):</label>
            <TextArea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Nhập lý do từ chối..."
              maxLength={200}
              showCount
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
