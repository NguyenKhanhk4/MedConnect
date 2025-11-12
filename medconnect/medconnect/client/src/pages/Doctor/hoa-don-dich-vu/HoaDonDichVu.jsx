import React, { useState, useEffect } from "react";
import { api, updateAppointmentStatus } from "../../../lib/api";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { X, Check, FileText, Search } from "lucide-react";
import { CustomAlert } from "../../../components/ui/CustomAlert";
import "./HoaDonDichVu.scss";

export default function HoaDonDichVu({ appointment, onClose, onSuccess }) {
  const [services, setServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [servicePaymentStatus, setServicePaymentStatus] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [autoCompleted, setAutoCompleted] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);

  // Helper function to show custom alert
  const showAlert = (message) => {
    setAlertMessage(message);
  };

  useEffect(() => {
    if (appointment) {
      loadServices();
      checkServicePayment();
    }
  }, [appointment]);

  // Tự động chuyển trạng thái lịch hẹn sang hoàn thành khi hóa đơn đã thanh toán
  useEffect(() => {
    const tryAutoComplete = async () => {
      if (
        appointment?._id &&
        servicePaymentStatus?.hasServicePayment &&
        servicePaymentStatus.servicePayment.status === "captured" &&
        !autoCompleted
      ) {
        try {
          await updateAppointmentStatus(appointment._id, "done");
          setAutoCompleted(true);
          if (onSuccess) onSuccess();
        } catch (e) {
          // Ignore if transition invalid; status may already be done
        }
      }
    };
    tryAutoComplete();
  }, [appointment?._id, servicePaymentStatus, autoCompleted, onSuccess]);

  const loadServices = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/service-prices/active");

      if (response.success) {
        setServices(response.data.servicePrices || []);
      } else {
        showAlert("Không thể tải danh sách dịch vụ");
      }
    } catch (error) {
      console.error("Error loading services:", error);
      showAlert("Có lỗi xảy ra khi tải danh sách dịch vụ");
    } finally {
      setLoading(false);
    }
  };

  const checkServicePayment = async () => {
    if (!appointment?._id) return;

    try {
      const response = await api.get(
        `/api/doctors/me/appointments/${appointment._id}/service-payment`
      );

      if (response.success) {
        setServicePaymentStatus(response.data);
      }
    } catch (error) {
      console.error("Error checking service payment:", error);
    }
  };

  const handleServiceToggle = (service) => {
    setSelectedServices((prev) => {
      const isSelected = prev.some((s) => s._id === service._id);
      if (isSelected) {
        return prev.filter((s) => s._id !== service._id);
      } else {
        return [...prev, service];
      }
    });
  };

  const calculateTotal = () => {
    return selectedServices.reduce((sum, service) => sum + service.price, 0);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  const handleRequestPayment = async () => {
    if (selectedServices.length === 0) {
      showAlert("Vui lòng chọn ít nhất một dịch vụ");
      return;
    }

    try {
      setCreating(true);
      const total = calculateTotal();
      const serviceIds = selectedServices.map((s) => s._id);

      // Gửi yêu cầu thanh toán đến manager
      const response = await api.post(
        `/api/doctors/me/appointments/${appointment._id}/service-payment`,
        {
          serviceIds,
          amount: total,
        }
      );

      if (response.success) {
        showAlert(response.message || "Yêu cầu thanh toán đã được gửi đến manager");
        // Reload để cập nhật trạng thái
        checkServicePayment();
        // Reset selected services
        setSelectedServices([]);
        // Close modal nếu cần
        if (onSuccess) {
          onSuccess();
        }
      } else {
        showAlert(response.message || "Không thể gửi yêu cầu thanh toán");
      }
    } catch (error) {
      console.error("Error requesting service payment:", error);
      showAlert("Có lỗi xảy ra khi gửi yêu cầu thanh toán");
    } finally {
      setCreating(false);
    }
  };

  if (!appointment) {
    return null;
  }

  const patient = appointment.patientId || appointment.patient || {};

  return (
    <div className="service-invoice-overlay" onClick={onClose}>
      <div
        className="service-invoice-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="service-invoice-header">
          <h2>
            <FileText className="icon" />
            Ghi hóa đơn dịch vụ
          </h2>
          <button className="btn-close" onClick={onClose}>
            <X className="icon" />
          </button>
        </div>

        <div className="service-invoice-content">
          {/* Patient Info */}
          <div className="patient-info-section">
            <h3>Thông tin bệnh nhân</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>Họ và tên:</label>
                <span>{patient.fullName || "N/A"}</span>
              </div>
              <div className="info-item">
                <label>Số điện thoại:</label>
                <span>{patient.phone || patient.userId?.phone || "N/A"}</span>
              </div>
              <div className="info-item">
                <label>Email:</label>
                <span>{patient.email || patient.userId?.email || "N/A"}</span>
              </div>
              <div className="info-item">
                <label>Ngày khám:</label>
                <span>
                  {new Date(appointment.scheduledStart).toLocaleDateString(
                    "vi-VN"
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Service Selection */}
          <div className="services-section">
            <h3>Chọn dịch vụ</h3>
            {loading ? (
              <div className="loading">Đang tải danh sách dịch vụ...</div>
            ) : services.length === 0 ? (
              <div className="empty-state">
                Chưa có dịch vụ nào. Vui lòng liên hệ manager để thêm dịch vụ.
              </div>
            ) : (
              <>
                <div className="service-search">
                  <div className="search-input-wrapper">
                    <Search className="search-icon" />
                    <Input
                      type="text"
                      placeholder="Tìm kiếm dịch vụ..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="search-input"
                    />
                  </div>
                </div>
                <div className="services-list">
                  {services
                    .filter((service) =>
                      service.serviceName
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase())
                    )
                    .map((service) => {
                      const isSelected = selectedServices.some(
                        (s) => s._id === service._id
                      );
                      return (
                        <div
                          key={service._id}
                          className={`service-item ${
                            isSelected ? "selected" : ""
                          }`}
                          onClick={() => handleServiceToggle(service)}
                        >
                          <div className="service-checkbox">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleServiceToggle(service)}
                            />
                          </div>
                          <div className="service-details">
                            <div className="service-name">
                              {service.serviceName}
                            </div>
                            <div className="service-price">
                              {formatPrice(service.price)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </>
            )}
          </div>

          {/* Total */}
          {selectedServices.length > 0 && (
            <div className="total-section">
              <div className="total-row">
                <span className="total-label">Tổng tiền:</span>
                <span className="total-amount">
                  {formatPrice(calculateTotal())}
                </span>
              </div>
            </div>
          )}

          {/* Check existing payment */}
          {servicePaymentStatus?.hasServicePayment && (
            <div
              className={`already-paid-message ${
                servicePaymentStatus.servicePayment.status === "captured"
                  ? "paid"
                  : "pending"
              }`}
            >
              <Check className="icon" />
              <span>
                {servicePaymentStatus.servicePayment.status === "captured"
                  ? `Hóa đơn dịch vụ đã được thanh toán. Mã hóa đơn: ${servicePaymentStatus.servicePayment.invoiceNumber}`
                  : servicePaymentStatus.servicePayment.status ===
                    "pending_manager"
                  ? `Yêu cầu thanh toán đã được gửi đến manager. Mã hóa đơn: ${servicePaymentStatus.servicePayment.invoiceNumber}`
                  : `Trạng thái: ${servicePaymentStatus.servicePayment.status}. Mã hóa đơn: ${servicePaymentStatus.servicePayment.invoiceNumber}`}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="invoice-actions">
            <Button variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button
              onClick={handleRequestPayment}
              disabled={
                selectedServices.length === 0 ||
                creating ||
                (servicePaymentStatus?.hasServicePayment &&
                  (servicePaymentStatus.servicePayment.status === "captured" ||
                    servicePaymentStatus.servicePayment.status ===
                      "pending_manager" ||
                    servicePaymentStatus.servicePayment.status === "initiated"))
              }
              className="btn-create"
            >
              {creating ? "Đang gửi..." : "Yêu cầu thanh toán"}
            </Button>
          </div>
        </div>
      </div>

      {/* Custom Alert */}
      <CustomAlert
        message={alertMessage}
        onClose={() => setAlertMessage(null)}
        title="Hệ thống MedConnect"
      />
    </div>
  );
}
