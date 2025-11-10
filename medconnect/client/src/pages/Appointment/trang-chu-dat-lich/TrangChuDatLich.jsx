import React from "react";
import { useNavigate } from "react-router-dom";
import { Row, Col, Card, Typography, Button, Space } from "antd";
import {
  CalendarOutlined,
  MedicineBoxOutlined,
  UserOutlined,
  ClockCircleOutlined,
  ArrowRightOutlined,
  HomeOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import NavigationBreadcrumb from "../../../components/Breadcrumb/NavigationBreadcrumb";
import "./TrangChuDatLich.css";

const { Title, Text, Paragraph } = Typography;

const TrangChuDatLich = () => {
  const navigate = useNavigate();

  const handleStartBooking = () => {
    navigate("/dat-lich/chon-chuyen-khoa");
  };

  const handleStartMultiSpecializationBooking = () => {
    navigate("/dat-lich-nhieu-chuyen-khoa");
  };

  const steps = [
    {
      icon: <MedicineBoxOutlined />,
      title: "Chọn chuyên khoa",
      description: "Chọn chuyên khoa phù hợp với tình trạng sức khỏe của bạn",
      step: 1,
    },
    {
      icon: <UserOutlined />,
      title: "Chọn bác sĩ",
      description: "Xem danh sách bác sĩ chuyên khoa và chọn bác sĩ phù hợp",
      step: 2,
    },
    {
      icon: <ClockCircleOutlined />,
      title: "Chọn thời gian",
      description: "Chọn ngày và giờ khám phù hợp với lịch trình của bạn",
      step: 3,
    },
    {
      icon: <CalendarOutlined />,
      title: "Xác nhận đặt lịch",
      description: "Điền thông tin và xác nhận đặt lịch khám",
      step: 4,
    },
  ];

  return (
    <div className="appointment-booking-home">
      <div className="container">
        {/* Breadcrumb */}
        <NavigationBreadcrumb
          items={[
            {
              label: "Trang chủ",
              path: "/",
              icon: <HomeOutlined />,
            },
            {
              label: "Đặt lịch khám",
            },
          ]}
        />

        {/* Header */}
        <div className="page-header">
          <Title level={1}>Đặt lịch khám</Title>
          <Paragraph className="header-description">
            Đặt lịch khám với các bác sĩ chuyên khoa uy tín một cách dễ dàng và
            nhanh chóng
          </Paragraph>
        </div>

        {/* Main CTA */}
        <div className="main-cta-section">
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={12}>
              <Card className="main-cta-card">
                <div className="cta-content">
                  <div className="cta-icon-square">
                    <CalendarOutlined className="cta-icon" />
                  </div>
                  <div className="cta-text">
                    <Title level={2} className="cta-title">
                      Đặt lịch đơn lẻ
                    </Title>
                    <Paragraph className="cta-description">
                      Đặt lịch khám một chuyên khoa, một bác sĩ trong một lần
                      với quy trình đơn giản
                    </Paragraph>
                  </div>
                  <Button
                    type="primary"
                    size="large"
                    icon={<ArrowRightOutlined />}
                    onClick={handleStartBooking}
                    className="cta-button-single"
                  >
                    Đặt lịch ngay nào
                  </Button>
                </div>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card className="main-cta-card-multi">
                <div className="cta-content">
                  <div className="cta-icon-square">
                    <ClockCircleOutlined className="cta-icon" />
                  </div>
                  <div className="cta-text">
                    <Title level={2} className="cta-title">
                      Đặt nhiều lịch
                    </Title>
                    <Paragraph className="cta-description">
                      Đặt nhiều lịch khám trong cùng một ngày, gom thành một
                      phiên khám tiện lợi
                    </Paragraph>
                  </div>
                  <Button
                    type="primary"
                    size="large"
                    icon={<ArrowRightOutlined />}
                    onClick={handleStartMultiSpecializationBooking}
                    className="cta-button-multi"
                  >
                    Đặt nhiều lịch
                  </Button>
                </div>
              </Card>
            </Col>
          </Row>
        </div>

        {/* Steps */}
        <div className="steps-section">
          <Title level={2} style={{ textAlign: "center", marginBottom: 32 }}>
            Quy trình đặt lịch
          </Title>
          <Row gutter={[24, 24]}>
            {steps.map((step, index) => (
              <Col xs={24} sm={12} lg={6} key={step.step}>
                <Card className="step-card" hoverable>
                  <div className="step-content">
                    <div className="step-icon">{step.icon}</div>
                    <div className="step-number">Bước {step.step}</div>
                    <Title level={4} className="step-title">
                      {step.title}
                    </Title>
                    <Paragraph className="step-description">
                      {step.description}
                    </Paragraph>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </div>

        {/* Features */}
        <div className="features-section">
          <Title level={2} style={{ textAlign: "center", marginBottom: 32 }}>
            Tại sao chọn dịch vụ của chúng tôi?
          </Title>
          <Row gutter={[24, 24]}>
            <Col xs={24} md={8}>
              <Card className="feature-card">
                <div className="feature-icon">
                  <UserOutlined />
                </div>
                <Title level={4}>Bác sĩ uy tín</Title>
                <Paragraph>
                  Đội ngũ bác sĩ chuyên khoa có kinh nghiệm và được xác minh
                  chất lượng
                </Paragraph>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card className="feature-card">
                <div className="feature-icon">
                  <ClockCircleOutlined />
                </div>
                <Title level={4}>Linh hoạt thời gian</Title>
                <Paragraph>
                  Chọn thời gian khám phù hợp với lịch trình cá nhân của bạn
                </Paragraph>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card className="feature-card">
                <div className="feature-icon">
                  <MedicineBoxOutlined />
                </div>
                <Title level={4}>Đa dạng chuyên khoa</Title>
                <Paragraph>
                  Nhiều chuyên khoa khác nhau để đáp ứng nhu cầu khám chữa bệnh
                </Paragraph>
              </Card>
            </Col>
          </Row>
        </div>

        {/* Help Section */}
        <div className="help-section">
          <Card>
            <Title level={3}>Cần hỗ trợ?</Title>
            <Space direction="vertical" size="middle">
              <div>
                <Text strong>Hotline:</Text> 1900 1234
              </div>
              <div>
                <Text strong>Email:</Text> support@medconnect.com
              </div>
              <div>
                <Text strong>Thời gian hỗ trợ:</Text> 8:00 - 22:00 (Hàng ngày)
              </div>
            </Space>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TrangChuDatLich;
