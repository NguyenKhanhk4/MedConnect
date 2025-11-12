import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import { api } from "../../../lib/api";
import {
  Row,
  Col,
  Card,
  Input,
  Select,
  Button,
  Typography,
  Space,
  Divider,
  Tag,
  Avatar,
  Rate,
  Empty,
  Pagination,
  Spin,
  message,
} from "antd";
import {
  SearchOutlined,
  EnvironmentOutlined,
  UserOutlined,
  MedicineBoxOutlined,
  HeartOutlined,
  PhoneOutlined,
  CalendarOutlined,
  StarOutlined,
} from "@ant-design/icons";
import "./TimKiem.css";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const TimKiem = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Lấy type từ URL params
  const searchParams = new URLSearchParams(location.search);
  const urlType = searchParams.get("type") || "all";

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState(urlType);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState(null);

  // Cập nhật filterType khi URL thay đổi
  useEffect(() => {
    setFilterType(urlType);
  }, [urlType]);

  // Fetch data from API
  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      let endpoint = "";
      let params = new URLSearchParams({
        page: currentPage,
        limit: 10,
      });

      if (searchQuery) {
        params.append("search", searchQuery);
      }

      switch (filterType) {
        case "doctor":
          endpoint = `/api/doctors/search?${params}`;
          break;
        case "specialty":
          endpoint = `/api/doctors/specializations/search?${params}`;
          break;
        case "location":
          endpoint = `/api/doctors/clinics/search?${params}`;
          break;
        case "all":
        default:
          // Fetch all types
          const [doctorsRes, specializationsRes, clinicsRes] =
            await Promise.all([
              api.get(`/api/doctors/search?${params}`),
              api.get(`/api/doctors/specializations/search?${params}`),
              api.get(`/api/doctors/clinics/search?${params}`),
            ]);

          console.log("API Responses:", {
            doctorsRes,
            specializationsRes,
            clinicsRes,
          });

          console.log("Doctors data:", doctorsRes.data?.doctors);
          console.log(
            "Specializations data:",
            specializationsRes.data?.specializations
          );
          console.log("Clinics data:", clinicsRes.data?.clinics);

          const allData = [
            ...(doctorsRes.data?.doctors || []).map((d) => ({
              ...d,
              type: "doctor",
            })),
            ...(specializationsRes.data?.specializations || []).map((s) => ({
              ...s,
              type: "specialty",
            })),
            ...(clinicsRes.data?.clinics || []).map((c) => ({
              ...c,
              type: "location",
            })),
          ];

          console.log("Combined allData:", allData);

          setData(allData);
          setTotal(allData.length);
          return;
      }

      const response = await api.get(endpoint);

      if (filterType === "doctor") {
        setData(response.data.doctors.map((d) => ({ ...d, type: "doctor" })));
        setTotal(response.data.pagination.total);
      } else if (filterType === "specialty") {
        setData(
          response.data.specializations.map((s) => ({
            ...s,
            type: "specialty",
          }))
        );
        setTotal(response.data.pagination.total);
      } else if (filterType === "location") {
        setData(response.data.clinics.map((c) => ({ ...c, type: "location" })));
        setTotal(response.data.pagination.total);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Không thể tải dữ liệu. Vui lòng thử lại sau.");
      message.error("Không thể tải dữ liệu. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when component mounts or dependencies change
  useEffect(() => {
    fetchData();
  }, [filterType, searchQuery, currentPage]);

  const handleSearch = (value) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (value) => {
    setFilterType(value);
    setCurrentPage(1);

    // Cập nhật URL khi thay đổi filter
    if (value === "all") {
      navigate("/tim-kiem");
    } else {
      navigate(`/tim-kiem?type=${value}`);
    }
  };

  const handleBookAppointment = (doctor) => {
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
      },
    });
  };

  // Render item theo type
  const renderSearchItem = (item) => {
    switch (item.type) {
      case "doctor":
        return (
          <Card className="search-item doctor-item" hoverable>
            <Row gutter={16}>
              <Col flex="80px">
                <Avatar
                  size={64}
                  src={item.avatarUrl || item.userId?.avatarUrl}
                />
              </Col>
              <Col flex="auto">
                <div className="item-content">
                  <Title level={4} style={{ margin: 0 }}>
                    {(() => {
                      const fullName = item.fullName;
                      return fullName?.startsWith("BS.")
                        ? fullName
                        : `BS. ${fullName}`;
                    })()}
                  </Title>
                  <Space direction="vertical" size="small">
                    <Tag color="blue">
                      {item.specializationIds
                        ?.map((spec) => spec.name)
                        .join(", ") || "Chuyên khoa"}
                    </Tag>
                    <Text>
                      <EnvironmentOutlined />{" "}
                      {item.clinicDefaultId?.name || "Phòng khám"}
                    </Text>
                    <Text>
                      <CalendarOutlined /> Kinh nghiệm: {item.yearsExperience}{" "}
                      năm
                    </Text>
                    <Space>
                      <Rate disabled defaultValue={item.ratingAvg || 0} />
                      <Text>({item.ratingAvg?.toFixed(1) || 0})</Text>
                      <Text strong style={{ color: "#1890ff" }}>
                        {item.ratingCount} đánh giá
                      </Text>
                    </Space>
                  </Space>
                </div>
              </Col>
              <Col flex="120px">
                <Space direction="vertical" size="small">
                  <Button
                    type="primary"
                    block
                    icon={<CalendarOutlined />}
                    onClick={() => handleBookAppointment(item)}
                  >
                    Đặt lịch
                  </Button>
                  <Button block icon={<PhoneOutlined />}>
                    Gọi ngay
                  </Button>
                </Space>
              </Col>
            </Row>
          </Card>
        );

      case "specialty":
        return (
          <Card className="search-item specialty-item" hoverable>
            <Row gutter={16}>
              <Col flex="60px">
                <div className="specialty-icon">🩺</div>
              </Col>
              <Col flex="auto">
                <Title level={4} style={{ margin: 0 }}>
                  {item.name}
                </Title>
                <Paragraph ellipsis={{ rows: 2 }}>
                  {item.description || "Chuyên khoa y tế"}
                </Paragraph>
                <Text type="secondary">{item.doctorCount || 0} bác sĩ</Text>
              </Col>
              <Col flex="100px">
                <Button type="primary" block>
                  Xem bác sĩ
                </Button>
              </Col>
            </Row>
          </Card>
        );

      case "location":
        return (
          <Card className="search-item location-item" hoverable>
            <Row gutter={16}>
              <Col flex="auto">
                <Title level={4} style={{ margin: 0 }}>
                  {item.name}
                </Title>
                <Space direction="vertical" size="small">
                  <Text>
                    <EnvironmentOutlined /> {item.address}
                  </Text>
                  <Text>
                    <PhoneOutlined /> {item.phone}
                  </Text>
                  <Space>
                    <Rate disabled defaultValue={4.5} />
                    <Text>(4.5)</Text>
                  </Space>
                  <div>
                    {item.specializations?.map((spec, index) => (
                      <Tag key={index} color="green">
                        {spec}
                      </Tag>
                    )) || <Tag color="green">Đa khoa</Tag>}
                  </div>
                </Space>
              </Col>
              <Col flex="120px">
                <Space direction="vertical" size="small">
                  <Button type="primary" block>
                    Xem chi tiết
                  </Button>
                  <Button block icon={<PhoneOutlined />}>
                    Gọi ngay
                  </Button>
                </Space>
              </Col>
            </Row>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="search-page">
      {/* Search Header */}
      <div className="search-header">
        <div className="container">
          <Title level={2} style={{ textAlign: "center", marginBottom: 30 }}>
            Tìm kiếm dịch vụ y tế
          </Title>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={6}>
              <Select
                value={filterType}
                onChange={handleFilterChange}
                style={{ width: "100%" }}
                size="large"
              >
                <Option value="all">
                  <SearchOutlined /> Tất cả
                </Option>
                <Option value="doctor">
                  <UserOutlined /> Bác sĩ
                </Option>
                <Option value="specialty">
                  <MedicineBoxOutlined /> Chuyên khoa
                </Option>
                <Option value="location">
                  <EnvironmentOutlined /> Địa điểm khám
                </Option>
              </Select>
            </Col>
            <Col xs={24} sm={18}>
              <Input.Search
                placeholder="Nhập từ khóa tìm kiếm..."
                size="large"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onSearch={handleSearch}
                enterButton="Tìm kiếm"
              />
            </Col>
          </Row>
        </div>
      </div>

      {/* Search Results */}
      <div className="search-results">
        <div className="container">
          <div className="results-header">
            <Title level={3}>Kết quả tìm kiếm ({total})</Title>
            {searchQuery && (
              <Text>
                Kết quả cho: "<strong>{searchQuery}</strong>"
              </Text>
            )}
          </div>

          <Divider />

          {loading ? (
            <div style={{ textAlign: "center", padding: "50px 0" }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>Đang tải dữ liệu...</div>
            </div>
          ) : error ? (
            <Empty description={error} image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : data.length > 0 ? (
            <div className="results-list">
              {data.map((item, index) => (
                <div
                  key={`${item.type}-${item._id || index}`}
                  className="result-item"
                >
                  {renderSearchItem(item)}
                </div>
              ))}
            </div>
          ) : (
            <Empty
              description="Không tìm thấy kết quả nào"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}

          {total > 10 && (
            <div style={{ textAlign: "center", marginTop: 30 }}>
              <Pagination
                current={currentPage}
                total={total}
                pageSize={10}
                onChange={setCurrentPage}
                showSizeChanger={false}
                showQuickJumper
                showTotal={(total, range) =>
                  `${range[0]}-${range[1]} của ${total} kết quả`
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimKiem;
