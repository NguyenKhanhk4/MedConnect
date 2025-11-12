import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Input, Select, Card, Row, Col, Typography, Steps } from "antd";
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
  LeftOutlined,
  RightOutlined,
} from "@ant-design/icons";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { useAuth } from "../../../hooks/useAuth";
import { useUserProfile } from "../../../hooks/useUserProfile";
import "./TrangChu.css";

const { Title, Paragraph } = Typography;

const TrangChu = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { userProfile, loading: profileLoading } = useUserProfile();
  const [specializations, setSpecializations] = useState([]);
  const [featuredDoctors, setFeaturedDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);

  const SampleNextArrow = (props) => {
    const { onClick } = props;
    return (
      <div
        className="slick-arrow slick-next"
        onClick={onClick}
        style={{
          right: "15px",
          zIndex: 2,
          color: "#45c3d2",
          fontSize: "20px",
          cursor: "pointer",
        }}
      >
        <RightOutlined />
      </div>
    );
  };

  const SamplePrevArrow = (props) => {
    const { onClick } = props;
    return (
      <div
        className="slick-arrow slick-prev"
        onClick={onClick}
        style={{
          left: "15px",
          zIndex: 2,
          color: "#45c3d2",
          fontSize: "20px",
          cursor: "pointer",
        }}
      >
        <LeftOutlined />
      </div>
    );
  };

  // ---- Slider settings ----
  const sliderSettings = {
    dots: false,
    infinite: true,
    slidesToShow: 3,
    slidesToScroll: 3,
    arrows: true,
    autoplay: true,
    autoplaySpeed: 4500,
    nextArrow: <SampleNextArrow />,
    prevArrow: <SamplePrevArrow />,
    responsive: [
      { breakpoint: 992, settings: { slidesToShow: 2, slidesToScroll: 2 } },
      { breakpoint: 576, settings: { slidesToShow: 1, slidesToScroll: 1 } },
    ],
  };

  // ---- Feature data ----
  const features = [
    {
      icon: <HeartOutlined style={{ fontSize: "48px", color: "#45c3d2" }} />,
      title: "Tìm bác sĩ uy tín",
      description:
        "Tìm kiếm bác sĩ theo chuyên khoa, tên hoặc địa điểm gần bạn",
      link: "/danh-sach-bac-si",
    },
    {
      icon: <CalendarOutlined style={{ fontSize: "48px", color: "#45c3d2" }} />,
      title: "Đặt lịch trực tuyến",
      description:
        "Đặt lịch khám trực tiếp hoặc tư vấn video call một cách dễ dàng",
      link: "/dat-lich",
    },
    {
      icon: <SafetyOutlined style={{ fontSize: "48px", color: "#45c3d2" }} />,
      title: "Thanh toán an toàn",
      description:
        "Thanh toán trực tuyến qua VietQR, VNPAY, MoMo với bảo mật cao",
      link: "/payment",
    },
  ];

  // ---- Step guide ----
  const steps = [
    {
      title: "Tìm kiếm bác sĩ",
      description:
        "Sử dụng thanh tìm kiếm để tìm bác sĩ phù hợp với nhu cầu của bạn",
      icon: <UserOutlined />,
    },
    {
      title: "Đặt lịch hẹn",
      description: "Chọn thời gian phù hợp và xác nhận đặt lịch khám",
      icon: <ClockCircleOutlined />,
    },
    {
      title: "Thanh toán",
      description: "Thanh toán phí tư vấn để xác nhận lịch hẹn",
      icon: <CreditCardOutlined />,
    },
    {
      title: "Tham gia tư vấn",
      description: "Tham gia buổi tư vấn trực tiếp hoặc qua video call",
      icon: <VideoCameraOutlined />,
    },
  ];

  // ---- Specialty list ----
  // Use data from API instead of static data
  const specialties = specializations.map((spec) => {
    let iconUrl = null;

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
        const apiBase =
          import.meta.env.VITE_API_URL ||
          import.meta.env.VITE_API_BASE ||
          "http://localhost:3000";
        // Ensure avatar path starts with / if it doesn't already
        const avatarPath = spec.avatar.startsWith("/")
          ? spec.avatar
          : `/${spec.avatar}`;
        iconUrl = `${apiBase}${avatarPath}`;
      }
    }

    // Fallback to default icon if no avatar
    if (!iconUrl) {
      iconUrl =
        "https://cdn.bookingcare.vn/fo/w1920/2023/12/28/145826-coxuongkhop.png";
    }

    return {
      id: spec._id, // Use _id consistently like Specialization component
      title: spec.name,
      icon: iconUrl,
    };
  });

  // Redirect doctors and managers to their dashboard (patients and admins can view homepage)
  useEffect(() => {
    // Wait for auth and profile to load
    if (authLoading || profileLoading) return;

    // Redirect doctors and managers - patients and admins can stay on homepage
    if (user && userProfile) {
      const userRole = userProfile?.role || user?.role;

      if (userRole === "doctor") {
        navigate("/bac-si/trang-chu", { replace: true });
      } else if (userRole === "manager" || userRole === "MANAGER") {
        navigate("/manager/trang-chu", { replace: true });
      }
      // Patient and admin can stay on homepage, no redirect
    }
  }, [user, userProfile, authLoading, profileLoading, navigate]);

  useEffect(() => {
    // Only fetch data if user is not a doctor or manager (guests, patients, admins can see homepage)
    if (authLoading || profileLoading) return;

    // Check if user is a doctor or manager - if so, will redirect, so no need to fetch
    if (user && userProfile) {
      const userRole = userProfile?.role || user?.role;
      if (
        userRole === "doctor" ||
        userRole === "manager" ||
        userRole === "MANAGER"
      ) {
        return; // Will redirect, so no need to fetch
      }
    }

    // Use consistent API base URL - check multiple env vars for compatibility
    const apiBase =
      import.meta.env.VITE_API_URL ||
      import.meta.env.VITE_API_BASE ||
      "http://localhost:3000";
    let mounted = true;

    const fetchData = async () => {
      try {
        // Fetch specializations
        const specRes = await fetch(`${apiBase}/api/specializations`);
        if (!specRes.ok) {
          throw new Error(`Specializations API error: ${specRes.status}`);
        }
        const specJson = await specRes.json();
        if (!mounted) return;
        if (specJson.success) {
          setSpecializations(specJson.data || []);
        } else {
          console.error("Specializations API error", specJson);
          setSpecializations([]); // Set empty array on error
        }

        // Fetch featured doctors
        const doctorsRes = await fetch(
          `${apiBase}/api/doctors?limit=5&verified=true`
        );
        if (!doctorsRes.ok) {
          throw new Error(`Doctors API error: ${doctorsRes.status}`);
        }
        const doctorsJson = await doctorsRes.json();
        if (!mounted) return;
        if (doctorsJson.success) {
          setFeaturedDoctors(doctorsJson.data?.doctors || []);
        } else {
          console.error("Doctors API error", doctorsJson);
          setFeaturedDoctors([]); // Set empty array on error
        }
        setDoctorsLoading(false);
      } catch (err) {
        console.error("Fetch data failed:", err);
        // Set empty arrays on error to prevent UI issues
        if (mounted) {
          setSpecializations([]);
          setFeaturedDoctors([]);
          setDoctorsLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      mounted = false;
    };
  }, [user, userProfile, authLoading, profileLoading]);

  // Show loading while checking auth
  if (authLoading || profileLoading) {
    return null; // Loading
  }

  // If user is a doctor, show nothing (will redirect)
  if (user && userProfile) {
    const userRole = userProfile?.role || user?.role;
    if (userRole === "doctor") {
      return null; // Will redirect, so show nothing
    }
  }

  return (
    <div className="homepage">
      <section
        className="hero-section"
        style={{
          background: `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)), url('/Banner1.jpg')`,
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
          <Row justify="center" align="middle" style={{ minHeight: "350px" }}>
            <Col xs={24} lg={20} style={{ textAlign: "center" }}>
              <Title
                level={1}
                style={{
                  color: "white",
                  fontSize: "2.5rem",
                  marginBottom: "24px",
                  fontWeight: 700,
                }}
              >
                MedConnect: Nền tảng{" "}
                <span style={{ color: "#ffbf00" }}>Tư vấn Y tế</span> &{" "}
                <span style={{ color: "#ffbf00" }}>Đặt lịch khám</span> trực
                tuyến
              </Title>

              <Paragraph
                style={{
                  color: "white",
                  fontSize: "1.1rem",
                  marginBottom: "40px",
                  opacity: 0.95,
                }}
              >
                Kết nối bạn với các bác sĩ uy tín, đặt lịch khám dễ dàng và nhận
                tư vấn chất lượng ngay tại nhà thông qua video call bảo mật.
              </Paragraph>

              <Input
                placeholder="Tìm bệnh viện"
                size="large"
                prefix={<SearchOutlined style={{ color: "#45c3d2" }} />}
                onClick={() => navigate("/danh-sach-bac-si")}
                readOnly
                style={{
                  borderRadius: "25px",
                  width: "100%",
                  maxWidth: "1500px",
                  height: "55px",
                  margin: "0 auto",
                  fontSize: "20px",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                }}
              />
            </Col>
          </Row>
        </div>
      </section>

      {/* Recommendation Section */}
      {/* <section style={{ padding: "60px 0 40px 0", background: "#f9fafb" }}> */}
      <section style={{ padding: "80px 0", background: "white" }}>
        <div className="container">
          <Title level={2} style={{ marginBottom: "40px" }}>
            Dành cho bạn
          </Title>
          <Row gutter={[32, 32]}>
            <Col xs={24} sm={12} md={8}>
              <Link to="/danh-sach-bac-si">
                {/* <Card hoverable variant="plain" style={{ textAlign: "center" }}> */}
                <Card hoverable variant="plain" style={{ textAlign: "center" }}>
                  <img
                    src="https://cdn.bookingcare.vn/fo/w640/2023/11/01/140234-bac-si.png"
                    alt="Bác sĩ"
                    style={{
                      borderRadius: "50%",
                      width: "220px",
                      height: "220px",
                      objectFit: "cover",
                      marginBottom: "20px",
                    }}
                  />
                  <Title level={4}>Bác sĩ</Title>
                </Card>
              </Link>
            </Col>

            <Col xs={24} sm={12} md={8}>
              <Link to="/chuyen-khoa">
                {/* <Card hoverable variant="plain" style={{ textAlign: "center" }}> */}
                <Card hoverable variant="plain" style={{ textAlign: "center" }}>
                  <img
                    src="https://cdn.bookingcare.vn/fo/w640/2023/11/01/140537-chuyen-khoa.png"
                    alt="Chuyên khoa"
                    style={{
                      borderRadius: "50%",
                      width: "220px",
                      height: "220px",
                      objectFit: "cover",
                      marginBottom: "20px",
                    }}
                  />
                  <Title level={4}>Chuyên khoa</Title>
                </Card>
              </Link>
            </Col>
          </Row>
        </div>
      </section>

      {/* Comprehensive Services */}
      {/* <section style={{ padding: "40px 0 40px 0", background: "#f9fafb" }}> */}
      <section style={{ padding: "80px 0", background: "#f9fafb" }}>
        <div className="container">
          <Title level={2} style={{ marginBottom: "50px" }}>
            Dịch vụ toàn diện
          </Title>

          <Row gutter={[24, 24]}>
            {[
              {
                title: "Khám Chuyên khoa",
                icon: "https://cdn.bookingcare.vn/fo/w1920/2023/12/28/145510-chuyenkhoa.png",
              },
              {
                title: "Khám từ xa",
                icon: "https://cdn.bookingcare.vn/fo/w1920/2023/12/28/145511-khamtuxa.png",
              },
              {
                title: "Khám tổng quát",
                icon: "https://cdn.bookingcare.vn/fo/w1920/2023/12/28/145512-khamtongquat.png",
              },
              {
                title: "Xét nghiệm y học",
                icon: "https://cdn.bookingcare.vn/fo/w1920/2023/12/28/145513-xetnghiemyhoc.png",
              },
              {
                title: "Sức khỏe tinh thần",
                icon: "https://cdn.bookingcare.vn/fo/w1920/2023/12/28/145514-tinhthan.png",
              },
              {
                title: "Khám nha khoa",
                icon: "https://cdn.bookingcare.vn/fo/w1920/2023/12/28/145515-nhakhoa.png",
              },
            ].map((service, index) => (
              <Col xs={24} sm={12} md={12} lg={8} key={index}>
                <Card
                  hoverable
                  variant="outlined" // keep visual border
                  style={{
                    borderRadius: "20px",
                    boxShadow: "0 3px 10px rgba(0,0,0,0.05)",
                  }}
                  styles={{
                    body: {
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                      padding: "20px 24px",
                    },
                  }}
                >
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      flexShrink: 0,
                      background: "#fff9e6",
                      borderRadius: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <img
                      src={service.icon}
                      alt={service.title}
                      style={{ width: "36px", height: "36px" }}
                    />
                  </div>
                  <Title level={4} style={{ margin: 0 }}>
                    {service.title}
                  </Title>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* Specialties Section */}
      {/* <section style={{ padding: "40px 0 60px 0", background: "#f9fafb" }}> */}
      <section style={{ padding: "80px 0", background: "#fff" }}>
        <div className="container">
          <Row
            justify="space-between"
            align="middle"
            style={{ marginBottom: "40px" }}
          >
            <Title level={2} style={{ margin: 0 }}>
              Chuyên khoa
            </Title>
            <Link
              to="/chuyen-khoa"
              style={{
                background: "#c8f3f3",
                padding: "8px 20px",
                borderRadius: "12px",
                color: "#007f7f",
                fontWeight: 500,
                textDecoration: "none",
                fontSize: "20px",
              }}
            >
              Xem thêm
            </Link>
          </Row>

          {specialties.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <Paragraph style={{ fontSize: "16px", color: "#666" }}>
                Đang tải danh sách chuyên khoa...
              </Paragraph>
            </div>
          ) : (
            <Slider {...sliderSettings}>
              {specialties.map((specialty, index) => (
                <div key={index} style={{ padding: "0 12px" }}>
                  <Card
                    hoverable
                    onClick={() => {
                      console.log(
                        "🏠 Homepage: Navigating to specialty:",
                        specialty.id
                      );
                      navigate(
                        `/danh-sach-bac-si?specialty=${encodeURIComponent(
                          specialty.id
                        )}`
                      );
                    }}
                    variant="outlined"
                    style={{
                      borderRadius: "16px",
                      textAlign: "center",
                      cursor: "pointer",
                      height: "100%",
                      boxShadow: "0 3px 10px rgba(0,0,0,0.05)",
                      overflow: "visible",
                    }}
                    styles={{
                      body: {
                        padding: "4px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "visible",
                      },
                    }}
                  >
                    <img
                      src={specialty.icon}
                      alt={specialty.title}
                      onError={(e) => {
                        // Fallback to default icon if image fails to load
                        e.target.src =
                          "https://cdn.bookingcare.vn/fo/w1920/2023/12/28/145826-coxuongkhop.png";
                        e.target.onerror = null; // Prevent infinite loop
                      }}
                      style={{
                        width: "200px",
                        height: "200px",
                        objectFit: "contain",
                        marginBottom: "16px",
                        zIndex: 1,
                      }}
                    />
                    <Title level={4} style={{ margin: 0, color: "#333" }}>
                      {specialty.title}
                    </Title>
                  </Card>
                </div>
              ))}
            </Slider>
          )}
        </div>
      </section>

      {/* Medical Facilities Section */}
      {/* <section style={{ padding: "60px 0 40px 0", background: "#f9fafb" }}> */}
      <section style={{ padding: "80px 0", background: "#fff" }}>
        <div className="container">
          <Row
            justify="space-between"
            align="middle"
            style={{ marginBottom: "40px" }}
          >
            <Title level={2} style={{ margin: 0 }}>
              Cơ sở y tế
            </Title>
            <Link
              to="/co-so-y-te"
              style={{
                background: "#c8f3f3",
                padding: "8px 20px",
                borderRadius: "12px",
                color: "#007f7f",
                fontWeight: 500,
                textDecoration: "none",
                fontSize: "20px",
              }}
            >
              Xem thêm
            </Link>
          </Row>

          <Slider {...sliderSettings}>
            {[
              {
                id: "vietduc",
                name: "Bệnh viện Hữu nghị Việt Đức",
                logo: "https://cdn.bookingcare.vn/fo/w1920/2023/12/28/151122-viet-duc.png",
              },
              {
                id: "choray",
                name: "Bệnh viện Chợ Rẫy",
                logo: "https://cdn.bookingcare.vn/fo/w1920/2023/12/28/151123-cho-ray.png",
              },
              {
                id: "doctorcheck",
                name: "Doctor Check - Tầm Soát Bệnh Để Sống Thọ Hơn",
                logo: "https://cdn.bookingcare.vn/fo/w1920/2023/12/28/151124-doctor-check.png",
              },
              {
                id: "vinmec",
                name: "Bệnh viện Đa khoa Quốc tế Vinmec",
                logo: "https://cdn.bookingcare.vn/fo/w1920/2023/12/28/151125-vinmec.png",
              },
              {
                id: "tamduc",
                name: "Bệnh viện Tâm Đức",
                logo: "https://cdn.bookingcare.vn/fo/w1920/2023/12/28/151126-tam-duc.png",
              },
              {
                id: "hunggvuong",
                name: "Bệnh viện Hùng Vương",
                logo: "https://cdn.bookingcare.vn/fo/w1920/2023/12/28/151127-hung-vuong.png",
              },
            ].map((facility, index) => (
              <div key={index} style={{ padding: "0 12px" }}>
                <Card
                  hoverable
                  onClick={() => navigate(`/hospitals/${facility.id}`)}
                  variant="outlined"
                  style={{
                    borderRadius: "16px",
                    textAlign: "center",
                    cursor: "pointer",
                    height: "100%",
                    boxShadow: "0 3px 10px rgba(0,0,0,0.05)",
                  }}
                  styles={{
                    body: {
                      padding: "24px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    },
                  }}
                >
                  <img
                    src={facility.logo}
                    alt={facility.name}
                    style={{
                      width: "150px",
                      height: "150px",
                      objectFit: "contain",
                      marginBottom: "16px",
                    }}
                  />
                  <Title
                    level={4}
                    style={{
                      margin: 0,
                      color: "#333",
                      fontWeight: 500,
                      fontSize: "1.05rem",
                    }}
                  >
                    {facility.name}
                  </Title>
                </Card>
              </div>
            ))}
          </Slider>
        </div>
      </section>

      {/* Promotion Section */}
      <section style={{ padding: "15px 0", background: "#f9fafb" }}>
        <div className="container">
          <Title
            level={2}
            style={{
              textAlign: "left",
              marginBottom: "10px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "1.5rem",
            }}
          >
            Ưu đãi HOT trong tháng
            <img
              src="https://cdn-icons-png.flaticon.com/512/616/616554.png"
              alt="Hot"
              style={{ width: "18px", height: "18px" }}
            />
          </Title>

          <Slider
            {...{
              dots: true,
              infinite: true,
              autoplay: true,
              autoplaySpeed: 3000,
              slidesToShow: 1,
              slidesToScroll: 1,
              arrows: false,
              pauseOnHover: true,
            }}
          >
            {[
              {
                id: 1,
                image:
                  "https://cdn.bookingcare.vn/fo/w1920/2024/08/01/144053-uu-dai-medlatec.png",
                link: "/promotions/medlatec",
              },
              {
                id: 2,
                image:
                  "https://cdn.bookingcare.vn/fo/w1920/2024/07/01/145311-uu-dai-da-lieu.png",
                link: "/promotions/dermatology",
              },
              {
                id: 3,
                image:
                  "https://cdn.bookingcare.vn/fo/w1920/2024/06/01/145312-uu-dai-vinmec.png",
                link: "/promotions/vinmec",
              },
              {
                id: 4,
                image:
                  "https://cdn.bookingcare.vn/fo/w1920/2024/05/01/145313-uu-dai-nha-khoa.png",
                link: "/promotions/dental",
              },
              {
                id: 5,
                image:
                  "https://cdn.bookingcare.vn/fo/w1920/2024/04/01/145314-uu-dai-tam-soat.png",
                link: "/promotions/checkup",
              },
            ].map((promo) => (
              <div key={promo.id} style={{ textAlign: "center" }}>
                <Link to={promo.link}>
                  <img
                    src={promo.image}
                    alt={`Ưu đãi ${promo.id}`}
                    style={{
                      width: "100%",
                      maxWidth: "1200px",
                      height: "auto",
                      maxHeight: "400px",
                      objectFit: "cover",
                      borderRadius: "16px",
                      margin: "0 auto",
                      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
                      cursor: "pointer",
                    }}
                  />
                </Link>
              </div>
            ))}
          </Slider>
        </div>
      </section>

      {/* Features Section */}
      <section style={{ padding: "80px 0", background: "#f8f9fa" }}>
        <div className="container">
          <Title
            level={2}
            style={{ textAlign: "center", marginBottom: "60px" }}
          >
            Tại sao chọn MedConnect?
          </Title>
          <Row gutter={[32, 32]} justify="center">
            {features.map((feature, index) => (
              <Col xs={24} sm={12} lg={8} key={index}>
                <Link to={feature.link} style={{ textDecoration: "none" }}>
                  <Card
                    hoverable
                    variant="outlined"
                    style={{
                      textAlign: "center",
                      height: "100%",
                      borderRadius: "16px",
                      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
                      border: "1px solid #f0f0f0",
                      transition: "all 0.3s ease",
                    }}
                    styles={{
                      body: {
                        padding: "40px 24px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "100%",
                      },
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-5px)";
                      e.currentTarget.style.boxShadow =
                        "0 8px 30px rgba(0, 0, 0, 0.12)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow =
                        "0 4px 20px rgba(0, 0, 0, 0.08)";
                    }}
                  >
                    <div style={{ marginBottom: "24px" }}>{feature.icon}</div>
                    <Title
                      level={3}
                      style={{
                        marginBottom: "16px",
                        color: "#262626",
                        fontSize: "1.25rem",
                        fontWeight: 600,
                      }}
                    >
                      {feature.title}
                    </Title>
                    <Paragraph
                      style={{
                        color: "#666",
                        margin: 0,
                        fontSize: "1rem",
                        lineHeight: "1.6",
                      }}
                    >
                      {feature.description}
                    </Paragraph>
                  </Card>
                </Link>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* Featured Doctors Section */}
      <section style={{ padding: "60px 0", background: "#45c3d2" }}>
        <div className="container">
          <Row
            justify="space-between"
            align="middle"
            style={{ marginBottom: "40px" }}
          >
            <Title level={2} style={{ margin: 0 }}>
              Bác sĩ nổi bật
            </Title>
            <Link
              to="/danh-sach-bac-si"
              style={{
                background: "#c8f3f3",
                padding: "8px 20px",
                borderRadius: "12px",
                color: "#007f7f",
                fontWeight: 500,
                textDecoration: "none",
                fontSize: "20px",
              }}
            >
              Xem thêm
            </Link>
          </Row>

          {doctorsLoading ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ fontSize: "18px", color: "#666" }}>
                Đang tải danh sách bác sĩ...
              </div>
            </div>
          ) : featuredDoctors.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ fontSize: "18px", color: "#666" }}>
                Hiện chưa có bác sĩ nổi bật
              </div>
            </div>
          ) : (
            <Slider
              {...{
                dots: false,
                infinite: true,
                slidesToShow: 4,
                slidesToScroll: 1,
                arrows: true,
                autoplay: true,
                autoplaySpeed: 5000,
                centerMode: false,
                variableWidth: false,
                nextArrow: <SampleNextArrow />,
                prevArrow: <SamplePrevArrow />,
                responsive: [
                  {
                    breakpoint: 992,
                    settings: { slidesToShow: 2, slidesToScroll: 1 },
                  },
                  {
                    breakpoint: 576,
                    settings: { slidesToShow: 1, slidesToScroll: 1 },
                  },
                ],
              }}
            >
              {featuredDoctors.map((doctor, index) => (
                <div key={index} className="doctor-card">
                  <Card
                    hoverable
                    onClick={() =>
                      navigate(`/dat-lich/chon-thoi-gian`, {
                        state: {
                          doctor: doctor,
                          specialization: doctor.specializationIds?.[0] || null,
                        },
                      })
                    }
                    variant="plain"
                    style={{
                      borderRadius: "16px",
                      textAlign: "center",
                      background: "#ffffff",
                      boxShadow: "0 3px 12px rgba(0,0,0,0.08)",
                      height: "280px", // ✅ Giảm chiều cao từ 380px xuống 280px
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "flex-start",
                      alignItems: "center",
                      transition: "transform 0.3s ease, box-shadow 0.3s ease",
                      cursor: "pointer",
                    }}
                    styles={{
                      body: {
                        padding: "20px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        alignItems: "center",
                        height: "100%",
                      },
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.transform = "translateY(-5px)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.transform = "translateY(0)")
                    }
                  >
                    <img
                      src={
                        doctor.avatarUrl &&
                        !doctor.avatarUrl.includes("picsum.photos")
                          ? doctor.avatarUrl
                          : "/default-avatar.png"
                      }
                      alt={doctor.fullName}
                      onError={(e) => {
                        e.target.src = "/default-avatar.png";
                        e.target.onerror = null; // Prevent infinite loop
                      }}
                      style={{
                        width: "120px",
                        height: "120px",
                        objectFit: "cover",
                        borderRadius: "50%",
                        marginBottom: "12px",
                      }}
                    />
                    <Title
                      level={4}
                      style={{
                        fontSize: "1.05rem",
                        fontWeight: 600,
                        color: "#222",
                        marginBottom: "8px",
                      }}
                    >
                      {(() => {
                        const fullName = doctor.fullName;
                        return fullName?.startsWith("BS.")
                          ? fullName
                          : `BS. ${fullName}`;
                      })()}
                    </Title>
                    <Paragraph
                      style={{
                        fontSize: "0.95rem",
                        color: "#666",
                        margin: 0,
                      }}
                    >
                      {doctor.specializationIds &&
                      doctor.specializationIds.length > 0
                        ? doctor.specializationIds
                            .map((spec) => spec.name)
                            .join(", ")
                        : "Chuyên khoa"}
                    </Paragraph>
                  </Card>
                </div>
              ))}
            </Slider>
          )}
        </div>
      </section>
    </div>
  );
};

export default TrangChu;
