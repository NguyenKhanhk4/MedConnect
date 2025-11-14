import { Link, useNavigate } from "react-router-dom";
import { HomeOutlined, ArrowLeftOutlined, LockOutlined, KeyOutlined, StopOutlined, CheckCircleOutlined, CloseCircleOutlined, MailOutlined, GlobalOutlined, FileTextOutlined } from "@ant-design/icons";
import { useState, useEffect } from "react";
import NavigationBreadcrumb from "../../components/Breadcrumb/NavigationBreadcrumb";
import { Row, Col, Card, Alert } from "antd";
import "./DieuKhoanSuDung.scss";

export default function DieuKhoanSuDung() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("definitions");

  const sections = [
    { id: "definitions", label: "Giải Thích Thuật Ngữ" },
    { id: "scope", label: "Nguyên Tắc Áp Dụng" },
    { id: "rights", label: "Quyền & Trách Nhiệm" },
    { id: "liability", label: "Trách Nhiệm" },
    { id: "security", label: "Bảo Mật Dữ Liệu" },
    { id: "termination", label: "Chấm Dứt Dịch Vụ" },
    { id: "contact", label: "Liên Hệ" },
  ];

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200;
      
      for (let i = sections.length - 1; i >= 0; i--) {
        const element = document.getElementById(sections[i].id);
        if (element && element.offsetTop <= scrollPosition) {
          setActiveSection(sections[i].id);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      window.scrollTo({ top: element.offsetTop - 100, behavior: "smooth" });
      setActiveSection(id);
    }
  };

  return (
    <div className="terms-container">
      {/* Breadcrumb */}
      <div className="terms-breadcrumb">
        <div className="container">
          <NavigationBreadcrumb
            items={[
              {
                label: "Trang chủ",
                path: "/",
                icon: <HomeOutlined />,
              },
              {
                label: "Điều khoản sử dụng",
              },
            ]}
          />
        </div>
      </div>

      {/* Hero Section */}
      <div className="terms-hero">
        <div className="hero-decoration"></div>
        <div className="hero-content">
          <div className="hero-icon">
            <FileTextOutlined />
          </div>
          <h1>Điều Kiện & Điều Khoản Sử Dụng</h1>
          <p className="hero-subtitle">Dịch Vụ Tư Vấn Y Tế Trực Tuyến MedConnect</p>
          <p className="hero-date">Hiệu lực: 01/01/2025 – Cập nhật lần cuối: 01/01/2025</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="terms-layout">
        {/* Sidebar Navigation */}
        <aside className="terms-sidebar">
          <div className="sidebar-header">
            <h3>Nội Dung</h3>
          </div>
          <nav className="sidebar-nav">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`nav-link ${activeSection === section.id ? "active" : ""}`}
              >
                {section.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="terms-content">
          <div className="terms-text">
            <p className="intro">
              Điều kiện và Điều khoản sử dụng dịch vụ tư vấn y tế trực tuyến này ("Điều khoản") quy định mối quan hệ,
              quyền và nghĩa vụ giữa MedConnect ("Nền tảng", "chúng tôi") và người sử dụng dịch vụ ("Người dùng",
              "bạn") khi đăng ký tài khoản, đặt lịch và tham gia các buổi tư vấn y tế trực tuyến với bác sĩ thông qua
              website hoặc ứng dụng của MedConnect.
            </p>

            {/* Section 1 */}
            <section id="definitions" className="content-section">
              <h2>
                <span className="section-number">1</span>Giải Thích Thuật Ngữ
              </h2>
              <div className="definition-list">
                {[
                  {
                    title: "Tư Vấn Y Tế Trực Tuyến",
                    desc: "Hình thức trao đổi thông tin, giải đáp, định hướng hoặc hướng dẫn chăm sóc sức khỏe từ xa giữa bác sĩ hợp tác với MedConnect và người dùng thông qua Internet (Jitsi Meet).",
                  },
                  {
                    title: "Lời Khuyên Y Tế",
                    desc: "Thông tin, ý kiến chuyên môn được bác sĩ cung cấp trong quá trình tư vấn, dựa trên dữ liệu và triệu chứng do bạn cung cấp.",
                  },
                  {
                    title: "Người Dùng",
                    desc: "Bất kỳ cá nhân nào đăng ký tài khoản và sử dụng dịch vụ trên nền tảng MedConnect, bao gồm bệnh nhân, thân nhân hoặc người được ủy quyền.",
                  },
                ].map((item, idx) => (
                  <div key={idx} className="definition-item">
                    <h3>{item.title}</h3>
                    <p>{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Section 2 */}
            <section id="scope" className="content-section">
              <h2>
                <span className="section-number">2</span>Nguyên Tắc & Phạm Vi Áp Dụng
              </h2>
              <div className="highlight-box">
                <p>
                  <strong>⚠️ Quan Trọng:</strong> Dịch vụ tư vấn y tế trực tuyến không thay thế cho khám chữa bệnh trực
                  tiếp, chẩn đoán, điều trị hay kê đơn trong tình huống khẩn cấp.
                </p>
              </div>
              <ul className="content-list">
                {[
                  "Bạn chỉ nên sử dụng dịch vụ khi tình trạng sức khỏe ổn định, không cần cấp cứu.",
                  "Trong trường hợp khẩn cấp, hãy đến ngay cơ sở y tế gần nhất hoặc gọi số cấp cứu địa phương.",
                  "Bác sĩ và bạn có quyền tạm dừng hoặc kết thúc buổi tư vấn bất cứ lúc nào nếu thấy cần thiết.",
                ].map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </section>

            {/* Section 3 */}
            <section id="rights" className="content-section">
              <h2>
                <span className="section-number">3</span>Quyền & Trách Nhiệm Của Người Dùng
              </h2>
              <div className="subsection">
                <h3>3.1 Quyền Của Bạn</h3>
                <ul className="content-list">
                  {[
                    "Lựa chọn bác sĩ, thời gian tư vấn và hình thức thanh toán theo quy định.",
                    "Được bảo mật thông tin cá nhân và dữ liệu y tế theo Chính sách bảo vệ dữ liệu cá nhân.",
                    "Được hủy hoặc đổi lịch tư vấn theo chính sách hiện hành.",
                  ].map((item, idx) => (
                    <li key={idx}>
                      <CheckCircleOutlined className="check-icon" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="subsection">
                <h3>3.2 Nghĩa Vụ Của Bạn</h3>
                <ul className="content-list">
                  {[
                    "Cung cấp thông tin y tế chính xác, trung thực và đầy đủ (bệnh sử, thuốc đang dùng, dị ứng...).",
                    "Không sử dụng dịch vụ cho người khác khi chưa được họ đồng ý hợp pháp.",
                    "Không ghi âm, quay video, chụp màn hình nếu chưa được bác sĩ hoặc MedConnect đồng ý bằng văn bản.",
                    "Thanh toán đầy đủ chi phí trước khi buổi tư vấn bắt đầu.",
                    "Tự chịu trách nhiệm về việc áp dụng các lời khuyên được cung cấp.",
                  ].map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Section 4 */}
            <section id="liability" className="content-section">
              <h2>
                <span className="section-number">4</span>Trách Nhiệm & Giới Hạn
              </h2>
              <div className="subsection">
                <h3>4.1 Về Nội Dung Tư Vấn</h3>
                <p>
                  MedConnect kết nối người dùng với bác sĩ đã được xác minh. Tuy nhiên, nền tảng không chịu trách
                  nhiệm về tính chính xác chuyên môn, hiệu quả điều trị hay kết quả áp dụng lời khuyên của bác sĩ.
                </p>
                <p>
                  Các thông tin bác sĩ cung cấp chỉ nhằm tham khảo và hỗ trợ ra quyết định chăm sóc sức khỏe, không
                  thay thế cho khám chữa bệnh trực tiếp.
                </p>
              </div>
              <div className="subsection">
                <h3>4.2 Về Hạ Tầng Kỹ Thuật</h3>
                <p>
                  MedConnect hoạt động dựa trên dịch vụ Internet, máy chủ, và bên thứ ba. Chúng tôi nỗ lực duy trì
                  hệ thống ổn định nhưng không thể bảo đảm dịch vụ luôn liên tục.
                </p>
                <p>
                  Trong trường hợp xảy ra sự cố, MedConnect sẽ cố gắng khắc phục hoặc hoàn lịch trong thời gian sớm
                  nhất.
                </p>
              </div>
              <div className="subsection">
                <h3>4.3 Miễn Trừ Trách Nhiệm</h3>
                <p className="text-muted">MedConnect không chịu trách nhiệm pháp lý cho:</p>
                <ul className="content-list">
                  {[
                    "Việc bạn sử dụng hoặc không sử dụng lời khuyên của bác sĩ",
                    "Mọi thiệt hại phát sinh do thông tin y tế cung cấp không chính xác",
                    "Rủi ro kỹ thuật, tấn công mạng, hoặc sự cố từ hạ tầng bên thứ ba",
                    "Việc rò rỉ dữ liệu do lỗi thiết bị hoặc hành vi của người dùng",
                  ].map((item, idx) => (
                    <li key={idx}>
                      <CloseCircleOutlined style={{ color: "#ef4444", marginRight: 8 }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Section 5 */}
            <section id="security" className="content-section">
              <h2>
                <span className="section-number">5</span>Quy Định Về Bảo Mật & Dữ Liệu
              </h2>
              <p>
                MedConnect tuân thủ{" "}
                <a 
                  href="https://thuvienphapluat.vn/van-ban/Cong-nghe-thong-tin/Nghi-dinh-13-2023-ND-CP-bao-ve-du-lieu-ca-nhan-465185.aspx?tab=2" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  Nghị định 13/2023/NĐ-CP
                </a>{" "}
                và{" "}
                <a 
                  href="https://thuvienphapluat.vn/van-ban/Cong-nghe-thong-tin/Thong-tu-49-2017-TT-BYT-quy-dinh-ve-hoat-dong-y-te-tu-xa-347138.aspx" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  Thông tư 49/2017/TT-BYT
                </a>{" "}
                trong việc bảo vệ dữ liệu cá nhân và dữ liệu y tế.
              </p>
              <div className="feature-grid">
                {[
                  {
                    icon: <LockOutlined style={{ fontSize: 32, color: "#f59e0b" }} />,
                    title: "Mã Hóa Dữ Liệu",
                    desc: "Dữ liệu của bạn được mã hóa và lưu trữ an toàn trên máy chủ bảo vệ.",
                  },
                  {
                    icon: <KeyOutlined style={{ fontSize: 32, color: "#f59e0b" }} />,
                    title: "Quyền Truy Cập",
                    desc: "Bạn có quyền yêu cầu truy cập, chỉnh sửa hoặc xóa dữ liệu cá nhân.",
                  },
                  {
                    icon: <StopOutlined style={{ fontSize: 32, color: "#ef4444" }} />,
                    title: "Bảo Mật Tuyệt Đối",
                    desc: "Không chia sẻ dữ liệu cho bên thứ ba ngoài phạm vi cung cấp dịch vụ.",
                  },
                ].map((item, idx) => (
                  <div key={idx} className="feature-box">
                    <div style={{ marginBottom: 12 }}>{item.icon}</div>
                    <h4>{item.title}</h4>
                    <p>{item.desc}</p>
                  </div>
                ))}
              </div>
              <p className="small-text">
                Liên hệ: <strong>privacy@medconnect.vn</strong> để quản lý dữ liệu cá nhân của bạn.
              </p>
            </section>

            {/* Section 6 */}
            <section id="termination" className="content-section">
              <h2>
                <span className="section-number">6</span>Tạm Ngưng & Chấm Dứt Dịch Vụ
              </h2>
              <p>
                MedConnect có quyền từ chối hoặc chấm dứt dịch vụ trong các trường hợp:
              </p>
              <ul className="content-list">
                {[
                  "Người dùng vi phạm Điều khoản này",
                  "Cung cấp thông tin sai lệch, gian lận",
                  "Có hành vi xúc phạm bác sĩ hoặc nhân viên hỗ trợ",
                  "Có yêu cầu từ cơ quan chức năng hoặc lý do an ninh",
                ].map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </section>

            {/* Section 7 */}
            <section id="contact" className="content-section">
              <h2>
                <span className="section-number">7</span>Liên Hệ & Khiếu Nại
              </h2>
              <div className="contact-box">
                {[
                  { icon: <MailOutlined style={{ fontSize: 24, color: "#0891b2" }} />, title: "Hỗ Trợ Chung", contact: "support@medconnect.vn" },
                  { icon: <LockOutlined style={{ fontSize: 24, color: "#0891b2" }} />, title: "Bảo Mật Dữ Liệu", contact: "privacy@medconnect.vn" },
                  { icon: <GlobalOutlined style={{ fontSize: 24, color: "#0891b2" }} />, title: "Website", contact: "https://medconnect.vn" },
                ].map((item, idx) => (
                  <div key={idx} className="contact-item">
                    <div style={{ marginBottom: 12 }}>{item.icon}</div>
                    <h4>{item.title}</h4>
                    {item.contact.startsWith("http") ? (
                      <a href={item.contact} target="_blank" rel="noopener noreferrer">
                        {item.contact}
                      </a>
                    ) : (
                      <a href={`mailto:${item.contact}`}>{item.contact}</a>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* CTA Section */}
            <div className="cta-section">
              <button 
                onClick={() => navigate("/")} 
                className="btn btn-primary"
                type="button"
              >
                <ArrowLeftOutlined />
                Quay lại Trang Chủ
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
