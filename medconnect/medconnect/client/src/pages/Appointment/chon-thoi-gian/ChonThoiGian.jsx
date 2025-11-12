import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  Radio,
  Form,
  Input,
  Select,
  Space,
  Divider,
  Tag,
  Rate,
  Checkbox,
  Modal,
  Empty,
  Avatar,
  Table,
  Alert,
} from "antd";
import {
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
  HomeOutlined,
  EyeOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import NavigationBreadcrumb from "../../../components/Breadcrumb/NavigationBreadcrumb";
import ClinicMap from "../../../components/ClinicMap/ClinicMap";
import { api } from "../../../lib/api";
import { useUserProfile } from "../../../hooks/useUserProfile";
import { CustomAlert } from "../../../components/ui/CustomAlert";
import "./ChonThoiGian.css";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const ChonThoiGian = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
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
  const [timeSlotsLoading, setTimeSlotsLoading] = useState(false);
  const [doctor, setDoctor] = useState(null);
  const [specialization, setSpecialization] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [selectedMode, setSelectedMode] = useState(null); // No default - user must choose
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [defaultClinic, setDefaultClinic] = useState(null);
  const [clinicLoading, setClinicLoading] = useState(false);
  const [bookingFor, setBookingFor] = useState("me"); // "me" or "family"
  const [familyMembers, setFamilyMembers] = useState([]);
  const [selectedFamilyMember, setSelectedFamilyMember] = useState(null);
  const [loadingFamilyMembers, setLoadingFamilyMembers] = useState(false);
  const [currentTime, setCurrentTime] = useState(dayjs()); // Track current time for real-time filtering
  const [pendingAppointmentId, setPendingAppointmentId] = useState(null); // Track appointment chưa thanh toán
  const [pendingOrderCode, setPendingOrderCode] = useState(null); // Track orderCode để cleanup
  const [doctorPricing, setDoctorPricing] = useState(null); // Doctor pricing from API

  // Payment summary state (NEW FLOW)
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [showPaymentSummary, setShowPaymentSummary] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [patientIdForBooking, setPatientIdForBooking] = useState(null); // Store patientId for family member booking

  // Modal state for viewing reviews
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [doctorReviews, setDoctorReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsPagination, setReviewsPagination] = useState(null);

  // Ref for reason textarea
  const reasonTextareaRef = useRef(null);

  // Get user profile to validate required fields
  const { userProfile } = useUserProfile();

  // Fetch doctor reviews
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
  const calculatePrice = (mode, date) => {
    if (!mode || !date) return 0;

    const dayOfWeek = date.day(); // 0 = Sunday, 6 = Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday

    return getPriceForDisplay(mode, isWeekend);
  };

  useEffect(() => {
    if (location.state?.doctor) {
      setDoctor(location.state.doctor);
      // Use specialization from state or from doctor's first specialization
      const spec =
        location.state?.specialization ||
        location.state?.doctor?.specializationIds?.[0];
      setSpecialization(spec);
    } else {
      navigate("/dat-lich/chon-chuyen-khoa");
    }
  }, [location.state]);

  useEffect(() => {
    if (selectedDate && doctor) {
      fetchTimeSlots();
    }
  }, [selectedDate, doctor]);

  useEffect(() => {
    if (doctor) {
      fetchDefaultClinic();
      fetchDoctorPricing();
    }
  }, [doctor]);

  useEffect(() => {
    if (bookingFor === "family") {
      fetchFamilyMembers();
    }
  }, [bookingFor]);

  // Real-time update: Refresh current time every minute to hide expired slots
  useEffect(() => {
    // Only run if a date is selected (and it's today)
    if (selectedDate && selectedDate.isSame(dayjs(), "day")) {
      // Update immediately
      setCurrentTime(dayjs());

      // Set interval to update every minute
      const interval = setInterval(() => {
        setCurrentTime(dayjs());
      }, 60000); // Update every 60 seconds (1 minute)

      // Cleanup interval on unmount or when date changes
      return () => clearInterval(interval);
    } else {
      // If not today, just set current time once
      setCurrentTime(dayjs());
    }
  }, [selectedDate]);

  // Cleanup unpaid appointment khi user thoát trang
  useEffect(() => {
    const handleBeforeUnload = async (e) => {
      // Chỉ cleanup nếu có appointment chưa thanh toán
      if (pendingAppointmentId && pendingOrderCode) {
        // Sử dụng sendBeacon để gửi request ngay cả khi trang đang đóng
        const cleanupData = {
          appointmentId: pendingAppointmentId,
          orderCode: pendingOrderCode,
        };

        // Gửi cleanup request (sử dụng navigator.sendBeacon nếu có thể)
        if (navigator.sendBeacon) {
          const blob = new Blob([JSON.stringify(cleanupData)], {
            type: "application/json",
          });
          navigator.sendBeacon(
            `${
              import.meta.env.VITE_API_URL || "http://localhost:5000"
            }/api/payments/payos/cancel/${pendingOrderCode}`,
            blob
          );
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup khi component unmount
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);

      // Cleanup unpaid appointment nếu user rời trang
      if (pendingAppointmentId && pendingOrderCode) {
        cleanupUnpaidAppointment(pendingAppointmentId, pendingOrderCode);
      }
    };
  }, [pendingAppointmentId, pendingOrderCode]);

  // Hàm cleanup appointment chưa thanh toán
  const cleanupUnpaidAppointment = async (appointmentId, orderCode) => {
    try {
      const { cancelPayOSPayment } = await import(
        "../../../services/payService"
      );

      // Cancel payment link (này sẽ tự động xóa appointment nếu chưa thanh toán)
      await cancelPayOSPayment(orderCode);

      // Clear state và localStorage sau khi cleanup thành công
      setPendingAppointmentId(null);
      setPendingOrderCode(null);
      localStorage.removeItem("pendingAppointmentId");
      localStorage.removeItem("pendingOrderCode");
    } catch (error) {
      // Fallback: try to cancel appointment directly nếu cancel payment fail
      try {
        await api.put(`/api/patients/me/appointments/${appointmentId}/cancel`, {
          cancelReason: "Người dùng thoát trang trước khi thanh toán",
        });

        // Clear state và localStorage sau khi cleanup thành công
        setPendingAppointmentId(null);
        setPendingOrderCode(null);
        localStorage.removeItem("pendingAppointmentId");
        localStorage.removeItem("pendingOrderCode");
      } catch (cancelError) {
        // Silent fail
      }
    }
  };

  // Kiểm tra khi component mount xem có appointment chưa thanh toán từ session trước không
  useEffect(() => {
    const checkPendingAppointment = async () => {
      // Nếu có pending appointment từ localStorage (từ session trước)
      const savedPendingAppointment = localStorage.getItem(
        "pendingAppointmentId"
      );
      const savedPendingOrderCode = localStorage.getItem("pendingOrderCode");

      if (savedPendingAppointment && savedPendingOrderCode) {
        // Kiểm tra xem appointment đã thanh toán chưa
        try {
          const appointmentResponse = await api.get(
            `/api/patients/me/appointments/${savedPendingAppointment}`
          );

          if (appointmentResponse.success) {
            const appointment = appointmentResponse.data;
            // Nếu chưa thanh toán, cleanup
            if (
              appointment.paymentStatus === "unpaid" &&
              !appointment.paymentId
            ) {
              await cleanupUnpaidAppointment(
                savedPendingAppointment,
                savedPendingOrderCode
              );
            } else {
              // Đã thanh toán rồi, clear localStorage
              localStorage.removeItem("pendingAppointmentId");
              localStorage.removeItem("pendingOrderCode");
            }
          }
        } catch (error) {
          // Nếu không kiểm tra được, clear localStorage
          localStorage.removeItem("pendingAppointmentId");
          localStorage.removeItem("pendingOrderCode");
        }
      }

      // Kiểm tra tất cả appointments chưa thanh toán của user
      // Nếu có appointment nào chưa thanh toán với slotId hiện tại → cleanup
      try {
        const allAppointmentsResponse = await api.get(
          "/api/patients/me/appointments?limit=100"
        );
        if (allAppointmentsResponse.success) {
          const appointments = allAppointmentsResponse.data.appointments || [];

          // Tìm appointments chưa thanh toán (unpaid và không có paymentId)
          const unpaidAppointments = appointments.filter(
            (apt) =>
              apt.paymentStatus === "unpaid" &&
              !apt.paymentId &&
              apt.status !== "cancelled" &&
              apt.pendingOrderCode // Chỉ cleanup những appointment đã tạo payment link
          );

          // Cleanup từng appointment chưa thanh toán
          let cleanedCount = 0;
          for (const apt of unpaidAppointments) {
            if (apt.pendingOrderCode) {
              await cleanupUnpaidAppointment(apt._id, apt.pendingOrderCode);
              cleanedCount++;
            }
          }

          // Nếu đã cleanup appointments, refresh time slots và reset form để user có thể đặt lịch mới
          if (cleanedCount > 0) {
            // Thông báo cho user
            message.info(
              `Đã tự động hủy ${cleanedCount} lịch hẹn chưa thanh toán. Bạn có thể đặt lịch mới.`,
              4
            );

            // Reset form state
            setSelectedTimeSlot(null);
            setShowBookingForm(false);
            form.resetFields();

            // Refresh time slots nếu có selectedDate
            if (selectedDate && doctor) {
              // Delay một chút để đảm bảo database đã cập nhật
              setTimeout(() => {
                fetchTimeSlots();
              }, 500);
            }
          }
        }
      } catch (error) {
        // Silent fail
      }
    };

    checkPendingAppointment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTimeSlots = async () => {
    try {
      setTimeSlotsLoading(true);
      const dateStr = selectedDate.format("YYYY-MM-DD");
      const response = await api.get(
        `/api/patients/doctors/${doctor._id}/time-slots?date=${dateStr}`
      );

      if (response.success) {
        setTimeSlots(response.data.timeSlots);
      } else {
        message.error("Không thể tải khung giờ khám");
        setTimeSlots([]);
      }
    } catch (error) {
      message.error("Có lỗi xảy ra khi tải khung giờ khám");
      setTimeSlots([]);
    } finally {
      setTimeSlotsLoading(false);
    }
  };

  const fetchDefaultClinic = async () => {
    try {
      setClinicLoading(true);
      const response = await api.get(`/api/doctors/${doctor._id}/clinics`);

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

  const fetchDoctorPricing = async () => {
    try {
      const response = await api.get(
        `/api/patients/doctors/${doctor._id}/pricing`
      );

      if (response.success) {
        setDoctorPricing(response.data.pricing);
      } else {
        setDoctorPricing(null);
      }
    } catch (error) {
      setDoctorPricing(null); // Fallback to default pricing
    }
  };

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

  const handleDateChange = (date) => {
    setSelectedDate(date);
    setSelectedTimeSlot(null);
    setShowBookingForm(false);
  };

  const handleTimeSlotSelect = (timeSlot) => {
    setSelectedTimeSlot(timeSlot);
    setShowBookingForm(true);
    // Reset mode selection when selecting a new time slot
    setSelectedMode(null);
    form.setFieldsValue({ mode: undefined });
  };

  const handleBackToDoctors = () => {
    navigate("/dat-lich/chon-bac-si", {
      state: { specialization },
    });
  };

  // Validate profile fields when booking for "me"
  const validateProfileComplete = () => {
    const requiredFields = [
      { key: "fullName", label: "Họ và tên" },
      { key: "phone", label: "Số điện thoại" },
      { key: "gender", label: "Giới tính" },
      { key: "dob", label: "Ngày sinh" },
      { key: "address", label: "Địa chỉ" },
      // Check both citizenId and nationalId (depending on which field backend uses)
      {
        key: "citizenId",
        label: "Số CCCD/CMND",
        alternativeKey: "nationalId",
      },
    ];

    const missingFields = [];

    requiredFields.forEach(({ key, label, alternativeKey }) => {
      const value = userProfile?.[key];
      const altValue = alternativeKey ? userProfile?.[alternativeKey] : null;

      // Field is valid if it has a value (either from main key or alternative key)
      const hasValue = value || altValue;
      const isValidValue =
        hasValue && typeof hasValue === "string" && hasValue.trim() !== "";

      if (!isValidValue) {
        missingFields.push(label);
      }
    });

    return {
      isValid: missingFields.length === 0,
      missingFields,
    };
  };

  const handleBookingSubmit = async (values) => {
    try {
      setLoading(true);

      // Debug log để kiểm tra form values
      console.log("🔍 handleBookingSubmit - Form values:", values);
      console.log("🔍 handleBookingSubmit - Reason from form:", values.reason);
      console.log(
        "🔍 handleBookingSubmit - Reason type:",
        typeof values.reason
      );
      console.log(
        "🔍 handleBookingSubmit - Reason length:",
        values.reason?.length
      );

      let patientIdForBooking = null;

      // Validate profile if booking for "me"
      if (bookingFor === "me") {
        const validation = validateProfileComplete();
        if (!validation.isValid) {
          const missingFieldsText = validation.missingFields.join(", ");
          showConfirm(
            `Thông tin hồ sơ chưa đầy đủ. Vui lòng cập nhật đầy đủ thông tin hồ sơ trước khi đặt lịch:\n\nThiếu: ${missingFieldsText}`,
            () => {
              navigate("/benh-nhan/cai-dat");
            }
          );
          setLoading(false);
          return;
        }

        // IMPORTANT: Đảm bảo reset patientIdForBooking ngay khi booking for "me"
        setPatientIdForBooking(null);
        // IMPORTANT: patientIdForBooking local variable = null (đặt cho chính mình)
        patientIdForBooking = null;
      }

      // If booking for family, create family member first
      if (bookingFor === "family") {
        try {
          const familyResponse = await api.post(
            "/api/patients/me/family-members",
            {
              fullName: values.fullName,
              dob: values.dob ? values.dob.format("YYYY-MM-DD") : undefined,
              gender: values.gender,
              ethnicity: values.ethnicity,
              occupation: values.occupation,
              bloodType: values.bloodType || "Unknown",
              relationshipToOwner: values.relationshipToOwner,
              phone: values.phone,
              citizenId: values.citizenId,
              address: values.address,
              allergyNotes: values.allergyNotes || "",
              medicalHistory: values.medicalHistory || [],
            }
          );

          if (familyResponse.success) {
            message.success("Thêm người thân thành công!");
            const newPatientId = familyResponse.data.patient._id;
            patientIdForBooking = newPatientId;
            setPatientIdForBooking(newPatientId); // Store in state
            await fetchFamilyMembers();
          } else {
            message.error(familyResponse.message || "Thêm người thân thất bại");
            setLoading(false);
            return;
          }
        } catch (error) {
          message.error("Có lỗi xảy ra khi thêm người thân");
          setLoading(false);
          return;
        }
      }

      // Prepare appointment data
      // Trim reason to remove leading/trailing whitespace
      const reasonValue = values.reason ? values.reason.trim() : "";

      const appointmentData = {
        doctorId: doctor._id,
        slotId: selectedTimeSlot._id,
        mode: selectedMode,
        reason: reasonValue,
        scheduledStart: selectedDate
          .clone()
          .hour(parseInt(selectedTimeSlot.startTime.split(":")[0]))
          .minute(parseInt(selectedTimeSlot.startTime.split(":")[1]))
          .toISOString(),
        scheduledEnd: selectedDate
          .clone()
          .hour(parseInt(selectedTimeSlot.endTime.split(":")[0]))
          .minute(parseInt(selectedTimeSlot.endTime.split(":")[1]))
          .toISOString(),
      };

      // Debug log để kiểm tra reason
      console.log("🔍 Reason value:", reasonValue);
      console.log("🔍 AppointmentData reason:", appointmentData.reason);

      // Add clinicId for offline appointments
      if (selectedMode === "offline" && defaultClinic) {
        appointmentData.clinicId = defaultClinic._id;
      }

      // ONLY add patientId for family member booking
      // IMPORTANT: Check bookingFor instead of just patientIdForBooking to be absolutely sure
      if (bookingFor === "family" && patientIdForBooking) {
        appointmentData.patientId = patientIdForBooking;
      } else {
        // IMPORTANT: Explicitly delete patientId if booking for "me" to prevent backend from adding it
        delete appointmentData.patientId;
      }

      // Debug log để kiểm tra
      console.log("🔍 handleBookingSubmit - Debug Info:");
      console.log("bookingFor:", bookingFor);
      console.log("patientIdForBooking (local):", patientIdForBooking);
      console.log(
        "appointmentData BEFORE sending to API:",
        JSON.parse(JSON.stringify(appointmentData))
      );
      console.log("appointmentData.patientId:", appointmentData.patientId);
      console.log("Has patientId key:", "patientId" in appointmentData);

      // NEW FLOW: Calculate payment summary (don't create appointment yet)
      try {
        const summaryResponse = await api.post(
          "/api/patients/appointments/calculate-payment-summary",
          appointmentData
        );

        if (summaryResponse.success || summaryResponse?.data?.success) {
          const summary = summaryResponse?.data || summaryResponse;

          // Debug log để xem response từ backend
          console.log("📥 Summary Response from backend:", summary);
          console.log(
            "📥 Reason in appointmentSummary:",
            summary.appointmentSummary?.reason
          );

          // IMPORTANT: Lưu bookingFor vào paymentSummary để dùng trong handleConfirmPayment
          summary.bookingFor = bookingFor;
          summary.familyMemberPatientId =
            bookingFor === "family" ? patientIdForBooking : null;

          // IMPORTANT: Nếu booking for "me", xóa patientId khỏi appointmentSummary (nếu backend trả về)
          if (
            bookingFor === "me" &&
            summary.appointmentSummary &&
            summary.appointmentSummary.patientId
          ) {
            console.warn(
              '⚠️ Backend returned patientId for "me" booking, removing it...'
            );
            delete summary.appointmentSummary.patientId;
          }

          // Debug log
          console.log("💾 Payment Summary AFTER cleanup:");
          console.log("summary.bookingFor:", summary.bookingFor);
          console.log(
            "summary.familyMemberPatientId:",
            summary.familyMemberPatientId
          );
          console.log(
            "summary.appointmentSummary.patientId:",
            summary.appointmentSummary?.patientId
          );

          setPaymentSummary(summary);
          setShowPaymentSummary(true);
          message.success("Vui lòng xem lại hóa đơn và xác nhận thanh toán");
        } else {
          message.error(
            summaryResponse?.message || "Không thể tính toán hóa đơn"
          );
        }
      } catch (summaryError) {
        console.error("❌ Summary Error:", summaryError);
        message.error(
          summaryError?.response?.data?.message ||
            summaryError?.message ||
            "Có lỗi xảy ra khi tính toán hóa đơn"
        );
      }
    } catch (error) {
      console.error("❌ Booking Submit Error:", error);
      message.error("Có lỗi xảy ra khi đặt lịch. Vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  // Handle confirm payment (NEW FLOW) - Tham khảo logic từ đặt nhiều lịch
  const handleConfirmPayment = async () => {
    if (!paymentSummary || paymentSummary.totalAmount === 0) {
      message.warning("Không có phí nào cần thanh toán");
      return;
    }

    if (!selectedTimeSlot || !selectedMode || !selectedDate) {
      message.warning("Vui lòng chọn đầy đủ thông tin lịch hẹn");
      return;
    }

    // Debug log
    console.log("💳 handleConfirmPayment - Debug Info:");
    console.log("paymentSummary.bookingFor:", paymentSummary.bookingFor);
    console.log(
      "paymentSummary.familyMemberPatientId:",
      paymentSummary.familyMemberPatientId
    );

    try {
      setProcessingPayment(true);

      // Prepare appointment data - Tham khảo logic từ đặt nhiều lịch
      // Ưu tiên lấy từ paymentSummary.appointmentSummary nếu có (đã được tính toán sẵn)
      let appointmentData = null;

      if (paymentSummary.appointmentSummary) {
        // Sử dụng data từ paymentSummary (đã được validate và tính toán)
        appointmentData = {
          doctorId: paymentSummary.appointmentSummary.doctorId || doctor._id,
          slotId:
            paymentSummary.appointmentSummary.slotId || selectedTimeSlot._id,
          mode: paymentSummary.appointmentSummary.mode || selectedMode,
          reason:
            paymentSummary.appointmentSummary.reason ||
            form.getFieldValue("reason") ||
            "",
          scheduledStart: paymentSummary.appointmentSummary.scheduledStart
            ? new Date(
                paymentSummary.appointmentSummary.scheduledStart
              ).toISOString()
            : selectedDate
                .clone()
                .hour(parseInt(selectedTimeSlot.startTime.split(":")[0]))
                .minute(parseInt(selectedTimeSlot.startTime.split(":")[1]))
                .second(0)
                .millisecond(0)
                .toISOString(),
          scheduledEnd: paymentSummary.appointmentSummary.scheduledEnd
            ? new Date(
                paymentSummary.appointmentSummary.scheduledEnd
              ).toISOString()
            : selectedDate
                .clone()
                .hour(parseInt(selectedTimeSlot.endTime.split(":")[0]))
                .minute(parseInt(selectedTimeSlot.endTime.split(":")[1]))
                .second(0)
                .millisecond(0)
                .toISOString(),
        };

        // Add clinicId for offline appointments
        if (appointmentData.mode === "offline") {
          appointmentData.clinicId =
            paymentSummary.appointmentSummary.clinicId || defaultClinic?._id;
        }
      } else {
        // Fallback - extract từ form và selected data (tương tự logic nhiều lịch)
        appointmentData = {
          doctorId: doctor._id,
          slotId: selectedTimeSlot._id,
          mode: selectedMode,
          reason: form.getFieldValue("reason") || "",
          scheduledStart: selectedDate
            .clone()
            .hour(parseInt(selectedTimeSlot.startTime.split(":")[0]))
            .minute(parseInt(selectedTimeSlot.startTime.split(":")[1]))
            .second(0)
            .millisecond(0)
            .toISOString(),
          scheduledEnd: selectedDate
            .clone()
            .hour(parseInt(selectedTimeSlot.endTime.split(":")[0]))
            .minute(parseInt(selectedTimeSlot.endTime.split(":")[1]))
            .second(0)
            .millisecond(0)
            .toISOString(),
        };

        // Add clinicId for offline appointments
        if (selectedMode === "offline" && defaultClinic) {
          appointmentData.clinicId = defaultClinic._id;
        }
      }

      // Validate appointment data (tương tự logic nhiều lịch)
      if (
        !appointmentData ||
        !appointmentData.doctorId ||
        !appointmentData.slotId ||
        !appointmentData.mode
      ) {
        message.error("Không có lịch hẹn hợp lệ để thanh toán");
        setProcessingPayment(false);
        return;
      }

      // IMPORTANT: Sử dụng bookingFor và familyMemberPatientId từ paymentSummary (đã lưu khi submit)
      // Thay vì dùng state patientIdForBooking (có thể đã bị thay đổi)
      const isBookingForFamily = paymentSummary.bookingFor === "family";
      const familyPatientId = paymentSummary.familyMemberPatientId;

      // Debug log
      console.log("isBookingForFamily:", isBookingForFamily);
      console.log("familyPatientId:", familyPatientId);

      // ONLY add patientId for family member booking
      if (isBookingForFamily && familyPatientId) {
        appointmentData.patientId = familyPatientId;
        console.log("✅ Added patientId to appointmentData:", familyPatientId);
      } else {
        // IMPORTANT: Explicitly delete patientId if booking for "me"
        delete appointmentData.patientId;
        console.log(
          "✅ No patientId added (booking for me) - deleted patientId key"
        );
      }

      // IMPORTANT: Tạo clean request body - force remove patientId if booking for "me"
      const requestBody = {
        doctorId: appointmentData.doctorId,
        slotId: appointmentData.slotId,
        mode: appointmentData.mode,
        reason: appointmentData.reason,
        scheduledStart: appointmentData.scheduledStart,
        scheduledEnd: appointmentData.scheduledEnd,
        gateway: "payos",
        method: "qr",
        // IMPORTANT: Add explicit flag to tell backend this is for current user
        bookForSelf: !isBookingForFamily, // true if booking for me, false if family
      };

      // Add clinicId if exists
      if (appointmentData.clinicId) {
        requestBody.clinicId = appointmentData.clinicId;
      }

      // ONLY add patientId if booking for family
      if (isBookingForFamily && familyPatientId) {
        requestBody.patientId = familyPatientId;
        console.log("✅ Added patientId to request body:", familyPatientId);
      } else {
        // Explicitly ensure no patientId for "me" booking
        // Add explicit null to override any backend default
        requestBody.patientId = null;
        console.log("✅ Explicitly set patientId = null (booking for me)");
      }

      console.log(
        "📮 Clean request body SENT to create-payment API:",
        JSON.parse(JSON.stringify(requestBody))
      );
      console.log(
        "📮 Request body has patientId key:",
        "patientId" in requestBody
      );
      console.log("📮 Request body.patientId:", requestBody.patientId);

      // Create payment and get PayOS link (tương tự logic nhiều lịch)
      const response = await api.post(
        "/api/patients/appointments/create-payment",
        requestBody
      );

      console.log("📥 Response from create-payment API:", response);

      if (response?.success || response?.data?.success) {
        // Response structure: ok(res, { paymentId, payUrl, orderCode, ... })
        const paymentData = response?.data || response;
        const payUrl = paymentData?.payUrl || paymentData?.paymentLink;

        if (payUrl) {
          // Redirect to PayOS payment page
          // Sau khi thanh toán thành công, webhook sẽ tạo appointment với status "pending_doctor"
          window.location.href = payUrl;
        } else {
          message.error("Không thể tạo liên kết thanh toán ");
        }
      } else {
        message.error(response?.message || "Không thể tạo thanh toán");
      }
    } catch (error) {
      console.error("❌ Payment Error:", error);
      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Không thể tạo thanh toán"
      );
    } finally {
      setProcessingPayment(false);
    }
  };

  const disabledDate = (current) => {
    // Disable dates before today
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day
    return current && current < today;
  };

  const isSlotPassed = (slot) => {
    if (!selectedDate || !slot.startTime) return false;

    // Kiểm tra nếu ngày được chọn là ngày hôm nay
    const isToday = selectedDate.isSame(currentTime, "day");

    if (!isToday) return false;

    // So sánh thời gian hiện tại (from state) với thời gian bắt đầu của slot
    const [hours, minutes] = slot.startTime.split(":").map(Number);
    const slotTime = selectedDate
      .hour(hours)
      .minute(minutes)
      .second(0)
      .millisecond(0);

    // Slot đã qua nếu thời gian bắt đầu đã nhỏ hơn thời gian hiện tại
    return slotTime.isBefore(currentTime);
  };

  const getSpecializationNames = (specializationIds) => {
    if (!specializationIds || specializationIds.length === 0) return [];
    return specializationIds.map((spec) => spec.name).join(", ");
  };

  if (!doctor || !specialization) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "400px",
        }}
      >
        <Spin size="large" />
        <Text style={{ marginLeft: 16 }}>Đang tải thông tin...</Text>
      </div>
    );
  }

  return (
    <div className="time-slot-selection-page">
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
              label: "Đặt lịch khám",
              path: "/dat-lich",
            },
            {
              label: "Chọn chuyên khoa",
              path: "/dat-lich/chon-chuyen-khoa",
            },
            {
              label: specialization?.name || "Chuyên khoa",
              path: "/dat-lich/chon-bac-si",
            },
            {
              label:
                (() => {
                  const fullName = doctor?.userId?.fullName || doctor?.fullName;
                  return fullName?.startsWith("BS.")
                    ? fullName
                    : `BS. ${fullName}`;
                })() || "Bác sĩ",
            },
          ]}
        />

        <Row gutter={24}>
          {/* Left Column - Doctor Info & Time Selection */}
          <Col xs={24} lg={16}>
            <div className="booking-section">
              {/* Doctor Profile */}
              <Card className="doctor-profile-card">
                <div className="doctor-profile-content">
                  <div>
                    <img
                      src={doctor.avatarUrl || "/default-avatar.png"}
                      alt={doctor.userId?.fullName || doctor.fullName}
                      className="avatar-image"
                    />
                  </div>
                  <div className="doctor-info">
                    <Title level={3}>
                      {(() => {
                        const fullName =
                          doctor.userId?.fullName || doctor.fullName;
                        return fullName?.startsWith("BS.")
                          ? fullName
                          : `BS. ${fullName}`;
                      })()}
                    </Title>
                    <div
                      className="doctor-specializations"
                      style={{
                        marginBottom: 8,
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                      }}
                    >
                      {doctor.specializationIds &&
                        doctor.specializationIds.length > 0 &&
                        doctor.specializationIds.map((spec, index) => (
                          <Tag
                            key={index}
                            style={{
                              backgroundColor: "#e6f4ff",
                              borderColor: "#1890ff",
                              color: "#1890ff",
                              borderRadius: "6px",
                              padding: "4px 12px",
                              fontSize: "14px",
                              fontWeight: 500,
                              border: "1px solid",
                            }}
                          >
                            {spec.name || spec}
                          </Tag>
                        ))}
                      {doctor.educationLevel && (
                        <Tag
                          style={{
                            backgroundColor: "#e6fffb",
                            borderColor: "#13c2c2",
                            color: "#13c2c2",
                            borderRadius: "6px",
                            padding: "4px 12px",
                            fontSize: "14px",
                            fontWeight: 500,
                            border: "1px solid",
                          }}
                        >
                          {doctor.educationLevel}
                        </Tag>
                      )}
                    </div>
                    {doctor.yearsExperience && (
                      <div className="doctor-experience">
                        <Text type="secondary">
                          <UserOutlined style={{ marginRight: 4 }} />
                          {doctor.yearsExperience} năm kinh nghiệm
                        </Text>
                      </div>
                    )}
                    {doctor.bio && (
                      <Paragraph className="doctor-bio">{doctor.bio}</Paragraph>
                    )}
                    <div className="doctor-rating">
                      <Space>
                        <Rate disabled value={doctor.ratingAvg || 0} />
                        <Text type="secondary">
                          ({doctor.ratingCount || 0} đánh giá)
                        </Text>
                        {doctor.ratingCount > 0 && (
                          <Button
                            type="link"
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => {
                              setShowReviewModal(true);
                              fetchDoctorReviews(doctor._id);
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

              {/* Date Selection */}
              <Card className="date-selection-card">
                <Title level={4}>
                  <CalendarOutlined /> Chọn ngày khám
                </Title>
                <DatePicker
                  size="large"
                  style={{ width: "100%" }}
                  placeholder="Chọn ngày khám"
                  disabledDate={disabledDate}
                  onChange={handleDateChange}
                  value={selectedDate}
                />
              </Card>

              {/* Time Slots */}
              {selectedDate && (
                <Card className="time-slots-card">
                  <Title level={4}>
                    <ClockCircleOutlined /> Chọn giờ khám
                  </Title>

                  {timeSlotsLoading ? (
                    <div style={{ textAlign: "center", padding: "40px 0" }}>
                      <Spin />
                      <Text style={{ marginLeft: 16 }}>
                        Đang tải khung giờ...
                      </Text>
                    </div>
                  ) : timeSlots.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 0" }}>
                      <Text type="secondary">
                        Không có khung giờ khám vào ngày này
                      </Text>
                    </div>
                  ) : (
                    <div className="time-slots-grid">
                      {timeSlots.map((slot) => {
                        // Kiểm tra slot đã qua giờ
                        const isPassed = isSlotPassed(slot);
                        // Kiểm tra slot không available (đã có appointment hoặc bị blocked)
                        const isUnavailable = !slot.available;
                        // Kiểm tra slot bị blocked (bác sĩ nghỉ)
                        const isBlocked =
                          slot.isBlocked || slot.status === "blocked";
                        // Slot bị disable nếu đã qua giờ, không available, hoặc bị blocked
                        const isDisabled =
                          isPassed || isUnavailable || isBlocked;

                        // Tạo tooltip text để giải thích tại sao slot bị disable
                        let disabledReason = "";
                        if (isBlocked) {
                          disabledReason = slot.leaveReason
                            ? `Bác sĩ nghỉ: ${slot.leaveReason}`
                            : "Bác sĩ nghỉ";
                        } else if (isPassed) {
                          disabledReason = "Khung giờ này đã qua";
                        } else if (isUnavailable && slot.appointmentStatus) {
                          // Hiển thị status cụ thể của appointment
                          const statusMap = {
                            pending_doctor: "Đang chờ bác sĩ xác nhận",
                            accepted: "Đã được chấp nhận",
                            in_progress: "Đang trong quá trình khám",
                            done: "Đã hoàn thành",
                          };
                          disabledReason =
                            statusMap[slot.appointmentStatus] ||
                            "Khung giờ này đã được đặt";
                        } else if (isUnavailable) {
                          disabledReason = "Khung giờ này đã được đặt";
                        }

                        return (
                          <Button
                            key={slot._id}
                            type={
                              selectedTimeSlot?._id === slot._id
                                ? "primary"
                                : "default"
                            }
                            onClick={() => {
                              if (!isDisabled) {
                                handleTimeSlotSelect(slot);
                              }
                            }}
                            className="time-slot-button"
                            size="large"
                            disabled={isDisabled}
                            title={disabledReason}
                          >
                            {slot.timeRange}
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </Card>
              )}

              {/* Payment Summary (NEW FLOW) */}
              {showPaymentSummary && paymentSummary && (
                <Card className="payment-summary-card">
                  <Title level={3}>
                    Tổng hợp lịch hẹn và hóa đơn thanh toán
                  </Title>
                  <Paragraph>
                    Vui lòng xem lại thông tin lịch hẹn và hóa đơn thanh toán
                    trước khi xác nhận.
                  </Paragraph>

                  <Alert
                    message="Thông tin quan trọng"
                    description="Sau khi thanh toán thành công, lịch hẹn sẽ được tạo với trạng thái 'Chờ bác sĩ duyệt'. Bác sĩ sẽ xem xét và chấp nhận hoặc từ chối lịch hẹn của bạn."
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />

                  <Divider />

                  {/* Appointment Details Table */}
                  {paymentSummary.appointmentSummary && (
                    <Table
                      dataSource={[paymentSummary.appointmentSummary]}
                      rowKey={(record) =>
                        record.slotId?.toString() ||
                        record.doctorId?.toString() ||
                        "appointment"
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
                            const reasonText = text?.trim() || "";
                            return (
                              <Text
                                ellipsis={{ tooltip: reasonText || "Không có" }}
                                style={{ maxWidth: 200 }}
                              >
                                {reasonText || "Không có"}
                              </Text>
                            );
                          },
                        },
                        {
                          title: "Thời gian",
                          key: "time",
                          render: (_, record) => {
                            if (record.timeText) {
                              return record.timeText;
                            }
                            if (record.scheduledStart && record.scheduledEnd) {
                              return `${dayjs(record.scheduledStart).format(
                                "HH:mm"
                              )} - ${dayjs(record.scheduledEnd).format(
                                "HH:mm"
                              )}`;
                            }
                            if (selectedTimeSlot?.timeRange) {
                              return selectedTimeSlot.timeRange;
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
                  )}

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
                  {paymentSummary.totalAmount > 0 && (
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
                        thanh toán thành công, lịch hẹn sẽ được tạo và chờ bác
                        sĩ duyệt.
                      </Paragraph>
                      <Button
                        onClick={() => {
                          setShowPaymentSummary(false);
                          setPaymentSummary(null);
                          // IMPORTANT: Reset patientIdForBooking khi quay lại để tránh lỗi
                          setPatientIdForBooking(null);
                        }}
                        style={{ marginTop: 16 }}
                      >
                        Quay lại
                      </Button>
                    </div>
                  )}
                </Card>
              )}

              {/* Booking Form */}
              {!showPaymentSummary && showBookingForm && selectedTimeSlot && (
                <Card className="booking-form-card">
                  <div className="form-header">
                    <Title level={4}>Thông tin đặt lịch</Title>
                    <Button
                      type="link"
                      onClick={() => setShowBookingForm(false)}
                    >
                      ← Chọn lại thời gian
                    </Button>
                  </div>

                  <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleBookingSubmit}
                    className="booking-form"
                  >
                    {/* Booking For Selection */}
                    <Form.Item label="Đặt khám cho">
                      <div className="booking-for-buttons">
                        <Button
                          type={bookingFor === "me" ? "primary" : "default"}
                          onClick={() => {
                            setBookingFor("me");
                            setSelectedFamilyMember(null);
                            setPatientIdForBooking(null); // Reset patientId khi chuyển về "me"
                            form.resetFields(); // Reset toàn bộ form
                          }}
                          className="booking-button"
                        >
                          Đặt khám cho tôi
                        </Button>
                        <Button
                          type={bookingFor === "family" ? "primary" : "default"}
                          onClick={() => {
                            setBookingFor("family");
                            setSelectedFamilyMember(null);
                            setPatientIdForBooking(null); // Reset patientId khi chuyển sang family
                            form.resetFields(); // Reset toàn bộ form
                          }}
                          className="booking-button"
                        >
                          Đặt khám hộ người thân
                        </Button>
                      </div>
                    </Form.Item>

                    {/* Family Member Fields - Show inline when booking for family */}
                    {bookingFor === "family" && (
                      <div>
                        <Title level={5} style={{ marginBottom: 16 }}>
                          Thông tin người thân
                        </Title>
                        <Form.Item
                          label="Họ và tên"
                          name="fullName"
                          rules={[
                            {
                              required: true,
                              message: "Vui lòng nhập họ tên!",
                            },
                            {
                              min: 2,
                              message: "Họ tên phải có ít nhất 2 ký tự!",
                            },
                            {
                              max: 100,
                              message: "Họ tên không được vượt quá 100 ký tự!",
                            },
                            {
                              pattern: /^[a-zA-ZÀ-ỹ\s]+$/,
                              message:
                                "Họ tên chỉ được chứa chữ cái và khoảng trắng!",
                            },
                            {
                              whitespace: true,
                              message: "Họ tên không được chỉ có khoảng trắng!",
                            },
                          ]}
                        >
                          <Input placeholder="Nhập họ và tên" />
                        </Form.Item>

                        <Form.Item
                          label="Số CCCD/CMND"
                          name="citizenId"
                          rules={[
                            {
                              required: true,
                              message: "Vui lòng nhập số CCCD/CMND!",
                            },
                            {
                              pattern: /^[0-9]{12}$/,
                              message: "Số CCCD/CMND phải có đúng 12 chữ số!",
                            },
                            {
                              whitespace: true,
                              message:
                                "Số CCCD/CMND không được chứa khoảng trắng!",
                            },
                          ]}
                        >
                          <Input
                            placeholder="Nhập số CCCD/CMND (12 số)"
                            maxLength={12}
                            onKeyPress={(e) => {
                              if (
                                !/[0-9]/.test(e.key) &&
                                e.key !== "Backspace" &&
                                e.key !== "Delete"
                              ) {
                                e.preventDefault();
                              }
                            }}
                          />
                        </Form.Item>

                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item
                              label="Ngày sinh"
                              name="dob"
                              rules={[
                                {
                                  required: true,
                                  message: "Vui lòng chọn ngày sinh!",
                                },
                                {
                                  validator: (_, value) => {
                                    if (!value) {
                                      return Promise.resolve();
                                    }
                                    const today = dayjs();
                                    const birthDate = dayjs(value);
                                    const age = today.diff(birthDate, "year");

                                    if (age < 0) {
                                      return Promise.reject(
                                        new Error(
                                          "Ngày sinh không được là tương lai!"
                                        )
                                      );
                                    }
                                    if (age > 150) {
                                      return Promise.reject(
                                        new Error("Ngày sinh không hợp lệ!")
                                      );
                                    }
                                    return Promise.resolve();
                                  },
                                },
                              ]}
                            >
                              <DatePicker
                                style={{ width: "100%" }}
                                format="DD/MM/YYYY"
                                placeholder="Chọn ngày sinh"
                                disabledDate={(current) =>
                                  current && current > dayjs().endOf("day")
                                }
                              />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item
                              label="Giới tính"
                              name="gender"
                              rules={[
                                {
                                  required: true,
                                  message: "Vui lòng chọn giới tính!",
                                },
                              ]}
                            >
                              <Select placeholder="Chọn giới tính">
                                <Option value="male">Nam</Option>
                                <Option value="female">Nữ</Option>
                                <Option value="other">Khác</Option>
                              </Select>
                            </Form.Item>
                          </Col>
                        </Row>

                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item
                              label="Dân tộc"
                              name="ethnicity"
                              rules={[
                                {
                                  max: 50,
                                  message:
                                    "Dân tộc không được vượt quá 50 ký tự!",
                                },
                                {
                                  pattern: /^[a-zA-ZÀ-ỹ\s]*$/,
                                  message:
                                    "Dân tộc chỉ được chứa chữ cái và khoảng trắng!",
                                },
                              ]}
                            >
                              <Input
                                placeholder="Nhập dân tộc (nếu có)"
                                maxLength={50}
                              />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item
                              label="Nghề nghiệp"
                              name="occupation"
                              rules={[
                                {
                                  max: 100,
                                  message:
                                    "Nghề nghiệp không được vượt quá 100 ký tự!",
                                },
                              ]}
                            >
                              <Input
                                placeholder="Nhập nghề nghiệp (nếu có)"
                                maxLength={100}
                              />
                            </Form.Item>
                          </Col>
                        </Row>

                        <Form.Item label="Nhóm máu" name="bloodType">
                          <Select
                            placeholder="Chọn nhóm máu (nếu có)"
                            allowClear
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
                          label="Mối quan hệ"
                          name="relationshipToOwner"
                          rules={[
                            {
                              required: true,
                              message: "Vui lòng chọn mối quan hệ!",
                            },
                          ]}
                        >
                          <Select placeholder="Chọn mối quan hệ">
                            <Option value="father">Cha</Option>
                            <Option value="mother">Mẹ</Option>
                            <Option value="spouse">Vợ/Chồng</Option>
                            <Option value="child">Con</Option>
                            <Option value="grandparent">Ông/Bà</Option>
                            <Option value="other">Khác</Option>
                          </Select>
                        </Form.Item>

                        <Form.Item
                          label="Số điện thoại"
                          name="phone"
                          rules={[
                            {
                              required: true,
                              message: "Vui lòng nhập số điện thoại!",
                            },
                            {
                              pattern: /^0[35789][0-9]{8}$/,
                              message:
                                "Số điện thoại phải bắt đầu bằng 0, số thứ 2 là 3/5/7/8/9 và có 10 chữ số (VD: 0912345678)!",
                            },
                            {
                              whitespace: true,
                              message:
                                "Số điện thoại không được chứa khoảng trắng!",
                            },
                          ]}
                        >
                          <Input
                            placeholder="Nhập số điện thoại (VD: 0912345678)"
                            maxLength={10}
                            onKeyPress={(e) => {
                              if (
                                !/[0-9]/.test(e.key) &&
                                e.key !== "Backspace" &&
                                e.key !== "Delete"
                              ) {
                                e.preventDefault();
                              }
                            }}
                          />
                        </Form.Item>

                        <Form.Item
                          label="Địa chỉ"
                          name="address"
                          rules={[
                            {
                              required: true,
                              message: "Vui lòng nhập địa chỉ!",
                            },
                            {
                              min: 5,
                              message: "Địa chỉ phải có ít nhất 5 ký tự!",
                            },
                            {
                              max: 200,
                              message: "Địa chỉ không được vượt quá 200 ký tự!",
                            },
                            {
                              whitespace: true,
                              message:
                                "Địa chỉ không được chỉ có khoảng trắng!",
                            },
                          ]}
                        >
                          <Input placeholder="Nhập địa chỉ đầy đủ" />
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
                            rows={3}
                            placeholder="Nhập thông tin dị ứng, tiền sử dị ứng thuốc, thức ăn (nếu có)"
                            maxLength={500}
                            showCount
                          />
                        </Form.Item>

                        <Form.Item
                          label="Tiền sử bệnh mạn tính"
                          name="medicalHistory"
                          tooltip="Nhập các bệnh mạn tính, ví dụ: Tiểu đường, Cao huyết áp, Hen suyễn..."
                        >
                          <Select
                            mode="tags"
                            placeholder="Nhập bệnh mạn tính (có thể nhập nhiều, nhấn Enter sau mỗi bệnh)"
                            style={{ width: "100%" }}
                            tokenSeparators={[","]}
                            allowClear
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
                      </div>
                    )}

                    {/* Mode Selection */}
                    <Form.Item
                      name="mode"
                      label="Hình thức khám"
                      rules={[
                        {
                          required: true,
                          message: "Vui lòng chọn hình thức khám!",
                        },
                      ]}
                    >
                      <Radio.Group
                        value={selectedMode}
                        onChange={(e) => setSelectedMode(e.target.value)}
                      >
                        <Radio value="online">Khám online</Radio>
                        <Radio value="offline">Khám tại phòng khám</Radio>
                      </Radio.Group>
                    </Form.Item>

                    {selectedMode === "offline" && (
                      <>
                        <Form.Item label="Phòng khám">
                          {clinicLoading ? (
                            <div style={{ padding: "8px 0" }}>
                              <Spin size="small" /> Đang tải thông tin phòng
                              khám...
                            </div>
                          ) : defaultClinic ? (
                            <div className="clinic-info-display">
                              <div className="clinic-name">
                                <EnvironmentOutlined
                                  style={{ marginRight: 8 }}
                                />
                                <strong>{defaultClinic.name}</strong>
                              </div>
                              <div className="clinic-address">
                                {defaultClinic.address}
                              </div>
                              {defaultClinic.phone && (
                                <div className="clinic-phone">
                                  <PhoneOutlined style={{ marginRight: 8 }} />
                                  {defaultClinic.phone}
                                </div>
                              )}
                            </div>
                          ) : (
                            <Text type="secondary">
                              Không có thông tin phòng khám
                            </Text>
                          )}
                        </Form.Item>
                        {defaultClinic && (
                          <Form.Item>
                            <ClinicMap
                              clinic={defaultClinic}
                              onGetDirections={(clinic) => {
                                const address = encodeURIComponent(
                                  clinic?.address || ""
                                );
                                const url = `https://www.google.com/maps/dir/?api=1&destination=${address}`;
                                window.open(url, "_blank");
                              }}
                            />
                          </Form.Item>
                        )}
                      </>
                    )}

                    {/* Price Table */}
                    {selectedMode && selectedDate && (
                      <div style={{ marginTop: 16, marginBottom: 16 }}>
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
                            {calculatePrice(
                              selectedMode,
                              selectedDate
                            ).toLocaleString("vi-VN")}
                            đ
                          </Text>
                        </div>
                      </div>
                    )}

                    {/* Reason */}
                    <Form.Item
                      name="reason"
                      label="Lý do khám"
                      rules={[
                        {
                          max: 100,
                          message: "Lý do khám không được vượt quá 100 ký tự",
                        },
                      ]}
                    >
                      <Form.Item
                        shouldUpdate={(prevValues, curValues) =>
                          prevValues.reason !== curValues.reason
                        }
                        noStyle
                      >
                        {({ getFieldValue }) => {
                          const reasonValue = getFieldValue("reason") || "";
                          const isMaxLength = reasonValue.length >= 100;
                          return (
                            <>
                              <TextArea
                                ref={reasonTextareaRef}
                                value={reasonValue}
                                rows={4}
                                placeholder="Mô tả triệu chứng hoặc lý do khám (không bắt buộc)"
                                maxLength={100}
                                showCount
                                onChange={(e) => {
                                  const newValue = e.target.value;
                                  const newLength = newValue.length;

                                  // IMPORTANT: Update form field value immediately
                                  form.setFieldsValue({ reason: newValue });

                                  // Cắt bớt nếu vượt quá 100 ký tự
                                  if (newLength > 100) {
                                    const truncatedValue = newValue.slice(
                                      0,
                                      100
                                    );
                                    e.target.value = truncatedValue;
                                    form.setFieldsValue({
                                      reason: truncatedValue,
                                    });
                                  }
                                }}
                                onKeyDown={(e) => {
                                  const currentValue =
                                    getFieldValue("reason") || "";
                                  const currentLength = currentValue.length;

                                  // Nếu đã có 100 ký tự
                                  if (currentLength >= 100) {
                                    // Cho phép xóa (Backspace, Delete)
                                    if (
                                      e.key === "Backspace" ||
                                      e.key === "Delete"
                                    ) {
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
                                  // Chặn input event nếu đã có 100 ký tự
                                  const currentValue =
                                    getFieldValue("reason") || "";
                                  if (currentValue.length >= 100) {
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
                                  // Cắt bớt nếu vượt quá 100 ký tự
                                  const newValue = e.target.value;
                                  if (newValue.length > 100) {
                                    const truncatedValue = newValue.slice(
                                      0,
                                      100
                                    );
                                    e.target.value = truncatedValue;
                                    form.setFieldsValue({
                                      reason: truncatedValue,
                                    });
                                  }
                                }}
                                onPaste={(e) => {
                                  const currentValue =
                                    getFieldValue("reason") || "";
                                  const currentLength = currentValue.length;
                                  // Nếu đã có 100 ký tự, chặn paste hoàn toàn
                                  if (currentLength >= 100) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    return;
                                  }
                                  // Nếu chưa đạt 100, xử lý paste
                                  const pastedText =
                                    e.clipboardData.getData("text/plain");
                                  const textarea = e.target;
                                  const selectionStart =
                                    textarea.selectionStart || 0;
                                  const selectionEnd =
                                    textarea.selectionEnd || 0;
                                  const textBefore = currentValue.substring(
                                    0,
                                    selectionStart
                                  );
                                  const textAfter =
                                    currentValue.substring(selectionEnd);
                                  const newText =
                                    textBefore + pastedText + textAfter;

                                  if (newText.length > 100) {
                                    e.preventDefault();
                                    // Chỉ paste phần vừa đủ
                                    const maxAllowedLength = 100;
                                    const availableLength =
                                      maxAllowedLength -
                                      (textBefore.length + textAfter.length);
                                    if (availableLength > 0) {
                                      const truncatedPaste =
                                        pastedText.substring(
                                          0,
                                          availableLength
                                        );
                                      const finalText =
                                        textBefore + truncatedPaste + textAfter;
                                      form.setFieldsValue({
                                        reason: finalText,
                                      });
                                      // Set cursor position sau text vừa paste
                                      setTimeout(() => {
                                        const newCursorPos =
                                          textBefore.length +
                                          truncatedPaste.length;
                                        textarea.setSelectionRange(
                                          newCursorPos,
                                          newCursorPos
                                        );
                                      }, 0);
                                    }
                                  }
                                }}
                                style={
                                  isMaxLength
                                    ? {
                                        borderColor: "#faad14",
                                        backgroundColor: "#fffbe6",
                                      }
                                    : {}
                                }
                              />
                              {isMaxLength && (
                                <div style={{ marginTop: 4 }}>
                                  <Text
                                    type="warning"
                                    style={{
                                      fontSize: "12px",
                                      fontWeight: 500,
                                    }}
                                  >
                                    ⚠️ Bạn đã nhập đủ 100 ký tự (giới hạn tối
                                    đa)
                                  </Text>
                                </div>
                              )}
                              {!isMaxLength && (
                                <Text
                                  type="secondary"
                                  style={{
                                    fontSize: "12px",
                                    marginTop: 4,
                                    display: "block",
                                  }}
                                >
                                  Bạn có thể nhập tối đa 100 ký tự để mô tả lý
                                  do khám ({100 - reasonValue.length} ký tự còn
                                  lại)
                                </Text>
                              )}
                            </>
                          );
                        }}
                      </Form.Item>
                    </Form.Item>

                    {/* TODO: Comment out payment section for now */}
                    {/* <Divider />
                    <div className="payment-section">
                      <Title level={5}>Thanh toán</Title>
                      <Text>Phí khám: 350.000đ</Text>
                      <Button type="primary" htmlType="submit" loading={loading}>
                        Thanh toán và đặt lịch
                      </Button>
                    </div> */}

                    <div className="form-actions">
                      <Button
                        size="large"
                        onClick={() => setShowBookingForm(false)}
                      >
                        Quay lại
                      </Button>
                      <Button
                        type="primary"
                        size="large"
                        htmlType="submit"
                        loading={loading}
                        icon={<CheckCircleOutlined />}
                      >
                        Xác nhận đặt lịch
                      </Button>
                    </div>
                  </Form>
                </Card>
              )}
            </div>
          </Col>

          {/* Right Column - Booking Summary (Hidden when showing payment summary) */}
          {!showPaymentSummary && (
            <Col xs={24} lg={8}>
              <div className="booking-summary-section">
                {/* Booking Summary */}
                <Card className="booking-summary-card">
                  <Title level={4}>Tóm tắt đặt lịch</Title>

                  <div className="summary-item">
                    <Text strong>Bác sĩ:</Text>
                    <Text>
                      {(() => {
                        const fullName =
                          doctor.userId?.fullName || doctor.fullName;
                        return fullName?.startsWith("BS.")
                          ? fullName
                          : `BS. ${fullName}`;
                      })()}
                    </Text>
                  </div>

                  <div className="summary-item">
                    <Text strong>Chuyên khoa:</Text>
                    <Text>
                      {getSpecializationNames(doctor.specializationIds)}
                    </Text>
                  </div>

                  {selectedDate && (
                    <div className="summary-item">
                      <Text strong>Ngày khám:</Text>
                      <Text>{selectedDate.format("DD/MM/YYYY")}</Text>
                    </div>
                  )}

                  {selectedTimeSlot && (
                    <div className="summary-item">
                      <Text strong>Giờ khám:</Text>
                      <Text>{selectedTimeSlot.timeRange}</Text>
                    </div>
                  )}

                  {selectedMode && (
                    <div className="summary-item">
                      <Text strong>Hình thức:</Text>
                      <Text>
                        {selectedMode === "online"
                          ? "Khám online"
                          : "Khám tại phòng khám"}
                      </Text>
                    </div>
                  )}

                  {selectedMode === "offline" && defaultClinic && (
                    <div className="summary-item">
                      <Text strong>Phòng khám:</Text>
                      <div>
                        <div>{defaultClinic.name}</div>
                        <Text type="secondary" style={{ fontSize: "12px" }}>
                          {defaultClinic.address}
                        </Text>
                      </div>
                    </div>
                  )}

                  {/* Payment info */}
                  {selectedMode && selectedDate && (
                    <>
                      <Divider />
                      <div className="payment-info">
                        <div className="summary-item">
                          <Text strong>Phí khám:</Text>
                          <Text
                            strong
                            style={{ fontSize: "16px", color: "#1890ff" }}
                          >
                            {calculatePrice(
                              selectedMode,
                              selectedDate
                            ).toLocaleString("vi-VN")}
                            đ
                          </Text>
                        </div>
                      </div>
                    </>
                  )}
                </Card>

                {/* Help Text */}
                <Card className="help-card">
                  <Title level={4}>Lưu ý</Title>
                  <ul>
                    <li>
                      Sau khi thanh toán thành công, lịch hẹn sẽ được tạo với
                      trạng thái "Chờ bác sĩ duyệt"
                    </li>
                    <li>
                      Bác sĩ sẽ xem xét và chấp nhận hoặc từ chối lịch hẹn của
                      bạn
                    </li>
                    <li>Bạn sẽ nhận được thông báo khi bác sĩ xác nhận</li>
                    <li>Có thể hủy lịch hẹn trước khi bác sĩ xác nhận</li>
                  </ul>
                </Card>
              </div>
            </Col>
          )}
        </Row>
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
      {/* Modal for viewing doctor reviews */}
      <Modal
        title={
          <Space>
            <UserOutlined />
            <span>Đánh giá của {doctor?.fullName || "Bác sĩ"}</span>
          </Space>
        }
        open={showReviewModal}
        onCancel={() => {
          setShowReviewModal(false);
          setDoctorReviews([]);
          setReviewsPagination(null);
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
              <Card key={review._id} style={{ marginBottom: 16 }} size="small">
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
                    Hiển thị {doctorReviews.length} / {reviewsPagination.total}{" "}
                    đánh giá
                  </Text>
                </div>
              )}
          </div>
        ) : (
          <Empty description="Chưa có đánh giá nào" />
        )}
      </Modal>
    </div>
  );
};

export default ChonThoiGian;
