import React, { useState, useEffect } from "react";
import { api } from "../../../lib/api";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { FileText, Search, Calendar, Download } from "lucide-react";
import { CustomAlert } from "../../../components/ui/CustomAlert";
import "./QuanLyHoaDon.scss";

export default function QuanLyHoaDon() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all"); // all, booking, service
  const [statusFilter, setStatusFilter] = useState("all"); // all, captured, failed, etc.
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
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

  useEffect(() => {
    loadInvoices();
  }, [activeTab, statusFilter, page, startDate, endDate]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      // Set invoiceType based on active tab
      if (activeTab === "booking") {
        params.append("invoiceType", "booking");
      } else if (activeTab === "service") {
        params.append("invoiceType", "service");
      }
      // "all" tab doesn't filter by invoiceType

      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }

      if (startDate) {
        params.append("startDate", startDate);
      }

      if (endDate) {
        params.append("endDate", endDate);
      }

      params.append("page", page.toString());
      params.append("limit", "20");

      const response = await api.get(
        `/api/managers/invoices?${params.toString()}`
      );

      if (response.success) {
        setInvoices(response.data.invoices || []);
        setTotalPages(response.data.pagination?.pages || 1);
      } else {
        console.error("Failed to load invoices:", response.message);
        showAlert("Không thể tải danh sách hóa đơn");
      }
    } catch (error) {
      console.error("Error loading invoices:", error);
      showAlert("Có lỗi xảy ra khi tải danh sách hóa đơn");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      captured: "bg-green-500 text-white",
      initiated: "bg-yellow-500 text-white",
      failed: "bg-red-500 text-white",
      refunded: "bg-gray-500 text-white",
      cancelled: "bg-gray-400 text-white",
    };
    return colors[status] || "bg-gray-300 text-gray-800";
  };

  const getStatusText = (status) => {
    const texts = {
      pending_manager: "Yêu cầu thanh toán",
      captured: "Đã thanh toán",
      initiated: "Đang xử lý",
      
    };
    return texts[status] || status;
  };

  const getInvoiceTypeText = (type) => {
    return type === "booking" ? "Thanh toán đặt lịch" : "Thanh toán dịch vụ";
  };

  const formatDateForDoc = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateOnlyForDoc = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const generateInvoiceDocHTML = (invoice) => {
    const invoiceDate = formatDateForDoc(invoice.createdAt);
    const paidDate = invoice.paidAt
      ? formatDateForDoc(invoice.paidAt)
      : "Chưa thanh toán";
    const patientDob = invoice.patientDateOfBirth
      ? formatDateOnlyForDoc(invoice.patientDateOfBirth)
      : "Không";
    const genderText =
      invoice.patientGender === "male"
        ? "Nam"
        : invoice.patientGender === "female"
        ? "Nữ"
        : invoice.patientGender || "Không";

    const itemsRows =
      invoice.items
        ?.map(
          (item) => `
      <tr>
        <td style="border:1px solid #ddd; padding:8px; text-align:left">${
          item.description || ""
        }</td>
        <td style="border:1px solid #ddd; padding:8px; text-align:center">${
          item.quantity || 1
        }</td>
        <td style="border:1px solid #ddd; padding:8px; text-align:right">${formatCurrency(
          item.unitPrice || 0
        )}</td>
        <td style="border:1px solid #ddd; padding:8px; text-align:right">${formatCurrency(
          item.lineTotal || 0
        )}</td>
      </tr>
    `
        )
        .join("") || "";

    return `
      <!DOCTYPE html>
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns:v="urn:schemas-microsoft-com:vml" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
      <meta charset="utf-8">
      <meta name="ProgId" content="Word.Document">
      <meta name="Generator" content="Microsoft Word">
      <meta name="Originator" content="Microsoft Word">
      <title>Hóa đơn</title>
      <style>
        body {
          font-family: "Times New Roman", serif;
          color: #111827;
          margin: 34px 40px;
          line-height: 1.6;
          font-size: 13.5pt;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 3px solid #000;
          padding-bottom: 15px;
        }
        .header h1 {
          font-size: 24pt;
          margin: 0 0 10px;
          font-weight: 700;
        }
        .invoice-info {
          margin: 25px 0;
        }
        .info-row {
          margin: 8px 0;
          display: flex;
          justify-content: space-between;
        }
        .info-label {
          font-weight: 600;
          width: 200px;
        }
        .info-value {
          flex: 1;
          text-align: right;
        }
        .section {
          margin: 20px 0;
          page-break-inside: avoid;
        }
        .section h2 {
          font-size: 16pt;
          margin: 0 0 12px;
          color: #111;
          border-left: 4px solid #0ea5e9;
          padding-left: 12px;
          font-weight: 700;
        }
        .kv-2col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .kv-item {
          margin: 6px 0;
        }
        .kv-label {
          font-weight: 600;
          color: #6b7280;
          font-size: 12pt;
        }
        .kv-value {
          color: #111827;
          font-size: 13pt;
          margin-top: 4px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
        }
        th {
          background-color: #f3f4f6;
          border: 1px solid #ddd;
          padding: 10px;
          text-align: left;
          font-weight: 700;
        }
        td {
          border: 1px solid #ddd;
          padding: 8px;
        }
        .total-row {
          margin-top: 15px;
          padding-top: 15px;
          border-top: 2px solid #000;
        }
        .total-label {
          font-weight: 700;
          font-size: 14pt;
        }
        .total-value {
          font-weight: 700;
          font-size: 14pt;
          color: #0ea5e9;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 11pt;
          color: #6b7280;
          border-top: 1px solid #ddd;
          padding-top: 15px;
        }
      </style>
      </head>
      <body>
        <div class="header">
          <h1>HÓA ĐƠN THANH TOÁN</h1>
          <div style="font-size: 11pt; color: #6b7280;">MedConnect - Hệ thống quản lý y tế</div>
        </div>

        <div class="section">
          <h2>Thông tin hóa đơn</h2>
          <div class="kv-2col">
            <div class="kv-item">
              <div class="kv-label">Mã hóa đơn:</div>
              <div class="kv-value">${invoice.invoiceNumber || "N/A"}</div>
            </div>
            <div class="kv-item">
              <div class="kv-label">Mã đơn hàng:</div>
              <div class="kv-value">${invoice.orderCode || "N/A"}</div>
            </div>
            <div class="kv-item">
              <div class="kv-label">Loại hóa đơn:</div>
              <div class="kv-value">${
                invoice.invoiceType === "booking"
                  ? "Thanh toán đặt lịch"
                  : "Thanh toán dịch vụ"
              }</div>
            </div>
            <div class="kv-item">
              <div class="kv-label">Ngày tạo:</div>
              <div class="kv-value">${invoiceDate}</div>
            </div>
            ${
              invoice.paidAt
                ? `
            <div class="kv-item">
              <div class="kv-label">Ngày thanh toán:</div>
              <div class="kv-value">${paidDate}</div>
            </div>
            `
                : ""
            }
          </div>
        </div>

        <div class="section">
          <h2>Thông tin bệnh nhân</h2>
          <div class="kv-2col">
            <div class="kv-item">
              <div class="kv-label">Họ và tên:</div>
              <div class="kv-value">${invoice.patientName || "N/A"}</div>
            </div>
            ${
              invoice.patientPhone
                ? `
            <div class="kv-item">
              <div class="kv-label">Số điện thoại:</div>
              <div class="kv-value">${invoice.patientPhone}</div>
            </div>
            `
                : ""
            }
            ${
              invoice.patientDateOfBirth
                ? `
            <div class="kv-item">
              <div class="kv-label">Ngày sinh:</div>
              <div class="kv-value">${patientDob}</div>
            </div>
            `
                : ""
            }
            ${
              invoice.patientGender
                ? `
            <div class="kv-item">
              <div class="kv-label">Giới tính:</div>
              <div class="kv-value">${genderText}</div>
            </div>
            `
                : ""
            }
          </div>
        </div>

        <div class="section">
          <h2>Thông tin bác sĩ</h2>
          <div class="kv-2col">
            <div class="kv-item">
              <div class="kv-label">Họ và tên:</div>
              <div class="kv-value">${invoice.doctorName || "N/A"}</div>
            </div>
            ${
              invoice.clinicName
                ? `
            <div class="kv-item">
              <div class="kv-label">Phòng khám:</div>
              <div class="kv-value">${invoice.clinicName}</div>
            </div>
            `
                : ""
            }
          </div>
        </div>

        ${
          invoice.items && invoice.items.length > 0
            ? `
        <div class="section">
          <h2>Chi tiết dịch vụ</h2>
          <table>
            <thead>
              <tr>
                <th style="text-align:left">Mô tả</th>
                <th style="text-align:center">Số lượng</th>
                <th style="text-align:right">Đơn giá</th>
                <th style="text-align:right">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>
        </div>
        `
            : ""
        }

        <div class="section">
          <h2>Tổng thanh toán</h2>
          <div class="info-row total-row">
            <span class="total-label">Tổng cộng:</span>
            <span class="total-value">${formatCurrency(
              invoice.total || 0
            )}</span>
          </div>
          ${
            invoice.discount > 0
              ? `
          <div class="info-row" style="color: #6b7280; font-size: 12pt;">
            <span>(Đã giảm giá: ${formatCurrency(invoice.discount)})</span>
          </div>
          `
              : ""
          }
        </div>

        <div class="footer">
          <p>Hóa đơn điện tử - MedConnect</p>
          <p>Hóa đơn này có giá trị pháp lý như hóa đơn giấy</p>
        </div>
      </body>
      </html>
    `;
  };

  const handleDownloadInvoice = async (invoice) => {
    try {
      const htmlContent = generateInvoiceDocHTML(invoice);
      const fileName = `hoa-don-${invoice.invoiceNumber || invoice._id}.doc`;

      // Create blob with HTML content that Word can open
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
      console.error("Error downloading invoice:", error);
      showAlert("Có lỗi khi tải xuống hóa đơn. Vui lòng thử lại.");
    }
  };

  const handleDeleteInvoice = async (invoice) => {
    // Xác nhận trước khi xóa
    const confirmMessage = `Bạn có chắc chắn muốn xóa hóa đơn "${invoice.invoiceNumber}"?\n\nLưu ý: Chỉ có thể xóa hóa đơn chưa thanh toán hoặc đã hủy.`;

    showConfirm(confirmMessage, async () => {
      try {
        const response = await api.delete(
          `/api/managers/invoices/${invoice._id}`
        );

        if (response.success) {
          showAlert("Xóa hóa đơn thành công");
          // Reload danh sách hóa đơn
          loadInvoices();
        } else {
          showAlert(response.message || "Có lỗi khi xóa hóa đơn");
        }
      } catch (error) {
        console.error("Error deleting invoice:", error);
        const errorMessage =
          error.response?.data?.message ||
          "Có lỗi khi xóa hóa đơn. Vui lòng thử lại.";
        showAlert(errorMessage);
      }
    });
  };

  const filteredInvoices = invoices.filter((invoice) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      invoice.invoiceNumber?.toLowerCase().includes(term) ||
      invoice.patientName?.toLowerCase().includes(term) ||
      invoice.doctorName?.toLowerCase().includes(term) ||
      invoice.orderCode?.toString().includes(term)
    );
  });

  return (
    <div className="invoice-management">
      <div className="invoice-management-header">
        <div className="header-left">
          <h1>
            <FileText className="icon" />
            Quản lý hóa đơn
          </h1>
        </div>
        <div className="header-right">
          {/* Add action buttons here if needed */}
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filters-row">
          <div className="filter-item">
            <Search className="w-4 h-4" />
            <Input
              type="text"
              placeholder="Tìm theo mã hóa đơn, tên bệnh nhân, bác sĩ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filter-item">
            <Calendar className="w-4 h-4" />
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="date-input"
            />
            <span>đến</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="date-input"
            />
          </div>

          <div className="filter-item">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="status-select"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="captured">Đã thanh toán</option>
              <option value="pending_manager">Yêu cầu thanh toán</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-section">
        <div className="tabs-list">
          <button
            className={`tab-button ${activeTab === "all" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("all");
              setPage(1);
            }}
          >
            Tất cả hóa đơn
          </button>
          <button
            className={`tab-button ${activeTab === "booking" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("booking");
              setPage(1);
            }}
          >
            Thanh toán đặt lịch
          </button>
          <button
            className={`tab-button ${activeTab === "service" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("service");
              setPage(1);
            }}
          >
            Thanh toán dịch vụ
          </button>
        </div>

        <div className="tab-content">
          <InvoiceTable
            invoices={filteredInvoices}
            loading={loading}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            getInvoiceTypeText={getInvoiceTypeText}
            handleDownloadInvoice={handleDownloadInvoice}
          />
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Trước
          </Button>
          <span>
            Trang {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Sau
          </Button>
        </div>
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

function InvoiceTable({
  invoices,
  loading,
  formatCurrency,
  formatDate,
  getInvoiceTypeText,
  handleDownloadInvoice,
}) {
  if (loading) {
    return (
      <div className="loading-state">
        <p>Đang tải danh sách hóa đơn...</p>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="empty-state">
        <FileText className="w-12 h-12" />
        <p>Không có hóa đơn nào</p>
      </div>
    );
  }

  return (
    <div className="invoice-table-container">
      <table className="invoice-table">
        <thead>
          <tr>
            <th>Mã hóa đơn</th>
            <th>Loại</th>
            <th>Bệnh nhân</th>
            <th>Bác sĩ</th>
            <th>Ngày tạo</th>
            <th>Tổng tiền</th>
            <th>Chi tiết</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice._id}>
              <td>{invoice.invoiceNumber}</td>
              <td>
                <span className={`invoice-type-badge ${invoice.invoiceType}`}>
                  {getInvoiceTypeText(invoice.invoiceType)}
                </span>
              </td>
              <td>{invoice.patientName}</td>
              <td>{invoice.doctorName}</td>
              <td>{formatDate(invoice.createdAt)}</td>
              <td className="amount-cell">{formatCurrency(invoice.total)}</td>
              <td>
                <div
                  style={{ display: "flex", gap: "8px", alignItems: "center" }}
                >
                  <InvoiceDetailModal invoice={invoice} />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadInvoice(invoice)}
                  >
                    <Download className="w-4 h-4" />
                    Tải xuống
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InvoiceDetailModal({ invoice }) {
  const [showModal, setShowModal] = useState(false);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateOnly = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const getStatusText = (status) => {
    const texts = {
      pending_manager: "Yêu cầu thanh toán",
      captured: "Đã thanh toán",
      initiated: "Đang xử lý",
      authorized: "Đã ủy quyền",
      failed: "Thất bại",
      refunded: "Đã hoàn tiền",
      voided: "Đã hủy",
      cancelled: "Đã hủy",
    };
    return texts[status] || status;
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setShowModal(true)}>
        Xem
      </Button>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Chi tiết hóa đơn</h2>
              <button onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="invoice-detail-section">
                <h3>Thông tin hóa đơn</h3>
                <div className="detail-row">
                  <span>Mã hóa đơn:</span>
                  <span>{invoice.invoiceNumber}</span>
                </div>
                <div className="detail-row">
                  <span>Loại:</span>
                  <span>
                    {invoice.invoiceType === "booking"
                      ? "Thanh toán đặt lịch"
                      : "Thanh toán dịch vụ"}
                  </span>
                </div>
                <div className="detail-row">
                  <span>Phương thức:</span>
                  <span>
                    {invoice.method === "cash"
                      ? "Tiền mặt"
                      : invoice.gateway === "payos"
                      ? "Chuyển khoản (PayOS)"
                      : invoice.method || invoice.gateway || "N/A"}
                  </span>
                </div>
                <div className="detail-row">
                  <span>Mã đơn hàng (PayOS):</span>
                  <span>
                    {invoice.method === "cash" || invoice.gateway === "cash"
                      ? "Không áp dụng"
                      : invoice.orderCode || "N/A"}
                  </span>
                </div>
                <div className="detail-row">
                  <span>Trạng thái:</span>
                  <span>{getStatusText(invoice.status)}</span>
                </div>
                <div className="detail-row">
                  <span>Ngày tạo:</span>
                  <span>{formatDate(invoice.createdAt)}</span>
                </div>
                {invoice.paidAt && (
                  <div className="detail-row">
                    <span>Ngày thanh toán:</span>
                    <span>{formatDate(invoice.paidAt)}</span>
                  </div>
                )}
              </div>

              <div className="invoice-detail-section">
                <h3>Thông tin bệnh nhân</h3>
                <div className="detail-row">
                  <span>Tên:</span>
                  <span>{invoice.patientName}</span>
                </div>
                {invoice.patientPhone && (
                  <div className="detail-row">
                    <span>Điện thoại:</span>
                    <span>{invoice.patientPhone}</span>
                  </div>
                )}
                {invoice.patientDateOfBirth && (
                  <div className="detail-row">
                    <span>Ngày sinh:</span>
                    <span>{formatDateOnly(invoice.patientDateOfBirth)}</span>
                  </div>
                )}
                {invoice.patientGender && (
                  <div className="detail-row">
                    <span>Giới tính:</span>
                    <span>
                      {invoice.patientGender === "male"
                        ? "Nam"
                        : invoice.patientGender === "female"
                        ? "Nữ"
                        : "Khác"}
                    </span>
                  </div>
                )}
              </div>

              <div className="invoice-detail-section">
                <h3>Thông tin bác sĩ</h3>
                <div className="detail-row">
                  <span>Tên:</span>
                  <span>{invoice.doctorName}</span>
                </div>
                {invoice.clinicName && (
                  <div className="detail-row">
                    <span>Phòng khám:</span>
                    <span>{invoice.clinicName}</span>
                  </div>
                )}
              </div>

              {invoice.items && invoice.items.length > 0 && (
                <div className="invoice-detail-section">
                  <h3>Chi tiết dịch vụ</h3>
                  <table className="items-table">
                    <thead>
                      <tr>
                        <th>Mô tả</th>
                        <th>Số lượng</th>
                        <th>Đơn giá</th>
                        <th>Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.items.map((item, index) => (
                        <tr key={index}>
                          <td>{item.description}</td>
                          <td>{item.quantity}</td>
                          <td>{formatCurrency(item.unitPrice)}</td>
                          <td>{formatCurrency(item.lineTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="invoice-detail-section">
                <h3>Tổng thanh toán</h3>
                {invoice.discount > 0 && (
                  <div className="detail-row">
                    <span>Giảm giá:</span>
                    <span>-{formatCurrency(invoice.discount)}</span>
                  </div>
                )}
                <div className="detail-row total-row">
                  <span>Tổng cộng:</span>
                  <span>{formatCurrency(invoice.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
