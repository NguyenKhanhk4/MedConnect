import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { useUserProfile } from "../../../hooks/useUserProfile";
import {
  CalendarCheck,
  Search,
  Video,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  Home,
  CreditCard,
  Bell,
  Plus,
  Users,
  UserPlus,
} from "lucide-react";
import "./AppSidebar.scss";

export function AppSidebar() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const {
    userProfile,
    loading: profileLoading,
    refreshProfile,
  } = useUserProfile();

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const mainMenuItems = [
    { icon: Home, label: "Trang chủ", href: "/benh-nhan/trang-chu" },
    { icon: Search, label: "Tìm bác sĩ", href: "/benh-nhan/tim-bac-si" },
    {
      icon: CalendarCheck,
      label: "Lịch hẹn của tôi",
      href: "/benh-nhan/lich-hen-cua-toi",
    },
    {
      icon: UserPlus,
      label: "Lịch đặt hộ",
      href: "/benh-nhan/lich-dat-ho",
    },
    {
      icon: FileText,
      label: "Hồ sơ khám bệnh",
      href: "/benh-nhan/ho-so-benh-an",
    },
    {
      icon: Users,
      label: "Hồ sơ khám bệnh người thân",
      href: "/benh-nhan/ho-so-suc-khoe-gia-dinh",
    },
    { icon: CreditCard, label: "Thanh toán", href: "/payments" },
    { icon: Bell, label: "Thông báo", href: "/benh-nhan/thong-bao" },
  ];

  const settingsMenuItems = [
    { icon: Settings, label: "Cài đặt", href: "/benh-nhan/cai-dat" },
    { icon: LogOut, label: "Đăng xuất", href: "/logout" },
  ];

  // Get user info from profile or use fallback
  const userInfo = {
    name: userProfile?.fullName || userProfile?.displayName || "Người dùng",
    email: userProfile?.email || "email@example.com",
    role: userProfile?.role === "patient" ? "Bệnh nhân" : "Người dùng",
    avatar:
      userProfile?.avatarUrl ||
      userProfile?.photoURL ||
      userProfile?.avatar ||
      "/patient-consultation.png",
  };

  // Listen for avatar update events
  useEffect(() => {
    const handleAvatarUpdated = () => {
      // Trigger a refresh of the user profile
      refreshProfile();
    };

    window.addEventListener("avatarUpdated", handleAvatarUpdated);
    return () => {
      window.removeEventListener("avatarUpdated", handleAvatarUpdated);
    };
  }, [refreshProfile]);

  const handleLogout = async () => {
    try {
      // Import auth from firebase
      const { auth } = await import("../../../lib/firebase");

      // Sign out from Firebase first
      await auth.signOut();

      // Use window.location.href for hard redirect to homepage to avoid middleware redirects
      window.location.href = "/";
    } catch (error) {
      console.error("Error during logout:", error);
      // Fallback: redirect to homepage
      window.location.href = "/";
    }
  };

  const handleUserProfileClick = () => {
    // Navigate to homepage when clicking on user profile
    navigate("/benh-nhan/cai-dat", { replace: false });
    setIsOpen(false); // Close mobile menu if open
  };

  const handleLogoClick = () => {
    // Navigate to homepage when clicking on logo
    navigate("/", { replace: false });
    setIsOpen(false); // Close mobile menu if open
  };

  return (
    <>
      {/* Mobile menu button */}
      {!isDesktop && (
        <Button
          variant="ghost"
          size="icon"
          style={{
            position: "fixed",
            top: "1rem",
            left: "1rem",
            zIndex: 50,
          }}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      )}

      {/* Overlay for mobile */}
      {!isDesktop && isOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 40,
          }}
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        style={{
          position: isDesktop ? "sticky" : "fixed",
          left: isDesktop ? "auto" : 0,
          top: isDesktop ? "0" : 0,
          zIndex: 40,
          height: "100vh",
          width: "18rem",
          backgroundColor: "#ffffff",
          borderRight: "1px solid #e2e8f0",
          transition: "transform 0.3s ease",
          transform: isDesktop
            ? "translateX(0)"
            : isOpen
            ? "translateX(0)"
            : "translateX(-100%)",
          flexShrink: 0,
        }}
      >
        <div className="sidebar-content">
          {/* Logo Section */}
          <div
            className="logo-section"
            onClick={handleLogoClick}
            style={{ cursor: "pointer" }}
          >
            <div className="logo-container">
              <div className="logo-icon">
                <Plus className="logo-plus" />
              </div>
              <div className="logo-text">
                <div className="app-name">MedConnect</div>
                <div className="app-tagline">Chăm sóc sức khỏe</div>
              </div>
            </div>
          </div>

          {/* User Profile Section */}
          <div
            className="user-profile-section"
            onClick={handleUserProfileClick}
            style={{ cursor: "pointer" }}
          >
            <div className="user-avatar">
              <img
                src={userInfo.avatar}
                alt="User Avatar"
                className="avatar-image"
              />
            </div>
            <div className="user-info">
              <div className="user-name">{userInfo.name}</div>
              <div className="user-role">{userInfo.role}</div>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="navigation-menu">
            <div className="menu-container">
              {/* Main Menu Items */}
              <ul className="menu-list main-menu">
                {mainMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = window.location.pathname === item.href;
                  return (
                    <li key={item.href} className="menu-item">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          navigate(item.href, { replace: false });
                          setIsOpen(false);
                        }}
                        className={`menu-button ${isActive ? "active" : ""}`}
                      >
                        <Icon className="menu-icon" />
                        <span className="menu-text">{item.label}</span>
                        {item.badge && (
                          <Badge className="notification-badge">
                            {item.badge}
                          </Badge>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>

              {/* Settings Menu Items */}
              <div className="settings-section" style={{ marginTop: "1rem" }}>
                <div className="menu-separator"></div>
                <ul className="menu-list settings-menu">
                  {settingsMenuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = window.location.pathname === item.href;
                    return (
                      <li key={item.href} className="menu-item">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (item.label === "Đăng xuất") {
                              handleLogout();
                            } else {
                              // Try both navigation methods
                              try {
                                navigate(item.href, { replace: false });
                              } catch (error) {
                                // Fallback to window.location
                                window.location.href = item.href;
                              }
                            }
                            setIsOpen(false);
                          }}
                          className={`menu-button ${isActive ? "active" : ""}`}
                        >
                          <Icon className="menu-icon" />
                          <span className="menu-text">{item.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </nav>
        </div>
      </aside>
    </>
  );
}
