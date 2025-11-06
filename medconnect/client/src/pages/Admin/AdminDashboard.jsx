import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Row, Col, List, Avatar, Spin, Alert, Button } from "antd";
import {
  UserOutlined,
  SafetyCertificateOutlined,
  CalendarOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import {
  getAdminDashboardStats,
  getAdminDashboardActivities,
  getAdminSystemStatus,
} from "../../lib/api";
import "./AdminDashboard.scss";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statsData, setStatsData] = useState({
    totalUsers: 0,
    verifiedDoctors: 0,
    pendingDoctors: 0,
    monthlyAppointments: 0,
    revenue: 0,
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [systemStatus, setSystemStatus] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesPagination, setActivitiesPagination] = useState({
    total: 0,
    limit: 10,
    offset: 0,
    hasMore: false,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch stats data
      const stats = await getAdminDashboardStats();
      setStatsData(stats.data || stats);

      // Fetch recent activities (initial load - show first 10)
      await fetchActivities(0, 10);

      // Fetch system status
      const status = await getAdminSystemStatus();
      setSystemStatus(status.data || status);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Không thể tải dữ liệu dashboard");
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async (offset = 0, limit = 10, append = false) => {
    try {
      setActivitiesLoading(true);
      const response = await getAdminDashboardActivities({ limit, offset });
      const newActivities = response.data || response;
      
      if (append) {
        // Load more - append to existing
        setRecentActivities((prev) => [...prev, ...newActivities]);
      } else {
        // First load or refresh
        setRecentActivities(newActivities);
      }
      
      if (response.pagination) {
        setActivitiesPagination({
          ...response.pagination,
          offset: append ? activitiesPagination.offset + newActivities.length : offset + newActivities.length,
        });
      }
    } catch (err) {
      console.error("Error fetching activities:", err);
    } finally {
      setActivitiesLoading(false);
    }
  };

  const handleLoadMore = () => {
    const currentOffset = recentActivities.length;
    fetchActivities(currentOffset, activitiesPagination.limit, true);
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case "user_registration":
        return <UserOutlined />;
      case "doctor_verification":
        return <SafetyCertificateOutlined />;
      case "appointment_created":
        return <CalendarOutlined />;
      case "payment_completed":
        return <WalletOutlined />;
      default:
        return <CheckCircleOutlined />;
    }
  };

  const statsCards = [
    {
      title: "Tổng người dùng",
      value: statsData.totalUsers,
      change: "Tổng số người dùng trong hệ thống",
      changeValue: "",
      icon: <UserOutlined />,
      color: "#1890ff",
      gradient: "linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)",
      path: "/admin/users",
    },
    {
      title: "Bác sĩ đã xác minh",
      value: statsData.verifiedDoctors,
      change: `${statsData.pendingDoctors} đang chờ xác minh`,
      changeValue:
        statsData.pendingDoctors > 0 ? `+${statsData.pendingDoctors}` : "",
      icon: <SafetyCertificateOutlined />,
      color: "#52c41a",
      gradient: "linear-gradient(135deg, #52c41a 0%, #73d13d 100%)",
      path: "/admin/verify-doctors",
    },
    {
      title: "Tổng số lịch hẹn",
      value: statsData.monthlyAppointments,
      changeValue: "",
      icon: <CalendarOutlined />,
      color: "#45c3d2",
      gradient: "linear-gradient(135deg, #40CCCC 0%, #45c3d2 100%)",
      path: "/admin/appointments",
    },
    {
      title: "Tổng doanh thu",
      value: `${statsData.revenue.toLocaleString()} VNĐ`,
      changeValue: "",
      icon: <DollarOutlined />,
      color: "#fa8c16",
      gradient: "linear-gradient(135deg, #fa8c16 0%, #ffa940 100%)",
      path: "/admin/statistics",
    },
  ];

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="dashboard-header">
          <h1>Tổng quan hệ thống</h1>
          <p>Giám sát và quản lý nền tảng MedConnect</p>
        </div>
        <div style={{ textAlign: "center", padding: "50px" }}>
          <Spin size="large" />
          <p style={{ marginTop: "16px" }}>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard">
        <div className="dashboard-header">
          <h1>Tổng quan hệ thống</h1>
          <p>Giám sát và quản lý nền tảng MedConnect</p>
        </div>
        <Alert
          message="Lỗi tải dữ liệu"
          description={error}
          type="error"
          showIcon
          style={{ margin: "20px 0" }}
        />
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>Tổng quan hệ thống</h1>
        <p>Giám sát và quản lý nền tảng MedConnect</p>
      </div>

      <Row gutter={[24, 24]} className="stats-row">
        {statsCards.map((stat, index) => (
          <Col xs={24} sm={12} lg={6} key={index}>
            <Card
              className="stat-card clickable"
              style={{
                background: stat.gradient,
                border: "none",
                borderRadius: "16px",
                overflow: "hidden",
              }}
              onClick={() => navigate(stat.path)}
            >
              <div className="stat-icon" style={{ color: "#ffffff" }}>
                {stat.icon}
              </div>
              <div className="stat-content">
                <div className="stat-title">{stat.title}</div>
                <div className="stat-value">{stat.value}</div>
                <div className="stat-change">{stat.change}</div>
              </div>
              {stat.changeValue && (
                <div className="stat-change-value">{stat.changeValue}</div>
              )}
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[24, 24]} className="content-row">
        <Col xs={24} lg={12}>
          <Card 
            title="Hoạt động gần đây" 
            className="activity-card"
            extra={
              activitiesPagination.total > recentActivities.length && (
                <span style={{ fontSize: "12px", color: "#8c8c8c" }}>
                  {recentActivities.length} / {activitiesPagination.total}
                </span>
              )
            }
          >
            <div className="activities-scroll-container">
              <List
                dataSource={recentActivities}
                loading={activitiesLoading}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Avatar 
                          icon={getActivityIcon(item.type)} 
                          style={{
                            backgroundColor: 
                              item.type === "user_registration" ? "#1890ff" :
                              item.type === "doctor_verification" ? "#52c41a" :
                              item.type === "appointment_created" ? "#45c3d2" :
                              item.type === "payment_completed" ? "#fa8c16" :
                              "#8c8c8c"
                          }}
                        />
                      }
                      title={item.title}
                      description={item.time}
                    />
                  </List.Item>
                )}
              />
            </div>
            {activitiesPagination.hasMore && (
              <div style={{ textAlign: "center", marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #f0f0f0" }}>
                <Button 
                  type="link" 
                  onClick={handleLoadMore}
                  loading={activitiesLoading}
                >
                  Xem thêm ({activitiesPagination.total - recentActivities.length} hoạt động)
                </Button>
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Tình trạng hệ thống" className="status-card">
            <div className="status-list">
              {systemStatus.map((item, index) => (
                <div key={index} className="status-item">
                  <div className="status-label">{item.label}</div>
                  <div className="status-value">
                    <span className="status-dot success"></span>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AdminDashboard;
