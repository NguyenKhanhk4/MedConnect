import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  Calendar,
  RefreshCw,
  Phone,
  User,
  Search,
  Trash2,
} from "lucide-react";
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
import {
  api,
  rescheduleAppointmentByManager,
  getManagerPatients,
  getEducationLevelPrices,
} from "../../../lib/api";
import { RescheduleModal } from "../../../components/RescheduleModal/RescheduleModal";
import "./QuanLyLichBacSi.scss";

export default function QuanLyLichBacSi() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDoctorId, setSelectedDoctorId] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [timeSlots, setTimeSlots] = useState([]);
  const [generating, setGenerating] = useState(false);

  // Filter states
  const [searchName, setSearchName] = useState("");
  const [selectedSpecializationId, setSelectedSpecializationId] = useState("");
  const [specializations, setSpecializations] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  // Leave request states

  // Status filter state
  const [selectedStatus, setSelectedStatus] = useState("pending");

  // Block detail dialog state (chỉ để xem lý do nghỉ, không thể đăng ký nghỉ)
  const [showBlockDetailDialog, setShowBlockDetailDialog] = useState(false);

  // Booking states
  const [showBookSlot, setShowBookSlot] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [bookingData, setBookingData] = useState({
    patientId: null, // Selected patient ID
    patientName: "", // For new patient
    patientPhone: "", // For new patient
    dob: "", // Date of birth for new patient (YYYY-MM-DD format)
    dobDay: "", // Day of birth
    dobMonth: "", // Month of birth
    dobYear: "", // Year of birth
    gender: "", // Gender for new patient (male, female, other)
    citizenId: "", // Citizen ID for new patient (12 digits)
    address: "", // Address for new patient
    allergyNotes: "", // Allergy notes for new patient
    reason: "",
    mode: "offline",
    clinicId: null, // Clinic ID for offline mode
  });

  // Clinic states
  const [clinics, setClinics] = useState([]);
  const [loadingClinics, setLoadingClinics] = useState(false);

  // Patient search states
  const [patients, setPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [patientSearchTerm, setPatientSearchTerm] = useState("");
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  // Validation errors
  const [validationErrors, setValidationErrors] = useState({});

  // Appointment detail modal states
  const [showAppointmentDetail, setShowAppointmentDetail] = useState(false);
  const [selectedAppointmentDetail, setSelectedAppointmentDetail] =
    useState(null);
  const [loadingAppointmentDetail, setLoadingAppointmentDetail] =
    useState(false);

  // Reschedule modal states
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);

  // Education level prices state
  const [educationLevelPrices, setEducationLevelPrices] = useState({});

  // Load specializations on mount
  useEffect(() => {
    loadSpecializations();
    loadEducationLevelPrices();
  }, []);

  // Reload education level prices when doctor changes (to ensure latest prices)
  useEffect(() => {
    if (selectedDoctorId) {
      loadEducationLevelPrices();
    }
  }, [selectedDoctorId]);

  // No need to load clinics anymore - using doctor's default clinic

  // When selecting a doctor, force offline mode and auto-assign clinicId from doctor's default clinic
  useEffect(() => {
    if (!selectedDoctorId) return;
    const doctor = doctors.find((d) => d._id === selectedDoctorId);
    const defaultClinicId =
      doctor?.clinicDefaultId?._id || doctor?.clinicDefaultId || null;
    setBookingData((prev) => ({
      ...prev,
      mode: "offline",
      clinicId: defaultClinicId,
    }));
  }, [selectedDoctorId, doctors]);

  const loadClinics = async () => {
    try {
      setLoadingClinics(true);
      const response = await api.get("/api/clinics?limit=100");
      if (response.success) {
        setClinics(response.data.clinics || []);
      } else {
        setClinics([]);
      }
    } catch (error) {
      console.error("Error loading clinics:", error);
      setClinics([]);
    } finally {
      setLoadingClinics(false);
    }
  };

  // Load patients when search term changes (with debounce)
  useEffect(() => {
    if (!showBookSlot) {
      setPatients([]);
      setPatientSearchTerm("");
      return;
    }

    const timer = setTimeout(async () => {
      if (patientSearchTerm.trim().length > 0) {
        try {
          setLoadingPatients(true);
          const response = await getManagerPatients({
            search: patientSearchTerm.trim(),
            limit: 20,
          });
          if (response.success) {
            setPatients(response.data.patients || []);
          } else {
            setPatients([]);
          }
        } catch (error) {
          console.error("Error loading patients:", error);
          setPatients([]);
        } finally {
          setLoadingPatients(false);
        }
      } else {
        setPatients([]);
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(timer);
  }, [patientSearchTerm, showBookSlot]);

  const loadDoctors = useCallback(async () => {
    // Only load if at least one filter is applied
    const hasNameFilter = searchName.trim().length > 0;
    const hasSpecializationFilter = selectedSpecializationId.length > 0;

    if (!hasNameFilter && !hasSpecializationFilter) {
      // No filters applied, clear doctors list
      setDoctors([]);
      setLoadingDoctors(false);
      return;
    }

    try {
      setLoadingDoctors(true);
      const params = new URLSearchParams();

      // Add specialization filter if selected
      if (selectedSpecializationId) {
        params.append("specializationId", selectedSpecializationId);
      }

      // Add name search if provided
      if (searchName.trim()) {
        params.append("name", searchName.trim());
      }

      const url = `/api/managers/doctors?${params.toString()}`;

      const response = await api.get(url);
      if (response.success) {
        setDoctors(response.data.doctors || []);
      } else {
        console.error("[Manager] Failed to load doctors:", response);
      }
    } catch (error) {
      console.error("Error loading doctors:", error);
    } finally {
      setLoadingDoctors(false);
    }
  }, [searchName, selectedSpecializationId]);

  // Load doctors when filters change (with debounce for search)
  useEffect(() => {
    // Load doctors when search name or specialization changes
    // loadDoctors will only load if at least one filter is applied
    const timer = setTimeout(
      () => {
        loadDoctors();
      },
      searchName ? 500 : 0
    ); // Debounce search by 500ms

    return () => clearTimeout(timer);
  }, [searchName, selectedSpecializationId, loadDoctors]);

  // Reset selected doctor if current selection is not in filtered list after doctors are loaded
  useEffect(() => {
    if (selectedDoctorId && doctors.length > 0) {
      const isStillAvailable = doctors.some((d) => d._id === selectedDoctorId);
      if (!isStillAvailable) {
        setSelectedDoctorId(null);
      }
    }
  }, [doctors, selectedDoctorId]);

  // Load time slots when doctor or date changes
  useEffect(() => {
    if (selectedDoctorId) {
      loadTimeSlots();
    } else {
      setTimeSlots([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDoctorId, currentDate]);

  const loadSpecializations = async () => {
    try {
      const response = await api.getAllSpecializations({ limit: 100 });
      if (response.success) {
        setSpecializations(response.data || []);
      }
    } catch (error) {
      console.error("Error loading specializations:", error);
    }
  };

  const navigateWeek = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + direction * 7);
    setCurrentDate(newDate);
  };

  const getWeekStart = (date) => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + 1;
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
        fullDate: fullDate,
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
    if (!selectedDoctorId) return;

    try {
      setLoading(true);
      const weekRange = getWeekRange();
      const response = await api.get(
        `/api/managers/doctors/${selectedDoctorId}/time-slots?startDate=${weekRange.startDate}&endDate=${weekRange.endDate}&limit=1000`
      );

      if (response.success && response.data && response.data.slots) {
        setTimeSlots(response.data.slots);
      } else {
        setTimeSlots([]);
      }
    } catch (error) {
      console.error("Error loading time slots:", error);
      setTimeSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSlots = async () => {
    if (!selectedDoctorId) {
      alert("Vui lòng chọn bác sĩ!");
      return;
    }

    try {
      setGenerating(true);
      const response = await api.post(
        `/api/managers/doctors/${selectedDoctorId}/generate-slots`
      );
      if (response.success) {
        const createdCount = response.data.createdSlots || 0;
        const totalSlots = response.data.totalFutureSlots || 0;
        const existingSlots = response.data.existingSlots || 0;

        // Different messages based on response
        if (createdCount === 0) {
          // No slots created (already have enough slots for current month)
          alert(
            `ℹ️ Hiện tại bác sĩ đã có ${existingSlots} slot trong tháng này.\n\nKhông cần tạo thêm slot lúc này.`
          );
        } else {
          // Slots created successfully
          let message = `✅ Đã tạo ${createdCount} slot mới cho phần còn lại của tháng hiện tại (bao gồm cả cuối tuần)`;
          message += `\n\n📊 Tổng slot tương lai: ${totalSlots} slot`;

          // Warning if slots are running low
          if (totalSlots < 30) {
            message += `\n\n⚠️ CẢNH BÁO: Bác sĩ chỉ còn ${totalSlots} slot. Vui lòng tạo thêm slot sớm!`;
          } else if (totalSlots < 50) {
            message += `\n\n💡 LƯU Ý: Bác sĩ còn ${totalSlots} slot. Nên tạo thêm slot trong thời gian tới.`;
          }

          alert(message);
        }
        await loadTimeSlots();
      } else {
        alert("❌ Lỗi khi tạo slots: " + (response.message || "Unknown error"));
      }
    } catch (error) {
      console.error("❌ Error generating slots:", error);
      alert("❌ Lỗi khi tạo slots: " + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const loadEducationLevelPrices = async () => {
    try {
      const response = await getEducationLevelPrices();

      // Check both response.data.prices and response.prices (for different response formats)
      const pricesData = response.data?.prices || response.prices || {};

      if (response.success && pricesData) {
        setEducationLevelPrices(pricesData);
      }
    } catch (error) {
      console.error("Error loading education level prices:", error);
    }
  };

  // Helper function to get price for doctor based on education level
  const getPriceForDoctor = (mode, isWeekend) => {
    if (!selectedDoctorId) return null;

    const doctor = doctors.find((d) => d._id === selectedDoctorId);
    if (!doctor || !doctor.educationLevel) return null;

    const prices = educationLevelPrices[doctor.educationLevel];
    if (!prices || !prices[mode]) return null;

    return isWeekend ? prices[mode].weekendPrice : prices[mode].weekdayPrice;
  };

  // Process slots similar to ScheduleManagement
  const processedSlots = React.useMemo(() => {
    const slotsMap = {};
    const timesSet = new Set();

    timeSlots.forEach((slot) => {
      const slotDate = new Date(slot.startAt).toISOString().split("T")[0];
      const slotTime = new Date(slot.startAt).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      const hour = parseInt(slotTime.split(":")[0]);
      if (hour >= 17) return;

      timesSet.add(slotTime);

      if (!slotsMap[slotDate]) {
        slotsMap[slotDate] = {};
      }

      const mappedSlot = {
        id: slot._id,
        startAt: slot.startAt,
        endAt: slot.endAt,
        status: slot.status,
        patientName: slot.patientName || null,
        reason: slot.reason || null,
        mode: slot.mode || null,
        appointmentId: slot.appointmentId || null,
        rescheduledFromId: slot.rescheduledFromId || null, // Flag to identify rescheduled appointments
        leaveReason: slot.leaveReason || null, // Lý do nghỉ
        hasPendingLeaveRequest: slot.hasPendingLeaveRequest || false, // Flag leave request đang pending
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
          slotsMap[slotDate][slotTime] = mappedSlot;
        } else if (!newHasAppointment && existingHasAppointment) {
          // Giữ slot cũ
        } else {
          // Cả hai đều có hoặc không có appointment, giữ slot đầu tiên
        }
      } else {
        // Chưa có slot, thêm mới
        slotsMap[slotDate][slotTime] = mappedSlot;

        // Booked slots are mapped
      }
    });

    return { slotsMap, timesSet };
  }, [timeSlots, currentDate]);

  const timeSlotsList = React.useMemo(() => {
    return Array.from(processedSlots.timesSet || []).sort();
  }, [processedSlots]);

  const daysWithSlots = React.useMemo(() => {
    return getWeekDays();
  }, [currentDate]);

  const timesWithSlots = React.useMemo(() => {
    return timeSlotsList;
  }, [timeSlotsList]);

  const stats = React.useMemo(() => {
    const counts = {
      pending: 0,
      completed: 0,
      booked: 0,
      cancelled: 0,
    };

    timeSlots.forEach((slot) => {
      if (slot.status === "pending" || slot.status === "pending_doctor")
        counts.pending++;
      else if (slot.status === "completed" || slot.status === "done")
        counts.completed++;
      else if (
        slot.status === "booked" ||
        slot.status === "confirmed" ||
        slot.status === "accepted"
      )
        counts.booked++;
      else if (slot.status === "cancelled") counts.cancelled++;
    });

    return counts;
  }, [timeSlots]);

  const getStatusColor = (status) => {
    switch (status) {
      case "available":
        return "#f3f4f6";
      case "pending":
        return "#fbbf24";
      case "confirmed":
        return "#10b981";
      case "in_progress":
        return "#3b82f6";
      case "cancelled":
        return "#ef4444";
      case "completed":
        return "#3b82f6";
      case "booked":
        return "#10b981";
      case "blocked":
        return "#6b7280";
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

    // Nếu có leave request đang pending và status là pending, hiển thị "Lịch nghỉ đang xét duyệt"
    if (
      hasPendingLeaveRequest &&
      (status === "pending" || status === "pending_doctor")
    ) {
      return "Lịch nghỉ đang xét duyệt";
    }

    switch (status) {
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
      default:
        return "Không xác định";
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

    // Slot available: Mở dialog đặt lịch
    if (slot.status === "available" && !slot.hasPendingLeaveRequest) {
      setSelectedSlot(slot);
      setSelectedDate(new Date(slot.startAt).toISOString().split("T")[0]);
      setSelectedTime(
        new Date(slot.startAt).toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      );
      setBookingData({
        patientId: null,
        patientName: "",
        patientPhone: "",
        dob: "",
        dobDay: "",
        dobMonth: "",
        dobYear: "",
        gender: "",
        citizenId: "",
        address: "",
        allergyNotes: "",
        reason: "",
        mode: "offline",
        clinicId: null,
      });
      setPatientSearchTerm("");
      setPatients([]);
      setShowPatientDropdown(false);
      setValidationErrors({});
      setShowBookSlot(true);
      return;
    }

    if (slot.appointmentId) {
      setLoadingAppointmentDetail(true);
      setShowAppointmentDetail(true);

      try {
        const response = await api.get(
          `/api/managers/appointments/${slot.appointmentId}`
        );

        if (response.success) {
          setSelectedAppointmentDetail(response.data);
        } else {
          alert("Không thể tải thông tin chi tiết lịch hẹn");
          setShowAppointmentDetail(false);
        }
      } catch (error) {
        console.error("Error fetching appointment detail:", error);
        alert("Có lỗi xảy ra khi tải thông tin");
        setShowAppointmentDetail(false);
      } finally {
        setLoadingAppointmentDetail(false);
      }
    }
  };

  // Validation functions
  const validatePatientName = (name) => {
    if (!name || name.trim().length === 0) {
      return "Họ và tên không được để trống";
    }
    if (name.trim().length < 2) {
      return "Họ và tên phải có ít nhất 2 ký tự";
    }
    if (name.trim().length > 100) {
      return "Họ và tên không được vượt quá 100 ký tự";
    }
    // Chỉ cho phép chữ cái, khoảng trắng, dấu tiếng Việt
    const nameRegex = /^[a-zA-ZÀ-ỹ\s]+$/;
    if (!nameRegex.test(name.trim())) {
      return "Họ và tên chỉ được chứa chữ cái và khoảng trắng";
    }
    return "";
  };

  const validatePhone = (phone) => {
    if (!phone || phone.trim().length === 0) {
      return "Số điện thoại không được để trống";
    }
    // Loại bỏ khoảng trắng và ký tự đặc biệt
    const cleanedPhone = phone.replace(/\s+/g, "").replace(/[-\+\(\)]/g, "");
    // Kiểm tra format số điện thoại Việt Nam: 10 số, bắt đầu bằng 0
    const phoneRegex = /^0[3-9]\d{8}$/;
    if (!phoneRegex.test(cleanedPhone)) {
      return "Số điện thoại không hợp lệ. Vui lòng nhập 10 số, bắt đầu bằng 0 (VD: 0912345678)";
    }
    return "";
  };

  const validateDOB = (dobDay, dobMonth, dobYear) => {
    if (!dobDay || !dobMonth || !dobYear) {
      return "Vui lòng chọn đầy đủ ngày, tháng, năm sinh";
    }

    const day = parseInt(dobDay);
    const month = parseInt(dobMonth);
    const year = parseInt(dobYear);

    // Validate year
    const currentYear = new Date().getFullYear();
    if (year < currentYear - 150 || year > currentYear) {
      return `Năm sinh phải từ ${currentYear - 150} đến ${currentYear}`;
    }

    // Validate month
    if (month < 1 || month > 12) {
      return "Tháng không hợp lệ";
    }

    // Validate day based on month and year
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) {
      return `Ngày không hợp lệ (tháng ${month} có tối đa ${daysInMonth} ngày)`;
    }

    // Check if date is in the future
    const birthDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (birthDate > today) {
      return "Ngày sinh không được là ngày trong tương lai";
    }

    // Calculate age
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    if (age < 0) {
      return "Ngày sinh không hợp lệ";
    }

    return "";
  };

  // Helper function to convert dobDay, dobMonth, dobYear to YYYY-MM-DD format
  const formatDOB = (day, month, year) => {
    if (!day || !month || !year) return "";
    const dayStr = String(day).padStart(2, "0");
    const monthStr = String(month).padStart(2, "0");
    return `${year}-${monthStr}-${dayStr}`;
  };

  // Generate years list (from 150 years ago to current year)
  const getYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear; i >= currentYear - 150; i--) {
      years.push(i);
    }
    return years;
  };

  // Generate days list based on selected month and year
  const getDays = (month, year) => {
    if (!month || !year) return [];
    const daysInMonth = new Date(year, month, 0).getDate();
    const days = [];
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  // Get month display name
  const getMonthDisplayName = (monthValue) => {
    if (!monthValue) return "";
    const monthNames = {
      1: "Tháng 1",
      2: "Tháng 2",
      3: "Tháng 3",
      4: "Tháng 4",
      5: "Tháng 5",
      6: "Tháng 6",
      7: "Tháng 7",
      8: "Tháng 8",
      9: "Tháng 9",
      10: "Tháng 10",
      11: "Tháng 11",
      12: "Tháng 12",
    };
    return monthNames[monthValue] || "";
  };

  const validateGender = (gender) => {
    if (!gender) {
      return "Vui lòng chọn giới tính";
    }
    if (!["male", "female", "other"].includes(gender)) {
      return "Giới tính không hợp lệ";
    }
    return "";
  };

  const validateCitizenId = (citizenId) => {
    if (!citizenId || citizenId.trim().length === 0) {
      return "Căn cước công dân không được để trống";
    }
    // Loại bỏ khoảng trắng và dấu gạch ngang
    const cleanedId = citizenId.replace(/\s+/g, "").replace(/-/g, "");
    // Kiểm tra CCCD (bắt buộc 12 số)
    const citizenIdRegex = /^\d{12}$/;
    if (!citizenIdRegex.test(cleanedId)) {
      return "Căn cước công dân phải đúng 12 số";
    }
    return "";
  };

  const validateAddress = (address) => {
    if (!address || address.trim().length === 0) {
      return "Địa chỉ không được để trống";
    }
    if (address.trim().length < 5) {
      return "Địa chỉ phải có ít nhất 5 ký tự";
    }
    if (address.trim().length > 500) {
      return "Địa chỉ không được vượt quá 500 ký tự";
    }
    return "";
  };

  const validateReason = (reason) => {
    if (!reason || reason.trim().length === 0) {
      return "Lý do khám không được để trống";
    }
    if (reason.trim().length < 5) {
      return "Lý do khám phải có ít nhất 5 ký tự";
    }
    if (reason.trim().length > 500) {
      return "Lý do khám không được vượt quá 500 ký tự";
    }
    return "";
  };

  const handleBookSlot = async () => {
    // Validate all fields and get errors
    const errors = {};

    // Validate patient info if new patient
    if (!bookingData.patientId) {
      errors.patientName = validatePatientName(bookingData.patientName);
      errors.patientPhone = validatePhone(bookingData.patientPhone);
      errors.dob = validateDOB(
        bookingData.dobDay,
        bookingData.dobMonth,
        bookingData.dobYear
      );
      errors.gender = validateGender(bookingData.gender);
      errors.citizenId = validateCitizenId(bookingData.citizenId);
      errors.address = validateAddress(bookingData.address);
    }

    // Always validate reason
    errors.reason = validateReason(bookingData.reason);

    // Validate clinic - must exist from doctor's default clinic
    if (!bookingData.clinicId) {
      const selectedDoctor = doctors.find((d) => d._id === selectedDoctorId);
      if (!selectedDoctor?.clinicDefaultId) {
        errors.clinicId =
          "Bác sĩ chưa có phòng khám mặc định. Vui lòng cập nhật thông tin bác sĩ.";
      }
    }

    // Set errors
    setValidationErrors(errors);

    // Check if there are any errors
    const hasErrors = Object.values(errors).some((error) => error !== "");
    if (hasErrors) {
      // Scroll to first error field
      const firstErrorField = Object.keys(errors).find((key) => errors[key]);
      if (firstErrorField) {
        setTimeout(() => {
          const element = document.querySelector(
            `[data-field="${firstErrorField}"]`
          );
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            // Try to focus input inside if element is a container
            const input =
              element.querySelector("input") ||
              element.querySelector("select") ||
              element;
            if (input && input.focus) {
              input.focus();
            }
          }
        }, 100);
      }
      return;
    }

    if (!selectedDoctorId) {
      alert("Vui lòng chọn bác sĩ!");
      return;
    }

    try {
      let scheduledStart, scheduledEnd;
      let slotId = null;

      if (selectedSlot) {
        // Ensure startAt and endAt are properly formatted as ISO strings
        const startDate =
          selectedSlot.startAt instanceof Date
            ? selectedSlot.startAt
            : new Date(selectedSlot.startAt);
        const endDate =
          selectedSlot.endAt instanceof Date
            ? selectedSlot.endAt
            : new Date(selectedSlot.endAt);

        scheduledStart = startDate.toISOString();
        scheduledEnd = endDate.toISOString();
        slotId = selectedSlot.id || selectedSlot._id;
      } else if (selectedDate && selectedTime) {
        const [hour, minute] = selectedTime.split(":").map(Number);
        const startDateTime = new Date(
          `${selectedDate}T${String(hour).padStart(2, "0")}:${String(
            minute
          ).padStart(2, "0")}:00`
        );
        const endDateTime = new Date(startDateTime);
        endDateTime.setMinutes(endDateTime.getMinutes() + 20);

        scheduledStart = startDateTime.toISOString();
        scheduledEnd = endDateTime.toISOString();

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
        alert("Thiếu thông tin ngày/giờ. Vui lòng thử lại!");
        return;
      }

      // Ensure clinicId is set from doctor's default clinic
      const selectedDoctor = doctors.find((d) => d._id === selectedDoctorId);
      const defaultClinicId =
        selectedDoctor?.clinicDefaultId?._id ||
        selectedDoctor?.clinicDefaultId ||
        bookingData.clinicId;

      if (!defaultClinicId) {
        alert(
          "Bác sĩ chưa có phòng khám mặc định. Vui lòng cập nhật thông tin bác sĩ trước."
        );
        return;
      }

      const appointmentData = {
        doctorId: selectedDoctorId,
        slotId: slotId,
        reason: bookingData.reason,
        mode: "offline", // Always offline
        scheduledStart: scheduledStart,
        scheduledEnd: scheduledEnd,
        clinicId: defaultClinicId, // Always include clinicId
      };

      // Add patientId if selected, otherwise use new patient data
      if (bookingData.patientId) {
        appointmentData.patientId = bookingData.patientId;
      } else {
        // New patient - send all required fields
        appointmentData.patientName = bookingData.patientName;
        appointmentData.patientPhone = bookingData.patientPhone;
        // Format DOB from day, month, year to YYYY-MM-DD
        appointmentData.dob = formatDOB(
          bookingData.dobDay,
          bookingData.dobMonth,
          bookingData.dobYear
        );
        appointmentData.gender = bookingData.gender;
        appointmentData.citizenId = bookingData.citizenId;
        appointmentData.address = bookingData.address;
        appointmentData.allergyNotes = bookingData.allergyNotes || "";
      }

      console.log(
        "📤 [Frontend] Creating booking payment (appointment will be created after payment success):",
        {
          ...appointmentData,
          dob: appointmentData.dob || "N/A",
          scheduledStart: appointmentData.scheduledStart,
          scheduledEnd: appointmentData.scheduledEnd,
        }
      );

      // Create booking payment FIRST (appointment will be created but slot not booked until payment success)
      const response = await api.post(
        "/api/managers/booking-payments",
        appointmentData
      );

      if (response.success) {
        alert(
          "Đã gửi yêu cầu thanh toán đặt lịch. Vui lòng thanh toán để hoàn tất đặt lịch."
        );
        // Close form and reset
        setShowBookSlot(false);
        setBookingData({
          patientId: null,
          patientName: "",
          patientPhone: "",
          dob: "",
          dobDay: "",
          dobMonth: "",
          dobYear: "",
          gender: "",
          citizenId: "",
          address: "",
          allergyNotes: "",
          reason: "",
          mode: "offline",
          clinicId: null,
        });
        setSelectedSlot(null);
        setSelectedDate(null);
        setSelectedTime(null);
        setPatientSearchTerm("");
        setPatients([]);
        setValidationErrors({});
        await loadTimeSlots();

        // Điều hướng tới trang thanh toán để manager xử lý
        navigate("/manager/thanh-toan-dich-vu");
      } else {
        const errorMsg =
          response.message || response.error?.message || "Unknown error";
        console.error("❌ Error response:", response);
        alert("Lỗi khi đặt lịch: " + errorMsg);
        // Close form even on error
        setShowBookSlot(false);
      }
    } catch (error) {
      console.error("❌ Error booking slot:", error);
      console.error("❌ Error details:", {
        message: error.message,
        response: error.response?.data,
        stack: error.stack,
      });
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        "Có lỗi xảy ra khi đặt lịch";
      alert("Có lỗi xảy ra khi đặt lịch: " + errorMsg);
      // Close form even on error
      setShowBookSlot(false);
    }
  };

  const handleSelectPatient = (patient) => {
    setBookingData({
      ...bookingData,
      patientId: patient._id || patient.id,
      patientName: patient.fullName,
      patientPhone: patient.phone,
    });
    setPatientSearchTerm(patient.fullName);
    setShowPatientDropdown(false);
    setPatients([]);
  };

  const handleDeleteSlot = async (slot) => {
    // Check for slot ID (could be _id or id depending on mapping)
    const slotId = slot?._id || slot?.id;
    if (!slot || !slotId || !selectedDoctorId) {
      alert("Không tìm thấy thông tin slot cần xóa");
      return;
    }

    // Confirm delete
    const confirmDelete = window.confirm(
      "Bạn có chắc chắn muốn xóa slot này? Slot có appointment sẽ không thể xóa."
    );

    if (!confirmDelete) {
      return;
    }

    try {
      const response = await api.delete(
        `/api/managers/doctors/${selectedDoctorId}/time-slots/${slotId}`
      );

      if (response.success) {
        alert("Xóa slot thành công!");
        await loadTimeSlots(); // Reload time slots
      } else {
        alert("Không thể xóa slot: " + (response.message || "Unknown error"));
      }
    } catch (error) {
      console.error("❌ Error deleting slot:", error);
      alert("Có lỗi xảy ra khi xóa slot: " + error.message);
    }
  };

  const selectedDoctor = doctors.find((d) => d._id === selectedDoctorId);

  return (
    <div className="manager-schedule-management">
      {/* Doctor Filter Section */}
      <div className="doctor-filter-section">
        <div className="filter-card">
          <h3 className="filter-title">Tìm kiếm bác sĩ</h3>
          <div className="filter-controls">
            <div className="filter-input-group">
              <Search size={18} className="search-icon" />
              <Input
                type="text"
                placeholder="Tìm theo tên bác sĩ..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="search-input"
              />
            </div>
            <Select
              value={selectedSpecializationId}
              onValueChange={(value) => setSelectedSpecializationId(value)}
            >
              <SelectTrigger className="specialization-select">
                <SelectValue placeholder="Tìm theo chuyên khoa">
                  {selectedSpecializationId
                    ? specializations.find(
                        (s) => s._id === selectedSpecializationId
                      )?.name || ""
                    : ""}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {specializations.map((spec) => (
                  <SelectItem key={spec._id} value={spec._id}>
                    {spec.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedDoctor && (
            <div className="selected-doctor-info">
              <span>
                Đang quản lý lịch: <strong>{selectedDoctor.fullName}</strong>
                {selectedDoctor.specializationIds?.[0]?.name && (
                  <span className="doctor-specialization">
                    {" "}
                    - {selectedDoctor.specializationIds[0].name}
                  </span>
                )}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDoctorId(null)}
              >
                Hủy chọn
              </Button>
            </div>
          )}
        </div>

        {/* Doctor List */}
        {!searchName.trim() && !selectedSpecializationId ? (
          <div className="no-doctors-found">
            <User size={48} className="empty-icon" />
            <p>Vui lòng nhập tên bác sĩ hoặc chọn chuyên khoa để tìm kiếm</p>
          </div>
        ) : loadingDoctors ? (
          <div className="loading-doctors">
            <div className="loading-spinner"></div>
            <p>Đang tải danh sách bác sĩ...</p>
          </div>
        ) : doctors.length === 0 ? (
          <div className="no-doctors-found">
            <User size={48} className="empty-icon" />
            <p>Không tìm thấy bác sĩ nào</p>
          </div>
        ) : (
          <div className="doctor-list">
            {doctors.map((doctor) => (
              <div
                key={doctor._id}
                className={`doctor-card ${
                  selectedDoctorId === doctor._id ? "selected" : ""
                }`}
                onClick={() => setSelectedDoctorId(doctor._id)}
              >
                <div className="doctor-card-content">
                  <div className="doctor-avatar">
                    {doctor.avatarUrl ? (
                      <img
                        src={doctor.avatarUrl}
                        alt={doctor.fullName}
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextSibling.style.display = "flex";
                        }}
                      />
                    ) : null}
                    <div className="avatar-placeholder">
                      <User size={24} />
                    </div>
                  </div>
                  <div className="doctor-info">
                    <h4 className="doctor-name">{doctor.fullName}</h4>
                    {doctor.specializationIds &&
                      doctor.specializationIds.length > 0 && (
                        <div className="doctor-specializations">
                          {doctor.specializationIds.map((spec, idx) => (
                            <span key={idx} className="specialization-tag">
                              {spec.name}
                            </span>
                          ))}
                        </div>
                      )}
                    {doctor.ratingAvg > 0 && (
                      <div className="doctor-rating">
                        ⭐ {doctor.ratingAvg.toFixed(1)} ({doctor.ratingCount}{" "}
                        đánh giá)
                      </div>
                    )}
                  </div>
                  {selectedDoctorId === doctor._id && (
                    <div className="selected-badge">✓ Đã chọn</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!selectedDoctorId ? (
        <div className="no-doctor-selected">
          <Calendar size={64} className="empty-icon" />
          <h3>Vui lòng chọn bác sĩ để xem lịch làm việc</h3>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="summary-cards">
            <div className="summary-card pending">
              <div className="summary-label">Chờ duyệt</div>
              <div className="summary-value">{stats.pending}</div>
            </div>
            <div className="summary-card completed">
              <div className="summary-label">Hoàn thành</div>
              <div className="summary-value">{stats.completed}</div>
            </div>
            <div className="summary-card booked">
              <div className="summary-label">Đã đặt</div>
              <div className="summary-value">{stats.booked}</div>
            </div>
            <div className="summary-card cancelled">
              <div className="summary-label">Đã hủy</div>
              <div className="summary-value">{stats.cancelled}</div>
            </div>
          </div>

          {/* Navigation and Controls */}
          <div className="schedule-controls">
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

            <div className="status-filters">
              <span>Trạng thái:</span>
              <button
                className={`status-filter pending ${
                  selectedStatus === "pending" ? "active" : ""
                }`}
                onClick={() => setSelectedStatus("pending")}
              >
                Chờ duyệt
              </button>
              <button
                className={`status-filter completed ${
                  selectedStatus === "completed" ? "active" : ""
                }`}
                onClick={() => setSelectedStatus("completed")}
              >
                Hoàn thành
              </button>
              <button
                className={`status-filter booked ${
                  selectedStatus === "booked" ? "active" : ""
                }`}
                onClick={() => setSelectedStatus("booked")}
              >
                Đã đặt
              </button>
              <button
                className={`status-filter cancelled ${
                  selectedStatus === "cancelled" ? "active" : ""
                }`}
                onClick={() => setSelectedStatus("cancelled")}
              >
                Đã hủy
              </button>
            </div>
          </div>

          <div className="schedule-header">
            <div className="header-left">
              <h1>
                <Calendar className="icon" />
                Lịch làm việc - {selectedDoctor?.fullName}
              </h1>
            </div>

            <div className="header-right">
              <div className="action-buttons">
                <Button
                  onClick={handleGenerateSlots}
                  className="auto-generate-btn"
                  disabled={generating}
                >
                  🚀 Tạo slot tự động
                </Button>
                <Button
                  onClick={() => setCurrentDate(new Date())}
                  className="today-btn"
                >
                  🏠 Hôm nay
                </Button>
                <Button onClick={loadTimeSlots} className="refresh-btn">
                  <RefreshCw size={16} />
                </Button>
              </div>
            </div>
          </div>

          {/* Doctor Pricing Information */}
          {selectedDoctor && (
            <div className="doctor-pricing-info">
              <div className="pricing-card">
                <h3
                  style={{
                    marginBottom: "12px",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#374151",
                  }}
                >
                  💰 Bảng giá khám
                </h3>
                <div className="pricing-grid">
                  {/* Online Pricing */}
                  <div className="pricing-item">
                    <div className="pricing-mode">Khám Online</div>
                    <div className="pricing-details">
                      <div className="pricing-row">
                        <span className="pricing-label">Thứ 2-6:</span>
                        <span className="pricing-value">
                          {(() => {
                            const price = getPriceForDoctor("online", false);
                            return price
                              ? new Intl.NumberFormat("vi-VN", {
                                  style: "currency",
                                  currency: "VND",
                                }).format(price)
                              : "Chưa có giá";
                          })()}
                        </span>
                      </div>
                      <div className="pricing-row">
                        <span className="pricing-label">Thứ 7-CN:</span>
                        <span className="pricing-value">
                          {(() => {
                            const price = getPriceForDoctor("online", true);
                            return price
                              ? new Intl.NumberFormat("vi-VN", {
                                  style: "currency",
                                  currency: "VND",
                                }).format(price)
                              : "Chưa có giá";
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Offline Pricing */}
                  <div className="pricing-item">
                    <div className="pricing-mode">Khám tại phòng khám</div>
                    <div className="pricing-details">
                      <div className="pricing-row">
                        <span className="pricing-label">Thứ 2-6:</span>
                        <span className="pricing-value">
                          {(() => {
                            const price = getPriceForDoctor("offline", false);
                            return price
                              ? new Intl.NumberFormat("vi-VN", {
                                  style: "currency",
                                  currency: "VND",
                                }).format(price)
                              : "Chưa có giá";
                          })()}
                        </span>
                      </div>
                      <div className="pricing-row">
                        <span className="pricing-label">Thứ 7-CN:</span>
                        <span className="pricing-value">
                          {(() => {
                            const price = getPriceForDoctor("offline", true);
                            return price
                              ? new Intl.NumberFormat("vi-VN", {
                                  style: "currency",
                                  currency: "VND",
                                }).format(price)
                              : "Chưa có giá";
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                {selectedDoctor.educationLevel && (
                  <div
                    className="pricing-note"
                    style={{
                      marginTop: "8px",
                      fontSize: "12px",
                      color: "#6b7280",
                    }}
                  >
                    Giá theo trình độ:{" "}
                    <strong>{selectedDoctor.educationLevel}</strong>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="schedule-content">
            {loading && (
              <div className="loading-overlay">
                <div className="loading-spinner"></div>
                <p>Đang tải lịch làm việc...</p>
              </div>
            )}

            {!loading && timeSlotsList.length === 0 && (
              <div className="no-slots-message">
                <div className="empty-state">
                  <Calendar size={64} className="empty-icon" />
                  <h3>Chưa có slot nào trong tuần này</h3>
                  <p>
                    Bấm nút "Tạo slot tự động" để tạo lịch làm việc cho phần còn
                    lại của tháng hiện tại (bao gồm cả cuối tuần)
                  </p>
                  <Button
                    onClick={handleGenerateSlots}
                    className="auto-generate-btn"
                    disabled={generating}
                    size="lg"
                  >
                    🚀 Tạo slot tự động ngay
                  </Button>
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
                      <div
                        key={`label-morning-${dayIndex}`}
                        className="slot-cell"
                      >
                        <div className="slot-content"></div>
                      </div>
                    ))}
                  </div>

                  {timesWithSlots.map((time, timeIndex) => {
                    const hour = parseInt(time.split(":")[0]);
                    const morningStartIndex = timesWithSlots.findIndex(
                      (t) => parseInt(t.split(":")[0]) < 12
                    );
                    const afternoonStartIndex = timesWithSlots.findIndex(
                      (t) => parseInt(t.split(":")[0]) >= 13
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
                            timeIndex === morningStartIndex
                              ? "morning-section"
                              : ""
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

                            if (!slot) {
                              return (
                                <div
                                  key={`${dayIndex}-${timeIndex}`}
                                  className="slot-cell empty-no-border"
                                  onClick={() => {
                                    setSelectedDate(day.fullDate);
                                    setSelectedTime(time);
                                    setSelectedSlot(null);
                                    setBookingData({
                                      patientId: null,
                                      patientName: "",
                                      patientPhone: "",
                                      reason: "",
                                      mode: "offline",
                                    });
                                    setPatientSearchTerm("");
                                    setPatients([]);
                                    setShowPatientDropdown(false);
                                    setShowBookSlot(true);
                                  }}
                                  style={{ cursor: "pointer" }}
                                >
                                  {/* Empty slot - clickable to book */}
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
                                      <button
                                        className="delete-slot-btn"
                                        onClick={(e) => {
                                          e.stopPropagation(); // Prevent opening modal
                                          handleDeleteSlot(slot);
                                        }}
                                        title="Xóa slot"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </>
                                  ) : slot.status === "blocked" ||
                                    (slot.status === "available" &&
                                      slot.hasPendingLeaveRequest) ? (
                                    <div className="booked-slot blocked">
                                      <div className="patient-name-main">
                                        {slot.status === "blocked"
                                          ? getStatusText(
                                              slot.status,
                                              false,
                                              null
                                            )
                                          : getStatusText(
                                              slot.status,
                                              slot.hasPendingLeaveRequest,
                                              slot.rescheduledFromId
                                            )}
                                      </div>
                                    </div>
                                  ) : (
                                    <div
                                      className={`booked-slot ${slot.status}`}
                                    >
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
        </>
      )}

      {/* Block Detail Dialog - Hiển thị lý do nghỉ (chỉ xem, không đăng ký) */}
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

      {/* Book Slot Dialog */}
      <Dialog open={showBookSlot} onOpenChange={setShowBookSlot}>
        <DialogContent className="book-slot-dialog">
          <DialogHeader>
            <DialogTitle>Đặt lịch khám</DialogTitle>
          </DialogHeader>
          <div className="form-group" style={{ position: "relative" }}>
            <label>Chọn bệnh nhân:</label>
            <div className="patient-search-wrapper">
              <Input
                value={patientSearchTerm}
                onChange={(e) => {
                  setPatientSearchTerm(e.target.value);
                  setShowPatientDropdown(true);
                }}
                onFocus={() => {
                  if (
                    patientSearchTerm.trim().length > 0 &&
                    patients.length > 0
                  ) {
                    setShowPatientDropdown(true);
                  }
                }}
                onBlur={(e) => {
                  // Delay closing to allow click on dropdown item
                  setTimeout(() => {
                    if (!e.currentTarget.contains(document.activeElement)) {
                      setShowPatientDropdown(false);
                    }
                  }, 200);
                }}
                placeholder="Tìm kiếm theo tên hoặc số điện thoại..."
                style={{ width: "100%" }}
              />
              {showPatientDropdown &&
                patientSearchTerm.trim().length > 0 &&
                !loadingPatients && (
                  <div
                    className="patient-dropdown"
                    onMouseDown={(e) => e.preventDefault()} // Prevent blur when clicking dropdown
                  >
                    {patients.length > 0 ? (
                      patients.map((patient) => (
                        <div
                          key={patient._id || patient.id}
                          className="patient-dropdown-item"
                          onClick={() => handleSelectPatient(patient)}
                        >
                          <div className="patient-info">
                            <strong>{patient.fullName}</strong>
                            <span className="patient-phone">
                              {patient.phone}
                            </span>
                            {patient.email && (
                              <span className="patient-email">
                                {patient.email}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="patient-dropdown-empty">
                        Không tìm thấy bệnh nhân nào
                      </div>
                    )}
                  </div>
                )}
              {loadingPatients && patientSearchTerm.trim().length > 0 && (
                <div className="patient-dropdown">
                  <div className="patient-dropdown-loading">
                    <div className="loading-spinner"></div>
                    <span>Đang tải...</span>
                  </div>
                </div>
              )}
            </div>
            {bookingData.patientId && (
              <div className="selected-patient-info">
                <span>
                  Đã chọn: <strong>{bookingData.patientName}</strong> -{" "}
                  {bookingData.patientPhone}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setBookingData({
                      ...bookingData,
                      patientId: null,
                      patientName: "",
                      patientPhone: "",
                      dob: "",
                      gender: "",
                      citizenId: "",
                      address: "",
                      allergyNotes: "",
                    });
                    setPatientSearchTerm("");
                    setShowPatientDropdown(false);
                  }}
                  style={{ marginLeft: "8px" }}
                >
                  Xóa
                </Button>
              </div>
            )}
            {!bookingData.patientId && (
              <div
                className="patient-manual-input"
                style={{ marginTop: "12px" }}
              >
                <p
                  style={{
                    fontSize: "14px",
                    color: "#374151",
                    marginBottom: "16px",
                    fontWeight: 500,
                  }}
                >
                  Thông tin bệnh nhân mới (bắt buộc):
                </p>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "4px",
                        fontSize: "13px",
                        fontWeight: 500,
                      }}
                    >
                      Họ và tên <span style={{ color: "red" }}>*</span>
                    </label>
                    <Input
                      data-field="patientName"
                      value={bookingData.patientName}
                      onChange={(e) => {
                        setBookingData({
                          ...bookingData,
                          patientName: e.target.value,
                        });
                        // Clear error when user starts typing
                        if (validationErrors.patientName) {
                          setValidationErrors({
                            ...validationErrors,
                            patientName: "",
                          });
                        }
                      }}
                      onBlur={(e) => {
                        const error = validatePatientName(e.target.value);
                        setValidationErrors({
                          ...validationErrors,
                          patientName: error,
                        });
                      }}
                      placeholder="Nhập họ và tên đầy đủ"
                      style={{
                        borderColor: validationErrors.patientName
                          ? "#ef4444"
                          : undefined,
                      }}
                    />
                    {validationErrors.patientName && (
                      <span
                        style={{
                          color: "#ef4444",
                          fontSize: "12px",
                          marginTop: "4px",
                          display: "block",
                        }}
                      >
                        {validationErrors.patientName}
                      </span>
                    )}
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "4px",
                        fontSize: "13px",
                        fontWeight: 500,
                      }}
                    >
                      Số điện thoại <span style={{ color: "red" }}>*</span>
                    </label>
                    <Input
                      data-field="patientPhone"
                      type="tel"
                      value={bookingData.patientPhone}
                      onChange={(e) => {
                        // Chỉ cho phép số
                        const value = e.target.value.replace(/\D/g, "");
                        setBookingData({
                          ...bookingData,
                          patientPhone: value,
                        });
                        if (validationErrors.patientPhone) {
                          setValidationErrors({
                            ...validationErrors,
                            patientPhone: "",
                          });
                        }
                      }}
                      onBlur={(e) => {
                        const error = validatePhone(e.target.value);
                        setValidationErrors({
                          ...validationErrors,
                          patientPhone: error,
                        });
                      }}
                      placeholder="Nhập số điện thoại (VD: 0912345678)"
                      maxLength={11}
                      style={{
                        borderColor: validationErrors.patientPhone
                          ? "#ef4444"
                          : undefined,
                      }}
                    />
                    {validationErrors.patientPhone && (
                      <span
                        style={{
                          color: "#ef4444",
                          fontSize: "12px",
                          marginTop: "4px",
                          display: "block",
                        }}
                      >
                        {validationErrors.patientPhone}
                      </span>
                    )}
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "4px",
                        fontSize: "13px",
                        fontWeight: 500,
                      }}
                    >
                      Ngày sinh <span style={{ color: "red" }}>*</span>
                    </label>
                    <div
                      data-field="dob"
                      style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "flex-start",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <Select
                          value={bookingData.dobDay || ""}
                          onValueChange={(value) => {
                            setBookingData({
                              ...bookingData,
                              dobDay: value,
                            });
                            if (validationErrors.dob) {
                              setValidationErrors({
                                ...validationErrors,
                                dob: "",
                              });
                            }
                          }}
                        >
                          <SelectTrigger
                            style={{
                              borderColor: validationErrors.dob
                                ? "#ef4444"
                                : undefined,
                            }}
                          >
                            <SelectValue placeholder="Ngày" />
                          </SelectTrigger>
                          <SelectContent>
                            {(() => {
                              // If month and year are selected, show actual days for that month
                              if (bookingData.dobMonth && bookingData.dobYear) {
                                const days = getDays(
                                  parseInt(bookingData.dobMonth),
                                  parseInt(bookingData.dobYear)
                                );
                                return days.map((day) => (
                                  <SelectItem key={day} value={String(day)}>
                                    {day}
                                  </SelectItem>
                                ));
                              } else {
                                // If month/year not selected yet, show all days 1-31
                                // User can select any day, will be validated later
                                return Array.from(
                                  { length: 31 },
                                  (_, i) => i + 1
                                ).map((day) => (
                                  <SelectItem key={day} value={String(day)}>
                                    {day}
                                  </SelectItem>
                                ));
                              }
                            })()}
                          </SelectContent>
                        </Select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <Select
                          value={getMonthDisplayName(bookingData.dobMonth)}
                          onValueChange={(displayValue) => {
                            // Extract numeric month from display value (e.g., "Tháng 1" -> "1")
                            const numericMonth = displayValue.replace(
                              "Tháng ",
                              ""
                            );
                            const newMonth = parseInt(numericMonth);
                            const currentYear = bookingData.dobYear
                              ? parseInt(bookingData.dobYear)
                              : null;
                            const currentDay = bookingData.dobDay
                              ? parseInt(bookingData.dobDay)
                              : null;

                            // If year is selected, validate day against new month
                            let newDay = bookingData.dobDay;
                            if (currentYear && currentDay !== null) {
                              const daysInNewMonth = new Date(
                                currentYear,
                                newMonth,
                                0
                              ).getDate();
                              // If current day is invalid for new month, reset it
                              if (currentDay > daysInNewMonth) {
                                newDay = ""; // Reset if day exceeds max days in new month
                              }
                            }

                            setBookingData({
                              ...bookingData,
                              dobMonth: numericMonth,
                              dobDay: newDay,
                            });
                            if (validationErrors.dob) {
                              setValidationErrors({
                                ...validationErrors,
                                dob: "",
                              });
                            }
                          }}
                        >
                          <SelectTrigger
                            style={{
                              borderColor: validationErrors.dob
                                ? "#ef4444"
                                : undefined,
                            }}
                          >
                            <SelectValue placeholder="Tháng" />
                          </SelectTrigger>
                          <SelectContent>
                            {[
                              { value: "Tháng 1", numeric: "1" },
                              { value: "Tháng 2", numeric: "2" },
                              { value: "Tháng 3", numeric: "3" },
                              { value: "Tháng 4", numeric: "4" },
                              { value: "Tháng 5", numeric: "5" },
                              { value: "Tháng 6", numeric: "6" },
                              { value: "Tháng 7", numeric: "7" },
                              { value: "Tháng 8", numeric: "8" },
                              { value: "Tháng 9", numeric: "9" },
                              { value: "Tháng 10", numeric: "10" },
                              { value: "Tháng 11", numeric: "11" },
                              { value: "Tháng 12", numeric: "12" },
                            ].map((month) => (
                              <SelectItem
                                key={month.numeric}
                                value={month.value}
                              >
                                {month.value}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <Select
                          value={bookingData.dobYear || ""}
                          onValueChange={(value) => {
                            const newYear = parseInt(value);
                            const currentMonth = bookingData.dobMonth
                              ? parseInt(bookingData.dobMonth)
                              : null;
                            const currentDay = bookingData.dobDay
                              ? parseInt(bookingData.dobDay)
                              : null;

                            // If month is selected, validate day against new year (handles leap year)
                            let newDay = bookingData.dobDay;
                            if (currentMonth && currentDay !== null) {
                              const daysInMonth = new Date(
                                newYear,
                                currentMonth,
                                0
                              ).getDate();
                              // If current day is invalid for new year (e.g., Feb 29 in non-leap year), reset it
                              if (currentDay > daysInMonth) {
                                newDay = ""; // Reset if day exceeds max days (e.g., Feb 29 → Feb 28 in non-leap year)
                              }
                            }

                            setBookingData({
                              ...bookingData,
                              dobYear: value,
                              dobDay: newDay,
                            });
                            if (validationErrors.dob) {
                              setValidationErrors({
                                ...validationErrors,
                                dob: "",
                              });
                            }
                          }}
                        >
                          <SelectTrigger
                            style={{
                              borderColor: validationErrors.dob
                                ? "#ef4444"
                                : undefined,
                            }}
                          >
                            <SelectValue placeholder="Năm" />
                          </SelectTrigger>
                          <SelectContent style={{ maxHeight: "200px" }}>
                            {getYears().map((year) => (
                              <SelectItem key={year} value={String(year)}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {validationErrors.dob && (
                      <span
                        style={{
                          color: "#ef4444",
                          fontSize: "12px",
                          marginTop: "4px",
                          display: "block",
                        }}
                      >
                        {validationErrors.dob}
                      </span>
                    )}
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "4px",
                        fontSize: "13px",
                        fontWeight: 500,
                      }}
                    >
                      Giới tính <span style={{ color: "red" }}>*</span>
                    </label>
                    <div data-field="gender">
                      <Select
                        value={bookingData.gender}
                        onValueChange={(value) => {
                          setBookingData({
                            ...bookingData,
                            gender: value,
                          });
                          if (validationErrors.gender) {
                            setValidationErrors({
                              ...validationErrors,
                              gender: "",
                            });
                          }
                        }}
                      >
                        <SelectTrigger
                          style={{
                            borderColor: validationErrors.gender
                              ? "#ef4444"
                              : undefined,
                          }}
                        >
                          <SelectValue placeholder="Chọn giới tính">
                            {bookingData.gender === "male"
                              ? "Nam"
                              : bookingData.gender === "female"
                              ? "Nữ"
                              : bookingData.gender === "other"
                              ? "Khác"
                              : "Chọn giới tính"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Nam</SelectItem>
                          <SelectItem value="female">Nữ</SelectItem>
                          <SelectItem value="other">Khác</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {validationErrors.gender && (
                      <span
                        style={{
                          color: "#ef4444",
                          fontSize: "12px",
                          marginTop: "4px",
                          display: "block",
                        }}
                      >
                        {validationErrors.gender}
                      </span>
                    )}
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "4px",
                        fontSize: "13px",
                        fontWeight: 500,
                      }}
                    >
                      Căn cước công dân <span style={{ color: "red" }}>*</span>
                    </label>
                    <Input
                      data-field="citizenId"
                      value={bookingData.citizenId}
                      onChange={(e) => {
                        // Chỉ cho phép số
                        const value = e.target.value.replace(/\D/g, "");
                        setBookingData({
                          ...bookingData,
                          citizenId: value,
                        });
                        if (validationErrors.citizenId) {
                          setValidationErrors({
                            ...validationErrors,
                            citizenId: "",
                          });
                        }
                      }}
                      onBlur={(e) => {
                        const error = validateCitizenId(e.target.value);
                        setValidationErrors({
                          ...validationErrors,
                          citizenId: error,
                        });
                      }}
                      placeholder="Nhập số căn cước công dân (12 số)"
                      maxLength={12}
                      style={{
                        borderColor: validationErrors.citizenId
                          ? "#ef4444"
                          : undefined,
                      }}
                    />
                    {validationErrors.citizenId && (
                      <span
                        style={{
                          color: "#ef4444",
                          fontSize: "12px",
                          marginTop: "4px",
                          display: "block",
                        }}
                      >
                        {validationErrors.citizenId}
                      </span>
                    )}
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "4px",
                        fontSize: "13px",
                        fontWeight: 500,
                      }}
                    >
                      Địa chỉ <span style={{ color: "red" }}>*</span>
                    </label>
                    <Input
                      data-field="address"
                      value={bookingData.address}
                      onChange={(e) => {
                        setBookingData({
                          ...bookingData,
                          address: e.target.value,
                        });
                        if (validationErrors.address) {
                          setValidationErrors({
                            ...validationErrors,
                            address: "",
                          });
                        }
                      }}
                      onBlur={(e) => {
                        const error = validateAddress(e.target.value);
                        setValidationErrors({
                          ...validationErrors,
                          address: error,
                        });
                      }}
                      placeholder="Nhập địa chỉ nơi ở"
                      style={{
                        borderColor: validationErrors.address
                          ? "#ef4444"
                          : undefined,
                      }}
                    />
                    {validationErrors.address && (
                      <span
                        style={{
                          color: "#ef4444",
                          fontSize: "12px",
                          marginTop: "4px",
                          display: "block",
                        }}
                      >
                        {validationErrors.address}
                      </span>
                    )}
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "4px",
                        fontSize: "13px",
                        fontWeight: 500,
                      }}
                    >
                      Dị ứng / Ghi chú y tế
                    </label>
                    <textarea
                      value={bookingData.allergyNotes}
                      onChange={(e) =>
                        setBookingData({
                          ...bookingData,
                          allergyNotes: e.target.value,
                        })
                      }
                      placeholder="Nhập thông tin dị ứng hoặc ghi chú y tế (nếu có)"
                      style={{
                        width: "100%",
                        minHeight: "80px",
                        padding: "8px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "14px",
                        fontFamily: "inherit",
                        resize: "vertical",
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="form-group">
            <label>Lý do khám:</label>
            <Input
              data-field="reason"
              value={bookingData.reason}
              onChange={(e) => {
                setBookingData({ ...bookingData, reason: e.target.value });
                if (validationErrors.reason) {
                  setValidationErrors({
                    ...validationErrors,
                    reason: "",
                  });
                }
              }}
              onBlur={(e) => {
                const error = validateReason(e.target.value);
                setValidationErrors({
                  ...validationErrors,
                  reason: error,
                });
              }}
              placeholder="Nhập lý do khám..."
              style={{
                borderColor: validationErrors.reason ? "#ef4444" : undefined,
              }}
            />
            {validationErrors.reason && (
              <span
                style={{
                  color: "#ef4444",
                  fontSize: "12px",
                  marginTop: "4px",
                  display: "block",
                }}
              >
                {validationErrors.reason}
              </span>
            )}
          </div>
          <div className="form-group">
            <label>Hình thức khám:</label>
            <div className="mode-checkboxes">
              <span style={{ fontWeight: 600 }}>Khám tại phòng khám</span>
            </div>
            {/* Price display for offline consultation */}
            {(() => {
              let price = null;
              try {
                let dateToCheck = null;
                if (selectedSlot?.startAt) {
                  dateToCheck = new Date(selectedSlot.startAt);
                } else if (selectedDate) {
                  dateToCheck = new Date(`${selectedDate}T00:00:00`);
                }
                if (dateToCheck) {
                  const isWeekend = [0, 6].includes(dateToCheck.getDay());
                  price = getPriceForDoctor("offline", isWeekend);
                }
              } catch (e) {}
              return price ? (
                <div style={{ marginTop: "8px", color: "#0f766e" }}>
                  Giá khám tại phòng:{" "}
                  <strong>
                    {new Intl.NumberFormat("vi-VN", {
                      style: "currency",
                      currency: "VND",
                    }).format(price)}
                  </strong>
                </div>
              ) : null;
            })()}

            <div style={{ marginTop: "12px" }} data-field="clinicId">
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontSize: "13px",
                  fontWeight: 500,
                }}
              >
                Phòng khám
              </label>
              {(() => {
                const selectedDoctor = doctors.find(
                  (d) => d._id === selectedDoctorId
                );
                const clinic = selectedDoctor?.clinicDefaultId;

                if (!selectedDoctor) {
                  return (
                    <div style={{ padding: "12px", color: "#6b7280" }}>
                      Vui lòng chọn bác sĩ trước
                    </div>
                  );
                }

                if (!clinic) {
                  return (
                    <div style={{ padding: "12px", color: "#ef4444" }}>
                      Bác sĩ chưa có phòng khám mặc định. Vui lòng cập nhật
                      thông tin bác sĩ.
                    </div>
                  );
                }

                const clinicName = clinic.name || "N/A";
                const clinicAddress = clinic.address
                  ? ` - ${clinic.address}`
                  : "";

                return (
                  <div
                    style={{
                      padding: "12px",
                      backgroundColor: "#f3f4f6",
                      borderRadius: "6px",
                      border: "1px solid #e5e7eb",
                      color: "#374151",
                    }}
                  >
                    <strong>{clinicName}</strong>
                    {clinicAddress && <span>{clinicAddress}</span>}
                  </div>
                );
              })()}
              {validationErrors.clinicId && (
                <span
                  style={{
                    color: "#ef4444",
                    fontSize: "12px",
                    marginTop: "4px",
                    display: "block",
                  }}
                >
                  {validationErrors.clinicId}
                </span>
              )}
            </div>
          </div>
          <div className="dialog-actions">
            <Button
              onClick={() => {
                setShowBookSlot(false);
                setBookingData({
                  patientId: null,
                  patientName: "",
                  patientPhone: "",
                  dob: "",
                  gender: "",
                  citizenId: "",
                  address: "",
                  allergyNotes: "",
                  reason: "",
                  mode: "offline",
                  clinicId: null,
                });
                setSelectedSlot(null);
                setSelectedDate(null);
                setSelectedTime(null);
                setPatientSearchTerm("");
                setPatients([]);
                setShowPatientDropdown(false);
                setValidationErrors({});
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

              {/* Reschedule button - only show for pending_doctor or accepted status */}
              {(selectedAppointmentDetail.status === "pending_doctor" ||
                selectedAppointmentDetail.status === "accepted") && (
                <div className="detail-actions">
                  <Button
                    className="reschedule-button"
                    onClick={() => {
                      setShowRescheduleModal(true);
                      setShowAppointmentDetail(false);
                    }}
                  >
                    <Calendar size={16} style={{ marginRight: 8 }} />
                    Dời lịch
                  </Button>
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
                        // Manager không có quyền gọi video
                        alert("Chỉ bác sĩ mới có thể bắt đầu cuộc gọi video");
                        setShowAppointmentDetail(false);
                      }}
                    >
                      <Phone size={16} />
                      Xem thông tin cuộc gọi
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

      {/* Reschedule Modal */}
      {selectedAppointmentDetail && (
        <RescheduleModal
          visible={showRescheduleModal}
          appointment={selectedAppointmentDetail}
          onClose={() => {
            setShowRescheduleModal(false);
            setSelectedAppointmentDetail(null);
          }}
          customSubmitHandler={async (requestBody) => {
            // Custom handler for manager to directly reschedule (no approval needed)
            const response = await rescheduleAppointmentByManager(
              requestBody.appointmentId,
              requestBody.newDateTime,
              requestBody.reason,
              requestBody.mode,
              requestBody.clinicId
            );
            return response;
          }}
          onSuccess={async (response) => {
            if (response?.success) {
              await loadTimeSlots(); // Reload slots to show updated appointment
            }
          }}
        />
      )}
    </div>
  );
}
