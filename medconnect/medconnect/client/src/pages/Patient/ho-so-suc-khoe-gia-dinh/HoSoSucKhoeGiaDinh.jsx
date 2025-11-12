import React, { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Calendar,
  User,
  Eye,
  FileDown,
  MessageCircle,
  Video,
  X,
  Users,
  ChevronDown,
  Trash2,
  Search,
  Filter,
} from "lucide-react";
import { useMultipleFamilyConsultationSummaries } from "../../../hooks/useMultipleFamilyConsultationSummaries";
import { useMultipleFamilyConsultationAdvice } from "../../../hooks/useMultipleFamilyConsultationAdvice";
import { useFamilyMembers } from "../../../hooks/useFamilyMembers";
import { useSpecializations } from "../../../hooks/useSpecializations";
import { deleteFamilyMember } from "../../../lib/api";
import { DatePicker } from "antd";
import dayjs from "dayjs";
const { RangePicker } = DatePicker;
import { getRelationshipText } from "../../../utils/familyMemberUtils";
import { applyFilters } from "../../../utils/filterUtils";
import { CustomAlert } from "../../../components/ui/CustomAlert";
import "./HoSoSucKhoeGiaDinh.scss";

export function HoSoSucKhoeGiaDinh() {
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [activeButton, setActiveButton] = useState(null);
  const [activeTab, setActiveTab] = useState("medical");
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [selectedAdvice, setSelectedAdvice] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [modalType, setModalType] = useState("summary");
  const [showSelector, setShowSelector] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState(null);

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

  // Filter state
  const [filters, setFilters] = useState({
    doctorSearch: "",
    selectedSpecialization: "",
    selectedDateRange: "",
    customDateRange: null,
    selectedConsultationType: "",
  });

  // Fetch family members
  const { familyMembers, isLoadingMembers, refreshFamilyMembers } =
    useFamilyMembers();

  // Fetch specializations
  const { specializations } = useSpecializations();

  // Auto-select first family member if available
  useEffect(() => {
    if (familyMembers.length > 0 && !selectedPatientId) {
      setSelectedPatientId(familyMembers[0]._id);
    }
  }, [familyMembers, selectedPatientId]);

  // Reset all filters when selected family member changes
  useEffect(() => {
    setFilters({
      doctorSearch: "",
      selectedSpecialization: "",
      selectedDateRange: "",
      customDateRange: null,
      selectedConsultationType: "",
    });
  }, [selectedPatientId]);

  // Get selected member and all their Patient IDs
  const selectedMember = familyMembers.find(
    (member) => member._id === selectedPatientId
  );
  const allPatientIds = selectedMember?.allPatientIds || [];

  // Fetch consultation summaries for ALL Patient IDs of selected family member
  const {
    consultationSummaries: allSummariesData,
    isLoading,
    error,
  } = useMultipleFamilyConsultationSummaries(allPatientIds, 1, 1000);
  const allMedicalHistory = allSummariesData || [];

  // Fetch consultation advice for ALL Patient IDs of selected family member
  const {
    consultationAdvice: allAdviceData,
    isLoading: isLoadingAdvice,
    error: errorAdvice,
  } = useMultipleFamilyConsultationAdvice(allPatientIds, 1, 1000);
  const allConsultationHistory = allAdviceData || [];

  // Apply all filters to medical history
  const medicalHistory = useMemo(() => {
    return applyFilters(allMedicalHistory, filters, specializations, [
      "fullDetails?.visitDate",
      "visitDate",
      "appointmentId?.scheduledStart",
      "dateTime",
      "fullDetails?.startedAt",
      "date",
    ]);
  }, [allMedicalHistory, filters, specializations]);

  // Apply all filters to consultation history
  const consultationHistory = useMemo(() => {
    return applyFilters(allConsultationHistory, filters, specializations, [
      "fullDetails?.startedAt",
      "startedAt",
      "appointmentId?.scheduledStart",
      "visitDate",
      "dateTime",
      "date",
    ]);
  }, [allConsultationHistory, filters, specializations]);

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({
      doctorSearch: "",
      selectedSpecialization: "",
      selectedDateRange: "",
      customDateRange: null,
      selectedConsultationType: "",
    });
  };

  const handleViewDetails = (recordId) => {
    console.log("Viewing details for record:", recordId);

    if (activeTab === "medical") {
      const record = medicalHistory.find((item) => item.id === recordId);
      if (record && record.fullDetails) {
        setSelectedSummary(record);
        setSelectedAdvice(null);
        setModalType("summary");
        setShowDetailModal(true);
      }
    } else if (activeTab === "consultation") {
      const record = consultationHistory.find((item) => item.id === recordId);
      if (record && record.fullDetails) {
        setSelectedAdvice(record);
        setSelectedSummary(null);
        setModalType("advice");
        setShowDetailModal(true);
      }
    }

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

  // Helper function to update filters
  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleDeleteMember = async (memberId, memberName, e) => {
    e.stopPropagation(); // Prevent dropdown from closing
    
    showConfirm(
      `Bạn có chắc chắn muốn xóa ${memberName}? Hành động này sẽ hủy tất cả các lịch hẹn chưa hoàn thành và không thể hoàn tác.`,
      async () => {
        try {
          setIsDeleting(true);
          // Delete all Patient records for this family member
          const member = familyMembers.find((m) => m._id === memberId);
          if (member && member.allPatientIds) {
            // Delete all Patient IDs associated with this family member
            for (const patientId of member.allPatientIds) {
              await deleteFamilyMember(patientId);
            }
          } else {
            // Fallback: delete by the main ID
            await deleteFamilyMember(memberId);
          }

          // Refresh family members list from server
          const updatedMembers = await refreshFamilyMembers();

          // If deleted member was selected, select first available or clear selection
          if (selectedPatientId === memberId) {
            if (updatedMembers.length > 0) {
              setSelectedPatientId(updatedMembers[0]._id);
            } else {
              setSelectedPatientId(null);
            }
          }

          showAlert("Đã xóa người thân thành công");
          setShowSelector(false);
        } catch (error) {
          console.error("Error deleting family member:", error);
          showAlert("Có lỗi xảy ra khi xóa người thân. Vui lòng thử lại.");
        } finally {
          setIsDeleting(false);
          setMemberToDelete(null);
        }
      }
    );
  };

  return (
    <div className="health-profile-container">
      {/* Header */}
      <div className="health-profile-header">
        <div className="header-content">
          <div className="header-text">
            <h1 className="page-title" style={{ color: "#000000" }}>
              Hồ sơ khám bệnh người thân
            </h1>
            <p className="page-subtitle">
              Theo dõi và quản lý thông tin sức khỏe của người thân
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
              onChange={(e) => updateFilter("doctorSearch", e.target.value)}
            />
            {filters.doctorSearch && (
              <button
                className="clear-search-button"
                onClick={() => updateFilter("doctorSearch", "")}
                title="Xóa bộ lọc"
              >
                <X className="clear-icon" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters Section */}
      {selectedPatientId && selectedMember && (
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
              filters.customDateRange ||
              filters.selectedConsultationType) && (
              <button
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
                      updateFilter("selectedSpecialization", e.target.value)
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
                      updateFilter("selectedDateRange", e.target.value);
                      // Clear custom range when selecting preset
                      if (e.target.value) {
                        updateFilter("customDateRange", null);
                      }
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
                        updateFilter("customDateRange", [
                          dates[0].toDate(),
                          dates[1].toDate(),
                        ]);
                        // Clear preset when selecting custom range
                        updateFilter("selectedDateRange", "");
                      } else {
                        updateFilter("customDateRange", null);
                      }
                    }}
                    format="DD/MM/YYYY"
                    placeholder={["Từ ngày", "Đến ngày"]}
                    style={{ width: "100%" }}
                    className="custom-date-range-picker"
                  />
                </div>

                {/* Consultation Type Filter (only for consultation tab) */}
                {activeTab === "consultation" && (
                  <div className="filter-group">
                    <label className="filter-label">Loại tư vấn</label>
                    <select
                      value={filters.selectedConsultationType}
                      onChange={(e) =>
                        updateFilter("selectedConsultationType", e.target.value)
                      }
                      className="filter-select"
                    >
                      <option value="">Tất cả</option>
                      <option value="Video Call">Video Call</option>
                      <option value="Message">Message</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Family Member Selector */}
      <div className="family-member-selector-section">
        <div className="selector-container">
          <label className="selector-label">
            <Users className="selector-icon" />
            Chọn người thân:
          </label>
          {isLoadingMembers ? (
            <div className="selector-loading">Đang tải...</div>
          ) : familyMembers.length === 0 ? (
            <div className="selector-empty">
              Chưa có người thân nào. Vui lòng thêm người thân trong phần quản
              lý hồ sơ.
            </div>
          ) : (
            <div className="selector-dropdown">
              <button
                className="selector-button"
                onClick={() => setShowSelector(!showSelector)}
              >
                <span>
                  {selectedMember
                    ? `${selectedMember.fullName} (${getRelationshipText(
                        selectedMember.relationshipToOwner
                      )})`
                    : "Chọn người thân"}
                </span>
                <ChevronDown
                  className={`selector-chevron ${showSelector ? "open" : ""}`}
                />
              </button>
              {showSelector && (
                <div className="selector-options">
                  {familyMembers.map((member) => (
                    <div
                      key={member._id}
                      className={`selector-option-wrapper ${
                        selectedPatientId === member._id ? "selected" : ""
                      }`}
                    >
                      <button
                        className={`selector-option ${
                          selectedPatientId === member._id ? "selected" : ""
                        }`}
                        onClick={() => {
                          setSelectedPatientId(member._id);
                          setShowSelector(false);
                          setActiveButton(null);
                          setSelectedSummary(null);
                          setSelectedAdvice(null);
                        }}
                      >
                        <div className="option-info">
                          <div className="option-name">{member.fullName}</div>
                          <div className="option-relation">
                            {getRelationshipText(member.relationshipToOwner)}
                          </div>
                          {member.dob && (
                            <div className="option-dob">
                              {new Date(member.dob).toLocaleDateString("vi-VN")}
                            </div>
                          )}
                        </div>
                      </button>
                      <button
                        className="option-delete-button"
                        onClick={(e) =>
                          handleDeleteMember(member._id, member.fullName, e)
                        }
                        disabled={isDeleting}
                        title="Xóa người thân"
                      >
                        <Trash2 className="delete-icon" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Show content only when a family member is selected */}
      {selectedPatientId && selectedMember ? (
        <>
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
                            <div className="content-value">
                              {record.diagnosis}
                            </div>
                          </div>

                          <div className="content-item">
                            <div className="content-label">Đơn thuốc:</div>
                            <div className="content-value">
                              {record.prescription}
                            </div>
                          </div>

                          <div className="content-item">
                            <div className="content-label">
                              Tài liệu đính kèm:
                            </div>
                            <div className="documents-list">
                              {record.documents?.map((doc, index) => (
                                <div key={index} className="document-item">
                                  <FileText className="document-icon" />
                                  <span
                                    className="document-link"
                                    onClick={() =>
                                      handleDownloadDocument(doc.name)
                                    }
                                  >
                                    {doc.name}
                                  </span>
                                  <FileDown className="download-icon" />
                                </div>
                              )) || (
                                <span className="no-documents">
                                  Không có tài liệu
                                </span>
                              )}
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
                            <div className="content-value">
                              {record.summary}
                            </div>
                          </div>

                          <div className="content-item">
                            <div className="content-label">
                              Tài liệu đính kèm:
                            </div>
                            <div className="documents-list">
                              {record.documents?.map((doc, index) => (
                                <div key={index} className="document-item">
                                  <FileText className="document-icon" />
                                  <span
                                    className="document-link"
                                    onClick={() =>
                                      handleDownloadDocument(doc.name)
                                    }
                                  >
                                    {doc.name}
                                  </span>
                                  <FileDown className="download-icon" />
                                </div>
                              )) || (
                                <span className="no-documents">
                                  Không có tài liệu
                                </span>
                              )}
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

          {/* Detail Modal - Same as HealthProfile */}
          {showDetailModal && (selectedSummary || selectedAdvice) && (
            <div className="modal-overlay" onClick={closeDetailModal}>
              <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
              >
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
                          <div className="detail-item">
                            <strong>Kết quả điều trị:</strong>
                            <span>
                              {selectedSummary.fullDetails.treatmentResult ||
                                "Không có thông tin"}
                            </span>
                          </div>
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
                            {selectedSummary.fullDetails.vitals
                              .bloodPressure && (
                              <div className="vital-item">
                                <strong>Huyết áp:</strong>{" "}
                                {
                                  selectedSummary.fullDetails.vitals
                                    .bloodPressure
                                }
                              </div>
                            )}
                            {selectedSummary.fullDetails.vitals.heartRate && (
                              <div className="vital-item">
                                <strong>Nhịp tim:</strong>{" "}
                                {selectedSummary.fullDetails.vitals.heartRate}{" "}
                                bpm
                              </div>
                            )}
                            {selectedSummary.fullDetails.vitals.temperature && (
                              <div className="vital-item">
                                <strong>Nhiệt độ:</strong>{" "}
                                {selectedSummary.fullDetails.vitals.temperature}
                                °C
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
                        selectedSummary.fullDetails.imagingResults.length >
                          0 && (
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
                                      <strong>Kết luận:</strong>{" "}
                                      {img.conclusion}
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
                                      <strong>Hướng dẫn:</strong>{" "}
                                      {med.instruction}
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
                            <strong>Loại tư vấn:</strong>
                            <span>
                              {selectedAdvice.fullDetails.adviceType ===
                              "general"
                                ? "Tư vấn chung"
                                : selectedAdvice.fullDetails.adviceType ===
                                  "follow_up"
                                ? "Tái khám"
                                : selectedAdvice.fullDetails.adviceType ===
                                  "second_opinion"
                                ? "Ý kiến thứ hai"
                                : "Không xác định"}
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
                                      <strong>Hướng dẫn:</strong>{" "}
                                      {med.instruction}
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
        </>
      ) : !isLoadingMembers && familyMembers.length === 0 ? (
        <div className="no-family-members">
          <p>
            Chưa có người thân nào. Vui lòng thêm người thân trong phần quản lý
            hồ sơ.
          </p>
        </div>
      ) : null}

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
