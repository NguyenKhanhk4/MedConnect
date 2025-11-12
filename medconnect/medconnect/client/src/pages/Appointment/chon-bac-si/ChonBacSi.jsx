import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import dayjs from "dayjs";
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
  Avatar,
  Rate,
  Tag,
  Space,
  Modal,
} from "antd";
import {
  SearchOutlined,
  UserOutlined,
  StarOutlined,
  CalendarOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  HomeOutlined,
  EyeOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import NavigationBreadcrumb from "../../../components/Breadcrumb/NavigationBreadcrumb";
import { api } from "../../../lib/api";
import "./ChonBacSi.css";

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

const ChonBacSi = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [specialization, setSpecialization] = useState(null);
  
  // Modal state for viewing reviews
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewDoctor, setReviewDoctor] = useState(null);
  const [doctorReviews, setDoctorReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsPagination, setReviewsPagination] = useState(null);

  useEffect(() => {
    if (location.state?.specialization) {
      setSpecialization(location.state.specialization);
      fetchDoctors(location.state.specialization._id);
    } else {
      navigate("/dat-lich/chon-chuyen-khoa");
    }
  }, [location.state]);

  useEffect(() => {
    // Filter doctors based on search term
    if (searchTerm.trim() === "") {
      setFilteredDoctors(doctors);
    } else {
      const filtered = doctors.filter(
        (doctor) =>
          (doctor.userId?.fullName || doctor.fullName)
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (doctor.bio &&
            doctor.bio.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredDoctors(filtered);
    }
  }, [searchTerm, doctors]);

  const fetchDoctors = async (specializationId) => {
    try {
      setLoading(true);

      // Mock data for testing
      const mockDoctors = [
        {
          _id: "1",
          fullName: "Đặng Thị Hương",
          avatarUrl: null,
          yearsExperience: 27,
          bio: "Bác sĩ Đặng Thị Hương chuyên về Da liễu.",
          ratingAvg: 3.5,
          ratingCount: 508,
          specializationIds: [{ name: "Da liễu" }],
        },
        {
          _id: "2",
          fullName: "Tạ Thu Thảo",
          avatarUrl: null,
          yearsExperience: 28,
          bio: "Bác sĩ Tạ Thu Thảo chuyên về Da liễu.",
          ratingAvg: 3.5,
          ratingCount: 619,
          specializationIds: [{ name: "Da liễu" }],
        },
      ];

      // Use mock data for now
      setDoctors(mockDoctors);
      setFilteredDoctors(mockDoctors);

      // Try to fetch from API as well
      try {
        const response = await api.get(
          `/api/doctors?specialization=${specializationId}`
        );

        if (
          response.success &&
          response.data.doctors &&
          response.data.doctors.length > 0
        ) {
          setDoctors(response.data.doctors);
          setFilteredDoctors(response.data.doctors);
        }
      } catch (apiError) {
        // API not available, using mock data
      }
    } catch (error) {
      message.error("Có lỗi xảy ra khi tải danh sách bác sĩ");
    } finally {
      setLoading(false);
    }
  };

  const handleDoctorSelect = (doctor) => {
    navigate("/dat-lich/chon-thoi-gian", {
      state: {
        doctor,
        specialization,
      },
    });
  };

  const handleBackToSpecialization = () => {
    navigate("/dat-lich/chon-chuyen-khoa");
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
  };

  const formatExperience = (years) => {
    if (!years) return "Chưa có thông tin";
    return `${years} năm kinh nghiệm`;
  };

  const getSpecializationNames = (specializationIds) => {
    if (!specializationIds || specializationIds.length === 0) return [];
    return specializationIds.map((spec) => spec.name).join(", ");
  };

  // Fetch doctor reviews
  const fetchDoctorReviews = async (doctorId) => {
    try {
      setReviewsLoading(true);
      const response = await api.get(
        `/api/doctors/${doctorId}/reviews?limit=10&page=1`
      );
      
      // Handle different response structures
      let reviews = [];
      let pagination = null;
      
      if (response?.success || response?.data?.success) {
        // Response structure: { success: true, data: { reviews: [...], pagination: {...} } }
        if (response?.data?.reviews) {
          reviews = response.data.reviews;
          pagination = response.data.pagination;
        } else if (response?.reviews) {
          reviews = response.reviews;
          pagination = response.pagination;
        } else if (response?.data?.data?.reviews) {
          reviews = response.data.data.reviews;
          pagination = response.data.data.pagination;
        }
      } else if (response?.reviews) {
        // Direct reviews in response
        reviews = response.reviews;
        pagination = response.pagination;
      }
      
      setDoctorReviews(reviews);
      setReviewsPagination(pagination);
    } catch (error) {
      message.error("Không thể tải đánh giá. Vui lòng thử lại.");
      setDoctorReviews([]);
      setReviewsPagination(null);
    } finally {
      setReviewsLoading(false);
    }
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
        <Text style={{ marginLeft: 16 }}>Đang tải danh sách bác sĩ...</Text>
      </div>
    );
  }

  return (
    <div className="doctor-selection-page">
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
              path: "/dat-lich/chon-chuyen-khoa",
            },
            {
              label: specialization?.name || "Chuyên khoa",
            },
          ]}
        />

        {/* Header */}
        <div className="page-header">
          <div className="header-content">
            <div className="header-left">
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={handleBackToSpecialization}
                style={{ marginRight: 16 }}
              >
                Quay lại
              </Button>
              <div>
                <Title level={2}>Chọn bác sĩ</Title>
                <Paragraph>
                  Chuyên khoa: <Text strong>{specialization?.name}</Text>
                </Paragraph>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="search-section">
          <Search
            placeholder="Tìm kiếm bác sĩ..."
            allowClear
            size="large"
            prefix={<SearchOutlined />}
            onSearch={handleSearch}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ maxWidth: 500 }}
          />
        </div>

        {/* Results Count */}
        {filteredDoctors.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <Text type="secondary" style={{ fontSize: "14px" }}>
              Hiển thị <Text strong style={{ color: "#262626" }}>{filteredDoctors.length}</Text> bác sĩ
            </Text>
          </div>
        )}

        {/* Doctors Grid */}
        <div className="doctors-grid">
          {filteredDoctors.length === 0 ? (
            <Empty
              description="Không tìm thấy bác sĩ nào"
              style={{ margin: "50px 0" }}
            />
          ) : (
            <Row gutter={[24, 24]}>
              {filteredDoctors.map((doctor) => {
                const fullName = doctor.userId?.fullName || doctor.fullName;
                const displayName = fullName?.startsWith("BS.") ? fullName : `BS. ${fullName}`;
                const specializationName = doctor.specializationIds?.[0]?.name || doctor.specializationIds?.[0] || "";
                
                return (
                  <Col xs={24} sm={12} lg={8} key={doctor._id}>
                    <Card
                      className="doctor-card-modern"
                      hoverable
                      cover={
                        <div className="doctor-image-container">
                          {doctor.avatarUrl ? (
                            <img
                              alt={displayName}
                              src={doctor.avatarUrl}
                              className="doctor-image"
                              onError={(e) => {
                                e.target.src = "/placeholder.svg";
                              }}
                            />
                          ) : (
                            <div style={{
                              width: "100%",
                              height: "100%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}>
                              <Avatar
                                size={160}
                                icon={<UserOutlined />}
                                style={{
                                  backgroundColor: "#1890ff",
                                  border: "4px solid #fff",
                                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)"
                                }}
                              />
                            </div>
                          )}
                        </div>
                      }
                      actions={[
                        <Button
                          type="primary"
                          block
                          onClick={() => handleDoctorSelect(doctor)}
                          className="doctor-book-button"
                        >
                          Đặt lịch khám
                        </Button>,
                      ]}
                    >
                      <div className="doctor-card-content">
                        {/* Name */}
                        <div style={{ marginBottom: 10 }}>
                          <Title level={4} className="doctor-name-modern">
                            {displayName}
                          </Title>
                        </div>

                        {/* Specialty and Education Level Tags */}
                        <div style={{ marginBottom: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {specializationName && (
                            <Tag
                              style={{
                                backgroundColor: "#e6f4ff",
                                borderColor: "#1890ff",
                                color: "#1890ff",
                                borderRadius: "6px",
                                padding: "4px 12px",
                                fontSize: "14px",
                                fontWeight: 500,
                                border: "1px solid",
                                margin: 0,
                              }}
                            >
                              {specializationName}
                            </Tag>
                          )}
                          {doctor.educationLevel && (
                            <Tag
                              style={{
                                backgroundColor: "#e6fffb",
                                borderColor: "#13c2c2",
                                color: "#13c2c2",
                                borderRadius: "6px",
                                padding: "4px 12px",
                                fontSize: "14px",
                                fontWeight: 500,
                                border: "1px solid",
                                margin: 0,
                              }}
                            >
                              {doctor.educationLevel}
                            </Tag>
                          )}
                        </div>

                        {/* Experience and Rating Row */}
                        <div style={{ 
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "space-between",
                          marginBottom: 10,
                          gap: 12
                        }}>
                          {doctor.yearsExperience && (
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <ClockCircleOutlined style={{ color: "#ff7a00", fontSize: "16px" }} />
                              <Text style={{ fontSize: "15px", fontWeight: 500, color: "#ff7a00" }}>
                                {doctor.yearsExperience} năm
                              </Text>
                            </div>
                          )}
                          <Rate
                            disabled
                            value={doctor.ratingAvg || 0}
                            style={{ fontSize: 16 }}
                          />
                        </div>

                        {/* Rating Text */}
                        {doctor.ratingAvg > 0 && (
                          <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <Text style={{ fontSize: "14px", color: "#8c8c8c" }}>
                              <Text strong style={{ color: "#262626", fontSize: "14px" }}>
                                {doctor.ratingAvg.toFixed(1)}
                              </Text>{" "}
                              ({doctor.ratingCount || 0} đánh giá)
                            </Text>
                            {doctor.ratingCount > 0 && (
                              <Button
                                type="link"
                                size="small"
                                icon={<EyeOutlined />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReviewDoctor(doctor);
                                  setShowReviewModal(true);
                                  fetchDoctorReviews(doctor._id);
                                }}
                                style={{ 
                                  padding: 0, 
                                  height: 'auto', 
                                  fontSize: "14px",
                                  color: "#1890ff"
                                }}
                              >
                                Xem đánh giá
                              </Button>
                            )}
                          </div>
                        )}

                        {/* Description */}
                        {doctor.bio && (
                          <Paragraph
                            className="doctor-bio-modern"
                            ellipsis={{ rows: 2 }}
                            style={{ marginBottom: 0 }}
                          >
                            {doctor.bio}
                          </Paragraph>
                        )}
                      </div>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          )}
        </div>

        {/* Help Text */}
        <div className="help-section">
          <Card>
            <Title level={4}>Hướng dẫn</Title>
            <ul>
              <li>Chọn bác sĩ phù hợp với nhu cầu khám chữa bệnh của bạn</li>
              <li>
                Xem thông tin chi tiết về kinh nghiệm và đánh giá của bác sĩ
              </li>
              <li>
                Sau khi chọn bác sĩ, bạn sẽ được chuyển đến trang chọn thời gian
                khám
              </li>
              <li>
                Bạn có thể chọn khám online hoặc offline tùy theo sở thích
              </li>
            </ul>
          </Card>
        </div>
      </div>

      {/* Modal for viewing doctor reviews */}
      <Modal
        title={
          <Space>
            <UserOutlined />
            <span>Đánh giá của {reviewDoctor?.fullName || reviewDoctor?.userId?.fullName || "Bác sĩ"}</span>
          </Space>
        }
        open={showReviewModal}
        onCancel={() => {
          setShowReviewModal(false);
          setReviewDoctor(null);
          setDoctorReviews([]);
          setReviewsPagination(null);
        }}
        footer={null}
        width={800}
      >
        {reviewsLoading ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Spin size="large" />
            <Paragraph style={{ marginTop: 16 }}>
              Đang tải đánh giá...
            </Paragraph>
          </div>
        ) : doctorReviews && doctorReviews.length > 0 ? (
          <div style={{ maxHeight: "600px", overflowY: "auto" }}>
            {doctorReviews.map((review) => (
              <Card
                key={review._id}
                style={{ marginBottom: 16 }}
                size="small"
              >
                <Space direction="vertical" style={{ width: "100%" }} size="small">
                  <Space>
                    <Avatar
                      size="small"
                      src={review.patient?.avatarUrl}
                      icon={<UserOutlined />}
                    />
                    <Text strong>
                      {review.isAnonymous
                        ? "Bệnh nhân"
                        : review.patient?.fullName || "Bệnh nhân"}
                    </Text>
                    <Rate
                      disabled
                      value={review.rating}
                      style={{ fontSize: 12 }}
                    />
                    <Text type="secondary" style={{ fontSize: "12px" }}>
                      {dayjs(review.createdAt).format("DD/MM/YYYY")}
                    </Text>
                  </Space>
                  {review.comment && (
                    <Paragraph style={{ marginBottom: 0, marginTop: 8 }}>
                      {review.comment}
                    </Paragraph>
                  )}
                  {review.tags && review.tags.length > 0 && (
                    <Space wrap>
                      {review.tags.map((tag, index) => (
                        <Tag key={index} color="blue">
                          {tag}
                        </Tag>
                      ))}
                    </Space>
                  )}
                  {review.doctorResponse && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: 12,
                        background: "#f5f5f5",
                        borderRadius: 4,
                      }}
                    >
                      <Text strong style={{ color: "#1890ff" }}>
                        Phản hồi từ bác sĩ:
                      </Text>
                      <Paragraph style={{ marginBottom: 0, marginTop: 4 }}>
                        {review.doctorResponse}
                      </Paragraph>
                      {review.doctorResponseAt && (
                        <Text type="secondary" style={{ fontSize: "12px" }}>
                          {dayjs(review.doctorResponseAt).format("DD/MM/YYYY HH:mm")}
                        </Text>
                      )}
                    </div>
                  )}
                </Space>
              </Card>
            ))}
            {reviewsPagination && reviewsPagination.total > reviewsPagination.limit && (
              <div style={{ textAlign: "center", marginTop: 16 }}>
                <Text type="secondary">
                  Hiển thị {doctorReviews.length} / {reviewsPagination.total} đánh giá
                </Text>
              </div>
            )}
          </div>
        ) : (
          <Empty description="Chưa có đánh giá nào" />
        )}
      </Modal>
    </div>
  );
};

export default ChonBacSi;
