import { Layout, Row, Col, Typography, Space } from "antd";
import {
  MailOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import "./Footer.scss";

const { Footer } = Layout;
const { Title, Text, Link } = Typography;

const AppFooter = () => {
  return (
    <Footer className="app-footer">
      <div className="container">
        <Row gutter={[32, 32]}>
          {/* Cột 1 - Thông tin công ty */}
          <Col xs={24} md={8}>
            <Title level={4} className="footer-title">
              MedConnect
            </Title>
            <Text>Nền tảng kết nối bác sĩ và bệnh nhân hàng đầu Việt Nam.</Text>
            <Space direction="vertical" style={{ marginTop: 12 }}>
              <Text>
                <EnvironmentOutlined /> Lô B4/D21, Cầu Giấy, Hà Nội
              </Text>
              <Text>
                <PhoneOutlined /> 024-7301-2468 (7h - 18h)
              </Text>
              <Text>
                <MailOutlined /> support@medconnect.vn
              </Text>
            </Space>
          </Col>

          {/* Cột 2 - Liên kết */}
          <Col xs={24} md={6}>
            <Title level={5} className="footer-subtitle">
              Liên kết
            </Title>
            <ul className="footer-links">
              <li>
                <a href="/about">Về chúng tôi</a>
              </li>
              <li>
                <a href="/doctors">Danh sách bác sĩ</a>
              </li>
              <li>
                <a href="/specializations">Chuyên khoa</a>
              </li>
            </ul>
          </Col>

          {/* Cột 3 - Hỗ trợ */}
          <Col xs={24} md={5}>
            <Title level={5} className="footer-subtitle">
              Hỗ trợ
            </Title>
            <ul className="footer-links">
              <li>
                <a href="/help">Trung tâm trợ giúp</a>
              </li>
              <li>
                <a href="/contact">Liên hệ</a>
              </li>
              <li>
                <a href="/privacy">Chính sách bảo mật</a>
              </li>
            </ul>
          </Col>

          {/* Cột 4 - Đối tác */}
          <Col xs={24} md={5}>
            <Title level={5} className="footer-subtitle">
              Đối tác
            </Title>
            <ul className="footer-links">
              <li>Hello Doctor</li>
              <li>Bernard Clinic</li>
              <li>Doctor Check</li>
            </ul>
          </Col>
        </Row>

        {/* Dòng cuối */}
        <div className="footer-bottom">
          <Text>
            © 2025 MedConnect. Tuân thủ Nghị định 13/2023/NĐ-CP về Bảo vệ Dữ
            liệu Cá nhân.
          </Text>
        </div>
      </div>
    </Footer>
  );
};

export default AppFooter;
