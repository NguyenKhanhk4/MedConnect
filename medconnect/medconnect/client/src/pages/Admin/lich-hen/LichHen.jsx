import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  message,
  Spin,
  Alert,
  Row,
  Col,
  Statistic,
} from "antd";
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
  CalendarOutlined,
  UserOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import {
  getAdminAppointments,
  updateAdminAppointmentStatus,
  deleteAdminAppointment,
} from "../../../lib/api";
import "./LichHen.scss";

const { Option } = Select;
const { RangePicker } = DatePicker;

const LichHen = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
  });

  useEffect(() => {
    fetchAppointments();
  }, [statusFilter, dateRange]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);

      const params = {};
      if (statusFilter !== "all") params.status = statusFilter;
      if (dateRange && dateRange.length === 2) {
        params.startDate = dateRange[0].format("YYYY-MM-DD");
        params.endDate = dateRange[1].format("YYYY-MM-DD");
      }

      const data = await getAdminAppointments(params);
      setAppointments(data.data || data);

      // Calculate stats
      const statsData = {
        total: data.data?.length || 0,
        pending:
          data.data?.filter((apt) => apt.status === "pending_doctor").length ||
          0,
        confirmed:
          data.data?.filter((apt) => apt.status === "confirmed").length || 0,
        completed:
          data.data?.filter((apt) => apt.status === "done").length || 0,
        cancelled:
          data.data?.filter((apt) => apt.status === "cancelled").length || 0,
      };
      setStats(statsData);
    } catch (err) {
      console.error("Error fetching appointments:", err);
      setError("Không thể tải danh sách lịch hẹn");
    } finally {
      setLoading(false);
    }
  };

  const getStatusTag = (status) => {
    const statusConfig = {
      pending_doctor: { color: "orange", text: "Chờ bác sĩ" },
      accepted: { color: "blue", text: "Đã chấp nhận" },
      rejected: { color: "red", text: "Bị từ chối" },
      confirmed: { color: "green", text: "Đã xác nhận" },
      in_progress: { color: "cyan", text: "Đang khám" },
      cancelled: { color: "red", text: "Đã hủy" },
      auto_cancelled: { color: "red", text: "Tự động hủy" },
      done: { color: "green", text: "Hoàn thành" },
      no_show: { color: "gray", text: "Không đến" },
    };
    return statusConfig[status] || { color: "default", text: status };
  };

  const getModeTag = (mode) => {
    return mode === "online"
      ? { color: "blue", text: "Trực tuyến" }
      : { color: "green", text: "Tại phòng khám" };
  };

  const handleStatusChange = async (appointmentId, newStatus) => {
    try {
      await updateAdminAppointmentStatus(appointmentId, newStatus);
      message.success("Đã cập nhật trạng thái lịch hẹn");
      fetchAppointments();
    } catch (err) {
      console.error("Error updating appointment status:", err);
      message.error("Có lỗi xảy ra khi cập nhật trạng thái");
    }
  };

  const handleDeleteAppointment = async (appointmentId) => {
    try {
      await deleteAdminAppointment(appointmentId);
      message.success("Đã xóa lịch hẹn");
      fetchAppointments();
    } catch (err) {
      console.error("Error deleting appointment:", err);
      message.error("Có lỗi xảy ra khi xóa lịch hẹn");
    }
  };

  const handleViewDetails = (appointment) => {
    setSelectedAppointment(appointment);
    setIsModalVisible(true);
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "sequentialId",
      key: "sequentialId",
      width: 80,
      render: (id) => `#${id}`,
    },
    {
      title: "Bệnh nhân",
      dataIndex: "patientName",
      key: "patientName",
      render: (text, record) => (
        <div>
          <div className="patient-name">{text}</div>
          <div className="patient-email">{record.patientEmail}</div>
          {record.patientPhone &&
            record.patientPhone !== "Chưa có số điện thoại" && (
              <div className="patient-phone">📞 {record.patientPhone}</div>
            )}
        </div>
      ),
    },
    {
      title: "Bác sĩ",
      dataIndex: "doctorName",
      key: "doctorName",
      render: (text, record) => (
        <div>
          <div className="doctor-name">{text}</div>
          <div className="doctor-specialty">{record.doctorSpecialty}</div>
          {record.doctorLicense &&
            record.doctorLicense !== "Chưa có số giấy phép" && (
              <div className="doctor-license">📋 {record.doctorLicense}</div>
            )}
        </div>
      ),
    },
    {
      title: "Thời gian",
      dataIndex: "scheduledStart",
      key: "scheduledStart",
      render: (date, record) => (
        <div>
          <div className="appointment-date">{record.appointmentDate}</div>
          <div className="appointment-time">{record.appointmentTime}</div>
        </div>
      ),
    },
    {
      title: "Loại",
      dataIndex: "mode",
      key: "mode",
      render: (mode) => {
        const config = getModeTag(mode);
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        const config = getStatusTag(status);
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: "Hành động",
      key: "actions",
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetails(record)}
            title="Xem chi tiết"
          />
          {record.status === "pending_doctor" && (
            <>
              <Button
                type="text"
                icon={<CheckOutlined />}
                onClick={() => handleStatusChange(record.id, "confirmed")}
                title="Xác nhận"
              />
              <Button
                type="text"
                icon={<CloseOutlined />}
                onClick={() => handleStatusChange(record.id, "cancelled")}
                title="Hủy"
              />
            </>
          )}
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteAppointment(record.id)}
            title="Xóa"
          />
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="appointment-management">
        <div className="page-header">
          <h1>Quản lý lịch hẹn</h1>
          <p>Xem và quản lý tất cả lịch hẹn khám trong hệ thống</p>
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
      <div className="appointment-management">
        <div className="page-header">
          <h1>Quản lý lịch hẹn</h1>
          <p>Xem và quản lý tất cả lịch hẹn khám trong hệ thống</p>
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

  return (
    <div className="appointment-management">
      <div className="page-header">
        <h1>Quản lý lịch hẹn</h1>
        <p>Xem và quản lý tất cả lịch hẹn khám trong hệ thống</p>
      </div>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} className="stats-row">
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tổng lịch hẹn"
              value={stats.total}
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Chờ xác nhận"
              value={stats.pending}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: "#faad14" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Đã xác nhận"
              value={stats.confirmed}
              prefix={<CheckOutlined />}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Hoàn thành"
              value={stats.completed}
              prefix={<CheckOutlined />}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="filters-card">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: "100%" }}
              placeholder="Lọc theo trạng thái"
            >
              <Option value="all">Tất cả trạng thái</Option>
              <Option value="pending_doctor">Chờ bác sĩ</Option>
              <Option value="accepted">Đã chấp nhận</Option>
              <Option value="confirmed">Đã xác nhận</Option>
              <Option value="in_progress">Đang khám</Option>
              <Option value="done">Hoàn thành</Option>
              <Option value="cancelled">Đã hủy</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              style={{ width: "100%" }}
              placeholder={["Từ ngày", "Đến ngày"]}
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Button onClick={fetchAppointments} type="primary">
              Lọc
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Appointments Table */}
      <Card title={`Danh sách lịch hẹn (${appointments.length})`}>
        <Table
          columns={columns}
          dataSource={appointments}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} của ${total} lịch hẹn`,
          }}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* Appointment Details Modal */}
      <Modal
        title="Chi tiết lịch hẹn"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsModalVisible(false)}>
            Đóng
          </Button>,
        ]}
        width={600}
      >
        {selectedAppointment && (
          <div className="appointment-details">
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <div className="detail-item">
                  <strong>ID:</strong> #{selectedAppointment.sequentialId}
                </div>
              </Col>
              <Col span={12}>
                <div className="detail-item">
                  <strong>Trạng thái:</strong>
                  <Tag color={getStatusTag(selectedAppointment.status).color}>
                    {getStatusTag(selectedAppointment.status).text}
                  </Tag>
                </div>
              </Col>
              <Col span={24}>
                <div className="detail-section">
                  <h4>👤 Thông tin bệnh nhân</h4>
                  <div className="detail-item">
                    <strong>Tên:</strong> {selectedAppointment.patientName}
                  </div>
                  <div className="detail-item">
                    <strong>Email:</strong> {selectedAppointment.patientEmail}
                  </div>
                  {selectedAppointment.patientPhone && (
                    <div className="detail-item">
                      <strong>Số điện thoại:</strong>{" "}
                      {selectedAppointment.patientPhone}
                    </div>
                  )}
                  {selectedAppointment.patientAddress && (
                    <div className="detail-item">
                      <strong>Địa chỉ:</strong>{" "}
                      {selectedAppointment.patientAddress}
                    </div>
                  )}
                </div>
              </Col>
              <Col span={24}>
                <div className="detail-section">
                  <h4>👨‍⚕️ Thông tin bác sĩ</h4>
                  <div className="detail-item">
                    <strong>Tên:</strong> {selectedAppointment.doctorName}
                  </div>
                  <div className="detail-item">
                    <strong>Chuyên khoa:</strong>{" "}
                    {selectedAppointment.doctorSpecialty}
                  </div>
                  {selectedAppointment.doctorLicense && (
                    <div className="detail-item">
                      <strong>Số giấy phép:</strong>{" "}
                      {selectedAppointment.doctorLicense}
                    </div>
                  )}
                  {selectedAppointment.doctorBio && (
                    <div className="detail-item">
                      <strong>Giới thiệu:</strong>{" "}
                      {selectedAppointment.doctorBio}
                    </div>
                  )}
                </div>
              </Col>
              <Col span={12}>
                <div className="detail-item">
                  <strong>Ngày:</strong> {selectedAppointment.appointmentDate}
                </div>
              </Col>
              <Col span={12}>
                <div className="detail-item">
                  <strong>Giờ:</strong> {selectedAppointment.appointmentTime}
                </div>
              </Col>
              <Col span={12}>
                <div className="detail-item">
                  <strong>Loại:</strong>
                  <Tag color={getModeTag(selectedAppointment.mode).color}>
                    {getModeTag(selectedAppointment.mode).text}
                  </Tag>
                </div>
              </Col>
              {selectedAppointment.clinicName && (
                <Col span={12}>
                  <div className="detail-item">
                    <strong>Phòng khám:</strong>{" "}
                    {selectedAppointment.clinicName}
                  </div>
                </Col>
              )}
              {selectedAppointment.reason && (
                <Col span={24}>
                  <div className="detail-item">
                    <strong>Lý do khám:</strong> {selectedAppointment.reason}
                  </div>
                </Col>
              )}
            </Row>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default LichHen;
