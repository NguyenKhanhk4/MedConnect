import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import {
  Row,
  Col,
  Card,
  Typography,
  Space,
  Avatar,
  Button,
  Tag,
  Rate,
  Divider,
  Input,
  Select,
  Pagination,
  Spin,
  message,
  Empty,
} from "antd";
import {
  UserOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  CalendarOutlined,
  StarOutlined,
  SearchOutlined,
  MedicineBoxOutlined,
  HomeOutlined,
  HeartOutlined,
  HeartFilled,
} from "@ant-design/icons";
import NavigationBreadcrumb from "../../../components/Breadcrumb/NavigationBreadcrumb";
import { api } from "../../../lib/api";
import "./DanhSachBacSi.css";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const DanhSachBacSi = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [currentSpecialization, setCurrentSpecialization] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [facilityFilter, setFacilityFilter] = useState("");
  const [totalDoctors, setTotalDoctors] = useState(0);
  const [urlProcessed, setUrlProcessed] = useState(false);
  const [favoriteDoctorIds, setFavoriteDoctorIds] = useState(new Set());
  const [favoriteLoadingIds, setFavoriteLoadingIds] = useState(new Set());

  // Process URL parameters on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const facility = urlParams.get("facility");
    if (facility) {
      setFacilityFilter(facility);
      console.log("Filtering doctors by facility:", facility);
    }
    setUrlProcessed(true);
  }, [location.search]);

  // Fetch favorite doctors if user is logged in
  useEffect(() => {
    if (user) {
      fetchFavoriteDoctors();
    }
  }, [user]);

  // Fetch doctors from API
  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      // Add pagination
      params.append("page", currentPage);
      params.append("limit", 5);

      // Add search term if exists
      if (searchTerm) {
        params.append("search", searchTerm);
      }

      // Add specialization filter if not "all"
      if (selectedSpecialty !== "all") {
        params.append("specialization", selectedSpecialty);
        console.log("Fetching doctors with specialization:", selectedSpecialty);
      } else {
        console.log("Fetching all doctors (no specialization filter)");
      }

      // Add facility filter if exists
      if (facilityFilter) {
        params.append("facility", facilityFilter);
        console.log("Fetching doctors with facility:", facilityFilter);
      }

      const url = `/api/doctors?${params.toString()}`;
      console.log("🔍 Fetching doctors with URL:", url);
      console.log("🔍 Selected specialty:", selectedSpecialty);
      console.log("🔍 Params:", params.toString());

      const response = await api.get(url);

      if (response.success) {
        console.log("✅ Doctors fetched:", response.data.doctors.length);
        console.log("✅ Doctors data:", response.data.doctors);
        // Log rating data for debugging
        response.data.doctors.forEach((doctor, index) => {
          const fullName = doctor.fullName || doctor.userId?.fullName;
          const ratingAvg = doctor.ratingAvg;
          const ratingCount = doctor.ratingCount;
          const parsedRating = parseFloat(ratingAvg);
          const parsedCount = parseInt(ratingCount) || 0;
          const isValidRating =
            !isNaN(parsedRating) && parsedRating > 0 && parsedRating <= 5;

          console.log(`⭐ Doctor ${index + 1} (${fullName}):`, {
            ratingAvg: ratingAvg,
            ratingCount: ratingCount,
            hasRatingAvg: doctor.hasOwnProperty("ratingAvg"),
            ratingAvgType: typeof ratingAvg,
            parsedRating: parsedRating,
            parsedCount: parsedCount,
            isValidRating: isValidRating,
            willShowStars: isValidRating && parsedCount > 0,
            fullDoctorObject: doctor, // Log full object để debug
          });
        });
        setDoctors(response.data.doctors);
        setTotalDoctors(response.data.pagination.total);
      } else {
        console.log("❌ Failed to fetch doctors:", response);
        message.error("Không thể tải danh sách bác sĩ");
        setDoctors([]);
      }
    } catch (error) {
      console.error("Error fetching doctors:", error);
      message.error("Có lỗi xảy ra khi tải danh sách bác sĩ");
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch favorite doctors if user is logged in
  const fetchFavoriteDoctors = async () => {
    try {
      const response = await api.get("/api/patients/me/favorite-doctors");
      if (response.success && response.data.favoriteDoctors) {
        const favoriteIds = new Set(
          response.data.favoriteDoctors.map((doc) => doc._id)
        );
        setFavoriteDoctorIds(favoriteIds);
      }
    } catch (error) {
      // Silently fail if user is not logged in or endpoint doesn't exist
      console.log("Could not fetch favorite doctors:", error);
    }
  };

  // Toggle favorite status
  const handleToggleFavorite = async (e, doctorId) => {
    e.stopPropagation(); // Prevent card click

    if (!user) {
      message.warning("Vui lòng đăng nhập để sử dụng tính năng này");
      navigate("/dang-nhap", {
        state: {
          from: location.pathname + location.search,
          message: "Vui lòng đăng nhập để thêm bác sĩ vào danh sách ưa thích",
        },
      });
      return;
    }

    // Optimistic update - update UI immediately
    const isFavorite = favoriteDoctorIds.has(doctorId);
    const previousFavoriteIds = new Set(favoriteDoctorIds);

    // Update state immediately for instant feedback
    if (isFavorite) {
      setFavoriteDoctorIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(doctorId);
        return newSet;
      });
    } else {
      setFavoriteDoctorIds((prev) => {
        const newSet = new Set(prev);
        newSet.add(doctorId);
        return newSet;
      });
    }

    // Add to loading set
    setFavoriteLoadingIds((prev) => {
      const newSet = new Set(prev);
      newSet.add(doctorId);
      return newSet;
    });

    try {
      if (isFavorite) {
        // Remove from favorites
        const response = await api.delete(
          `/api/patients/me/favorite-doctors/${doctorId}`
        );
        if (!response.success) {
          // Rollback on error
          setFavoriteDoctorIds(previousFavoriteIds);
          message.error("Không thể xóa khỏi danh sách ưa thích");
        } else {
          message.success("Đã xóa khỏi danh sách ưa thích");
        }
      } else {
        // Add to favorites
        const response = await api.post("/api/patients/me/favorite-doctors", {
          doctorId: doctorId,
        });
        if (!response.success) {
          // Rollback on error
          setFavoriteDoctorIds(previousFavoriteIds);
          message.error(
            response.message || "Không thể thêm vào danh sách ưa thích"
          );
        } else {
          message.success("Đã thêm vào danh sách ưa thích");
        }
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      // Rollback on error - restore previous state
      setFavoriteDoctorIds(previousFavoriteIds);
      message.error("Có lỗi xảy ra khi cập nhật danh sách ưa thích");
    } finally {
      // Remove from loading set
      setFavoriteLoadingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(doctorId);
        return newSet;
      });
    }
  };

  // Fetch specializations for filter dropdown
  const fetchSpecializations = async () => {
    try {
      const response = await api.get("/api/specializations");
      if (response.success) {
        setSpecializations(response.data);
      }
    } catch (error) {
      console.error("Error fetching specializations:", error);
    }
  };

  // Fetch current specialization details
  const fetchCurrentSpecialization = async (specializationId) => {
    try {
      const response = await api.get(
        `/api/specializations/${specializationId}`
      );
      if (response.success) {
        setCurrentSpecialization(response.data);
      }
    } catch (error) {
      console.error("Error fetching specialization details:", error);
    }
  };

  // Initialize data
  useEffect(() => {
    fetchSpecializations();
  }, []);

  // Handle URL parameter on component mount
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const qSpecialty = params.get("specialty");
    const qFacility = params.get("facility");

    console.log("🔍 URL specialty parameter:", qSpecialty);
    console.log("🔍 URL facility parameter:", qFacility);
    console.log("🔍 Current selectedSpecialty:", selectedSpecialty);

    if (qSpecialty) {
      // If qSpecialty looks like an ObjectId (24 hex characters), use it directly
      if (qSpecialty.match(/^[0-9a-fA-F]{24}$/)) {
        console.log("✅ Setting selectedSpecialty to ObjectId:", qSpecialty);
        setSelectedSpecialty(qSpecialty);
        setCurrentPage(1);
      } else {
        console.log("❌ Invalid ObjectId format:", qSpecialty);
      }
    } else {
      console.log("ℹ️ No specialty parameter in URL");
    }

    if (qFacility) {
      console.log("✅ Setting facility filter:", qFacility);
      setFacilityFilter(qFacility);
    } else {
      console.log("ℹ️ No facility parameter in URL");
    }

    // Always set urlProcessed to true after processing URL (or if no URL param)
    setUrlProcessed(true);
  }, []); // Only run on mount

  useEffect(() => {
    // Only fetch doctors after URL has been processed
    console.log(
      "🔄 useEffect triggered - urlProcessed:",
      urlProcessed,
      "selectedSpecialty:",
      selectedSpecialty
    );
    if (urlProcessed) {
      console.log("🚀 Calling fetchDoctors...");
      fetchDoctors();
    }
  }, [
    currentPage,
    searchTerm,
    selectedSpecialty,
    facilityFilter,
    urlProcessed,
  ]);

  // Fetch specialization details when selectedSpecialty changes
  useEffect(() => {
    if (selectedSpecialty && selectedSpecialty !== "all") {
      fetchCurrentSpecialization(selectedSpecialty);
    } else {
      setCurrentSpecialization(null);
    }
  }, [selectedSpecialty]);

  // Helper function to get specialization names
  const getSpecializationNames = (specializationIds) => {
    if (!specializationIds || specializationIds.length === 0) return [];
    return specializationIds
      .map((spec) => {
        return typeof spec === "object" ? spec.name : spec;
      })
      .join(", ");
  };

  // Handle specialization name to ID conversion (for backward compatibility)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const qSpecialty = params.get("specialty");
    if (qSpecialty && !qSpecialty.match(/^[0-9a-fA-F]{24}$/)) {
      // Only handle name conversion if specializations are loaded
      if (specializations.length > 0) {
        const spec = specializations.find((s) => s.name === qSpecialty);
        if (spec) {
          setSelectedSpecialty(spec._id);
          setCurrentPage(1);
        }
      }
    }
  }, [specializations, location.search]);

  // Get breadcrumb items based on current context
  const getBreadcrumbItems = () => {
    const params = new URLSearchParams(location.search);
    const qSpecialty = params.get("specialty");

    const items = [
      {
        label: "Trang chủ",
        path: "/",
        icon: <HomeOutlined />,
      },
    ];

    // If coming from specialization page, add specialization to breadcrumb
    if (qSpecialty && qSpecialty !== "all") {
      let specName = qSpecialty;

      // If it's an ObjectId, find the specialization name
      if (qSpecialty.match(/^[0-9a-fA-F]{24}$/)) {
        const spec = specializations.find((s) => s._id === qSpecialty);
        if (spec) {
          specName = spec.name;
        }
      }

      items.push({
        label: specName,
        path: "/chuyen-khoa",
      });
    }

    // Always add "Bác sĩ" as the last item
    items.push({
      label: "Bác sĩ",
      path: "/danh-sach-bac-si",
    });

    return items;
  };

  // Doctors are already filtered by API, so we use them directly
  const filteredDoctors = doctors;

  const handleDoctorClick = (doctorId) => {
    // Navigate to doctor detail page
    console.log("Navigate to doctor detail:", doctorId);
    // TODO: Implement doctor detail page navigation
  };

  const handleBookAppointment = (e, doctor) => {
    e.stopPropagation();

    // Check if user is logged in
    if (!user) {
      // If not logged in, redirect to login page
      navigate("/dang-nhap", {
        state: {
          from: "/dat-lich/chon-thoi-gian",
          doctor: doctor,
          message: "Vui lòng đăng nhập để đặt lịch khám",
        },
      });
      return;
    }

    // If logged in, navigate to time slot selection page with doctor data
    navigate("/dat-lich/chon-thoi-gian", {
      state: {
        doctor: doctor,
        specialization: doctor.specializationIds?.[0] || null,
      },
    });
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (value) => {
    setSelectedSpecialty(value);
    setCurrentPage(1);
    // update URL query param for shareable state
    const params = new URLSearchParams(location.search);
    if (value === "all") {
      params.delete("specialty");
    } else {
      // Send specialization ID to URL
      params.set("specialty", value);
    }
    navigate({ pathname: location.pathname, search: params.toString() });
  };

  const DoctorCard = ({ doctor }) => {
    const isFavorite = favoriteDoctorIds.has(doctor._id);
    const isLoading = favoriteLoadingIds.has(doctor._id);

    return (
      <Card
        className="doctor-card"
        hoverable
        onClick={() => handleDoctorClick(doctor._id)}
        style={{
          marginBottom: "16px",
          borderRadius: "12px",
          border: "1px solid #f0f0f0",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
          position: "relative",
        }}
      >
        {/* Favorite Button */}
        <Button
          type="text"
          onClick={(e) => handleToggleFavorite(e, doctor._id)}
          disabled={isLoading}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            zIndex: 10,
            padding: "4px 8px",
            height: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          className="favorite-button"
        >
          {isLoading ? (
            <Spin size="small" style={{ margin: 0 }} />
          ) : isFavorite ? (
            <HeartFilled style={{ color: "#ff4d4f", fontSize: "20px" }} />
          ) : (
            <HeartOutlined style={{ fontSize: "20px" }} />
          )}
        </Button>

        <Row gutter={16} align="middle">
          <Col flex="120px">
            <Avatar
              size={100}
              src={
                doctor.avatarUrl && !doctor.avatarUrl.includes("picsum.photos")
                  ? doctor.avatarUrl
                  : "/default-avatar.png"
              }
              icon={<UserOutlined />}
              style={{ borderRadius: "8px" }}
              onError={() => {
                // Avatar component will handle fallback to icon
              }}
            />
          </Col>
          <Col flex="auto">
            <div className="doctor-info">
              <Title
                level={4}
                style={{ margin: "0 0 8px 0", color: "#1890ff" }}
              >
                {(() => {
                  const fullName = doctor.userId?.fullName || doctor.fullName;
                  return fullName?.startsWith("BS.")
                    ? fullName
                    : `BS. ${fullName}`;
                })()}
              </Title>
              <Text
                strong
                style={{ color: "#666", display: "block", marginBottom: "4px" }}
              >
                {getSpecializationNames(doctor.specializationIds) ||
                  "Chuyên khoa"}
              </Text>
              <Paragraph
                ellipsis={{ rows: 2 }}
                style={{ color: "#666", margin: "8px 0" }}
              >
                {doctor.bio || "Bác sĩ chuyên khoa với nhiều năm kinh nghiệm."}
              </Paragraph>
              <Space
                direction="vertical"
                size="small"
                style={{ width: "100%" }}
              >
                <Space>
                  {(() => {
                    const rating = parseFloat(doctor.ratingAvg) || 0;
                    const count = parseInt(doctor.ratingCount) || 0;
                    const validRating =
                      !isNaN(rating) && rating > 0 && rating <= 5;

                    if (!validRating || count === 0) {
                      return (
                        <>
                          <Rate
                            disabled
                            count={5}
                            value={0}
                            style={{ fontSize: "14px" }}
                          />
                          <Text>(Chưa có đánh giá)</Text>
                        </>
                      );
                    }

                    // Ensure rating is a number and clamp between 0 and 5
                    // Round to 1 decimal place to avoid floating point precision issues
                    let normalizedRating = Math.max(
                      0,
                      Math.min(5, Math.round(Number(rating) * 10) / 10)
                    );

                    // If rating is very close to 5 (>= 4.95), round up to 5 to ensure full stars display
                    if (normalizedRating >= 4.95) {
                      normalizedRating = 5;
                    }

                    // Debug log for rating display
                    if (normalizedRating >= 4.5) {
                      console.log(
                        `⭐ Rating display debug for ${
                          doctor.fullName || doctor.userId?.fullName
                        }:`,
                        {
                          originalRating: doctor.ratingAvg,
                          parsedRating: rating,
                          normalizedRating: normalizedRating,
                          count: count,
                        }
                      );
                    }

                    return (
                      <>
                        <Rate
                          disabled
                          count={5}
                          value={normalizedRating}
                          allowHalf={true}
                          style={{ fontSize: "14px" }}
                        />
                        <Text>
                          {normalizedRating.toFixed(1)} ({count} đánh giá)
                        </Text>
                      </>
                    );
                  })()}
                </Space>
                <Space>
                  <EnvironmentOutlined style={{ color: "#45c3d2" }} />
                  <Text>
                    {doctor.clinicDefaultId?.name || "Phòng khám"} -{" "}
                    {doctor.clinicDefaultId?.address || "Địa chỉ"}
                  </Text>
                </Space>
                <Space>
                  <CalendarOutlined style={{ color: "#45c3d2" }} />
                  <Text>Kinh nghiệm: {doctor.yearsExperience || 0} năm</Text>
                </Space>
              </Space>
            </div>
          </Col>
          <Col flex="160px">
            <div className="doctor-actions">
              <Button
                type="primary"
                size="large"
                block
                onClick={(e) => handleBookAppointment(e, doctor)}
                style={{
                  backgroundColor: "#45c3d2",
                  borderColor: "#45c3d2",
                  marginBottom: "8px",
                  fontWeight: "500",
                }}
              >
                Đặt lịch khám
              </Button>
              <Button
                size="large"
                block
                onClick={(e) => {
                  e.stopPropagation();
                  // Navigate to doctor reviews page
                  navigate(`/bac-si/${doctor._id}/danh-gia`);
                }}
                style={{ fontWeight: "500" }}
              >
                Xem đánh giá
              </Button>
            </div>
          </Col>
        </Row>
      </Card>
    );
  };

  return (
    <div className="doctor-page">
      {/* Breadcrumb */}
      <div className="container">
        <NavigationBreadcrumb items={getBreadcrumbItems()} />
      </div>

      {/* Search Section */}
      <div className="doctor-search-section">
        <div className="container">
          <Row gutter={[16, 16]} justify="center">
            <Col xs={24} sm={18} md={12} lg={10}>
              <Space.Compact style={{ width: "100%" }}>
                <Input
                  placeholder="Nhập tên bác sĩ hoặc chuyên khoa..."
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
                value={selectedSpecialty}
                onChange={handleFilterChange}
                style={{ width: "100%" }}
                size="large"
                placeholder="Chuyên khoa"
              >
                <Option value="all">Tất cả chuyên khoa</Option>
                {specializations.map((spec) => (
                  <Option key={spec._id} value={spec._id}>
                    {spec.name}
                  </Option>
                ))}
              </Select>
            </Col>
          </Row>
        </div>
      </div>

      {/* Specialization Info Section */}
      {currentSpecialization && (
        <div
          className="specialization-info-section"
          style={{
            background: "#f8f9fa",
            padding: "40px 0",
            borderBottom: "1px solid #e8e8e8",
          }}
        >
          <div className="container">
            <Row gutter={[24, 24]} align="middle">
              <Col xs={24} md={6}>
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      width: "120px",
                      height: "120px",
                      borderRadius: "16px",
                      background:
                        "linear-gradient(135deg, #45c3d2 0%, #3ba8b8 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "48px",
                      color: "white",
                      margin: "0 auto",
                    }}
                  >
                    {currentSpecialization.avatar ? (
                      <img
                        src={currentSpecialization.avatar}
                        alt={currentSpecialization.name}
                        style={{
                          maxWidth: "100%",
                          maxHeight: "100%",
                          objectFit: "contain",
                          borderRadius: "12px",
                        }}
                      />
                    ) : (
                      <MedicineBoxOutlined />
                    )}
                  </div>
                </div>
              </Col>
              <Col xs={24} md={18}>
                <div>
                  <Title
                    level={2}
                    style={{ margin: "0 0 16px 0", color: "#262626" }}
                  >
                    {currentSpecialization.name}
                  </Title>
                  <Paragraph
                    style={{
                      fontSize: "16px",
                      color: "#666",
                      margin: "0 0 16px 0",
                      lineHeight: "1.6",
                    }}
                  >
                    {currentSpecialization.description ||
                      "Chuyên khoa y tế chuyên nghiệp với đội ngũ bác sĩ giàu kinh nghiệm."}
                  </Paragraph>
                  <Space>
                    <Tag
                      color="blue"
                      style={{ fontSize: "14px", padding: "4px 12px" }}
                    >
                      <UserOutlined /> {filteredDoctors.length} bác sĩ
                    </Tag>
                    <Tag
                      color="green"
                      style={{ fontSize: "14px", padding: "4px 12px" }}
                    >
                      <MedicineBoxOutlined /> Chuyên khoa
                    </Tag>
                  </Space>
                </div>
              </Col>
            </Row>
          </div>
        </div>
      )}

      {/* Doctor List */}
      <div className="doctor-list-section">
        <div className="container">
          <div className="results-header">
            <Title level={3}>
              {facilityFilter
                ? `Bác sĩ tại ${facilityFilter} (${filteredDoctors.length})`
                : currentSpecialization
                ? `Bác sĩ ${currentSpecialization.name} (${filteredDoctors.length})`
                : `Kết quả tìm kiếm (${filteredDoctors.length})`}
            </Title>
          </div>

          <div className="doctor-list">
            {loading ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <Spin size="large" />
                <Text style={{ marginLeft: 16 }}>
                  Đang tải danh sách bác sĩ...
                </Text>
              </div>
            ) : filteredDoctors.length === 0 ? (
              <Empty
                description="Không tìm thấy bác sĩ nào"
                style={{ margin: "50px 0" }}
              />
            ) : (
              filteredDoctors.map((doctor) => (
                <DoctorCard key={doctor._id} doctor={doctor} />
              ))
            )}
          </div>

          {/* Pagination */}
          {!loading && totalDoctors > 5 && (
            <div style={{ textAlign: "center", marginTop: "32px" }}>
              <Pagination
                current={currentPage}
                total={totalDoctors}
                pageSize={5}
                onChange={setCurrentPage}
                showSizeChanger={false}
                showQuickJumper
                showTotal={(total, range) =>
                  `${range[0]}-${range[1]} của ${total} bác sĩ`
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DanhSachBacSi;
