import React, { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Layout, Menu, Avatar, Badge, Button, Dropdown } from "antd";
import {
  HomeOutlined,
  CalendarOutlined,
  LogoutOutlined,
  BellOutlined,
  UserOutlined,
  DownOutlined,
  FileTextOutlined,
  DollarOutlined,
  CreditCardOutlined,
} from "@ant-design/icons";
import { clearUserData } from "../../utils/clearUserData";
import "./ManagerLayout.scss";

const { Header, Sider, Content } = Layout;

const ManagerLayout = () => {
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
      key: "/manager/trang-chu",
      icon: <HomeOutlined />,
      label: "Tổng quan",
    },
    {
      key: "/manager/quan-ly-lich",
      icon: <CalendarOutlined />,
      label: "Quản lý lịch bác sĩ",
    },
    {
      key: "/manager/quan-ly-gia",
      icon: <DollarOutlined />,
      label: "Quản lý giá khám",
    },
    {
      key: "/manager/yeu-cau-nghi-phep",
      icon: <FileTextOutlined />,
      label: "Yêu cầu nghỉ phép",
      badge: null, // TODO: Add badge count for pending requests
    },
    {
      key: "/manager/quan-ly-gia-dich-vu",
      icon: <DollarOutlined />,
      label: "Quản lý giá dịch vụ",
    },
    {
      key: "/manager/quan-ly-hoa-don",
      icon: <FileTextOutlined />,
      label: "Quản lý hóa đơn",
    },
    {
      key: "/manager/thanh-toan-dich-vu",
      icon: <CreditCardOutlined />,
      label: "Thanh toán hóa đơn",
    },
    {
      key: "/manager/thong-bao",
      icon: <BellOutlined />,
      label: "Thông báo",
      badge: unreadNotificationCount > 0 ? unreadNotificationCount : null,
    },
  ];

  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  const handleLogout = async () => {
    try {
      console.log("Manager logout clicked - clearing all user data...");
      await clearUserData();
      // clearUserData already redirects to homepage, but ensure it happens
    } catch (error) {
      console.error("Error during manager logout:", error);
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
    <Layout className="manager-layout">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        className="manager-sider"
        width={280}
      >
        <div
          className="manager-logo"
          onClick={() => navigate("/")}
          style={{ cursor: "pointer" }}
        >
          <div className="logo-icon">
            <CalendarOutlined />
          </div>
          <div className="logo-text">
            <div className="logo-title">MedConnect</div>
            <div className="logo-subtitle">Quản lý lịch</div>
          </div>
        </div>

        <div className="manager-profile">
          <Avatar size={48} icon={<UserOutlined />} />
          <div className="profile-info">
            <div className="profile-name">Manager</div>
            <div className="profile-role">Quản lý</div>
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
          className="manager-menu"
        />

        <div className="manager-footer">
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

      <Layout className="manager-main">
        <Header className="manager-header">
          <div className="header-left"></div>

          <div className="header-right">
            <Button
              type="text"
              icon={<BellOutlined />}
              className="notification-btn"
              onClick={() => navigate("/manager/thong-bao")}
            >
              {unreadNotificationCount > 0 && (
                <Badge count={unreadNotificationCount} size="small" />
              )}
            </Button>

            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Button type="text" className="user-btn">
                <Avatar size={32} icon={<UserOutlined />} />
                <span>Manager</span>
                <DownOutlined />
              </Button>
            </Dropdown>
          </div>
        </Header>

        <Content className="manager-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default ManagerLayout;
