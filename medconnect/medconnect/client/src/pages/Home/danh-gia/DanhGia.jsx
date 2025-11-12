import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  Typography,
  Avatar,
  Rate,
  Button,
  Space,
  Row,
  Col,
  Divider,
  Tag,
  Spin,
  Empty,
  message,
  Pagination,
  Input,
  Select,
} from "antd";
import {
  UserOutlined,
  StarOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  MedicineBoxOutlined,
  ArrowLeftOutlined,
  SearchOutlined,
  FilterOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import NavigationBreadcrumb from "../../../components/Breadcrumb/NavigationBreadcrumb";
import { api } from "../../../lib/api";
import "./DanhGia.css";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const DanhGia = () => {
  const { doctorId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [doctor, setDoctor] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalReviews, setTotalReviews] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  // Fetch doctor information and reviews
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: currentPage,
          limit: 10,
          search: searchTerm,
          rating: ratingFilter,
          sort: sortBy,
        });

        const response = await api.get(
          `/api/doctors/${doctorId}/reviews?${params}`
        );
        setDoctor(response.data.doctor);
        setReviews(response.data.reviews || []);
        setTotalReviews(response.data.pagination?.total || 0);
      } catch (error) {
        console.error("❌ Error fetching data:", error);
        message.error("Không thể tải thông tin");
      } finally {
        setLoading(false);
      }
    };

    if (doctorId) {
      fetchData();
    }
  }, [doctorId, currentPage, searchTerm, ratingFilter, sortBy]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (value) => {
    setRatingFilter(value);
    setCurrentPage(1);
  };

  const handleSortChange = (value) => {
    setSortBy(value);
    setCurrentPage(1);
  };

  const getBreadcrumbItems = () => {
    const items = [
      { label: "Trang chủ", path: "/", icon: <HomeOutlined /> },
      { label: "Bác sĩ", path: "/danh-sach-bac-si" },
    ];

    if (doctor) {
      items.push({
        label: doctor.fullName,
        path: `/bac-si/${doctor._id}`,
      });
    }

    items.push({ label: "Review" });

    return items;
  };

  const getRatingDistribution = () => {
    if (!doctor || !doctor.ratingDistribution) return [];

    const distribution = [];
    for (let i = 5; i >= 1; i--) {
      const count = doctor.ratingDistribution[i] || 0;
      const percentage =
        doctor.ratingCount > 0 ? (count / doctor.ratingCount) * 100 : 0;
      distribution.push({
        rating: i,
        count,
        percentage,
      });
    }
    return distribution;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading && !doctor) {
    return (
      <div className="doctor-reviews-page">
        <div className="container">
          <div style={{ textAlign: "center", padding: "50px 0" }}>
            <Spin size="large" />
            <Text style={{ marginLeft: 16 }}>Đang tải thông tin...</Text>
          </div>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="doctor-reviews-page">
        <div className="container">
          <Empty description="Không tìm thấy thông tin bác sĩ" />
        </div>
      </div>
    );
  }

  return (
    <div className="doctor-reviews-page">
      {/* Breadcrumb */}
      <div className="container">
        <NavigationBreadcrumb items={getBreadcrumbItems()} />
      </div>

      {/* Doctor Header */}
      <div className="doctor-header-section">
        <div className="container">
          <Card className="doctor-header-card">
            <Row gutter={24} align="middle">
              <Col xs={24} md={6}>
                <div className="doctor-avatar-section">
                  <Avatar
                    size={120}
                    src={
                      doctor.avatarUrl &&
                      !doctor.avatarUrl.includes("picsum.photos")
                        ? doctor.avatarUrl
                        : undefined
                    }
                    icon={<UserOutlined />}
                    className="doctor-avatar"
                  />
                </div>
              </Col>
              <Col xs={24} md={12}>
                <div className="doctor-info">
                  <Title level={2} className="doctor-name">
                    {doctor.fullName}
                  </Title>
                  <Text className="doctor-specialization">
                    {doctor.specializationIds?.[0]?.name || "Chuyên khoa"}
                  </Text>
                  <div className="doctor-rating">
                    <Rate
                      disabled
                      defaultValue={doctor.ratingAvg || 0}
                      style={{ fontSize: "18px" }}
                    />
                    <Text className="rating-text">
                      {doctor.ratingAvg?.toFixed(1) || "0.0"} (
                      {doctor.ratingCount || 0} đánh giá)
                    </Text>
                  </div>
                  <div className="doctor-location">
                    <EnvironmentOutlined />
                    <Text>
                      {doctor.clinicDefaultId?.name || "Phòng khám"} -{" "}
                      {doctor.clinicDefaultId?.address || "Địa chỉ"}
                    </Text>
                  </div>
                </div>
              </Col>
              <Col xs={24} md={6}>
                <div className="doctor-actions">
                  <Button
                    type="primary"
                    size="large"
                    block
                    onClick={() =>
                      navigate(`/dat-lich/chon-thoi-gian`, {
                        state: { doctor },
                      })
                    }
                    className="book-appointment-btn"
                  >
                    Đặt lịch khám
                  </Button>
                  <Button
                    size="large"
                    block
                    onClick={handleBack}
                    className="back-btn"
                  >
                    <ArrowLeftOutlined /> Quay lại
                  </Button>
                </div>
              </Col>
            </Row>
          </Card>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="reviews-section">
        <div className="container">
          <Row gutter={24}>
            {/* Rating Summary */}
            <Col xs={24} lg={8}>
              <Card className="rating-summary-card">
                <Title level={4}>Tổng quan đánh giá</Title>
                <div className="rating-overview">
                  <div className="overall-rating">
                    <div className="rating-number">
                      {doctor.ratingAvg?.toFixed(1) || "0.0"}
                    </div>
                    <div className="rating-stars">
                      <Rate disabled defaultValue={doctor.ratingAvg || 0} />
                    </div>
                    <Text className="rating-count">
                      Dựa trên {doctor.ratingCount || 0} đánh giá
                    </Text>
                  </div>
                </div>

                <Divider />

                <div className="rating-distribution">
                  {getRatingDistribution().map((item) => (
                    <div key={item.rating} className="rating-bar">
                      <Text>{item.rating} sao</Text>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                      <Text>{item.count}</Text>
                    </div>
                  ))}
                </div>
              </Card>
            </Col>

            {/* Reviews List */}
            <Col xs={24} lg={16}>
              <Card className="reviews-list-card">
                <div className="reviews-header">
                  <Title level={4}>Đánh giá bệnh nhân ({totalReviews})</Title>

                  <div className="reviews-filters">
                    <Input.Search
                      placeholder="Tìm kiếm trong đánh giá..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onSearch={handleSearch}
                      style={{ width: 200, marginRight: 8 }}
                    />
                    <Select
                      value={ratingFilter}
                      onChange={handleFilterChange}
                      style={{ width: 120, marginRight: 8 }}
                    >
                      <Option value="all">Tất cả</Option>
                      <Option value="5">5 sao</Option>
                      <Option value="4">4 sao</Option>
                      <Option value="3">3 sao</Option>
                      <Option value="2">2 sao</Option>
                      <Option value="1">1 sao</Option>
                    </Select>
                    <Select
                      value={sortBy}
                      onChange={handleSortChange}
                      style={{ width: 150 }}
                    >
                      <Option value="newest">Mới nhất</Option>
                      <Option value="oldest">Cũ nhất</Option>
                      <Option value="highest">Cao nhất</Option>
                      <Option value="lowest">Thấp nhất</Option>
                    </Select>
                  </div>
                </div>

                <Divider />

                {loading ? (
                  <div style={{ textAlign: "center", padding: "40px 0" }}>
                    <Spin />
                    <Text style={{ marginLeft: 16 }}>Đang tải đánh giá...</Text>
                  </div>
                ) : reviews.length === 0 ? (
                  <Empty description="Chưa có đánh giá nào" />
                ) : (
                  <div className="reviews-list">
                    {reviews.map((review) => (
                      <div key={review._id} className="review-item">
                        <div className="review-header">
                          <div className="reviewer-info">
                            <Avatar
                              size={40}
                              src={review.patient?.avatarUrl}
                              icon={<UserOutlined />}
                            />
                            <div className="reviewer-details">
                              <Text strong className="reviewer-name">
                                {review.patient?.fullName || "Bệnh nhân"}
                              </Text>
                              <Text type="secondary" className="review-date">
                                {formatDate(review.createdAt)}
                              </Text>
                            </div>
                          </div>
                          <div className="review-rating">
                            <Rate disabled defaultValue={review.rating} />
                          </div>
                        </div>

                        {review.comment && (
                          <div className="review-comment">
                            <Paragraph className="review-comment">
                              {review.comment}
                            </Paragraph>
                          </div>
                        )}

                        {review.tags && review.tags.length > 0 && (
                          <div className="review-tags">
                            {review.tags.map((tag, index) => (
                              <Tag key={index} color="blue">
                                {tag}
                              </Tag>
                            ))}
                          </div>
                        )}

                        {review.doctorResponse && (
                          <div className="doctor-response">
                            <Divider />
                            <div className="response-header">
                              <Text strong style={{ color: "#45c3d2" }}>
                                Phản hồi từ bác sĩ
                              </Text>
                              {review.doctorResponseAt && (
                                <Text
                                  type="secondary"
                                  className="response-date"
                                >
                                  {formatDate(review.doctorResponseAt)}
                                </Text>
                              )}
                            </div>
                            <Paragraph className="response-content">
                              {review.doctorResponse}
                            </Paragraph>
                          </div>
                        )}

                        <div className="review-meta">
                          <Space>
                            {review.verified && (
                              <Tag color="green" size="small">
                                ✓ Đã xác minh
                              </Tag>
                            )}
                            {review.helpfulCount > 0 && (
                              <Text type="secondary" className="helpful-count">
                                {review.helpfulCount} người thấy hữu ích
                              </Text>
                            )}
                          </Space>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {totalReviews > 10 && (
                  <div className="reviews-pagination">
                    <Pagination
                      current={currentPage}
                      total={totalReviews}
                      pageSize={10}
                      onChange={setCurrentPage}
                      showSizeChanger={false}
                      showQuickJumper
                      showTotal={(total, range) =>
                        `${range[0]}-${range[1]} của ${total} đánh giá`
                      }
                    />
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        </div>
      </div>
    </div>
  );
};

export default DanhGia;
