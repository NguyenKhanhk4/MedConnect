import { useState, useEffect } from "react";
import { Clock, Users, FileText, Upload } from "lucide-react";
import { Card } from "../../../components/ui/Card";
import "./TrangChu.scss";
import {
  api,
  getDoctorProfileWithFallback,
  getDoctorDashboardStatsWithFallback,
} from "../../../lib/api";
import { CustomAlert } from "../../../components/ui/CustomAlert";
import QuanLyLich from "../quan-ly-lich/QuanLyLich";
import LichHen from "../lich-hen/LichHen";
import HoSoKham from "../ho-so-kham/HoSoKham";

export default function TrangChu() {
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);
  const [alertMessage, setAlertMessage] = useState(null);

  // Helper function to show custom alert
  const showAlert = (message) => {
    setAlertMessage(message);
  };

  const doctorAvatar = doctorInfo?.avatarUrl || doctorInfo?.imageUrl;
  const doctorName = doctorInfo?.name || doctorInfo?.fullName || "Doctor";

  // Fetch doctor info and dashboard stats
  useEffect(() => {
    const fetchDoctorData = async () => {
      try {
        // Fetch doctor info
        const doctor = await getDoctorProfileWithFallback();
        if (doctor) {
          setDoctorInfo(doctor);
        } else {
          console.error("No doctor found");
        }

        // Fetch dashboard stats
        const stats = await getDoctorDashboardStatsWithFallback();
        if (stats) setDashboardStats(stats);
      } catch (error) {
        console.error("Error fetching doctor data:", error);
      }
    };

    fetchDoctorData();

    // Listen for doctor profile update event
    const handleDoctorProfileUpdate = (event) => {
      if (event.detail?.doctor) {
        setDoctorInfo(event.detail.doctor);
      } else {
        fetchDoctorData();
      }
    };

    window.addEventListener("doctorProfileUpdated", handleDoctorProfileUpdate);

    return () => {
      window.removeEventListener(
        "doctorProfileUpdated",
        handleDoctorProfileUpdate
      );
    };
  }, []);

  const stats = dashboardStats
    ? [
        {
          label: "Ca khám hôm nay",
          value: dashboardStats.todayAppointmentsCount || "0",
          icon: Clock,
          color: "dashboard-stat-card-teal",
        },
        {
          label: "Slot trống",
          value: dashboardStats.availableSlotsToday || "0",
          icon: Users,
          color: "dashboard-stat-card-teal",
        },
        {
          label: "Lịch hẹn chờ",
          value: dashboardStats.pendingAppointmentsCount || "0",
          icon: FileText,
          color: "dashboard-stat-card-teal",
        },
        {
          label: "Tổng số ca đã hoàn thành",
          value: dashboardStats.completedAppointmentsCount || "0",
          icon: FileText,
          color: "dashboard-stat-card-teal",
        },
      ]
    : [];

  return (
    <div className="doctor-dashboard-container">
      <div className="doctor-main-content">
        <main className="doctor-content-area">
          <div className="dashboard-content-padding">
            <div className="dashboard-main-content">
              <div className="dashboard-stats">
                {stats.map((stat, idx) => {
                  const Icon = stat.icon;
                  return (
                    <div key={idx} className="stat-card">
                      <div className="stat-card-content">
                        <div>
                          <p className="stat-label">{stat.label}</p>
                          <p className="stat-value">{stat.value}</p>
                        </div>
                        <Icon className="stat-icon" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Schedule */}
              {activeMenu === "schedule" && <QuanLyLich />}

              {/* Appointments */}
              {activeMenu === "appointments" && (
                <div className="space-y-6">
                  <LichHen />
                </div>
              )}

              {/* Medical History */}
              {activeMenu === "medical-history" && <HoSoKham />}

              {/* Notifications */}
              {activeMenu === "notifications" && (
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-slate-900">
                    Thông báo hệ thống
                  </h3>
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <p className="text-gray-600">Chưa có thông báo mới</p>
                  </div>
                </div>
              )}

              {/* Reviews */}
              {activeMenu === "reviews" && (
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-slate-900">
                    Đánh giá từ bệnh nhân
                  </h3>
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <p className="text-gray-600">Chưa có đánh giá nào</p>
                  </div>
                </div>
              )}

              {/* Settings */}
              {activeMenu === "settings" && (
                <div className="space-y-6">
                  <Card className="p-6 border-0 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">
                      Cập nhật ảnh đại diện
                    </h3>
                    <div className="flex items-center gap-6">
                      <img
                        src={doctorAvatar || "/placeholder.svg"}
                        alt={doctorName}
                        className="w-24 h-24 rounded-full border-2 border-teal-600"
                      />
                      <label className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg cursor-pointer transition-colors">
                        <Upload className="w-4 h-4" />
                        <span>Chọn ảnh</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                // Validate file size (max 2MB)
                                if (file.size > 2 * 1024 * 1024) {
                                  showAlert(
                                    "Kích thước ảnh không được vượt quá 2MB"
                                  );
                                  return;
                                }

                                // Validate file type
                                if (!file.type.startsWith("image/")) {
                                  showAlert("Vui lòng chọn file ảnh hợp lệ");
                                  return;
                                }

                                // Resize image to reduce size
                                const canvas = document.createElement("canvas");
                                const ctx = canvas.getContext("2d");
                                const img = new Image();

                                img.onload = async () => {
                                  // Calculate new dimensions (max 300x300)
                                  const maxSize = 300;
                                  let { width, height } = img;

                                  if (width > height) {
                                    if (width > maxSize) {
                                      height = (height * maxSize) / width;
                                      width = maxSize;
                                    }
                                  } else {
                                    if (height > maxSize) {
                                      width = (width * maxSize) / height;
                                      height = maxSize;
                                    }
                                  }

                                  canvas.width = width;
                                  canvas.height = height;

                                  // Draw resized image
                                  ctx.drawImage(img, 0, 0, width, height);

                                  // Convert to base64 with quality 0.8
                                  const base64 = canvas.toDataURL(
                                    "image/jpeg",
                                    0.8
                                  );

                                  // Call API to update avatar
                                  await api.put("/api/doctors/me/profile", {
                                    avatarUrl: base64,
                                  });
                                  showAlert(
                                    "Ảnh đại diện đã được cập nhật thành công"
                                  );

                                  // Dispatch custom event to update sidebar
                                  window.dispatchEvent(
                                    new CustomEvent("avatarUpdated")
                                  );

                                  // Refresh doctor data
                                  window.location.reload();
                                };

                                img.src = URL.createObjectURL(file);
                              } catch (error) {
                                console.error("Error updating avatar:", error);
                                showAlert(
                                  "Có lỗi xảy ra khi cập nhật ảnh đại diện"
                                );
                              }
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </Card>
                </div>
              )}

              <Card className="dashboard-info-card">
                <h3 className="dashboard-info-title">Thông tin nhanh</h3>
                <div className="dashboard-info-content">
                  <div>
                    <p className="dashboard-info-label">Lịch hẹn hôm nay</p>
                    <p className="dashboard-info-value">
                      {dashboardStats?.todayAppointmentsCount || "0"} cuộc hẹn
                    </p>
                  </div>
                  <div>
                    <p className="dashboard-info-label">Slot trống</p>
                    <p className="dashboard-info-value">
                      {dashboardStats?.availableSlotsToday || "0"} slot
                    </p>
                  </div>
                  <div>
                    <p className="dashboard-info-label">Chờ xác nhận</p>
                    <p className="dashboard-info-value">
                      {dashboardStats?.pendingAppointmentsCount || "0"} lịch hẹn
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </main>
      </div>

      {/* Custom Alert */}
      <CustomAlert
        message={alertMessage}
        onClose={() => setAlertMessage(null)}
        title="Hệ thống MedConnect"
      />
    </div>
  );
}
