import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useClinics } from "../../../hooks/useClinics";
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
  Spin,
  Empty,
} from "antd";
import {
  EnvironmentOutlined,
  PhoneOutlined,
  SearchOutlined,
  MedicineBoxOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import NavigationBreadcrumb from "../../../components/Breadcrumb/NavigationBreadcrumb";
import "./CoSoYTe.css";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const CoSoYTe = () => {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch clinics data
  const {
    data: clinicsData,
    isLoading,
    error,
  } = useClinics(
    currentPage,
    5, // pageSize
    searchTerm,
    "all", // selectedType - always "all" since we removed the filter
    selectedLocation
  );

  const facilities = clinicsData?.data?.clinics || [];
  const total = clinicsData?.data?.pagination?.total || 0;

  const handleSearch = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleLocationChange = (value) => {
    setSelectedLocation(value);
    setCurrentPage(1);
  };

  const handleFacilityClick = (facilityId) => {
    // Navigate to facility detail or doctors in this facility
    console.log("Navigate to facility detail:", facilityId);
  };

  const FacilityCard = ({ facility }) => (
    <Card
      className="facility-card"
      hoverable
      onClick={() => handleFacilityClick(facility.id)}
      style={{
        marginBottom: "16px",
        borderRadius: "12px",
        border: "1px solid #f0f0f0",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
      }}
    >
      <Row gutter={16} align="middle">
        <Col flex="100px">
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #52c41a 0%, #389e0d 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "32px",
              color: "white",
            }}
          >
            <EnvironmentOutlined />
          </div>
        </Col>
        <Col flex="auto">
          <div className="facility-info">
            <Title level={4} style={{ margin: "0 0 8px 0", color: "#1890ff" }}>
              {facility.name}
            </Title>
            <Paragraph style={{ color: "#666", margin: "8px 0" }}>
              {facility.description}
            </Paragraph>
            <Space direction="vertical" size="small" style={{ width: "100%" }}>
              <Space>
                <EnvironmentOutlined style={{ color: "#45c3d2" }} />
                <Text>{facility.address}</Text>
              </Space>
              <Space>
                <PhoneOutlined style={{ color: "#45c3d2" }} />
                <Text>{facility.phone}</Text>
              </Space>
              <Space wrap>
                {facility.specialties &&
                  Array.isArray(facility.specialties) &&
                  facility.specialties.slice(0, 3).map((specialty, index) => (
                    <Tag key={index} color="green-inverse">
                      {specialty}
                    </Tag>
                  ))}
                {facility.specialties &&
                  Array.isArray(facility.specialties) &&
                  facility.specialties.length > 3 && (
                    <Tag color="default">
                      +{facility.specialties.length - 3} khác
                    </Tag>
                  )}
              </Space>
            </Space>
          </div>
        </Col>
        <Col flex="120px">
          <Space direction="vertical" size="small" style={{ width: "100%" }}>
            <Button
              type="primary"
              size="large"
              block
              style={{
                backgroundColor: "#45c3d2",
                borderColor: "#45c3d2",
                fontWeight: "500",
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleFacilityClick(facility.id);
              }}
            >
              Xem chi tiết
            </Button>
            <Button
              size="large"
              block
              style={{ fontWeight: "500" }}
              onClick={(e) => {
                e.stopPropagation();
                navigate(
                  `/danh-sach-bac-si?facility=${encodeURIComponent(
                    facility.name
                  )}`
                );
              }}
            >
              Xem bác sĩ
            </Button>
          </Space>
        </Col>
      </Row>
    </Card>
  );

  return (
    <div className="facility-page">
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
              label: "Cơ sở y tế",
            },
          ]}
        />
      </div>

      {/* Search Section */}
      <div className="facility-search-section">
        <div className="container">
          <Row gutter={[16, 16]} justify="center">
            <Col xs={24} sm={18} md={12} lg={10}>
              <Space.Compact style={{ width: "100%" }}>
                <Input
                  placeholder="Tìm kiếm cơ sở y tế..."
                  size="large"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onPressEnter={() => handleSearch(searchTerm)}
                  style={{ borderRadius: "8px 0 0 8px" }}
                />
                <Button
                  type="primary"
                  size="large"
                  onClick={() => handleSearch(searchTerm)}
                  style={{ borderRadius: "0 8px 8px 0" }}
                >
                  Tìm kiếm
                </Button>
              </Space.Compact>
            </Col>
            <Col xs={24} sm={6} md={4}>
              <Select
                value={selectedLocation}
                onChange={handleLocationChange}
                style={{ width: "100%" }}
                size="large"
                placeholder="Khu vực"
              >
                <Option value="all">Tất cả</Option>
                <Option value="TP.HCM">TP.HCM</Option>
                <Option value="Hà Nội">Hà Nội</Option>
              </Select>
            </Col>
          </Row>
        </div>
      </div>

      {/* Facility List */}
      <div className="facility-list-section">
        <div className="container">
          <div className="results-header">
            <Title level={3}>Danh sách cơ sở y tế ({total})</Title>
          </div>

          {isLoading ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <Spin size="large" />
              <div style={{ marginTop: "16px", color: "#666" }}>
                Đang tải danh sách cơ sở y tế...
              </div>
            </div>
          ) : error ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ color: "#ff4d4f", fontSize: "16px" }}>
                Có lỗi khi tải dữ liệu. Vui lòng thử lại sau.
              </div>
            </div>
          ) : facilities.length === 0 ? (
            <Empty
              description="Không tìm thấy cơ sở y tế nào"
              style={{ margin: "60px 0" }}
            />
          ) : (
            <>
              <div className="facility-list">
                {facilities.map((facility) => (
                  <FacilityCard key={facility.id} facility={facility} />
                ))}
              </div>

              {/* Pagination */}
              {total > 5 && (
                <div style={{ textAlign: "center", marginTop: "32px" }}>
                  <Pagination
                    current={currentPage}
                    total={total}
                    pageSize={5}
                    onChange={setCurrentPage}
                    showSizeChanger={false}
                    showQuickJumper
                    showTotal={(total, range) =>
                      `${range[0]}-${range[1]} của ${total} cơ sở`
                    }
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoSoYTe;
