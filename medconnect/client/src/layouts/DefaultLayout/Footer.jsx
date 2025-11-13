import { Layout, Row, Col, Typography, Space } from "antd";
import {
  MailOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import { Link } from "react-router-dom";
import "./Footer.scss";

const { Footer } = Layout;
const { Title, Text } = Typography;

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
            <Space direction="vertical" style={{ marginTop: 12 }} size="small">
              <Link 
                to="/co-so-y-te" 
                style={{ 
                  display: "flex", 
                  alignItems: "flex-start", 
                  color: "inherit",
                  textDecoration: "none",
                  cursor: "pointer"
                }}
              >
                <EnvironmentOutlined style={{ marginRight: 8, marginTop: 4, flexShrink: 0 }} />
                <Text style={{ lineHeight: 1.5 }}>
                  1C Bà Triệu, Q.Hai Bà Trưng, Hà Nội
                </Text>
              </Link>
              <Link 
                to="/co-so-y-te" 
                style={{ 
                  display: "flex", 
                  alignItems: "flex-start", 
                  color: "inherit",
                  textDecoration: "none",
                  cursor: "pointer"
                }}
              >
                <EnvironmentOutlined style={{ marginRight: 8, marginTop: 4, flexShrink: 0 }} />
                <Text style={{ lineHeight: 1.5 }}>
                  36 Phạm Văn Đồng, TP.Thủ Đức, TP.HCM
                </Text>
              </Link>
              <Text>
                <PhoneOutlined style={{ marginRight: 8 }} /> 0984 771 123 (7h - 18h)
              </Text>
              <Text>
                <MailOutlined style={{ marginRight: 8 }} /> support@medconnect.vn
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
                <Link to="/gioi-thieu">Về chúng tôi</Link>
              </li>
              <li>
                <Link to="/danh-sach-bac-si">Danh sách bác sĩ</Link>
              </li>
              <li>
                <Link to="/chuyen-khoa">Chuyên khoa</Link>
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
                <Link to="/help">Trung tâm trợ giúp</Link>
              </li>
              <li>
                <Link to="/dieu-khoan-su-dung">Điều khoản sử dụng</Link>
              </li>
              <li>
                <Link to="/chinh-sach-bao-mat">Chính sách bảo mật</Link>
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
