import { useState, useEffect } from "react";
import { Clock, Users, FileText, Upload, Heart, TrendingUp } from "lucide-react";
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

  // Calculate unique patients count, weekly stats, and daily appointments from appointments
  const [totalPatients, setTotalPatients] = useState(0);
  const [upcomingAppointments, setUpcomingAppointments] = useState(0);
  const [todayCompletedAppointments, setTodayCompletedAppointments] = useState(0);
  const [todayUpcomingAppointments, setTodayUpcomingAppointments] = useState(0);
  const [weeklyStats, setWeeklyStats] = useState({
    weeklyAppointments: 0,
    weeklyAvailableSlots: 0,
    weeklyCompleted: 0,
    weeklyCancelled: 0,
  });
  
  useEffect(() => {
    const fetchAppointmentsData = async () => {
      try {
        const appointmentsResponse = await api.get("/api/doctors/me/appointments?limit=1000");
        const appointments = appointmentsResponse?.data?.appointments || appointmentsResponse?.appointments || [];
        
        // Calculate unique patients
        const uniquePatients = new Set(
          appointments
            .map(apt => apt.patientId?._id || apt.patientId)
            .filter(Boolean)
        );
        setTotalPatients(uniquePatients.size);

        // Calculate upcoming appointments (from tomorrow onwards, not today)
        const today = new Date();
        const startOfTomorrow = new Date(today);
        startOfTomorrow.setDate(today.getDate() + 1);
        startOfTomorrow.setHours(0, 0, 0, 0);

        const upcoming = appointments.filter((apt) => {
          const aptDate = new Date(apt.scheduledStart || apt.scheduledDate || apt.createdAt);
          const isUpcoming = aptDate >= startOfTomorrow;
          const isValidStatus = ["accepted", "in_progress"].includes(apt.status);
          return isUpcoming && isValidStatus;
        }).length;

        setUpcomingAppointments(upcoming);

        // Calculate today's completed appointments (status = "done" today)
        // Define todayStart here - will be reused in weekly stats calculation
        const todayStart = new Date(today);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);

        const todayCompleted = appointments.filter((apt) => {
          const aptDate = new Date(apt.scheduledStart || apt.scheduledDate || apt.createdAt);
          const isToday = aptDate >= todayStart && aptDate <= todayEnd;
          return isToday && apt.status === "done";
        }).length;

        setTodayCompletedAppointments(todayCompleted);

        // Calculate today's upcoming appointments (status = "accepted" or "in_progress" today)
        const todayUpcoming = appointments.filter((apt) => {
          const aptDate = new Date(apt.scheduledStart || apt.scheduledDate || apt.createdAt);
          const isToday = aptDate >= todayStart && aptDate <= todayEnd;
          const isValidStatus = ["accepted", "in_progress"].includes(apt.status);
          return isToday && isValidStatus;
        }).length;

        setTodayUpcomingAppointments(todayUpcoming);

        // Calculate weekly stats (from Sunday to Sunday of current week)
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay()); // Go back to Sunday (getDay() = 0 for Sunday)
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7); // Go to next Sunday (7 days after Sunday = end of week)
        weekEnd.setHours(23, 59, 59, 999);

        // todayStart is already defined above, reuse it here

        // Weekly appointments (accepted, in_progress, done, no_show)
        const weeklyAppts = appointments.filter((apt) => {
          const aptDate = new Date(apt.scheduledStart || apt.scheduledDate || apt.createdAt);
          const isThisWeek = aptDate >= weekStart && aptDate <= weekEnd;
          const isValidStatus = ["accepted", "in_progress", "done", "no_show"].includes(apt.status);
          return isThisWeek && isValidStatus;
        }).length;

        // Weekly completed appointments (done status in the week)
        const weeklyCompleted = appointments.filter((apt) => {
          const aptDate = new Date(apt.scheduledStart || apt.scheduledDate || apt.createdAt);
          const isThisWeek = aptDate >= weekStart && aptDate <= weekEnd;
          return isThisWeek && apt.status === "done";
        }).length;

        // Weekly cancelled appointments (cancelled or rejected status in the week)
        const weeklyCancelled = appointments.filter((apt) => {
          const aptDate = new Date(apt.scheduledStart || apt.scheduledDate || apt.createdAt);
          const isThisWeek = aptDate >= weekStart && aptDate <= weekEnd;
          return isThisWeek && (apt.status === "cancelled" || apt.status === "rejected");
        }).length;

        // Fetch weekly available slots from time slots API
        // Only count slots from today onwards (remaining slots in the week)
        let weeklyAvailable = 0;
        try {
          // Format dates as YYYY-MM-DD for API
          const formatDateForAPI = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          };

          // For available slots: only count from today onwards, not past dates
          const startDateStr = formatDateForAPI(todayStart);
          const endDateStr = formatDateForAPI(weekEnd);

          console.log("🔍 Fetching weekly slots (remaining):", { startDateStr, endDateStr, todayStart, weekEnd });

          const slotsResponse = await api.get(
            `/api/doctors/me/time-slots?startDate=${startDateStr}&endDate=${endDateStr}&limit=1000`
          );
          
          console.log("🔍 Slots API response:", slotsResponse);

          // Handle different response formats
          let slots = [];
          if (slotsResponse?.data?.slots && Array.isArray(slotsResponse.data.slots)) {
            slots = slotsResponse.data.slots;
          } else if (slotsResponse?.slots && Array.isArray(slotsResponse.slots)) {
            slots = slotsResponse.slots;
          } else if (slotsResponse?.data?.timeSlots && Array.isArray(slotsResponse.data.timeSlots)) {
            slots = slotsResponse.data.timeSlots;
          } else if (slotsResponse?.timeSlots && Array.isArray(slotsResponse.timeSlots)) {
            slots = slotsResponse.timeSlots;
          } else if (slotsResponse?.data && Array.isArray(slotsResponse.data)) {
            slots = slotsResponse.data;
          } else if (Array.isArray(slotsResponse)) {
            slots = slotsResponse;
          }
          
          console.log("🔍 Extracted slots:", slots.length, slots.slice(0, 2));
          
          // Get booked slot IDs from appointments
          const bookedSlotIds = new Set(
            appointments
              .filter((apt) => {
                const aptDate = new Date(apt.scheduledStart || apt.scheduledDate || apt.createdAt);
                const isThisWeek = aptDate >= weekStart && aptDate <= weekEnd;
                const isBooked = ["accepted", "in_progress", "done", "pending_doctor"].includes(apt.status);
                return isThisWeek && isBooked && apt.slotId;
              })
              .map((apt) => apt.slotId?.toString())
              .filter(Boolean)
          );

          console.log("🔍 Booked slot IDs:", bookedSlotIds.size, Array.from(bookedSlotIds).slice(0, 3));

          // Count slots that are available and not booked
          // Count slots from today (including today) to end of week (Saturday)
          weeklyAvailable = slots.filter((slot) => {
            const slotIdStr = slot._id?.toString();
            const slotDate = new Date(slot.startAt || slot.createdAt);
            
            // Compare dates only (ignore time) - get date part only
            const slotDateOnly = new Date(slotDate.getFullYear(), slotDate.getMonth(), slotDate.getDate());
            const todayDateOnly = new Date(todayStart.getFullYear(), todayStart.getMonth(), todayStart.getDate());
            const weekEndDateOnly = new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate());
            
            // Skip past slots (before today) - chỉ skip nếu là ngày hôm qua trở về trước
            if (slotDateOnly < todayDateOnly) {
              return false;
            }
            
            // Skip slots after this week (after Saturday) - chỉ skip nếu sau Thứ 7
            if (slotDateOnly > weekEndDateOnly) {
              return false;
            }
            
            // Only count slots with status "available" (exclude "blocked", "booked")
            if (slot.status !== "available") {
              return false;
            }
            
            // Skip slots that are already booked
            const isNotBooked = !bookedSlotIds.has(slotIdStr);
            if (!isNotBooked) {
              return false;
            }
            
            return true;
          }).length;

          console.log("✅ Weekly slots calculation:", {
            totalSlots: slots.length,
            bookedSlots: bookedSlotIds.size,
            availableSlots: weeklyAvailable,
            startDate: startDateStr,
            endDate: endDateStr,
          });
        } catch (slotsError) {
          console.error("❌ Error fetching time slots:", slotsError);
          // Fallback: count cancelled/rejected appointments as available slots
          weeklyAvailable = appointments.filter((apt) => {
            const aptDate = new Date(apt.scheduledStart || apt.scheduledDate || apt.createdAt);
            const isThisWeek = aptDate >= weekStart && aptDate <= weekEnd;
            return isThisWeek && (apt.status === "cancelled" || apt.status === "rejected");
          }).length;
          console.log("⚠️ Using fallback calculation:", weeklyAvailable);
        }

        setWeeklyStats({
          weeklyAppointments: weeklyAppts,
          weeklyAvailableSlots: weeklyAvailable,
          weeklyCompleted: weeklyCompleted,
          weeklyCancelled: weeklyCancelled,
        });
      } catch (error) {
        console.error("Error fetching appointments data:", error);
      }
    };
    if (doctorInfo) {
      fetchAppointmentsData();
    }
  }, [doctorInfo]);

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Chào buổi sáng";
    if (hour < 18) return "Chào buổi chiều";
    return "Chào buổi tối";
  };

  const stats = dashboardStats
    ? [
        {
          label: "Cả tuần",
          description: "Lịch hẹn cả tuần",
          value: weeklyStats.weeklyAppointments.toString(),
          icon: Clock,
          color: "blue",
        },
        {
          label: "Slot trống",
          description: "Thời gian khả dụng",
          value: weeklyStats.weeklyAvailableSlots.toString(),
          icon: TrendingUp,
          color: "teal",
        },
        {
          label: "Lịch hẹn đã hoàn thành",
          description: "Cả tuần",
          value: weeklyStats.weeklyCompleted.toString(),
          icon: FileText,
          color: "cyan",
        },
        {
          label: "Lịch hẹn đã bị hủy",
          description: "Cả tuần",
          value: weeklyStats.weeklyCancelled.toString(),
          icon: Users,
          color: "sky",
        },
      ]
    : [];

  return (
    <div className="doctor-dashboard-container">
      <div className="doctor-main-content">
        <main className="doctor-content-area">
          <div className="dashboard-content-padding">
            <div className="dashboard-main-content">
              {/* Header Banner */}
              <div className="dashboard-header-banner">
                <div className="banner-content">
                  <div className="banner-greeting">
                    <p className="banner-subtitle">Xin chào trở lại!</p>
                    <h1 className="banner-title">
                      {getGreeting()}, <span className="banner-title-name">Bác sĩ</span>
                    </h1>
                  </div>
                  <Heart className="banner-heart-icon" />
                </div>
                <div className="banner-wish-box">
                  <p className="wish-label">✨ Lời chúc hôm nay</p>
                  <p className="wish-message">
                    Chúc bạn một ngày tràn đầy sức khỏe, năng lượng và niềm vui. Hãy chăm sóc bản thân để có thể chăm sóc những người khác tốt hơn! 💪
                  </p>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="dashboard-stats">
                {stats.map((stat, idx) => {
                  const Icon = stat.icon;
                  return (
                    <Card key={idx} className={`stat-card stat-card-${stat.color}`}>
                      <div className="stat-card-background-icon">
                        <Icon className="stat-bg-icon" />
                      </div>
                      <div className="stat-card-content">
                        <div className="stat-text-content">
                          <p className="stat-label">{stat.label}</p>
                          <p className="stat-value">{stat.value}</p>
                          <p className="stat-description">{stat.description}</p>
                        </div>
                        <div className="stat-icon-bottom">
                          <Icon className="stat-small-icon" />
                        </div>
                      </div>
                    </Card>
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
                <div className="dashboard-info-header-wrapper">
                  <div className="dashboard-info-header">
                    <div className="dashboard-info-icon-wrapper">
                      <FileText className="dashboard-info-icon" />
                    </div>
                    <div>
                      <h2 className="dashboard-info-title">Thông tin nhanh</h2>
                      <p className="dashboard-info-subtitle">Tổng quan hoạt động hôm nay của bạn</p>
                    </div>
                  </div>
                </div>
                <div className="dashboard-info-content">
                  <div className="info-item-card">
                    <p className="dashboard-info-label">Lịch hẹn hôm nay</p>
                    <p className="dashboard-info-value dashboard-info-value-blue">
                      {dashboardStats?.todayAppointmentsCount || "0"}
                    </p>
                    <p className="dashboard-info-note">{dashboardStats?.todayAppointmentsCount || "0"} cuộc hẹn</p>
                  </div>
                  <div className="info-item-card">
                    <p className="dashboard-info-label">Lịch hẹn đã hoàn thành</p>
                    <p className="dashboard-info-value dashboard-info-value-cyan">
                      {todayCompletedAppointments}
                    </p>
                    <p className="dashboard-info-note">Trong ngày</p>
                  </div>
                  <div className="info-item-card">
                    <p className="dashboard-info-label">Lịch hẹn sắp tới</p>
                    <p className="dashboard-info-value dashboard-info-value-teal">
                      {todayUpcomingAppointments}
                    </p>
                    <p className="dashboard-info-note">Trong ngày</p>
                  </div>
                  <div className="info-item-card">
                    <p className="dashboard-info-label">Bệnh nhân</p>
                    <p className="dashboard-info-value dashboard-info-value-sky">
                      {totalPatients}
                    </p>
                    <p className="dashboard-info-note">Tất cả</p>
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
