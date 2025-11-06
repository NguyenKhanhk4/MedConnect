import React, { useEffect, useState } from "react";
import { Badge } from "../../../../components/ui/Badge";
import { Button } from "../../../../components/ui/Button";
import { api } from "../../../../lib/api";
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
} from "lucide-react";
import AppointmentDetailModal from "../AppointmentDetailModal/AppointmentDetailModal";
import ReviewModal from "../ReviewModal/ReviewModal";
import { RescheduleButton } from "../../../../components/RescheduleButton/RescheduleButton";
import "./MyAppointments.scss";

const STATUS = {
  confirmed: { label: "Đã xác nhận", tone: "#1d4ed8", text: "#ffffff" },
  accepted: { label: "Đã xác nhận", tone: "#1d4ed8", text: "#ffffff" },
  pending_doctor: { label: "Chờ xác nhận", tone: "#e5e7eb", text: "#111827" },
  cancelled: { label: "Hủy", tone: "#fee2e2", text: "#dc2626" },
  done: { label: "Hoàn thành", tone: "#e5e7eb", text: "#111827" },
};

export function MyAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedAppointmentForReview, setSelectedAppointmentForReview] =
    useState(null);
  const [doctorSearch, setDoctorSearch] = useState(""); // Filter by doctor name
  const [specializations, setSpecializations] = useState([]); // For specialization filter
  const [showFilters, setShowFilters] = useState(false); // Show/hide advanced filters
  const [selectedSpecialization, setSelectedSpecialization] = useState(""); // Filter by specialization
  const [selectedMode, setSelectedMode] = useState(""); // Filter by mode (online/offline)
  const [selectedDateRange, setSelectedDateRange] = useState(""); // Filter by date range (preset)
  const [customDateRange, setCustomDateRange] = useState(null); // Filter by custom date range [from, to]
  const [selectedClinic, setSelectedClinic] = useState(""); // Filter by clinic
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        // Fetch all appointments to match StatsCards behavior (no limit or large limit)
        const res = await api.get("/api/patients/me/appointments?limit=1000");
        if (res.success) {
          setAppointments(res.data.appointments || []);
        } else {
          message.error("Không thể tải lịch hẹn");
        }
      } catch (e) {
        message.error("Có lỗi khi tải lịch hẹn");
      } finally {
        setLoading(false);
      }
    };
    load();
    fetchSpecializations();
  }, []);

  // Fetch specializations for filter
  const fetchSpecializations = async () => {
    try {
      const response = await api.get("/api/specializations");
      if (response.success) {
        setSpecializations(response.data || []);
      }
    } catch (error) {
      console.error("Error fetching specializations:", error);
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    Modal.confirm({
      title: "Xác nhận hủy lịch hẹn",
      content: "Bạn có chắc chắn muốn hủy lịch hẹn này?",
      okText: "Hủy lịch hẹn",
      cancelText: "Không",
      okType: "danger",
      onOk: async () => {
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
      },
    });
  };

  // Filter appointments by doctor name
  const filterByDoctorName = (appointmentList) => {
    if (!doctorSearch.trim()) {
      return appointmentList;
    }
    const searchLower = doctorSearch.toLowerCase().trim();
    return appointmentList.filter((appointment) => {
      const doctorName = appointment.doctorId?.fullName?.toLowerCase() || "";
      return doctorName.includes(searchLower);
    });
  };

  // Apply all filters
  const applyFilters = (appointmentList) => {
    let filtered = appointmentList;

    // Filter by doctor name
    if (doctorSearch.trim()) {
      filtered = filterByDoctorName(filtered);
    }

    // Filter by specialization
    if (selectedSpecialization) {
      filtered = filtered.filter((appointment) => {
        const specializationIds = appointment.doctorId?.specializationIds || [];
        return specializationIds.some(
          (spec) =>
            (typeof spec === "object" ? spec._id : spec) ===
            selectedSpecialization
        );
      });
    }

    // Filter by mode (online/offline)
    if (selectedMode) {
      filtered = filtered.filter(
        (appointment) => appointment.mode === selectedMode
      );
    }

    // Filter by custom date range (priority over preset)
    if (customDateRange && customDateRange.length === 2) {
      const [startDate, endDate] = customDateRange;
      const rangeStart = dayjs(startDate).startOf("day").toDate();
      const rangeEnd = dayjs(endDate).endOf("day").toDate();

      filtered = filtered.filter((appointment) => {
        if (!appointment.scheduledStart) return false;

        const appointmentDate = new Date(appointment.scheduledStart);
        if (!appointmentDate || isNaN(appointmentDate.getTime())) return false;

        return appointmentDate >= rangeStart && appointmentDate <= rangeEnd;
      });
    }
    // Filter by preset date range (if no custom range)
    else if (selectedDateRange) {
      const now = new Date();
      const todayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);
      todayEnd.setHours(0, 0, 0, 0);

      // Tuần này: Từ thứ 2 đầu tuần đến hôm nay
      const weekStart = new Date(todayStart);
      const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      weekStart.setDate(weekStart.getDate() - daysToMonday);
      weekStart.setHours(0, 0, 0, 0);

      filtered = filtered.filter((appointment) => {
        if (!appointment.scheduledStart) return false;

        const appointmentDate = new Date(appointment.scheduledStart);
        if (!appointmentDate || isNaN(appointmentDate.getTime())) return false;

        // Reset time to compare dates only
        const appointmentDateOnly = new Date(
          appointmentDate.getFullYear(),
          appointmentDate.getMonth(),
          appointmentDate.getDate()
        );
        appointmentDateOnly.setHours(0, 0, 0, 0);

        switch (selectedDateRange) {
          case "today":
            return (
              appointmentDateOnly >= todayStart &&
              appointmentDateOnly < todayEnd
            );
          case "week":
            return (
              appointmentDateOnly >= weekStart &&
              appointmentDateOnly <= todayStart
            );
          case "month":
            // Check if appointment is in the same year and month as current month
            // This includes all appointments in the current month, including future ones
            return (
              appointmentDate.getFullYear() === now.getFullYear() &&
              appointmentDate.getMonth() === now.getMonth()
            );
          default:
            return true;
        }
      });
    }

    // Filter by clinic
    if (selectedClinic) {
      filtered = filtered.filter(
        (appointment) =>
          appointment.clinicId?._id === selectedClinic ||
          appointment.clinicId?._id?.toString() === selectedClinic
      );
    }

    return filtered;
  };

  // Get unique clinics from appointments
  const getUniqueClinics = () => {
    const clinicMap = new Map();
    appointments.forEach((apt) => {
      if (apt.clinicId && apt.mode === "offline") {
        const clinicId = apt.clinicId._id || apt.clinicId;
        if (clinicId && !clinicMap.has(clinicId.toString())) {
          clinicMap.set(clinicId.toString(), {
            _id: clinicId,
            name: apt.clinicId.name || "Phòng khám",
          });
        }
      }
    });
    return Array.from(clinicMap.values());
  };

  // Clear all filters
  const clearAllFilters = () => {
    setDoctorSearch("");
    setSelectedSpecialization("");
    setSelectedMode("");
    setSelectedDateRange("");
    setCustomDateRange(null);
    setSelectedClinic("");
  };

  // Phân chia appointments
  const upcomingAppointments = appointments.filter((appointment) =>
    ["pending_doctor", "accepted"].includes(appointment.status)
  );
  const completedAppointments = appointments.filter(
    (appointment) => appointment.status === "done"
  );
  const cancelledAppointments = appointments.filter(
    (appointment) => appointment.status === "cancelled"
  );

  // Apply all filters to current tab appointments
  const filteredUpcomingAppointments = applyFilters(upcomingAppointments);
  const filteredCompletedAppointments = applyFilters(completedAppointments);
  const filteredCancelledAppointments = applyFilters(cancelledAppointments);

  const currentAppointments =
    activeTab === "upcoming"
      ? filteredUpcomingAppointments
      : activeTab === "completed"
      ? filteredCompletedAppointments
      : filteredCancelledAppointments;
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
      {/* Header with Gradient Background */}
      <div className="my-appointments-header">
        <div className="header-content-wrapper">
          <div className="header-text-section">
            <h1 className="page-title">Lịch hẹn của tôi</h1>
            <p className="page-subtitle">
              Quản lý và theo dõi các lịch hẹn khám bệnh
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
              value={doctorSearch}
              onChange={(e) => setDoctorSearch(e.target.value)}
            />
            {doctorSearch && (
              <button
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
                onClick={() => setDoctorSearch("")}
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
          {(selectedSpecialization ||
            selectedMode ||
            selectedDateRange ||
            customDateRange ||
            selectedClinic) && (
            <button className="clear-filters-button" onClick={clearAllFilters}>
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
                  value={selectedSpecialization}
                  onChange={(e) => setSelectedSpecialization(e.target.value)}
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
                  value={selectedMode}
                  onChange={(e) => setSelectedMode(e.target.value)}
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
                  value={selectedDateRange}
                  onChange={(e) => {
                    setSelectedDateRange(e.target.value);
                    // Clear custom range when selecting preset
                    if (e.target.value) {
                      setCustomDateRange(null);
                    }
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
                    customDateRange
                      ? [dayjs(customDateRange[0]), dayjs(customDateRange[1])]
                      : null
                  }
                  onChange={(dates) => {
                    if (dates && dates.length === 2) {
                      setCustomDateRange([
                        dates[0].toDate(),
                        dates[1].toDate(),
                      ]);
                      // Clear preset when selecting custom range
                      setSelectedDateRange("");
                    } else {
                      setCustomDateRange(null);
                    }
                  }}
                  format="DD/MM/YYYY"
                  placeholder={["Từ ngày", "Đến ngày"]}
                  style={{ width: "100%" }}
                  className="custom-date-range-picker"
                />
              </div>

              {/* Clinic Filter (only for offline mode) */}
              {selectedMode === "offline" && (
                <div className="filter-group">
                  <label className="filter-label">Phòng khám</label>
                  <select
                    value={selectedClinic}
                    onChange={(e) => setSelectedClinic(e.target.value)}
                    className="filter-select"
                  >
                    <option value="">Tất cả phòng khám</option>
                    {getUniqueClinics().map((clinic) => (
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
            onClick={() => setActiveTab("upcoming")}
            className={`tab-button ${activeTab === "upcoming" ? "active" : ""}`}
          >
            <Calendar size={16} style={{ marginRight: "0.5rem" }} />
            Sắp tới ({filteredUpcomingAppointments.length})
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`tab-button ${
              activeTab === "completed" ? "active" : ""
            }`}
          >
            <CheckCircle size={16} style={{ marginRight: "0.5rem" }} />
            Đã khám ({filteredCompletedAppointments.length})
          </button>
          <button
            onClick={() => setActiveTab("cancelled")}
            className={`tab-button ${
              activeTab === "cancelled" ? "active" : ""
            }`}
          >
            <X size={16} style={{ marginRight: "0.5rem" }} />
            Đã hủy ({filteredCancelledAppointments.length})
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
                    {a.patientId?.relationshipToOwner &&
                      a.patientId.relationshipToOwner !== "self" && (
                        <span
                          style={{
                            fontSize: 12,
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: "#f59e0b",
                            color: "#ffffff",
                          }}
                          title="Lịch hẹn đã được đặt hộ"
                        >
                          👤 Đặt hộ
                        </span>
                      )}
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

                    {/* Regular Video Button for other online appointments */}
                    {a.mode === "online" && a.status !== "accepted" ? (
                      <Button variant="outline" size="sm" disabled>
                        <Video size={16} style={{ marginRight: 6 }} />
                        Chờ duyệt
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
              {doctorSearch
                ? `Không tìm thấy lịch hẹn nào với bác sĩ "${doctorSearch}"`
                : activeTab === "upcoming"
                ? "Bạn chưa có lịch hẹn nào. Hãy đặt lịch khám để bắt đầu!"
                : activeTab === "completed"
                ? "Chưa có lịch hẹn đã khám"
                : "Chưa có lịch hẹn đã hủy"}
            </p>
          </div>
        )}
      </div>

      {/* Appointment Detail Modal */}
      <AppointmentDetailModal
        visible={showDetailModal}
        onClose={handleCloseDetail}
        appointmentId={selectedAppointmentId}
      />

      {/* Review Modal */}
      <ReviewModal
        visible={showReviewModal}
        onClose={handleCloseReview}
        appointment={selectedAppointmentForReview}
        onReviewSubmitted={handleReviewSubmitted}
      />
    </div>
  );
}
