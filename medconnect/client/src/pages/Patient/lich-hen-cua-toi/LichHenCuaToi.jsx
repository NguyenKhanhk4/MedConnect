import React, { useState, useMemo } from "react";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { api } from "../../../lib/api";
import { Spin, message, Modal, DatePicker } from "antd";
import dayjs from "dayjs";
const { RangePicker } = DatePicker;
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  X,
  VideoIcon,
  Eye,
  Search,
  CheckCircle,
  Filter,
  ChevronDown,
  User,
} from "lucide-react";
import ChiTietLichHen from "../chi-tiet-lich-hen/ChiTietLichHen";
import ModalDanhGia from "../modal-danh-gia/ModalDanhGia";
import { RescheduleButton } from "../../../components/RescheduleButton/RescheduleButton";
import { useAppointments } from "../../../hooks/useAppointments";
import { useSpecializations } from "../../../hooks/useSpecializations";
import { useUserProfile } from "../../../hooks/useUserProfile";
import {
  filterByStatuses,
  getUniqueClinics,
  applyAppointmentFilters,
} from "../../../utils/appointmentUtils";
import { CustomAlert } from "../../../components/ui/CustomAlert";
import "./LichHenCuaToi.scss";

const STATUS = {
  confirmed: { label: "Đã xác nhận", tone: "#1d4ed8", text: "#ffffff" },
  accepted: { label: "Đã xác nhận", tone: "#1d4ed8", text: "#ffffff" },
  pending_doctor: { label: "Chờ xác nhận", tone: "#e5e7eb", text: "#111827" },
  cancelled: { label: "Hủy", tone: "#fee2e2", text: "#dc2626" },
  done: { label: "Hoàn thành", tone: "#e5e7eb", text: "#111827" },
};

export function LichHenCuaToi() {
  const [activeTab, setActiveTab] = useState("upcoming");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedAppointmentForReview, setSelectedAppointmentForReview] =
    useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filter state
  const [filters, setFilters] = useState({
    doctorSearch: "",
    selectedSpecialization: "",
    selectedMode: "",
    selectedDateRange: "",
    customDateRange: null,
    selectedClinic: "",
  });
  const [confirmConfig, setConfirmConfig] = useState(null);

  const navigate = useNavigate();

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

  // Fetch appointments
  const { appointments, loading, setAppointments } = useAppointments();

  // Fetch specializations
  const { specializations } = useSpecializations();

  // Get current user profile to identify self patient
  const { userProfile } = useUserProfile();

  const handleCancelAppointment = async (appointmentId) => {
    showConfirm("Bạn sẽ bị trừ 50% số tiền nếu bạn hủy. Bạn có chắc chắn muốn hủy lịch hẹn này?", async () => {
      try {
        // Gọi API endpoint mới
        const response = await api.put(
          `/api/patients/me/appointments/${appointmentId}/cancel`,
          { cancelReason: "Patient cancelled" }
        );

        console.log("Cancel response:", response);

        if (response && response.success) {
          message.success("Đã hủy lịch hẹn thành công");

          // Cập nhật lại danh sách appointments
          const updatedAppointments = appointments.map((appointment) =>
            appointment._id === appointmentId
              ? { ...appointment, status: "cancelled" }
              : appointment
          );
          setAppointments(updatedAppointments);

          console.log("Appointment cancelled successfully:", appointmentId);
        } else {
          console.error("Cancel failed:", response);
          message.error(response?.message || "Không thể hủy lịch hẹn");
        }
      } catch (error) {
        console.error("Error cancelling appointment:", error);
        console.error("Error details:", {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
        message.error(`Có lỗi xảy ra khi hủy lịch hẹn: ${error.message}`);
      }
    });
  };

  // Get unique clinics from appointments
  const uniqueClinics = useMemo(() => {
    return getUniqueClinics(appointments);
  }, [appointments]);

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({
      doctorSearch: "",
      selectedSpecialization: "",
      selectedMode: "",
      selectedDateRange: "",
      customDateRange: null,
      selectedClinic: "",
    });
  };

  // Phân chia appointments
  const upcomingAppointments = useMemo(
    () => filterByStatuses(appointments, ["pending_doctor", "accepted"]),
    [appointments]
  );
  const completedAppointments = useMemo(
    () => filterByStatuses(appointments, ["done"]),
    [appointments]
  );
  const cancelledAppointments = useMemo(
    () => filterByStatuses(appointments, ["cancelled"]),
    [appointments]
  );
  
  // Filter appointments booked for family members (đặt hộ)
  const familyBookedAppointments = useMemo(
    () =>
      appointments.filter(
        (apt) =>
          apt.patientId?.relationshipToOwner &&
          apt.patientId.relationshipToOwner !== "self"
      ),
    [appointments]
  );

  // Apply all filters to current tab appointments
  const filteredUpcomingAppointments = useMemo(
    () => applyAppointmentFilters(upcomingAppointments, filters),
    [upcomingAppointments, filters]
  );
  const filteredCompletedAppointments = useMemo(
    () => applyAppointmentFilters(completedAppointments, filters),
    [completedAppointments, filters]
  );
  const filteredCancelledAppointments = useMemo(
    () => applyAppointmentFilters(cancelledAppointments, filters),
    [cancelledAppointments, filters]
  );
  const filteredFamilyBookedAppointments = useMemo(
    () => applyAppointmentFilters(familyBookedAppointments, filters),
    [familyBookedAppointments, filters]
  );

  const currentAppointments =
    activeTab === "upcoming"
      ? filteredUpcomingAppointments
      : activeTab === "completed"
      ? filteredCompletedAppointments
      : activeTab === "cancelled"
      ? filteredCancelledAppointments
      : activeTab === "family"
      ? filteredFamilyBookedAppointments
      : [];
  const handleShowDetail = (appointmentId) => {
    setSelectedAppointmentId(appointmentId);
    setShowDetailModal(true);
  };

  const handleCloseDetail = () => {
    setShowDetailModal(false);
    setSelectedAppointmentId(null);
  };

  const handleShowReview = (appointment) => {
    setSelectedAppointmentForReview(appointment);
    setShowReviewModal(true);
  };

  const handleCloseReview = () => {
    setShowReviewModal(false);
    setSelectedAppointmentForReview(null);
  };

  const handleReviewSubmitted = () => {
    // Có thể thêm logic cập nhật UI sau khi đánh giá thành công
    message.success("Cảm ơn bạn đã đánh giá!");
  };

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="my-appointments-container">
      
      <div className="my-appointments-header">
        <div className="header-content-wrapper">
          <div className="header-text-section">
            <h1 className="page-title">Lịch hẹn của tôi</h1>
            <p className="page-subtitle">
              Quản lý và theo dõi các lịch hẹn khám bệnh
            </p>
            <p className="page-note">
              Lưu ý : Bạn chỉ có thể dời lịch trước 24h.
            </p>
             <p className="page-note">
               Mọi thắc mắc xin vui lòng liên hệ với quản lý để được giải quyết sớm nhất. Hotline 0398723124 
            </p>
          </div>
          {/* Doctor Search Filter */}
          <div className="doctor-search-filter-wrapper">
            <Search
              style={{
                position: "absolute",
                left: "0.875rem",
                top: "50%",
                transform: "translateY(-50%)",
                width: "1.25rem",
                height: "1.25rem",
                color: "#64748b",
                pointerEvents: "none",
                zIndex: 1,
              }}
            />
            <input
              type="text"
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: "0.875rem",
                color: "#1e293b",
                padding: 0,
                margin: 0,
                width: "100%",
                minWidth: 0,
              }}
              placeholder="Tìm bác sĩ theo tên"
              value={filters.doctorSearch}
              onChange={(e) =>
                setFilters({ ...filters, doctorSearch: e.target.value })
              }
            />
            {filters.doctorSearch && (
              <button
                type="button"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0.25rem",
                  background: "transparent",
                  border: "none",
                  borderRadius: "0.25rem",
                  cursor: "pointer",
                  color: "#6b7280",
                  transition: "all 0.2s ease",
                  flexShrink: 0,
                }}
                onClick={() => setFilters({ ...filters, doctorSearch: "" })}
                title="Xóa bộ lọc"
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "#f3f4f6";
                  e.currentTarget.style.color = "#1e293b";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#6b7280";
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        <div className="filters-header">
          <button
            type="button"
            className="filter-toggle-button"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} style={{ marginRight: "0.5rem" }} />
            Bộ lọc
            <ChevronDown
              size={16}
              style={{
                marginLeft: "0.5rem",
                transform: showFilters ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease",
              }}
            />
          </button>
          {(filters.selectedSpecialization ||
            filters.selectedMode ||
            filters.selectedDateRange ||
            filters.customDateRange ||
            filters.selectedClinic) && (
            <button
              type="button"
              className="clear-filters-button"
              onClick={clearAllFilters}
            >
              Xóa bộ lọc
            </button>
          )}
        </div>

        {showFilters && (
          <div className="filters-content">
            <div className="filters-grid">
              {/* Specialization Filter */}
              <div className="filter-group">
                <label className="filter-label">Chuyên khoa</label>
                <select
                  value={filters.selectedSpecialization}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      selectedSpecialization: e.target.value,
                    })
                  }
                  className="filter-select"
                >
                  <option value="">Tất cả chuyên khoa</option>
                  {specializations.map((spec) => (
                    <option key={spec._id} value={spec._id}>
                      {spec.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mode Filter */}
              <div className="filter-group">
                <label className="filter-label">Hình thức khám</label>
                <select
                  value={filters.selectedMode}
                  onChange={(e) =>
                    setFilters({ ...filters, selectedMode: e.target.value })
                  }
                  className="filter-select"
                >
                  <option value="">Tất cả</option>
                  <option value="online">Khám online</option>
                  <option value="offline">Khám tại phòng khám</option>
                </select>
              </div>

              {/* Date Range Filter (Preset) */}
              <div className="filter-group">
                <label className="filter-label">Khoảng thời gian</label>
                <select
                  value={filters.selectedDateRange}
                  onChange={(e) => {
                    setFilters({
                      ...filters,
                      selectedDateRange: e.target.value,
                      customDateRange: e.target.value
                        ? null
                        : filters.customDateRange,
                    });
                  }}
                  className="filter-select"
                >
                  <option value="">Tất cả thời gian</option>
                  <option value="today">Hôm nay</option>
                  <option value="week">Tuần này</option>
                  <option value="month">Tháng này</option>
                </select>
              </div>

              {/* Custom Date Range Filter */}
              <div className="filter-group" style={{ gridColumn: "1 / -1" }}>
                <label className="filter-label">
                  Chọn khoảng thời gian chi tiết
                </label>
                <RangePicker
                  value={
                    filters.customDateRange
                      ? [
                          dayjs(filters.customDateRange[0]),
                          dayjs(filters.customDateRange[1]),
                        ]
                      : null
                  }
                  onChange={(dates) => {
                    if (dates && dates.length === 2) {
                      setFilters({
                        ...filters,
                        customDateRange: [dates[0].toDate(), dates[1].toDate()],
                        selectedDateRange: "",
                      });
                    } else {
                      setFilters({ ...filters, customDateRange: null });
                    }
                  }}
                  format="DD/MM/YYYY"
                  placeholder={["Từ ngày", "Đến ngày"]}
                  style={{ width: "100%" }}
                  className="custom-date-range-picker"
                />
              </div>

              {/* Clinic Filter (only for offline mode) */}
              {filters.selectedMode === "offline" && (
                <div className="filter-group">
                  <label className="filter-label">Phòng khám</label>
                  <select
                    value={filters.selectedClinic}
                    onChange={(e) =>
                      setFilters({ ...filters, selectedClinic: e.target.value })
                    }
                    className="filter-select"
                  >
                    <option value="">Tất cả phòng khám</option>
                    {uniqueClinics.map((clinic) => (
                      <option
                        key={clinic._id?.toString() || clinic._id}
                        value={clinic._id?.toString() || clinic._id}
                      >
                        {clinic.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Section Header with Tabs */}
      <div className="appointments-section-header">
        <div className="appointments-tabs">
          <button
            type="button"
            onClick={() => setActiveTab("upcoming")}
            className={`tab-button ${activeTab === "upcoming" ? "active" : ""}`}
          >
            <Calendar size={16} style={{ marginRight: "0.5rem" }} />
            Tất cả ({filteredUpcomingAppointments.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("completed")}
            className={`tab-button ${
              activeTab === "completed" ? "active" : ""
            }`}
          >
            <CheckCircle size={16} style={{ marginRight: "0.5rem" }} />
            Đã khám ({filteredCompletedAppointments.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("cancelled")}
            className={`tab-button ${
              activeTab === "cancelled" ? "active" : ""
            }`}
          >
            <X size={16} style={{ marginRight: "0.5rem" }} />
            Đã hủy ({filteredCancelledAppointments.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("family")}
            className={`tab-button ${
              activeTab === "family" ? "active" : ""
            }`}
          >
            <User size={16} style={{ marginRight: "0.5rem" }} />
            Đặt hộ ({filteredFamilyBookedAppointments.length})
          </button>
        </div>
      </div>

      <div className="appointments-content">
        {currentAppointments.map((a) => {
          const status = STATUS[a.status] || STATUS.confirmed;
          const doctorName = `BS. ${a.doctorId?.fullName || ""}`;
          const specialty = a.doctorId?.specializationIds?.[0]?.name || "";
          const date = new Date(a.scheduledStart);
          const dateText = date.toLocaleDateString("vi-VN");
          const timeText = date.toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
          });
          const fee = a.feeAmount || a.consultationFee || 0;
          const feeText =
            fee > 0 ? new Intl.NumberFormat("vi-VN").format(fee) + "đ" : "";

          return (
            <div
              key={a._id}
              style={{
                border: "2px solid #cbd5e1",
                borderRadius: 12,
                background: "#fff",
                padding: 16,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 999,
                    background: "#f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 600,
                  }}
                >
                  BS
                </div>
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ fontWeight: 700 }}>{doctorName}</span>
                    <span
                      style={{
                        fontSize: 12,
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: status.tone,
                        color: status.text,
                      }}
                    >
                      {status.label}
                    </span>
                    {a.rescheduledFromId && (
                      <span
                        style={{
                          fontSize: 12,
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: "#6366f1",
                          color: "#ffffff",
                        }}
                        title="Lịch hẹn này đã được dời từ lịch cũ"
                      >
                        📅 Đã dời lịch
                      </span>
                    )}
                    {/* Badge "Đặt hộ" - hiển thị khi appointment là lịch đặt hộ (relationshipToOwner !== "self") */}
                    {(() => {
                      const relationshipToOwner =
                        a.patientId?.relationshipToOwner;
                      // Check if this is a booked-for-others appointment
                      // 1. If relationshipToOwner exists and is not "self", it's booked for others
                      // 2. If relationshipToOwner is null/undefined, we can't determine, so don't show badge
                      const isBookedForOthers =
                        relationshipToOwner && relationshipToOwner !== "self";

                      // Debug log để kiểm tra
                      if (process.env.NODE_ENV === "development") {
                        console.log("Appointment badge check:", {
                          appointmentId: a._id,
                          patientId: a.patientId?._id,
                          relationshipToOwner: relationshipToOwner,
                          isBookedForOthers: isBookedForOthers,
                          patientData: a.patientId,
                          userProfileRelationship:
                            userProfile?.relationshipToOwner,
                        });
                      }

                      return isBookedForOthers ? (
                        <span
                          style={{
                            fontSize: 13,
                            padding: "4px 12px",
                            borderRadius: 6,
                            background: "#3b82f6",
                            color: "#ffffff",
                            fontWeight: 600,
                            display: "inline-block",
                          }}
                          title={`Lịch hẹn đã được đặt hộ cho ${
                            a.patientId?.fullName || "người thân"
                          }`}
                        >
                          👤 Đặt hộ
                        </span>
                      ) : null;
                    })()}
                  </div>
                  <div style={{ color: "#334155", marginTop: 2 }}>
                    {specialty}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 16,
                      marginTop: 6,
                      color: "#0f172a",
                    }}
                  >
                    <span
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <Calendar size={14} /> {dateText}
                    </span>
                    <span
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <Clock size={14} /> {timeText}
                    </span>
                    <span
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <MapPin size={14} />{" "}
                      {(() => {
                        if (a.mode === "online") {
                          return "Khám online";
                        }
                        // Debug log
                        if (!a.clinicId?.name) {
                          console.warn(
                            `⚠️ Appointment ${a._id} missing clinic info:`,
                            {
                              clinicId: a.clinicId,
                              clinicName: a.clinicId?.name,
                              mode: a.mode,
                            }
                          );
                        }
                        return a.clinicId?.name || "Phòng khám";
                      })()}
                    </span>
                    {feeText && (
                      <span style={{ marginLeft: 8, fontWeight: 600 }}>
                        {feeText}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                {a.status === "done" ? (
                  // Appointments đã hoàn thành có nút đánh giá
                  <>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleShowReview(a)}
                    >
                      ⭐ Đánh giá
                    </Button>
                  </>
                ) : a.status === "cancelled" ? (
                  // Appointments đã hủy không có nút action
                  <span style={{ color: "#6b7280", fontSize: "14px" }}>
                    Lịch hẹn đã được hủy
                  </span>
                ) : (
                  // Appointments chưa hoàn thành có đầy đủ nút
                  <>
                    {/* Video Call Button - Only show for accepted appointments */}
                    {a.status === "accepted" && a.mode === "online" ? (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() =>
                          navigate(`/benh-nhan/video-call/${a._id}`)
                        }
                        style={{
                          backgroundColor: "#1890ff",
                        }}
                      >
                        <VideoIcon size={16} style={{ marginRight: 6 }} />
                        Video Call
                      </Button>
                    ) : null}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShowDetail(a._id)}
                    >
                      <Eye size={16} style={{ marginRight: 6 }} />
                      Chi tiết
                    </Button>

                    {/* Reschedule button - show for accepted and pending appointments */}
                    <RescheduleButton
                      appointment={a}
                      onSuccess={() => {
                        // Refresh appointments after successful reschedule request
                        const load = async () => {
                          try {
                            // Fetch all appointments to match StatsCards behavior
                            const res = await api.get(
                              "/api/patients/me/appointments?limit=1000"
                            );
                            if (res.success) {
                              setAppointments(res.data.appointments || []);
                            }
                          } catch (e) {
                            console.error("Error refreshing appointments:", e);
                          }
                        };
                        load();
                      }}
                    />

                    {/* Cancel button - show for pending and accepted appointments */}
                    {["pending_doctor", "accepted"].includes(a.status) && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleCancelAppointment(a._id)}
                        style={{
                          backgroundColor: "#dc2626",
                          color: "#ffffff",
                        }}
                      >
                        <X size={16} style={{ marginRight: 6 }} /> Hủy
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
        {currentAppointments.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "3rem",
              color: "#6b7280",
            }}
          >
            <p style={{ margin: 0, fontSize: "1rem" }}>
              {filters.doctorSearch
                ? `Không tìm thấy lịch hẹn nào với bác sĩ "${filters.doctorSearch}"`
                : activeTab === "upcoming"
                ? "Bạn chưa có lịch hẹn nào. Hãy đặt lịch khám để bắt đầu!"
                : activeTab === "completed"
                ? "Chưa có lịch hẹn đã khám"
                : activeTab === "cancelled"
                ? "Chưa có lịch hẹn đã hủy"
                : activeTab === "family"
                ? "Chưa có lịch hẹn đặt hộ"
                : "Không có lịch hẹn"}
            </p>
          </div>
        )}
      </div>

      {/* Appointment Detail Modal */}
      <ChiTietLichHen
        visible={showDetailModal}
        onClose={handleCloseDetail}
        appointmentId={selectedAppointmentId}
      />

      {/* Review Modal */}
      <ModalDanhGia
        visible={showReviewModal}
        onClose={handleCloseReview}
        appointment={selectedAppointmentForReview}
        onReviewSubmitted={handleReviewSubmitted}
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
