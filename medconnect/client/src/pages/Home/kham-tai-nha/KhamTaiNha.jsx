import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Button,
  Input,
  Select,
  Card,
  Row,
  Col,
  Typography,
  Space,
  Tag,
  Steps,
  Divider,
  Form,
  DatePicker,
  TimePicker,
  Checkbox,
  Modal,
  Alert,
  Rate,
  Avatar,
  Badge,
  Spin,
  Empty,
  message,
} from "antd";
import {
  SearchOutlined,
  HeartOutlined,
  CalendarOutlined,
  SafetyOutlined,
  FileTextOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CreditCardOutlined,
  VideoCameraOutlined,
  HomeOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  StarOutlined,
  CheckCircleOutlined,
  MedicineBoxOutlined,
  TeamOutlined,
  CarOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import { api } from "../../../lib/api";
import { useAuth } from "../../../hooks/useAuth";
import "./KhamTaiNha.css";

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const KhamTaiNha = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [bookingForm] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  const services = [
    {
      id: "online",
      title: "Khám trực tuyến",
      description: "Tư vấn và khám bệnh qua video call với bác sĩ chuyên khoa",
      icon: (
        <VideoCameraOutlined style={{ fontSize: "24px", color: "#45c3d2" }} />
      ),
    },
    {
      id: "clinic",
      title: "Khám tại phòng khám",
      description: "Đặt lịch khám trực tiếp tại phòng khám với bác sĩ",
      icon: <MedicineBoxOutlined style={{ fontSize: "24px", color: "#45c3d2" }} />,
    },
    {
      id: "consultation",
      title: "Tư vấn sức khỏe",
      description: "Tư vấn về sức khỏe, dinh dưỡng và lối sống lành mạnh",
      icon: <FileTextOutlined style={{ fontSize: "24px", color: "#45c3d2" }} />,
    },
    {
      id: "followup",
      title: "Tái khám",
      description:
        "Theo dõi và tái khám cho bệnh nhân đang điều trị",
      icon: <HistoryOutlined style={{ fontSize: "24px", color: "#45c3d2" }} />,
    },
  ];

  // Helper function to get specialization names
  const getSpecializationNames = (specializationIds) => {
    if (!specializationIds || specializationIds.length === 0) return "Chuyên khoa";
    return specializationIds
      .map((spec) => {
        return typeof spec === "object" ? spec.name : spec;
      })
      .join(", ");
  };

  // Fetch doctors from API
  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("page", 1);
      params.append("limit", 6); // Limit to 6 doctors for display
      params.append("verified", "true"); // Only show verified doctors

      const url = `/api/doctors?${params.toString()}`;
      const response = await api.get(url);

      if (response.success) {
        setDoctors(response.data.doctors || []);
      } else {
        console.log("❌ Failed to fetch doctors:", response);
        message.error("Không thể tải danh sách bác sĩ");
        setDoctors([]);
      }
    } catch (error) {
      console.error("Error fetching doctors:", error);
      message.error("Có lỗi xảy ra khi tải danh sách bác sĩ");
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch doctors on component mount
  useEffect(() => {
    fetchDoctors();
  }, []);

  const benefits = [
    {
      icon: <VideoCameraOutlined style={{ fontSize: "48px", color: "#45c3d2" }} />,
      title: "Khám từ xa",
      description: "Khám bệnh trực tuyến qua video call, tiện lợi mọi lúc mọi nơi",
    },
    {
      icon: <SafetyOutlined style={{ fontSize: "48px", color: "#45c3d2" }} />,
      title: "An toàn & Bảo mật",
      description: "Thông tin bệnh nhân được bảo mật, tuân thủ quy định y tế",
    },
    {
      icon: (
        <ClockCircleOutlined style={{ fontSize: "48px", color: "#45c3d2" }} />
      ),
      title: "Tiết kiệm thời gian",
      description: "Đặt lịch linh hoạt, không cần chờ đợi, khám ngay tại nhà",
    },
    {
      icon: <HeartOutlined style={{ fontSize: "48px", color: "#45c3d2" }} />,
      title: "Chăm sóc chuyên nghiệp",
      description: "Đội ngũ bác sĩ giàu kinh nghiệm, tư vấn tận tâm",
    },
  ];

  const handleDoctorSelect = (doctor) => {
    // Check if user is logged in
    if (!user) {
      // If not logged in, redirect to login page
      navigate("/dang-nhap", {
        state: {
          from: "/dat-lich/chon-thoi-gian",
          doctor: doctor,
          message: "Vui lòng đăng nhập để đặt lịch khám",
        },
      });
      return;
    }

    // If logged in, navigate to time slot selection page with doctor data
    navigate("/dat-lich/chon-thoi-gian", {
      state: {
        doctor: doctor,
        specialization: doctor.specializationIds?.[0] || null,
      },
    });
  };

  const handleBooking = (values) => {
    console.log("Booking details:", values);
    Modal.success({
      title: "Đặt lịch thành công!",
      content:
        "Chúng tôi sẽ liên hệ với bạn trong vòng 15 phút để xác nhận lịch hẹn.",
    });
    setIsModalVisible(false);
    bookingForm.resetFields();
  };

  return (
    <div className="home-visit">
      <section
        className="hero-section"
        style={{
          background: `linear-gradient(rgba(18, 18, 18, 0.45), rgba(20, 19, 19, 0.45)), url('/Banner2.jpg')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="marquee">
          <p>
            📢 Đặt lịch khám trực tuyến, hỗ trợ bạn đi khám từ lúc vào viện đến
            khi kết thúc khám. Gọi ngay 1900 2267!
          </p>
        </div>
        <div className="container">
          <Row justify="center" align="middle" style={{ minHeight: "400px" }}>
            <Col xs={24} lg={16} style={{ textAlign: "center" }}>
              <Title
                level={1}
                style={{
                  color: "white",
                  fontSize: "2.5rem",
                  marginBottom: "24px",
                  fontWeight: 700,
                }}
              >
                <VideoCameraOutlined style={{ marginRight: "16px" }} />
                Dịch vụ khám bệnh trực tuyến
              </Title>

              <Paragraph
                style={{
                  color: "white",
                  fontSize: "1.2rem",
                  marginBottom: "40px",
                  opacity: 0.95,
                }}
              >
                Kết nối với bác sĩ chuyên khoa - Khám trực tuyến tiện lợi, nhanh chóng và hiệu quả
              </Paragraph>

              <Space size="large">
                <Button
                  type="primary"
                  size="large"
                  icon={<CalendarOutlined />}
                  style={{
                    background: "#ffbf00",
                    borderColor: "#ffbf00",
                    color: "#333",
                    fontWeight: 600,
                    height: "50px",
                    padding: "0 32px",
                  }}
                  onClick={() =>
                    document.getElementById("booking-section").scrollIntoView()
                  }
                >
                  Đặt lịch ngay
                </Button>
                <Button
                  size="large"
                  icon={<PhoneOutlined />}
                  style={{
                    background: "transparent",
                    borderColor: "white",
                    color: "white",
                    fontWeight: 600,
                    height: "50px",
                    padding: "0 32px",
                  }}
                >
                  Hotline: 1900 2115
                </Button>
              </Space>
            </Col>
          </Row>
        </div>
      </section>

      {/* Benefits Section */}
      <section style={{ padding: "80px 0", background: "#f8f9fa" }}>
        <div className="container">
          <Title
            level={2}
            style={{ textAlign: "center", marginBottom: "60px" }}
          >
            Lợi ích của dịch vụ khám trực tuyến
          </Title>
          <Row gutter={[32, 32]}>
            {benefits.map((benefit, index) => (
              <Col xs={24} sm={12} lg={6} key={index}>
                <Card
                  hoverable
                  style={{
                    textAlign: "center",
                    height: "100%",
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
                  }}
                  bodyStyle={{ padding: "40px 20px" }}
                >
                  <div style={{ marginBottom: "20px" }}>{benefit.icon}</div>
                  <Title level={4} style={{ marginBottom: "16px" }}>
                    {benefit.title}
                  </Title>
                  <Paragraph style={{ color: "#666", margin: 0 }}>
                    {benefit.description}
                  </Paragraph>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* Services Section */}
      <section style={{ padding: "80px 0", background: "white" }}>
        <div className="container">
          <Title
            level={2}
            style={{ textAlign: "center", marginBottom: "60px" }}
          >
            Dịch vụ khám bệnh
          </Title>
          <Row gutter={[24, 24]}>
            {services.map((service) => (
              <Col xs={24} sm={12} lg={6} key={service.id}>
                <Card
                  hoverable
                  style={{
                    height: "100%",
                    borderRadius: "12px",
                    border: "1px solid #f0f0f0",
                    transition: "all 0.3s ease",
                  }}
                  bodyStyle={{
                    padding: "24px",
                  }}
                  className="service-card-hover"
                >
                  <div style={{ marginBottom: "16px" }}>{service.icon}</div>
                  <Title
                    level={4}
                    style={{ marginBottom: "12px", color: "#333" }}
                  >
                    {service.title}
                  </Title>
                  <Paragraph style={{ color: "#666", margin: 0 }}>
                    {service.description}
                  </Paragraph>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* Doctors Section */}
      <section
        id="booking-section"
        style={{ padding: "80px 0", background: "#f8f9fa" }}
      >
        <div className="container">
          <Title
            level={2}
            style={{ textAlign: "center", marginBottom: "60px" }}
          >
            Đội ngũ bác sĩ chuyên nghiệp
          </Title>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <Spin size="large" />
              <Text style={{ marginLeft: 16, display: "block", marginTop: 16 }}>
                Đang tải danh sách bác sĩ...
              </Text>
            </div>
          ) : doctors.length === 0 ? (
            <Empty
              description="Không tìm thấy bác sĩ nào"
              style={{ margin: "50px 0" }}
            />
          ) : (
            <Row gutter={[24, 24]}>
              {doctors.map((doctor) => {
                const fullName = doctor.fullName || doctor.userId?.fullName || "Bác sĩ";
                const displayName = fullName?.startsWith("BS.") ? fullName : `BS. ${fullName}`;
                const specialization = getSpecializationNames(doctor.specializationIds);
                const rating = parseFloat(doctor.ratingAvg) || 0;
                const ratingCount = parseInt(doctor.ratingCount) || 0;
                const yearsExperience = doctor.yearsExperience || 0;
                const avatarUrl = doctor.avatarUrl && !doctor.avatarUrl.includes("picsum.photos")
                  ? doctor.avatarUrl
                  : "/default-avatar.png";
                const clinicName = doctor.clinicDefaultId?.name || "Phòng khám";
                const clinicAddress = doctor.clinicDefaultId?.address || "";

                return (
                  <Col xs={24} md={8} key={doctor._id}>
                    <Card
                      hoverable
                      style={{
                        borderRadius: "12px",
                        border: "none",
                        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
                      }}
                      actions={[
                        <Button
                          type="primary"
                          block
                          onClick={() => handleDoctorSelect(doctor)}
                          style={{
                            background: "#45c3d2",
                            borderColor: "#45c3d2",
                          }}
                        >
                          Đặt lịch
                        </Button>,
                      ]}
                    >
                      <Card.Meta
                        avatar={
                          <Badge
                            dot
                            status="success"
                            offset={[-5, 5]}
                          >
                            <Avatar
                              size={64}
                              src={avatarUrl}
                              icon={<UserOutlined />}
                              onError={() => {
                                // Avatar will fallback to icon
                              }}
                            />
                          </Badge>
                        }
                        title={
                          <div>
                            <div>{displayName}</div>
                            <Text type="secondary" style={{ fontSize: "14px" }}>
                              {specialization}
                            </Text>
                          </div>
                        }
                        description={
                          <div>
                            {rating > 0 && ratingCount > 0 ? (
                              <div style={{ marginBottom: "8px" }}>
                                <StarOutlined style={{ color: "#faad14" }} />
                                <span style={{ marginLeft: "4px" }}>
                                  {rating.toFixed(1)} ({ratingCount} đánh giá)
                                </span>
                              </div>
                            ) : (
                              <div style={{ marginBottom: "8px" }}>
                                <StarOutlined style={{ color: "#d9d9d9" }} />
                                <span style={{ marginLeft: "4px", color: "#999" }}>
                                  Chưa có đánh giá
                                </span>
                              </div>
                            )}
                            {clinicAddress && (
                              <div style={{ marginBottom: "8px" }}>
                                <EnvironmentOutlined style={{ color: "#45c3d2" }} />
                                <span style={{ marginLeft: "4px" }}>
                                  {clinicName}
                                </span>
                              </div>
                            )}
                            <div style={{ marginBottom: "8px" }}>
                              <Text>Kinh nghiệm: {yearsExperience} năm</Text>
                            </div>
                          </div>
                        }
                      />
                    </Card>
                  </Col>
                );
              })}
            </Row>
          )}
        </div>
      </section>

      {/* Booking Modal */}
      <Modal
        title={
          <div>
            <CalendarOutlined
              style={{ marginRight: "8px", color: "#45c3d2" }}
            />
            Đặt lịch khám tại nhà
          </div>
        }
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={600}
      >
        {selectedDoctor && (
          <div>
            <Alert
              message={`Bạn đang đặt lịch với ${selectedDoctor.fullName || selectedDoctor.userId?.fullName || "Bác sĩ"}`}
              description={`Chuyên khoa: ${getSpecializationNames(selectedDoctor.specializationIds)}`}
              type="info"
              style={{ marginBottom: "24px" }}
            />

            <Form form={bookingForm} layout="vertical" onFinish={handleBooking}>
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Họ và tên"
                    name="fullName"
                    rules={[
                      { required: true, message: "Vui lòng nhập họ tên!" },
                    ]}
                  >
                    <Input placeholder="Nhập họ và tên" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Số điện thoại"
                    name="phone"
                    rules={[
                      {
                        required: true,
                        message: "Vui lòng nhập số điện thoại!",
                      },
                    ]}
                  >
                    <Input placeholder="Nhập số điện thoại" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                label="Địa chỉ khám"
                name="address"
                rules={[{ required: true, message: "Vui lòng nhập địa chỉ!" }]}
              >
                <TextArea
                  rows={2}
                  placeholder="Nhập địa chỉ chi tiết (số nhà, đường, phường/xã, quận/huyện, thành phố)"
                />
              </Form.Item>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Ngày khám"
                    name="date"
                    rules={[{ required: true, message: "Vui lòng chọn ngày!" }]}
                  >
                    <DatePicker
                      style={{ width: "100%" }}
                      placeholder="Chọn ngày"
                      disabledDate={(current) =>
                        current && current < new Date()
                      }
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Giờ khám"
                    name="time"
                    rules={[{ required: true, message: "Vui lòng chọn giờ!" }]}
                  >
                    <TimePicker
                      style={{ width: "100%" }}
                      placeholder="Chọn giờ"
                      format="HH:mm"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label="Mô tả triệu chứng" name="symptoms">
                <TextArea
                  rows={3}
                  placeholder="Mô tả ngắn gọn về tình trạng sức khỏe, triệu chứng cần khám (không bắt buộc)"
                />
              </Form.Item>

              <Form.Item
                name="agreement"
                valuePropName="checked"
                rules={[
                  {
                    required: true,
                    message: "Vui lòng đồng ý với điều khoản!",
                  },
                ]}
              >
                <Checkbox>
                  Tôi đồng ý với <a href="#terms">điều khoản sử dụng</a> và{" "}
                  <a href="#privacy">chính sách bảo mật</a>
                </Checkbox>
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  size="large"
                  style={{
                    background: "#45c3d2",
                    borderColor: "#45c3d2",
                    fontWeight: 600,
                  }}
                >
                  Xác nhận đặt lịch
                </Button>
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default KhamTaiNha;
