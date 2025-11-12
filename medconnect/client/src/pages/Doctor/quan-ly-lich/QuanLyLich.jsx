import React, { useState, useEffect } from "react";
import {
  Clock,
  Send,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Calendar,
  Filter,
  RefreshCw,
  Phone,
  User,
  MessageSquare,
} from "lucide-react";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/Dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/Select";
import { auth } from "../../../lib/firebase";
import { getDoctorTimeSlots, createLeaveRequest } from "../../../lib/api";
import { CustomAlert } from "../../../components/ui/CustomAlert";
import "./QuanLyLich.scss";

export default function QuanLyLich() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [authUser, setAuthUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timeSlots, setTimeSlots] = useState([]);

  // Leave request states
  const [showLeaveRequest, setShowLeaveRequest] = useState(false);
  const [leaveData, setLeaveData] = useState({
    startDate: "",
    endDate: "",
    reason: "",
  });

  // Slot action menu state
  const [showSlotActionMenu, setShowSlotActionMenu] = useState(false);
  const [actionMenuSlot, setActionMenuSlot] = useState(null);

  // Block slot with reason dialog state
  const [showBlockSlotDialog, setShowBlockSlotDialog] = useState(false);
  const [blockSlotReason, setBlockSlotReason] = useState("");

  // Block detail dialog state
  const [showBlockDetailDialog, setShowBlockDetailDialog] = useState(false);

  // Booking states
  const [showBookSlot, setShowBookSlot] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null); // Ngày được chọn khi click ô trống
  const [selectedTime, setSelectedTime] = useState(null); // Giờ được chọn khi click ô trống
  const [bookingData, setBookingData] = useState({
    patientName: "",
    patientPhone: "",
    reason: "",
    mode: "online", // Hình thức khám: online hoặc offline
  });

  // Appointment detail modal states
  const [showAppointmentDetail, setShowAppointmentDetail] = useState(false);
  const [selectedAppointmentDetail, setSelectedAppointmentDetail] =
    useState(null);
  const [loadingAppointmentDetail, setLoadingAppointmentDetail] =
    useState(false);
  const [alertMessage, setAlertMessage] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState(null);

  // Helper function to show custom alert
  const showAlert = (message) => {
    setAlertMessage(message);
  };

  // Helper function to show custom confirm
  const showConfirm = (message, onConfirm) => {
    setConfirmConfig({
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmConfig(null);
      },
      onCancel: () => setConfirmConfig(null),
    });
  };

  // Listen to authentication changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setAuthUser(user);
    });

    // Listen for logout events
    const handleLogout = () => {
      setAuthUser(null);
    };

    window.addEventListener("userLoggedOut", handleLogout);

    return () => {
      unsubscribe();
      window.removeEventListener("userLoggedOut", handleLogout);
    };
  }, []);

  // Load time slots when authUser or currentDate changes
  useEffect(() => {
    if (authUser) {
      loadTimeSlots();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser, currentDate]);

  // Navigation functions
  const navigateWeek = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + direction * 7);
    setCurrentDate(newDate);
  };

  const getWeekStart = (date) => {
    const start = new Date(date);
    const day = start.getDay(); // 0 = Chủ nhật, 1 = Thứ 2, ..., 6 = Thứ 7
    // Tính ngày Thứ 2 của tuần (Thứ 2 = 1)
    const diff = start.getDate() - day + 1; // Thứ 2 là ngày đầu tuần
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    return start;
  };

  const getWeekRange = () => {
    const start = getWeekStart(currentDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    };
  };

  const getWeekDays = () => {
    const start = getWeekStart(currentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);

      // Sử dụng cùng timezone để tránh mismatch
      const year = day.getFullYear();
      const month = String(day.getMonth() + 1).padStart(2, "0");
      const date = String(day.getDate()).padStart(2, "0");
      const fullDate = `${year}-${month}-${date}`;

      const dayInfo = {
        name: day.toLocaleDateString("vi-VN", { weekday: "short" }),
        date: day.toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
        }),
        fullDate: fullDate, // Sử dụng cùng format với API
        isToday: day.getTime() === today.getTime(),
        isPast: day < today,
      };
      days.push(dayInfo);
    }
    return days;
  };

  const formatDateRange = () => {
    const startDate = getWeekStart(currentDate).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const endDate = new Date(
      getWeekStart(currentDate).getTime() + 6 * 24 * 60 * 60 * 1000
    ).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    return `${startDate} - ${endDate}`;
  };

  const loadTimeSlots = async () => {
    try {
      setLoading(true);
      const weekRange = getWeekRange();
      const response = await getDoctorTimeSlots({
        startDate: weekRange.startDate,
        endDate: weekRange.endDate,
        limit: 1000, // Tăng limit để lấy đủ slot
      });

      console.log("🔍 Load time slots response:", response);
      console.log("🔍 Response structure:", {
        success: response.success,
        hasData: !!response.data,
        hasSlots: !!(response.data && response.data.slots),
        slotsLength: response.data?.slots?.length || 0,
        slotsType: typeof response.data?.slots,
        isArray: Array.isArray(response.data?.slots),
        fullResponse: response,
      });

      // Kiểm tra nhiều format response có thể có
      let slots = [];
      if (response.success && response.data && response.data.slots) {
        slots = response.data.slots;
        console.log("🔍 Using response.data.slots format");
      } else if (response.slots) {
        slots = response.slots;
        console.log("🔍 Using response.slots format");
      } else if (response.data && Array.isArray(response.data)) {
        slots = response.data;
        console.log("🔍 Using response.data array format");
      } else if (Array.isArray(response)) {
        slots = response;
        console.log("🔍 Using direct array format");
      }

      console.log("🔍 Extracted slots:", slots);
      console.log("🔍 Slots count:", slots.length);

      if (slots && slots.length > 0) {
        console.log("🔍 Time slots loaded:", slots);
        setTimeSlots(slots);
      } else {
        console.log("🔍 No slots found in any format");
        setTimeSlots([]);
      }
    } catch (error) {
      console.error("❌ Error loading time slots:", error);
      setTimeSlots([]);
    } finally {
      setLoading(false);
    }
  };

  // Processed slots for display - chỉ hiển thị slot thực sự có trong database
  const processedSlots = React.useMemo(() => {
    const slotsMap = {};
    const timesSet = new Set(); // Để collect tất cả times từ slots

    console.log("🔍 Processing slots:", timeSlots);

    // Chỉ thêm slot thật từ database vào map
    timeSlots.forEach((slot) => {
      console.log("🔍 Processing slot:", {
        id: slot._id,
        startAt: slot.startAt,
        status: slot.status,
        patientName: slot.patientName,
        hasPatientName: !!slot.patientName,
        appointmentId: slot.appointmentId || "NULL - Không có appointment",
      });

      const slotDate = new Date(slot.startAt).toISOString().split("T")[0];
      const slotTime = new Date(slot.startAt).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      // Filter out times >= 17:00
      const hour = parseInt(slotTime.split(":")[0]);
      if (hour >= 17) {
        console.log(`🔍 Skipping slot at ${slotTime} (hour >= 17)`);
        return; // Skip slots >= 17:00
      }

      // Thêm time vào set để tạo danh sách times
      timesSet.add(slotTime);

      // Khởi tạo map cho ngày nếu chưa có
      if (!slotsMap[slotDate]) {
        slotsMap[slotDate] = {};
      }

      console.log("🔍 Slot mapping:", {
        slotDate,
        slotTime,
        existsInMap: !!(slotsMap[slotDate] && slotsMap[slotDate][slotTime]),
      });

      // Nếu slot đã hủy, xử lý như slot trống (available) - không hiển thị thông tin appointment
      const mappedSlot = {
        id: slot._id,
        startAt: slot.startAt,
        endAt: slot.endAt,
        status: slot.status === "cancelled" ? "available" : slot.status,
        patientName: slot.status === "cancelled" ? null : (slot.patientName || null),
        reason: slot.status === "cancelled" ? null : (slot.reason || null),
        mode: slot.status === "cancelled" ? null : (slot.mode || null),
        appointmentId: slot.status === "cancelled" ? null : (slot.appointmentId || null),
        rescheduledFromId: slot.status === "cancelled" ? null : (slot.rescheduledFromId || null), // Flag to identify rescheduled appointments
        leaveReason: slot.status === "cancelled" ? null : (slot.leaveReason || null), // Lý do nghỉ
        hasPendingLeaveRequest: slot.status === "cancelled" ? false : (slot.hasPendingLeaveRequest || false), // Flag leave request đang pending
        isEmpty: false,
      };

      // Nếu đã có slot ở cùng time, ưu tiên slot có appointment
      if (slotsMap[slotDate][slotTime]) {
        const existingSlot = slotsMap[slotDate][slotTime];
        const existingHasAppointment =
          existingSlot.appointmentId || existingSlot.status !== "available";
        const newHasAppointment =
          mappedSlot.appointmentId || mappedSlot.status !== "available";

        // Nếu slot mới có appointment và slot cũ không có, thay thế
        if (newHasAppointment && !existingHasAppointment) {
          console.log(
            `🔄 Replacing slot at ${slotTime} for date ${slotDate} (new has appointment)`
          );
          slotsMap[slotDate][slotTime] = mappedSlot;
        } else if (!newHasAppointment && existingHasAppointment) {
          console.log(
            `⏭️ Keeping existing slot at ${slotTime} for date ${slotDate} (existing has appointment)`
          );
          // Giữ slot cũ
        } else {
          // Cả hai đều có hoặc không có appointment, giữ slot đầu tiên
          console.log(
            `⚠️ Duplicate slot time found: ${slotTime} for date: ${slotDate}, keeping first`
          );
        }
      } else {
        // Chưa có slot, thêm mới
        slotsMap[slotDate][slotTime] = mappedSlot;

        // Log for booked slots
        if (
          slot.status === "booked" ||
          slot.status === "pending" ||
          slot.status === "confirmed" ||
          slot.status === "completed" ||
          slot.status === "in_progress"
        ) {
          console.log("✅ Booked slot mapped:", {
            slotId: slot._id,
            date: slotDate,
            time: slotTime,
            patientName: mappedSlot.patientName,
            mode: mappedSlot.mode,
            status: mappedSlot.status,
          });
        }
      }
    });

    console.log("🔍 Processed slots map:", slotsMap);
    console.log("🔍 All unique times found:", Array.from(timesSet).sort());
    return { slotsMap, timesSet };
  }, [timeSlots, currentDate]);

  // Extract unique times from processed slots - chỉ lấy từ database
  const timeSlotsList = React.useMemo(() => {
    const times = Array.from(processedSlots.timesSet || []).sort();
    console.log("🔍 Extracted unique times from processed slots:", times);
    return times;
  }, [processedSlots]);

  // Lấy danh sách ngày trong tuần (hiển thị đủ 7 ngày)
  const daysWithSlots = React.useMemo(() => {
    return getWeekDays();
  }, [currentDate]);

  // Lấy danh sách giờ làm việc (hiển thị đủ giờ)
  const timesWithSlots = React.useMemo(() => {
    console.log("🔍 timesWithSlots from timeSlotsList:", timeSlotsList);
    return timeSlotsList;
  }, [timeSlotsList]);

  const getStatusColor = (status) => {
    switch (status) {
      case "available":
        return "#f3f4f6"; // Màu xám nhạt cho slot trống
      case "pending":
        return "#fbbf24"; // Màu vàng cho chờ duyệt
      case "confirmed":
        return "#10b981"; // Màu xanh lá cho đã xác nhận
      case "in_progress":
        return "#3b82f6"; // Màu xanh dương cho đang diễn ra
      case "cancelled":
        return "#ef4444"; // Màu đỏ cho đã hủy
      case "completed":
        return "#3b82f6"; // Màu xanh dương cho hoàn thành
      case "booked":
        return "#10b981"; // Màu xanh lá cho đã đặt (tương tự confirmed)
      case "blocked":
        return "#6b7280"; // Màu xám cho bị chặn
      default:
        return "#6b7280";
    }
  };

  const getStatusText = (
    status,
    hasPendingLeaveRequest = false,
    rescheduledFromId = null
  ) => {
    if (!status) return "Không xác định";

    // Nếu slot này từ appointment đã dời lịch, hiển thị "Đã dời lịch" (ưu tiên cao nhất)
    if (rescheduledFromId) {
      return "Đã dời lịch";
    }

    // Nếu có leave request đang pending, hiển thị "Lịch nghỉ đang xét duyệt" (bất kể status)
    // Trừ khi status là "blocked" (đã được approve) hoặc có appointment
    if (
      hasPendingLeaveRequest &&
      status !== "blocked" &&
      status !== "pending" &&
      status !== "pending_doctor" &&
      status !== "confirmed" &&
      status !== "in_progress" &&
      status !== "completed" &&
      status !== "booked"
    ) {
      return "Lịch nghỉ đang xét duyệt";
    }

    // Nếu có leave request pending và status là pending, hiển thị "Lịch nghỉ đang xét duyệt"
    if (
      hasPendingLeaveRequest &&
      (status === "pending" || status === "pending_doctor")
    ) {
      return "Lịch nghỉ đang xét duyệt";
    }

    switch (status) {
      // Status từ appointment model
      case "pending_doctor":
        return "Chờ duyệt";
      case "accepted":
        return "Đã xác nhận";
      case "rejected":
        return "Đã từ chối";
      case "in_progress":
        return "Đang diễn ra";
      case "cancelled":
        return "Đã hủy";
      case "done":
        return "Hoàn thành";
      case "no_show":
        return "Không đến";
      case "rescheduled":
        return "Đã dời lịch";

      // Status từ slot (backward compatibility)
      case "available":
        // Nếu có leave request pending, hiển thị "Lịch nghỉ đang xét duyệt" thay vì "Trống"
        if (hasPendingLeaveRequest) {
          return "Lịch nghỉ đang xét duyệt";
        }
        return "Trống";
      case "pending":
        return "Chờ duyệt";
      case "confirmed":
        // Nếu có rescheduledFromId, hiển thị "Đã dời lịch" thay vì "Đã xác nhận"
        if (rescheduledFromId) {
          return "Đã dời lịch";
        }
        return "Đã xác nhận";
      case "completed":
        return "Hoàn thành";
      case "booked":
        // Nếu có rescheduledFromId, hiển thị "Đã dời lịch" thay vì "Đã đặt"
        if (rescheduledFromId) {
          return "Đã dời lịch";
        }
        return "Đã đặt";
      case "blocked":
        return "Bác sĩ nghỉ";

      default: {
        console.warn("Unknown status:", status);
        return "Không xác định";
      }
    }
  };

  const getStatusDotColor = (status) => {
    switch (status) {
      case "pending":
        return "#fbbf24"; // Chấm vàng
      case "confirmed":
        return "#10b981"; // Chấm xanh lá
      case "in_progress":
        return "#3b82f6"; // Chấm xanh dương
      case "cancelled":
        return "#ef4444"; // Chấm đỏ
      case "completed":
        return "#3b82f6"; // Chấm xanh dương
      case "booked":
        return "#10b981"; // Chấm xanh lá cho đã đặt
      default:
        return "#6b7280";
    }
  };

  const handleSlotClick = async (slot, event) => {
    if (!slot) return;

    // Nếu slot blocked, hiển thị chi tiết lý do nghỉ
    if (slot.status === "blocked") {
      setSelectedSlot(slot);
      setShowBlockDetailDialog(true);
      return;
    }

    // Check if right-click (context menu)
    if (event && event.button === 2) {
      event.preventDefault();
      event.stopPropagation();

      // Right-click on available slot -> mở dialog nhập lý do
      if (slot.status === "available") {
        setActionMenuSlot(slot);
        setShowBlockSlotDialog(true);
        setBlockSlotReason("");
        return;
      }
      return;
    }

    // Nếu slot available, mở trực tiếp dialog đăng ký nghỉ
    if (slot.status === "available") {
      setActionMenuSlot(slot);
      setShowBlockSlotDialog(true);
      setBlockSlotReason("");
      return;
    }

    // Nếu có appointment, mở modal chi tiết
    if (slot.appointmentId) {
      setLoadingAppointmentDetail(true);
      setShowAppointmentDetail(true);

      try {
        const apiModule = await import("../../../lib/api");
        const response = await apiModule.api.get(
          `/api/doctors/me/appointments/${slot.appointmentId}`
        );

        console.log("🔍 Appointment detail response:", response);

        if (response.success) {
          console.log("🔍 Appointment data:", {
            status: response.data?.status,
            mode: response.data?.mode,
            reason: response.data?.reason,
            patientId: response.data?.patientId,
            fullData: response.data,
          });
          setSelectedAppointmentDetail(response.data);
        } else {
          console.error("❌ Failed to fetch appointment:", response);
          showAlert("Không thể tải thông tin chi tiết lịch hẹn");
          setShowAppointmentDetail(false);
        }
      } catch (error) {
        console.error("❌ Error fetching appointment detail:", error);
        showAlert("Có lỗi xảy ra khi tải thông tin");
        setShowAppointmentDetail(false);
      } finally {
        setLoadingAppointmentDetail(false);
      }
    }
  };

  const handleLeaveRequest = async () => {
    if (!leaveData.startDate || !leaveData.endDate) {
      showAlert("Vui lòng chọn ngày bắt đầu và ngày kết thúc!");
      return;
    }

    try {
      console.log("Leave request:", leaveData);
      const response = await blockSlotsByDateRange(
        leaveData.startDate,
        leaveData.endDate,
        leaveData.reason || ""
      );

      if (response.success) {
        showAlert(
          `✅ Đã chặn ${response.data.blockedSlots} slot từ ${leaveData.startDate} đến ${leaveData.endDate}`
        );
        setShowLeaveRequest(false);
        setLeaveData({ startDate: "", endDate: "", reason: "" });
        await loadTimeSlots(); // Reload to show blocked slots
      } else {
        showAlert("❌ Lỗi khi chặn slot: " + (response.message || "Unknown error"));
      }
    } catch (error) {
      console.error("❌ Error blocking slots:", error);
      showAlert("❌ Lỗi khi chặn slot: " + error.message);
    }
  };

  // Handler khi chọn "Đặt lịch khám" từ menu
  const handleBookSlotFromMenu = () => {
    if (actionMenuSlot) {
      setSelectedSlot(actionMenuSlot);
      setShowSlotActionMenu(false);
      setShowBookSlot(true);
      setActionMenuSlot(null);
    }
  };

  // Handler khi chọn "Đăng ký nghỉ" từ menu
  const handleBlockSlotFromMenu = () => {
    if (!actionMenuSlot) return;
    // Mở dialog nhập lý do
    setShowSlotActionMenu(false);
    setShowBlockSlotDialog(true);
    setBlockSlotReason("");
  };

  // Handler khi xác nhận tạo leave request
  const handleConfirmBlockSlot = async () => {
    if (!blockSlotReason.trim()) {
      showAlert("Vui lòng nhập lý do nghỉ!");
      return;
    }

    if (!actionMenuSlot) return;

    try {
      const slotId = actionMenuSlot?._id || actionMenuSlot?.id;
      if (!slotId) {
        showAlert("Không tìm thấy thông tin slot cần nghỉ");
        return;
      }

      const response = await createLeaveRequest(slotId, blockSlotReason.trim());

      if (response.success) {
        showAlert(
          `✅ Đã gửi yêu cầu nghỉ phép thành công! Vui lòng chờ manager phê duyệt.`
        );
        setShowBlockSlotDialog(false);
        setActionMenuSlot(null);
        setBlockSlotReason("");
        await loadTimeSlots();
      } else {
        showAlert(
          "Không thể gửi yêu cầu nghỉ phép: " +
            (response.message || "Unknown error")
        );
      }
    } catch (error) {
      console.error("❌ Error creating leave request:", error);
      showAlert("Có lỗi xảy ra khi gửi yêu cầu nghỉ phép: " + error.message);
    }
  };

  const handleBookSlot = async () => {
    if (
      !bookingData.patientName ||
      !bookingData.patientPhone ||
      !bookingData.reason
    ) {
      showAlert("Vui lòng điền đầy đủ thông tin!");
      return;
    }

    try {
      // Tính toán scheduledStart và scheduledEnd từ selectedDate và selectedTime
      let scheduledStart, scheduledEnd;
      let slotId = null;

      if (selectedSlot) {
        // Nếu có selectedSlot (click vào slot available)
        scheduledStart = selectedSlot.startAt;
        scheduledEnd = selectedSlot.endAt;
        slotId = selectedSlot.id || selectedSlot._id;
      } else if (selectedDate && selectedTime) {
        // Nếu click vào ô trống (không có slot)
        const [hour, minute] = selectedTime.split(":").map(Number);
        const startDateTime = new Date(
          `${selectedDate}T${String(hour).padStart(2, "0")}:${String(
            minute
          ).padStart(2, "0")}:00`
        );
        const endDateTime = new Date(startDateTime);
        endDateTime.setMinutes(endDateTime.getMinutes() + 20); // Slot 20 phút

        scheduledStart = startDateTime.toISOString();
        scheduledEnd = endDateTime.toISOString();

        // Tìm slot trong timeSlots nếu có
        const foundSlot = timeSlots.find((slot) => {
          const slotDate = new Date(slot.startAt);
          return (
            slotDate.toISOString().split("T")[0] === selectedDate &&
            slotDate.getHours() === hour &&
            slotDate.getMinutes() === minute
          );
        });

        if (foundSlot) {
          slotId = foundSlot.id || foundSlot._id;
        }
      } else {
        showAlert("Thiếu thông tin ngày/giờ. Vui lòng thử lại!");
        return;
      }

      // Tìm hoặc tạo patient profile từ số điện thoại
      const apiModule = await import("../../../lib/api");

      // Tạo/tìm patient và appointment
      const appointmentData = {
        slotId: slotId, // Có thể null, backend sẽ tự tạo slot
        patientName: bookingData.patientName,
        patientPhone: bookingData.patientPhone,
        reason: bookingData.reason,
        mode: bookingData.mode,
        scheduledStart: scheduledStart,
        scheduledEnd: scheduledEnd,
      };

      console.log("🔍 Creating appointment:", appointmentData);

      // Gọi API để tạo appointment (cần tạo endpoint riêng cho doctor)
      const response = await apiModule.api.post(
        "/api/doctors/me/appointments/create",
        appointmentData
      );

      if (response.success) {
        showAlert("Đặt lịch thành công!");
        setShowBookSlot(false);
        setBookingData({
          patientName: "",
          patientPhone: "",
          reason: "",
          mode: "online",
        });
        setSelectedSlot(null);
        setSelectedDate(null);
        setSelectedTime(null);
        await loadTimeSlots();
      } else {
        showAlert("Lỗi khi đặt lịch: " + (response.message || "Unknown error"));
      }
    } catch (error) {
      console.error("❌ Error booking slot:", error);
      showAlert("Có lỗi xảy ra khi đặt lịch: " + error.message);
    }
  };

  // Hàm xử lý gọi video - MỞ SANG TAB MỚI
  const handleVideoCall = async (slot) => {
    console.log("🎥🎥🎥 handleVideoCall - Called with slot:", slot);
    console.log(
      "🎥🎥🎥 handleVideoCall - Slot data:",
      JSON.stringify(slot, null, 2)
    );

    try {
      // Sử dụng appointmentId từ slot (đã được populate từ backend)
      if (!slot || !slot.appointmentId) {
        console.error("❌❌❌ handleVideoCall - No slot or appointmentId");
        showAlert(
          `Không tìm thấy lịch hẹn cho slot này. Slot ID: ${
            slot?.id || "Không có"
          }, Patient: ${slot?.patientName || "Không có"}`
        );
        return;
      }

      console.log(
        "✅✅✅ handleVideoCall - Found appointment ID from slot:",
        slot.appointmentId
      );

      const apiModule = await import("../../../lib/api");
      const VideoCallAPI = await import("../../../services/videoCallAPI");
      console.log("✅✅✅ handleVideoCall - APIs imported");

      console.log(
        "🔍🔍🔍 handleVideoCall - Updating appointment status to in_progress..."
      );
      // Step 1: Update appointment status to "in_progress" (only if not already in_progress)
      try {
        const statusUrl = `/api/doctors/me/appointments/${slot.appointmentId}/status`;
        console.log("🔍🔍🔍 handleVideoCall - Calling PUT:", statusUrl);

        const response = await apiModule.api.put(statusUrl, {
          status: "in_progress",
        });

        console.log(
          "🔍🔍🔍 handleVideoCall - Status update response:",
          response
        );

        if (response.success) {
          console.log(
            "✅✅✅ handleVideoCall - Appointment status updated to in_progress"
          );
        } else {
          // If status is already in_progress, continue anyway
          if (
            response.message?.includes(
              "Invalid status transition from in_progress"
            )
          ) {
            console.log(
              "ℹ️ℹ️ℹ️ handleVideoCall - Appointment already in_progress, continuing..."
            );
          } else {
            console.error(
              "❌❌❌ handleVideoCall - Status update failed:",
              response
            );
          }
        }
      } catch (statusError) {
        console.error(
          "❌❌❌ handleVideoCall - Error updating appointment status:",
          statusError
        );
        // If error is about already being in_progress, continue anyway
        if (
          statusError.message?.includes(
            "Invalid status transition from in_progress"
          )
        ) {
          console.log(
            "ℹ️ℹ️ℹ️ handleVideoCall - Appointment already in_progress, continuing..."
          );
        } else {
          console.error(
            "❌❌❌ handleVideoCall - Error details:",
            statusError.message,
            statusError.stack
          );
        }
      }

      console.log("🔍🔍🔍 handleVideoCall - Creating video call room...");
      // Step 2: Create video call room
      try {
        console.log(
          "🔍🔍🔍 handleVideoCall - Calling VideoCallAPI.createRoom with:",
          slot.appointmentId
        );
        const videoCallResponse = await VideoCallAPI.default.createRoom(
          slot.appointmentId
        );
        console.log(
          "✅✅✅ handleVideoCall - Video call room created:",
          videoCallResponse
        );
      } catch (videoCallError) {
        console.error(
          "❌❌❌ handleVideoCall - Error creating video call room:",
          videoCallError
        );
        console.error(
          "❌❌❌ handleVideoCall - Error details:",
          videoCallError.message,
          videoCallError.stack
        );
        // Continue even if video call creation fails - will be created when page loads
      }

      console.log("🔍🔍🔍 handleVideoCall - Reloading time slots...");
      // Reload time slots to reflect status change
      await loadTimeSlots();

      console.log("🔍🔍🔍 handleVideoCall - Opening video call window...");
      // Mở video call trong TAB MỚI thay vì thay đổi trang hiện tại
      window.open(`/bac-si/video-call/${slot.appointmentId}`, "_blank");
      console.log("✅✅✅ handleVideoCall - Video call window opened");
    } catch (error) {
      console.error("❌❌❌ handleVideoCall - Unexpected error:", error);
      console.error(
        "❌❌❌ handleVideoCall - Error details:",
        error.message,
        error.stack
      );
      showAlert(`Lỗi khi bắt đầu cuộc gọi video: ${error.message}`);
    }
  };

  // Removed: handleDeleteSlot - doctors can no longer delete slots
  const _handleDeleteSlot_removed = async (slot) => {
    // Check for slot ID (could be _id or id depending on mapping)
    const slotId = slot?._id || slot?.id;
    if (!slot || !slotId) {
      showAlert("Không tìm thấy thông tin slot cần xóa");
      return;
    }

    // Confirm delete
    showConfirm(
      "Bạn có chắc chắn muốn xóa slot này? Slot có appointment sẽ không thể xóa.",
      async () => {

    try {
      console.log("🗑️ Deleting slot:", slotId);
      const response = await deleteTimeSlot(slotId);

        if (response.success) {
          showAlert("Xóa slot thành công!");
          await loadTimeSlots(); // Reload time slots
        } else {
          showAlert("Không thể xóa slot: " + (response.message || "Unknown error"));
        }
      } catch (error) {
        console.error("❌ Error deleting slot:", error);
        showAlert("Có lỗi xảy ra khi xóa slot: " + error.message);
      }
    });
  };

  if (!authUser) {
    return (
      <div className="schedule-management">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="schedule-management">
      <div className="schedule-header">
        <div className="header-left">
          <h1>
            <Calendar className="icon" />
            Lịch làm việc
          </h1>
          <div className="week-navigation">
            <span>Tuần:</span>
            <button className="nav-arrow" onClick={() => navigateWeek(-1)}>
              &lt;
            </button>
            <span className="date-range">{formatDateRange()}</span>
            <button className="nav-arrow" onClick={() => navigateWeek(1)}>
              &gt;
            </button>
          </div>
        </div>

        <div className="header-right">
          <div className="action-buttons">
            <Button
              onClick={() => setShowLeaveRequest(true)}
              className="leave-btn"
            >
              📅 Lịch nghỉ
            </Button>
            <Button
              onClick={() => setCurrentDate(new Date())}
              className="today-btn"
            >
              🏠 Hôm nay
            </Button>
            <Button
              onClick={() => window.location.reload()}
              className="refresh-btn"
            >
              <RefreshCw size={16} />
            </Button>
          </div>
        </div>
      </div>

      <div className="schedule-content">
        {loading && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <p>Đang tải lịch làm việc...</p>
          </div>
        )}

        {/* Hiển thị thông báo khi không có slot nào trong tuần */}
        {!loading && timeSlotsList.length === 0 && (
          <div className="no-slots-message">
            <div className="empty-state">
              <Calendar size={64} className="empty-icon" />
              <h3>Chưa có slot nào trong tuần này</h3>
              <p>Liên hệ manager để được tạo slot làm việc.</p>
            </div>
          </div>
        )}

        {timeSlotsList.length > 0 && (
          <div className="schedule-grid">
            <div className="grid-header">
              <div className="time-column">
                <Clock size={16} />
                Giờ
              </div>
              {daysWithSlots.map((day, index) => (
                <div
                  key={index}
                  className={`day-column ${day.isPast ? "past-day" : ""}`}
                >
                  <div className="day-name">{day.name}</div>
                  <div className="day-date">{day.date}</div>
                </div>
              ))}
            </div>

            <div className="grid-body">
              {/* Buổi sáng label */}
              <div className="time-row morning-label">
                <div className="time-cell">Buổi sáng</div>
                {daysWithSlots.map((day, dayIndex) => (
                  <div key={`label-morning-${dayIndex}`} className="slot-cell">
                    <div className="slot-content"></div>
                  </div>
                ))}
              </div>

              {timesWithSlots.map((time, timeIndex) => {
                // Xác định buổi dựa trên giờ
                const hour = parseInt(time.split(":")[0]);

                // Tìm vị trí đầu tiên của buổi sáng và buổi chiều
                const morningStartIndex = timesWithSlots.findIndex(
                  (t) => parseInt(t.split(":")[0]) < 12
                );
                const afternoonStartIndex = timesWithSlots.findIndex(
                  (t) => parseInt(t.split(":")[0]) >= 13
                );

                console.log(
                  `🔍 Time ${time} (index ${timeIndex}): morningStart=${morningStartIndex}, afternoonStart=${afternoonStartIndex}`
                );

                return (
                  <>
                    {/* Thêm label "Buổi chiều" trước slot 13:00 */}
                    {timeIndex === afternoonStartIndex && (
                      <div className="time-row afternoon-label">
                        <div className="time-cell">Buổi chiều</div>
                        {daysWithSlots.map((day, dayIndex) => (
                          <div
                            key={`label-afternoon-${dayIndex}`}
                            className="slot-cell"
                          >
                            <div className="slot-content"></div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div
                      key={timeIndex}
                      className={`time-row ${
                        timeIndex === morningStartIndex ? "morning-section" : ""
                      } ${
                        timeIndex === afternoonStartIndex
                          ? "afternoon-section"
                          : ""
                      }`}
                    >
                      <div className="time-cell">{time}</div>
                      {daysWithSlots.map((day, dayIndex) => {
                        const slot =
                          processedSlots.slotsMap?.[day.fullDate]?.[time];

                        // Nếu không có slot, vẫn render ô trống nhưng có thể click để đặt lịch
                        if (!slot) {
                          return (
                            <div
                              key={`${dayIndex}-${timeIndex}`}
                              className="slot-cell empty-no-border"
                              onClick={() => {
                                // Mở form đặt lịch khi click vào ô trống
                                setSelectedDate(day.fullDate);
                                setSelectedTime(time);
                                setSelectedSlot(null);
                                setBookingData({
                                  patientName: "",
                                  patientPhone: "",
                                  reason: "",
                                  mode: "online",
                                });
                                setShowBookSlot(true);
                              }}
                              style={{ cursor: "pointer" }}
                            >
                              {/* Ô trống - có thể click để đặt lịch */}
                            </div>
                          );
                        }

                        return (
                          <div
                            key={`${dayIndex}-${timeIndex}`}
                            className={`slot-cell ${
                              day.isPast ? "past-day" : ""
                            }`}
                            onClick={(e) => handleSlotClick(slot, e)}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              handleSlotClick(slot, { button: 2 });
                            }}
                          >
                            <div className="slot-content">
                              {slot.status === "available" &&
                              !slot.hasPendingLeaveRequest ? (
                                <>
                                  <div
                                    className="slot-status"
                                    style={{
                                      backgroundColor: getStatusColor(
                                        slot.status
                                      ),
                                    }}
                                  >
                                    {getStatusText(
                                      slot.status,
                                      slot.hasPendingLeaveRequest,
                                      slot.rescheduledFromId
                                    )}
                                  </div>
                                </>
                              ) : slot.status === "blocked" ||
                                (slot.status === "available" &&
                                  slot.hasPendingLeaveRequest) ? (
                                <div className="booked-slot blocked">
                                  <div className="patient-name-main">
                                    {slot.status === "blocked"
                                      ? getStatusText(slot.status, false, null)
                                      : getStatusText(
                                          slot.status,
                                          slot.hasPendingLeaveRequest,
                                          slot.rescheduledFromId
                                        )}
                                  </div>
                                </div>
                              ) : (
                                <div className={`booked-slot ${slot.status}`}>
                                  <div className="patient-name-main">
                                    {slot.patientName || "Bệnh nhân"}
                                  </div>
                                  <div className="status-text-small">
                                    {getStatusText(
                                      slot.status,
                                      slot.hasPendingLeaveRequest,
                                      slot.rescheduledFromId
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Leave Request Dialog */}
      <Dialog open={showLeaveRequest} onOpenChange={setShowLeaveRequest}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đăng ký lịch nghỉ</DialogTitle>
          </DialogHeader>
          <div className="form-group">
            <label>Ngày bắt đầu:</label>
            <Input
              type="date"
              value={leaveData.startDate}
              onChange={(e) =>
                setLeaveData({ ...leaveData, startDate: e.target.value })
              }
            />
          </div>
          <div className="form-group">
            <label>Ngày kết thúc:</label>
            <Input
              type="date"
              value={leaveData.endDate}
              onChange={(e) =>
                setLeaveData({ ...leaveData, endDate: e.target.value })
              }
            />
          </div>
          <div className="form-group">
            <label>Lý do:</label>
            <Input
              value={leaveData.reason}
              onChange={(e) =>
                setLeaveData({ ...leaveData, reason: e.target.value })
              }
              placeholder="Nhập lý do nghỉ..."
            />
          </div>
          <div className="dialog-actions">
            <Button
              onClick={() => setShowLeaveRequest(false)}
              variant="outline"
            >
              Hủy
            </Button>
            <Button onClick={handleLeaveRequest} variant="primary">
              Gửi yêu cầu
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Slot Action Menu Dialog */}
      <Dialog open={showSlotActionMenu} onOpenChange={setShowSlotActionMenu}>
        <DialogContent className="slot-action-menu-dialog">
          <DialogHeader>
            <DialogTitle>Chọn hành động</DialogTitle>
          </DialogHeader>
          <div
            style={{
              padding: "20px 0",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {actionMenuSlot && (
              <div
                style={{
                  marginBottom: "10px",
                  fontSize: "14px",
                  color: "#666",
                }}
              >
                Thời gian:{" "}
                {new Date(actionMenuSlot.startAt).toLocaleString("vi-VN")}
              </div>
            )}
            <Button
              onClick={handleBookSlotFromMenu}
              variant="primary"
              style={{ width: "100%", padding: "12px" }}
            >
              📅 Đặt lịch khám
            </Button>
            <Button
              onClick={handleBlockSlotFromMenu}
              variant="outline"
              style={{ width: "100%", padding: "12px", borderColor: "#6b7280" }}
            >
              🚫 Đăng ký nghỉ
            </Button>
          </div>
          <div className="dialog-actions">
            <Button
              onClick={() => {
                setShowSlotActionMenu(false);
                setActionMenuSlot(null);
              }}
              variant="outline"
            >
              Hủy
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Block Slot Dialog - Nhập lý do nghỉ */}
      <Dialog open={showBlockSlotDialog} onOpenChange={setShowBlockSlotDialog}>
        <DialogContent className="block-slot-dialog">
          <DialogHeader>
            <DialogTitle>Đăng ký nghỉ</DialogTitle>
          </DialogHeader>
          {actionMenuSlot && (
            <div
              style={{
                marginBottom: "15px",
                fontSize: "14px",
                color: "#666",
              }}
            >
              Thời gian:{" "}
              {new Date(actionMenuSlot.startAt).toLocaleString("vi-VN")}
            </div>
          )}
          <div className="form-group">
            <label>Lý do nghỉ: *</label>
            <Input
              value={blockSlotReason}
              onChange={(e) => setBlockSlotReason(e.target.value)}
              placeholder="Nhập lý do nghỉ (bắt buộc)..."
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleConfirmBlockSlot();
                }
              }}
            />
          </div>
          <div className="dialog-actions">
            <Button
              onClick={() => {
                setShowBlockSlotDialog(false);
                setBlockSlotReason("");
                setActionMenuSlot(null);
              }}
              variant="outline"
            >
              Hủy
            </Button>
            <Button onClick={handleConfirmBlockSlot} variant="primary">
              Xác nhận nghỉ
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Book Slot Dialog */}
      <Dialog open={showBookSlot} onOpenChange={setShowBookSlot}>
        <DialogContent className="book-slot-dialog">
          <DialogHeader>
            <DialogTitle>Đặt lịch khám</DialogTitle>
          </DialogHeader>
          <div className="form-group">
            <label>Tên bệnh nhân:</label>
            <Input
              value={bookingData.patientName}
              onChange={(e) =>
                setBookingData({ ...bookingData, patientName: e.target.value })
              }
              placeholder="Nhập tên bệnh nhân..."
            />
          </div>
          <div className="form-group">
            <label>Số điện thoại:</label>
            <Input
              value={bookingData.patientPhone}
              onChange={(e) =>
                setBookingData({ ...bookingData, patientPhone: e.target.value })
              }
              placeholder="Nhập số điện thoại..."
            />
          </div>
          <div className="form-group">
            <label>Lý do khám:</label>
            <Input
              value={bookingData.reason}
              onChange={(e) =>
                setBookingData({ ...bookingData, reason: e.target.value })
              }
              placeholder="Nhập lý do khám..."
            />
          </div>
          <div className="form-group">
            <label>Hình thức khám:</label>
            <div className="mode-checkboxes">
              <label className="checkbox-option">
                <input
                  type="radio"
                  name="mode"
                  value="online"
                  checked={bookingData.mode === "online"}
                  onChange={(e) =>
                    setBookingData({ ...bookingData, mode: e.target.value })
                  }
                />
                <span>Online</span>
              </label>
              <label className="checkbox-option">
                <input
                  type="radio"
                  name="mode"
                  value="offline"
                  checked={bookingData.mode === "offline"}
                  onChange={(e) =>
                    setBookingData({ ...bookingData, mode: e.target.value })
                  }
                />
                <span>Offline</span>
              </label>
            </div>
          </div>
          <div className="dialog-actions">
            <Button
              onClick={() => {
                setShowBookSlot(false);
                setBookingData({
                  patientName: "",
                  patientPhone: "",
                  reason: "",
                  mode: "online",
                });
                setSelectedSlot(null);
                setSelectedDate(null);
                setSelectedTime(null);
              }}
              variant="outline"
            >
              Hủy
            </Button>
            <Button onClick={handleBookSlot} variant="primary">
              Đặt lịch
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Block Detail Dialog - Hiển thị lý do nghỉ */}
      <Dialog
        open={showBlockDetailDialog}
        onOpenChange={setShowBlockDetailDialog}
      >
        <DialogContent className="block-detail-dialog">
          <DialogHeader>
            <DialogTitle>Chi tiết nghỉ phép</DialogTitle>
          </DialogHeader>
          {selectedSlot && (
            <div className="block-detail-content">
              <div className="detail-section">
                <div className="detail-item">
                  <span className="detail-label">Thời gian nghỉ:</span>
                  <span className="detail-value">
                    {new Date(selectedSlot.startAt).toLocaleString("vi-VN")}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Lý do nghỉ:</span>
                  <span className="detail-value">
                    {selectedSlot.leaveReason || "Không có lý do"}
                  </span>
                </div>
              </div>
              <div className="dialog-actions">
                <Button
                  onClick={() => {
                    setShowBlockDetailDialog(false);
                    setSelectedSlot(null);
                  }}
                  variant="outline"
                  style={{ width: "100%" }}
                >
                  Đóng
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Appointment Detail Modal */}
      <Dialog
        open={showAppointmentDetail}
        onOpenChange={setShowAppointmentDetail}
      >
        <DialogContent className="appointment-detail-dialog">
          <DialogHeader>
            <DialogTitle>Chi tiết lịch hẹn</DialogTitle>
          </DialogHeader>
          {loadingAppointmentDetail ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Đang tải thông tin...</p>
            </div>
          ) : selectedAppointmentDetail ? (
            <div className="appointment-detail-content">
              <div className="detail-section">
                <h3 className="detail-section-title">Thông tin bệnh nhân</h3>
                <div className="detail-item">
                  <span className="detail-label">Họ và tên:</span>
                  <span className="detail-value">
                    {selectedAppointmentDetail.patientId?.fullName ||
                      selectedAppointmentDetail.patientName ||
                      "N/A"}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Số điện thoại:</span>
                  <span className="detail-value">
                    {selectedAppointmentDetail.patientId?.phone ||
                      selectedAppointmentDetail.patientPhone ||
                      "N/A"}
                  </span>
                </div>
                {selectedAppointmentDetail.patientId?.dob && (
                  <div className="detail-item">
                    <span className="detail-label">Ngày sinh:</span>
                    <span className="detail-value">
                      {new Date(
                        selectedAppointmentDetail.patientId.dob
                      ).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                )}
                {selectedAppointmentDetail.patientId?.gender && (
                  <div className="detail-item">
                    <span className="detail-label">Giới tính:</span>
                    <span className="detail-value">
                      {selectedAppointmentDetail.patientId.gender === "male"
                        ? "Nam"
                        : selectedAppointmentDetail.patientId.gender ===
                          "female"
                        ? "Nữ"
                        : selectedAppointmentDetail.patientId.gender}
                    </span>
                  </div>
                )}
              </div>

              <div className="detail-section">
                <h3 className="detail-section-title">Thông tin lịch hẹn</h3>
                <div className="detail-item">
                  <span className="detail-label">Thời gian:</span>
                  <span className="detail-value">
                    {selectedAppointmentDetail.slotId
                      ? `${new Date(
                          selectedAppointmentDetail.slotId.startAt
                        ).toLocaleString("vi-VN")} - ${new Date(
                          selectedAppointmentDetail.slotId.endAt
                        ).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}`
                      : selectedAppointmentDetail.scheduledStart
                      ? new Date(
                          selectedAppointmentDetail.scheduledStart
                        ).toLocaleString("vi-VN")
                      : "N/A"}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Trạng thái:</span>
                  <span
                    className={`detail-value status-badge ${selectedAppointmentDetail.status}`}
                  >
                    {getStatusText(selectedAppointmentDetail.status)}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Hình thức:</span>
                  <span className="detail-value">
                    {selectedAppointmentDetail.mode === "online"
                      ? "Online"
                      : selectedAppointmentDetail.mode === "offline"
                      ? "Offline"
                      : "N/A"}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Lý do khám:</span>
                  <span className="detail-value">
                    {selectedAppointmentDetail.reason ||
                      selectedAppointmentDetail.cancelReason ||
                      selectedAppointmentDetail.rejectReason ||
                      "Chưa có thông tin"}
                  </span>
                </div>
                {selectedAppointmentDetail.clinicId && (
                  <div className="detail-item">
                    <span className="detail-label">Phòng khám:</span>
                    <span className="detail-value">
                      {selectedAppointmentDetail.clinicId.name ||
                        selectedAppointmentDetail.clinicId}
                    </span>
                  </div>
                )}
              </div>

              {/* Thông tin dời lịch - hiển thị nếu appointment đã được dời từ lịch cũ */}
              {selectedAppointmentDetail.rescheduledFromId && (
                <div className="detail-section">
                  <h3 className="detail-section-title">
                    📅 Thông tin dời lịch
                  </h3>
                  <div className="detail-item">
                    <span className="detail-label">Thời gian cũ:</span>
                    <span className="detail-value">
                      {selectedAppointmentDetail.rescheduledFromId.slotId
                        ? `${new Date(
                            selectedAppointmentDetail.rescheduledFromId.slotId.startAt
                          ).toLocaleString("vi-VN")} - ${new Date(
                            selectedAppointmentDetail.rescheduledFromId.slotId.endAt
                          ).toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}`
                        : selectedAppointmentDetail.rescheduledFromId
                            .scheduledStart
                        ? new Date(
                            selectedAppointmentDetail.rescheduledFromId.scheduledStart
                          ).toLocaleString("vi-VN")
                        : "N/A"}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Thời gian mới:</span>
                    <span className="detail-value">
                      {selectedAppointmentDetail.slotId
                        ? `${new Date(
                            selectedAppointmentDetail.slotId.startAt
                          ).toLocaleString("vi-VN")} - ${new Date(
                            selectedAppointmentDetail.slotId.endAt
                          ).toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}`
                        : selectedAppointmentDetail.scheduledStart
                        ? new Date(
                            selectedAppointmentDetail.scheduledStart
                          ).toLocaleString("vi-VN")
                        : "N/A"}
                    </span>
                  </div>
                  {selectedAppointmentDetail.rescheduledFromId
                    .rescheduleReason && (
                    <div className="detail-item">
                      <span className="detail-label">Lý do dời lịch:</span>
                      <span className="detail-value">
                        {
                          selectedAppointmentDetail.rescheduledFromId
                            .rescheduleReason
                        }
                      </span>
                    </div>
                  )}
                  {selectedAppointmentDetail.rescheduledFromId
                    .rescheduledAt && (
                    <div className="detail-item">
                      <span className="detail-label">Ngày dời lịch:</span>
                      <span className="detail-value">
                        {new Date(
                          selectedAppointmentDetail.rescheduledFromId.rescheduledAt
                        ).toLocaleString("vi-VN")}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {selectedAppointmentDetail.mode === "online" &&
                (selectedAppointmentDetail.status === "confirmed" ||
                  selectedAppointmentDetail.status === "booked" ||
                  selectedAppointmentDetail.status === "accepted" ||
                  selectedAppointmentDetail.status === "in_progress") && (
                  <div className="detail-actions">
                    <Button
                      className="call-button"
                      onClick={() => {
                        const slot = timeSlots.find(
                          (s) =>
                            s.appointmentId === selectedAppointmentDetail._id
                        ) || {
                          appointmentId: selectedAppointmentDetail._id,
                          patientName:
                            selectedAppointmentDetail.patientId?.fullName,
                          mode: selectedAppointmentDetail.mode,
                          status: selectedAppointmentDetail.status,
                        };
                        handleVideoCall(slot);
                        setShowAppointmentDetail(false);
                      }}
                    >
                      <Phone size={16} />
                      Gọi video
                    </Button>
                  </div>
                )}
            </div>
          ) : (
            <div className="no-data">
              <p>Không có thông tin chi tiết</p>
            </div>
          )}
          <div className="dialog-actions">
            <Button
              onClick={() => setShowAppointmentDetail(false)}
              variant="outline"
            >
              Đóng
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom Alert */}
      <CustomAlert
        message={alertMessage}
        onClose={() => setAlertMessage(null)}
        title="Hệ thống MedConnect"
      />

      {/* Custom Confirm */}
      {confirmConfig && (
        <CustomAlert
          message={confirmConfig.message}
          onConfirm={confirmConfig.onConfirm}
          onClose={confirmConfig.onCancel}
          title="Hệ thống MedConnect"
          type="confirm"
        />
      )}
    </div>
  );
}
