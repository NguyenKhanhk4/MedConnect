import React, { useState, useEffect } from "react";
import { CalendarOutlined, TeamOutlined, FileTextOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { Card, Button, Row, Col, Badge, List, Empty, Alert } from "antd";
import { api, getManagerAppointments } from "../../../lib/api";
import { DollarSign, Receipt } from "lucide-react";
import "./TrangChu.scss";

export default function TrangChu() {
  const navigate = useNavigate();
  const [leaveRequestCount, setLeaveRequestCount] = useState(0);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [overtimeAppointments, setOvertimeAppointments] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadData();

    // Initial load for overtime appointments
    checkOvertimeAppointments();

    // Set up polling for overtime check (every 30 seconds)
    const overtimeInterval = setInterval(() => {
      checkOvertimeAppointments();
      setCurrentTime(new Date());
    }, 30000);

    // Update current time every minute for display calculation
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => {
      clearInterval(overtimeInterval);
      clearInterval(timeInterval);
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadLeaveRequests(),
        loadPendingPayments(),
        loadInvoices(),
      ]);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkOvertimeAppointments = async () => {
    try {
      // Fetch all "in_progress" appointments
      const response = await getManagerAppointments({ status: "in_progress" });

      if (response && (response.data || Array.isArray(response))) {
        // Handle different response structures if needed, but usually it's response.data or response directly if api wrapper handles it
        // Based on api.js, getManagerAppointments returns r.json()
        // And managerController returns { success: true, count: ..., appointments: ... } or just array?
        // Let's check managerController.js again if needed, but usually response.data is safe if using axios, but here it's fetch.
        // api.js: return r.json();
        // managerController.js: res.status(200).json({ success: true, count: ..., appointments: ... });
        // So it should be response.appointments

        const appointments = response.appointments || response.data || [];
        const now = new Date();

        const overtime = appointments.filter(apt => {
          if (!apt.scheduledEnd) return false;
          const scheduledEnd = new Date(apt.scheduledEnd);
          return now > scheduledEnd;
        });

        setOvertimeAppointments(overtime);
      }
    } catch (error) {
      console.error("Error checking overtime appointments:", error);
    }
  };

  const loadLeaveRequests = async () => {
    try {
      const response = await api.get("/api/managers/leave-requests?status=pending");
      if (response.success) {
        setLeaveRequestCount(response.data.leaveRequests?.length || 0);
      }
    } catch (error) {
      console.error("Error loading leave requests:", error);
    }
  };

  const loadPendingPayments = async () => {
    try {
      const response = await api.get("/api/managers/service-payments/pending?limit=3");
      if (response.success) {
        setPendingPayments(response.data.payments || []);
      }
    } catch (error) {
      console.error("Error loading pending payments:", error);
    }
  };

  const loadInvoices = async () => {
    try {
      const response = await api.get("/api/managers/invoices?limit=5");
      if (response.success) {
        setInvoices(response.data.invoices || []);
      }
    } catch (error) {
      console.error("Error loading invoices:", error);
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
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusText = (status) => {
    const texts = {
      pending_manager: "Yêu cầu thanh toán",
      captured: "Đã thanh toán",
      initiated: "Đang xử lý",
      failed: "Thất bại",
      refunded: "Đã hoàn tiền",
      cancelled: "Đã hủy",
    };
    return texts[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending_manager: "#fbbf24",
      captured: "#10b981",
      initiated: "#3b82f6",
      failed: "#ef4444",
      refunded: "#6b7280",
      cancelled: "#9ca3af",
    };
    return colors[status] || "#6b7280";
  };

  return (
    <div className="manager-dashboard">
      <div className="dashboard-header">
        <h1>Quản lý</h1>
        <p>Quản lý lịch làm việc của các bác sĩ</p>
      </div>

      {/* Overtime Alerts */}
      {overtimeAppointments.length > 0 && (
        <div className="overtime-alerts" style={{ marginBottom: 24 }}>
          {overtimeAppointments.map(apt => {
            const scheduledEnd = new Date(apt.scheduledEnd);
            const now = new Date();
            const diffMs = now - scheduledEnd;
            const diffMins = Math.floor(diffMs / 60000);

            return (
              <Alert
                key={apt._id}
                message="Cảnh báo quá giờ"
                description={
                  <span>
                    Bác sĩ <strong>{apt.doctorId?.fullName || apt.doctorName}</strong> đang khám quá giờ <strong>{diffMins} phút</strong> (Bệnh nhân: {apt.patientId?.fullName || apt.patientName})
                  </span>
                }
                type="warning"
                showIcon
                style={{ marginBottom: 8 }}
              />
            );
          })}
        </div>
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8}>
          <Card
            hoverable
            className="dashboard-card"
            onClick={() => navigate("/manager/quan-ly-lich")}
          >
            <div className="card-content">
              <CalendarOutlined className="card-icon" />
              <div className="card-info">
                <h3>Quản lý lịch</h3>
                <p>Xem và quản lý lịch làm việc của bác sĩ</p>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <Card
            hoverable
            className="dashboard-card"
            onClick={() => navigate("/manager/danh-sach-bac-si")}
          >
            <div className="card-content">
              <TeamOutlined className="card-icon" />
              <div className="card-info">
                <h3>Danh sách bác sĩ</h3>
                <p>Xem danh sách tất cả bác sĩ</p>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <Card
            hoverable
            className="dashboard-card leave-requests-card"
            onClick={() => navigate("/manager/yeu-cau-nghi-phep")}
          >
            <div className="card-content">
              <FileTextOutlined className="card-icon" />
              <div className="card-info">
                <h3>Yêu cầu nghỉ phép</h3>
                <p>Quản lý yêu cầu nghỉ phép của bác sĩ</p>
                {leaveRequestCount > 0 && (
                  <Badge count={leaveRequestCount} className="card-badge" />
                )}
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Pending Payments and Notifications - Side by Side */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        {/* Pending Payments List - Half width */}
        <Col xs={24} lg={12}>
          <Card
            className="pending-payments-card"
            title={
              <div className="card-title-with-action">
                <span>
                  <DollarSign size={20} style={{ marginRight: 8 }} />
                  Yêu cầu thanh toán
                </span>
                <Button
                  type="link"
                  onClick={() => navigate("/manager/thanh-toan-dich-vu")}
                >
                  Xem tất cả
                </Button>
              </div>
            }
          >
            {loading ? (
              <div className="loading-state">Đang tải...</div>
            ) : pendingPayments.length === 0 ? (
              <Empty description="Không có yêu cầu thanh toán nào" />
            ) : (
              <List
                itemLayout="horizontal"
                dataSource={pendingPayments}
                renderItem={(payment) => (
                  <List.Item
                    className="payment-item"
                    onClick={() => navigate("/manager/thanh-toan-dich-vu")}
                  >
                    <List.Item.Meta
                      title={
                        <div className="payment-item-title">
                          <span>{payment.patientName || "N/A"}</span>
                          <span className="payment-amount">
                            {formatCurrency(payment.total)}
                          </span>
                        </div>
                      }
                      description={
                        <div className="payment-item-description">
                          <span>BS. {payment.doctorName || "N/A"}</span>
                          <span>•</span>
                          <span>{formatDate(payment.createdAt)}</span>
                          <span>•</span>
                          <span className="payment-status">
                            {payment.status === "pending_manager"
                              ? "Chờ xử lý"
                              : "Đang xử lý"}
                          </span>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        {/* Invoices Card - Half width */}
        <Col xs={24} lg={12}>
          <Card
            className="invoices-card"
            title={
              <div className="card-title-with-action">
                <span>
                  <Receipt size={20} style={{ marginRight: 8 }} />
                  Hóa đơn
                </span>
                <Button
                  type="link"
                  onClick={() => navigate("/manager/quan-ly-hoa-don")}
                >
                  Xem tất cả
                </Button>
              </div>
            }
          >
            {loading ? (
              <div className="loading-state">Đang tải...</div>
            ) : invoices.length === 0 ? (
              <Empty description="Không có hóa đơn nào" />
            ) : (
              <List
                itemLayout="vertical"
                dataSource={invoices}
                renderItem={(invoice) => (
                  <List.Item
                    className="invoice-item"
                    onClick={() => navigate("/manager/quan-ly-hoa-don")}
                  >
                    <div className="invoice-content">
                      <div className="invoice-header">
                        <div className="invoice-info">
                          <h4 className="invoice-title">
                            {invoice.invoiceNumber || "N/A"}
                          </h4>
                          <span
                            className="invoice-status"
                            style={{
                              backgroundColor: getStatusColor(invoice.status),
                              color: "white",
                            }}
                          >
                            {getStatusText(invoice.status)}
                          </span>
                        </div>
                        <span className="invoice-amount">
                          {formatCurrency(invoice.total)}
                        </span>
                      </div>
                      <div className="invoice-details">
                        <span>{invoice.patientName || "N/A"}</span>
                        <span>•</span>
                        <span>BS. {invoice.doctorName || "N/A"}</span>
                        <span>•</span>
                        <span>{formatDate(invoice.createdAt)}</span>
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
