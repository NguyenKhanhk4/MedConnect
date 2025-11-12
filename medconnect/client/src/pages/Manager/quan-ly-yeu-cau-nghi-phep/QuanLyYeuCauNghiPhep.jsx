import React, { useState, useEffect } from "react";
import { api } from "../../../lib/api";
import { Button } from "../../../components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/Dialog";
import { Input } from "../../../components/ui/Input";
import { Check, X, Clock, User, Calendar } from "lucide-react";
import { CustomAlert } from "../../../components/ui/CustomAlert";
import { RescheduleModal } from "../../../components/RescheduleModal/RescheduleModal";
import "./QuanLyYeuCauNghiPhep.scss";

export default function QuanLyYeuCauNghiPhep() {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [filterStatus, setFilterStatus] = useState("pending");
  const [alertMessage, setAlertMessage] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [appointmentToReschedule, setAppointmentToReschedule] = useState(null);
  const [pendingLeaveRequestId, setPendingLeaveRequestId] = useState(null);

  // Helper function to show custom alert
  const showAlert = (message) => {
    setAlertMessage(message);
  };

  // Helper function to show custom confirm
  const showConfirm = (message, onConfirm) => {
    setConfirmConfig({
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmConfig(null);
      },
      onCancel: () => setConfirmConfig(null),
    });
  };

  useEffect(() => {
    loadLeaveRequests();
  }, [filterStatus]);

  const loadLeaveRequests = async () => {
    try {
      setLoading(true);
      const response = await api.get(
        `/api/managers/leave-requests?status=${filterStatus}`
      );

      if (response.success) {
        setLeaveRequests(response.data.leaveRequests || []);
      } else {
        showAlert("Không thể tải danh sách yêu cầu nghỉ phép");
      }
    } catch (error) {
      console.error("Error loading leave requests:", error);
      showAlert("Có lỗi xảy ra khi tải danh sách yêu cầu nghỉ phép");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (leaveRequestId) => {
    try {
      const response = await api.post(
        `/api/managers/leave-requests/${leaveRequestId}/approve`
      );

      if (response.success) {
        showAlert("✅ Đã chấp nhận yêu cầu nghỉ phép");
        await loadLeaveRequests();
      } else {
        showAlert(
          "❌ Không thể chấp nhận: " + (response.message || "Unknown error")
        );
      }
    } catch (error) {
      console.error("Error approving leave request:", error);
      // Try to parse error response
      try {
        // api.post throws error with message as JSON string
        const errorText = error.message || error.toString();
        let errorData;

        // Try to parse as JSON
        try {
          errorData = JSON.parse(errorText);
        } catch {
          // If not JSON, try to get error from response property
          errorData = error.response || { message: errorText };
        }

        // Check if error requires rescheduling an appointment
        if (
          errorData.error?.data?.requiresReschedule &&
          errorData.error?.data?.appointment
        ) {
          const appointment = errorData.error.data.appointment;
          // Show reschedule modal for the appointment
          setAppointmentToReschedule({
            _id: appointment._id,
            patientId: { fullName: appointment.patientName },
            doctorId: { _id: appointment.doctorId },
            scheduledStart: appointment.scheduledStart,
            scheduledEnd: appointment.scheduledEnd,
            mode: appointment.mode,
            clinicId: appointment.clinicId,
            status: "accepted",
          });
          setPendingLeaveRequestId(leaveRequestId);
          setShowRescheduleModal(true);
          showAlert(
            "⚠️ Slot này có lịch hẹn đang hoạt động. Vui lòng dời lịch trước khi chấp nhận yêu cầu nghỉ phép."
          );
        } else {
          showAlert(
            "❌ Không thể chấp nhận: " +
              (errorData.message ||
                errorData.error?.message ||
                "Có lỗi xảy ra khi chấp nhận yêu cầu nghỉ phép")
          );
        }
      } catch (parseError) {
        console.error("Error parsing error response:", parseError);
        // If error is not JSON, show generic message
        showAlert(
          "Có lỗi xảy ra khi chấp nhận yêu cầu nghỉ phép: " +
            (error.message || "Unknown error")
        );
      }
    }
  };

  const handleRescheduleSuccess = async () => {
    // After successful reschedule, try to approve leave request again
    if (pendingLeaveRequestId) {
      try {
        const response = await api.post(
          `/api/managers/leave-requests/${pendingLeaveRequestId}/approve`
        );

        if (response.success) {
          showAlert("✅ Đã dời lịch và chấp nhận yêu cầu nghỉ phép");
          await loadLeaveRequests();
        } else {
          showAlert(
            "✅ Đã dời lịch nhưng không thể chấp nhận yêu cầu nghỉ phép: " +
              (response.message || "Unknown error")
          );
        }
      } catch (error) {
        console.error("Error approving leave request after reschedule:", error);
        showAlert(
          "✅ Đã dời lịch nhưng có lỗi khi chấp nhận yêu cầu nghỉ phép"
        );
      }
    }
    setShowRescheduleModal(false);
    setAppointmentToReschedule(null);
    setPendingLeaveRequestId(null);
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    if (!rejectionReason.trim()) {
      showAlert("Vui lòng nhập lý do từ chối");
      return;
    }

    try {
      const response = await api.post(
        `/api/managers/leave-requests/${selectedRequest._id}/reject`,
        {
          rejectionReason: rejectionReason.trim(),
        }
      );

      if (response.success) {
        showAlert("✅ Đã từ chối yêu cầu nghỉ phép");
        setShowRejectDialog(false);
        setSelectedRequest(null);
        setRejectionReason("");
        await loadLeaveRequests();
      } else {
        showAlert(
          "❌ Không thể từ chối: " + (response.message || "Unknown error")
        );
      }
    } catch (error) {
      console.error("Error rejecting leave request:", error);
      showAlert("Có lỗi xảy ra khi từ chối yêu cầu nghỉ phép");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "#faad14";
      case "approved":
        return "#52c41a";
      case "rejected":
        return "#ff4d4f";
      default:
        return "#666";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "pending":
        return "Chờ duyệt";
      case "approved":
        return "Đã chấp nhận";
      case "rejected":
        return "Đã từ chối";
      default:
        return "Không xác định";
    }
  };

  return (
    <div className="leave-request-management">
      <div className="page-header">
        <h1>Yêu cầu nghỉ phép</h1>
        <p>Quản lý các yêu cầu nghỉ phép từ bác sĩ</p>
      </div>

      <div className="filter-section">
        <Button
          variant={filterStatus === "pending" ? "primary" : "outline"}
          onClick={() => setFilterStatus("pending")}
        >
          Chờ duyệt
        </Button>
        <Button
          variant={filterStatus === "approved" ? "primary" : "outline"}
          onClick={() => setFilterStatus("approved")}
        >
          Đã chấp nhận
        </Button>
        <Button
          variant={filterStatus === "rejected" ? "primary" : "outline"}
          onClick={() => setFilterStatus("rejected")}
        >
          Đã từ chối
        </Button>
        <Button variant="outline" onClick={() => setFilterStatus("all")}>
          Tất cả
        </Button>
      </div>

      {loading ? (
        <div className="loading">Đang tải...</div>
      ) : leaveRequests.length === 0 ? (
        <div className="empty-state">
          <p>Không có yêu cầu nghỉ phép nào</p>
        </div>
      ) : (
        <div className="requests-list">
          {leaveRequests.map((request) => (
            <div key={request._id} className="request-card">
              <div className="request-header">
                <div className="doctor-info">
                  <div className="doctor-avatar">
                    {request.doctorId?.avatarUrl ? (
                      <img
                        src={request.doctorId.avatarUrl}
                        alt={request.doctorId.fullName}
                      />
                    ) : (
                      <User size={24} />
                    )}
                  </div>
                  <div className="doctor-details">
                    <h3>{request.doctorId?.fullName || "Bác sĩ"}</h3>
                    <p>
                      {request.doctorId?.specializationIds
                        ?.map((spec) => spec.name)
                        .join(", ") || "Chuyên khoa"}
                    </p>
                  </div>
                </div>
                <div
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(request.status) }}
                >
                  {getStatusText(request.status)}
                </div>
              </div>

              <div className="request-body">
                <div className="time-info">
                  <Calendar size={16} />
                  <span>
                    {request.slotId?.startAt
                      ? new Date(request.slotId.startAt).toLocaleString(
                          "vi-VN",
                          {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )
                      : "N/A"}
                  </span>
                </div>

                <div className="reason-section">
                  <strong>Lý do nghỉ:</strong>
                  <p>{request.reason}</p>
                </div>

                {request.rejectionReason && (
                  <div className="rejection-reason">
                    <strong>Lý do từ chối:</strong>
                    <p>{request.rejectionReason}</p>
                  </div>
                )}

                {request.reviewedBy && (
                  <div className="reviewed-info">
                    <strong>
                      {request.status === "approved"
                        ? "Chấp nhận bởi"
                        : "Từ chối bởi"}
                      :
                    </strong>
                    <p>
                      {request.reviewedBy?.fullName || "Manager"} -{" "}
                      {request.reviewedAt
                        ? new Date(request.reviewedAt).toLocaleString("vi-VN")
                        : "N/A"}
                    </p>
                  </div>
                )}
              </div>

              {request.status === "pending" && (
                <div className="request-actions">
                  <Button
                    variant="primary"
                    onClick={() => handleApprove(request._id)}
                    style={{ backgroundColor: "#52c41a" }}
                  >
                    <Check size={16} /> Chấp nhận
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedRequest(request);
                      setShowRejectDialog(true);
                      setRejectionReason("");
                    }}
                    style={{ borderColor: "#ff4d4f", color: "#ff4d4f" }}
                  >
                    <X size={16} /> Từ chối
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="reject-dialog">
          <DialogHeader>
            <DialogTitle>Từ chối yêu cầu nghỉ phép</DialogTitle>
          </DialogHeader>
          <div className="form-group">
            <label>Lý do từ chối: *</label>
            <Input
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Nhập lý do từ chối..."
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleReject();
                }
              }}
            />
          </div>
          <div className="dialog-actions">
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setSelectedRequest(null);
                setRejectionReason("");
              }}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={handleReject}
              style={{ backgroundColor: "#ff4d4f" }}
            >
              Xác nhận từ chối
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reschedule Modal - Show when appointment needs to be rescheduled before approving leave request */}
      {appointmentToReschedule && (
        <RescheduleModal
          visible={showRescheduleModal}
          appointment={appointmentToReschedule}
          onClose={() => {
            setShowRescheduleModal(false);
            setAppointmentToReschedule(null);
            setPendingLeaveRequestId(null);
          }}
          customSubmitHandler={async (requestBody) => {
            // Use manager reschedule function
            const { rescheduleAppointmentByManager } = await import(
              "../../../lib/api"
            );
            const response = await rescheduleAppointmentByManager(
              requestBody.appointmentId,
              requestBody.newDateTime,
              requestBody.reason,
              requestBody.mode,
              requestBody.clinicId,
              requestBody.newDoctorId,
              "doctor_leave" // Always use "doctor_leave" when rescheduling for leave request
            );
            return response;
          }}
          onSuccess={handleRescheduleSuccess}
        />
      )}

      {/* Custom Alert */}
      <CustomAlert
        message={alertMessage}
        onClose={() => setAlertMessage(null)}
        title="Hệ thống MedConnect"
      />

      {/* Custom Confirm */}
      {confirmConfig && (
        <CustomAlert
          message={confirmConfig.message}
          onConfirm={confirmConfig.onConfirm}
          onClose={confirmConfig.onCancel}
          title="Hệ thống MedConnect"
          type="confirm"
        />
      )}
    </div>
  );
}
