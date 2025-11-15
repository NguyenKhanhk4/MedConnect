import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  Row,
  Col,
  Typography,
  Space,
  Steps,
  Tag,
  Rate,
  Spin,
  Empty,
} from "antd";
import {
  CalendarOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  StarOutlined,
  UserOutlined,
  HeartOutlined,
  SafetyOutlined,
  ClockCircleOutlined,
  CreditCardOutlined,
  HomeOutlined,
  SearchOutlined,
  MedicineBoxOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import "./KhamTaiVien.css";

const { Title, Paragraph } = Typography;

const KhamTaiVien = () => {
  const navigate = useNavigate();
  const [specializations, setSpecializations] = useState([]);
  const [specializationsLoading, setSpecializationsLoading] = useState(true);

  // ---- Slider settings ----
  const sliderSettings = {
    dots: false,
    infinite: true,
    slidesToShow: 4,
    slidesToScroll: 1,
    arrows: false,
    autoplay: false,
    responsive: [
      { breakpoint: 1200, settings: { slidesToShow: 3, slidesToScroll: 1 } },
      { breakpoint: 992, settings: { slidesToShow: 2, slidesToScroll: 1 } },
      { breakpoint: 576, settings: { slidesToShow: 1, slidesToScroll: 1 } },
    ],
  };

  // ---- Feature data ----
  const features = [
    {
      icon: HeartOutlined,
      title: "Tìm bệnh viện uy tín",
      description:
        "Tìm kiếm bệnh viện theo chuyên khoa, địa điểm hoặc đánh giá từ bệnh nhân",
      link: "/danh-sach-benh-vien",
    },
    {
      icon: HomeOutlined,
      title: "Khám tại bệnh viện",
      description:
        "Dịch vụ y tế chuyên nghiệp tại các bệnh viện hàng đầu - An toàn, chất lượng",
      link: "/kham-tai-benh-vien",
    },
    {
      icon: CalendarOutlined,
      title: "Đặt lịch khám bệnh viện",
      description:
        "Đặt lịch khám trực tiếp tại bệnh viện một cách dễ dàng và tiện lợi",
      link: "/booking-hospital",
    },
    {
      icon: SafetyOutlined,
      title: "Thanh toán an toàn",
      description:
        "Thanh toán trực tuyến qua VietQR, VNPAY, MoMo với bảo mật cao",
      link: "/payment",
    },
  ];

  // ---- Step guide ----
  const steps = [
    {
      number: 1,
      title: "Chọn chuyên khoa",
      description: "Tìm và chọn chuyên khoa phù hợp với nhu cầu khám bệnh của bạn",
      icon: MedicineBoxOutlined,
    },
    {
      number: 2,
      title: "Chọn bác sĩ",
      description: "Xem danh sách bác sĩ và chọn bác sĩ phù hợp với lịch trình của bạn",
      icon: UserOutlined,
    },
    {
      number: 3,
      title: "Chọn thời gian",
      description: "Chọn ngày và giờ khám phù hợp với lịch trình của bạn",
      icon: CalendarOutlined,
    },
    {
      number: 4,
      title: "Thanh toán",
      description: "Thanh toán trực tuyến an toàn và nhận xác nhận đặt lịch",
      icon: CreditCardOutlined,
    },
  ];

  // ---- Services data ----
  const services = [
    { icon: "🏥", title: "Khám Chuyên khoa", color: "from-blue-50 to-cyan-50" },
    { icon: "🏨", title: "Khám tổng quát", color: "from-green-50 to-emerald-50" },
    { icon: "🔬", title: "Xét nghiệm y học", color: "from-purple-50 to-violet-50" },
    { icon: "📋", title: "Chẩn đoán hình ảnh", color: "from-orange-50 to-amber-50" },
    { icon: "💊", title: "Phẫu thuật", color: "from-pink-50 to-rose-50" },
    { icon: "🧬", title: "Vật lý trị liệu", color: "from-indigo-50 to-blue-50" },
  ];

  // ---- Hospital data ----
  const hospitalData = [
    {
      id: "vietduc",
      name: "Bệnh viện Hữu nghị Việt Đức",
      logo: "https://cdn.bookingcare.vn/fo/w1920/2023/12/28/151122-viet-duc.png",
      address: "40 Tràng Thi, Hàng Bông, Hoàn Kiếm, Hà Nội",
      phone: "024 3825 3531",
      rating: 4.8,
      specialties: ["Tim mạch", "Thần kinh", "Cơ xương khớp"],
      description: "Bệnh viện đa khoa hạng I trực thuộc Bộ Y tế",
    },
    {
      id: "choray",
      name: "Bệnh viện Chợ Rẫy",
      logo: "https://cdn.bookingcare.vn/fo/w1920/2023/12/28/151123-cho-ray.png",
      address: "201B Nguyễn Chí Thanh, Phường 12, Quận 5, TP.HCM",
      phone: "028 3855 4137",
      rating: 4.7,
      specialties: ["Ung bướu", "Tim mạch", "Nội tiết"],
      description: "Bệnh viện đa khoa trung ương hạng đặc biệt",
    },
    {
      id: "vinmec",
      name: "Bệnh viện Đa khoa Quốc tế Vinmec",
      logo: "https://cdn.bookingcare.vn/fo/w1920/2023/12/28/151125-vinmec.png",
      address: "458 Minh Khai, Vĩnh Tuy, Hai Bà Trưng, Hà Nội",
      phone: "024 3974 3556",
      rating: 4.9,
      specialties: ["Sản phụ khoa", "Nhi khoa", "Tim mạch"],
      description: "Hệ thống y tế tư nhân hàng đầu Việt Nam",
    },
    {
      id: "tamduc",
      name: "Bệnh viện Tâm Đức",
      logo: "https://cdn.bookingcare.vn/fo/w1920/2023/12/28/151126-tam-duc.png",
      address: "5 Phạm Thế Hiển, Phường 4, Quận 8, TP.HCM",
      phone: "028 3850 3539",
      rating: 4.6,
      specialties: ["Tim mạch", "Nội tiết", "Tiêu hóa"],
      description: "Bệnh viện chuyên khoa tim mạch hàng đầu",
    },
    {
      id: "hunggvuong",
      name: "Bệnh viện Hùng Vương",
      logo: "https://cdn.bookingcare.vn/fo/w1920/2023/12/28/151127-hung-vuong.png",
      address: "128 Hùng Vương, Phường 12, Quận 5, TP.HCM",
      phone: "028 3855 4137",
      rating: 4.5,
      specialties: ["Sản phụ khoa", "Nhi khoa", "Phụ khoa"],
      description: "Bệnh viện chuyên khoa sản phụ khoa",
    },
    {
      id: "doctorcheck",
      name: "Doctor Check - Tầm Soát Bệnh",
      logo: "https://cdn.bookingcare.vn/fo/w1920/2023/12/28/151124-doctor-check.png",
      address: "Lầu 3, Tòa nhà Vietcombank, 5 Mê Linh, Q1, TP.HCM",
      phone: "028 7300 1886",
      rating: 4.8,
      specialties: ["Tầm soát ung thư", "Khám tổng quát", "Xét nghiệm"],
      description: "Trung tâm tầm soát và phát hiện sớm ung thư",
    },
  ];

  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3000";
    let mounted = true;

    const fetchData = async () => {
      try {
        setSpecializationsLoading(true);
        // Fetch specializations
        const specRes = await fetch(`${apiBase}/api/specializations`);
        const specJson = await specRes.json();
        if (!mounted) return;
        if (specJson.success) {
          setSpecializations(specJson.data || []);
        } else {
          console.error("Specializations API error", specJson);
          setSpecializations([]);
        }
      } catch (err) {
        console.error("Fetch data failed:", err);
        setSpecializations([]);
      } finally {
        if (mounted) {
          setSpecializationsLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="hospital-visit">
      {/* Hero Section */}
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(135deg, #ffffff 0%, #f9fafb 50%, #ffffff 100%)",
          borderBottom: "1px solid #e8e8e8",
          paddingTop: "100px",
        }}
      >
        <div className="container" style={{ maxWidth: "1280px", margin: "0 auto", padding: "80px 24px" }}>
          <Row gutter={[48, 48]} align="middle">
            <Col xs={24} md={12}>
              <Space direction="vertical" size="large" style={{ width: "100%" }}>
                <Tag
                  color="#45c3d2"
                  style={{
                    padding: "6px 16px",
                    borderRadius: "20px",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    border: "1px solid rgba(69, 195, 210, 0.3)",
                    background: "rgba(69, 195, 210, 0.15)",
                    marginBottom: "8px",
                    color: "#45c3d2",
                  }}
                >
                  ✨ Dịch vụ khám sức khỏe toàn diện
                </Tag>

                <Title
                  level={1}
                  style={{
                    fontSize: "3rem",
                    fontWeight: 700,
                    color: "#262626",
                    margin: 0,
                    lineHeight: "1.2",
                  }}
                >
                  Chăm sóc sức khỏe của bạn là ưu tiên của chúng tôi
                </Title>

                <Paragraph
                  style={{
                    fontSize: "1.125rem",
                    color: "#666",
                    maxWidth: "500px",
                    margin: 0,
                    lineHeight: "1.6",
                  }}
                >
                  Kết nối với các bác sĩ chuyên môn, đặt lịch khám dễ dàng và nhận tư vấn y tế chất lượng cao từ nhà.
                </Paragraph>

                <Space size="middle" style={{ marginTop: "16px" }}>
                  <Button
                    type="primary"
                    size="large"
                    onClick={() => navigate("/dat-lich")}
                    style={{
                      background: "#45c3d2",
                      borderColor: "#45c3d2",
                      height: "48px",
                      padding: "0 32px",
                      fontSize: "1rem",
                      fontWeight: 600,
                      borderRadius: "8px",
                    }}
                  >
                    Đặt lịch khám ngay
                  </Button>
                  <Button
                    size="large"
                    onClick={() => navigate("/gioi-thieu")}
                    style={{
                      height: "48px",
                      padding: "0 32px",
                      fontSize: "1rem",
                      fontWeight: 600,
                      borderRadius: "8px",
                    }}
                  >
                    Tìm hiểu thêm
                  </Button>
                </Space>
              </Space>
            </Col>

            <Col xs={24} md={12}>
              <div
                className="hero-image-container"
                style={{
                  position: "relative",
                  height: "384px",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(135deg, rgba(69, 195, 210, 0.2) 0%, rgba(255, 191, 0, 0.2) 100%)",
                    borderRadius: "24px",
                    filter: "blur(40px)",
                    zIndex: 0,
                  }}
                />
                <div
                  style={{
                    position: "relative",
                    background: "#ffffff",
                    borderRadius: "24px",
                    border: "1px solid #e8e8e8",
                    overflow: "hidden",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 1,
                  }}
                >
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        width: "180px",
                        height: "180px",
                        margin: "0 auto 16px",
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #45c3d2 0%, #3ba8b8 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "5rem",
                      }}
                    >
                      👨‍⚕️
                    </div>
                    <Paragraph style={{ color: "#666", margin: 0, fontSize: "1rem" }}>
                      Bác sĩ chuyên môn
                    </Paragraph>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </div>
      </section>

      {/* Specialties Section */}
      <section style={{ padding: "80px 0", background: "#ffffff", borderTop: "1px solid #e8e8e8" }}>
        <div className="container">
          <Row
            justify="space-between"
            align="middle"
            style={{ marginBottom: "48px" }}
          >
            <div>
              <Title
                level={2}
                style={{
                  margin: 0,
                  marginBottom: "8px",
                  fontSize: "2.5rem",
                  fontWeight: 700,
                  color: "#262626",
                }}
              >
                Chuyên khoa khám tại bệnh viện
              </Title>
              <Paragraph
                style={{
                  margin: 0,
                  fontSize: "1.125rem",
                  color: "#666",
                }}
              >
                Các chuyên khoa y tế chính
              </Paragraph>
            </div>
            <Link
              to="/chuyen-khoa"
              className="specialty-see-more-btn"
              style={{
                display: "block",
                background: "#45c3d2",
                padding: "12px 24px",
                borderRadius: "24px",
                color: "white",
                fontWeight: 500,
                textDecoration: "none",
                fontSize: "1rem",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#3ba8b8";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#45c3d2";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              Xem thêm →
            </Link>
          </Row>

          {specializationsLoading ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <Spin size="large" />
              <div style={{ marginTop: "16px", fontSize: "16px", color: "#666" }}>
                Đang tải danh sách chuyên khoa...
              </div>
            </div>
          ) : specializations.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <Empty
                description="Không có chuyên khoa nào"
                style={{ color: "#999" }}
              />
            </div>
          ) : (
            <div style={{ position: "relative" }}>
              <Slider {...sliderSettings}>
                {specializations.map((spec, index) => {
                  // Build icon URL with proper handling
                  let iconUrl = null;
                  const apiBase =
                    import.meta.env.VITE_API_URL || "http://localhost:3000";

                  if (spec.avatar) {
                    // Check if avatar is already a full URL (http:// or https://)
                    if (
                      spec.avatar.startsWith("http://") ||
                      spec.avatar.startsWith("https://")
                    ) {
                      iconUrl = spec.avatar;
                    }
                    // Check if avatar is a base64 data URI (data:image/...)
                    else if (spec.avatar.startsWith("data:")) {
                      iconUrl = spec.avatar;
                    }
                    // Otherwise, treat as relative path and prepend API base URL
                    else {
                      // Ensure avatar path starts with / if it doesn't already
                      const avatarPath = spec.avatar.startsWith("/")
                        ? spec.avatar
                        : `/${spec.avatar}`;
                      // Check if it's a server-uploads path
                      if (avatarPath.startsWith("/server-uploads")) {
                        iconUrl = `${apiBase}${avatarPath}`;
                      } else {
                        iconUrl = `${apiBase}${avatarPath}`;
                      }
                    }
                  }

                  // Fallback to default icon if no avatar
                  if (!iconUrl) {
                    iconUrl =
                      "https://cdn.bookingcare.vn/fo/w1920/2023/12/28/145826-coxuongkhop.png";
                  }

                  return (
                    <div key={spec._id || spec.id || index} style={{ padding: "0 8px" }}>
                      <Card
                        hoverable
                        onClick={() => navigate(`/danh-sach-bac-si?specialty=${spec._id || spec.id}`)}
                        variant="outlined"
                        style={{
                          borderRadius: "12px",
                          textAlign: "center",
                          cursor: "pointer",
                          height: "100%",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                          overflow: "visible",
                          transition: "all 0.3s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateY(-4px)";
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(69, 195, 210, 0.2)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
                        }}
                        styles={{
                          body: {
                            padding: "12px 8px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            overflow: "visible",
                          },
                        }}
                      >
                        <img
                          src={iconUrl}
                          alt={spec.name}
                          onError={(e) => {
                            // Prevent infinite loop by checking if already set to fallback
                            if (e.target.src !== "https://cdn.bookingcare.vn/fo/w1920/2023/12/28/145826-coxuongkhop.png") {
                              e.target.src = "https://cdn.bookingcare.vn/fo/w1920/2023/12/28/145826-coxuongkhop.png";
                            }
                          }}
                          style={{
                            width: "180px",
                            height: "180px",
                            objectFit: "contain",
                            marginBottom: "12px",
                            zIndex: 1,
                          }}
                        />
                        <Title 
                          level={5} 
                          style={{ 
                            margin: 0, 
                            color: "#333",
                            fontSize: "14px",
                            fontWeight: 600,
                            lineHeight: "1.4",
                          }}
                        >
                          {spec.name}
                        </Title>
                      </Card>
                    </div>
                  );
                })}
              </Slider>
            </div>
          )}
        </div>
      </section>

      {/* Services Section */}
      <section style={{ padding: "80px 0", background: "#ffffff" }}>
        <div className="container">
          <Title
            level={2}
            style={{
              fontSize: "2.5rem",
              fontWeight: 700,
              color: "#262626",
              marginBottom: "16px",
            }}
          >
            Dịch vụ khám bệnh viện
          </Title>
          <Paragraph
            style={{
              fontSize: "1.125rem",
              color: "#666",
              marginBottom: "48px",
              maxWidth: "600px",
            }}
          >
            Các dịch vụ y tế chuyên môn được cung cấp bởi các bác sĩ có kinh nghiệm
          </Paragraph>
          <Row gutter={[16, 16]}>
            {services.map((service, index) => (
              <Col xs={24} sm={12} md={8} key={index}>
                <Card
                  hoverable
                  style={{
                    height: "100%",
                    borderRadius: "16px",
                    border: "1px solid #e8e8e8",
                    transition: "all 0.3s ease",
                    background: `linear-gradient(135deg, ${
                      service.color.includes("blue") ? "#eff6ff, #cffafe" :
                      service.color.includes("green") ? "#f0fdf4, #d1fae5" :
                      service.color.includes("purple") ? "#faf5ff, #e9d5ff" :
                      service.color.includes("orange") ? "#fff7ed, #fed7aa" :
                      service.color.includes("pink") ? "#fdf2f8, #fce7f3" :
                      "#eef2ff, #c7d2fe"
                    })`,
                  }}
                  bodyStyle={{ padding: "24px" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div
                      style={{
                        fontSize: "48px",
                        transition: "transform 0.3s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "scale(1.1)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "scale(1)";
                      }}
                    >
                      {service.icon}
                    </div>
                    <Title
                      level={5}
                      style={{
                        margin: 0,
                        fontWeight: 600,
                        color: "#262626",
                        fontSize: "1rem",
                      }}
                    >
                      {service.title}
                    </Title>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* How to Book Section */}
      <section style={{ padding: "80px 0", background: "#f9fafb" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <Title
              level={2}
              style={{
                fontSize: "2.5rem",
                fontWeight: 700,
                color: "#262626",
                marginBottom: "16px",
              }}
            >
              Cách đặt lịch khám bệnh
            </Title>
            <Paragraph
              style={{
                fontSize: "1.125rem",
                color: "#666",
                maxWidth: "600px",
                margin: "0 auto",
              }}
            >
              Quy trình đặt lịch đơn giản và nhanh chóng chỉ trong 4 bước
            </Paragraph>
          </div>
          <Row gutter={[24, 24]}>
            {steps.map((step, index) => {
              const IconComponent = step.icon;
              return (
                <Col xs={24} sm={12} lg={6} key={step.number}>
                  <div style={{ position: "relative", height: "100%" }}>
                    {/* Connector line - chỉ hiển thị trên desktop */}
                    {step.number < 4 && (
                      <div
                        style={{
                          display: window.innerWidth >= 992 ? "block" : "none",
                          position: "absolute",
                          top: "64px",
                          right: "-12px",
                          width: "24px",
                          height: "2px",
                          background: "linear-gradient(to right, rgba(69, 195, 210, 0.3), transparent)",
                          zIndex: 1,
                        }}
                      />
                    )}
                    <Card
                      hoverable
                      style={{
                        height: "100%",
                        borderRadius: "16px",
                        border: "1px solid #e8e8e8",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
                        transition: "all 0.3s ease",
                        background: "#ffffff",
                      }}
                      bodyStyle={{ padding: "32px 24px" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#45c3d2";
                        e.currentTarget.style.boxShadow = "0 8px 24px rgba(69, 195, 210, 0.15)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#e8e8e8";
                        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.06)";
                      }}
                    >
                      <div style={{ marginBottom: "24px" }}>
                        <div
                          style={{
                            width: "64px",
                            height: "64px",
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #45c3d2 0%, #3ba8b8 100%)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginBottom: "16px",
                            boxShadow: "0 4px 12px rgba(69, 195, 210, 0.3)",
                            transition: "all 0.3s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow = "0 6px 20px rgba(69, 195, 210, 0.4)";
                          }}
                        >
                          <IconComponent
                            style={{
                              fontSize: "32px",
                              color: "white",
                            }}
                          />
                        </div>
                        <Tag
                          color="#45c3d2"
                          style={{
                            padding: "6px 16px",
                            borderRadius: "20px",
                            fontSize: "0.875rem",
                            fontWeight: 700,
                            border: "1px solid rgba(69, 195, 210, 0.3)",
                            background: "rgba(69, 195, 210, 0.15)",
                            color: "#45c3d2",
                          }}
                        >
                          Bước {step.number}
                        </Tag>
                      </div>
                      <Title
                        level={4}
                        style={{
                          marginBottom: "12px",
                          color: "#262626",
                          fontWeight: 700,
                          fontSize: "1.25rem",
                        }}
                      >
                        {step.title}
                      </Title>
                      <Paragraph
                        style={{
                          color: "#666",
                          margin: 0,
                          fontSize: "0.9375rem",
                          lineHeight: "1.6",
                        }}
                      >
                        {step.description}
                      </Paragraph>
                    </Card>
                  </div>
                </Col>
              );
            })}
          </Row>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section style={{ padding: "80px 0", background: "#ffffff", borderTop: "1px solid #e8e8e8", borderBottom: "1px solid #e8e8e8" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <Title
              level={2}
              style={{
                fontSize: "2.5rem",
                fontWeight: 700,
                color: "#262626",
                marginBottom: "16px",
              }}
            >
              Tại sao chọn khám tại bệnh viện?
            </Title>
            <Paragraph
              style={{
                fontSize: "1.125rem",
                color: "#666",
                maxWidth: "600px",
                margin: "0 auto",
              }}
            >
              Các lợi ích và tính năng nổi bật của nền tảng MedConnect
            </Paragraph>
          </div>
          <Row gutter={[24, 24]}>
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <Col xs={24} sm={12} lg={6} key={index}>
                  <Link to={feature.link} style={{ textDecoration: "none" }}>
                    <Card
                      hoverable
                      style={{
                        height: "100%",
                        borderRadius: "16px",
                        border: "1px solid #e8e8e8",
                        transition: "all 0.3s ease",
                        background: "#ffffff",
                      }}
                      bodyStyle={{ padding: "32px 24px" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#45c3d2";
                        e.currentTarget.style.boxShadow = "0 8px 24px rgba(69, 195, 210, 0.15)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#e8e8e8";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <div
                        style={{
                          width: "56px",
                          height: "56px",
                          borderRadius: "12px",
                          background: "linear-gradient(135deg, rgba(69, 195, 210, 0.2) 0%, rgba(69, 195, 210, 0.1) 100%)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          marginBottom: "24px",
                          transition: "all 0.3s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "linear-gradient(135deg, rgba(69, 195, 210, 0.4) 0%, rgba(69, 195, 210, 0.2) 100%)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "linear-gradient(135deg, rgba(69, 195, 210, 0.2) 0%, rgba(69, 195, 210, 0.1) 100%)";
                        }}
                      >
                        <IconComponent
                          style={{
                            fontSize: "28px",
                            color: "#45c3d2",
                          }}
                        />
                      </div>
                      <Title
                        level={4}
                        style={{
                          marginBottom: "12px",
                          color: "#262626",
                          fontWeight: 700,
                          fontSize: "1.125rem",
                        }}
                      >
                        {feature.title}
                      </Title>
                      <Paragraph
                        style={{
                          color: "#666",
                          margin: 0,
                          fontSize: "0.875rem",
                          lineHeight: "1.6",
                        }}
                      >
                        {feature.description}
                      </Paragraph>
                    </Card>
                  </Link>
                </Col>
              );
            })}
          </Row>
        </div>
      </section>
    </div>
  );
};

export default KhamTaiVien;
