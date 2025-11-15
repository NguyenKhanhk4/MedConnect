import React, { useState, useEffect, useRef } from "react";
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
  Form,
  Select,
  Checkbox,
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
  EyeOutlined,
} from "@ant-design/icons";
import NavigationBreadcrumb from "../../../components/Breadcrumb/NavigationBreadcrumb";
import { api } from "../../../lib/api";
import { CustomAlert } from "../../../components/ui/CustomAlert";
import ClinicMap from "../../../components/ClinicMap/ClinicMap";
import "./DatLichNhieuChuyenKhoa.css";

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;
const { RangePicker } = DatePicker;
const { TextArea } = Input;
const { Option } = Select;

// Giới hạn ký tự cho trường lý do khám
const REASON_MAX_LENGTH = 500;

const DatLichNhieuChuyenKhoa = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [visitDate, setVisitDate] = useState(null);
  const [visitId, setVisitId] = useState(null); // Will be set when visit is created
  const [confirmConfig, setConfirmConfig] = useState(null);

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
  const textareaRef = useRef(null); // Ref to textarea element

  // Modal state for viewing reviews
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewDoctor, setReviewDoctor] = useState(null);
  const [doctorReviews, setDoctorReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsPagination, setReviewsPagination] = useState(null);

  // Payment summary state
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [loadingPaymentSummary, setLoadingPaymentSummary] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Family member booking state
  const [bookingFor, setBookingFor] = useState("me"); // "me" or "family"
  const [familyMembers, setFamilyMembers] = useState([]);
  const [selectedFamilyMember, setSelectedFamilyMember] = useState(null);
  const [loadingFamilyMembers, setLoadingFamilyMembers] = useState(false);
  const [patientIdForBooking, setPatientIdForBooking] = useState(null); // Store patientId for family member booking
  const [familyForm] = Form.useForm(); // Form for family member info
  const [savedFamilyFormValues, setSavedFamilyFormValues] = useState(null); // Store form values when form is filled

  // Fetch reviews when reviewDoctor changes
  useEffect(() => {
    if (reviewDoctor && showReviewModal) {
      fetchDoctorReviews(reviewDoctor._id);
    } else {
      setDoctorReviews([]);
      setReviewsPagination(null);
    }
  }, [reviewDoctor, showReviewModal]);

  const fetchDoctorReviews = async (doctorId) => {
    try {
      setReviewsLoading(true);
      const response = await api.get(
        `/api/doctors/${doctorId}/reviews?limit=10&page=1`
      );

      // Handle different response structures
      let reviews = [];
      let pagination = null;

      if (response?.success || response?.data?.success) {
        // Response structure: { success: true, data: { reviews: [...], pagination: {...} } }
        if (response?.data?.reviews) {
          reviews = response.data.reviews;
          pagination = response.data.pagination;
        } else if (response?.reviews) {
          reviews = response.reviews;
          pagination = response.pagination;
        } else if (response?.data?.data?.reviews) {
          reviews = response.data.data.reviews;
          pagination = response.data.data.pagination;
        }
      } else if (response?.reviews) {
        // Direct reviews in response
        reviews = response.reviews;
        pagination = response.pagination;
      }

      setDoctorReviews(reviews);
      setReviewsPagination(pagination);
    } catch (error) {
      message.error("Không thể tải đánh giá. Vui lòng thử lại.");
      setDoctorReviews([]);
      setReviewsPagination(null);
    } finally {
      setReviewsLoading(false);
    }
  };

  // Fetch specializations
  useEffect(() => {
    fetchSpecializations();
  }, []);

  // Fetch family members when booking for family
  useEffect(() => {
    if (bookingFor === "family") {
      fetchFamilyMembers();
    }
  }, [bookingFor]);

  const fetchSpecializations = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/specializations");

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

      setSpecializations(specs);
    } catch (error) {
      message.error("Không thể tải danh sách chuyên khoa");
      setSpecializations([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch family members
  const fetchFamilyMembers = async () => {
    try {
      setLoadingFamilyMembers(true);
      const response = await api.get("/api/patients/me/family-members");

      if (response.success && response.data.familyMembers) {
        setFamilyMembers(response.data.familyMembers);
      } else {
        message.error("Không thể tải danh sách người thân");
        setFamilyMembers([]);
      }
    } catch (error) {
      message.error("Có lỗi xảy ra khi tải danh sách người thân");
      setFamilyMembers([]);
    } finally {
      setLoadingFamilyMembers(false);
    }
  };

  // Step 0: Chọn ngày khám
  const handleDateSelect = async (date) => {
    if (!date) return;

    const dateStr = date.format("YYYY-MM-DD");
    setVisitDate(dateStr);

    try {
      setLoading(true);
      const response = await api.get(
        `/api/medical-visits/get-or-create?visitDate=${dateStr}`
      );

      // Handle both response.data.success and response.success
      if (response?.success || response?.data?.success) {
        const visit = response?.data?.visit || response?.visit;
        if (visit) {
          // Don't set visitId yet - it doesn't exist in DB
          setVisitDate(visit.visitDate);
          setVisitStatus("draft"); // draft = not saved to DB
          setAppointments([]); // Start with empty appointments
          // Don't auto-advance to next step - user must choose booking for me/family first
          message.success(
            "Đã chọn ngày khám. Vui lòng chọn đặt khám cho mình hoặc người thân."
          );
        } else {
          message.error("Không tìm thấy thông tin phiên khám");
        }
      } else {
        message.error(response?.message || "Không thể tạo phiên khám");
      }
    } catch (error) {
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

      if (response?.success || response?.data?.success) {
        const doctors = response?.data?.doctors || response?.doctors || [];
        // Ensure all doctors have rating fields with default values
        // Check multiple possible locations for rating data
        const doctorsWithRatings = doctors.map((doctor) => {
          // Try to get rating from multiple possible locations
          const ratingAvg =
            doctor.ratingAvg !== undefined && doctor.ratingAvg !== null
              ? Number(doctor.ratingAvg)
              : doctor.userId?.ratingAvg !== undefined &&
                doctor.userId?.ratingAvg !== null
              ? Number(doctor.userId.ratingAvg)
              : doctor.rating?.avg !== undefined && doctor.rating?.avg !== null
              ? Number(doctor.rating.avg)
              : 0;

          const ratingCount =
            doctor.ratingCount !== undefined && doctor.ratingCount !== null
              ? Number(doctor.ratingCount)
              : doctor.userId?.ratingCount !== undefined &&
                doctor.userId?.ratingCount !== null
              ? Number(doctor.userId.ratingCount)
              : doctor.rating?.count !== undefined &&
                doctor.rating?.count !== null
              ? Number(doctor.rating.count)
              : 0;

          return {
            ...doctor,
            ratingAvg,
            ratingCount,
          };
        });
        setAvailableDoctors(doctorsWithRatings);

        // If replacing appointment, auto-select the same doctor
        if (appointmentToReplace?.doctor?._id) {
          const doctorToSelect = doctors.find(
            (d) => d._id === appointmentToReplace.doctor._id
          );
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
      } else {
        setDoctorPricing(null);
      }
    } catch (error) {
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
        setDefaultClinic(null);
      }
    } catch (error) {
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
    // Ensure doctor has rating fields with default values
    const doctorWithRatings = {
      ...doctor,
      ratingAvg:
        doctor.ratingAvg !== undefined && doctor.ratingAvg !== null
          ? Number(doctor.ratingAvg)
          : 0,
      ratingCount:
        doctor.ratingCount !== undefined && doctor.ratingCount !== null
          ? Number(doctor.ratingCount)
          : 0,
    };
    setSelectedDoctor(doctorWithRatings);
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
          const currentSlotExists = allSlots.some(
            (s) =>
              s._id?.toString() === appointmentToReplace.slotId?.toString() ||
              (appointmentToReplace.scheduledStart &&
                s.startAt &&
                new Date(s.startAt).getTime() ===
                  new Date(appointmentToReplace.scheduledStart).getTime())
          );

          // If not found, add it back so user can see the current slot
          if (!currentSlotExists && appointmentToReplace.scheduledStart) {
            const currentSlot = {
              _id: appointmentToReplace.slotId,
              startAt: appointmentToReplace.scheduledStart,
              endAt: appointmentToReplace.scheduledEnd,
              startTime: dayjs(appointmentToReplace.scheduledStart).format(
                "HH:mm"
              ),
              endTime: dayjs(appointmentToReplace.scheduledEnd).format("HH:mm"),
              timeRange: `${dayjs(appointmentToReplace.scheduledStart).format(
                "HH:mm"
              )} - ${dayjs(appointmentToReplace.scheduledEnd).format("HH:mm")}`,
              available: true, // Mark as available since it's being replaced
              isCurrentSlot: true, // Flag to identify this is the current slot
              isBlocked: false,
            };
            allSlots.push(currentSlot);
          } else if (currentSlotExists) {
            // If it exists, mark it as current slot and make it available for re-selection
            allSlots = allSlots.map((s) =>
              s._id?.toString() === appointmentToReplace.slotId?.toString() ||
              (appointmentToReplace.scheduledStart &&
                s.startAt &&
                new Date(s.startAt).getTime() ===
                  new Date(appointmentToReplace.scheduledStart).getTime())
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
        const processedSlots = allSlots.map((slot) => {
          // Spread all original properties first, then ensure critical ones are set
          return {
            ...slot, // Preserve ALL original properties (timeRange, startTime, endTime, etc.)
            // Ensure these critical properties are always set (override if needed)
            available: slot.available !== undefined ? slot.available : true,
            isBlocked: slot.isBlocked !== undefined ? slot.isBlocked : false,
            appointmentStatus: slot.appointmentStatus || null,
            status: slot.status || "available",
            leaveReason: slot.leaveReason || null,
            // Ensure timeRange is set if missing
            timeRange:
              slot.timeRange ||
              (slot.startAt && slot.endAt
                ? `${dayjs(slot.startAt).format("HH:mm")} - ${dayjs(
                    slot.endAt
                  ).format("HH:mm")}`
                : slot.startTime && slot.endTime
                ? `${slot.startTime} - ${slot.endTime}`
                : ""),
            // Ensure startTime and endTime are set if missing
            startTime:
              slot.startTime ||
              (slot.startAt ? dayjs(slot.startAt).format("HH:mm") : ""),
            endTime:
              slot.endTime ||
              (slot.endAt ? dayjs(slot.endAt).format("HH:mm") : ""),
          };
        });

        // Update doctor object with slots (include ALL slots including booked/blocked ones)
        // Preserve ALL properties from original slot to ensure nothing is lost
        setAvailableDoctors((prev) =>
          prev.map((d) =>
            d._id === doctor._id
              ? {
                  ...d,
                  availableSlots: processedSlots,
                }
              : d
          )
        );

        // IMPORTANT: Also update selectedDoctor with the slots to ensure it's in sync
        // This ensures the UI shows slots immediately, even on first selection
        setSelectedDoctor((prev) => {
          if (prev && prev._id === doctor._id) {
            return { ...prev, availableSlots: processedSlots };
          }
          return { ...doctor, availableSlots: processedSlots };
        });
      }
    } catch (error) {
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
          content: `Không thể đặt lịch! Slot này đã bị chặn bởi bác sĩ${
            selectedSlot.leaveReason ? `: ${selectedSlot.leaveReason}` : ""
          }. Vui lòng chọn slot khác.`,
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
      const conflictStart = dayjs(conflictingAppointment.scheduledStart).format(
        "HH:mm"
      );
      const conflictEnd = dayjs(conflictingAppointment.scheduledEnd).format(
        "HH:mm"
      );
      const newStart = dayjs(
        selectedSlot.startAt || selectedSlot.startTime
      ).format("HH:mm");
      const newEnd = dayjs(selectedSlot.endAt || selectedSlot.endTime).format(
        "HH:mm"
      );

      message.error({
        content: `Không thể đặt lịch! Slot ${newStart} - ${newEnd} trùng với lịch hẹn đã chọn (${conflictStart} - ${conflictEnd}) với ${
          conflictingAppointment.doctor?.fullName || "bác sĩ"
        }. Vui lòng chọn slot khác.`,
        duration: 5,
      });
      return; // Don't add the appointment
    }

    // Ensure slot has proper date format
    const slotStartAt =
      selectedSlot.startAt ||
      (selectedSlot.startTime && visitDate
        ? new Date(`${visitDate}T${selectedSlot.startTime}:00`).toISOString()
        : null);
    const slotEndAt =
      selectedSlot.endAt ||
      (selectedSlot.endTime && visitDate
        ? new Date(`${visitDate}T${selectedSlot.endTime}:00`).toISOString()
        : null);

    // Create local appointment object
    const trimmedReason =
      typeof appointmentReason === "string" ? appointmentReason.trim() : "";

    const newAppointment = {
      _id: appointmentToReplace
        ? appointmentToReplace._id
        : `temp-${Date.now()}`, // Keep same ID if replacing
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
      reason:
        trimmedReason ||
        (appointmentToReplace && appointmentToReplace.reason
          ? appointmentToReplace.reason
          : ""),
      // Store original data for saving later
      _tempData: {
        doctorId: selectedDoctor._id,
        slotId: selectedSlot._id,
        mode: selectedMode,
        clinicId:
          selectedMode === "offline" && defaultClinic
            ? defaultClinic._id
            : undefined, // Required for offline
        reason:
          trimmedReason ||
          (appointmentToReplace && appointmentToReplace.reason
            ? appointmentToReplace.reason
            : ""),
      },
      // Store slot reference for display
      slotId: selectedSlot._id,
    };

    // If replacing an appointment, replace it in the list
    if (appointmentToReplace) {
      setAppointments(
        appointments.map((apt) =>
          apt._id === appointmentToReplace._id ? newAppointment : apt
        )
      );
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

  // Step 3: Hoàn tất và hiển thị hóa đơn (KHÔNG tạo visit/appointments trong DB)
  const handleCompletePlanning = async () => {
    if (!appointments || appointments.length === 0) {
      message.warning("Vui lòng thêm ít nhất một lịch hẹn");
      return;
    }

    // Use state patientIdForBooking directly, not a local variable (giống đặt lịch đơn)
    let currentPatientIdForBooking = patientIdForBooking;

    // Validate profile if booking for "me" (giống đặt lịch đơn)
    if (bookingFor === "me") {
      // IMPORTANT: Đảm bảo reset patientIdForBooking ngay khi booking for "me"
      setPatientIdForBooking(null);
      currentPatientIdForBooking = null;
    }

    // Validate and create family member if booking for family
    if (bookingFor === "family") {
      try {
        // Create or get family member
        // If patientIdForBooking is already set (selected from dropdown), use it
        if (currentPatientIdForBooking && selectedFamilyMember) {
          // Using existing family member, no need to create new
          console.log("Using existing family member:", currentPatientIdForBooking);
        } else {
          // Validate family form for new member
          let familyValues;
          try {
            // Try validateFields first (only if form is still mounted)
            if (familyForm && typeof familyForm.validateFields === "function") {
              try {
                familyValues = await familyForm.validateFields();
              } catch (validationError) {
                // Continue to try getFieldsValue
              }
            }

            // If validateFields returns empty or form is unmounted, try getFieldsValue
            if (!familyValues || Object.keys(familyValues).length === 0) {
              try {
                if (
                  familyForm &&
                  typeof familyForm.getFieldsValue === "function"
                ) {
                  familyValues = familyForm.getFieldsValue(true); // true = include disabled fields

                  // If still empty, try without disabled fields
                  if (!familyValues || Object.keys(familyValues).length === 0) {
                    familyValues = familyForm.getFieldsValue(false);
                  }
                }
              } catch (e) {
                // Ignore
              }
            }

            // If still empty, use saved form values from state
            if (!familyValues || Object.keys(familyValues).length === 0) {
              if (
                savedFamilyFormValues &&
                Object.keys(savedFamilyFormValues).length > 0
              ) {
                familyValues = savedFamilyFormValues;
              } else {
                message.error("Vui lòng điền đầy đủ thông tin người thân");
                setLoading(false);
                return;
              }
            }
          } catch (validationError) {
            // Form validation failed
            // Try to get values anyway
            try {
              if (
                familyForm &&
                typeof familyForm.getFieldsValue === "function"
              ) {
                familyValues = familyForm.getFieldsValue(true);
              }
            } catch (e) {
              // Ignore
            }

            // If still empty, use saved form values
            if (
              (!familyValues || Object.keys(familyValues).length === 0) &&
              savedFamilyFormValues
            ) {
              familyValues = savedFamilyFormValues;
            }

            if (validationError.errorFields) {
              const missingFields = validationError.errorFields
                .map((f) => f.name)
                .join(", ");
              message.error(`Vui lòng điền đầy đủ thông tin: ${missingFields}`);
            } else {
              message.error("Vui lòng kiểm tra lại thông tin đã nhập");
            }

            // If we have values, continue; otherwise return
            if (!familyValues || Object.keys(familyValues).length === 0) {
              setLoading(false);
              return;
            }
          }

          // Format dob properly first to check if it's valid
          let dobFormatted = null;
          if (familyValues.dob) {
            try {
              if (typeof familyValues.dob.format === "function") {
                // dayjs object - try to format it
                try {
                  dobFormatted = familyValues.dob.format("YYYY-MM-DD");
                } catch (formatError) {
                  // Try to convert to dayjs and format
                  const dayjsObj = dayjs(familyValues.dob);
                  if (dayjsObj.isValid()) {
                    dobFormatted = dayjsObj.format("YYYY-MM-DD");
                  }
                }
              } else if (
                typeof familyValues.dob === "string" &&
                familyValues.dob.trim()
              ) {
                // Already a string
                dobFormatted = familyValues.dob.trim();
              } else if (familyValues.dob instanceof Date) {
                // Date object
                dobFormatted = dayjs(familyValues.dob).format("YYYY-MM-DD");
              }
            } catch (e) {
              // Ignore
            }
          }

          // Validate required fields with proper checks
          const fullNameValid =
            familyValues.fullName &&
            typeof familyValues.fullName === "string" &&
            familyValues.fullName.trim().length > 0;
          const dobValid =
            dobFormatted &&
            typeof dobFormatted === "string" &&
            dobFormatted.length > 0;
          const genderValid =
            familyValues.gender &&
            typeof familyValues.gender === "string" &&
            ["male", "female", "other"].includes(familyValues.gender);
          const relationshipValid =
            familyValues.relationshipToOwner &&
            typeof familyValues.relationshipToOwner === "string" &&
            [
              "father",
              "mother",
              "spouse",
              "child",
              "grandparent",
              "other",
            ].includes(familyValues.relationshipToOwner);

          if (
            !fullNameValid ||
            !dobValid ||
            !genderValid ||
            !relationshipValid
          ) {
            const missingFields = [];
            if (!fullNameValid) missingFields.push("Họ tên");
            if (!dobValid) missingFields.push("Ngày sinh");
            if (!genderValid) missingFields.push("Giới tính");
            if (!relationshipValid) missingFields.push("Mối quan hệ");

            message.error(
              `Vui lòng điền đầy đủ các thông tin bắt buộc: ${missingFields.join(
                ", "
              )}`
            );
            setLoading(false);
            return;
          }

          // Create new family member
          const familyResponse = await api.post(
            "/api/patients/me/family-members",
            {
              fullName: familyValues.fullName?.trim() || "",
              dob: dobFormatted,
              gender: familyValues.gender,
              ethnicity: familyValues.ethnicity || "",
              occupation: familyValues.occupation || "",
              bloodType: familyValues.bloodType || "Unknown",
              relationshipToOwner: familyValues.relationshipToOwner,
              phone: familyValues.phone?.trim() || "",
              citizenId: familyValues.citizenId?.trim() || "",
              address: familyValues.address?.trim() || "",
              allergyNotes: familyValues.allergyNotes || "",
              medicalHistory: Array.isArray(familyValues.medicalHistory)
                ? familyValues.medicalHistory
                : [],
            }
          );

          if (familyResponse.success) {
            message.success("Thêm người thân thành công!");
            const newPatientId = familyResponse.data.patient._id;
            setPatientIdForBooking(newPatientId);
            currentPatientIdForBooking = newPatientId;
            await fetchFamilyMembers();
          } else {
            const errorMsg =
              familyResponse.message ||
              familyResponse.data?.message ||
              "Thêm người thân thất bại";
            message.error(errorMsg);
            setLoading(false);
            return;
          }
        }
      } catch (error) {
        if (error.errorFields) {
          // Form validation error
          message.error("Vui lòng điền đầy đủ thông tin người thân");
        } else if (error.response?.data?.message) {
          // API error with message
          message.error(error.response.data.message);
        } else if (error.message) {
          // General error
          message.error(error.message);
        } else {
          message.error("Có lỗi xảy ra khi thêm người thân. Vui lòng thử lại.");
        }
        setLoading(false);
        return;
      }
    }

    try {
      setLoading(true);

      // Prepare appointments data for API
      const appointmentsData = appointments
        .map((apt) => {
          const aptData = apt._tempData
            ? { ...apt._tempData }
            : {
                doctorId: apt.doctor?._id || apt.doctorId,
                slotId: apt.slotId || apt._tempData?.slotId,
                mode: apt.mode,
                clinicId: apt.clinicId || apt._tempData?.clinicId,
                reason: apt.reason || apt._tempData?.reason || "",
              };

          // Add patientId for family member booking
          if (bookingFor === "family" && currentPatientIdForBooking) {
            aptData.patientId = currentPatientIdForBooking;
          }

          return aptData;
        })
        .filter((apt) => apt && apt.doctorId && apt.slotId && apt.mode); // Filter out invalid appointments

      if (appointmentsData.length === 0) {
        message.error("Không có lịch hẹn hợp lệ để lưu");
        setLoading(false);
        return;
      }

      // Call calculatePaymentSummary to get payment summary (KHÔNG tạo visit/appointments)
      const response = await api.post("/api/medical-visits/complete-planning", {
        visitDate,
        appointments: appointmentsData,
      });

      if (response?.success || response?.data?.success) {
        const data = response?.data || response;

        // Set payment summary directly from response
        setPaymentSummary({
          totalAmount: data.totalAmount || 0,
          appointmentSummaries: data.appointmentSummaries || [],
          acceptedAppointments: data.appointmentSummaries || [], // All appointments are "accepted" for payment
          acceptedCount:
            data.appointmentsCount || data.appointmentSummaries?.length || 0,
          pendingCount: 0,
          rejectedCount: 0,
          totalCount:
            data.appointmentsCount || data.appointmentSummaries?.length || 0,
        });

        // Check for conflicts if any
        if (data.conflicts && data.conflicts.length > 0) {
          setConflicts(data.conflicts);
          message.warning("Phát hiện xung đột trùng giờ trong các lịch hẹn");
        }

        // Move to step 3 (payment summary)
        setCurrentStep(3);
        message.success(
          "Đã tính toán hóa đơn. Vui lòng xem và xác nhận thanh toán."
        );
      } else {
        message.error(response?.message || "Không thể tính toán hóa đơn");
      }
    } catch (error) {
      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Không thể tính toán hóa đơn"
      );
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
      // Silent fail - conflicts are not critical
    }
  };

  // Load visit details (only if visitId exists, i.e., visit is saved to DB)
  const loadVisitDetails = async () => {
    if (!visitId) return;

    try {
      const response = await api.get(`/api/medical-visits/${visitId}`);

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
      }

      setVisitStatus(visitStatusValue);
      setAppointments(appointments);
    } catch (error) {
      message.error("Không thể tải thông tin phiên khám");
    }
  };

  // Only load visit details if visitId exists (visit is saved to DB)
  useEffect(() => {
    if (visitId && visitStatus !== "draft") {
      loadVisitDetails();
    }
  }, [visitId]);

  // Load payment summary for visit (BACKWARD COMPATIBILITY - chỉ dùng cho visit đã tồn tại)
  const loadPaymentSummary = async (visitIdParam) => {
    if (!visitIdParam) return;

    try {
      setLoadingPaymentSummary(true);
      const response = await api.get(
        `/api/medical-visits/${visitIdParam}/payment-summary`
      );

      let summary = null;
      if (response?.success) {
        summary = response?.data || response;
        if (summary && "success" in summary) {
          delete summary.success;
        }
        setPaymentSummary(summary);
      } else {
        summary = response?.data || response;
        if (summary && (!("success" in summary) || summary.success !== false)) {
          setPaymentSummary(summary);
        } else {
          setPaymentSummary(null);
        }
      }
    } catch (error) {
      const errorMessage = error?.message || "";
      if (
        errorMessage.includes("404") ||
        errorMessage.includes("Không tìm thấy")
      ) {
        setPaymentSummary({
          totalAmount: 0,
          acceptedAppointments: [],
          acceptedCount: 0,
          pendingCount: appointments?.length || 0,
          rejectedCount: 0,
          totalCount: appointments?.length || 0,
          message: "Chưa có appointments được chấp nhận để thanh toán",
        });
      } else {
        setPaymentSummary(null);
      }
    } finally {
      setLoadingPaymentSummary(false);
    }
  };

  // Handle payment confirmation - redirect to PayOS (NEW FLOW: tạo payment trước, visit/appointments sau)
  const handleConfirmPayment = async () => {
    if (!visitDate) {
      message.error("Không tìm thấy thông tin ngày khám");
      return;
    }

    if (!appointments || appointments.length === 0) {
      message.error("Không có lịch hẹn nào để thanh toán");
      return;
    }

    if (!paymentSummary || paymentSummary.totalAmount === 0) {
      message.warning("Không có phí nào cần thanh toán");
      return;
    }

    try {
      setProcessingPayment(true);

      // Prepare appointments data for payment creation
      const appointmentsData = appointments
        .map((apt) => {
          const aptData = apt._tempData
            ? { ...apt._tempData }
            : {
                doctorId: apt.doctor?._id || apt.doctorId,
                slotId: apt.slotId || apt._tempData?.slotId,
                mode: apt.mode,
                clinicId: apt.clinicId || apt._tempData?.clinicId,
                reason: apt.reason || apt._tempData?.reason || "",
              };

          // Add patientId for family member booking
          if (bookingFor === "family" && patientIdForBooking) {
            aptData.patientId = patientIdForBooking;
          }

          return aptData;
        })
        .filter((apt) => apt && apt.doctorId && apt.slotId && apt.mode);

      if (appointmentsData.length === 0) {
        message.error("Không có lịch hẹn hợp lệ để thanh toán");
        setProcessingPayment(false);
        return;
      }

      // Create payment với appointments data (NEW FLOW - không cần visitId)
      const response = await api.post("/api/medical-visits/create-payment", {
        visitDate,
        appointments: appointmentsData,
        gateway: "payos",
        method: "qr", // QR code payment
      });

      if (response?.success || response?.data?.success) {
        // Response structure: ok(res, { paymentId, payUrl, orderCode, ... })
        const paymentData = response?.data || response;
        const payUrl = paymentData?.payUrl || paymentData?.paymentLink;

        if (payUrl) {
          // Redirect to PayOS payment page
          // Sau khi thanh toán thành công, webhook sẽ tạo visit và appointments với status "pending_doctor"
          window.location.href = payUrl;
        } else {
          message.error("Không thể tạo liên kết thanh toán");
        }
      } else {
        message.error(response?.message || "Không thể tạo thanh toán");
      }
    } catch (error) {
      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Không thể tạo thanh toán"
      );
    } finally {
      setProcessingPayment(false);
    }
  };

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
    showConfirm("Bạn có chắc chắn muốn hủy lịch hẹn này?", async () => {
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
        message.error("Không thể hủy lịch hẹn");
      }
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
              description="Chọn ngày và người khám"
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

        {/* Step 0: Chọn ngày và người khám */}
        {currentStep === 0 && (
          <Card>
            <Title level={3}>Chọn ngày khám mong muốn</Title>
            <Row gutter={24}>
              {/* Left: Date Picker and Booking Selection */}
              <Col xs={24} md={12}>
                <Space
                  direction="vertical"
                  size="large"
                  style={{ width: "100%" }}
                >
                  {loading && <Spin size="large" />}

                  {/* Date Picker Section */}
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: 12,
                      }}
                    >
                      <CalendarOutlined
                        style={{
                          marginRight: 8,
                          fontSize: 18,
                          color: "#1890ff",
                        }}
                      />
                      <Text strong style={{ fontSize: 16 }}>
                        CHỌN NGÀY KHÁM
                      </Text>
                    </div>
                    <Text
                      type="secondary"
                      style={{
                        display: "block",
                        marginBottom: 12,
                        fontSize: 14,
                      }}
                    >
                      Chọn ngày muốn khám
                    </Text>
                    <DatePicker
                      size="large"
                      style={{ width: "100%" }}
                      placeholder="dd/mm/yyyy"
                      format="DD/MM/YYYY"
                      disabledDate={(current) =>
                        current && current < dayjs().startOf("day")
                      }
                      onChange={handleDateSelect}
                      disabled={loading}
                    />
                  </div>

                  {/* Info Alert */}
                  {visitDate && (
                    <Alert
                      message="Bạn có thể đặt nhiều lịch khám trong cùng một ngày"
                      type="info"
                      showIcon
                      style={{ marginTop: 16 }}
                    />
                  )}

                  {/* Booking For Selection - Below Date Picker */}
                  {visitDate && (
                    <div style={{ marginTop: 24 }}>
                      <Text
                        strong
                        style={{ display: "block", marginBottom: 12 }}
                      >
                        Đặt khám cho:
                      </Text>
                      <Row gutter={12}>
                        <Col span={12}>
                          <Button
                            type={bookingFor === "me" ? "primary" : "default"}
                            size="large"
                            block
                            onClick={() => {
                              setBookingFor("me");
                              setSelectedFamilyMember(null);
                              familyForm.resetFields();
                            }}
                            style={{
                              height: 48,
                              fontSize: 15,
                              fontWeight: 500,
                            }}
                          >
                            Khám cho mình
                          </Button>
                        </Col>
                        <Col span={12}>
                          <Button
                            type={
                              bookingFor === "family" ? "primary" : "default"
                            }
                            size="large"
                            block
                            onClick={() => {
                              setBookingFor("family");
                              setSelectedFamilyMember(null);
                            }}
                            style={{
                              height: 48,
                              fontSize: 15,
                              fontWeight: 500,
                            }}
                          >
                            Khám cho người thân
                          </Button>
                        </Col>
                      </Row>
                    </div>
                  )}

                  {/* Continue Button - Only show when booking for me */}
                  {visitDate && bookingFor === "me" && (
                    <div style={{ marginTop: 24 }}>
                      <Button
                        type="primary"
                        size="large"
                        block
                        onClick={() => setCurrentStep(1)}
                        style={{
                          height: 50,
                          fontSize: 16,
                          fontWeight: 600,
                        }}
                      >
                        Tiếp tục →
                      </Button>
                    </div>
                  )}

                  {/* Info boxes */}
                  <Row gutter={16} style={{ marginTop: 24 }}>
                    <Col span={12}>
                      <div
                        style={{
                          padding: 16,
                          background: "#f6ffed",
                          borderRadius: 8,
                          border: "1px solid #b7eb8f",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            marginBottom: 8,
                          }}
                        >
                          <CheckCircleOutlined
                            style={{ color: "#52c41a", marginRight: 8 }}
                          />
                          <Text strong style={{ color: "#52c41a" }}>
                            Nhanh chóng
                          </Text>
                        </div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Đăng ký trong 2 phút
                        </Text>
                      </div>
                    </Col>
                    <Col span={12}>
                      <div
                        style={{
                          padding: 16,
                          background: "#f6ffed",
                          borderRadius: 8,
                          border: "1px solid #b7eb8f",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            marginBottom: 8,
                          }}
                        >
                          <CheckCircleOutlined
                            style={{ color: "#52c41a", marginRight: 8 }}
                          />
                          <Text strong style={{ color: "#52c41a" }}>
                            An toàn
                          </Text>
                        </div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Bảo mật thông tin 100%
                        </Text>
                      </div>
                    </Col>
                  </Row>
                </Space>
              </Col>

              {/* Right: Family Member Form - Only show when booking for family */}
              {bookingFor === "family" && (
                <Col xs={24} md={12}>
                  <Card style={{ background: "#fff" }}>
                    <div style={{ marginBottom: 16 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          marginBottom: 8,
                        }}
                      >
                        <Text strong style={{ fontSize: 16, marginRight: 8 }}>
                          1
                        </Text>
                        <Title level={4} style={{ margin: 0 }}>
                          Thông tin người thân
                        </Title>
                      </div>
                      <Text type="secondary" style={{ fontSize: 14 }}>
                        Điền thông tin chi tiết của người cần khám
                      </Text>
                    </div>

                    <Form
                      form={familyForm}
                      layout="vertical"
                      initialValues={{
                        bloodType: "Unknown",
                      }}
                      onValuesChange={(changedValues, allValues) => {
                        // Save form values to state whenever form changes
                        setSavedFamilyFormValues(allValues);
                      }}
                    >
                      {/* Select existing family member or create new */}
                      {familyMembers.length > 0 && (
                        <Form.Item label="Chọn người thân đã có">
                          <Select
                            placeholder="Chọn người thân hoặc để trống để thêm mới"
                            allowClear
                            size="large"
                            onChange={(value) => {
                              if (value) {
                                const member = familyMembers.find(
                                  (m) => m._id === value
                                );
                                setSelectedFamilyMember(member);
                                // Persist patientId immediately to avoid losing selection across steps
                                setPatientIdForBooking(member?._id || null);
                                // Fill form with existing member data
                                familyForm.setFieldsValue({
                                  fullName: member.fullName,
                                  dob: member.dob
                                    ? dayjs(member.dob)
                                    : undefined,
                                  gender: member.gender,
                                  ethnicity: member.ethnicity,
                                  occupation: member.occupation,
                                  bloodType: member.bloodType || "Unknown",
                                  relationshipToOwner:
                                    member.relationshipToOwner,
                                  phone: member.phone,
                                  citizenId: member.citizenId,
                                  address: member.address,
                                  allergyNotes: member.allergyNotes || "",
                                  medicalHistory: member.medicalHistory || [],
                                });
                              } else {
                                setSelectedFamilyMember(null);
                                setPatientIdForBooking(null);
                                familyForm.resetFields();
                              }
                            }}
                          >
                            {familyMembers.map((member) => (
                              <Option key={member._id} value={member._id}>
                                {member.fullName} (
                                {member.relationshipToOwner === "father"
                                  ? "Cha"
                                  : member.relationshipToOwner === "mother"
                                  ? "Mẹ"
                                  : member.relationshipToOwner === "spouse"
                                  ? "Vợ/Chồng"
                                  : member.relationshipToOwner === "child"
                                  ? "Con"
                                  : member.relationshipToOwner === "grandparent"
                                  ? "Ông/Bà"
                                  : "Khác"}
                                )
                              </Option>
                            ))}
                          </Select>
                          <Button
                            type="link"
                            icon={<PlusOutlined />}
                            onClick={() => {
                              setSelectedFamilyMember(null);
                              familyForm.resetFields();
                            }}
                            style={{ padding: 0, marginTop: 8 }}
                          >
                            + Thêm người mới
                          </Button>
                        </Form.Item>
                      )}

                      <Form.Item
                        label={
                          <span>
                            Họ và tên <Text type="danger">*</Text>
                          </span>
                        }
                        name="fullName"
                        rules={[
                          {
                            required: true,
                            message: "Vui lòng nhập họ tên!",
                          },
                        ]}
                      >
                        <Input
                          placeholder="Nhập họ và tên"
                          size="large"
                          disabled={!!selectedFamilyMember}
                          readOnly={!!selectedFamilyMember}
                        />
                      </Form.Item>

                      <Form.Item
                        label={
                          <span>
                            SỐ CCCD/CMND <Text type="danger">*</Text>
                          </span>
                        }
                        name="citizenId"
                        rules={[
                          {
                            required: true,
                            message: "Vui lòng nhập số CCCD!",
                          },
                        ]}
                      >
                        <Input
                          placeholder="Nhập số CCCD/CMND"
                          size="large"
                          disabled={!!selectedFamilyMember}
                          readOnly={!!selectedFamilyMember}
                        />
                      </Form.Item>

                      <Row gutter={16}>
                        <Col span={12}>
                          <Form.Item
                            label={
                              <span>
                                Ngày sinh <Text type="danger">*</Text>
                              </span>
                            }
                            name="dob"
                            rules={[
                              {
                                required: true,
                                message: "Vui lòng chọn ngày sinh!",
                              },
                            ]}
                          >
                            <DatePicker
                              style={{ width: "100%" }}
                              format="DD/MM/YYYY"
                              placeholder="dd/mm/yyyy"
                              size="large"
                              disabled={!!selectedFamilyMember}
                              disabledDate={(current) =>
                                current && current > new Date()
                              }
                            />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item
                            label={
                              <span>
                                Giới tính <Text type="danger">*</Text>
                              </span>
                            }
                            name="gender"
                            rules={[
                              {
                                required: true,
                                message: "Vui lòng chọn giới tính!",
                              },
                            ]}
                          >
                            <Select
                              placeholder="Chọn giới tính"
                              size="large"
                              disabled={!!selectedFamilyMember}
                            >
                              <Option value="male">Nam</Option>
                              <Option value="female">Nữ</Option>
                              <Option value="other">Khác</Option>
                            </Select>
                          </Form.Item>
                        </Col>
                      </Row>

                      <Row gutter={16}>
                        <Col span={12}>
                          <Form.Item label="Dân tộc" name="ethnicity">
                            <Input
                              placeholder="Nhập dân tộc (nếu có)"
                              size="large"
                              disabled={!!selectedFamilyMember}
                              readOnly={!!selectedFamilyMember}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item label="Nghề nghiệp" name="occupation">
                            <Input
                              placeholder="Nhập nghề nghiệp (nếu có)"
                              size="large"
                              disabled={!!selectedFamilyMember}
                              readOnly={!!selectedFamilyMember}
                            />
                          </Form.Item>
                        </Col>
                      </Row>

                      <Form.Item label="Nhóm máu" name="bloodType">
                        <Select
                          placeholder="Chọn nhóm máu (nếu có)"
                          allowClear
                          size="large"
                          disabled={!!selectedFamilyMember}
                        >
                          <Option value="A+">A+</Option>
                          <Option value="A-">A-</Option>
                          <Option value="B+">B+</Option>
                          <Option value="B-">B-</Option>
                          <Option value="AB+">AB+</Option>
                          <Option value="AB-">AB-</Option>
                          <Option value="O+">O+</Option>
                          <Option value="O-">O-</Option>
                          <Option value="Unknown">Không rõ</Option>
                        </Select>
                      </Form.Item>

                      <Form.Item
                        label={
                          <span>
                            Số điện thoại <Text type="danger">*</Text>
                          </span>
                        }
                        name="phone"
                        rules={[
                          {
                            required: true,
                            message: "Vui lòng nhập số điện thoại!",
                          },
                          {
                            pattern: /^[0-9]{10}$/,
                            message: "Số điện thoại không hợp lệ!",
                          },
                        ]}
                      >
                        <Input
                          placeholder="Nhập số điện thoại"
                          size="large"
                          prefix={<PhoneOutlined />}
                          disabled={!!selectedFamilyMember}
                          readOnly={!!selectedFamilyMember}
                        />
                      </Form.Item>

                      <Form.Item
                        label={
                          <span>
                            Địa chỉ <Text type="danger">*</Text>
                          </span>
                        }
                        name="address"
                        rules={[
                          {
                            required: true,
                            message: "Vui lòng nhập địa chỉ!",
                          },
                        ]}
                      >
                        <Input
                          placeholder="Nhập địa chỉ"
                          size="large"
                          prefix={<EnvironmentOutlined />}
                          disabled={!!selectedFamilyMember}
                          readOnly={!!selectedFamilyMember}
                        />
                      </Form.Item>

                      <Form.Item
                        label={
                          <span>
                            Mối quan hệ <Text type="danger">*</Text>
                          </span>
                        }
                        name="relationshipToOwner"
                        rules={[
                          {
                            required: true,
                            message: "Vui lòng chọn mối quan hệ!",
                          },
                        ]}
                      >
                        <Select
                          placeholder="Chọn mối quan hệ"
                          size="large"
                          disabled={!!selectedFamilyMember}
                        >
                          <Option value="father">Cha</Option>
                          <Option value="mother">Mẹ</Option>
                          <Option value="spouse">Vợ/Chồng</Option>
                          <Option value="child">Con</Option>
                          <Option value="grandparent">Ông/Bà</Option>
                          <Option value="other">Khác</Option>
                        </Select>
                      </Form.Item>

                      <Form.Item
                        label="Ghi chú dị ứng"
                        name="allergyNotes"
                        rules={[
                          {
                            max: 500,
                            message:
                              "Ghi chú dị ứng không được vượt quá 500 ký tự!",
                          },
                        ]}
                      >
                        <TextArea
                          rows={4}
                          placeholder="Nhập thông tin dị ứng, tiền sử dị ứng thuốc, thức ăn (nếu có)"
                          maxLength={500}
                          showCount
                          // Cho phép edit allergyNotes ngay cả khi đã chọn người thân
                          disabled={false}
                        />
                      </Form.Item>

                      <Form.Item
                        name="agreement"
                        valuePropName="checked"
                        rules={[
                          {
                            required: true,
                            message:
                              "Vui lòng xác nhận chịu trách nhiệm về thông tin cung cấp!",
                          },
                        ]}
                      >
                        <Checkbox>
                          Người đặt hộ chịu trách nhiệm về thông tin cung cấp
                        </Checkbox>
                      </Form.Item>

                      {/* Continue Button for Family */}
                      <Form.Item>
                        <Button
                          type="primary"
                          size="large"
                          block
                          onClick={async () => {
                            // If family member is already selected, no need to validate
                            if (selectedFamilyMember) {
                              // Persist selected patient id to ensure downstream steps use correct patient
                              setPatientIdForBooking(selectedFamilyMember._id);
                              setCurrentStep(1);
                              return;
                            }

                            // If creating new member, validate form and save values
                            try {
                              await familyForm.validateFields();
                              // Save form values before moving to next step
                              const formValues =
                                familyForm.getFieldsValue(true);
                              setSavedFamilyFormValues(formValues);
                              setCurrentStep(1);
                            } catch (error) {
                              if (error.errorFields) {
                                message.error(
                                  "Vui lòng điền đầy đủ thông tin người thân"
                                );
                              } else {
                                message.error(
                                  "Vui lòng kiểm tra lại thông tin đã nhập"
                                );
                              }
                            }
                          }}
                          style={{
                            height: 50,
                            fontSize: 16,
                            fontWeight: 600,
                            marginTop: 16,
                          }}
                        >
                          Xác nhận đặt khám →
                        </Button>
                      </Form.Item>
                    </Form>
                  </Card>
                </Col>
              )}
            </Row>
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
                        return false;
                      }

                      const match = aptSpecIds.some((sid) => {
                        const specId =
                          typeof sid === "object" ? sid._id || sid : sid;
                        const currentSpecId = spec._id || spec;
                        const matchResult =
                          specId?.toString() === currentSpecId?.toString();
                        return matchResult;
                      });

                      return match;
                    }) || [];

                  return specAppointments.length > 0 ? (
                    specAppointments.map((apt) => (
                      <Card
                        key={apt._id}
                        size="small"
                        style={{ marginBottom: 8 }}
                        actions={
                          visitStatus === "draft"
                            ? [
                                <Space key="actions" size="small">
                                  <Button
                                    size="small"
                                    icon={<EditOutlined />}
                                    onClick={() => {
                                      // Find the specialization for this appointment
                                      const aptSpecIds =
                                        apt.doctor?.specializationIds || [];
                                      const specForApt =
                                        selectedSpecializations.find((s) => {
                                          return aptSpecIds.some((sid) => {
                                            const specId =
                                              typeof sid === "object"
                                                ? sid._id || sid
                                                : sid;
                                            const currentSpecId = s._id || s;
                                            return (
                                              specId?.toString() ===
                                              currentSpecId?.toString()
                                            );
                                          });
                                        });
                                      if (specForApt) {
                                        handleOpenDoctorModal(specForApt, apt);
                                      } else {
                                        message.warning(
                                          "Không tìm thấy chuyên khoa cho lịch hẹn này"
                                        );
                                      }
                                    }}
                                  >
                                    Đổi slot
                                  </Button>
                                  ,
                                  <Button
                                    size="small"
                                    danger
                                    icon={<DeleteOutlined />}
                                    onClick={() => {
                                      // Remove from local appointments
                                      setAppointments(
                                        appointments.filter(
                                          (a) => a._id !== apt._id
                                        )
                                      );
                                      message.success("Đã xóa lịch hẹn");
                                    }}
                                  >
                                    Xóa
                                  </Button>
                                  ,
                                </Space>,
                              ]
                            : [
                                <Button
                                  size="small"
                                  danger
                                  onClick={() =>
                                    handleCancelAppointment(apt._id)
                                  }
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

        {/* Step 3: Tổng hợp và thanh toán */}
        {currentStep === 3 && (
          <Card style={{ marginBottom: 24 }}>
            <Title level={3}>Tổng hợp lịch hẹn và hóa đơn thanh toán</Title>
            <Paragraph>
              Vui lòng xem lại thông tin lịch hẹn và hóa đơn thanh toán trước
              khi xác nhận.
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

            {loadingPaymentSummary ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <Spin size="large" />
                <Paragraph style={{ marginTop: 16 }}>
                  Đang tải thông tin thanh toán...
                </Paragraph>
              </div>
            ) : paymentSummary ? (
              <>
                {/* Summary Info */}
                <div style={{ marginBottom: 16 }}>
                  <Space
                    direction="vertical"
                    size="small"
                    style={{ width: "100%" }}
                  >
                    <div
                      style={{ display: "flex", gap: 8, alignItems: "center" }}
                    >
                      <Text>Số lịch hẹn:</Text>
                      <Text strong>
                        {paymentSummary.appointmentsCount ||
                          paymentSummary.totalCount ||
                          0}
                      </Text>
                    </div>
                  </Space>
                </div>

                <Divider />

                {/* Appointments Details Table */}
                {(() => {
                  // Merge paymentSummary with appointments to get reason
                  const appointmentSummaries =
                    paymentSummary.appointmentSummaries ||
                    paymentSummary.acceptedAppointments ||
                    [];
                  const mergedData = appointmentSummaries.map((summary) => {
                    // Find matching appointment by slotId or scheduledStart
                    const matchingAppointment = appointments.find((apt) => {
                      const aptSlotId =
                        apt.slotId?.toString() ||
                        apt._tempData?.slotId?.toString();
                      const summarySlotId = summary.slotId?.toString();
                      const aptStart = apt.scheduledStart
                        ? new Date(apt.scheduledStart).getTime()
                        : null;
                      const summaryStart = summary.scheduledStart
                        ? new Date(summary.scheduledStart).getTime()
                        : null;

                      return (
                        (aptSlotId &&
                          summarySlotId &&
                          aptSlotId === summarySlotId) ||
                        (aptStart && summaryStart && aptStart === summaryStart)
                      );
                    });

                    const reasonFromAppointment =
                      matchingAppointment?.reason ||
                      matchingAppointment?._tempData?.reason ||
                      "";

                    const finalReason =
                      typeof reasonFromAppointment === "string" &&
                      reasonFromAppointment.trim().length > 0
                        ? reasonFromAppointment.trim()
                        : typeof summary.reason === "string" &&
                          summary.reason.trim().length > 0
                        ? summary.reason.trim()
                        : "Không có";

                    return {
                      ...summary,
                      reason: finalReason,
                    };
                  });

                  return mergedData.length > 0 ? (
                    <>
                      <Table
                        dataSource={mergedData}
                        rowKey={(record, index) =>
                          record.slotId?.toString() ||
                          record._id ||
                          `appt-${index}`
                        }
                        pagination={false}
                        columns={[
                          {
                            title: "Bác sĩ",
                            dataIndex: "doctorName",
                            key: "doctor",
                            render: (text) => text || "N/A",
                          },
                          {
                            title: "Chuyên khoa",
                            dataIndex: "specializationName",
                            key: "specialization",
                            render: (text) => text || "N/A",
                          },
                          {
                            title: "Lý do",
                            dataIndex: "reason",
                            key: "reason",
                            render: (text) => {
                              const displayText =
                                typeof text === "string" &&
                                text.trim().length > 0
                                  ? text
                                  : "Không có";
                              return (
                                <Text
                                  ellipsis={{ tooltip: displayText }}
                                  style={{ maxWidth: 200 }}
                                >
                                  {displayText}
                                </Text>
                              );
                            },
                          },
                          {
                            title: "Thời gian",
                            key: "time",
                            render: (_, record) => {
                              if (
                                record.scheduledStart &&
                                record.scheduledEnd
                              ) {
                                return `${dayjs(record.scheduledStart).format(
                                  "HH:mm"
                                )} - ${dayjs(record.scheduledEnd).format(
                                  "HH:mm"
                                )}`;
                              }
                              return "N/A";
                            },
                          },
                          {
                            title: "Hình thức",
                            dataIndex: "mode",
                            key: "mode",
                            render: (mode) => (
                              <Tag color={mode === "online" ? "blue" : "green"}>
                                {mode === "online"
                                  ? "Trực tuyến"
                                  : "Tại phòng khám"}
                              </Tag>
                            ),
                          },
                          {
                            title: "Phí đặt lịch",
                            dataIndex: "price",
                            key: "price",
                            align: "right",
                            render: (price) => (
                              <Text strong>
                                {price ? price.toLocaleString("vi-VN") : "0"} đ
                              </Text>
                            ),
                          },
                        ]}
                        style={{ marginBottom: 16 }}
                      />
                    </>
                  ) : (
                    <Alert
                      message="Chưa có lịch hẹn nào"
                      description="Vui lòng chọn lịch hẹn trước khi thanh toán."
                      type="info"
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                  );
                })()}

                <Divider />

                {/* Total Amount */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "16px",
                    background: "#f6ffed",
                    border: "1px solid #b7eb8f",
                    borderRadius: "8px",
                    marginBottom: 16,
                  }}
                >
                  <Title level={4} style={{ margin: 0 }}>
                    Tổng thanh toán:
                  </Title>
                  <Title level={3} style={{ margin: 0, color: "#52c41a" }}>
                    {paymentSummary.totalAmount
                      ? paymentSummary.totalAmount.toLocaleString("vi-VN")
                      : "0"}{" "}
                    đ
                  </Title>
                </div>

                {/* Payment Button */}
                {paymentSummary.totalAmount > 0 &&
                (paymentSummary.appointmentSummaries?.length > 0 ||
                  paymentSummary.acceptedAppointments?.length > 0) ? (
                  <div style={{ textAlign: "center", marginTop: 24 }}>
                    <Button
                      type="primary"
                      size="large"
                      onClick={handleConfirmPayment}
                      loading={processingPayment}
                      style={{
                        paddingLeft: 48,
                        paddingRight: 48,
                        height: 50,
                        fontSize: "16px",
                      }}
                    >
                      {processingPayment
                        ? "Đang xử lý..."
                        : "Xác nhận thanh toán"}
                    </Button>
                    <Paragraph
                      type="secondary"
                      style={{ marginTop: 12, marginBottom: 0 }}
                    >
                      Bạn sẽ được chuyển đến trang thanh toán PayOS. Sau khi
                      thanh toán thành công, lịch hẹn sẽ được tạo.
                    </Paragraph>
                    <Button
                      onClick={() => {
                        setCurrentStep(2);
                        setPaymentSummary(null);
                      }}
                      style={{ marginTop: 16 }}
                    >
                      Quay lại
                    </Button>
                  </div>
                ) : (
                  <Alert
                    message="Chưa thể thanh toán"
                    description="Không có phí nào cần thanh toán."
                    type="info"
                    showIcon
                  />
                )}
              </>
            ) : (
              <Alert
                message="Chưa có thông tin thanh toán"
                description="Vui lòng hoàn tất đặt lịch để xem hóa đơn thanh toán."
                type="info"
                showIcon
              />
            )}
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
          width={1000}
          style={{ top: 20 }}
          bodyStyle={{
            maxHeight: "calc(100vh - 120px)",
            overflowY: "auto",
            overflowX: "hidden",
            padding: "24px",
          }}
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
                  <div
                    style={{
                      maxHeight: "500px",
                      overflowY: "auto",
                      paddingRight: 8,
                    }}
                  >
                    <Space
                      direction="vertical"
                      size="middle"
                      style={{ width: "100%" }}
                    >
                      {availableDoctors.map((doctor) => {
                        const doctorName =
                          doctor.userId?.fullName || doctor.fullName;
                        const displayName = doctorName?.startsWith("BS.")
                          ? doctorName
                          : `BS. ${doctorName}`;
                        const specializationNames =
                          doctor.specializationIds
                            ?.map((s) => s.name || s)
                            .join(", ") || "";

                        return (
                          <Card
                            key={doctor._id}
                            hoverable
                            onClick={() => handleDoctorSelect(doctor)}
                            style={{ cursor: "pointer", width: "100%" }}
                          >
                            <div style={{ display: "flex", gap: 16 }}>
                              <Avatar
                                size={80}
                                src={doctor.avatarUrl}
                                icon={<UserOutlined />}
                                style={{ flexShrink: 0 }}
                              />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <Title
                                  level={4}
                                  style={{ marginBottom: 8, marginTop: 0 }}
                                >
                                  {displayName}
                                </Title>

                                <div
                                  style={{
                                    marginBottom: 8,
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: 8,
                                    alignItems: "center",
                                  }}
                                >
                                  {specializationNames && (
                                    <Tag color="blue">
                                      {specializationNames}
                                    </Tag>
                                  )}
                                  {doctor.educationLevel && (
                                    <Tag color="cyan">
                                      {doctor.educationLevel}
                                    </Tag>
                                  )}
                                </div>

                                {doctor.yearsExperience && (
                                  <div style={{ marginBottom: 8 }}>
                                    <Text type="secondary">
                                      <UserOutlined
                                        style={{ marginRight: 4 }}
                                      />
                                      {doctor.yearsExperience} năm kinh nghiệm
                                    </Text>
                                  </div>
                                )}

                                {doctor.bio && (
                                  <Paragraph
                                    ellipsis={{ rows: 2 }}
                                    style={{
                                      marginBottom: 8,
                                      fontSize: "14px",
                                    }}
                                  >
                                    {doctor.bio}
                                  </Paragraph>
                                )}

                                <div
                                  className="doctor-rating"
                                  style={{ marginTop: 4 }}
                                >
                                  <Space>
                                    <Rate
                                      disabled
                                      value={doctor.ratingAvg || 0}
                                      allowClear={false}
                                      count={5}
                                      style={{ fontSize: 14 }}
                                    />
                                    <Text
                                      type="secondary"
                                      style={{ fontSize: "14px" }}
                                    >
                                      ({doctor.ratingCount || 0} đánh giá)
                                    </Text>
                                    {doctor.ratingCount > 0 && (
                                      <Button
                                        type="link"
                                        size="small"
                                        icon={<EyeOutlined />}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setReviewDoctor(doctor);
                                          setShowReviewModal(true);
                                        }}
                                        style={{
                                          padding: 0,
                                          height: "auto",
                                          fontSize: "14px",
                                        }}
                                      >
                                        Xem đánh giá
                                      </Button>
                                    )}
                                  </Space>
                                </div>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </Space>
                  </div>
                </div>
              ) : (
                <>
                  {/* Selected Doctor Info */}
                  <Card
                    style={{
                      marginBottom: 16,
                      width: "100%",
                      maxWidth: "100%",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: 16,
                        alignItems: "flex-start",
                        width: "100%",
                      }}
                    >
                      <Avatar
                        size={80}
                        src={selectedDoctor.avatarUrl}
                        icon={<UserOutlined />}
                        style={{ flexShrink: 0 }}
                      />
                      <div
                        style={{
                          flex: 1,
                          minWidth: 0,
                          maxWidth: "100%",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            marginBottom: 8,
                          }}
                        >
                          <Title
                            level={4}
                            style={{ marginTop: 0, marginBottom: 8 }}
                          >
                            {(() => {
                              const doctorName =
                                selectedDoctor.userId?.fullName ||
                                selectedDoctor.fullName;
                              return doctorName?.startsWith("BS.")
                                ? doctorName
                                : `BS. ${doctorName}`;
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

                        <div
                          style={{
                            marginBottom: 8,
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 8,
                            alignItems: "center",
                          }}
                        >
                          {selectedDoctor.specializationIds &&
                            selectedDoctor.specializationIds.length > 0 && (
                              <Tag color="blue">
                                {selectedDoctor.specializationIds
                                  .map((s) => s.name || s)
                                  .join(", ")}
                              </Tag>
                            )}
                          {selectedDoctor.educationLevel && (
                            <Tag color="cyan">
                              {selectedDoctor.educationLevel}
                            </Tag>
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
                          <Paragraph
                            style={{ marginBottom: 8, fontSize: "14px" }}
                          >
                            {selectedDoctor.bio}
                          </Paragraph>
                        )}

                        <div className="doctor-rating" style={{ marginTop: 4 }}>
                          <Space>
                            <Rate
                              disabled
                              value={selectedDoctor.ratingAvg || 0}
                              allowClear={false}
                              count={5}
                              style={{ fontSize: 14 }}
                            />
                            <Text type="secondary" style={{ fontSize: "14px" }}>
                              ({selectedDoctor.ratingCount || 0} đánh giá)
                            </Text>
                            {selectedDoctor.ratingCount > 0 && (
                              <Button
                                type="link"
                                size="small"
                                icon={<EyeOutlined />}
                                onClick={() => {
                                  setReviewDoctor(selectedDoctor);
                                  setShowReviewModal(true);
                                }}
                                style={{
                                  padding: 0,
                                  height: "auto",
                                  fontSize: "14px",
                                }}
                              >
                                Xem đánh giá
                              </Button>
                            )}
                          </Space>
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
                            padding: "16px",
                            background: "#fafafa",
                            borderRadius: "8px",
                            border: "1px solid #e8e8e8",
                          }}
                        >
                          <div style={{ marginBottom: 8 }}>
                            <Text
                              style={{
                                color: "#1890ff",
                                fontSize: "16px",
                                fontWeight: 600,
                              }}
                            >
                              <EnvironmentOutlined
                                style={{
                                  marginRight: 8,
                                  color: "#1890ff",
                                  fontSize: "16px",
                                }}
                              />
                              {defaultClinic.name}
                            </Text>
                          </div>
                          <div style={{ marginBottom: 8 }}>
                            <Text
                              type="secondary"
                              style={{ fontSize: "14px", color: "#8c8c8c" }}
                            >
                              {defaultClinic.address}
                            </Text>
                          </div>
                          {defaultClinic.phone && (
                            <div>
                              <Text
                                type="secondary"
                                style={{ fontSize: "14px", color: "#8c8c8c" }}
                              >
                                <PhoneOutlined
                                  style={{
                                    marginRight: 8,
                                    color: "#8c8c8c",
                                    fontSize: "14px",
                                  }}
                                />
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

                      {/* Map - Show when clinic is available */}
                      {defaultClinic && (
                        <div style={{ marginTop: 16 }}>
                          <ClinicMap
                            clinic={defaultClinic}
                            onGetDirections={(clinic) => {
                              if (clinic?.latitude && clinic?.longitude) {
                                const url = `https://www.google.com/maps/dir/?api=1&destination=${clinic.latitude},${clinic.longitude}`;
                                window.open(url, "_blank");
                              } else if (clinic?.address) {
                                const address = encodeURIComponent(
                                  clinic.address
                                );
                                const url = `https://www.google.com/maps/dir/?api=1&destination=${address}`;
                                window.open(url, "_blank");
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Price Table - Show when mode is selected */}
                  {selectedMode && visitDate && (
                    <div
                      style={{
                        marginBottom: 16,
                        width: "100%",
                        maxWidth: "100%",
                      }}
                    >
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
                          width: "100%",
                          maxWidth: "100%",
                        }}
                      >
                        <table
                          style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            tableLayout: "fixed",
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
                              <td style={{ padding: "12px", fontWeight: 600 }}>
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
                              <td style={{ padding: "12px", fontWeight: 600 }}>
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
                          {calculatePrice(
                            selectedMode,
                            visitDate
                          ).toLocaleString("vi-VN")}
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
                      <Row gutter={[12, 12]} style={{ margin: 0 }}>
                        {selectedDoctor.availableSlots.map((slot) => {
                          // Check if this slot conflicts with existing appointments
                          const slotStart = new Date(
                            slot.startAt || slot.startTime
                          );
                          const slotEnd = new Date(slot.endAt || slot.endTime);

                          // Check if this is the current slot being replaced
                          const isCurrentSlot =
                            appointmentToReplace &&
                            ((slot._id &&
                              appointmentToReplace.slotId &&
                              slot._id.toString() ===
                                appointmentToReplace.slotId.toString()) ||
                              (appointmentToReplace.scheduledStart &&
                                slot.startAt &&
                                new Date(slot.startAt).getTime() ===
                                  new Date(
                                    appointmentToReplace.scheduledStart
                                  ).getTime()));

                          // Check if slot is already used in local appointments
                          const existingAppointment = appointments.find(
                            (apt) => {
                              // Skip the appointment being replaced
                              if (
                                appointmentToReplace &&
                                apt._id === appointmentToReplace._id
                              ) {
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
                            }
                          );

                          // Slot is disabled if:
                          // 1. It's blocked by doctor
                          // 2. It's already used in local appointments (and not the current slot being replaced)
                          // 3. It's not available from API (booked by other patients in DB) - ALWAYS disable these
                          const isDisabled =
                            slot.isBlocked ||
                            (existingAppointment && !isCurrentSlot) ||
                            (slot.available === false && !isCurrentSlot); // Disable if booked by others in DB (explicitly check for false)

                          const slotTimeDisplay =
                            slot.timeRange ||
                            (slot.startAt && slot.endAt
                              ? `${dayjs(slot.startAt).format(
                                  "HH:mm"
                                )} - ${dayjs(slot.endAt).format("HH:mm")}`
                              : `${slot.startTime} - ${slot.endTime}`);

                          return (
                            <Col
                              xs={12}
                              sm={12}
                              md={8}
                              lg={6}
                              key={slot._id || `slot-${slot.startTime}`}
                              style={{ padding: "6px" }}
                            >
                              <Button
                                type={
                                  selectedSlot?._id === slot._id ||
                                  (selectedSlot &&
                                    slot.startAt &&
                                    selectedSlot.startAt &&
                                    new Date(selectedSlot.startAt).getTime() ===
                                      new Date(slot.startAt).getTime())
                                    ? "primary"
                                    : "default"
                                }
                                danger={isDisabled && !isCurrentSlot}
                                disabled={isDisabled}
                                block
                                size="large"
                                style={{
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  fontSize: "14px",
                                  height: "45px",
                                  fontWeight: 500,
                                }}
                                onClick={() => {
                                  if (!isDisabled) {
                                    setSelectedSlot(slot);
                                  } else {
                                    if (slot.isBlocked) {
                                      message.warning(
                                        `Slot này đã bị chặn bởi bác sĩ${
                                          slot.leaveReason
                                            ? `: ${slot.leaveReason}`
                                            : ""
                                        }. Vui lòng chọn slot khác.`
                                      );
                                    } else if (existingAppointment) {
                                      message.warning(
                                        `Slot này đã được chọn cho lịch hẹn với ${
                                          existingAppointment.doctor
                                            ?.fullName || "bác sĩ"
                                        }. Vui lòng chọn slot khác.`
                                      );
                                    } else if (!slot.available) {
                                      message.warning(
                                        "Slot này đã được đặt bởi bệnh nhân khác. Vui lòng chọn slot khác."
                                      );
                                    } else {
                                      message.warning(
                                        "Slot này không khả dụng. Vui lòng chọn slot khác."
                                      );
                                    }
                                  }
                                }}
                                title={
                                  isCurrentSlot
                                    ? "Slot hiện tại (đang được đổi)"
                                    : slot.isBlocked
                                    ? `Slot bị chặn: ${
                                        slot.leaveReason ||
                                        "Bác sĩ không có mặt"
                                      }`
                                    : existingAppointment
                                    ? `Slot này đã được chọn cho lịch hẹn với ${
                                        existingAppointment.doctor?.fullName ||
                                        "bác sĩ"
                                      }`
                                    : !slot.available
                                    ? "Slot này đã được đặt bởi người khác"
                                    : ""
                                }
                              >
                                {slotTimeDisplay}
                                {isCurrentSlot && " (Hiện tại)"}
                                {existingAppointment &&
                                  !isCurrentSlot &&
                                  " (Đã chọn)"}
                                {slot.isBlocked && " (Đã chặn)"}
                                {!slot.available &&
                                  !existingAppointment &&
                                  !slot.isBlocked &&
                                  " (Đã đặt)"}
                              </Button>
                            </Col>
                          );
                        })}
                      </Row>
                      {appointments.some((apt) => {
                        const slotStart = new Date(
                          selectedSlot?.startAt || selectedSlot?.startTime
                        );
                        const slotEnd = new Date(
                          selectedSlot?.endAt || selectedSlot?.endTime
                        );
                        const aptStart = new Date(apt.scheduledStart);
                        const aptEnd = new Date(apt.scheduledEnd);
                        return (
                          (slotStart >= aptStart && slotStart < aptEnd) ||
                          (slotEnd > aptStart && slotEnd <= aptEnd) ||
                          (slotStart <= aptStart && slotEnd >= aptEnd)
                        );
                      }) &&
                        selectedSlot && (
                          <Alert
                            message="Cảnh báo"
                            description={`Slot ${dayjs(
                              selectedSlot.startAt || selectedSlot.startTime
                            ).format("HH:mm")} - ${dayjs(
                              selectedSlot.endAt || selectedSlot.endTime
                            ).format(
                              "HH:mm"
                            )} trùng với một lịch hẹn đã chọn. Vui lòng chọn slot khác.`}
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
                  <div style={{ marginBottom: 16, width: "100%" }}>
                    <Title level={5}>Lý do khám</Title>
                    <TextArea
                      ref={textareaRef}
                      rows={4}
                      placeholder="Mô tả triệu chứng hoặc lý do khám (không bắt buộc)"
                      value={appointmentReason}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        const newLength = newValue.length;

                        // Cắt bớt nếu vượt quá giới hạn ký tự
                        if (newLength > REASON_MAX_LENGTH) {
                          const truncatedValue = newValue.slice(
                            0,
                            REASON_MAX_LENGTH
                          );
                          e.target.value = truncatedValue;
                          setAppointmentReason(truncatedValue);
                        } else {
                          setAppointmentReason(newValue);
                        }
                      }}
                      onKeyDown={(e) => {
                        const currentLength = appointmentReason.length;

                        // Nếu đã đạt giới hạn ký tự
                        if (currentLength >= REASON_MAX_LENGTH) {
                          // Cho phép xóa (Backspace, Delete)
                          if (e.key === "Backspace" || e.key === "Delete") {
                            return;
                          }

                          // Cho phép điều hướng
                          const navigationKeys = [
                            "ArrowLeft",
                            "ArrowRight",
                            "ArrowUp",
                            "ArrowDown",
                            "Home",
                            "End",
                            "Tab",
                          ];
                          if (navigationKeys.includes(e.key)) {
                            return;
                          }

                          // Cho phép Ctrl/Cmd + A, C, X, Z (nhưng chặn Ctrl+V)
                          if (e.ctrlKey || e.metaKey) {
                            if (e.key === "v" || e.key === "V") {
                              e.preventDefault();
                              return false;
                            }
                            return;
                          }

                          // Chặn Enter
                          if (e.key === "Enter") {
                            e.preventDefault();
                            return false;
                          }

                          // Chặn các phím nhập khác
                          const isCharacterKey =
                            e.key.length === 1 &&
                            !navigationKeys.includes(e.key);
                          if (isCharacterKey) {
                            e.preventDefault();
                            return false;
                          }
                        }
                      }}
                      onBeforeInput={(e) => {
                        // Chặn input event nếu đã đạt giới hạn ký tự
                        const currentText = appointmentReason;
                        if (currentText.length >= REASON_MAX_LENGTH) {
                          // Kiểm tra xem có phải đang xóa không
                          const inputType = e.inputType;
                          const isDeleteOperation =
                            inputType === "deleteContentBackward" ||
                            inputType === "deleteContentForward" ||
                            inputType === "deleteByDrag" ||
                            inputType === "deleteCompositionText" ||
                            inputType === "deleteWordBackward" ||
                            inputType === "deleteWordForward";
                          if (isDeleteOperation) {
                            // Đang xóa, cho phép
                            return;
                          }
                          // Đang nhập hoặc insert, chặn
                          e.preventDefault();
                          e.stopPropagation();
                          return false;
                        }
                      }}
                      onInput={(e) => {
                        // Cắt bớt nếu vượt quá giới hạn ký tự
                        const newValue = e.target.value;
                        if (newValue.length > REASON_MAX_LENGTH) {
                          const truncatedValue = newValue.slice(
                            0,
                            REASON_MAX_LENGTH
                          );
                          e.target.value = truncatedValue;
                          setAppointmentReason(truncatedValue);
                        }
                      }}
                      onPaste={(e) => {
                        const currentLength = appointmentReason.length;
                        // Nếu đã đạt giới hạn ký tự, chặn paste hoàn toàn
                        if (currentLength >= REASON_MAX_LENGTH) {
                          e.preventDefault();
                          e.stopPropagation();
                          return;
                        }
                        // Nếu chưa đạt giới hạn, xử lý paste
                        const pastedText =
                          e.clipboardData.getData("text/plain");
                        const textarea = e.target;
                        const selectionStart = textarea.selectionStart || 0;
                        const selectionEnd = textarea.selectionEnd || 0;
                        const textBefore = appointmentReason.substring(
                          0,
                          selectionStart
                        );
                        const textAfter =
                          appointmentReason.substring(selectionEnd);
                        const newText = textBefore + pastedText + textAfter;

                        if (newText.length > REASON_MAX_LENGTH) {
                          e.preventDefault();
                          // Chỉ paste phần vừa đủ
                          const maxAllowedLength = REASON_MAX_LENGTH;
                          const availableLength =
                            maxAllowedLength -
                            (textBefore.length + textAfter.length);
                          if (availableLength > 0) {
                            const truncatedPaste = pastedText.substring(
                              0,
                              availableLength
                            );
                            const finalText =
                              textBefore + truncatedPaste + textAfter;
                            setAppointmentReason(finalText);
                            // Set cursor position sau text vừa paste
                            setTimeout(() => {
                              const newCursorPos =
                                textBefore.length + truncatedPaste.length;
                              textarea.setSelectionRange(
                                newCursorPos,
                                newCursorPos
                              );
                            }, 0);
                          }
                        }
                      }}
                      maxLength={REASON_MAX_LENGTH}
                      showCount
                      style={{
                        width: "100%",
                        maxWidth: "100%",
                        ...(appointmentReason.length === REASON_MAX_LENGTH
                          ? {
                              borderColor: "#faad14",
                              backgroundColor: "#fffbe6",
                            }
                          : {}),
                      }}
                    />
                    {appointmentReason.length === REASON_MAX_LENGTH && (
                      <div style={{ marginTop: 4 }}>
                        <Text
                          type="warning"
                          style={{ fontSize: "12px", fontWeight: 500 }}
                        >
                          ⚠️ Bạn đã nhập đủ {REASON_MAX_LENGTH} ký tự (giới hạn
                          tối đa)
                        </Text>
                      </div>
                    )}
                    {appointmentReason.length < REASON_MAX_LENGTH && (
                      <Text
                        type="secondary"
                        style={{
                          fontSize: "12px",
                          marginTop: 4,
                          display: "block",
                        }}
                      >
                        Bạn có thể nhập tối đa {REASON_MAX_LENGTH} ký tự để mô
                        tả lý do khám (
                        {REASON_MAX_LENGTH - appointmentReason.length} ký tự còn
                        lại)
                      </Text>
                    )}
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

        {/* Modal for viewing doctor reviews */}
        <Modal
          title={
            <Space>
              <UserOutlined />
              <span>Đánh giá của {reviewDoctor?.fullName || "Bác sĩ"}</span>
            </Space>
          }
          open={showReviewModal}
          onCancel={() => {
            setShowReviewModal(false);
            setReviewDoctor(null);
          }}
          footer={null}
          width={800}
        >
          {reviewsLoading ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <Spin size="large" />
              <Paragraph style={{ marginTop: 16 }}>
                Đang tải đánh giá...
              </Paragraph>
            </div>
          ) : doctorReviews && doctorReviews.length > 0 ? (
            <div style={{ maxHeight: "600px", overflowY: "auto" }}>
              {doctorReviews.map((review) => (
                <Card
                  key={review._id}
                  style={{ marginBottom: 16 }}
                  size="small"
                >
                  <Space
                    direction="vertical"
                    style={{ width: "100%" }}
                    size="small"
                  >
                    <Space>
                      <Avatar
                        size="small"
                        src={review.patient?.avatarUrl}
                        icon={<UserOutlined />}
                      />
                      <Text strong>
                        {review.isAnonymous
                          ? "Bệnh nhân"
                          : review.patient?.fullName || "Bệnh nhân"}
                      </Text>
                      <Rate
                        disabled
                        value={review.rating}
                        style={{ fontSize: 12 }}
                      />
                      <Text type="secondary" style={{ fontSize: "12px" }}>
                        {dayjs(review.createdAt).format("DD/MM/YYYY")}
                      </Text>
                    </Space>
                    {review.comment && (
                      <Paragraph style={{ marginBottom: 0, marginTop: 8 }}>
                        {review.comment}
                      </Paragraph>
                    )}
                    {review.tags && review.tags.length > 0 && (
                      <Space wrap>
                        {review.tags.map((tag, index) => (
                          <Tag key={index} color="blue">
                            {tag}
                          </Tag>
                        ))}
                      </Space>
                    )}
                    {review.doctorResponse && (
                      <div
                        style={{
                          marginTop: 8,
                          padding: 12,
                          background: "#f5f5f5",
                          borderRadius: 4,
                        }}
                      >
                        <Text strong style={{ color: "#1890ff" }}>
                          Phản hồi từ bác sĩ:
                        </Text>
                        <Paragraph style={{ marginBottom: 0, marginTop: 4 }}>
                          {review.doctorResponse}
                        </Paragraph>
                        {review.doctorResponseAt && (
                          <Text type="secondary" style={{ fontSize: "12px" }}>
                            {dayjs(review.doctorResponseAt).format(
                              "DD/MM/YYYY HH:mm"
                            )}
                          </Text>
                        )}
                      </div>
                    )}
                  </Space>
                </Card>
              ))}
              {reviewsPagination &&
                reviewsPagination.total > reviewsPagination.limit && (
                  <div style={{ textAlign: "center", marginTop: 16 }}>
                    <Text type="secondary">
                      Hiển thị {doctorReviews.length} /{" "}
                      {reviewsPagination.total} đánh giá
                    </Text>
                  </div>
                )}
            </div>
          ) : (
            <Empty description="Chưa có đánh giá nào" />
          )}
        </Modal>
      </div>

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
};

export default DatLichNhieuChuyenKhoa;
