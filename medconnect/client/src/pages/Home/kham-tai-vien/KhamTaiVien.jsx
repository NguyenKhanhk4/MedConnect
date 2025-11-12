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
} from "antd";
import {
  CalendarOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  StarOutlined,
  UserOutlined,
  HeartOutlined,
  SafetyOutlined,
  LeftOutlined,
  RightOutlined,
  ClockCircleOutlined,
  CreditCardOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import "./KhamTaiVien.css";

const { Title, Paragraph } = Typography;

const KhamTaiVien = () => {
  const navigate = useNavigate();
  const [specializations, setSpecializations] = useState([]);
  const [featuredDoctors, setFeaturedDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);

  // ---- Custom arrow components for react-slick ----
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
      title: "Tìm bệnh viện uy tín",
      description:
        "Tìm kiếm bệnh viện theo chuyên khoa, địa điểm hoặc đánh giá từ bệnh nhân",
      link: "/danh-sach-benh-vien",
    },
    {
      icon: <HomeOutlined style={{ fontSize: "48px", color: "#45c3d2" }} />,
      title: "Khám tại bệnh viện",
      description:
        "Dịch vụ y tế chuyên nghiệp tại các bệnh viện hàng đầu - An toàn, chất lượng",
      link: "/kham-tai-benh-vien",
    },
    {
      icon: <CalendarOutlined style={{ fontSize: "48px", color: "#45c3d2" }} />,
      title: "Đặt lịch khám bệnh viện",
      description:
        "Đặt lịch khám trực tiếp tại bệnh viện một cách dễ dàng và tiện lợi",
      link: "/booking-hospital",
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
      title: "Tìm kiếm bệnh viện",
      description:
        "Sử dụng thanh tìm kiếm để tìm bệnh viện phù hợp với nhu cầu của bạn",
      icon: <UserOutlined />,
    },
    {
      title: "Chọn chuyên khoa",
      description: "Chọn chuyên khoa và bác sĩ phù hợp tại bệnh viện",
      icon: <ClockCircleOutlined />,
    },
    {
      title: "Đặt lịch khám",
      description: "Chọn thời gian phù hợp và xác nhận đặt lịch khám",
      icon: <CalendarOutlined />,
    },
    {
      title: "Thanh toán & khám",
      description: "Thanh toán và tham gia buổi khám tại bệnh viện",
      icon: <CreditCardOutlined />,
    },
  ];

  // ---- Specialty list ----
  const specialties = [
    {
      id: "orthopedic",
      title: "Cơ Xương Khớp",
      icon: "https://cdn.bookingcare.vn/fo/w1920/2023/12/28/145826-coxuongkhop.png",
    },
    {
      id: "neurology",
      title: "Thần kinh",
      icon: "https://cdn.bookingcare.vn/fo/w1920/2023/12/28/145827-thankinh.png",
    },
    {
      id: "digestive",
      title: "Tiêu hóa",
      icon: "https://cdn.bookingcare.vn/fo/w1920/2023/12/28/145828-tieuhoa.png",
    },
    {
      id: "otolaryngology",
      title: "Tai Mũi Họng",
      icon: "https://cdn.bookingcare.vn/fo/w1920/2023/12/28/145829-taimuihong.png",
    },
    {
      id: "cardiology",
      title: "Tim mạch",
      icon: "https://cdn.bookingcare.vn/fo/w1920/2023/12/28/145830-timmach.png",
    },
    {
      id: "dermatology",
      title: "Da liễu",
      icon: "https://cdn.bookingcare.vn/fo/w1920/2023/12/28/145831-dalie.png",
    },
    {
      id: "pediatrics",
      title: "Nhi khoa",
      icon: "https://cdn.bookingcare.vn/fo/w1920/2023/12/28/145832-nhikhoa.png",
    },
    {
      id: "dentistry",
      title: "Nha khoa",
      icon: "https://cdn.bookingcare.vn/fo/w1920/2023/12/28/145833-nhakhoa.png",
    },
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
        // Fetch specializations
        const specRes = await fetch(`${apiBase}/api/specializations`);
        const specJson = await specRes.json();
        if (!mounted) return;
        if (specJson.success) setSpecializations(specJson.data || []);
        else console.error("Specializations API error", specJson);

        // Fetch featured doctors
        const doctorsRes = await fetch(
          `${apiBase}/api/doctors?limit=5&verified=true`
        );
        const doctorsJson = await doctorsRes.json();
        if (!mounted) return;
        if (doctorsJson.success)
          setFeaturedDoctors(doctorsJson.data.doctors || []);
        else console.error("Doctors API error", doctorsJson);
        setDoctorsLoading(false);
      } catch (err) {
        console.error("Fetch data failed:", err);
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
          padding: "50px 0",
          background: "#f9fafb",
          paddingTop: "100px",
        }}
      >
        {/* <section 
        className="hero-section"
          style={{
            background: `linear-gradient(rgba(18, 18, 18, 0.45), rgba(20, 19, 19, 0.45)), url('/Banner3.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
      > */}
        <div className="marquee">
          <p>
            📢 Đặt lịch khám trực tuyến, hỗ trợ bạn đi khám từ lúc vào viện đến
            khi kết thúc khám. Gọi ngay 1900 2267!
          </p>
        </div>
        <div className="container" style={{ marginTop: "40px" }}>
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
              // Thêm ảnh mới vào đây
              // {
              //   id: 6,
              //   image: "URL_ẢNH_CỦA_BẠNgit ",
              //   link: "/promotions/ten-u-dai",
              // },
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

      {/* Recommendation Section */}
      <section style={{ padding: "60px 0 40px 0", background: "#f9fafb" }}>
        <div className="container">
          <Title level={2} style={{ marginBottom: "40px" }}>
            Dành cho bạn
          </Title>
          <Row gutter={[32, 32]}>
            <Col xs={24} sm={12} md={8}>
              <Link to="/co-so-y-te">
                <Card hoverable variant="plain" style={{ textAlign: "center" }}>
                  <img
                    src="https://cdn.bookingcare.vn/fo/w640/2023/11/01/141017-csyt.png"
                    alt="Cơ sở y tế"
                    style={{
                      borderRadius: "50%",
                      width: "220px",
                      height: "220px",
                      objectFit: "cover",
                      marginBottom: "20px",
                    }}
                  />
                  <Title level={4}>Cơ sở y tế</Title>
                </Card>
              </Link>
            </Col>

            <Col xs={24} sm={12} md={8}>
              <Link to="/danh-sach-chuyen-khoa">
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

            <Col xs={24} sm={12} md={8}>
              <Link to="/danh-sach-bac-si">
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
          </Row>
        </div>
      </section>

      {/* Comprehensive Services */}
      <section style={{ padding: "40px 0 40px 0", background: "#f9fafb" }}>
        <div className="container">
          <Title level={2} style={{ marginBottom: "50px" }}>
            Dịch vụ khám bệnh viện
          </Title>

          <Row gutter={[24, 24]}>
            {[
              {
                title: "Khám Chuyên khoa",
                icon: "https://cdn.bookingcare.vn/fo/w1920/2023/12/28/145510-chuyenkhoa.png",
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
                title: "Chẩn đoán hình ảnh",
                icon: "https://cdn.bookingcare.vn/fo/w1920/2023/12/28/145516-chan-doan-hinh-anh.png",
              },
              {
                title: "Phẫu thuật",
                icon: "https://cdn.bookingcare.vn/fo/w1920/2023/12/28/145517-phau-thuat.png",
              },
              {
                title: "Vật lý trị liệu",
                icon: "https://cdn.bookingcare.vn/fo/w1920/2023/12/28/145518-vat-ly-tri-lieu.png",
              },
            ].map((service, index) => (
              <Col xs={24} sm={12} md={12} lg={8} key={index}>
                <Card
                  hoverable
                  variant="outlined"
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
      <section style={{ padding: "40px 0 40px 0", background: "#f9fafb" }}>
        <div className="container">
          <Row
            justify="space-between"
            align="middle"
            style={{ marginBottom: "40px" }}
          >
            <Title level={2} style={{ margin: 0 }}>
              Chuyên khoa khám tại bệnh viện
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

          <Slider {...sliderSettings}>
            {specializations.map((spec, index) => {
              const apiBase =
                import.meta.env.VITE_API_URL || "http://localhost:3000";
              const iconUrl = spec.avatar
                ? `${apiBase}${spec.avatar}`
                : "https://cdn.bookingcare.vn/fo/w1920/2023/12/28/145826-coxuongkhop.png";

              return (
                <div key={index} style={{ padding: "0 12px" }}>
                  <Card
                    hoverable
                    onClick={() => navigate(`/specialties/${spec._id}`)}
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
                      src={iconUrl}
                      alt={spec.name}
                      style={{
                        width: "320px",
                        height: "320px",
                        objectFit: "contain",
                        marginBottom: "16px",
                        transform: "scale(1.1)",
                        zIndex: 1,
                      }}
                    />
                    <Title level={4} style={{ margin: 0, color: "#333" }}>
                      {spec.name}
                    </Title>
                  </Card>
                </div>
              );
            })}
          </Slider>
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
                      height: "280px", // Reduced height
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
                      src={doctor.avatarUrl || "/default-avatar.png"}
                      alt={doctor.fullName}
                      style={{
                        width: "120px", // Reduced size
                        height: "120px", // Reduced size
                        objectFit: "cover",
                        borderRadius: "50%",
                        marginBottom: "12px", // Reduced margin
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

      {/* Medical Facilities Section */}
      <section style={{ padding: "60px 0 40px 0", background: "#f9fafb" }}>
        <div className="container">
          <Row
            justify="space-between"
            align="middle"
            style={{ marginBottom: "40px" }}
          >
            <Title level={2} style={{ margin: 0 }}>
              Bệnh viện nổi bật
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
            {hospitalData.map((hospital, index) => (
              <div key={index} style={{ padding: "0 12px" }}>
                <Card
                  hoverable
                  onClick={() => navigate(`/hospitals/${hospital.id}`)}
                  variant="outlined"
                  style={{
                    borderRadius: "16px",
                    cursor: "pointer",
                    height: "100%",
                    boxShadow: "0 3px 10px rgba(0,0,0,0.05)",
                  }}
                  styles={{
                    body: {
                      padding: "20px",
                    },
                  }}
                >
                  <div style={{ textAlign: "center", marginBottom: "16px" }}>
                    <img
                      src={hospital.logo}
                      alt={hospital.name}
                      style={{
                        width: "120px",
                        height: "120px",
                        objectFit: "contain",
                        marginBottom: "12px",
                      }}
                    />
                    <Title
                      level={4}
                      style={{
                        margin: "0 0 8px 0",
                        color: "#333",
                        fontWeight: 600,
                        fontSize: "1.1rem",
                      }}
                    >
                      {hospital.name}
                    </Title>
                    <Rate
                      disabled
                      defaultValue={hospital.rating}
                      style={{ fontSize: "14px" }}
                    />
                    <div
                      style={{
                        marginTop: "4px",
                        fontSize: "12px",
                        color: "#666",
                      }}
                    >
                      {hospital.rating}/5.0
                    </div>
                  </div>

                  <div style={{ marginBottom: "12px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: "4px",
                      }}
                    >
                      <EnvironmentOutlined
                        style={{ color: "#666", marginRight: "6px" }}
                      />
                      <span style={{ fontSize: "12px", color: "#666" }}>
                        {hospital.address}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <PhoneOutlined
                        style={{ color: "#666", marginRight: "6px" }}
                      />
                      <span style={{ fontSize: "12px", color: "#666" }}>
                        {hospital.phone}
                      </span>
                    </div>
                  </div>

                  <div style={{ marginBottom: "12px" }}>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#666",
                        marginBottom: "6px",
                      }}
                    >
                      Chuyên khoa:
                    </div>
                    <div
                      style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}
                    >
                      {hospital.specialties.slice(0, 3).map((spec, idx) => (
                        <Tag key={idx} size="small" color="blue">
                          {spec}
                        </Tag>
                      ))}
                    </div>
                  </div>

                  <Paragraph
                    style={{
                      fontSize: "11px",
                      color: "#888",
                      margin: 0,
                      lineHeight: "1.4",
                    }}
                  >
                    {hospital.description}
                  </Paragraph>
                </Card>
              </div>
            ))}
          </Slider>
        </div>
      </section>

      {/* How to Book Section */}
      <section style={{ padding: "80px 0", background: "#f9fafb" }}>
        <div className="container">
          <Title
            level={2}
            style={{ textAlign: "center", marginBottom: "50px" }}
          >
            Cách đặt lịch khám bệnh viện
          </Title>
          <Row justify="center">
            <Col xs={24} lg={16}>
              <Steps
                direction="horizontal"
                current={-1}
                items={steps.map((step, index) => ({
                  title: step.title,
                  description: step.description,
                  icon: step.icon,
                }))}
                style={{ marginBottom: "40px" }}
              />
            </Col>
          </Row>
        </div>
      </section>

      {/* Features Section */}
      <section style={{ padding: "80px 0", background: "#f8f9fa" }}>
        <div className="container">
          <Title
            level={2}
            style={{ textAlign: "center", marginBottom: "60px" }}
          >
            Tại sao chọn khám tại bệnh viện?
          </Title>
          <Row gutter={[32, 32]}>
            {features.map((feature, index) => (
              <Col xs={24} sm={12} lg={6} key={index}>
                <Link to={feature.link} style={{ textDecoration: "none" }}>
                  <Card
                    hoverable
                    variant="plain"
                    style={{
                      textAlign: "center",
                      height: "100%",
                      borderRadius: "12px",
                      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
                    }}
                    styles={{ body: { padding: "40px 20px" } }}
                  >
                    <div style={{ marginBottom: "20px" }}>{feature.icon}</div>
                    <Title
                      level={4}
                      style={{ marginBottom: "16px", color: "#333" }}
                    >
                      {feature.title}
                    </Title>
                    <Paragraph style={{ color: "#666", margin: 0 }}>
                      {feature.description}
                    </Paragraph>
                  </Card>
                </Link>
              </Col>
            ))}
          </Row>
        </div>
      </section>
    </div>
  );
};

export default KhamTaiVien;
