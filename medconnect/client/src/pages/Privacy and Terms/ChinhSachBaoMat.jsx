import { Link, useNavigate } from "react-router-dom";
import { HomeOutlined, ArrowLeftOutlined, LockOutlined, KeyOutlined, StopOutlined, CheckCircleOutlined, MailOutlined, GlobalOutlined, FileTextOutlined, DatabaseOutlined, CloudOutlined, SafetyOutlined } from "@ant-design/icons";
import { useState, useEffect } from "react";
import NavigationBreadcrumb from "../../components/Breadcrumb/NavigationBreadcrumb";
import { Row, Col, Card } from "antd";
import "./ChinhSachBaoMat.scss";

export default function ChinhSachBaoMat() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("overview");

  const sections = [
    { id: "overview", label: "Tổng Quan" },
    { id: "data-collected", label: "Dữ Liệu Thu Thập" },
    { id: "data-usage", label: "Mục Đích Sử Dụng" },
    { id: "data-storage", label: "Lưu Trữ & Bảo Mật" },
    { id: "data-sharing", label: "Chia Sẻ Dữ Liệu" },
    { id: "user-rights", label: "Quyền Của Bạn" },
    { id: "technologies", label: "Công Nghệ Sử Dụng" },
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
    <div className="privacy-container">
      {/* Breadcrumb */}
      <div className="privacy-breadcrumb">
        <div className="container">
          <NavigationBreadcrumb
            items={[
              {
                label: "Trang chủ",
                path: "/",
                icon: <HomeOutlined />,
              },
              {
                label: "Chính sách bảo mật",
              },
            ]}
          />
        </div>
      </div>

      {/* Hero Section */}
      <div className="privacy-hero">
        <div className="hero-decoration"></div>
        <div className="hero-content">
          <div className="hero-icon">
            <SafetyOutlined />
          </div>
          <h1>Chính Sách Bảo Vệ Dữ Liệu Cá Nhân</h1>
          <p className="hero-subtitle">Nền Tảng Tư Vấn Y Tế Trực Tuyến MedConnect</p>
          <p className="hero-date">Hiệu lực: 01/01/2025 – Cập nhật lần cuối: 01/01/2025</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="privacy-layout">
        {/* Sidebar Navigation */}
        <aside className="privacy-sidebar">
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
        <main className="privacy-content">
          <div className="privacy-text">
            <p className="intro">
              Chính sách này giải thích cách MedConnect ("Dự án", "chúng tôi") thu thập, sử dụng, 
              chia sẻ, lưu trữ và bảo vệ Dữ Liệu Cá Nhân khi bạn tạo tài khoản, đặt lịch và/hoặc 
              sử dụng tư vấn y tế trực tuyến trên nền tảng. Chúng tôi tuân thủ{" "}
              <a 
                href="https://thuvienphapluat.vn/van-ban/Cong-nghe-thong-tin/Nghi-dinh-13-2023-ND-CP-bao-ve-du-lieu-ca-nhan-465185.aspx?tab=2" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                Nghị định 13/2023/NĐ-CP
              </a>{" "}
              về Bảo vệ Dữ liệu Cá nhân và{" "}
              <a 
                href="https://thuvienphapluat.vn/van-ban/Cong-nghe-thong-tin/Thong-tu-49-2017-TT-BYT-quy-dinh-ve-hoat-dong-y-te-tu-xa-347138.aspx" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                Thông tư 49/2017/TT-BYT
              </a>{" "}
              về Quản lý Hồ sơ Y tế Điện tử.
            </p>

            <div className="highlight-box">
              <p>
                <strong>⚠️ Lưu ý pháp lý:</strong> MedConnect là dự án cá nhân, không phải cơ sở khám chữa bệnh; 
                hoạt động như nền tảng công nghệ kết nối bác sĩ và người dùng. Nội dung tư vấn chuyên môn 
                thuộc trách nhiệm của bác sĩ.
              </p>
            </div>

            {/* Section 1 */}
            <section id="overview" className="content-section">
              <h2>
                <span className="section-number">1</span>Tổng Quan
              </h2>
              
              <div className="subsection">
                <h3>1.1. Dữ Liệu Cá Nhân</h3>
                <p>
                  Mọi thông tin gắn với hoặc nhận diện một cá nhân; gồm dữ liệu cơ bản và dữ liệu nhạy cảm 
                  (theo{" "}
                  <a 
                    href="https://thuvienphapluat.vn/van-ban/Cong-nghe-thong-tin/Nghi-dinh-13-2023-ND-CP-bao-ve-du-lieu-ca-nhan-465185.aspx?tab=2" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    Nghị định 13/2023/NĐ-CP
                  </a>{" "}
                  về Bảo vệ Dữ liệu Cá nhân).
                </p>
              </div>

              <div className="subsection">
                <h3>1.2. Chủ Thể Dữ Liệu</h3>
                <p>
                  Người dùng, bác sĩ, người liên hệ khẩn cấp, ứng viên cộng tác… mà dữ liệu phản ánh.
                </p>
              </div>

              <div className="subsection">
                <h3>1.3. Xử Lý Dữ Liệu</h3>
                <p>
                  Các hoạt động như thu thập, ghi, phân tích, lưu trữ, chia sẻ, ẩn danh, xóa, mã hóa/giải mã…
                </p>
              </div>

              <div className="subsection">
                <h3>1.4. Cơ Sở Pháp Lý</h3>
                <p>
                  Chúng tôi xử lý dữ liệu dựa trên: (i) thực hiện dịch vụ/"hợp đồng" bạn yêu cầu; 
                  (ii) đồng ý của bạn (đặc biệt với dữ liệu sức khỏe/tiếp thị); (iii) lợi ích hợp pháp 
                  về an toàn, chống gian lận; (iv) nghĩa vụ pháp luật.
                </p>
              </div>

              <div className="contact-info">
                <p><strong>1.5. Thông tin kiểm soát dữ liệu</strong></p>
                <p>Người kiểm soát dữ liệu: Nhóm Phát Triển – Chủ dự án MedConnect</p>
                <p>Email liên hệ: support@medconnect.vn</p>
                <p>Địa chỉ liên hệ: Việt Nam</p>
              </div>
            </section>

            {/* Section 2 */}
            <section id="data-collected" className="content-section">
              <h2>
                <span className="section-number">2</span>Dữ Liệu Cá Nhân Được Thu Thập
              </h2>

              <div className="subsection">
                <h3>2.1. Dữ Liệu Cơ Bản</h3>
                <ul className="content-list">
                  <li>Họ tên, ảnh đại diện, ngày sinh/giới tính (nếu cung cấp)</li>
                  <li>Email, số điện thoại, địa chỉ liên hệ</li>
                  <li>Thông tin nghề nghiệp/chuyên khoa (đối với bác sĩ)</li>
                  <li>Lịch sử đặt lịch, nội dung đánh giá/ghi chú</li>
                  <li>Dữ liệu kỹ thuật (thiết bị, trình duyệt, địa chỉ IP, cookie/ID thiết bị, log truy cập)</li>
                </ul>
              </div>

              <div className="subsection">
                <h3>2.2. Dữ Liệu Nhạy Cảm</h3>
                <p>Chỉ xử lý khi có cơ sở phù hợp và/hoặc đồng ý rõ ràng:</p>
                <ul className="content-list">
                  <li>
                    <strong>Thông tin sức khỏe:</strong> Triệu chứng, bệnh sử, tóm tắt tư vấn, đơn thuốc điện tử, 
                    tài liệu y khoa bạn tải lên
                  </li>
                  <li>
                    <strong>Dữ liệu vị trí:</strong> Vị trí gần đúng khi bạn bật tính năng tìm bác sĩ theo khu vực 
                    (sử dụng Leaflet Maps và Google Maps API)
                  </li>
                  <li>
                    <strong>Thông tin giao dịch:</strong> Mã giao dịch, trạng thái, thời điểm thanh toán 
                    (không lưu số thẻ/CVV)
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 3 */}
            <section id="data-usage" className="content-section">
              <h2>
                <span className="section-number">3</span>Mục Đích Xử Lý Dữ Liệu
              </h2>

              <ul className="content-list">
                <li>
                  <CheckCircleOutlined className="check-icon" />
                  <strong>Cung cấp dịch vụ:</strong> Tạo/quản lý tài khoản; xác minh bác sĩ; đặt/đổi/hủy lịch; 
                  thực hiện tư vấn video; phát hành tóm tắt/đơn thuốc; gửi nhắc lịch và thông báo
                </li>
                <li>
                  <CheckCircleOutlined className="check-icon" />
                  <strong>Thanh toán & chống gian lận:</strong> Xử lý thanh toán qua VNPAY, PayOS, MoMo, VietQR; 
                  đối soát, phát hiện bất thường
                </li>
                <li>
                  <CheckCircleOutlined className="check-icon" />
                  <strong>Cải tiến chất lượng:</strong> Thống kê/phan tích đã ẩn danh hoặc giả danh để nâng cấp 
                  trải nghiệm, độ ổn định hệ thống
                </li>
                <li>
                  <CheckCircleOutlined className="check-icon" />
                  <strong>Tiếp thị (tùy chọn):</strong> Gửi ưu đãi/khuyến mại phù hợp khi bạn đồng ý; 
                  bạn có thể rút lại bất cứ lúc nào
                </li>
                <li>
                  <CheckCircleOutlined className="check-icon" />
                  <strong>Tuân thủ pháp luật:</strong> Đáp ứng yêu cầu hợp lệ của cơ quan nhà nước; 
                  thực hiện nghĩa vụ lưu trữ, kế toán/thuế
                </li>
              </ul>
            </section>

            {/* Section 4 */}
            <section id="data-storage" className="content-section">
              <h2>
                <span className="section-number">4</span>Lưu Trữ & Bảo Mật Dữ Liệu
              </h2>

              <div className="subsection">
                <h3>4.1. Hệ Thống Lưu Trữ</h3>
                <p>
                  Dữ liệu được lưu trữ trên:
                </p>
                <ul className="content-list">
                  <li>
                    <strong>MongoDB Database:</strong> Cơ sở dữ liệu NoSQL được mã hóa và bảo vệ bằng 
                    authentication và authorization
                  </li>
                  <li>
                    <strong>Firebase Services:</strong> 
                    <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                      <li>Firebase Authentication: Xác thực người dùng (Google, Phone, Email/Password)</li>
                      <li>Firebase Cloud Messaging: Gửi thông báo đẩy</li>
                      <li>Firebase Storage: Lưu trữ file và hình ảnh (nếu có)</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Máy chủ/đám mây:</strong> Đặt tại Việt Nam hoặc khu vực khác (khi cần) của nhà 
                    cung cấp hạ tầng đáp ứng an toàn thông tin
                  </li>
                </ul>
              </div>

              <div className="subsection">
                <h3>4.2. Biện Pháp Bảo Mật</h3>
                <div className="feature-grid">
                  {[
                    {
                      icon: <LockOutlined style={{ fontSize: 32, color: "#f59e0b" }} />,
                      title: "Mã Hóa Dữ Liệu",
                      desc: "Dữ liệu nhạy cảm được mã hóa khi truyền (TLS/SSL) và khi lưu trữ (at-rest encryption). Mật khẩu được hash bằng bcrypt/argon2.",
                    },
                    {
                      icon: <KeyOutlined style={{ fontSize: 32, color: "#f59e0b" }} />,
                      title: "Phân Quyền Truy Cập",
                      desc: "Hệ thống phân quyền theo vai trò (patient, doctor, admin, manager). JWT tokens được sử dụng để xác thực API requests.",
                    },
                    {
                      icon: <StopOutlined style={{ fontSize: 32, color: "#ef4444" }} />,
                      title: "Bảo Mật Tuyệt Đối",
                      desc: "Không chia sẻ dữ liệu cho bên thứ ba ngoài phạm vi cung cấp dịch vụ. Ghi nhận truy cập và sao lưu định kỳ.",
                    },
                  ].map((item, idx) => (
                    <div key={idx} className="feature-box">
                      <div style={{ marginBottom: 12 }}>{item.icon}</div>
                      <h4>{item.title}</h4>
                      <p>{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="subsection">
                <h3>4.3. Sao Lưu & Khôi Phục</h3>
                <p>
                  Dữ liệu được sao lưu định kỳ để đảm bảo tính toàn vẹn và khả năng khôi phục trong trường hợp 
                  sự cố. Thời gian lưu giữ dữ liệu tuân thủ quy định pháp luật về hồ sơ y tế điện tử.
                </p>
              </div>
            </section>

            {/* Section 5 */}
            <section id="data-sharing" className="content-section">
              <h2>
                <span className="section-number">5</span>Chia Sẻ & Chuyển Giao Dữ Liệu
              </h2>

              <div className="highlight-box">
                <p>
                  <strong>Cam kết:</strong> MedConnect không bán dữ liệu cá nhân của bạn cho bất kỳ bên thứ ba nào.
                </p>
              </div>

              <div className="subsection">
                <h3>5.1. Chia Sẻ Với Bác Sĩ</h3>
                <p>
                  Bác sĩ khám của bạn chỉ được truy cập thông tin cần thiết cho buổi khám (triệu chứng, 
                  bệnh sử, kết quả tư vấn trước đó).
                </p>
              </div>

              <div className="subsection">
                <h3>5.2. Đối Tác Kỹ Thuật</h3>
                <p>Chúng tôi chia sẻ dữ liệu với các đối tác sau để cung cấp dịch vụ:</p>
                <ul className="content-list">
                  <li>
                    <strong>Thanh toán:</strong> VNPAY, PayOS, MoMo, VietQR - chỉ thông tin giao dịch cần thiết 
                    (không bao gồm số thẻ/CVV)
                  </li>
                  <li>
                    <strong>Video Call:</strong> Jitsi Meet - thông tin phòng họp và ID người tham gia
                  </li>
                  <li>
                    <strong>Bản đồ:</strong> Leaflet Maps (OpenStreetMap) và Google Maps API - vị trí địa lý 
                    để tìm cơ sở y tế gần nhất
                  </li>
                  <li>
                    <strong>Thông báo:</strong> Firebase Cloud Messaging - token thiết bị để gửi thông báo đẩy
                  </li>
                  <li>
                    <strong>Xác thực:</strong> Firebase Authentication - thông tin đăng nhập (được mã hóa)
                  </li>
                </ul>
              </div>

              <div className="subsection">
                <h3>5.3. Cơ Quan Nhà Nước</h3>
                <p>
                  Chia sẻ dữ liệu khi có yêu cầu hợp lệ từ cơ quan chức năng theo quy định pháp luật.
                </p>
              </div>

              <div className="subsection">
                <h3>5.4. Xóa Dữ Liệu</h3>
                <p>
                  Xóa/ẩn danh khi hết mục đích hoặc theo yêu cầu hợp lệ, trừ trường hợp pháp luật yêu cầu lưu giữ 
                  hoặc vì lý do an ninh, tố tụng, nghiên cứu theo quy định.
                </p>
              </div>
            </section>

            {/* Section 6 */}
            <section id="user-rights" className="content-section">
              <h2>
                <span className="section-number">6</span>Quyền Của Bạn (Chủ Thể Dữ Liệu)
              </h2>

              <p>
                Bạn có quyền theo{" "}
                <a 
                  href="https://thuvienphapluat.vn/van-ban/Cong-nghe-thong-tin/Nghi-dinh-13-2023-ND-CP-bao-ve-du-lieu-ca-nhan-465185.aspx?tab=2" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  Nghị định 13/2023/NĐ-CP
                </a>{" "}
                về Bảo vệ Dữ liệu Cá nhân:
              </p>

              <ul className="content-list">
                <li>
                  <CheckCircleOutlined className="check-icon" />
                  <strong>Được biết:</strong> Thông tin về việc thu thập, sử dụng dữ liệu cá nhân
                </li>
                <li>
                  <CheckCircleOutlined className="check-icon" />
                  <strong>Đồng ý/Không đồng ý:</strong> Quyền từ chối hoặc rút lại đồng ý xử lý dữ liệu
                </li>
                <li>
                  <CheckCircleOutlined className="check-icon" />
                  <strong>Truy cập:</strong> Yêu cầu cung cấp bản sao dữ liệu cá nhân của bạn
                </li>
                <li>
                  <CheckCircleOutlined className="check-icon" />
                  <strong>Sửa/Xóa:</strong> Yêu cầu chỉnh sửa hoặc xóa dữ liệu không chính xác, không cần thiết
                </li>
                <li>
                  <CheckCircleOutlined className="check-icon" />
                  <strong>Hạn chế xử lý:</strong> Yêu cầu tạm dừng xử lý dữ liệu trong một số trường hợp
                </li>
                <li>
                  <CheckCircleOutlined className="check-icon" />
                  <strong>Phản đối:</strong> Phản đối việc xử lý dữ liệu cho mục đích tiếp thị
                </li>
                <li>
                  <CheckCircleOutlined className="check-icon" />
                  <strong>Khiếu nại/Khởi kiện:</strong> Khiếu nại hoặc khởi kiện khi quyền của bạn bị vi phạm
                </li>
              </ul>

              <div className="highlight-box" style={{ marginTop: 24 }}>
                <p>
                  <strong>Gửi yêu cầu:</strong> Gửi email tới <strong>privacy@medconnect.vn</strong> hoặc 
                  <strong> support@medconnect.vn</strong> (tiêu đề: "Yêu cầu dữ liệu cá nhân – MedConnect"), 
                  kèm thông tin xác minh. Chúng tôi phản hồi trong thời hạn luật định (tối đa 15 ngày làm việc).
                </p>
              </div>
            </section>

            {/* Section 7 */}
            <section id="technologies" className="content-section">
              <h2>
                <span className="section-number">7</span>Công Nghệ & Dịch Vụ Sử Dụng
              </h2>

              <p>
                MedConnect sử dụng các công nghệ và dịch vụ sau để vận hành nền tảng:
              </p>

              <div className="feature-grid" style={{ marginTop: 24 }}>
                {[
                  {
                    icon: <DatabaseOutlined style={{ fontSize: 32, color: "#0891b2" }} />,
                    title: "MongoDB Database",
                    desc: "Cơ sở dữ liệu NoSQL để lưu trữ thông tin người dùng, lịch hẹn, hồ sơ y tế. Dữ liệu được mã hóa và bảo vệ bằng authentication.",
                  },
                  {
                    icon: <CloudOutlined style={{ fontSize: 32, color: "#0891b2" }} />,
                    title: "Firebase Services",
                    desc: "Firebase Authentication (xác thực), Firebase Cloud Messaging (thông báo), Firebase Storage (lưu trữ file). Dữ liệu được bảo vệ theo chính sách của Google.",
                  },
                  {
                    icon: <GlobalOutlined style={{ fontSize: 32, color: "#0891b2" }} />,
                    title: "Jitsi Meet",
                    desc: "Nền tảng video call mã nguồn mở để thực hiện tư vấn y tế trực tuyến. Cuộc gọi được mã hóa end-to-end.",
                  },
                  {
                    icon: <KeyOutlined style={{ fontSize: 32, color: "#0891b2" }} />,
                    title: "Thanh Toán",
                    desc: "VNPAY, PayOS, MoMo, VietQR - các cổng thanh toán được cấp phép tại Việt Nam. Chúng tôi không lưu trữ thông tin thẻ tín dụng.",
                  },
                  {
                    icon: <GlobalOutlined style={{ fontSize: 32, color: "#0891b2" }} />,
                    title: "Bản Đồ",
                    desc: "Leaflet Maps (OpenStreetMap) và Google Maps API để hiển thị vị trí cơ sở y tế và chỉ đường. Chỉ sử dụng vị trí khi bạn đồng ý.",
                  },
                  {
                    icon: <SafetyOutlined style={{ fontSize: 32, color: "#0891b2" }} />,
                    title: "Bảo Mật",
                    desc: "JWT tokens cho API authentication, bcrypt/argon2 cho hash mật khẩu, TLS/SSL cho mã hóa kết nối, phân quyền theo vai trò.",
                  },
                ].map((item, idx) => (
                  <div key={idx} className="feature-box">
                    <div style={{ marginBottom: 12 }}>{item.icon}</div>
                    <h4>{item.title}</h4>
                    <p>{item.desc}</p>
                  </div>
                ))}
              </div>

              <div className="subsection" style={{ marginTop: 24 }}>
                <h3>7.1. Rủi Ro Có Thể Phát Sinh</h3>
                <p>
                  Dù áp dụng tường lửa, mã hóa, kiểm soát truy cập…, không hệ thống nào an toàn tuyệt đối; 
                  có thể tồn tại rủi ro do lỗ hổng zero-day, sự cố hạ tầng, tấn công mạng. Bạn cần:
                </p>
                <ul className="content-list">
                  <li>Giữ bí mật mật khẩu/OTP</li>
                  <li>Đăng xuất khi không dùng</li>
                  <li>Không công khai dữ liệu y tế của mình trên môi trường công cộng</li>
                  <li>Cập nhật trình duyệt và hệ điều hành thường xuyên</li>
                </ul>
                <p style={{ marginTop: 16 }}>
                  Nếu có sự cố rò rỉ, chúng tôi sẽ: (a) ghi nhận – khắc phục; (b) thông báo cho cơ quan chức năng 
                  và chủ thể dữ liệu theo luật; (c) áp dụng biện pháp giảm thiểu thiệt hại.
                </p>
              </div>

              <div className="subsection">
                <h3>7.2. Thời Hạn Xử Lý & Lưu Giữ</h3>
                <p>
                  <strong>Bắt đầu:</strong> Từ thời điểm chúng tôi nhận dữ liệu hợp pháp và có cơ sở pháp lý phù hợp.
                </p>
                <p>
                  <strong>Kết thúc:</strong> Khi đạt mục đích xử lý; sau đó sẽ xóa/ẩn danh trừ trường hợp phải lưu theo luật.
                </p>
                <p>
                  <strong>Thời hạn lưu giữ:</strong> Tài khoản/nghiệp vụ thường lưu trong thời gian bạn sử dụng và tối đa 
                  03 năm sau khi đóng tài khoản; hồ sơ tư vấn/đơn thuốc lưu theo thời hạn pháp luật y tế.
                </p>
              </div>
            </section>

            {/* Section 8 */}
            <section id="contact" className="content-section">
              <h2>
                <span className="section-number">8</span>Thông Tin Liên Hệ & Khiếu Nại
              </h2>

              <div className="contact-box">
                {[
                  { 
                    icon: <MailOutlined style={{ fontSize: 24, color: "#0891b2" }} />, 
                    title: "Hỗ Trợ Chung", 
                    contact: "support@medconnect.vn" 
                  },
                  { 
                    icon: <LockOutlined style={{ fontSize: 24, color: "#0891b2" }} />, 
                    title: "Bảo Mật Dữ Liệu", 
                    contact: "privacy@medconnect.vn" 
                  },
                  { 
                    icon: <GlobalOutlined style={{ fontSize: 24, color: "#0891b2" }} />, 
                    title: "Website", 
                    contact: "https://medconnect.vn" 
                  },
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

              <div className="contact-info" style={{ marginTop: 24 }}>
                <p><strong>Chủ dự án/Người kiểm soát dữ liệu:</strong> Nhóm Phát Triển</p>
                <p><strong>Địa chỉ:</strong> Việt Nam</p>
                <p>
                  <strong>Thời gian phản hồi:</strong> Chúng tôi sẽ phản hồi yêu cầu của bạn trong vòng 15 ngày làm việc 
                  kể từ khi nhận được yêu cầu hợp lệ.
                </p>
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
