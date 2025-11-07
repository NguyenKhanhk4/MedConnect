import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import {
  Row,
  Col,
  Card,
  Typography,
  Space,
  Button,
  Input,
  Select,
  Pagination,
  Tag,
  Divider,
} from "antd";
import {
  MedicineBoxOutlined,
  ClockCircleOutlined,
  UserOutlined,
  CheckCircleOutlined,
  SearchOutlined,
  GiftOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import NavigationBreadcrumb from "../../../components/Breadcrumb/NavigationBreadcrumb";
import "./GoiKham.css";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const GoiKham = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPriceRange, setSelectedPriceRange] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Mock data for packages
  const packages = [
    {
      id: 1,
      name: "Gói khám sức khỏe tổng quát cơ bản",
      category: "general",
      price: 1500000,
      originalPrice: 2000000,
      duration: "2-3 giờ",
      facility: "Bệnh viện Chợ Rẫy",
      description:
        "Gói khám tổng quát cơ bản bao gồm các xét nghiệm và thăm khám cần thiết để đánh giá tình trạng sức khỏe tổng thể.",
      services: [
        "Khám nội tổng quát",
        "Khám ngoại tổng quát",
        "Xét nghiệm máu tổng quát",
        "Xét nghiệm nước tiểu",
        "Chụp X-quang ngực",
        "Siêu âm bụng tổng quát",
      ],
      forWho: ["Nam/Nữ từ 18-60 tuổi", "Người muốn kiểm tra sức khỏe định kỳ"],
      image: "https://via.placeholder.com/100x100",
    },
    {
      id: 2,
      name: "Gói khám tim mạch chuyên sâu",
      category: "cardiology",
      price: 3500000,
      originalPrice: 4200000,
      duration: "3-4 giờ",
      facility: "Bệnh viện Tim Hà Nội",
      description:
        "Gói khám chuyên sâu về tim mạch với các xét nghiệm và thăm khám chuyên khoa để phát hiện sớm các bệnh lý tim mạch.",
      services: [
        "Khám tim mạch chuyên khoa",
        "Điện tâm đồ",
        "Siêu âm tim",
        "Đo huyết áp 24h",
        "Xét nghiệm lipid máu",
        "Test gắng sức",
      ],
      forWho: [
        "Nam/Nữ từ 35 tuổi trở lên",
        "Người có tiền sử gia đình về tim mạch",
      ],
      image: "https://via.placeholder.com/100x100",
    },
    {
      id: 3,
      name: "Gói khám phụ khoa toàn diện",
      category: "gynecology",
      price: 2200000,
      originalPrice: 2800000,
      duration: "2-3 giờ",
      facility: "Bệnh viện Từ Dũ",
      description:
        "Gói khám chuyên khoa phụ khoa toàn diện dành cho phụ nữ, bao gồm các xét nghiệm và thăm khám cần thiết.",
      services: [
        "Khám phụ khoa",
        "Siêu âm phụ khoa",
        "Tầm soát ung thư cổ tử cung",
        "Xét nghiệm hormone",
        "Khám vú",
        "Siêu âm vú",
      ],
      forWho: ["Phụ nữ từ 18 tuổi trở lên", "Phụ nữ đã có đời sống tình dục"],
      image: "https://via.placeholder.com/100x100",
    },
    {
      id: 4,
      name: "Gói khám sức khỏe cao cấp",
      category: "premium",
      price: 8500000,
      originalPrice: 12000000,
      duration: "1 ngày",
      facility: "Bệnh viện FV",
      description:
        "Gói khám sức khỏe cao cấp với đầy đủ các xét nghiệm hiện đại và dịch vụ VIP.",
      services: [
        "Khám đa khoa tổng quát",
        "Chụp CT ngực",
        "Chụp MRI não",
        "Nội soi dạ dày",
        "Xét nghiệm ung thư",
        "Khám mắt chuyên sâu",
        "Khám răng hàm mặt",
        "Tư vấn dinh dưỡng",
      ],
      forWho: ["Nam/Nữ từ 30 tuổi trở lên", "Người có điều kiện kinh tế khá"],
      image: "https://via.placeholder.com/100x100",
    },
    {
      id: 5,
      name: "Gói khám tiền hôn nhân",
      category: "premarital",
      price: 1800000,
      originalPrice: 2300000,
      duration: "2-3 giờ",
      facility: "Bệnh viện Đại học Y Dược",
      description:
        "Gói khám dành cho các cặp đôi chuẩn bị kết hôn, đảm bảo sức khỏe sinh sản tốt nhất.",
      services: [
        "Khám tổng quát",
        "Xét nghiệm máu tổng quát",
        "Xét nghiệm HIV, Hepatitis",
        "Khám phụ khoa/nam khoa",
        "Siêu âm bụng",
        "Tư vấn di truyền",
      ],
      forWho: ["Cặp đôi chuẩn bị kết hôn", "Nam/Nữ từ 18-35 tuổi"],
      image: "https://via.placeholder.com/100x100",
    },
    {
      id: 6,
      name: "Gói khám nhi tổng quát",
      category: "pediatric",
      price: 1200000,
      originalPrice: 1600000,
      duration: "1-2 giờ",
      facility: "Bệnh viện Nhi Đồng 1",
      description:
        "Gói khám dành cho trẻ em từ 1-16 tuổi, đánh giá toàn diện tình trạng phát triển và sức khỏe.",
      services: [
        "Khám nhi tổng quát",
        "Đo chiều cao, cân nặng",
        "Xét nghiệm máu cơ bản",
        "Kiểm tra thị lực, thính lực",
        "Khám răng miệng",
        "Tư vấn dinh dưỡng",
      ],
      forWho: ["Trẻ em từ 1-16 tuổi", "Phụ huynh muốn theo dõi sức khỏe con"],
      image: "https://via.placeholder.com/100x100",
    },
  ];

  // Filter packages
  const filteredPackages = packages.filter((pkg) => {
    const matchesSearch =
      searchTerm === "" ||
      pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pkg.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pkg.services.some((service) =>
        service.toLowerCase().includes(searchTerm.toLowerCase())
      );

    const matchesCategory =
      selectedCategory === "all" || pkg.category === selectedCategory;

    let matchesPriceRange = true;
    if (selectedPriceRange !== "all") {
      switch (selectedPriceRange) {
        case "under2m":
          matchesPriceRange = pkg.price < 2000000;
          break;
        case "2m-5m":
          matchesPriceRange = pkg.price >= 2000000 && pkg.price < 5000000;
          break;
        case "over5m":
          matchesPriceRange = pkg.price >= 5000000;
          break;
        default:
          matchesPriceRange = true;
      }
    }

    return matchesSearch && matchesCategory && matchesPriceRange;
  });

  const handleSearch = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleCategoryChange = (value) => {
    setSelectedCategory(value);
    setCurrentPage(1);
  };

  const handlePriceRangeChange = (value) => {
    setSelectedPriceRange(value);
    setCurrentPage(1);
  };

  const handlePackageClick = (packageId) => {
    // Navigate to package detail
    console.log("Navigate to package detail:", packageId);
  };

  const handleBookPackage = (e, packageId) => {
    e.stopPropagation();

    // Check if user is logged in
    if (!user) {
      // If not logged in, redirect to login page
      navigate("/dang-nhap", {
        state: {
          from: "/dat-lich",
          packageId: packageId,
          message: "Vui lòng đăng nhập để đặt lịch khám",
        },
      });
      return;
    }

    // If logged in, handle booking package
    console.log("Book package:", packageId);
    // You can add more logic here to navigate to appointment booking
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("vi-VN").format(price) + "đ";
  };

  const PackageCard = ({ package: pkg }) => (
    <Card
      className="package-card"
      hoverable
      onClick={() => handlePackageClick(pkg.id)}
      style={{
        marginBottom: "24px",
        borderRadius: "12px",
        border: "1px solid #f0f0f0",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
      }}
    >
      <Row gutter={16}>
        <Col flex="120px">
          <div
            style={{
              width: "100px",
              height: "100px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #fa8c16 0%, #d46b08 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "40px",
              color: "white",
            }}
          >
            <GiftOutlined />
          </div>
        </Col>
        <Col flex="auto">
          <div className="package-info">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "8px",
              }}
            >
              <Title level={4} style={{ margin: 0, color: "#1890ff", flex: 1 }}>
                {pkg.name}
              </Title>
              <div style={{ textAlign: "right" }}>
                <Text delete style={{ color: "#999", fontSize: "14px" }}>
                  {formatPrice(pkg.originalPrice)}
                </Text>
                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: "600",
                    color: "#f5222d",
                  }}
                >
                  {formatPrice(pkg.price)}
                </div>
              </div>
            </div>

            <Paragraph style={{ color: "#666", margin: "8px 0" }}>
              {pkg.description}
            </Paragraph>

            <Space direction="vertical" size="small" style={{ width: "100%" }}>
              <Space>
                <ClockCircleOutlined style={{ color: "#45c3d2" }} />
                <Text>Thời gian: {pkg.duration}</Text>
                <UserOutlined style={{ color: "#45c3d2" }} />
                <Text>Tại: {pkg.facility}</Text>
              </Space>

              <div>
                <Text strong style={{ marginBottom: "8px", display: "block" }}>
                  Bao gồm các dịch vụ:
                </Text>
                <Row gutter={[8, 4]}>
                  {pkg.services.slice(0, 4).map((service, index) => (
                    <Col key={index}>
                      <Tag icon={<CheckCircleOutlined />} color="processing">
                        {service}
                      </Tag>
                    </Col>
                  ))}
                  {pkg.services.length > 4 && (
                    <Col>
                      <Tag color="default">
                        +{pkg.services.length - 4} dịch vụ khác
                      </Tag>
                    </Col>
                  )}
                </Row>
              </div>

              <div>
                <Text strong style={{ marginBottom: "4px", display: "block" }}>
                  Phù hợp cho:
                </Text>
                <Text style={{ color: "#666" }}>{pkg.forWho.join(", ")}</Text>
              </div>
            </Space>

            <Divider style={{ margin: "16px 0" }} />

            <Row justify="end" gutter={8}>
              <Col>
                <Button
                  size="large"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePackageClick(pkg.id);
                  }}
                  style={{ fontWeight: "500" }}
                >
                  Xem chi tiết
                </Button>
              </Col>
              <Col>
                <Button
                  type="primary"
                  size="large"
                  onClick={(e) => handleBookPackage(e, pkg.id)}
                  style={{
                    backgroundColor: "#45c3d2",
                    borderColor: "#45c3d2",
                    fontWeight: "500",
                  }}
                >
                  Đặt lịch khám
                </Button>
              </Col>
            </Row>
          </div>
        </Col>
      </Row>
    </Card>
  );

  return (
    <div className="package-page">
      {/* Breadcrumb */}
      <div className="container">
        <NavigationBreadcrumb
          items={[
            {
              label: "Trang chủ",
              path: "/",
              icon: <HomeOutlined />,
            },
            {
              label: "Gói khám",
            },
          ]}
        />
      </div>

      {/* Search Section */}
      <div className="package-search-section">
        <div className="container">
          <Row gutter={[16, 16]} justify="center">
            <Col xs={24} sm={12} md={8}>
              <Input.Search
                placeholder="Tìm kiếm gói khám..."
                size="large"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onSearch={handleSearch}
                enterButton="Tìm kiếm"
                style={{ borderRadius: "8px" }}
              />
            </Col>
            <Col xs={12} sm={6} md={3}>
              <Select
                value={selectedCategory}
                onChange={handleCategoryChange}
                style={{ width: "100%" }}
                size="large"
                placeholder="Loại gói"
              >
                <Option value="all">Tất cả</Option>
                <Option value="general">Tổng quát</Option>
                <Option value="cardiology">Tim mạch</Option>
                <Option value="gynecology">Phụ khoa</Option>
                <Option value="premium">Cao cấp</Option>
                <Option value="premarital">Tiền hôn nhân</Option>
                <Option value="pediatric">Nhi khoa</Option>
              </Select>
            </Col>
            <Col xs={12} sm={6} md={3}>
              <Select
                value={selectedPriceRange}
                onChange={handlePriceRangeChange}
                style={{ width: "100%" }}
                size="large"
                placeholder="Mức giá"
              >
                <Option value="all">Tất cả</Option>
                <Option value="under2m">Dưới 2 triệu</Option>
                <Option value="2m-5m">2-5 triệu</Option>
                <Option value="over5m">Trên 5 triệu</Option>
              </Select>
            </Col>
          </Row>
        </div>
      </div>

      {/* Package List */}
      <div className="package-list-section">
        <div className="container">
          <div className="results-header">
            <Title level={3}>
              Danh sách gói khám ({filteredPackages.length})
            </Title>
          </div>

          <div className="package-list">
            {filteredPackages
              .slice((currentPage - 1) * 4, currentPage * 4)
              .map((pkg) => (
                <PackageCard key={pkg.id} package={pkg} />
              ))}
          </div>

          {/* Pagination */}
          {filteredPackages.length > 4 && (
            <div style={{ textAlign: "center", marginTop: "32px" }}>
              <Pagination
                current={currentPage}
                total={filteredPackages.length}
                pageSize={4}
                onChange={setCurrentPage}
                showSizeChanger={false}
                showQuickJumper
                showTotal={(total, range) =>
                  `${range[0]}-${range[1]} của ${total} gói khám`
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoiKham;
