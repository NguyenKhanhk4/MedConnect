import React, { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Layout, Menu, Avatar, Badge, Button, Dropdown } from "antd";
import {
  HomeOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  MedicineBoxOutlined,
  CalendarOutlined,
  FileTextOutlined,
  SettingOutlined,
  LogoutOutlined,
  BellOutlined,
  UserOutlined,
  DownOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { clearUserData } from "../../utils/clearUserData";
import "./AdminLayout.scss";

const { Header, Sider, Content } = Layout;

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  // Fetch unread notification count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const { api } = await import("../../lib/api");
        const response = await api.get("/api/notifications/unread-count");
        if (response.success) {
          setUnreadNotificationCount(response.data.unreadCount || 0);
        }
      } catch (error) {
        console.error("Error fetching unread count:", error);
      }
    };

    fetchUnreadCount();
    // Refresh count every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Menu items
  const menuItems = [
    {
      key: "/admin/trang-chu",
      icon: <HomeOutlined />,
      label: "Tổng quan",
    },
    {
      key: "/admin/xac-minh-bac-si",
      icon: <SafetyCertificateOutlined />,
      label: "Xác minh bác sĩ",
    },
    {
      key: "/admin/nguoi-dung",
      icon: <TeamOutlined />,
      label: "Quản lý người dùng",
    },
    {
      key: "/admin/chuyen-khoa",
      icon: <MedicineBoxOutlined />,
      label: "Quản lý chuyên khoa",
    },
    {
      key: "/admin/lich-hen",
      icon: <CalendarOutlined />,
      label: "Quản lý lịch hẹn",
    },
    {
      key: "/admin/thong-ke",
      icon: <FileTextOutlined />,
      label: "Thống kê",
    },
    {
      key: "/admin/thong-bao",
      icon: <BellOutlined />,
      label: "Thông báo",
    },
  ];

  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  const handleLogout = async () => {
    try {
      await clearUserData();
      // clearUserData already redirects to homepage, but ensure it happens
    } catch (error) {
      console.error("Error during admin logout:", error);
      // Fallback: redirect to homepage
      window.location.href = "/";
    }
  };

  const userMenuItems = [
    {
      key: "logout",
      label: "Đăng xuất",
      danger: true,
      onClick: handleLogout,
    },
  ];

  return (
    <Layout className="admin-layout">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        className="admin-sider"
        width={280}
      >
        <div
          className="admin-logo"
          onClick={() => navigate("/")}
          style={{ cursor: "pointer" }}
        >
          <div className="logo-icon">
            <PlusOutlined />
          </div>
          <div className="logo-text">
            <div className="logo-title">MedConnect</div>
            <div className="logo-subtitle">Chăm sóc sức khỏe</div>
          </div>
        </div>

        <div className="admin-profile">
          <Avatar size={48} icon={<UserOutlined />} />
          <div className="profile-info">
            <div className="profile-name">Admin</div>
            <div className="profile-role">Quản trị viên</div>
          </div>
        </div>

        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems.map((item) => ({
            ...item,
            label: (
              <div className="menu-item">
                <span>{item.label}</span>
                {item.badge && <Badge count={item.badge} size="small" />}
              </div>
            ),
          }))}
          onClick={handleMenuClick}
          className="admin-menu"
        />

        <div className="admin-footer">
          <Menu
            mode="inline"
            items={[
              {
                key: "logout",
                icon: <LogoutOutlined />,
                label: "Đăng xuất",
                onClick: handleLogout,
              },
            ]}
            className="footer-menu"
          />
        </div>
      </Sider>

      <Layout className="admin-main">
        <Header className="admin-header">
          <div className="header-left"></div>

          <div className="header-right">
            <button
              className="notification-btn"
              onClick={() => navigate("/admin/thong-bao")}
            >
              <BellOutlined className="bell-icon" />
              {unreadNotificationCount > 0 && (
                <span className="unread-badge">{unreadNotificationCount}</span>
              )}
            </button>

            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Button type="text" className="user-btn">
                <Avatar size={32} icon={<UserOutlined />} />
                <span>Admin</span>
                <DownOutlined />
              </Button>
            </Dropdown>
          </div>
        </Header>

        <Content className="admin-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;
