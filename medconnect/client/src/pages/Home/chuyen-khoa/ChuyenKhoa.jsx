import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import {
  Row,
  Col,
  Card,
  Typography,
  Space,
  Button,
  Input,
  Select,
  Tag,
  Spin,
  message,
  Empty,
} from "antd";
import {
  MedicineBoxOutlined,
  UserOutlined,
  EnvironmentOutlined,
  SearchOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import NavigationBreadcrumb from "../../../components/Breadcrumb/NavigationBreadcrumb";
import { api } from "../../../lib/api";
import "./ChuyenKhoa.css";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const ChuyenKhoa = () => {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [specializations, setSpecializations] = useState([]);
  const [totalSpecializations, setTotalSpecializations] = useState(0);

  // Fetch specializations from API
  const fetchSpecializations = async () => {
    try {
      setLoading(true);

      const params = {
        page: currentPage,
        limit: 6,
      };

      // Add search term if exists
      if (searchTerm) {
        params.search = searchTerm;
      }

      // Add category filter if not "all"
      if (selectedCategory !== "all") {
        params.category = selectedCategory;
      }

      const response = await api.getAllSpecializations(params);

      if (response.success) {
        setSpecializations(response.data.specializations || response.data);
        setTotalSpecializations(
          response.data.pagination?.total || response.data.length
        );
      } else {
        message.error("Không thể tải danh sách chuyên khoa");
      }
    } catch (error) {
      console.error("Error fetching specializations:", error);
      message.error("Có lỗi xảy ra khi tải danh sách chuyên khoa");
    } finally {
      setLoading(false);
    }
  };

  // Fetch specializations when component mounts or dependencies change
  useEffect(() => {
    fetchSpecializations();
  }, [currentPage, searchTerm, selectedCategory]);

  // Specializations are already filtered by API, so we use them directly
  const filteredSpecializations = specializations;

  const handleSearch = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleCategoryChange = (value) => {
    setSelectedCategory(value);
    setCurrentPage(1);
  };

  const handleSpecializationClick = (specId) => {
    // Navigate to doctors filtered by specialization
    navigate(`/danh-sach-bac-si?specialty=${encodeURIComponent(specId)}`);
  };

  const SpecializationCard = ({ specialization }) => (
    <Card
      className="specialization-card"
      hoverable
      onClick={() => handleSpecializationClick(specialization._id)}
      style={{
        borderRadius: "12px",
        border: "1px solid #f0f0f0",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
        cursor: "pointer",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
      bodyStyle={{
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        height: "100%",
      }}
    >
      <div
        style={{
          width: "160px",
          height: "160px",
          borderRadius: "16px",
          background: "linear-gradient(135deg, #45c3d2 0%, #3ba8b8 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "64px",
          color: "white",
          marginBottom: "24px",
          overflow: "hidden",
        }}
      >
        {specialization.avatar ? (
          <img
            src={specialization.avatar}
            alt={specialization.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              borderRadius: "12px",
            }}
          />
        ) : (
          <MedicineBoxOutlined />
        )}
      </div>

      <Title level={4} style={{ margin: "0 0 16px 0", color: "#262626" }}>
        {specialization.name}
      </Title>

      {specialization.doctorCount > 0 && (
        <div style={{ marginTop: "auto" }}>
          <Tag color="blue" style={{ borderRadius: "12px" }}>
            <UserOutlined /> {specialization.doctorCount} bác sĩ
          </Tag>
        </div>
      )}
    </Card>
  );

  // PropTypes validation for SpecializationCard
  SpecializationCard.propTypes = {
    specialization: PropTypes.shape({
      _id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      avatar: PropTypes.string,
      doctorCount: PropTypes.number,
    }).isRequired,
  };

  return (
    <div className="specialization-page">
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
              label: "Chuyên khoa",
            },
          ]}
        />
      </div>

      {/* Search Section */}
      <div className="specialization-search-section">
        <div className="container">
          <Row gutter={[16, 16]} justify="center">
            <Col xs={24} sm={18} md={12} lg={10}>
              <Input.Search
                placeholder="Tìm kiếm chuyên khoa..."
                size="large"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onSearch={handleSearch}
                enterButton="Tìm kiếm"
                style={{ borderRadius: "8px" }}
              />
            </Col>
            <Col xs={24} sm={6} md={4}>
              <Select
                value={selectedCategory}
                onChange={handleCategoryChange}
                style={{ width: "100%" }}
                size="large"
                placeholder="Loại chuyên khoa"
              >
                <Option value="all">Tất cả</Option>
                <Option value="internal">Nội khoa</Option>
                <Option value="external">Ngoại khoa</Option>
                <Option value="surgical">Phẫu thuật</Option>
                <Option value="pediatric">Nhi khoa</Option>
              </Select>
            </Col>
          </Row>
        </div>
      </div>

      {/* Specialization List */}
      <div className="specialization-list-section">
        <div className="container">
          <div className="results-header">
            <Title level={3}>
              Danh sách chuyên khoa ({filteredSpecializations.length})
            </Title>
          </div>

          <div className="specialization-grid">
            {loading ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <Spin size="large" />
                <Text style={{ marginLeft: 16 }}>
                  Đang tải danh sách chuyên khoa...
                </Text>
              </div>
            ) : filteredSpecializations.length === 0 ? (
              <Empty
                description="Không tìm thấy chuyên khoa nào"
                style={{ margin: "50px 0" }}
              />
            ) : (
              <div className="specialization-grid-container">
                {filteredSpecializations.map((specialization) => (
                  <div
                    key={specialization._id}
                    className="specialization-grid-item"
                  >
                    <SpecializationCard specialization={specialization} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChuyenKhoa;
