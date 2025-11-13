import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Calendar,
  Clock,
  FileText,
  Users,
  Settings,
  Bell,
  MessageSquare,
  Stethoscope,
  LogOut,
  Plus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { clearUserData } from "../../../utils/clearUserData";
import { getDoctorProfileWithFallback } from "../../../lib/api";
import "./Sidebar.scss";

const menuItems = [
  {
    label: "Trang chủ",
    subtitle: "Tổng quan hôm nay",
    icon: LayoutDashboard,
    id: "dashboard",
  },
  {
    label: "Lịch làm việc",
    subtitle: "Quản lý slot & lịch",
    icon: Clock,
    id: "schedule",
  },
  {
    label: "Lịch hẹn",
    subtitle: "Danh sách lịch hẹn",
    icon: Users,
    id: "appointments",
  },
  {
    label: "Hồ sơ khám",
    subtitle: "Lịch sử tư vấn",
    icon: FileText,
    id: "medical-history",
  },
  {
    label: "Thông báo",
    subtitle: "Thông báo hệ thống",
    icon: Bell,
    id: "notifications",
  },
  {
    label: "Yêu cầu dời lịch",
    subtitle: "Quản lý dời lịch",
    icon: Calendar,
    id: "reschedule-requests",
  },
  {
    label: "Đánh giá",
    subtitle: "Phản hồi bệnh nhân",
    icon: MessageSquare,
    id: "reviews",
  },
];

export default function Sidebar({ activeMenu, onMenuChange }) {
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDoctorInfo = async () => {
      try {
        const doctor = await getDoctorProfileWithFallback();
        if (doctor) {
          console.log("🔍 Sidebar - Doctor data:", doctor);
          console.log("🔍 Sidebar - User data:", doctor.userId);
          console.log("🔍 Sidebar - Doctor fullName:", doctor.fullName);
          console.log("🔍 Sidebar - User fullName:", doctor.userId?.fullName);
          console.log(
            "🔍 Sidebar - Final name:",
            doctor.userId?.fullName || doctor.fullName
          );
          setDoctorInfo(doctor);
        } else {
          console.error("No doctor found");
        }
      } catch (error) {
        console.error("Error fetching doctor info:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDoctorInfo();

    // Listen for storage changes to refresh avatar
    const handleStorageChange = () => {
      fetchDoctorInfo();
    };

    // Listen for custom avatar update event
    const handleAvatarUpdate = () => {
      fetchDoctorInfo();
    };

    // Listen for doctor profile update event
    const handleDoctorProfileUpdate = (event) => {
      if (event.detail?.doctor) {
        setDoctorInfo(event.detail.doctor);
      } else {
        fetchDoctorInfo();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("avatarUpdated", handleAvatarUpdate);
    window.addEventListener("doctorProfileUpdated", handleDoctorProfileUpdate);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("avatarUpdated", handleAvatarUpdate);
      window.removeEventListener(
        "doctorProfileUpdated",
        handleDoctorProfileUpdate
      );
    };
  }, []);

  const handleLogout = async () => {
    try {
      console.log("Logout clicked - clearing all user data...");
      await clearUserData();
      // clearUserData already redirects to homepage, but ensure it happens
    } catch (error) {
      console.error("Error during logout:", error);
      // Fallback: redirect to homepage
      window.location.href = "/";
    }
  };

  const handleProfileClick = () => {
    onMenuChange("settings");
  };

  return (
    <aside className="doctor-sidebar">
      <div className="doctor-sidebar-header">
        <div
          className="doctor-sidebar-logo"
          onClick={() => navigate("/bac-si/trang-chu")}
          style={{ cursor: "pointer" }}
        >
          <div className="doctor-sidebar-logo-icon">
            <Plus className="doctor-sidebar-logo-plus" />
          </div>
          <div className="doctor-sidebar-logo-text">
            <h1 className="doctor-sidebar-title">MedConnect</h1>
            <p className="doctor-sidebar-subtitle">Cổng thông tin bác sĩ</p>
          </div>
        </div>
      </div>

      <div className="doctor-sidebar-profile-section">
        {loading ? (
          <div className="doctor-sidebar-profile">
            <div className="doctor-sidebar-profile-avatar">...</div>
            <div className="doctor-sidebar-profile-info">
              <p className="doctor-sidebar-profile-name">Đang tải...</p>
              <p className="doctor-sidebar-profile-specialty">Bác sĩ</p>
            </div>
          </div>
        ) : (
          <div className="doctor-sidebar-profile" onClick={handleProfileClick}>
            <div className="doctor-sidebar-profile-avatar">
              {doctorInfo?.avatarUrl ? (
                <img
                  src={doctorInfo.avatarUrl}
                  alt={
                    doctorInfo?.userId?.fullName ||
                    doctorInfo?.fullName ||
                    "Bác sĩ"
                  }
                  className="doctor-sidebar-avatar-image"
                />
              ) : (
                <img
                  src="/default-avatar.png"
                  alt={
                    doctorInfo?.userId?.fullName ||
                    doctorInfo?.fullName ||
                    "Bác sĩ"
                  }
                  className="doctor-sidebar-avatar-image"
                />
              )}
            </div>
            <div className="doctor-sidebar-profile-info">
              <p className="doctor-sidebar-profile-name">
                {doctorInfo?.userId?.fullName ||
                  doctorInfo?.fullName ||
                  "Bác sĩ"}
              </p>
              <p className="doctor-sidebar-profile-specialty">
                {doctorInfo?.specializationIds?.[0]?.name || "Bác sĩ"}
              </p>
            </div>
          </div>
        )}
      </div>

      <nav className="doctor-sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeMenu === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onMenuChange(item.id)}
              className={`doctor-sidebar-nav-item ${
                isActive ? "doctor-sidebar-nav-item--active" : ""
              }`}
            >
              <Icon className="doctor-sidebar-nav-icon" />
              <div className="doctor-sidebar-nav-text">
                <span className="doctor-sidebar-nav-label">{item.label}</span>
                <span className="doctor-sidebar-nav-subtitle">
                  {item.subtitle}
                </span>
              </div>
            </button>
          );
        })}
      </nav>

      <div className="doctor-sidebar-footer">
        <button
          onClick={handleLogout}
          className="doctor-sidebar-logout"
          title="Đăng xuất"
        >
          <LogOut className="w-5 h-5" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}
