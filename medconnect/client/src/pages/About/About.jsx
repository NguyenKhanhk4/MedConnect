import React from "react";
import { useNavigate } from "react-router-dom";
import { Row, Col, Card, Typography, Button, Space } from "antd";
import {
  HomeOutlined,
  HeartOutlined,
  CalendarOutlined,
  VideoCameraOutlined,
  SafetyOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  TeamOutlined,
  StarOutlined,
  ThunderboltOutlined,
  GlobalOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import "./About.scss";

const { Title, Paragraph } = Typography;

const About = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <VideoCameraOutlined />,
      title: "Tư vấn trực tuyến",
      description:
        "Tư vấn với bác sĩ qua video call, không cần đến phòng khám, tiết kiệm thời gian và chi phí đi lại",
      color: "#45c3d2",
    },
    {
      icon: <CalendarOutlined />,
      title: "Đặt lịch linh hoạt",
      description:
        "Đặt lịch khám trực tiếp hoặc trực tuyến, xem và quản lý lịch hẹn của bạn mọi lúc mọi nơi",
      color: "#52c41a",
    },
    {
      icon: <UserOutlined />,
      title: "Bác sĩ uy tín",
      description:
        "Đội ngũ bác sĩ được xác minh chuyên môn, có nhiều năm kinh nghiệm trong các chuyên khoa khác nhau",
      color: "#1890ff",
    },
    {
      icon: <FileTextOutlined />,
      title: "Hồ sơ sức khỏe điện tử",
      description:
        "Lưu trữ toàn bộ lịch sử khám bệnh, đơn thuốc và kết quả xét nghiệm một cách an toàn và tiện lợi",
      color: "#45c3d2",
    },
    {
      icon: <ClockCircleOutlined />,
      title: "Tiết kiệm thời gian",
      description:
        "Không cần chờ đợi, đặt lịch trước và đến đúng giờ, hoặc tư vấn tại nhà qua video call",
      color: "#fa8c16",
    },
    {
      icon: <SafetyOutlined />,
      title: "Bảo mật thông tin",
      description:
        "Mã hóa và bảo vệ thông tin cá nhân và hồ sơ sức khỏe của bạn theo tiêu chuẩn quốc tế",
      color: "#eb2f96",
    },
  ];

  const benefits = [
    {
      title: "Cho bệnh nhân",
      items: [
        "Đặt lịch khám dễ dàng, nhanh chóng",
        "Tư vấn tại nhà, không cần đi lại",
        "Xem lịch sử khám bệnh mọi lúc",
        "Quản lý lịch hẹn và dời lịch linh hoạt",
        "Thanh toán an toàn qua nhiều phương thức",
        "Nhận thông báo về lịch hẹn và kết quả",
      ],
      icon: <HeartOutlined />,
    },
    {
      title: "Cho bác sĩ",
      items: [
        "Quản lý lịch khám và bệnh nhân hiệu quả",
        "Tư vấn trực tuyến qua video call",
        "Lưu trữ hồ sơ khám bệnh điện tử",
        "Tự động hóa quy trình làm việc",
        "Phân tích và thống kê số liệu",
        "Tăng cường tiếp cận với bệnh nhân",
      ],
      icon: <UserOutlined />,
    },
  ];


  const values = [
    {
      icon: <SafetyCertificateOutlined />,
      title: "An toàn & Bảo mật",
      description: "Bảo vệ thông tin người dùng là ưu tiên hàng đầu",
    },
    {
      icon: <StarOutlined />,
      title: "Chất lượng",
      description: "Cam kết mang đến dịch vụ y tế tốt nhất",
    },
    {
      icon: <TeamOutlined />,
      title: "Đáng tin cậy",
      description: "Đội ngũ bác sĩ được xác minh chuyên môn",
    },
    {
      icon: <GlobalOutlined />,
      title: "Tiện lợi",
      description:
        "Khám bệnh mọi lúc mọi nơi chỉ với thiết bị kết nối internet",
    },
  ];

  return (
    <div className="about-page">
      {/* Hero Section */}
      <section className="about-hero">
        <div className="container">
          <Row justify="center" align="middle">
            <Col xs={24} lg={16}>
              <div className="hero-content">
                <div className="hero-logo">
                  <span className="logo-icon">+</span>
                  <span className="logo-text">MedConnect</span>
                </div>
                <Title level={1} className="hero-title">
                  Kết nối sức khỏe, chăm sóc từ xa
                </Title>
                <Paragraph className="hero-description">
                  MedConnect là nền tảng y tế số hiện đại, kết nối bệnh nhân với
                  các bác sĩ uy tín. Chúng tôi mang đến giải pháp khám chữa bệnh
                  tiện lợi, nhanh chóng và an toàn thông qua công nghệ video
                  call và quản lý lịch hẹn thông minh.
                </Paragraph>
                <Space size="large">
                  <Button
                    type="primary"
                    size="large"
                    icon={<CalendarOutlined />}
                    onClick={() => navigate("/dat-lich")}
                  >
                    Đặt lịch ngay
                  </Button>
                  <Button
                    size="large"
                    icon={<VideoCameraOutlined />}
                    onClick={() => navigate("/danh-sach-bac-si")}
                  >
                    Tìm bác sĩ
                  </Button>
                </Space>
              </div>
            </Col>
          </Row>
        </div>
      </section>

      {/* Mission Section */}
      <section className="about-mission">
        <div className="container">
          <Row gutter={[32, 32]} align="middle">
            <Col xs={24} lg={12}>
              <Title level={2}>Sứ mệnh của chúng tôi</Title>
              <Paragraph className="mission-text">
                MedConnect ra đời với sứ mệnh mang dịch vụ y tế chất lượng cao
                đến gần hơn với mọi người, bất kể ở đâu hay khi nào. Chúng tôi
                tin rằng mọi người đều xứng đáng được tiếp cận với dịch vụ chăm
                sóc sức khỏe tốt nhất, được tư vấn bởi các bác sĩ chuyên khoa uy
                tín.
              </Paragraph>
              <Paragraph className="mission-text">
                Thông qua công nghệ số, chúng tôi phá bỏ các rào cản về địa lý
                và thời gian, giúp việc khám chữa bệnh trở nên dễ dàng, tiện lợi
                và hiệu quả hơn.
              </Paragraph>
            </Col>
            <Col xs={24} lg={12}>
              <div className="mission-image">
                <Card className="mission-card" bordered={false}>
                  <div className="mission-icon-wrapper">
                    <HeartOutlined className="mission-icon" />
                  </div>
                  <Title level={3}>Chăm sóc sức khỏe toàn diện</Title>
                  <Paragraph>
                    Từ đặt lịch đến tư vấn, từ khám trực tiếp đến khám trực
                    tuyến - chúng tôi đồng hành cùng bạn trong mọi bước của quá
                    trình chăm sóc sức khỏe.
                  </Paragraph>
                </Card>
              </div>
            </Col>
          </Row>
        </div>
      </section>

      {/* Features Section */}
      <section className="about-features">
        <div className="container">
          <div className="section-header">
            <Title level={2} className="section-title">
              Tính năng nổi bật
            </Title>
            <Paragraph className="section-description">
              MedConnect cung cấp đầy đủ các công cụ cần thiết để quản lý chăm
              sóc sức khỏe của bạn
            </Paragraph>
          </div>

          <Row gutter={[24, 24]}>
            {features.map((feature, index) => (
              <Col xs={24} sm={12} lg={8} key={index}>
                <Card
                  className="feature-card"
                  hoverable
                  style={{ height: "100%" }}
                >
                  <div
                    className="feature-icon-wrapper"
                    style={{ color: feature.color }}
                  >
                    {feature.icon}
                  </div>
                  <Title level={4} className="feature-title">
                    {feature.title}
                  </Title>
                  <Paragraph className="feature-description">
                    {feature.description}
                  </Paragraph>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="about-benefits">
        <div className="container">
          <div className="section-header">
            <Title level={2} className="section-title">
              Lợi ích
            </Title>
            <Paragraph className="section-description">
              MedConnect mang lại giá trị cho cả bệnh nhân và bác sĩ
            </Paragraph>
          </div>

          <Row gutter={[32, 32]}>
            {benefits.map((benefit, index) => (
              <Col xs={24} lg={12} key={index}>
                <Card className="benefit-card" bordered={false}>
                  <div className="benefit-header">
                    <div className="benefit-icon">{benefit.icon}</div>
                    <Title level={3}>{benefit.title}</Title>
                  </div>
                  <ul className="benefit-list">
                    {benefit.items.map((item, itemIndex) => (
                      <li key={itemIndex}>
                        <CheckCircleOutlined className="check-icon" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* Values Section */}
      <section className="about-values">
        <div className="container">
          <div className="section-header">
            <Title level={2} className="section-title">
              Giá trị cốt lõi
            </Title>
            <Paragraph className="section-description">
              Những giá trị chúng tôi theo đuổi và cam kết thực hiện
            </Paragraph>
          </div>

          <Row gutter={[24, 24]}>
            {values.map((value, index) => (
              <Col xs={24} sm={12} lg={6} key={index}>
                <Card className="value-card" bordered={false}>
                  <div className="value-icon">{value.icon}</div>
                  <Title level={4} className="value-title">
                    {value.title}
                  </Title>
                  <Paragraph className="value-description">
                    {value.description}
                  </Paragraph>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* CTA Section */}
      <section className="about-cta">
        <div className="container">
          <Card className="cta-card" bordered={false}>
            <div className="cta-content">
              <ThunderboltOutlined className="cta-icon" />
              <Title level={2} className="cta-title">
                Sẵn sàng bắt đầu?
              </Title>
              <Paragraph className="cta-description">
                Tham gia cùng hàng ngàn bệnh nhân đang tin tưởng và sử dụng dịch
                vụ của MedConnect. Đặt lịch khám ngay hôm nay!
              </Paragraph>
              <Space size="large">
                <Button
                  type="primary"
                  size="large"
                  icon={<CalendarOutlined />}
                  onClick={() => navigate("/dat-lich")}
                >
                  Đặt lịch khám
                </Button>
                <Button
                  size="large"
                  icon={<UserOutlined />}
                  onClick={() => navigate("/danh-sach-bac-si")}
                >
                  Xem danh sách bác sĩ
                </Button>
              </Space>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default About;
