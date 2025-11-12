import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Row,
  Col,
  Avatar,
  Typography,
  Button,
  Tag,
  Empty,
  Spin,
  Popconfirm,
} from "antd";
import {
  UserOutlined,
  CalendarOutlined,
  HeartFilled,
  StarOutlined,
} from "@ant-design/icons";
import { useFavoriteDoctors } from "../../../hooks/useFavoriteDoctors";
import {
  getSpecializationNames,
  getFullName,
  formatDoctorRating,
} from "../../../utils/doctorUtils";
import "./BacSiUaThich.scss";

const { Title, Text, Paragraph } = Typography;

const BacSiUaThich = () => {
  const navigate = useNavigate();
  const { favoriteDoctors, loading, removingIds, handleRemoveFavorite } =
    useFavoriteDoctors();

  const handleBookAppointment = (doctor) => {
    navigate("/dat-lich/chon-thoi-gian", {
      state: {
        doctor: doctor,
        specialization: doctor.specializations?.[0] || null,
      },
    });
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "100px 0" }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text>Đang tải danh sách bác sĩ ưa thích...</Text>
        </div>
      </div>
    );
  }

  return (
    <div className="favorite-doctors-page">
      <div className="page-header">
        <div className="header-content">
          <div className="header-text">
            <Title level={2} className="main-title">
              Bác sĩ ưa thích
            </Title>
            <Text className="subtitle">
              Danh sách các bác sĩ bạn đã thêm vào mục ưa thích
            </Text>
          </div>
        </div>
      </div>

      <div className="doctors-content">
        {favoriteDoctors.length === 0 ? (
          <Empty
            description="Bạn chưa có bác sĩ ưa thích nào"
            style={{ margin: "50px 0" }}
          >
            <Button
              type="primary"
              onClick={() => navigate("/benh-nhan/tim-bac-si")}
            >
              Tìm bác sĩ
            </Button>
          </Empty>
        ) : (
          <Row gutter={[24, 24]}>
            {favoriteDoctors.map((doctor) => (
              <Col xs={24} sm={12} lg={8} xl={6} key={doctor._id}>
                <Card
                  hoverable
                  className="favorite-doctor-card"
                  actions={[
                    <Popconfirm
                      title="Xóa khỏi danh sách ưa thích?"
                      description="Bạn có chắc chắn muốn xóa bác sĩ này khỏi danh sách ưa thích?"
                      onConfirm={() => handleRemoveFavorite(doctor._id)}
                      okText="Xóa"
                      cancelText="Hủy"
                      okButtonProps={{
                        danger: true,
                        loading: removingIds.has(doctor._id),
                      }}
                    >
                      <Button
                        type="text"
                        danger
                        icon={<HeartFilled />}
                        loading={removingIds.has(doctor._id)}
                      >
                        Bỏ thích
                      </Button>
                    </Popconfirm>,
                    <Button
                      type="primary"
                      icon={<CalendarOutlined />}
                      onClick={() => handleBookAppointment(doctor)}
                    >
                      Đặt lịch
                    </Button>,
                  ]}
                >
                  <div className="doctor-card-content">
                    <div className="doctor-avatar-container">
                      <Avatar
                        size={100}
                        src={
                          doctor.avatarUrl &&
                          !doctor.avatarUrl.includes("picsum.photos")
                            ? doctor.avatarUrl
                            : undefined
                        }
                        icon={!doctor.avatarUrl && <UserOutlined />}
                        className="doctor-avatar"
                      />
                    </div>

                    <div className="doctor-info">
                      <Title level={4} className="doctor-name">
                        {getFullName(doctor)}
                      </Title>

                      <div className="doctor-specializations">
                        <Tag color="blue">
                          {getSpecializationNames(doctor.specializations)}
                        </Tag>
                      </div>

                      {doctor.yearsExperience && (
                        <div className="doctor-experience">
                          <Text type="secondary">
                            {doctor.yearsExperience} năm kinh nghiệm
                          </Text>
                        </div>
                      )}

                      <div className="doctor-rating">
                        <StarOutlined
                          style={{ color: "#faad14", marginRight: 4 }}
                        />
                        <Text>
                          {formatDoctorRating(
                            doctor.ratingAvg,
                            doctor.ratingCount
                          )}
                        </Text>
                      </div>

                      {doctor.bio && (
                        <Paragraph
                          ellipsis={{ rows: 2, expandable: false }}
                          className="doctor-bio"
                        >
                          {doctor.bio}
                        </Paragraph>
                      )}
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </div>
    </div>
  );
};

export default BacSiUaThich;
