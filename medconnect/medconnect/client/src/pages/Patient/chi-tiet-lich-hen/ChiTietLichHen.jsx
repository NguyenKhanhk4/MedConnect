import React from "react";
import { Modal, Card, Typography, Button, Space, Spin } from "antd";
import {
  CalendarOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  UserOutlined,
  PhoneOutlined,
  FileTextOutlined,
  MedicineBoxOutlined,
} from "@ant-design/icons";
import { useAppointmentDetails } from "../../../hooks/useAppointmentDetails";
import {
  getStatusTag,
  formatDateTime,
  getRelationshipText,
  getAppointmentModeText,
} from "../../../utils/appointmentUtils";

const { Title, Text, Paragraph } = Typography;

const ChiTietLichHen = ({ visible, onClose, appointmentId }) => {
  const { appointment, loading } = useAppointmentDetails(
    visible,
    appointmentId
  );

  if (loading) {
    return (
      <Modal
        title="Chi tiết lịch hẹn"
        open={visible}
        onCancel={onClose}
        footer={null}
        width={600}
      >
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>Đang tải thông tin...</div>
        </div>
      </Modal>
    );
  }

  if (!appointment) {
    return (
      <Modal
        title="Chi tiết lịch hẹn"
        open={visible}
        onCancel={onClose}
        footer={null}
        width={600}
      >
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <Text type="secondary">Không tìm thấy thông tin lịch hẹn</Text>
        </div>
      </Modal>
    );
  }

  const { date, time } = formatDateTime(appointment.scheduledStart);

  return (
    <Modal
      title="Chi tiết lịch hẹn"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Đóng
        </Button>,
      ]}
      width={600}
      style={{ top: 50 }}
      styles={{ body: { padding: 0, overflow: "hidden" } }}
    >
      <div
        style={{
          maxHeight: "calc(70vh - 40px)",
          overflow: "auto",
          padding: "20px",
          paddingRight: "16px",
        }}
      >
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          {/* Status */}
          <div>
            <Text strong>Trạng thái: </Text>
            {getStatusTag(appointment.status)}
          </div>

          {/* Date & Time */}
          <Card size="small">
            <Space direction="vertical" size="small">
              <div>
                <CalendarOutlined
                  style={{ marginRight: 8, color: "#1890ff" }}
                />
                <Text strong>{date}</Text>
              </div>
              <div>
                <ClockCircleOutlined
                  style={{ marginRight: 8, color: "#1890ff" }}
                />
                <Text>{time}</Text>
              </div>
            </Space>
          </Card>

          {/* Doctor Info */}
          <Card size="small" title="Thông tin bác sĩ">
            <Space direction="vertical" size="small">
              <div>
                <UserOutlined style={{ marginRight: 8, color: "#52c41a" }} />
                <Text strong>
                  {appointment.doctorId?.fullName || "Chưa xác định"}
                </Text>
              </div>
              <div>
                <Text type="secondary">
                  Chuyên khoa:{" "}
                  {appointment.doctorId?.specializationIds?.[0]?.name ||
                    "Chưa xác định"}
                </Text>
              </div>
              <div>
                <PhoneOutlined style={{ marginRight: 8, color: "#52c41a" }} />
                <Text>
                  {appointment.doctorId?.phone ||
                    appointment.doctorId?.userId?.phone ||
                    "Chưa cập nhật"}
                </Text>
              </div>
            </Space>
          </Card>

          {/* Patient Info (if booked for family member) */}
          {appointment.patientId?.relationshipToOwner &&
            appointment.patientId.relationshipToOwner !== "self" && (
              <Card size="small" title="Thông tin người thân">
                <Space direction="vertical" size="small">
                  <div>
                    <UserOutlined
                      style={{ marginRight: 8, color: "#f59e0b" }}
                    />
                    <Text strong>
                      {appointment.patientId?.fullName || "Chưa xác định"}
                    </Text>
                  </div>
                  <div>
                    <Text type="secondary">
                      Quan hệ:{" "}
                      {getRelationshipText(
                        appointment.patientId.relationshipToOwner
                      )}
                    </Text>
                  </div>
                  {appointment.patientId?.phone && (
                    <div>
                      <PhoneOutlined
                        style={{ marginRight: 8, color: "#f59e0b" }}
                      />
                      <Text>{appointment.patientId.phone}</Text>
                    </div>
                  )}
                  {appointment.patientId?.userId && (
                    <div
                      style={{
                        marginTop: 8,
                        paddingTop: 8,
                        borderTop: "1px solid #f0f0f0",
                      }}
                    >
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        👤 Đặt hộ bởi:{" "}
                        {appointment.patientId.userId?.fullName ||
                          "Chưa xác định"}
                      </Text>
                      {appointment.patientId.userId?.phone && (
                        <div>
                          <PhoneOutlined
                            style={{
                              marginRight: 4,
                              color: "#8c8c8c",
                              fontSize: 12,
                            }}
                          />
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {appointment.patientId.userId.phone}
                          </Text>
                        </div>
                      )}
                    </div>
                  )}
                </Space>
              </Card>
            )}

          {/* Location */}
          <Card size="small" title="Thông tin khám">
            <Space direction="vertical" size="small">
              <div>
                <EnvironmentOutlined
                  style={{ marginRight: 8, color: "#fa8c16" }}
                />
                <Text strong>{getAppointmentModeText(appointment.mode)}</Text>
              </div>
              {appointment.mode === "offline" && appointment.clinicId && (
                <div>
                  <Text type="secondary">
                    Phòng khám: {appointment.clinicId.name}
                  </Text>
                </div>
              )}
              {appointment.reason && (
                <div>
                  <Text type="secondary">
                    <Text strong>Lý do khám: </Text>
                    {appointment.reason}
                  </Text>
                </div>
              )}
            </Space>
          </Card>

          {/* Additional Info */}
          {(appointment.consultationSummary || appointment.prescription) && (
            <Card size="small" title="Tài liệu">
              <Space direction="vertical" size="small">
                {appointment.consultationSummary && (
                  <Button type="link" icon={<FileTextOutlined />}>
                    Xem tóm tắt khám
                  </Button>
                )}
                {appointment.prescription && (
                  <Button type="link" icon={<MedicineBoxOutlined />}>
                    Xem đơn thuốc
                  </Button>
                )}
              </Space>
            </Card>
          )}

          {/* Notes */}
          {appointment.notes && (
            <Card size="small" title="Ghi chú">
              <Paragraph>{appointment.notes}</Paragraph>
            </Card>
          )}
        </Space>
      </div>
    </Modal>
  );
};

export default ChiTietLichHen;
