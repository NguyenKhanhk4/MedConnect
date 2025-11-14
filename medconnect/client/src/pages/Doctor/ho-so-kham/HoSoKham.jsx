import { useState, useEffect } from "react";
import {
  Download,
  FileText,
  Calendar,
  User,
  Eye,
  MessageCircle,
  Video,
  X,
  FileDown,
  Search,
} from "lucide-react";
import { api } from "../../../lib/api";
import { CustomAlert } from "../../../components/ui/CustomAlert";
import "./HoSoKham.scss";

export default function HoSoKham() {
  const [consultationAdvice, setConsultationAdvice] = useState([]);
  const [consultationSummaries, setConsultationSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("medical"); // "medical" or "consultation"
  const [activeButton, setActiveButton] = useState(null);
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [selectedAdvice, setSelectedAdvice] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [modalType, setModalType] = useState("summary"); // "summary" or "advice"
  const [searchTerm, setSearchTerm] = useState("");
  const [alertMessage, setAlertMessage] = useState(null);

  // Helper function to show custom alert
  const showAlert = (message) => {
    setAlertMessage(message);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [adviceResponse, summariesResponse] = await Promise.all([
        api.get("/api/doctors/me/consultation-advice", {
          params: { limit: 1000 },
        }),
        api.get("/api/doctors/me/consultation-summaries", {
          params: { limit: 1000 },
        }),
      ]);

      // API response structure: { success: true, data: { advice: [...], pagination: {...} } }
      // Backend returns: ok(res, { advice, pagination: {...} })
      if (adviceResponse.success && adviceResponse.data?.advice) {
        setConsultationAdvice(
          Array.isArray(adviceResponse.data.advice)
            ? adviceResponse.data.advice
            : []
        );
      } else {
        setConsultationAdvice([]);
      }

      if (summariesResponse.success && summariesResponse.data?.summaries) {
        setConsultationSummaries(
          Array.isArray(summariesResponse.data.summaries)
            ? summariesResponse.data.summaries
            : []
        );
      } else {
        setConsultationSummaries([]);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Có lỗi khi tải dữ liệu. Vui lòng thử lại sau.");
      setConsultationAdvice([]);
      setConsultationSummaries([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDateForDoc = (date) => {
    if (!date) return "Không có";
    return new Date(date).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const generateDocHTML = (record, type) => {
    const visitDate = formatDateForDoc(
      type === "medical"
        ? record.visitDate || record.createdAt
        : record.appointmentDate || record.createdAt
    );
    return `
      <!DOCTYPE html>
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns:v="urn:schemas-microsoft-com:vml" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
      <meta charset="utf-8">
      <meta name="ProgId" content="Word.Document">
      <meta name="Generator" content="Microsoft Word">
      <meta name="Originator" content="Microsoft Word">
      <title>${
        type === "consultation" ? "Buổi tư vấn" : "Hồ sơ khám bệnh"
      }</title>
      <style>
        :root{
          --ink:#111827; --muted:#6b7280; --border:#e5e7eb; --accent:#0ea5e9; --bg:#ffffff;
          --chip-bg:#eef6ff; --chip-text:#0b5fb8;
        }
        *{box-sizing:border-box}
        body{font-family:"Times New Roman",serif; color:var(--ink); margin:34px 40px; line-height:1.55; font-size:13.5pt}
        /* Header */
        .header{display:grid; grid-template-columns:1fr auto; align-items:center; gap:16px; padding-bottom:14px; margin-bottom:18px; border-bottom:2px solid #000}
        .title{grid-column:1 / -1; text-align:center}
        .title h1{font-size:22pt; margin:0 0 6px; font-weight:700; letter-spacing:.3px}
        .subline{display:flex; justify-content:space-between; align-items:flex-end}
        .sub-left{color:var(--muted); font-size:11pt}
        .sub-right{color:var(--muted); font-size:11pt; text-align:right}
        /* Sections */
        .section{margin-top:18px; border:1px solid var(--border); border-radius:10px; padding:16px 18px; background:var(--bg); page-break-inside:avoid}
        .section h2{font-size:15pt; margin:0 0 12px; color:#111; border-left:4px solid var(--accent); padding-left:12px; font-weight:700}
        /* Two-column info layout */
        .kv-2col{display:grid; grid-template-columns:1fr 1fr; gap:12px}
        .kv{width:100%; border-collapse:collapse}
        .kv td{padding:9px 12px; border:1px solid var(--border); vertical-align:top}
        .kv td.key{background:#f9fafb; font-weight:700; width:42%}
        .kv td.value{text-align:justify}
        /* Pills + tables */
        .chips{display:flex; flex-wrap:wrap; gap:10px; margin-top:6px}
        .chip{background:var(--chip-bg); color:var(--chip-text); border:1px solid #d6e8ff; padding:7px 12px; border-radius:999px; font-size:12pt}
        .table{width:100%; border-collapse:collapse; margin-top:4px}
        .table th,.table td{border:1px solid var(--border); padding:9px 12px; vertical-align:top}
        .table th{background:#f3f4f6; text-align:left; font-weight:700; font-size:12.5pt}
        .note{padding:12px 14px; background:#f9fafb; border:1px dashed var(--border); border-radius:8px; margin-top:4px; text-align:justify}
        /* Signature (doctor only, right) */
        .sign-right{display:flex; justify-content:flex-end; margin-top:32px; page-break-inside:avoid}
        .sig-col{width:40%; min-width:280px; display:flex; flex-direction:column; align-items:center; padding:18px 14px; border:1px solid var(--border); border-radius:10px}
        .sig-role{font-weight:700; margin-bottom:8px}
        .sig-line{width:85%; border-top:1.6px solid #1f2937; margin-top:54px}
        .sig-hint{font-size:11pt; color:var(--muted); margin-top:6px}
        @page{size:A4; margin:18mm}
        @media print{ body{margin:0; font-size:12pt} .section{page-break-inside:avoid} }
        v:*{behavior:url(#default#VML)} o:*{behavior:url(#default#VML)} w:*{behavior:url(#default#VML)}
      </style>
      </head>
      <body>
      
        <table style="width:100%; border-collapse:collapse; border-bottom:2px solid #000; padding-bottom:12px; margin-bottom:16px;">
          <tr>
            <td>
              <h1 style="margin:0; font-size:22pt; font-weight:700; letter-spacing:.3px;">${
                type === "consultation" ? "BUỔI TƯ VẤN" : "HỒ SƠ KHÁM BỆNH"
              }</h1>
              <div style="color:#6b7280; font-size:11pt;">Mã hồ sơ: ${
                record._id || "—"
              }</div>
            </td>
            <td align="right" style="color:#6b7280; font-size:11pt;">
              Ngày tạo: ${formatDateForDoc(new Date())}
              ${
                record.mode
                  ? `<br/>Hình thức: ${
                      record.mode === "online" ? "Trực tuyến" : "Trực tiếp"
                    }`
                  : ""
              }
            </td>
          </tr>
        </table>
      
        <div class="section">
          <h2>Thông tin bệnh nhân</h2>
          <div class="kv-2col">
            <!-- Cột 1: nhân thân -->
            <table class="kv">
              <tr><td class="key">Họ và tên</td><td class="value">${
                record.patientId?.fullName || "—"
              }</td></tr>
              <tr><td class="key">Số điện thoại</td><td class="value">${
                record.patientId?.phone || "—"
              }</td></tr>
              <tr><td class="key">${
                type === "consultation" ? "Ngày tư vấn" : "Ngày khám"
              }</td><td class="value">${visitDate}</td></tr>
              ${
                record.patientId?.dob
                  ? `<tr><td class="key">Ngày sinh</td><td class="value">${formatDate(
                      record.patientId.dob
                    )}</td></tr>`
                  : ""
              }
              ${
                record.patientId?.gender
                  ? `<tr><td class="key">Giới tính</td><td class="value">${
                      record.patientId.gender === "male"
                        ? "Nam"
                        : record.patientId.gender === "female"
                        ? "Nữ"
                        : record.patientId.gender
                    }</td></tr>`
                  : ""
              }
              ${
                record.patientId?.email
                  ? `<tr><td class="key">Email</td><td class="value">${record.patientId.email}</td></tr>`
                  : ""
              }
              ${
                record.patientId?.address || record.patientId?.houseNumber
                  ? `
                <tr><td class="key">Địa chỉ</td>
                    <td class="value">${[
                      record.patientId.houseNumber,
                      record.patientId.address,
                    ]
                      .filter(Boolean)
                      .join(", ")}</td></tr>`
                  : ""
              }
              ${
                record.patientId?.citizenId
                  ? `<tr><td class="key">CCCD</td><td class="value">${record.patientId.citizenId}</td></tr>`
                  : ""
              }
            </table>
      
            <!-- Cột 2: nghề nghiệp/bảo hiểm/liên hệ -->
            <table class="kv">
              ${
                record.patientId?.occupation
                  ? `<tr><td class="key">Nghề nghiệp</td><td class="value">${record.patientId.occupation}</td></tr>`
                  : ""
              }
              ${
                record.patientId?.ethnicity
                  ? `<tr><td class="key">Dân tộc</td><td class="value">${record.patientId.ethnicity}</td></tr>`
                  : ""
              }
              ${
                record.patientId?.nationality
                  ? `<tr><td class="key">Quốc tịch</td><td class="value">${record.patientId.nationality}</td></tr>`
                  : ""
              }
              ${
                record.patientId?.insuranceNumber
                  ? `<tr><td class="key">Số BHYT</td><td class="value">${record.patientId.insuranceNumber}</td></tr>`
                  : ""
              }
              ${
                record.patientId?.primaryClinic
                  ? `<tr><td class="key">Nơi đăng ký KCB</td><td class="value">${record.patientId.primaryClinic}</td></tr>`
                  : ""
              }
              ${
                record.patientId?.insuranceValidFrom ||
                record.patientId?.insuranceValidTo
                  ? `
                <tr><td class="key">Hiệu lực BHYT</td>
                    <td class="value">${
                      record.patientId.insuranceValidFrom
                        ? formatDate(record.patientId.insuranceValidFrom)
                        : "—"
                    } - ${
                      record.patientId.insuranceValidTo
                        ? formatDate(record.patientId.insuranceValidTo)
                        : "—"
                    }</td></tr>`
                  : ""
              }
              ${
                record.patientId?.representativeName ||
                record.patientId?.representativeRelation ||
                record.patientId?.representativePhone
                  ? `
                <tr><td class="key">Người đại diện</td>
                    <td class="value">${[
                      record.patientId.representativeName,
                      record.patientId.representativeRelation,
                      record.patientId.representativePhone,
                    ]
                      .filter(Boolean)
                      .join(" | ")}</td></tr>`
                  : ""
              }
              ${
                record.patientId?.emergencyContactName ||
                record.patientId?.emergencyContactPhone
                  ? `
                <tr><td class="key">Liên hệ khẩn cấp</td>
                    <td class="value">${[
                      record.patientId.emergencyContactName,
                      record.patientId.emergencyContactPhone,
                    ]
                      .filter(Boolean)
                      .join(" | ")}</td></tr>`
                  : ""
              }
              ${
                record.patientId?.bloodType
                  ? `<tr><td class="key">Nhóm máu</td><td class="value">${record.patientId.bloodType}</td></tr>`
                  : ""
              }
              ${
                record.patientId?.allergyNotes
                  ? `<tr><td class="key">Dị ứng</td><td class="value">${record.patientId.allergyNotes}</td></tr>`
                  : ""
              }
            </table>
          </div>
        </div>
      
        ${
          type !== "consultation" && record.reasonForVisit
            ? `
        <div class="section">
          <h2>Lý do khám</h2>
          <div class="note">${record.reasonForVisit}</div>
        </div>`
            : ""
        }
      
        ${
          type === "consultation" && (record.notes || record.reasonForVisit)
            ? `
        <div class="section">
          <h2>Tóm tắt buổi tư vấn</h2>
          <div class="note">${record.notes || record.reasonForVisit}</div>
        </div>`
            : ""
        }
      
        ${
          record.diagnoses?.length
            ? `
        <div class="section">
          <h2>${
            type === "consultation" ? "Chẩn đoán tham khảo" : "Chẩn đoán"
          }</h2>
          <div class="chips">
            ${record.diagnoses
              .map((d) => `<span class="chip">${d.name || d}</span>`)
              .join("")}
          </div>
        </div>`
            : ""
        }
      
        ${
          record.medications?.length
            ? `
        <div class="section">
          <h2>Đơn thuốc</h2>
          <table class="table">
            <thead><tr><th>Tên thuốc</th><th>Số lượng</th><th>Hướng dẫn</th></tr></thead>
            <tbody>
              ${record.medications
                .map(
                  (m) => `
                <tr>
                  <td>${m.name || "—"}</td>
                  <td>${m.quantity || "—"}</td>
                  <td>${m.instruction || "—"}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>`
            : ""
        }
      
        ${
          record.summaryText ||
          record.treatmentMethod ||
          record.followUpInstructions ||
          record.nextAppointmentDate
            ? `
        <div class="section">
          <h2>Kết quả & Hướng dẫn</h2>
          ${
            record.summaryText
              ? `<p><strong>Tóm tắt:</strong> ${record.summaryText}</p>`
              : ""
          }
          ${
            record.treatmentMethod
              ? `<p><strong>Phương pháp điều trị:</strong> ${record.treatmentMethod}</p>`
              : ""
          }
          ${
            record.followUpInstructions
              ? `<p><strong>Hướng dẫn theo dõi:</strong> ${record.followUpInstructions}</p>`
              : ""
          }
          ${
            record.nextAppointmentDate
              ? `<p><strong>Lịch hẹn tái khám:</strong> ${formatDate(
                  record.nextAppointmentDate
                )}</p>`
              : ""
          }
        </div>`
            : ""
        }
      
        ${
          record.labResults?.length
            ? `
        <div class="section">
          <h2>Kết quả xét nghiệm</h2>
          <table class="table">
            <thead><tr><th>Xét nghiệm</th><th>Kết quả</th></tr></thead>
            <tbody>
              ${record.labResults
                .map(
                  (l) =>
                    `<tr><td>${l.testName || "Xét nghiệm"}</td><td>${
                      l.result || "—"
                    }</td></tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>`
            : ""
        }
      
        <table style="width:100%; border-collapse:collapse; margin-top:28px;">
          <tr>
            <td></td>
            <td align="right" style="width:40%; min-width:280px; border:1px solid #e5e7eb; border-radius:10px; padding:14px;">
              <div style="font-weight:700; margin-bottom:8px;">${
                type === "consultation" ? "BÁC SĨ TƯ VẤN" : "BÁC SĨ PHỤ TRÁCH"
              }</div>
              <div style="margin-top:54px; border-top:1.6px solid #1f2937; width:85%;"></div>
              <div style="font-size:11pt; color:#6b7280; margin-top:6px;">(Ký và ghi rõ họ tên)</div>
            </td>
          </tr>
        </table>
      
      </body>
      </html>`;
  };

  const handleDownload = async (record) => {
    try {
      let htmlContent = "";
      let fileName = "";

      if (activeTab === "medical" && record) {
        htmlContent = generateDocHTML(record, "medical");
        fileName = `ho-so-kham-${
          record.visitDate
            ? new Date(record.visitDate).toISOString().split("T")[0]
            : "unknown"
        }.doc`;
      } else if (activeTab === "consultation" && record) {
        htmlContent = generateDocHTML(record, "consultation");
        fileName = `tu-van-${
          record.appointmentDate
            ? new Date(record.appointmentDate).toISOString().split("T")[0]
            : "unknown"
        }.doc`;
      } else {
        return;
      }

      // Create blob with HTML content that Word can open
      // Use both UTF-8 BOM and proper HTML structure for better image support
      const blob = new Blob(["\ufeff", htmlContent], {
        type: "application/msword;charset=utf-8",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading file:", error);
      showAlert("Có lỗi khi tải xuống file. Vui lòng thử lại.");
    }
  };

  const handleDownloadFile = async (fileUrl, fileName) => {
    try {
      const fullUrl = getImageUrl(fileUrl);
      const response = await fetch(fullUrl);
      if (!response.ok) throw new Error("Failed to fetch file");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName || fileUrl.split("/").pop() || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading file:", error);
      showAlert("Có lỗi khi tải xuống file");
    }
  };

  const handleViewDetails = (recordId, record) => {
    if (activeTab === "medical") {
      setSelectedSummary(record);
      setSelectedAdvice(null);
      setModalType("summary");
      setShowDetailModal(true);
    } else if (activeTab === "consultation") {
      setSelectedAdvice(record);
      setSelectedSummary(null);
      setModalType("advice");
      setShowDetailModal(true);
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

  const formatDate = (date) => {
    if (!date) return "Không có";
    return new Date(date).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatDateTime = (date) => {
    if (!date) return "Không có";
    return new Date(date).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Helper function to get full image URL
  const getImageUrl = (url) => {
    if (!url) return null;
    // If URL is already absolute (starts with http:// or https://), return as is
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    // If URL starts with /, it's a server path, prepend API base URL
    const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3000";
    return `${apiBase}${url.startsWith("/") ? url : `/${url}`}`;
  };

  // Filter data based on search term
  const filteredSummaries = consultationSummaries.filter((summary) => {
    const patientName = summary.patientId?.fullName || "";
    return patientName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredAdvice = consultationAdvice.filter((advice) => {
    const patientName = advice.patientId?.fullName || "";
    return patientName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="health-profile-container">
      {/* Header */}
      <div className="health-profile-header">
        <div className="header-content">
          <div className="header-text">
            <h2 className="page-title" style={{ color: "#000000" }}>
              Hồ sơ khám
            </h2>
            <p className="page-subtitle">
              Quản lý và xem lịch sử khám bệnh và tư vấn
            </p>
          </div>
          <div className="header-search">
            <div className="search-input-wrapper">
              <Search className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Tìm kiếm theo tên bệnh nhân..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation - Horizontal Layout */}
      <div className="tab-navigation-horizontal">
        <button
          className={`tab-button-horizontal ${
            activeTab === "medical" ? "active" : ""
          }`}
          onClick={() => setActiveTab("medical")}
        >
          <FileText className="tab-icon" />
          <span>Lịch sử khám bệnh</span>
          <span className="tab-badge">{filteredSummaries.length}</span>
        </button>
        <button
          className={`tab-button-horizontal ${
            activeTab === "consultation" ? "active" : ""
          }`}
          onClick={() => setActiveTab("consultation")}
        >
          <MessageCircle className="tab-icon" />
          <span>Lịch sử tư vấn</span>
          <span className="tab-badge">{filteredAdvice.length}</span>
        </button>
      </div>

      {/* Medical History Tab */}
      {activeTab === "medical" && (
        <div className="tab-content">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Đang tải lịch sử khám bệnh...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <p>{error}</p>
            </div>
          ) : filteredSummaries.length === 0 ? (
            <div className="empty-state">
              <p>
                {searchTerm
                  ? "Không tìm thấy kết quả nào."
                  : "Chưa có lịch sử khám bệnh nào."}
              </p>
            </div>
          ) : (
            <div className="history-list">
              {filteredSummaries.map((summary) => {
                return (
                  <div key={summary._id} className="history-card">
                    <div className="card-header">
                      <div className="card-title-section">
                        <div className="card-icon">
                          <FileText className="card-icon-symbol" />
                        </div>
                        <div className="card-title">
                          <div className="specialty-name">
                            Bệnh nhân:{" "}
                            {summary.patientId?.fullName || "Không xác định"}
                          </div>
                          <div className="card-meta">
                            <div className="meta-item">
                              <Calendar className="meta-icon" />
                              <span>
                                {formatDate(
                                  summary.visitDate || summary.createdAt
                                )}
                              </span>
                            </div>
                            <div className="meta-item">
                              <User className="meta-icon" />
                              <span>
                                SĐT: {summary.patientId?.phone || "Không có"}
                              </span>
                            </div>
                            {summary.mode && (
                              <div className="meta-item">
                                <span className="consultation-type">
                                  {summary.mode === "online"
                                    ? "TRỰC TUYẾN"
                                    : "TRỰC TIẾP"}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="card-actions">
                        <button
                          className={`view-details-button ${
                            activeButton === summary._id ? "active" : ""
                          }`}
                          onClick={() =>
                            handleViewDetails(summary._id, summary)
                          }
                        >
                          <Eye className="view-icon" />
                          Xem chi tiết
                        </button>
                        <button
                          className="download-button-card"
                          onClick={() => handleDownload(summary)}
                          title="Tải xuống hồ sơ"
                        >
                          <Download className="download-icon" />
                          Tải xuống
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Consultation History Tab */}
      {activeTab === "consultation" && (
        <div className="tab-content">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Đang tải lịch sử tư vấn...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <p>{error}</p>
            </div>
          ) : filteredAdvice.length === 0 ? (
            <div className="empty-state">
              <p>
                {searchTerm
                  ? "Không tìm thấy kết quả nào."
                  : "Chưa có lịch sử tư vấn nào."}
              </p>
            </div>
          ) : (
            <div className="history-list">
              {filteredAdvice.map((advice) => {
                return (
                  <div
                    key={advice._id}
                    className="history-card consultation-card"
                  >
                    <div className="card-header">
                      <div className="card-title-section">
                        <div className="card-icon">
                          {advice.mode === "online" ? (
                            <Video className="card-icon-symbol" />
                          ) : (
                            <MessageCircle className="card-icon-symbol" />
                          )}
                        </div>
                        <div className="card-title">
                          <div className="specialty-name">
                            Bệnh nhân:{" "}
                            {advice.patientId?.fullName || "Không xác định"}
                          </div>
                          <div className="card-meta">
                            <div className="meta-item">
                              <Calendar className="meta-icon" />
                              <span>
                                {formatDate(
                                  advice.appointmentDate || advice.createdAt
                                )}
                              </span>
                            </div>
                            <div className="meta-item">
                              <User className="meta-icon" />
                              <span>
                                SĐT: {advice.patientId?.phone || "Không có"}
                              </span>
                            </div>
                            <div className="meta-item">
                              <span className="consultation-type">
                                {advice.mode === "online"
                                  ? "TRỰC TUYẾN"
                                  : "TRỰC TIẾP"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="card-actions">
                        <button
                          className={`view-details-button ${
                            activeButton === advice._id ? "active" : ""
                          }`}
                          onClick={() => handleViewDetails(advice._id, advice)}
                        >
                          <Eye className="view-icon" />
                          Xem chi tiết
                        </button>
                        <button
                          className="download-button-card"
                          onClick={() => handleDownload(advice)}
                          title="Tải xuống hồ sơ"
                        >
                          <Download className="download-icon" />
                          Tải xuống
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

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
              {modalType === "summary" && selectedSummary && (
                <div className="detail-content">
                  {/* Basic Info */}
                  <div className="detail-section">
                    <h4>Thông tin cơ bản</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <strong>Bệnh nhân:</strong>
                        <span>
                          {selectedSummary.patientId?.fullName || "Không có"}
                        </span>
                      </div>
                      <div className="detail-item">
                        <strong>Số điện thoại:</strong>
                        <span>
                          {selectedSummary.patientId?.phone || "Không có"}
                        </span>
                      </div>
                      {selectedSummary.patientId?.dob && (
                        <div className="detail-item">
                          <strong>Ngày sinh:</strong>
                          <span>
                            {formatDate(selectedSummary.patientId.dob)}
                          </span>
                        </div>
                      )}
                      {selectedSummary.patientId?.gender && (
                        <div className="detail-item">
                          <strong>Giới tính:</strong>
                          <span>
                            {selectedSummary.patientId.gender === "male"
                              ? "Nam"
                              : selectedSummary.patientId.gender === "female"
                              ? "Nữ"
                              : selectedSummary.patientId.gender}
                          </span>
                        </div>
                      )}
                      <div className="detail-item">
                        <strong>Ngày khám:</strong>
                        <span>
                          {formatDateTime(
                            selectedSummary.visitDate ||
                              selectedSummary.createdAt
                          )}
                        </span>
                      </div>
                      {selectedSummary.reasonForVisit && (
                        <div className="detail-item">
                          <strong>Lý do khám:</strong>
                          <span>{selectedSummary.reasonForVisit}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Diagnoses */}
                  {selectedSummary.diagnoses &&
                    selectedSummary.diagnoses.length > 0 && (
                      <div className="detail-section">
                        <h4>Chẩn đoán</h4>
                        <div className="diagnoses-list">
                          {selectedSummary.diagnoses.map((diagnosis, index) => (
                            <div key={index} className="diagnosis-item">
                              <strong>
                                {diagnosis.name || "Không xác định"}
                              </strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Vitals */}
                  {selectedSummary.vitals && (
                    <div className="detail-section">
                      <h4>Chỉ số sinh học</h4>
                      <div className="vitals-grid">
                        {selectedSummary.vitals.height && (
                          <div className="vital-item">
                            <strong>Chiều cao:</strong>{" "}
                            {selectedSummary.vitals.height} cm
                          </div>
                        )}
                        {selectedSummary.vitals.weight && (
                          <div className="vital-item">
                            <strong>Cân nặng:</strong>{" "}
                            {selectedSummary.vitals.weight} kg
                          </div>
                        )}
                        {selectedSummary.vitals.bloodPressure && (
                          <div className="vital-item">
                            <strong>Huyết áp:</strong>{" "}
                            {selectedSummary.vitals.bloodPressure}
                          </div>
                        )}
                        {selectedSummary.vitals.heartRate && (
                          <div className="vital-item">
                            <strong>Nhịp tim:</strong>{" "}
                            {selectedSummary.vitals.heartRate} bpm
                          </div>
                        )}
                        {selectedSummary.vitals.temperature && (
                          <div className="vital-item">
                            <strong>Nhiệt độ:</strong>{" "}
                            {selectedSummary.vitals.temperature}°C
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Lab Results */}
                  {(() => {
                    const validLabResults =
                      selectedSummary.labResults?.filter(
                        (lab) => lab.testName && lab.result
                      ) || [];
                    if (validLabResults.length > 0) {
                      return (
                        <div className="detail-section">
                          <h4>Kết quả xét nghiệm</h4>
                          <div className="lab-results">
                            {validLabResults.map((lab, index) => (
                              <div key={index} className="lab-item">
                                <div className="lab-header">
                                  <strong>{lab.testName}</strong>
                                  {lab.performedAt && (
                                    <span className="lab-date">
                                      {formatDate(lab.performedAt)}
                                    </span>
                                  )}
                                </div>
                                <div className="lab-result">
                                  <span className="result-value">
                                    {lab.result}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Imaging Results */}
                  <div className="detail-section">
                    <h4>Kết quả hình ảnh</h4>
                    {(() => {
                      // Chỉ hiển thị những item có imageUrl thực sự
                      const validImagingResults =
                        selectedSummary.imagingResults?.filter(
                          (img) => img.imageUrl && img.imageUrl.trim() !== ""
                        ) || [];
                      if (validImagingResults.length > 0) {
                        return (
                          <div className="imaging-results">
                            {validImagingResults.map((img, index) => (
                              <div key={index} className="imaging-item">
                                {img.type && (
                                  <div className="imaging-header">
                                    <strong>{img.type}</strong>
                                    {img.performedAt && (
                                      <span className="imaging-date">
                                        {formatDate(img.performedAt)}
                                      </span>
                                    )}
                                  </div>
                                )}
                                {img.conclusion && (
                                  <div className="imaging-conclusion">
                                    <strong>Kết luận:</strong> {img.conclusion}
                                  </div>
                                )}
                                <div className="imaging-image-container">
                                  {(() => {
                                    const fullImageUrl = getImageUrl(
                                      img.imageUrl
                                    );
                                    return (
                                      <>
                                        <div className="imaging-image-wrapper">
                                          <a
                                            href={fullImageUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="imaging-image-link"
                                          >
                                            <img
                                              src={fullImageUrl}
                                              alt={
                                                img.type ||
                                                img.conclusion ||
                                                `Hình ảnh ${index + 1}`
                                              }
                                              className="imaging-image"
                                              onError={(e) => {
                                                e.target.style.display = "none";
                                                if (e.target.nextSibling) {
                                                  e.target.nextSibling.style.display =
                                                    "block";
                                                }
                                              }}
                                            />
                                          </a>
                                          <button
                                            className="download-image-button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDownloadFile(
                                                img.imageUrl,
                                                `${img.type || "hinh-anh"}-${
                                                  index + 1
                                                }.${
                                                  img.imageUrl
                                                    .split(".")
                                                    .pop() || "png"
                                                }`
                                              );
                                            }}
                                            title="Tải xuống hình ảnh"
                                          >
                                            <Download className="download-icon" />
                                            Tải xuống
                                          </button>
                                        </div>
                                        <div
                                          className="imaging-image-fallback"
                                          style={{ display: "none" }}
                                        >
                                          <p
                                            style={{
                                              color: "#6b7280",
                                              marginBottom: "0.5rem",
                                            }}
                                          >
                                            Không thể tải hình ảnh
                                          </p>
                                          <div className="document-actions">
                                            <a
                                              href={fullImageUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="document-link"
                                            >
                                              Mở link hình ảnh
                                            </a>
                                            <button
                                              className="download-file-button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleDownloadFile(
                                                  img.imageUrl,
                                                  `${img.type || "hinh-anh"}-${
                                                    index + 1
                                                  }.${
                                                    img.imageUrl
                                                      .split(".")
                                                      .pop() || "png"
                                                  }`
                                                );
                                              }}
                                              title="Tải xuống hình ảnh"
                                            >
                                              <FileDown className="download-icon-small" />
                                            </button>
                                          </div>
                                        </div>
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return (
                        <div
                          style={{
                            color: "#9ca3af",
                            fontStyle: "italic",
                            padding: "1rem",
                          }}
                        >
                          Không có hình ảnh chẩn đoán
                        </div>
                      );
                    })()}
                  </div>

                  {/* Medications */}
                  {selectedSummary.medications &&
                    selectedSummary.medications.length > 0 && (
                      <div className="detail-section">
                        <h4>Đơn thuốc</h4>
                        <div className="medications-list">
                          {selectedSummary.medications.map((med, index) => (
                            <div key={index} className="medication-item">
                              <div className="med-name">
                                <strong>{med.name || "Không có"}</strong>
                              </div>
                              <div className="med-details">
                                <span>
                                  Số lượng: {med.quantity || "Không có"}
                                </span>
                              </div>
                              {med.instruction && (
                                <div className="med-instruction">
                                  <strong>Hướng dẫn:</strong> {med.instruction}
                                </div>
                              )}
                              {med.notes && (
                                <div className="med-notes">
                                  <strong>Ghi chú:</strong> {med.notes}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Summary and Instructions */}
                  {(selectedSummary.summaryText ||
                    selectedSummary.treatmentMethod ||
                    selectedSummary.followUpInstructions ||
                    selectedSummary.nextAppointmentDate) && (
                    <div className="detail-section">
                      <h4>Tóm tắt và hướng dẫn</h4>
                      {selectedSummary.summaryText && (
                        <div className="summary-text">
                          <strong>Tóm tắt:</strong>
                          <p>{selectedSummary.summaryText}</p>
                        </div>
                      )}
                      {selectedSummary.treatmentMethod && (
                        <div className="treatment-method">
                          <strong>Phương pháp điều trị:</strong>
                          <p>{selectedSummary.treatmentMethod}</p>
                        </div>
                      )}
                      {selectedSummary.followUpInstructions && (
                        <div className="follow-up">
                          <strong>Hướng dẫn theo dõi:</strong>
                          <p>{selectedSummary.followUpInstructions}</p>
                        </div>
                      )}
                      {selectedSummary.nextAppointmentDate && (
                        <div className="next-appointment">
                          <strong>Lịch hẹn tái khám:</strong>
                          <span>
                            {formatDate(selectedSummary.nextAppointmentDate)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {modalType === "advice" && selectedAdvice && (
                <div className="detail-content">
                  {/* Basic Info */}
                  <div className="detail-section">
                    <h4>Thông tin cơ bản</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <strong>Bệnh nhân:</strong>
                        <span>
                          {selectedAdvice.patientId?.fullName || "Không có"}
                        </span>
                      </div>
                      <div className="detail-item">
                        <strong>Số điện thoại:</strong>
                        <span>
                          {selectedAdvice.patientId?.phone || "Không có"}
                        </span>
                      </div>
                      {selectedAdvice.patientId?.dob && (
                        <div className="detail-item">
                          <strong>Ngày sinh:</strong>
                          <span>
                            {formatDate(selectedAdvice.patientId.dob)}
                          </span>
                        </div>
                      )}
                      {selectedAdvice.patientId?.gender && (
                        <div className="detail-item">
                          <strong>Giới tính:</strong>
                          <span>
                            {selectedAdvice.patientId.gender === "male"
                              ? "Nam"
                              : selectedAdvice.patientId.gender === "female"
                              ? "Nữ"
                              : selectedAdvice.patientId.gender}
                          </span>
                        </div>
                      )}
                      <div className="detail-item">
                        <strong>Ngày tư vấn:</strong>
                        <span>
                          {formatDateTime(
                            selectedAdvice.appointmentDate ||
                              selectedAdvice.createdAt
                          )}
                        </span>
                      </div>
                      <div className="detail-item">
                        <strong>Hình thức:</strong>
                        <span>
                          {selectedAdvice.mode === "online"
                            ? "Trực tuyến"
                            : "Trực tiếp"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Notes/Summary */}
                  {selectedAdvice.notes && (
                    <div className="detail-section">
                      <h4>Tóm tắt buổi tư vấn</h4>
                      <div className="summary-text">
                        <p>{selectedAdvice.notes}</p>
                      </div>
                    </div>
                  )}

                  {/* Diagnoses */}
                  {selectedAdvice.diagnoses &&
                    selectedAdvice.diagnoses.length > 0 && (
                      <div className="detail-section">
                        <h4>Chẩn đoán tham khảo</h4>
                        <div className="diagnoses-list">
                          {selectedAdvice.diagnoses.map((diagnosis, index) => (
                            <div key={index} className="diagnosis-item">
                              <strong>
                                {diagnosis.name || "Không xác định"}
                              </strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Medications */}
                  {selectedAdvice.medications &&
                    selectedAdvice.medications.length > 0 && (
                      <div className="detail-section">
                        <h4>Đơn thuốc</h4>
                        <div className="medications-list">
                          {selectedAdvice.medications.map((med, index) => (
                            <div key={index} className="medication-item">
                              <div className="med-name">
                                <strong>{med.name || "Không có"}</strong>
                              </div>
                              <div className="med-details">
                                <span>
                                  Số lượng: {med.quantity || "Không có"}
                                </span>
                              </div>
                              {med.instruction && (
                                <div className="med-instruction">
                                  <strong>Hướng dẫn:</strong> {med.instruction}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Attachment */}
                  <div className="detail-section">
                    <h4>File đính kèm</h4>
                    {selectedAdvice.attachmentUrl &&
                    selectedAdvice.attachmentUrl.trim() !== "" ? (
                      <div className="documents-list">
                        <div className="document-item">
                          <FileText className="document-icon" />
                          <div className="document-actions">
                            <a
                              href={getImageUrl(selectedAdvice.attachmentUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="document-link"
                            >
                              {selectedAdvice.attachmentUrl.split("/").pop() ||
                                selectedAdvice.attachmentUrl}
                            </a>
                            <button
                              className="download-file-button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadFile(
                                  selectedAdvice.attachmentUrl,
                                  selectedAdvice.attachmentUrl
                                    .split("/")
                                    .pop() || "file.pdf"
                                );
                              }}
                              title="Tải xuống file"
                            >
                              <FileDown className="download-icon-small" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          color: "#9ca3af",
                          fontStyle: "italic",
                          padding: "1rem",
                        }}
                      >
                        Không có file đính kèm
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert */}
      <CustomAlert
        message={alertMessage}
        onClose={() => setAlertMessage(null)}
        title="Hệ thống MedConnect"
      />
    </div>
  );
}
