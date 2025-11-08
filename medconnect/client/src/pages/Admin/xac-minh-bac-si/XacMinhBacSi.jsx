import React, { useState, useEffect } from "react";
import { Tabs, Button, Avatar, Modal, message, Spin, Alert, Input } from "antd";
const { Search } = Input;
import {
  CheckOutlined,
  CloseOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  DownloadOutlined,
  EyeOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import {
  getPendingDoctors,
  getVerifiedDoctors,
  getRejectedDoctors,
  approveDoctor,
  rejectDoctor,
} from "../../../lib/api";
import "./XacMinhBacSi.scss";
import "./XacMinhBacSi.css";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

const XacMinhBacSi = () => {
  const [activeTab, setActiveTab] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingDoctors, setPendingDoctors] = useState([]);
  const [verifiedDoctors, setVerifiedDoctors] = useState([]);
  const [rejectedDoctors, setRejectedDoctors] = useState([]);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      setLoading(true);

      const pending = await getPendingDoctors();
      setPendingDoctors(pending.data || pending || []);

      const verified = await getVerifiedDoctors();
      setVerifiedDoctors(verified.data || verified || []);

      const rejected = await getRejectedDoctors();
      setRejectedDoctors(rejected.data || rejected || []);
    } catch (err) {
      console.error("Error fetching doctors:", err);
      setError("Không thể tải danh sách bác sĩ");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (doctorId) => {
    try {
      await approveDoctor(doctorId);
      message.success("Đã phê duyệt bác sĩ thành công");
      fetchDoctors();
    } catch (err) {
      console.error("Error approving doctor:", err);
      message.error("Có lỗi xảy ra khi phê duyệt");
    }
  };

  const handleReject = async (doctorId, closeModal = false) => {
    let rejectionReasonValue = "";

    return new Promise((resolve) => {
      Modal.confirm({
        title: "Từ chối bác sĩ",
        width: 600,
        content: (
          <div>
            <p style={{ marginBottom: "12px" }}>Vui lòng nhập lý do từ chối:</p>
            <Input.TextArea
              rows={5}
              placeholder="Nhập lý do từ chối bác sĩ này..."
              onChange={(e) => {
                rejectionReasonValue = e.target.value;
              }}
              autoFocus
            />
            <p style={{ marginTop: "8px", color: "#666", fontSize: "12px" }}>
              Lưu ý: Lý do từ chối sẽ được gửi đến email của bác sĩ
            </p>
          </div>
        ),
        okText: "Xác nhận từ chối",
        cancelText: "Hủy",
        okButtonProps: { danger: true },
        onOk: async () => {
          if (!rejectionReasonValue.trim()) {
            message.error("Vui lòng nhập lý do từ chối");
            resolve(false);
            return Promise.reject();
          }

          try {
            await rejectDoctor(doctorId, rejectionReasonValue.trim());
            message.success("Đã từ chối bác sĩ thành công");
            if (closeModal) {
              setDetailModalVisible(false);
              setSelectedDoctor(null);
            }
            fetchDoctors();
            resolve(true);
          } catch (err) {
            console.error("Error rejecting doctor:", err);
            let errorMessage = "Có lỗi xảy ra khi từ chối";
            try {
              const errorData = JSON.parse(err.message);
              errorMessage = errorData.message || errorMessage;
            } catch {
              if (err.message) {
                errorMessage = err.message;
              }
            }
            message.error(errorMessage);
            resolve(false);
            return Promise.reject();
          }
        },
        onCancel: () => {
          resolve(false);
        },
      });
    });
  };

  const handleViewDetails = (doctor, statusFromTab = null) => {
    // Attach status from tab to doctor object for modal to use
    const doctorWithStatus = {
      ...doctor,
      _statusFromTab: statusFromTab,
    };
    setSelectedDoctor(doctorWithStatus);
    setDetailModalVisible(true);
  };

  const handleDetailApprove = async () => {
    if (!selectedDoctor) return;
    try {
      await approveDoctor(selectedDoctor.id || selectedDoctor._id);
      message.success("Đã phê duyệt bác sĩ thành công");
      setDetailModalVisible(false);
      setSelectedDoctor(null);
      fetchDoctors();
    } catch (err) {
      console.error("Error approving doctor:", err);
      message.error("Có lỗi xảy ra khi phê duyệt");
    }
  };

  const handleDetailReject = async () => {
    if (!selectedDoctor) return;
    await handleReject(selectedDoctor.id || selectedDoctor._id, true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Chưa có ngày";
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getDocumentUrl = (filename) => {
    if (!filename) return null;
    return `${BASE}/server-uploads/doctors/${filename}`;
  };

  const handleDownloadDocument = (url, filename) => {
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || "document";
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewDocument = (url) => {
    if (!url) {
      message.error("Không tìm thấy đường dẫn tài liệu");
      return;
    }

    // Try to open the document
    const newWindow = window.open(url, "_blank");

    // If popup was blocked or failed, show error message
    if (
      !newWindow ||
      newWindow.closed ||
      typeof newWindow.closed === "undefined"
    ) {
      message.error("Không thể mở tài liệu. Vui lòng kiểm tra lại đường dẫn.");
    }
  };

  const filterDoctors = (doctors, searchTerm) => {
    if (!searchTerm.trim()) return doctors;

    const term = searchTerm.toLowerCase().trim();
    return doctors.filter((doctor) => {
      const name = (doctor.name || doctor.fullName || "").toLowerCase();
      const specialty = (
        doctor.specialty ||
        doctor.specializationName ||
        ""
      ).toLowerCase();
      const email = (doctor.email || doctor.userId?.email || "").toLowerCase();
      const phone = (doctor.phone || doctor.userId?.phone || "").toLowerCase();

      return (
        name.includes(term) ||
        specialty.includes(term) ||
        email.includes(term) ||
        phone.includes(term)
      );
    });
  };

  const renderDoctorRow = (doctor, status) => (
    <div key={doctor.id || doctor._id} className="doctor-row">
      <div className="doctor-row-content">
        <Avatar
          size={64}
          src={doctor.avatar || doctor.avatarUrl}
          className="doctor-avatar"
        />
        <div className="doctor-info">
          <div className="doctor-name">{doctor.name || doctor.fullName}</div>
          <div className="doctor-specialty">
            {doctor.specialty || doctor.specializationName}
          </div>
        </div>
        <div className="doctor-actions-row">
          <Button
            type="default"
            icon={<EyeOutlined />}
            className="action-btn view-btn"
            onClick={() => handleViewDetails(doctor, status)}
          >
            Xem chi tiết
          </Button>
          {status === "pending" && (
            <Button
              type="default"
              icon={<ClockCircleOutlined />}
              className="action-btn status-btn"
              disabled
            >
              Chờ xác minh
            </Button>
          )}
          {status === "pending" && (
            <>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                className="action-btn approve-btn"
                onClick={() => handleApprove(doctor.id || doctor._id)}
              >
                Phê duyệt
              </Button>
              <Button
                danger
                icon={<CloseOutlined />}
                className="action-btn reject-btn"
                onClick={() => handleReject(doctor.id || doctor._id)}
              >
                Từ chối
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="verify-doctors">
        <div className="page-header">
          <h1>Xác minh bác sĩ</h1>
          <p>Xem xét và phê duyệt hồ sơ đăng ký bác sĩ</p>
        </div>
        <div style={{ textAlign: "center", padding: "50px" }}>
          <Spin size="large" />
          <p style={{ marginTop: "16px" }}>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="verify-doctors">
        <div className="page-header">
          <h1>Xác minh bác sĩ</h1>
          <p>Xem xét và phê duyệt hồ sơ đăng ký bác sĩ</p>
        </div>
        <Alert
          message="Lỗi tải dữ liệu"
          description={error}
          type="error"
          showIcon
          style={{ margin: "20px 0" }}
        />
      </div>
    );
  }

  // Filter doctors based on search term
  const filteredPendingDoctors = filterDoctors(pendingDoctors, searchTerm);
  const filteredVerifiedDoctors = filterDoctors(verifiedDoctors, searchTerm);
  const filteredRejectedDoctors = filterDoctors(rejectedDoctors, searchTerm);

  const tabItems = [
    {
      key: "pending",
      label: (
        <span className="tab-label">
          <ClockCircleOutlined /> Chờ xác minh ({filteredPendingDoctors.length})
        </span>
      ),
      children: (
        <div className="doctors-list">
          {filteredPendingDoctors.length === 0 ? (
            <div className="empty-state">
              {searchTerm
                ? "Không tìm thấy bác sĩ nào"
                : "Không có bác sĩ nào chờ xác minh"}
            </div>
          ) : (
            filteredPendingDoctors.map((doctor) =>
              renderDoctorRow(doctor, "pending")
            )
          )}
        </div>
      ),
    },
    {
      key: "verified",
      label: (
        <span className="tab-label">
          <CheckCircleOutlined /> Đã xác minh ({filteredVerifiedDoctors.length})
        </span>
      ),
      children: (
        <div className="doctors-list">
          {filteredVerifiedDoctors.length === 0 ? (
            <div className="empty-state">
              {searchTerm
                ? "Không tìm thấy bác sĩ nào"
                : "Không có bác sĩ nào đã xác minh"}
            </div>
          ) : (
            filteredVerifiedDoctors.map((doctor) =>
              renderDoctorRow(doctor, "verified")
            )
          )}
        </div>
      ),
    },
    {
      key: "rejected",
      label: (
        <span className="tab-label">
          <ExclamationCircleOutlined /> Đã từ chối (
          {filteredRejectedDoctors.length})
        </span>
      ),
      children: (
        <div className="doctors-list">
          {filteredRejectedDoctors.length === 0 ? (
            <div className="empty-state">
              {searchTerm
                ? "Không tìm thấy bác sĩ nào"
                : "Không có bác sĩ nào bị từ chối"}
            </div>
          ) : (
            filteredRejectedDoctors.map((doctor) =>
              renderDoctorRow(doctor, "rejected")
            )
          )}
        </div>
      ),
    },
  ];

  const renderDetailModal = () => {
    if (!selectedDoctor) return null;

    const doctor = selectedDoctor;

    // Get all data from database - no hardcoded values
    const doctorName = doctor.name || doctor.fullName || "Chưa có tên";
    const doctorEmail = doctor.email || doctor.userId?.email || "Chưa có email";
    const doctorPhone =
      doctor.phone || doctor.userId?.phone || "Chưa có số điện thoại";

    // Get specialty from database
    let specialty = doctor.specialty || "Chưa có chuyên khoa";
    if (
      !doctor.specialty &&
      doctor.specializationIds &&
      Array.isArray(doctor.specializationIds) &&
      doctor.specializationIds.length > 0
    ) {
      const specialtyNames = doctor.specializationIds
        .filter((s) => s && s.name)
        .map((s) => s.name || s)
        .filter((name) => name && name !== "Chưa có chuyên khoa");
      if (specialtyNames.length > 0) {
        specialty = specialtyNames.join(", ");
      }
    }

    // Get clinic name from database
    const clinicName =
      doctor.clinicName ||
      doctor.hospital ||
      doctor.clinicDefaultId?.name ||
      "Chưa có thông tin";

    // Get experience from database - extract number if it's a formatted string
    let experience = 0;
    if (
      doctor.yearsExperience !== undefined &&
      doctor.yearsExperience !== null
    ) {
      experience = doctor.yearsExperience;
    } else if (doctor.experience) {
      // If experience is a formatted string like "0 năm kinh nghiệm", extract the number
      const experienceMatch = String(doctor.experience).match(/(\d+)/);
      if (experienceMatch) {
        experience = parseInt(experienceMatch[1], 10);
      }
    }

    // Get submission date from database
    const submissionDate = formatDate(doctor.submittedDate || doctor.createdAt);

    // Get status from database - prioritize status from tab, then check isVerified and status field
    let doctorStatus = "pending";
    if (doctor._statusFromTab) {
      // Use status from the tab where doctor was viewed
      doctorStatus =
        doctor._statusFromTab === "verified"
          ? "approved"
          : doctor._statusFromTab === "rejected"
          ? "rejected"
          : "pending";
    } else if (doctor.isVerified) {
      doctorStatus = "approved";
    } else if (doctor.status === "rejected") {
      doctorStatus = "rejected";
    } else {
      doctorStatus = "pending";
    }

    // Get documents from database - no hardcoded values
    const documents = [];

    // Get license document from database - use licenseImageUrl from API exactly like verified doctors tab
    const licenseFilename = doctor.licenseNo || doctor.license;
    if (licenseFilename) {
      // Use licenseImageUrl from API if available (same as verified doctors)
      // licenseImageUrl from API is already in format: /server-uploads/doctors/filename
      let licenseUrl = null;
      if (doctor.licenseImageUrl) {
        // licenseImageUrl from API is already a path like /server-uploads/doctors/filename
        // Just add BASE URL to make it full URL - ensure path starts with /
        const imagePath = doctor.licenseImageUrl.startsWith("/")
          ? doctor.licenseImageUrl
          : `/${doctor.licenseImageUrl}`;
        licenseUrl = `${BASE}${imagePath}`;
      } else {
        // Fallback: build URL from licenseNo
        licenseUrl = getDocumentUrl(licenseFilename);
      }

      if (licenseUrl) {
        documents.push({
          name: licenseFilename,
          url: licenseUrl,
          type: "license",
          label: "Giấy phép hành nghề",
        });
      }
    }

    // Get degree document from database if available
    // Check if doctor has degreeNo field or degree in documents array
    const degreeFilename = doctor.degreeNo || doctor.degree || null;
    if (degreeFilename) {
      const degreeUrl = getDocumentUrl(degreeFilename);
      if (degreeUrl) {
        documents.push({
          name: degreeFilename,
          url: degreeUrl,
          type: "degree",
          label: "Bằng cấp",
        });
      }
    }

    // Check if there are other documents in an array
    if (
      doctor.documents &&
      Array.isArray(doctor.documents) &&
      doctor.documents.length > 0
    ) {
      doctor.documents.forEach((doc) => {
        if (doc.filename || doc.name) {
          const docUrl = getDocumentUrl(doc.filename || doc.name);
          if (docUrl) {
            documents.push({
              name: doc.filename || doc.name,
              url: docUrl,
              type: doc.type || "other",
              label: doc.label || doc.name || "Tài liệu",
            });
          }
        }
      });
    }

    return (
      <Modal
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedDoctor(null);
        }}
        footer={null}
        width={800}
        className="doctor-detail-modal"
        title={null}
        closeIcon={<CloseOutlined />}
      >
        <div className="doctor-detail-content">
          {/* Modal Header with Close Button */}
          <div className="detail-modal-header">
            <h2 className="modal-title">Chi tiết bác sĩ</h2>
          </div>

          {/* Doctor Info Header */}
          <div className="doctor-detail-header">
            <Avatar
              size={96}
              src={doctor.avatar || doctor.avatarUrl}
              className="detail-avatar"
            />
            <div className="detail-header-info">
              <div className="detail-name-row">
                <h3 className="detail-name">{doctorName}</h3>
                <span className={`status-badge ${doctorStatus}-badge`}>
                  {doctorStatus === "pending" && <ClockCircleOutlined />}
                  {doctorStatus === "approved" && <CheckCircleOutlined />}
                  {doctorStatus === "rejected" && <ExclamationCircleOutlined />}
                  {doctorStatus === "pending"
                    ? "CHỜ XÁC MINH"
                    : doctorStatus === "approved"
                    ? "Đã xác minh"
                    : "Đã từ chối"}
                </span>
              </div>
              <p className="detail-specialty-text">{specialty}</p>
              <p className="submission-date">Ngày nộp: {submissionDate}</p>
            </div>
          </div>

          {/* Medical Info Section */}
          <div className="detail-info-section">
            <h4 className="info-section-title">{specialty}</h4>
            <div className="info-list">
              <div className="info-item-row">
                <span className="info-icon">📧</span>
                <div className="info-item-content">
                  <p className="info-label">Email</p>
                  <p className="info-value">{doctorEmail}</p>
                </div>
              </div>
              <div className="info-item-row">
                <span className="info-icon">📱</span>
                <div className="info-item-content">
                  <p className="info-label">Điện thoại</p>
                  <p className="info-value">{doctorPhone}</p>
                </div>
              </div>
              <div className="info-item-row">
                <span className="info-icon">🏥</span>
                <div className="info-item-content">
                  <p className="info-label">Bệnh viện / Cơ sở</p>
                  <p className="info-value">{clinicName}</p>
                </div>
              </div>
              <div className="info-item-row">
                <span className="info-icon">⏱️</span>
                <div className="info-item-content">
                  <p className="info-label">Kinh nghiệm</p>
                  <p className="info-value">{experience} năm</p>
                </div>
              </div>
            </div>
          </div>

          {/* Documents Section */}
          <div className="detail-documents-section">
            <h4 className="section-title">Tài liệu đính kèm</h4>
            <div className="documents-list">
              {documents.length > 0 ? (
                documents.map((doc, index) => (
                  <div key={index} className="document-item">
                    <div className="document-item-left">
                      <DownloadOutlined className="document-icon" />
                      <span className="document-name">{doc.name}</span>
                    </div>
                    <div className="document-actions">
                      <Button
                        type="text"
                        icon={<FileTextOutlined />}
                        className="document-view-btn"
                        onClick={() => handleViewDocument(doc.url)}
                        title="Xem tài liệu"
                      />
                      <Button
                        type="text"
                        icon={<DownloadOutlined />}
                        className="document-download-btn"
                        onClick={() =>
                          handleDownloadDocument(doc.url, doc.name)
                        }
                        title="Tải tài liệu"
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-documents">Chưa có tài liệu đính kèm</div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {doctorStatus === "pending" && (
            <div className="detail-action-buttons">
              <Button
                className="reject-profile-btn"
                icon={<CloseOutlined />}
                onClick={handleDetailReject}
              >
                Từ chối hồ sơ
              </Button>
              <Button
                className="approve-profile-btn"
                icon={<CheckOutlined />}
                onClick={handleDetailApprove}
              >
                Phê duyệt hồ sơ
              </Button>
            </div>
          )}
        </div>
      </Modal>
    );
  };

  return (
    <div className="verify-doctors">
      <div className="page-header">
        <h1>Xác minh bác sĩ</h1>
        <p>Xem xét và phê duyệt hồ sơ đăng ký bác sĩ</p>
      </div>

      <div className="verification-tabs">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          className="tabs-content"
          tabBarExtraContent={{
            right: (
              <div className="search-container">
                <Search
                  placeholder="Tìm kiếm bác sĩ..."
                  allowClear
                  enterButton
                  size="large"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onSearch={setSearchTerm}
                  style={{ width: 300 }}
                />
              </div>
            ),
          }}
        />
      </div>

      {renderDetailModal()}
    </div>
  );
};

export default XacMinhBacSi;
