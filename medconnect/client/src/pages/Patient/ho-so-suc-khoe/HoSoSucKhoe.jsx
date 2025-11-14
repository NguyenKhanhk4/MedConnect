import React, { useState, useMemo } from "react";
import {
  FileText,
  Calendar,
  User,
  Eye,
  FileDown,
  MessageCircle,
  Video,
  X,
  Search,
  Filter,
  ChevronDown,
} from "lucide-react";
import { useConsultationSummaries } from "../../../hooks/useConsultationSummaries";
import { useConsultationAdvice } from "../../../hooks/useConsultationAdvice";
import { useSpecializations } from "../../../hooks/useSpecializations";
import { applyFilters } from "../../../utils/filterUtils";
import { DatePicker } from "antd";
import dayjs from "dayjs";
const { RangePicker } = DatePicker;
import "./HoSoSucKhoe.scss";

export function HoSoSucKhoe() {
  const [activeButton, setActiveButton] = useState(null);
  const [activeTab, setActiveTab] = useState("medical");
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [selectedAdvice, setSelectedAdvice] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [modalType, setModalType] = useState("summary");
  const [showFilters, setShowFilters] = useState(false);

  // Filter state
  const [filters, setFilters] = useState({
    doctorSearch: "",
    selectedSpecialization: "",
    selectedDateRange: "",
    customDateRange: null,
  });

  // Fetch consultation summaries from API
  const {
    data: consultationData,
    isLoading,
    error,
  } = useConsultationSummaries(1, 20);
  const allMedicalHistory = consultationData?.consultationSummaries || [];

  // Fetch consultation advice from API
  const {
    data: consultationAdviceData,
    isLoading: isLoadingAdvice,
    error: errorAdvice,
  } = useConsultationAdvice(1, 20);
  const allConsultationHistory =
    consultationAdviceData?.consultationAdvice || [];

  // Fetch specializations for filter
  const { specializations } = useSpecializations();

  // Date fields for medical history
  const medicalHistoryDateFields = [
    "fullDetails?.visitDate",
    "visitDate",
    "appointmentId?.scheduledStart",
    "dateTime",
    "fullDetails?.startedAt",
    "date",
  ];

  // Apply all filters to medical history
  const medicalHistory = useMemo(() => {
    return applyFilters(
      allMedicalHistory,
      filters,
      specializations,
      medicalHistoryDateFields
    );
  }, [allMedicalHistory, filters, specializations]);

  // Date fields for consultation history
  const consultationHistoryDateFields = [
    "fullDetails?.startedAt",
    "startedAt",
    "appointmentId?.scheduledStart",
    "visitDate",
    "dateTime",
    "date",
  ];

  // Apply all filters to consultation history
  const consultationHistory = useMemo(() => {
    return applyFilters(
      allConsultationHistory,
      filters,
      specializations,
      consultationHistoryDateFields
    );
  }, [allConsultationHistory, filters, specializations]);

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({
      doctorSearch: "",
      selectedSpecialization: "",
      selectedDateRange: "",
      customDateRange: null,
    });
  };

  const handleViewDetails = (recordId) => {
    console.log("Viewing details for record:", recordId);

    if (activeTab === "medical") {
      // Find the record with full details from medical history
      const record = medicalHistory.find((item) => item.id === recordId);
      if (record && record.fullDetails) {
        setSelectedSummary(record);
        setSelectedAdvice(null);
        setModalType("summary");
        setShowDetailModal(true);
      }
    } else if (activeTab === "consultation") {
      // Find the record with full details from consultation history
      const record = consultationHistory.find((item) => item.id === recordId);
      if (record && record.fullDetails) {
        setSelectedAdvice(record);
        setSelectedSummary(null);
        setModalType("advice");
        setShowDetailModal(true);
      }
    }

    // Toggle active state
    setActiveButton(activeButton === recordId ? null : recordId);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedSummary(null);
    setSelectedAdvice(null);
    setModalType("summary");
  };

  const handleDownloadDocument = (documentName) => {
    console.log("Downloading document:", documentName);
    // Implement document download functionality
  };

  return (
    <div className="health-profile-container">
      {/* Header */}
      <div className="health-profile-header">
        <div className="header-content">
          <div className="header-text">
            <h1 className="page-title" style={{ color: "#000000" }}>
              Hồ sơ khám bệnh
            </h1>
            <p className="page-subtitle">
              Theo dõi và quản lý thông tin sức khỏe của bạn
            </p>
          </div>
          {/* Doctor Search Filter */}
          <div className="doctor-search-filter">
            <Search className="search-icon" size={18} strokeWidth={2.5} />
            <input
              type="text"
              className="doctor-search-input"
              placeholder="Tìm bác sĩ theo tên"
              value={filters.doctorSearch}
              onChange={(e) =>
                setFilters({ ...filters, doctorSearch: e.target.value })
              }
            />
            {filters.doctorSearch && (
              <button
                className="clear-search-button"
                onClick={() => setFilters({ ...filters, doctorSearch: "" })}
                title="Xóa bộ lọc"
              >
                <X className="clear-icon" />
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
          {(filters.selectedSpecialization ||
            filters.selectedDateRange ||
            filters.customDateRange) && (
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
                  <option value="year">Năm nay</option>
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
            </div>
          </div>
        )}
      </div>

      {/* History Section with Tabs */}
      <div className="history-section">
        <div className="section-header">
          <h2 className="section-title">Lịch sử</h2>
          <div className="tab-navigation">
            <button
              className={`tab-button ${
                activeTab === "medical" ? "active" : ""
              }`}
              onClick={() => setActiveTab("medical")}
            >
              <FileText className="tab-icon" />
              Lịch sử khám bệnh
            </button>
            <button
              className={`tab-button ${
                activeTab === "consultation" ? "active" : ""
              }`}
              onClick={() => setActiveTab("consultation")}
            >
              <MessageCircle className="tab-icon" />
              Lịch sử tư vấn
            </button>
          </div>
        </div>

        {/* Medical History Tab */}
        {activeTab === "medical" && (
          <div className="tab-content">
            {isLoading ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Đang tải lịch sử khám bệnh...</p>
              </div>
            ) : error ? (
              <div className="error-state">
                <p>Có lỗi khi tải dữ liệu. Vui lòng thử lại sau.</p>
              </div>
            ) : medicalHistory.length === 0 ? (
              <div className="empty-state">
                <p>Chưa có lịch sử khám bệnh nào.</p>
              </div>
            ) : (
              <div className="history-list">
                {medicalHistory.map((record) => (
                  <div key={record.id} className="history-card">
                    <div className="card-header">
                      <div className="card-title-section">
                        <div className="card-icon">
                          <FileText className="card-icon-symbol" />
                        </div>
                        <div className="card-title">
                          <div className="specialty-name">
                            {record.specialty}
                          </div>
                          <div className="card-meta">
                            <div className="meta-item">
                              <Calendar className="meta-icon" />
                              <span>{record.date}</span>
                            </div>
                            <div className="meta-item">
                              <User className="meta-icon" />
                              <span>{record.doctor}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <button
                        className={`view-details-button ${
                          activeButton === record.id ? "active" : ""
                        }`}
                        onClick={() => handleViewDetails(record.id)}
                      >
                        <Eye className="view-icon" />
                        Xem chi tiết
                      </button>
                    </div>

                    <div className="card-content">
                      <div className="content-item">
                        <div className="content-label">Chẩn đoán:</div>
                        <div className="content-value">{record.diagnosis}</div>
                      </div>

                      <div className="content-item">
                        <div className="content-label">Đơn thuốc:</div>
                        <div className="content-value">
                          {record.prescription}
                        </div>
                      </div>

                      <div className="content-item">
                        <div className="content-label">Tài liệu đính kèm:</div>
                        <div className="documents-list">
                          {record.documents.map((doc, index) => (
                            <div key={index} className="document-item">
                              <FileText className="document-icon" />
                              <span
                                className="document-link"
                                onClick={() => handleDownloadDocument(doc.name)}
                              >
                                {doc.name}
                              </span>
                              <FileDown className="download-icon" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Consultation History Tab */}
        {activeTab === "consultation" && (
          <div className="tab-content">
            {isLoadingAdvice ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Đang tải lịch sử tư vấn...</p>
              </div>
            ) : errorAdvice ? (
              <div className="error-state">
                <p>Có lỗi khi tải dữ liệu. Vui lòng thử lại sau.</p>
              </div>
            ) : consultationHistory.length === 0 ? (
              <div className="empty-state">
                <p>Chưa có lịch sử tư vấn nào.</p>
              </div>
            ) : (
              <div className="history-list">
                {consultationHistory.map((record) => (
                  <div
                    key={record.id}
                    className="history-card consultation-card"
                  >
                    <div className="card-header">
                      <div className="card-title-section">
                        <div className="card-icon">
                          {record.type === "Video Call" ? (
                            <Video className="card-icon-symbol" />
                          ) : (
                            <MessageCircle className="card-icon-symbol" />
                          )}
                        </div>
                        <div className="card-title">
                          <div className="specialty-name">
                            {record.specialty}
                          </div>
                          <div className="card-meta">
                            <div className="meta-item">
                              <Calendar className="meta-icon" />
                              <span>{record.dateTime || record.date}</span>
                            </div>
                            <div className="meta-item">
                              <User className="meta-icon" />
                              <span>{record.doctor}</span>
                            </div>
                            <div className="meta-item">
                              <span className="consultation-type">
                                {record.type}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <button
                        className={`view-details-button ${
                          activeButton === record.id ? "active" : ""
                        }`}
                        onClick={() => handleViewDetails(record.id)}
                      >
                        <Eye className="view-icon" />
                        Xem chi tiết
                      </button>
                    </div>

                    <div className="card-content">
                      <div className="content-item">
                        <div className="content-label">Chủ đề tư vấn:</div>
                        <div className="content-value">{record.topic}</div>
                      </div>

                      <div className="content-item">
                        <div className="content-label">Thời gian:</div>
                        <div className="content-value">
                          {record.dateTime
                            ? `${record.dateTime} (${record.duration})`
                            : record.duration}
                        </div>
                      </div>

                      <div className="content-item">
                        <div className="content-label">Tóm tắt:</div>
                        <div className="content-value">{record.summary}</div>
                      </div>

                      <div className="content-item">
                        <div className="content-label">Tài liệu đính kèm:</div>
                        <div className="documents-list">
                          {record.documents.map((doc, index) => (
                            <div key={index} className="document-item">
                              <FileText className="document-icon" />
                              <span
                                className="document-link"
                                onClick={() => handleDownloadDocument(doc.name)}
                              >
                                {doc.name}
                              </span>
                              <FileDown className="download-icon" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && (selectedSummary || selectedAdvice) && (
        <div className="modal-overlay" onClick={closeDetailModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {modalType === "summary"
                  ? "Chi tiết hồ sơ khám bệnh"
                  : "Chi tiết buổi tư vấn"}
              </h3>
              <button className="modal-close" onClick={closeDetailModal}>
                <X className="close-icon" />
              </button>
            </div>

            <div className="modal-body">
              {modalType === "summary" && selectedSummary?.fullDetails && (
                <div className="detail-content">
                  {/* Basic Info */}
                  <div className="detail-section">
                    <h4>Thông tin cơ bản</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <strong>Ngày khám:</strong>
                        <span>
                          {new Date(
                            selectedSummary.fullDetails.visitDate
                          ).toLocaleDateString("vi-VN")}
                        </span>
                      </div>
                      <div className="detail-item">
                        <strong>Lý do khám:</strong>
                        <span>
                          {selectedSummary.fullDetails.reasonForVisit ||
                            "Không có thông tin"}
                        </span>
                      </div>
                      {selectedSummary.fullDetails.appointment
                        ?.scheduledEnd && (
                        <div className="detail-item">
                          <strong>Kết thúc:</strong>
                          <span>
                            {new Date(
                              selectedSummary.fullDetails.appointment.scheduledEnd
                            ).toLocaleDateString("vi-VN")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Diagnoses */}
                  {selectedSummary.fullDetails.diagnoses &&
                    selectedSummary.fullDetails.diagnoses.length > 0 && (
                      <div className="detail-section">
                        <h4>Chẩn đoán</h4>
                        <div className="diagnoses-list">
                          {selectedSummary.fullDetails.diagnoses.map(
                            (diagnosis, index) => (
                              <div key={index} className="diagnosis-item">
                                <strong>{diagnosis.name}</strong>
                                {diagnosis.icd10 && (
                                  <span className="icd-code">
                                    (ICD-10: {diagnosis.icd10})
                                  </span>
                                )}
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {/* Vitals */}
                  {selectedSummary.fullDetails.vitals && (
                    <div className="detail-section">
                      <h4>Chỉ số sinh học</h4>
                      <div className="vitals-grid">
                        {selectedSummary.fullDetails.vitals.height && (
                          <div className="vital-item">
                            <strong>Chiều cao:</strong>{" "}
                            {selectedSummary.fullDetails.vitals.height} cm
                          </div>
                        )}
                        {selectedSummary.fullDetails.vitals.weight && (
                          <div className="vital-item">
                            <strong>Cân nặng:</strong>{" "}
                            {selectedSummary.fullDetails.vitals.weight} kg
                          </div>
                        )}
                        {selectedSummary.fullDetails.vitals.bloodPressure && (
                          <div className="vital-item">
                            <strong>Huyết áp:</strong>{" "}
                            {selectedSummary.fullDetails.vitals.bloodPressure}
                          </div>
                        )}
                        {selectedSummary.fullDetails.vitals.heartRate && (
                          <div className="vital-item">
                            <strong>Nhịp tim:</strong>{" "}
                            {selectedSummary.fullDetails.vitals.heartRate} bpm
                          </div>
                        )}
                        {selectedSummary.fullDetails.vitals.temperature && (
                          <div className="vital-item">
                            <strong>Nhiệt độ:</strong>{" "}
                            {selectedSummary.fullDetails.vitals.temperature}°C
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Lab Results */}
                  {selectedSummary.fullDetails.labResults &&
                    selectedSummary.fullDetails.labResults.length > 0 && (
                      <div className="detail-section">
                        <h4>Kết quả xét nghiệm</h4>
                        <div className="lab-results">
                          {selectedSummary.fullDetails.labResults.map(
                            (lab, index) => (
                              <div key={index} className="lab-item">
                                <div className="lab-header">
                                  <strong>{lab.testName}</strong>
                                  <span className="lab-date">
                                    {new Date(
                                      lab.performedAt
                                    ).toLocaleDateString("vi-VN")}
                                  </span>
                                </div>
                                <div className="lab-result">
                                  <span className="result-value">
                                    {lab.result}
                                  </span>
                                  {lab.referenceRange && (
                                    <span className="reference-range">
                                      (Bình thường: {lab.referenceRange})
                                    </span>
                                  )}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {/* Imaging Results */}
                  {selectedSummary.fullDetails.imagingResults &&
                    selectedSummary.fullDetails.imagingResults.length > 0 && (
                      <div className="detail-section">
                        <h4>Kết quả hình ảnh</h4>
                        <div className="imaging-results">
                          {selectedSummary.fullDetails.imagingResults.map(
                            (img, index) => (
                              <div key={index} className="imaging-item">
                                <div className="imaging-header">
                                  <strong>{img.type}</strong>
                                  <span className="imaging-date">
                                    {new Date(
                                      img.performedAt
                                    ).toLocaleDateString("vi-VN")}
                                  </span>
                                </div>
                                <div className="imaging-conclusion">
                                  <strong>Kết luận:</strong> {img.conclusion}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {/* Medications */}
                  {selectedSummary.fullDetails.medications &&
                    selectedSummary.fullDetails.medications.length > 0 && (
                      <div className="detail-section">
                        <h4>Đơn thuốc</h4>
                        <div className="medications-list">
                          {selectedSummary.fullDetails.medications.map(
                            (med, index) => (
                              <div key={index} className="medication-item">
                                <div className="med-name">
                                  <strong>{med.name}</strong>
                                </div>
                                <div className="med-details">
                                  <span>Số lượng: {med.quantity}</span>
                                  {med.notes && (
                                    <span>Ghi chú: {med.notes}</span>
                                  )}
                                </div>
                                <div className="med-instruction">
                                  <strong>Hướng dẫn:</strong> {med.instruction}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {/* Procedures */}
                  {selectedSummary.fullDetails.procedures &&
                    selectedSummary.fullDetails.procedures.length > 0 && (
                      <div className="detail-section">
                        <h4>Thủ thuật</h4>
                        <div className="procedures-list">
                          {selectedSummary.fullDetails.procedures.map(
                            (proc, index) => (
                              <div key={index} className="procedure-item">
                                <div className="procedure-header">
                                  <strong>{proc.name}</strong>
                                  <span className="procedure-date">
                                    {new Date(
                                      proc.performedAt
                                    ).toLocaleDateString("vi-VN")}
                                  </span>
                                </div>
                                <div className="procedure-description">
                                  {proc.description}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {/* Summary and Instructions */}
                  <div className="detail-section">
                    <h4>Tóm tắt và hướng dẫn</h4>
                    {selectedSummary.fullDetails.summaryText && (
                      <div className="summary-text">
                        <strong>Tóm tắt:</strong>
                        <p>{selectedSummary.fullDetails.summaryText}</p>
                      </div>
                    )}
                    {selectedSummary.fullDetails.treatmentMethod && (
                      <div className="treatment-method">
                        <strong>Phương pháp điều trị:</strong>
                        <p>{selectedSummary.fullDetails.treatmentMethod}</p>
                      </div>
                    )}
                    {selectedSummary.fullDetails.followUpInstructions && (
                      <div className="follow-up">
                        <strong>Hướng dẫn theo dõi:</strong>
                        <p>
                          {selectedSummary.fullDetails.followUpInstructions}
                        </p>
                      </div>
                    )}
                    {selectedSummary.fullDetails.nextAppointmentDate && (
                      <div className="next-appointment">
                        <strong>Lịch hẹn tái khám:</strong>
                        <span>
                          {new Date(
                            selectedSummary.fullDetails.nextAppointmentDate
                          ).toLocaleDateString("vi-VN")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {modalType === "advice" && selectedAdvice?.fullDetails && (
                <div className="detail-content">
                  {/* Basic Info */}
                  <div className="detail-section">
                    <h4>Thông tin cơ bản</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <strong>Ngày tư vấn:</strong>
                        <span>
                          {new Date(
                            selectedAdvice.fullDetails.startedAt
                          ).toLocaleDateString("vi-VN")}
                        </span>
                      </div>
                      <div className="detail-item">
                        <strong>Lý do khám:</strong>
                        <span>
                          {selectedAdvice.fullDetails.appointment?.reason ||
                            "Không có thông tin"}
                        </span>
                      </div>
                      <div className="detail-item">
                        <strong>Thời gian:</strong>
                        <span>
                          {selectedAdvice.fullDetails.durationMinutes
                            ? `${selectedAdvice.fullDetails.durationMinutes} phút`
                            : "Không xác định"}
                        </span>
                      </div>
                      {selectedAdvice.fullDetails.endedAt && (
                        <div className="detail-item">
                          <strong>Kết thúc:</strong>
                          <span>
                            {new Date(
                              selectedAdvice.fullDetails.endedAt
                            ).toLocaleDateString("vi-VN")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="detail-section">
                    <h4>Tóm tắt buổi tư vấn</h4>
                    <div className="summary-text">
                      <p>{selectedAdvice.fullDetails.summary}</p>
                    </div>
                  </div>

                  {/* Diagnoses */}
                  {selectedAdvice.fullDetails.diagnoses &&
                    selectedAdvice.fullDetails.diagnoses.length > 0 && (
                      <div className="detail-section">
                        <h4>Chẩn đoán tham khảo</h4>
                        <div className="diagnoses-list">
                          {selectedAdvice.fullDetails.diagnoses.map(
                            (diagnosis, index) => (
                              <div key={index} className="diagnosis-item">
                                <strong>{diagnosis.name}</strong>
                                {diagnosis.icd10 && (
                                  <span className="icd-code">
                                    (ICD-10: {diagnosis.icd10})
                                  </span>
                                )}
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {/* Medications */}
                  {selectedAdvice.fullDetails.medications &&
                    selectedAdvice.fullDetails.medications.length > 0 && (
                      <div className="detail-section">
                        <h4>Đơn thuốc</h4>
                        <div className="medications-list">
                          {selectedAdvice.fullDetails.medications.map(
                            (med, index) => (
                              <div key={index} className="medication-item">
                                <div className="med-name">
                                  <strong>{med.name}</strong>
                                </div>
                                <div className="med-details">
                                  <span>Số lượng: {med.quantity}</span>
                                  {med.notes && (
                                    <span>Ghi chú: {med.notes}</span>
                                  )}
                                </div>
                                <div className="med-instruction">
                                  <strong>Hướng dẫn:</strong> {med.instruction}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {/* Notes */}
                  {selectedAdvice.fullDetails.notes && (
                    <div className="detail-section">
                      <h4>Ghi chú bổ sung</h4>
                      <div className="summary-text">
                        <p>{selectedAdvice.fullDetails.notes}</p>
                      </div>
                    </div>
                  )}

                  {/* Attachment */}
                  {selectedAdvice.fullDetails.attachmentUrl && (
                    <div className="detail-section">
                      <h4>Tài liệu đính kèm</h4>
                      <div className="documents-list">
                        <div className="document-item">
                          <FileText className="document-icon" />
                          <span
                            className="document-link"
                            onClick={() =>
                              handleDownloadDocument("Tài liệu tư vấn.pdf")
                            }
                          >
                            Tài liệu tư vấn.pdf
                          </span>
                          <FileDown className="download-icon" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
