import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Row,
  Col,
  Card,
  Typography,
  Button,
  Spin,
  message,
  Input,
  Empty,
} from "antd";
import {
  SearchOutlined,
  MedicineBoxOutlined,
  ArrowRightOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import NavigationBreadcrumb from "../../../components/Breadcrumb/NavigationBreadcrumb";
import { api } from "../../../lib/api";
import "./ChonChuyenKhoa.css";

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

const ChonChuyenKhoa = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [specializations, setSpecializations] = useState([]);
  const [filteredSpecializations, setFilteredSpecializations] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchSpecializations();
  }, []);

  useEffect(() => {
    // Filter specializations based on search term
    if (searchTerm.trim() === "") {
      setFilteredSpecializations(specializations);
    } else {
      const filtered = specializations.filter(
        (spec) =>
          spec.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (spec.description &&
            spec.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredSpecializations(filtered);
    }
  }, [searchTerm, specializations]);

  const fetchSpecializations = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/specializations");

      if (response.success) {
        setSpecializations(response.data);
        setFilteredSpecializations(response.data);
      } else {
        message.error("Không thể tải danh sách chuyên khoa");
      }
    } catch (error) {
      message.error("Có lỗi xảy ra khi tải danh sách chuyên khoa");
    } finally {
      setLoading(false);
    }
  };

  const handleSpecializationSelect = (specialization) => {
    navigate("/dat-lich/chon-bac-si", {
      state: { specialization },
    });
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "400px",
        }}
      >
        <Spin size="large" />
        <Text style={{ marginLeft: 16 }}>
          Đang tải danh sách chuyên khoa...
        </Text>
      </div>
    );
  }

  return (
    <div className="specialization-selection-page">
      <div className="container">
        {/* Breadcrumb */}
        <NavigationBreadcrumb
          items={[
            {
              label: "Trang chủ",
              path: "/",
              icon: <HomeOutlined />,
            },
            {
              label: "Đặt lịch khám",
              path: "/dat-lich",
            },
            {
              label: "Chọn chuyên khoa",
            },
          ]}
        />

        {/* Header */}
        <div className="page-header">
          <Title level={2}>Chọn chuyên khoa</Title>
          <Paragraph>
            Vui lòng chọn chuyên khoa phù hợp với tình trạng sức khỏe của bạn
          </Paragraph>
        </div>

        {/* Search */}
        <div className="search-section">
          <Search
            placeholder="Tìm kiếm chuyên khoa..."
            allowClear
            size="large"
            prefix={<SearchOutlined />}
            onSearch={handleSearch}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ maxWidth: 500 }}
          />
        </div>

        {/* Specializations Grid */}
        <div className="specializations-grid">
          {filteredSpecializations.length === 0 ? (
            <Empty
              description="Không tìm thấy chuyên khoa nào"
              style={{ margin: "50px 0" }}
            />
          ) : (
            <Row gutter={[24, 24]}>
              {filteredSpecializations.map((specialization) => (
                <Col xs={24} sm={12} lg={8} xl={6} key={specialization._id}>
                  <Card
                    hoverable
                    className="specialization-card"
                    onClick={() => handleSpecializationSelect(specialization)}
                    actions={[
                      <Button
                        type="primary"
                        icon={<ArrowRightOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSpecializationSelect(specialization);
                        }}
                      >
                        Chọn
                      </Button>,
                    ]}
                  >
                    <div className="specialization-content">
                      <div className="specialization-icon">
                        {specialization.avatar ? (
                          <img
                            src={specialization.avatar}
                            alt={specialization.name}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "contain",
                              borderRadius: "8px",
                            }}
                          />
                        ) : (
                          <MedicineBoxOutlined />
                        )}
                      </div>
                      <Title level={4} className="specialization-name">
                        {specialization.name}
                      </Title>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </div>

        {/* Help Text */}
        <div className="help-section">
          <Card>
            <Title level={4}>Hướng dẫn</Title>
            <ul>
              <li>Chọn chuyên khoa phù hợp với triệu chứng của bạn</li>
              <li>
                Sau khi chọn chuyên khoa, bạn sẽ thấy danh sách các bác sĩ
                chuyên khoa đó
              </li>
              <li>
                Bạn có thể xem thông tin chi tiết và đánh giá của từng bác sĩ
              </li>
              <li>Sau đó chọn bác sĩ và thời gian khám phù hợp</li>
            </ul>
          </Card>
        </div>
      </div>

      <style jsx>{`
        .specialization-selection-page {
          padding: 12px 0;
          min-height: 100vh;
          background-color: #f5f5f5;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
        }

        .page-header {
          text-align: center;
          margin-bottom: 32px;
          margin-top: 8px;
        }

        .search-section {
          display: flex;
          justify-content: center;
          margin-bottom: 32px;
        }

        .specializations-grid {
          margin-bottom: 32px;
        }

        .specialization-card {
          height: 100%;
          transition: all 0.3s ease;
        }

        .specialization-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        }

        .specialization-content {
          text-align: center;
        }

        .specialization-icon {
          width: 200px;
          height: 200px;
          margin: 0 auto 24px auto;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 96px;
          color: #1890ff;
          border-radius: 24px;
          overflow: hidden;
        }

        .specialization-name {
          margin-bottom: 8px !important;
          color: #262626;
        }

        .specialization-description {
          color: #8c8c8c;
          margin-bottom: 0 !important;
        }

        .help-section {
          margin-top: 32px;
        }

        .help-section ul {
          margin: 0;
          padding-left: 20px;
        }

        .help-section li {
          margin-bottom: 8px;
          color: #595959;
        }
      `}</style>
    </div>
  );
};

export default ChonChuyenKhoa;
