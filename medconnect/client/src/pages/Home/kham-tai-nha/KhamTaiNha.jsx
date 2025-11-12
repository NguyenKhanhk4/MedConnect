import React, { useState } from "react";
import { Link } from "react-router-dom";
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
import "./KhamTaiNha.css";

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const KhamTaiNha = () => {
  const [selectedService, setSelectedService] = useState("general");
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [bookingForm] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);

  const services = [
    {
      id: "general",
      title: "Khám tổng quát",
      price: "500.000đ",
      duration: "45 phút",
      description: "Khám sức khỏe tổng quát, tư vấn bệnh lý thường gặp",
      icon: (
        <MedicineBoxOutlined style={{ fontSize: "24px", color: "#45c3d2" }} />
      ),
    },
    {
      id: "elderly",
      title: "Chăm sóc người cao tuổi",
      price: "700.000đ",
      duration: "60 phút",
      description: "Chăm sóc sức khỏe chuyên biệt cho người cao tuổi",
      icon: <TeamOutlined style={{ fontSize: "24px", color: "#45c3d2" }} />,
    },
    {
      id: "emergency",
      title: "Cấp cứu tại nhà",
      price: "1.200.000đ",
      duration: "30 phút",
      description: "Xử lý các tình huống cấp cứu không nguy hiểm đến tính mạng",
      icon: <CarOutlined style={{ fontSize: "24px", color: "#e74c3c" }} />,
    },
    {
      id: "checkup",
      title: "Kiểm tra định kỳ",
      price: "600.000đ",
      duration: "45 phút",
      description:
        "Theo dõi tình trạng sức khỏe định kỳ cho bệnh nhân mãn tính",
      icon: <HistoryOutlined style={{ fontSize: "24px", color: "#45c3d2" }} />,
    },
  ];

  const doctors = [
    {
      id: 1,
      name: "BS. Nguyễn Văn An",
      specialty: "Nội khoa",
      experience: "15 năm",
      rating: 4.8,
      reviews: 156,
      avatar:
        "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100&h=100&fit=crop&crop=face",
      price: "500.000đ",
      available: true,
      distance: "2.5km",
    },
    {
      id: 2,
      name: "BS. Trần Thị Bình",
      specialty: "Tim mạch",
      experience: "12 năm",
      rating: 4.9,
      reviews: 203,
      avatar:
        "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100&h=100&fit=crop&crop=face",
      price: "600.000đ",
      available: true,
      distance: "3.1km",
    },
    {
      id: 3,
      name: "BS. Lê Minh Cường",
      specialty: "Lão khoa",
      experience: "18 năm",
      rating: 4.7,
      reviews: 89,
      avatar:
        "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=100&h=100&fit=crop&crop=face",
      price: "700.000đ",
      available: false,
      distance: "1.8km",
    },
  ];

  const benefits = [
    {
      icon: <HomeOutlined style={{ fontSize: "48px", color: "#45c3d2" }} />,
      title: "Tiện lợi tại nhà",
      description: "Không cần di chuyển, bác sĩ sẽ đến tận nhà thăm khám",
    },
    {
      icon: <SafetyOutlined style={{ fontSize: "48px", color: "#45c3d2" }} />,
      title: "An toàn & Vệ sinh",
      description: "Đội ngũ y tế được trang bị đầy đủ thiết bị bảo hộ",
    },
    {
      icon: (
        <ClockCircleOutlined style={{ fontSize: "48px", color: "#45c3d2" }} />
      ),
      title: "Tiết kiệm thời gian",
      description: "Đặt lịch linh hoạt, không xếp hàng chờ đợi",
    },
    {
      icon: <HeartOutlined style={{ fontSize: "48px", color: "#45c3d2" }} />,
      title: "Chăm sóc tận tâm",
      description: "Dịch vụ y tế chất lượng cao trong môi trường quen thuộc",
    },
  ];

  const handleServiceSelect = (serviceId) => {
    setSelectedService(serviceId);
  };

  const handleDoctorSelect = (doctor) => {
    setSelectedDoctor(doctor);
    setIsModalVisible(true);
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
                <HomeOutlined style={{ marginRight: "16px" }} />
                Khám bệnh tại nhà
              </Title>

              <Paragraph
                style={{
                  color: "white",
                  fontSize: "1.2rem",
                  marginBottom: "40px",
                  opacity: 0.95,
                }}
              >
                Dịch vụ y tế chuyên nghiệp đến tận nhà - An toàn, tiện lợi, chất
                lượng cao
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
            Lợi ích của dịch vụ khám tại nhà
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
            Dịch vụ khám bệnh tại nhà
          </Title>
          <Row gutter={[24, 24]}>
            {services.map((service) => (
              <Col xs={24} sm={12} lg={6} key={service.id}>
                <Card
                  hoverable
                  className={
                    selectedService === service.id
                      ? "service-card-selected"
                      : "service-card"
                  }
                  onClick={() => handleServiceSelect(service.id)}
                  style={{
                    height: "100%",
                    borderRadius: "12px",
                    cursor: "pointer",
                    border:
                      selectedService === service.id
                        ? "2px solid #45c3d2"
                        : "1px solid #f0f0f0",
                  }}
                >
                  <div style={{ marginBottom: "16px" }}>{service.icon}</div>
                  <Title
                    level={4}
                    style={{ marginBottom: "8px", color: "#333" }}
                  >
                    {service.title}
                  </Title>
                  <div style={{ marginBottom: "12px" }}>
                    <Text strong style={{ fontSize: "18px", color: "#45c3d2" }}>
                      {service.price}
                    </Text>
                    <Text style={{ marginLeft: "8px", color: "#666" }}>
                      ({service.duration})
                    </Text>
                  </div>
                  <Paragraph style={{ color: "#666", margin: 0 }}>
                    {service.description}
                  </Paragraph>
                  {selectedService === service.id && (
                    <div style={{ marginTop: "16px" }}>
                      <CheckCircleOutlined
                        style={{ color: "#45c3d2", fontSize: "20px" }}
                      />
                      <Text
                        style={{
                          marginLeft: "8px",
                          color: "#45c3d2",
                          fontWeight: 600,
                        }}
                      >
                        Đã chọn
                      </Text>
                    </div>
                  )}
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
          <Row gutter={[24, 24]}>
            {doctors.map((doctor) => (
              <Col xs={24} md={8} key={doctor.id}>
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
                      disabled={!doctor.available}
                      onClick={() => handleDoctorSelect(doctor)}
                      style={{
                        background: doctor.available ? "#45c3d2" : "#ccc",
                        borderColor: doctor.available ? "#45c3d2" : "#ccc",
                      }}
                    >
                      {doctor.available ? "Đặt lịch" : "Không có lịch"}
                    </Button>,
                  ]}
                >
                  <Card.Meta
                    avatar={
                      <Badge
                        dot
                        status={doctor.available ? "success" : "default"}
                        offset={[-5, 5]}
                      >
                        <Avatar size={64} src={doctor.avatar} />
                      </Badge>
                    }
                    title={
                      <div>
                        <div>
                          {(() => {
                            const fullName = doctor.name;
                            return fullName?.startsWith("BS.")
                              ? fullName
                              : `BS. ${fullName}`;
                          })()}
                        </div>
                        <Text type="secondary" style={{ fontSize: "14px" }}>
                          {doctor.specialty}
                        </Text>
                      </div>
                    }
                    description={
                      <div>
                        <div style={{ marginBottom: "8px" }}>
                          <StarOutlined style={{ color: "#faad14" }} />
                          <span style={{ marginLeft: "4px" }}>
                            {doctor.rating} ({doctor.reviews} đánh giá)
                          </span>
                        </div>
                        <div style={{ marginBottom: "8px" }}>
                          <EnvironmentOutlined style={{ color: "#45c3d2" }} />
                          <span style={{ marginLeft: "4px" }}>
                            Cách {doctor.distance}
                          </span>
                        </div>
                        <div style={{ marginBottom: "8px" }}>
                          <Text>Kinh nghiệm: {doctor.experience}</Text>
                        </div>
                      </div>
                    }
                  />
                </Card>
              </Col>
            ))}
          </Row>
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
              message={`Bạn đang đặt lịch với ${selectedDoctor.name}`}
              description={`Chuyên khoa: ${selectedDoctor.specialty} | Phí khám: ${selectedDoctor.price}`}
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

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <Row justify="center" align="middle" style={{ minHeight: "200px" }}>
            <Col xs={24} lg={16} style={{ textAlign: "center" }}>
              <Title level={3} style={{ color: "white", marginBottom: "16px" }}>
                Cần hỗ trợ khẩn cấp?
              </Title>
              <Paragraph
                style={{
                  color: "white",
                  fontSize: "1rem",
                  marginBottom: "24px",
                  opacity: 0.9,
                }}
              >
                Liên hệ ngay hotline 24/7 để được tư vấn và hỗ trợ
              </Paragraph>
              <Space size="large">
                <Button
                  type="primary"
                  size="large"
                  icon={<PhoneOutlined />}
                  style={{
                    background: "white",
                    borderColor: "white",
                    color: "#45c3d2",
                    fontWeight: 600,
                  }}
                >
                  Gọi ngay: 1900 2115
                </Button>
                <Button
                  size="large"
                  style={{
                    background: "transparent",
                    borderColor: "white",
                    color: "white",
                    fontWeight: 600,
                  }}
                >
                  <Link to="/" style={{ color: "white" }}>
                    Về trang chủ
                  </Link>
                </Button>
              </Space>
            </Col>
          </Row>
        </div>
      </section>
    </div>
  );
};

export default KhamTaiNha;
