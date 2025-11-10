import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {
  Row,
  Col,
  Card,
  Typography,
  Button,
  Spin,
  message,
  DatePicker,
  Steps,
  Table,
  Tag,
  Space,
  Modal,
  Alert,
  Empty,
  Radio,
  Avatar,
  Rate,
  Divider,
  Input,
} from "antd";
import {
  CalendarOutlined,
  MedicineBoxOutlined,
  UserOutlined,
  ClockCircleOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  HomeOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
} from "@ant-design/icons";
import NavigationBreadcrumb from "../../../components/Breadcrumb/NavigationBreadcrumb";
import { api } from "../../../lib/api";
import "./DatLichNhieuChuyenKhoa.css";

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

const DatLichNhieuChuyenKhoa = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [visitDate, setVisitDate] = useState(null);
  const [visitId, setVisitId] = useState(null); // Will be set when visit is created
  const [selectedSpecializations, setSelectedSpecializations] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [appointments, setAppointments] = useState([]); // Local appointments, not saved to DB yet
  const [visitStatus, setVisitStatus] = useState("draft"); // draft = not saved to DB
  const [conflicts, setConflicts] = useState([]);

  // Modal states for doctor and slot selection
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [currentSpecialization, setCurrentSpecialization] = useState(null);
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedMode, setSelectedMode] = useState("online");
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [appointmentToReplace, setAppointmentToReplace] = useState(null);
  const [doctorPricing, setDoctorPricing] = useState(null); // Doctor pricing from API
  const [appointmentReason, setAppointmentReason] = useState(""); // Reason for appointment
  const [defaultClinic, setDefaultClinic] = useState(null); // Default clinic for offline appointments
  const [clinicLoading, setClinicLoading] = useState(false); // Loading state for clinic

  // Fetch specializations
  useEffect(() => {
    fetchSpecializations();
  }, []);

  const fetchSpecializations = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/specializations");
      console.log("Specializations response:", response);

      // API returns: { success: true, data: [array of specializations] }
      let specs = [];

      if (response?.success) {
        // Standard response format
        if (Array.isArray(response.data)) {
          specs = response.data;
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          specs = response.data.data;
        } else if (Array.isArray(response.data?.specializations)) {
          specs = response.data.specializations;
        }
      } else if (response?.data?.success) {
        // Nested success
        if (Array.isArray(response.data.data)) {
          specs = response.data.data;
        } else if (Array.isArray(response.data.specializations)) {
          specs = response.data.specializations;
        }
      } else if (Array.isArray(response?.data)) {
        // Direct array in data
        specs = response.data;
      } else if (Array.isArray(response)) {
        // Direct array response
        specs = response;
      }

      console.log("Extracted specializations:", specs);
      setSpecializations(specs);

      if (specs.length === 0) {
        console.warn("No specializations found in response");
      }
    } catch (error) {
      console.error("Error fetching specializations:", error);
      message.error("Không thể tải danh sách chuyên khoa");
      setSpecializations([]);
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Chọn ngày khám
  const handleDateSelect = async (date) => {
    if (!date) return;

    const dateStr = date.format("YYYY-MM-DD");
    setVisitDate(dateStr);

    try {
      setLoading(true);
      const response = await api.get(
        `/api/medical-visits/get-or-create?visitDate=${dateStr}`
      );

      console.log("API Response:", response);

      // Handle both response.data.success and response.success
      if (response?.success || response?.data?.success) {
        const visit = response?.data?.visit || response?.visit;
        if (visit) {
          // Don't set visitId yet - it doesn't exist in DB
          setVisitDate(visit.visitDate);
          setVisitStatus("draft"); // draft = not saved to DB
          setAppointments([]); // Start with empty appointments
          setCurrentStep(1);
          message.success(
            "Đã chọn ngày khám. Vui lòng chọn chuyên khoa và bác sĩ."
          );
        } else {
          console.error("Visit not found in response:", response);
          message.error("Không tìm thấy thông tin phiên khám");
        }
      } else {
        console.error("API response not successful:", response);
        message.error(response?.message || "Không thể tạo phiên khám");
      }
    } catch (error) {
      console.error("Error creating visit:", error);
      message.error(error?.message || "Không thể tạo phiên khám");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Chọn chuyên khoa
  const handleSpecializationSelect = (spec) => {
    const isSelected = selectedSpecializations.some((s) => s._id === spec._id);

    if (isSelected) {
      setSelectedSpecializations(
        selectedSpecializations.filter((s) => s._id !== spec._id)
      );
    } else {
      setSelectedSpecializations([...selectedSpecializations, spec]);
    }
  };

  const handleContinueToSpecialization = () => {
    if (selectedSpecializations.length === 0) {
      message.warning("Vui lòng chọn ít nhất một chuyên khoa");
      return;
    }
    setCurrentStep(2);
  };

  // Step 3: Mở modal chọn bác sĩ và time slot
  const handleOpenDoctorModal = (spec, appointmentToReplace = null) => {
    setCurrentSpecialization(spec);
    setSelectedDoctor(null);
    setSelectedSlot(null);
    setShowDoctorModal(true);
    // Store appointment to replace if provided
    if (appointmentToReplace) {
      setAppointmentToReplace(appointmentToReplace);
      // Pre-select the doctor and mode if replacing
      if (appointmentToReplace.doctor?._id) {
        // We'll set the doctor after fetching doctors list
      }
      if (appointmentToReplace.mode) {
        setSelectedMode(appointmentToReplace.mode);
      }
      if (appointmentToReplace.reason) {
        setAppointmentReason(appointmentToReplace.reason);
      } else {
        setAppointmentReason("");
      }
    } else {
      setAppointmentToReplace(null);
      setSelectedMode("online");
      setAppointmentReason("");
    }
    setDoctorPricing(null);
    setDefaultClinic(null);
    fetchAvailableDoctorsAndSlots(spec._id);
  };

  // Fetch available doctors and slots for a specialization
  const fetchAvailableDoctorsAndSlots = async (specializationId) => {
    try {
      setLoadingDoctors(true);
      const response = await api.get(
        `/api/medical-visits/available-doctors?specializationId=${specializationId}&visitDate=${visitDate}`
      );

      console.log("Available doctors response:", response);

      if (response?.success || response?.data?.success) {
        const doctors = response?.data?.doctors || response?.doctors || [];
        // Ensure all doctors have rating fields with default values
        const doctorsWithRatings = doctors.map(doctor => ({
          ...doctor,
          ratingAvg: doctor.ratingAvg !== undefined && doctor.ratingAvg !== null ? Number(doctor.ratingAvg) : 0,
          ratingCount: doctor.ratingCount !== undefined && doctor.ratingCount !== null ? Number(doctor.ratingCount) : 0,
        }));
        console.log("Available doctors with ratings:", doctorsWithRatings);
        setAvailableDoctors(doctorsWithRatings);
        
        // If replacing appointment, auto-select the same doctor
        if (appointmentToReplace?.doctor?._id) {
          const doctorToSelect = doctors.find(d => d._id === appointmentToReplace.doctor._id);
          if (doctorToSelect) {
            // Auto-select doctor and fetch slots
            setTimeout(() => {
              handleDoctorSelect(doctorToSelect);
            }, 100);
          }
        }
      } else {
        message.error("Không thể tải danh sách bác sĩ");
      }
    } catch (error) {
      console.error("Error fetching doctors:", error);
      message.error("Không thể tải danh sách bác sĩ");
    } finally {
      setLoadingDoctors(false);
    }
  };

  // Fetch doctor pricing
  const fetchDoctorPricing = async (doctorId) => {
    try {
      const response = await api.get(
        `/api/patients/doctors/${doctorId}/pricing`
      );

      if (response.success) {
        setDoctorPricing(response.data.pricing);
        console.log("💰 Fetched doctor pricing:", response.data.pricing);
      } else {
        console.log("No custom pricing, using default");
        setDoctorPricing(null);
      }
    } catch (error) {
      console.error("Error fetching doctor pricing:", error);
      setDoctorPricing(null);
    }
  };

  // Fetch default clinic for doctor
  const fetchDefaultClinic = async (doctorId) => {
    try {
      setClinicLoading(true);
      const response = await api.get(`/api/doctors/${doctorId}/clinics`);

      if (
        response.success &&
        response.data.clinics &&
        response.data.clinics.length > 0
      ) {
        // Lấy phòng khám đầu tiên làm phòng khám mặc định
        setDefaultClinic(response.data.clinics[0]);
      } else {
        console.error("Error fetching clinics:", response.message);
        setDefaultClinic(null);
      }
    } catch (error) {
      console.error("Error fetching clinics:", error);
      setDefaultClinic(null);
    } finally {
      setClinicLoading(false);
    }
  };

  // Helper function to get price for display (weekday or weekend)
  const getPriceForDisplay = (mode, isWeekend = false) => {
    if (!mode) return 0;

    // If doctor has custom pricing from API, use it
    if (doctorPricing && doctorPricing.length > 0) {
      const modePricing = doctorPricing.find((p) => p.mode === mode);
      if (modePricing) {
        return isWeekend ? modePricing.weekendPrice : modePricing.weekdayPrice;
      }
    }

    // No pricing found - return 0 instead of default values
    return 0;
  };

  // Helper function to calculate price based on mode and date
  const calculatePrice = (mode, dateStr) => {
    if (!mode || !dateStr) return 0;

    const date = dayjs(dateStr);
    const dayOfWeek = date.day(); // 0 = Sunday, 6 = Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday

    return getPriceForDisplay(mode, isWeekend);
  };

  // Fetch time slots for selected doctor
  const handleDoctorSelect = async (doctor) => {
    setSelectedDoctor(doctor);
    setSelectedSlot(null);
    
    // Fetch doctor pricing when doctor is selected
    fetchDoctorPricing(doctor._id);
    // Fetch default clinic for offline appointments
    fetchDefaultClinic(doctor._id);

    try {
      setLoadingSlots(true);
      const response = await api.get(
        `/api/patients/doctors/${doctor._id}/time-slots?date=${visitDate}`
      );

      if (response?.success || response?.data?.success) {
        const slots = response?.data?.timeSlots || response?.timeSlots || [];
        
        // IMPORTANT: Use ALL slots from API (including booked and blocked ones)
        // Do NOT filter out any slots - we want to show everything
        let allSlots = [...slots]; // Copy all slots from API response
        
        // If replacing appointment, ensure the current slot is visible and selectable
        if (appointmentToReplace && appointmentToReplace.slotId) {
          // Check if the current slot is already in the list
          const currentSlotExists = allSlots.some(s => 
            s._id?.toString() === appointmentToReplace.slotId?.toString() ||
            (appointmentToReplace.scheduledStart && 
             s.startAt && 
             new Date(s.startAt).getTime() === new Date(appointmentToReplace.scheduledStart).getTime())
          );
          
          // If not found, add it back so user can see the current slot
          if (!currentSlotExists && appointmentToReplace.scheduledStart) {
            const currentSlot = {
              _id: appointmentToReplace.slotId,
              startAt: appointmentToReplace.scheduledStart,
              endAt: appointmentToReplace.scheduledEnd,
              startTime: dayjs(appointmentToReplace.scheduledStart).format("HH:mm"),
              endTime: dayjs(appointmentToReplace.scheduledEnd).format("HH:mm"),
              timeRange: `${dayjs(appointmentToReplace.scheduledStart).format("HH:mm")} - ${dayjs(appointmentToReplace.scheduledEnd).format("HH:mm")}`,
              available: true, // Mark as available since it's being replaced
              isCurrentSlot: true, // Flag to identify this is the current slot
              isBlocked: false,
            };
            allSlots.push(currentSlot);
          } else if (currentSlotExists) {
            // If it exists, mark it as current slot and make it available for re-selection
            allSlots = allSlots.map(s => 
              (s._id?.toString() === appointmentToReplace.slotId?.toString() ||
               (appointmentToReplace.scheduledStart && 
                s.startAt && 
                new Date(s.startAt).getTime() === new Date(appointmentToReplace.scheduledStart).getTime()))
                ? { ...s, isCurrentSlot: true, available: true }
                : s
            );
          }
        }
        
        // Sort all slots by start time to ensure consistent display
        allSlots.sort((a, b) => {
          const timeA = new Date(a.startAt || a.startTime).getTime();
          const timeB = new Date(b.startAt || b.startTime).getTime();
          return timeA - timeB;
        });
        
        
        // Prepare the processed slots with all properties preserved
        const processedSlots = allSlots.map(slot => {
          // Spread all original properties first, then ensure critical ones are set
          return {
            ...slot, // Preserve ALL original properties (timeRange, startTime, endTime, etc.)
            // Ensure these critical properties are always set (override if needed)
            available: slot.available !== undefined ? slot.available : true,
            isBlocked: slot.isBlocked !== undefined ? slot.isBlocked : false,
            appointmentStatus: slot.appointmentStatus || null,
            status: slot.status || 'available',
            leaveReason: slot.leaveReason || null,
            // Ensure timeRange is set if missing
            timeRange: slot.timeRange || 
              (slot.startAt && slot.endAt 
                ? `${dayjs(slot.startAt).format("HH:mm")} - ${dayjs(slot.endAt).format("HH:mm")}`
                : slot.startTime && slot.endTime 
                  ? `${slot.startTime} - ${slot.endTime}`
                  : ''),
            // Ensure startTime and endTime are set if missing
            startTime: slot.startTime || (slot.startAt ? dayjs(slot.startAt).format("HH:mm") : ''),
            endTime: slot.endTime || (slot.endAt ? dayjs(slot.endAt).format("HH:mm") : ''),
          };
        });
        
        // Update doctor object with slots (include ALL slots including booked/blocked ones)
        // Preserve ALL properties from original slot to ensure nothing is lost
        setAvailableDoctors((prev) =>
          prev.map((d) =>
            d._id === doctor._id ? { 
              ...d, 
              availableSlots: processedSlots
            } : d
          )
        );
        
        // IMPORTANT: Also update selectedDoctor with the slots to ensure it's in sync
        // This ensures the UI shows slots immediately, even on first selection
        setSelectedDoctor(prev => {
          if (prev && prev._id === doctor._id) {
            return { ...prev, availableSlots: processedSlots };
          }
          return { ...doctor, availableSlots: processedSlots };
        });
      }
    } catch (error) {
      console.error("Error fetching time slots:", error);
      message.error("Không thể tải khung giờ");
    } finally {
      setLoadingSlots(false);
    }
  };

  // Add appointment to local state (not saved to DB yet)
  const handleAddAppointment = () => {
    if (!selectedDoctor || !selectedSlot) {
      message.warning("Vui lòng chọn bác sĩ và khung giờ");
      return;
    }
    
    if (!selectedMode) {
      message.warning("Vui lòng chọn hình thức khám");
      return;
    }

    // Check for conflicts with existing local appointments (exclude the one being replaced)
    const conflictingAppointment = appointments.find((apt) => {
      // Skip the appointment being replaced
      if (appointmentToReplace && apt._id === appointmentToReplace._id) {
        return false;
      }
      
      const aptStart = new Date(apt.scheduledStart);
      const aptEnd = new Date(apt.scheduledEnd);
      const newStart = new Date(selectedSlot.startAt);
      const newEnd = new Date(selectedSlot.endAt);

      // Check if time slots overlap
      return (
        (newStart >= aptStart && newStart < aptEnd) ||
        (newEnd > aptStart && newEnd <= aptEnd) ||
        (newStart <= aptStart && newEnd >= aptEnd)
      );
    });

    // Check if slot is available (not booked by others in DB or blocked)
    if (!selectedSlot.available || selectedSlot.isBlocked) {
      if (selectedSlot.isBlocked) {
        message.error({
          content: `Không thể đặt lịch! Slot này đã bị chặn bởi bác sĩ${selectedSlot.leaveReason ? `: ${selectedSlot.leaveReason}` : ""}. Vui lòng chọn slot khác.`,
          duration: 5,
        });
      } else {
        message.error({
          content: `Không thể đặt lịch! Slot này đã được đặt bởi bệnh nhân khác. Vui lòng chọn slot khác.`,
          duration: 5,
        });
      }
      return; // Don't add the appointment
    }

    // Check if slot conflicts with existing local appointments
    if (conflictingAppointment) {
      const conflictStart = dayjs(conflictingAppointment.scheduledStart).format("HH:mm");
      const conflictEnd = dayjs(conflictingAppointment.scheduledEnd).format("HH:mm");
      const newStart = dayjs(selectedSlot.startAt || selectedSlot.startTime).format("HH:mm");
      const newEnd = dayjs(selectedSlot.endAt || selectedSlot.endTime).format("HH:mm");
      
      message.error({
        content: `Không thể đặt lịch! Slot ${newStart} - ${newEnd} trùng với lịch hẹn đã chọn (${conflictStart} - ${conflictEnd}) với ${conflictingAppointment.doctor?.fullName || "bác sĩ"}. Vui lòng chọn slot khác.`,
        duration: 5,
      });
      return; // Don't add the appointment
    }

    // Ensure slot has proper date format
    const slotStartAt = selectedSlot.startAt || 
      (selectedSlot.startTime && visitDate 
        ? new Date(`${visitDate}T${selectedSlot.startTime}:00`).toISOString()
        : null);
    const slotEndAt = selectedSlot.endAt || 
      (selectedSlot.endTime && visitDate 
        ? new Date(`${visitDate}T${selectedSlot.endTime}:00`).toISOString()
        : null);

    // Create local appointment object
    const newAppointment = {
      _id: appointmentToReplace ? appointmentToReplace._id : `temp-${Date.now()}`, // Keep same ID if replacing
      doctor: {
        _id: selectedDoctor._id,
        fullName: selectedDoctor.fullName,
        specializationIds: selectedDoctor.specializationIds || [],
        avatarUrl: selectedDoctor.avatarUrl,
        ratingAvg: selectedDoctor.ratingAvg,
        ratingCount: selectedDoctor.ratingCount,
      },
      scheduledStart: slotStartAt,
      scheduledEnd: slotEndAt,
      status: "draft", // Not saved yet
      mode: selectedMode,
      reason: appointmentReason || (appointmentToReplace ? appointmentToReplace.reason : `Khám ${currentSpecialization.name}`),
      // Store original data for saving later
      _tempData: {
        doctorId: selectedDoctor._id,
        slotId: selectedSlot._id,
        mode: selectedMode,
        clinicId: selectedMode === "offline" && defaultClinic ? defaultClinic._id : undefined, // Required for offline
        reason: appointmentReason || (appointmentToReplace ? appointmentToReplace.reason : `Khám ${currentSpecialization.name}`),
      },
      // Store slot reference for display
      slotId: selectedSlot._id,
    };

    // If replacing an appointment, replace it in the list
    if (appointmentToReplace) {
      setAppointments(appointments.map(apt => 
        apt._id === appointmentToReplace._id ? newAppointment : apt
      ));
      message.success("Đã đổi slot thành công");
      setAppointmentToReplace(null);
    } else {
      // Add to local appointments
      setAppointments([...appointments, newAppointment]);
      message.success("Đã thêm lịch hẹn thành công");
    }
    
    setShowDoctorModal(false);
    setSelectedDoctor(null);
    setSelectedSlot(null);
    setSelectedMode("online");
    setAppointmentReason("");
    setDoctorPricing(null);
    setDefaultClinic(null);
  };

  // Step 4: Hoàn tất và tạo visit với appointments (status pending_doctor)
  const handleCompletePlanning = async () => {
    if (!appointments || appointments.length === 0) {
      message.warning("Vui lòng thêm ít nhất một lịch hẹn");
      return;
    }

    try {
      setLoading(true);

      // Prepare appointments data for API
      const appointmentsData = appointments
        .map((apt) => {
          if (apt._tempData) {
            return apt._tempData;
          }
          // Fallback - should not happen if _tempData is set
          return {
            doctorId: apt.doctor?._id,
            slotId: apt.slotId || apt._tempData?.slotId,
            mode: apt.mode,
            clinicId: apt.clinicId || apt._tempData?.clinicId,
            reason: apt.reason || apt._tempData?.reason || "",
          };
        })
        .filter((apt) => apt && apt.doctorId && apt.slotId && apt.mode); // Filter out invalid appointments

      console.log("Prepared appointments data:", appointmentsData);
      console.log("Visit date:", visitDate);
      console.log("Total appointments:", appointments.length);
      console.log("Valid appointments:", appointmentsData.length);

      if (appointmentsData.length === 0) {
        message.error("Không có lịch hẹn hợp lệ để lưu");
        setLoading(false);
        return;
      }

      const response = await api.post("/api/medical-visits/complete-planning", {
        visitDate,
        appointments: appointmentsData,
      });

      console.log("Complete planning response:", response);

      if (response?.success || response?.data?.success) {
        const visit = response?.data?.visit || response?.visit;
        const savedAppointments =
          response?.data?.appointments || response?.appointments || [];

        setVisitId(visit._id);
        setVisitStatus("pending_doctor");
        setAppointments(savedAppointments);
        message.success("Đã gửi yêu cầu đặt lịch. Đang chờ bác sĩ duyệt.");
        setCurrentStep(3);

        // Check for conflicts if any
        if (
          response?.data?.conflicts?.length > 0 ||
          response?.conflicts?.length > 0
        ) {
          const conflictsList =
            response?.data?.conflicts || response?.conflicts || [];
          setConflicts(conflictsList);
          message.warning("Phát hiện xung đột trùng giờ trong các lịch hẹn");
        }
      } else {
        console.error("Complete planning failed:", response);
        message.error(response?.message || "Không thể hoàn tất đặt lịch");
      }
    } catch (error) {
      console.error("Error completing planning:", error);
      message.error(error?.message || "Không thể hoàn tất đặt lịch");
    } finally {
      setLoading(false);
    }
  };

  // Kiểm tra xung đột
  const checkConflicts = async () => {
    try {
      const response = await api.get(
        `/api/medical-visits/check-conflicts?visitId=${visitId}`
      );

      if (response.data?.success) {
        const hasConflicts = response.data.data?.hasConflicts;
        if (hasConflicts) {
          setConflicts(response.data.data?.conflicts || []);
          message.warning("Phát hiện xung đột trùng giờ trong các lịch hẹn");
        }
      }
    } catch (error) {
      console.error("Error checking conflicts:", error);
    }
  };

  // Load visit details (only if visitId exists, i.e., visit is saved to DB)
  const loadVisitDetails = async () => {
    if (!visitId) return;

    try {
      const response = await api.get(`/api/medical-visits/${visitId}`);
      console.log("Load visit details response:", response);

      // Handle different response structures
      let appointments = [];
      let visitStatusValue = visitStatus;

      if (response?.success || response?.data?.success) {
        const visit = response?.data?.visit || response?.visit;
        const appts =
          response?.data?.appointments ||
          response?.appointments ||
          visit?.appointmentIds ||
          [];

        appointments = appts;
        visitStatusValue = visit?.status || visitStatus;

        console.log("Loaded appointments:", appointments);
        console.log("Visit status:", visitStatusValue);
      }

      setVisitStatus(visitStatusValue);
      setAppointments(appointments);
    } catch (error) {
      console.error("Error loading visit details:", error);
      message.error("Không thể tải thông tin phiên khám");
    }
  };

  // Only load visit details if visitId exists (visit is saved to DB)
  useEffect(() => {
    if (visitId && visitStatus !== "draft") {
      loadVisitDetails();
    }
  }, [visitId]);

  const appointmentColumns = [
    {
      title: "Chuyên khoa",
      dataIndex: ["doctor", "specializationIds"],
      key: "specialization",
      render: (specializationIds) => {
        const spec = specializations.find((s) =>
          specializationIds?.some((id) => id._id === s._id)
        );
        return spec?.name || "N/A";
      },
    },
    {
      title: "Bác sĩ",
      dataIndex: ["doctor", "fullName"],
      key: "doctor",
    },
    {
      title: "Thời gian",
      dataIndex: "scheduledStart",
      key: "time",
      render: (start, record) => {
        const startTime = dayjs(start).format("HH:mm");
        const endTime = dayjs(record.scheduledEnd).format("HH:mm");
        return `${startTime} - ${endTime}`;
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        const statusConfig = {
          pending_doctor: { color: "orange", text: "Chờ duyệt" },
          accepted: { color: "green", text: "Đã chấp nhận" },
          rejected: { color: "red", text: "Bị từ chối" },
          cancelled: { color: "default", text: "Đã hủy" },
        };
        const config = statusConfig[status] || {
          color: "default",
          text: status,
        };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: "Hành động",
      key: "action",
      render: (_, record) => {
        if (record.status === "rejected") {
          return (
            <Button
              size="small"
              onClick={() => {
                // TODO: Implement replace appointment modal
                message.info("Chức năng thay thế sẽ được thêm sau");
              }}
            >
              Thay thế
            </Button>
          );
        }
        if (
          record.status === "pending_doctor" ||
          record.status === "accepted"
        ) {
          return (
            <Button
              size="small"
              danger
              onClick={() => handleCancelAppointment(record._id)}
            >
              Hủy
            </Button>
          );
        }
        return null;
      },
    },
  ];

  const handleCancelAppointment = async (appointmentId) => {
    Modal.confirm({
      title: "Xác nhận hủy lịch hẹn",
      content: "Bạn có chắc chắn muốn hủy lịch hẹn này?",
      okText: "Hủy lịch",
      cancelText: "Không",
      onOk: async () => {
        try {
          const response = await api.post(
            "/api/medical-visits/cancel-appointment",
            {
              appointmentId,
            }
          );

          if (response.data?.success) {
            message.success("Đã hủy lịch hẹn");
            loadVisitDetails();
          }
        } catch (error) {
          console.error("Error cancelling appointment:", error);
          message.error("Không thể hủy lịch hẹn");
        }
      },
    });
  };

  return (
    <div className="multi-specialization-booking">
      <div className="container">
        {/* Breadcrumb */}
        <NavigationBreadcrumb
          items={[
            {
              label: "Trang chủ",
              path: "/",
              icon: <HomeOutlined />,
            },
            {
              label: "Đặt lịch",
              path: "/dat-lich",
            },
            {
              label: "Đặt lịch nhiều chuyên khoa",
            },
          ]}
        />

        {/* Header */}
        <div className="page-header">
          <Title level={1}>Đặt lịch nhiều chuyên khoa</Title>
          <Paragraph>
            Chọn ngày khám và đặt nhiều lịch hẹn trong cùng một ngày, gom thành
            một phiên khám
          </Paragraph>
        </div>

        {/* Steps */}
        <Card style={{ marginBottom: 24 }}>
          <Steps current={currentStep}>
            <Step
              title="Chọn ngày khám"
              icon={<CalendarOutlined />}
              description="Chọn ngày bạn muốn khám"
            />
            <Step
              title="Chọn chuyên khoa"
              icon={<MedicineBoxOutlined />}
              description="Chọn các chuyên khoa muốn khám"
            />
            <Step
              title="Chọn bác sĩ & giờ"
              icon={<UserOutlined />}
              description="Chọn bác sĩ và khung giờ cho từng chuyên khoa"
            />
            <Step
              title="Xác nhận"
              icon={<CheckCircleOutlined />}
              description="Xem tổng hợp và xác nhận"
            />
          </Steps>
        </Card>

        {/* Step 0: Chọn ngày */}
        {currentStep === 0 && (
          <Card>
            <Title level={3}>Chọn ngày khám mong muốn</Title>
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
              {loading && <Spin size="large" />}
              <DatePicker
                size="large"
                style={{ width: "100%", maxWidth: 400 }}
                placeholder="Chọn ngày khám"
                disabledDate={(current) =>
                  current && current < dayjs().startOf("day")
                }
                onChange={handleDateSelect}
                disabled={loading}
              />
              <Paragraph type="secondary">
                Bạn có thể đặt nhiều lịch khám trong cùng một ngày
              </Paragraph>
              {visitDate && (
                <Alert
                  message={`Đã chọn ngày: ${visitDate}`}
                  type="info"
                  showIcon
                />
              )}
            </Space>
          </Card>
        )}

        {/* Step 1: Chọn chuyên khoa */}
        {currentStep === 1 && (
          <Card>
            <Title level={3}>Chọn các chuyên khoa muốn khám</Title>
            <Paragraph>
              Bạn có thể chọn nhiều chuyên khoa để khám trong ngày {visitDate}
            </Paragraph>

            {loading && specializations.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <Spin size="large" />
                <Paragraph style={{ marginTop: 16 }}>
                  Đang tải danh sách chuyên khoa...
                </Paragraph>
              </div>
            ) : specializations.length === 0 ? (
              <Empty description="Không có chuyên khoa nào" />
            ) : (
              <>
                <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
                  {specializations.map((spec) => {
                    const isSelected = selectedSpecializations.some(
                      (s) => s._id === spec._id || s === spec._id
                    );
                    return (
                      <Col xs={24} sm={12} md={8} lg={6} key={spec._id || spec}>
                        <Card
                          hoverable
                          className={`specialization-card ${
                            isSelected ? "selected" : ""
                          }`}
                          onClick={() => handleSpecializationSelect(spec)}
                        >
                          <div className="specialization-content">
                            {spec.avatar && (
                              <img
                                src={spec.avatar}
                                alt={spec.name}
                                className="specialization-avatar"
                              />
                            )}
                            <Title level={5}>{spec.name}</Title>
                            {isSelected && (
                              <CheckCircleOutlined className="check-icon" />
                            )}
                          </div>
                        </Card>
                      </Col>
                    );
                  })}
                </Row>

                <Space style={{ marginTop: 24, width: "100%" }} justify="end">
                  <Button onClick={() => setCurrentStep(0)}>Quay lại</Button>
                  <Button
                    type="primary"
                    onClick={handleContinueToSpecialization}
                    disabled={selectedSpecializations.length === 0}
                  >
                    Tiếp tục ({selectedSpecializations.length} chuyên khoa)
                  </Button>
                </Space>
              </>
            )}
          </Card>
        )}

        {/* Step 2: Chọn bác sĩ và giờ cho từng chuyên khoa */}
        {currentStep === 2 && (
          <Card>
            <Title level={3}>Chọn bác sĩ và khung giờ</Title>
            <Paragraph>
              Với mỗi chuyên khoa đã chọn, hãy chọn bác sĩ và khung giờ phù hợp
            </Paragraph>

            {selectedSpecializations.map((spec) => (
              <Card
                key={spec._id}
                style={{ marginTop: 16 }}
                title={
                  <Space>
                    <MedicineBoxOutlined />
                    {spec.name}
                  </Space>
                }
                extra={
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => handleOpenDoctorModal(spec)}
                  >
                    Chọn bác sĩ & giờ
                  </Button>
                }
              >
                {/* List appointments for this specialization */}
                {(() => {
                  const specAppointments =
                    appointments?.filter((apt) => {
                      if (!apt || !apt.doctor) return false;

                      const aptSpecIds = apt.doctor?.specializationIds || [];
                      if (aptSpecIds.length === 0) {
                        console.log("Appointment has no specializations:", apt);
                        return false;
                      }

                      const match = aptSpecIds.some((sid) => {
                        const specId =
                          typeof sid === "object" ? sid._id || sid : sid;
                        const currentSpecId = spec._id || spec;
                        const matchResult =
                          specId?.toString() === currentSpecId?.toString();
                        if (matchResult) {
                          console.log(
                            "Matched appointment:",
                            apt._id,
                            "with spec:",
                            currentSpecId
                          );
                        }
                        return matchResult;
                      });

                      return match;
                    }) || [];

                  console.log(
                    `Specialization ${spec.name} appointments:`,
                    specAppointments
                  );

                  return specAppointments.length > 0 ? (
                    specAppointments                  .map((apt) => (
                    <Card
                      key={apt._id}
                      size="small"
                      style={{ marginBottom: 8 }}
                      actions={
                        visitStatus === "draft" ? [
                          <Space key="actions" size="small">
                            <Button
                              size="small"
                              icon={<EditOutlined />}
                              onClick={() => {
                                // Find the specialization for this appointment
                                const aptSpecIds = apt.doctor?.specializationIds || [];
                                const specForApt = selectedSpecializations.find((s) => {
                                  return aptSpecIds.some((sid) => {
                                    const specId = typeof sid === 'object' ? (sid._id || sid) : sid;
                                    const currentSpecId = s._id || s;
                                    return specId?.toString() === currentSpecId?.toString();
                                  });
                                });
                                if (specForApt) {
                                  handleOpenDoctorModal(specForApt, apt);
                                } else {
                                  message.warning("Không tìm thấy chuyên khoa cho lịch hẹn này");
                                }
                              }}
                            >
                              Đổi slot
                            </Button>,
                            <Button
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => {
                                // Remove from local appointments
                                setAppointments(appointments.filter(a => a._id !== apt._id));
                                message.success("Đã xóa lịch hẹn");
                              }}
                            >
                              Xóa
                            </Button>,
                          </Space>,
                        ] : [
                          <Button
                            size="small"
                            danger
                            onClick={() => handleCancelAppointment(apt._id)}
                          >
                            Hủy
                          </Button>,
                        ]
                      }
                    >
                        <Space direction="vertical" style={{ width: "100%" }}>
                          <Space>
                            <Text strong>{apt.doctor?.fullName || "N/A"}</Text>
                            <Text>
                              {apt.scheduledStart
                                ? `${dayjs(apt.scheduledStart).format(
                                    "HH:mm"
                                  )} - ${dayjs(apt.scheduledEnd).format(
                                    "HH:mm"
                                  )}`
                                : "N/A"}
                            </Text>
                            <Tag color="orange">Chờ duyệt</Tag>
                          </Space>
                          {apt.mode && (
                            <Text type="secondary">
                              Hình thức:{" "}
                              {apt.mode === "online"
                                ? "Trực tuyến"
                                : "Tại phòng khám"}
                            </Text>
                          )}
                        </Space>
                      </Card>
                    ))
                  ) : (
                    <Empty
                      description="Chưa có lịch hẹn nào"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      style={{ padding: "20px 0" }}
                    />
                  );
                })()}
              </Card>
            ))}

            <Space
              style={{ marginTop: 24, width: "100%" }}
              justify="space-between"
            >
              <Button onClick={() => setCurrentStep(1)}>Quay lại</Button>
              <Button
                type="primary"
                onClick={handleCompletePlanning}
                disabled={appointments.length === 0}
              >
                Hoàn tất ({appointments.length} lịch hẹn)
              </Button>
            </Space>
          </Card>
        )}

        {/* Step 3: Tổng hợp */}
        {currentStep === 3 && (
          <Card>
            <Title level={3}>Tổng hợp lịch hẹn</Title>
            <Paragraph>
              Phiên khám của bạn đang chờ bác sĩ duyệt. Bạn có thể theo dõi
              trạng thái dưới đây.
            </Paragraph>

            {conflicts.length > 0 && (
              <Alert
                message="Cảnh báo xung đột trùng giờ"
                description="Một số lịch hẹn của bạn có thời gian trùng nhau. Vui lòng xem và điều chỉnh."
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}

            {appointments.length === 0 ? (
              <Empty description="Chưa có lịch hẹn nào" />
            ) : (
              <Table
                columns={appointmentColumns}
                dataSource={appointments}
                rowKey="_id"
                pagination={false}
              />
            )}

            <Space style={{ marginTop: 24, width: "100%" }} justify="end">
              <Button onClick={() => navigate("/benh-nhan")}>
                Về trang chủ
              </Button>
              <Button
                type="primary"
                onClick={() => {
                  navigate(`/benh-nhan/lich-hen-cua-toi`);
                }}
              >
                Xem lịch hẹn của tôi
              </Button>
            </Space>
          </Card>
        )}

        {/* Modal for selecting doctor and time slot */}
        <Modal
          title={
            appointmentToReplace 
              ? `Đổi slot - ${currentSpecialization?.name}` 
              : `Chọn bác sĩ và khung giờ - ${currentSpecialization?.name}`
          }
          open={showDoctorModal}
          onCancel={() => {
            setShowDoctorModal(false);
            setSelectedDoctor(null);
            setSelectedSlot(null);
            setAppointmentToReplace(null);
            setSelectedMode("online");
            setAppointmentReason("");
            setDoctorPricing(null);
            setDefaultClinic(null);
          }}
          footer={null}
          width={800}
        >
          {loadingDoctors ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <Spin size="large" />
              <Paragraph style={{ marginTop: 16 }}>
                Đang tải danh sách bác sĩ...
              </Paragraph>
            </div>
          ) : availableDoctors.length === 0 ? (
            <Empty description="Không có bác sĩ khả dụng" />
          ) : (
            <>
              {/* Doctor Selection */}
              {!selectedDoctor ? (
                <div>
                  <Title level={4}>Chọn bác sĩ</Title>
                  <Row gutter={[16, 16]}>
                    {availableDoctors.map((doctor) => {
                      const doctorName = doctor.userId?.fullName || doctor.fullName;
                      const displayName = doctorName?.startsWith("BS.") ? doctorName : `BS. ${doctorName}`;
                      const specializationNames = doctor.specializationIds?.map(s => s.name || s).join(", ") || "";
                      
                      return (
                        <Col xs={24} sm={12} md={12} key={doctor._id}>
                          <Card
                            hoverable
                            onClick={() => handleDoctorSelect(doctor)}
                            style={{ cursor: "pointer" }}
                          >
                            <div style={{ display: "flex", gap: 16 }}>
                              <Avatar
                                size={80}
                                src={doctor.avatarUrl}
                                icon={<UserOutlined />}
                                style={{ flexShrink: 0 }}
                              />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <Title level={4} style={{ marginBottom: 8, marginTop: 0 }}>
                                  {displayName}
                                </Title>
                                
                                <div style={{ marginBottom: 8, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                                  {specializationNames && (
                                    <Tag color="blue">{specializationNames}</Tag>
                                  )}
                                  {doctor.educationLevel && (
                                    <Tag color="cyan">{doctor.educationLevel}</Tag>
                                  )}
                                </div>
                                
                                {doctor.yearsExperience && (
                                  <div style={{ marginBottom: 8 }}>
                                    <Text type="secondary">
                                      <UserOutlined style={{ marginRight: 4 }} />
                                      {doctor.yearsExperience} năm kinh nghiệm
                                    </Text>
                                  </div>
                                )}
                                
                                {doctor.bio && (
                                  <Paragraph
                                    ellipsis={{ rows: 2 }}
                                    style={{ marginBottom: 8, fontSize: "14px" }}
                                  >
                                    {doctor.bio}
                                  </Paragraph>
                                )}
                                
                                <div className="doctor-rating" style={{ marginTop: 4 }}>
                                  <Rate disabled value={doctor.ratingAvg || 0} />
                                  <Text type="secondary">
                                    ({doctor.ratingCount || 0} đánh giá)
                                  </Text>
                                </div>
                              </div>
                            </div>
                          </Card>
                        </Col>
                      );
                    })}
                  </Row>
                </div>
              ) : (
                <>
                  {/* Selected Doctor Info */}
                  <Card style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                      <Avatar
                        size={80}
                        src={selectedDoctor.avatarUrl}
                        icon={<UserOutlined />}
                        style={{ flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                          <Title level={4} style={{ marginTop: 0, marginBottom: 8 }}>
                            {(() => {
                              const doctorName = selectedDoctor.userId?.fullName || selectedDoctor.fullName;
                              return doctorName?.startsWith("BS.") ? doctorName : `BS. ${doctorName}`;
                            })()}
                          </Title>
                          <Button
                            size="small"
                            onClick={() => {
                              setSelectedDoctor(null);
                              setSelectedSlot(null);
                            }}
                          >
                            Chọn lại
                          </Button>
                        </div>
                        
                        <div style={{ marginBottom: 8, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                          {selectedDoctor.specializationIds && selectedDoctor.specializationIds.length > 0 && (
                            <Tag color="blue">
                              {selectedDoctor.specializationIds.map(s => s.name || s).join(", ")}
                            </Tag>
                          )}
                          {selectedDoctor.educationLevel && (
                            <Tag color="cyan">{selectedDoctor.educationLevel}</Tag>
                          )}
                        </div>
                        
                        {selectedDoctor.yearsExperience && (
                          <div style={{ marginBottom: 8 }}>
                            <Text type="secondary">
                              <UserOutlined style={{ marginRight: 4 }} />
                              {selectedDoctor.yearsExperience} năm kinh nghiệm
                            </Text>
                          </div>
                        )}
                        
                        {selectedDoctor.bio && (
                          <Paragraph style={{ marginBottom: 8, fontSize: "14px" }}>
                            {selectedDoctor.bio}
                          </Paragraph>
                        )}
                        
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                          <Rate
                            disabled
                            value={selectedDoctor.ratingAvg || 0}
                            style={{ fontSize: 14 }}
                          />
                          <Text type="secondary" style={{ fontSize: "14px" }}>
                            ({selectedDoctor.ratingCount || 0} đánh giá)
                          </Text>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Mode Selection */}
                  <div style={{ marginBottom: 16 }}>
                    <Title level={5}>Chọn hình thức khám</Title>
                    <Radio.Group
                      value={selectedMode}
                      onChange={(e) => setSelectedMode(e.target.value)}
                    >
                      <Radio value="online">Trực tuyến</Radio>
                      <Radio value="offline">Tại phòng khám</Radio>
                    </Radio.Group>
                  </div>

                  {/* Clinic Info - Show when offline mode is selected */}
                  {selectedMode === "offline" && (
                    <div style={{ marginBottom: 16 }}>
                      <Title level={5}>Phòng khám</Title>
                      {clinicLoading ? (
                        <div style={{ padding: "8px 0" }}>
                          <Spin size="small" /> Đang tải thông tin phòng khám...
                        </div>
                      ) : defaultClinic ? (
                        <div
                          style={{
                            padding: "12px",
                            background: "#f5f5f5",
                            borderRadius: "4px",
                            border: "1px solid #d9d9d9",
                          }}
                        >
                          <div style={{ marginBottom: 8 }}>
                            <Text strong>
                              <EnvironmentOutlined style={{ marginRight: 8 }} />
                              {defaultClinic.name}
                            </Text>
                          </div>
                          <div style={{ marginBottom: 4 }}>
                            <Text type="secondary">{defaultClinic.address}</Text>
                          </div>
                          {defaultClinic.phone && (
                            <div>
                              <Text type="secondary">
                                <PhoneOutlined style={{ marginRight: 8 }} />
                                {defaultClinic.phone}
                              </Text>
                            </div>
                          )}
                        </div>
                      ) : (
                        <Text type="secondary">
                          Không có thông tin phòng khám
                        </Text>
                      )}
                    </div>
                  )}

                  {/* Price Table - Show when mode is selected */}
                  {selectedMode && visitDate && (
                    <div style={{ marginBottom: 16 }}>
                      <Text
                        strong
                        style={{ display: "block", marginBottom: 12 }}
                      >
                        Bảng giá
                      </Text>
                      <div
                        style={{
                          border: "1px solid #d9d9d9",
                          borderRadius: "4px",
                          overflow: "hidden",
                        }}
                      >
                        <table
                          style={{
                            width: "100%",
                            borderCollapse: "collapse",
                          }}
                        >
                          <thead>
                            <tr style={{ background: "#fafafa" }}>
                              <th
                                style={{
                                  padding: "12px",
                                  textAlign: "left",
                                  borderBottom: "1px solid #d9d9d9",
                                }}
                              >
                                Hình thức
                              </th>
                              <th
                                style={{
                                  padding: "12px",
                                  textAlign: "center",
                                  borderBottom: "1px solid #d9d9d9",
                                }}
                              >
                                Thứ 2-6
                              </th>
                              <th
                                style={{
                                  padding: "12px",
                                  textAlign: "center",
                                  borderBottom: "1px solid #d9d9d9",
                                }}
                              >
                                Thứ 7-CN
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr
                              style={{
                                background:
                                  selectedMode === "online"
                                    ? "#e6f7ff"
                                    : "#fff",
                              }}
                            >
                              <td
                                style={{ padding: "12px", fontWeight: 600 }}
                              >
                                Khám online
                              </td>
                              <td
                                style={{
                                  padding: "12px",
                                  textAlign: "center",
                                }}
                              >
                                {getPriceForDisplay(
                                  "online",
                                  false
                                ).toLocaleString("vi-VN")}
                                đ
                              </td>
                              <td
                                style={{
                                  padding: "12px",
                                  textAlign: "center",
                                }}
                              >
                                {getPriceForDisplay(
                                  "online",
                                  true
                                ).toLocaleString("vi-VN")}
                                đ
                              </td>
                            </tr>
                            <tr
                              style={{
                                background:
                                  selectedMode === "offline"
                                    ? "#e6f7ff"
                                    : "#fff",
                              }}
                            >
                              <td
                                style={{ padding: "12px", fontWeight: 600 }}
                              >
                                Khám tại phòng khám
                              </td>
                              <td
                                style={{
                                  padding: "12px",
                                  textAlign: "center",
                                }}
                              >
                                {getPriceForDisplay(
                                  "offline",
                                  false
                                ).toLocaleString("vi-VN")}
                                đ
                              </td>
                              <td
                                style={{
                                  padding: "12px",
                                  textAlign: "center",
                                }}
                              >
                                {getPriceForDisplay(
                                  "offline",
                                  true
                                ).toLocaleString("vi-VN")}
                                đ
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div
                        style={{
                          marginTop: 12,
                          padding: "12px",
                          background: "#f6ffed",
                          border: "1px solid #b7eb8f",
                          borderRadius: "4px",
                        }}
                      >
                        <Text strong>
                          💰 Tổng thanh toán:{" "}
                          {calculatePrice(selectedMode, visitDate).toLocaleString("vi-VN")}
                          đ
                        </Text>
                      </div>
                    </div>
                  )}

                  {/* Time Slot Selection */}
                  <Divider />
                  <Title level={5}>Chọn khung giờ</Title>
                  {loadingSlots ? (
                    <Spin />
                  ) : selectedDoctor.availableSlots?.length > 0 ? (
                    <>
                      <Row gutter={[8, 8]}>
                        {selectedDoctor.availableSlots.map((slot) => {
                          // Check if this slot conflicts with existing appointments
                          const slotStart = new Date(slot.startAt || slot.startTime);
                          const slotEnd = new Date(slot.endAt || slot.endTime);
                          
                          // Check if this is the current slot being replaced
                          const isCurrentSlot = appointmentToReplace && (
                            (slot._id && appointmentToReplace.slotId && slot._id.toString() === appointmentToReplace.slotId.toString()) ||
                            (appointmentToReplace.scheduledStart && 
                             slot.startAt && 
                             new Date(slot.startAt).getTime() === new Date(appointmentToReplace.scheduledStart).getTime())
                          );
                          
                          // Check if slot is already used in local appointments
                          const existingAppointment = appointments.find((apt) => {
                            // Skip the appointment being replaced
                            if (appointmentToReplace && apt._id === appointmentToReplace._id) {
                              return false;
                            }
                            
                            const aptStart = new Date(apt.scheduledStart);
                            const aptEnd = new Date(apt.scheduledEnd);
                            
                            // Check if slot time overlaps with appointment time
                            return (
                              (slotStart >= aptStart && slotStart < aptEnd) ||
                              (slotEnd > aptStart && slotEnd <= aptEnd) ||
                              (slotStart <= aptStart && slotEnd >= aptEnd)
                            );
                          });

                          // Slot is disabled if:
                          // 1. It's blocked by doctor
                          // 2. It's already used in local appointments (and not the current slot being replaced)
                          // 3. It's not available from API (booked by other patients in DB) - ALWAYS disable these
                          const isDisabled = slot.isBlocked || 
                            (existingAppointment && !isCurrentSlot) ||
                            (slot.available === false && !isCurrentSlot); // Disable if booked by others in DB (explicitly check for false)

                          const slotTimeDisplay = slot.timeRange || 
                            (slot.startAt && slot.endAt 
                              ? `${dayjs(slot.startAt).format("HH:mm")} - ${dayjs(slot.endAt).format("HH:mm")}`
                              : `${slot.startTime} - ${slot.endTime}`);

                          return (
                            <Col xs={12} sm={8} md={6} key={slot._id || `slot-${slot.startTime}`}>
                              <Button
                                type={
                                  selectedSlot?._id === slot._id ||
                                  (selectedSlot && slot.startAt && selectedSlot.startAt && 
                                   new Date(selectedSlot.startAt).getTime() === new Date(slot.startAt).getTime())
                                    ? "primary"
                                    : "default"
                                }
                                danger={isDisabled && !isCurrentSlot}
                                disabled={isDisabled}
                                block
                                onClick={() => {
                                  if (!isDisabled) {
                                    setSelectedSlot(slot);
                                  } else {
                                    if (slot.isBlocked) {
                                      message.warning(`Slot này đã bị chặn bởi bác sĩ${slot.leaveReason ? `: ${slot.leaveReason}` : ""}. Vui lòng chọn slot khác.`);
                                    } else if (existingAppointment) {
                                      message.warning(`Slot này đã được chọn cho lịch hẹn với ${existingAppointment.doctor?.fullName || "bác sĩ"}. Vui lòng chọn slot khác.`);
                                    } else if (!slot.available) {
                                      message.warning("Slot này đã được đặt bởi bệnh nhân khác. Vui lòng chọn slot khác.");
                                    } else {
                                      message.warning("Slot này không khả dụng. Vui lòng chọn slot khác.");
                                    }
                                  }
                                }}
                                title={
                                  isCurrentSlot
                                    ? "Slot hiện tại (đang được đổi)"
                                    : slot.isBlocked
                                    ? `Slot bị chặn: ${slot.leaveReason || "Bác sĩ không có mặt"}`
                                    : existingAppointment
                                    ? `Slot này đã được chọn cho lịch hẹn với ${existingAppointment.doctor?.fullName || "bác sĩ"}`
                                    : !slot.available
                                    ? "Slot này đã được đặt bởi người khác"
                                    : ""
                                }
                              >
                                {slotTimeDisplay}
                                {isCurrentSlot && " (Hiện tại)"}
                                {existingAppointment && !isCurrentSlot && " (Đã chọn)"}
                                {slot.isBlocked && " (Đã chặn)"}
                                {!slot.available && !existingAppointment && !slot.isBlocked && " (Đã đặt)"}
                              </Button>
                            </Col>
                          );
                        })}
                      </Row>
                      {appointments.some((apt) => {
                        const slotStart = new Date(selectedSlot?.startAt || selectedSlot?.startTime);
                        const slotEnd = new Date(selectedSlot?.endAt || selectedSlot?.endTime);
                        const aptStart = new Date(apt.scheduledStart);
                        const aptEnd = new Date(apt.scheduledEnd);
                        return (
                          (slotStart >= aptStart && slotStart < aptEnd) ||
                          (slotEnd > aptStart && slotEnd <= aptEnd) ||
                          (slotStart <= aptStart && slotEnd >= aptEnd)
                        );
                      }) && selectedSlot && (
                        <Alert
                          message="Cảnh báo"
                          description={`Slot ${dayjs(selectedSlot.startAt || selectedSlot.startTime).format("HH:mm")} - ${dayjs(selectedSlot.endAt || selectedSlot.endTime).format("HH:mm")} trùng với một lịch hẹn đã chọn. Vui lòng chọn slot khác.`}
                          type="warning"
                          showIcon
                          style={{ marginTop: 16 }}
                        />
                      )}
                    </>
                  ) : (
                    <Empty description="Không có khung giờ trống" />
                  )}

                  {/* Reason Input */}
                  <Divider />
                  <div style={{ marginBottom: 16 }}>
                    <Title level={5}>Lý do khám</Title>
                    <TextArea
                      rows={3}
                      placeholder="Mô tả triệu chứng hoặc lý do khám (không bắt buộc)"
                      value={appointmentReason}
                      onChange={(e) => setAppointmentReason(e.target.value)}
                      maxLength={500}
                      showCount
                    />
                  </div>

                  {/* Confirm Button */}
                  <div style={{ marginTop: 24, textAlign: "right" }}>
                    <Space>
                      <Button
                        onClick={() => {
                          setShowDoctorModal(false);
                          setSelectedDoctor(null);
                          setSelectedSlot(null);
                          setAppointmentToReplace(null);
                          setSelectedMode("online");
                          setAppointmentReason("");
                          setDoctorPricing(null);
                          setDefaultClinic(null);
                        }}
                      >
                        Hủy
                      </Button>
                      <Button
                        type="primary"
                        onClick={handleAddAppointment}
                        disabled={!selectedSlot}
                        loading={loading}
                      >
                        {appointmentToReplace ? "Đổi slot" : "Xác nhận"}
                      </Button>
                    </Space>
                  </div>
                </>
              )}
            </>
          )}
        </Modal>
      </div>
    </div>
  );
};

export default DatLichNhieuChuyenKhoa;
