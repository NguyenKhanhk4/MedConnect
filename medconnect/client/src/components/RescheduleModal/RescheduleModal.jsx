import React, { useState, useEffect } from "react";
import {
  Modal,
  Form,
  Input,
  Button,
  Space,
  message,
  DatePicker,
  Spin,
  Radio,
  Select,
  Typography,
} from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import { CalendarOutlined, EnvironmentOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { api } from "../../lib/api";
import "./RescheduleModal.scss";

const { TextArea } = Input;
const { Option } = Select;
const { Text } = Typography;

export function RescheduleModal({
  visible,
  appointment,
  onClose,
  onSuccess,
  customSubmitHandler, // Optional: custom handler for manager/admin reschedule
  allowDoctorChange = false, // Allow manager to change doctor when rescheduling
}) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [timeSlotsLoading, setTimeSlotsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [selectedMode, setSelectedMode] = useState(null); // Mode from appointment (cannot be changed)
  const [clinics, setClinics] = useState([]);
  const [clinicLoading, setClinicLoading] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState(null);
  const [specializations, setSpecializations] = useState([]);
  const [selectedSpecializationId, setSelectedSpecializationId] =
    useState(null);

  // Fetch specializations
  const fetchSpecializations = async () => {
    try {
      const response = await api.getAllSpecializations({ limit: 100 });
      if (response.success && response.data) {
        setSpecializations(response.data);
      }
    } catch (error) {
      console.error("Error fetching specializations:", error);
    }
  };

  // Fetch doctors for manager (when allowDoctorChange is true)
  const fetchDoctors = async (specializationId = null) => {
    if (!allowDoctorChange) return;

    try {
      setDoctorsLoading(true);
      let url = "/api/managers/doctors";
      const params = [];
      if (specializationId) {
        params.push(`specializationId=${specializationId}`);
      }
      if (params.length > 0) {
        url += `?${params.join("&")}`;
      }
      const response = await api.get(url);

      if (response.success && response.data?.doctors) {
        setDoctors(response.data.doctors);
        // Set current doctor as default if it's still in the filtered list
        if (appointment?.doctorId?._id) {
          const currentDoctorId =
            appointment.doctorId._id || appointment.doctorId;
          const doctorExists = response.data.doctors.some(
            (d) => (d._id || d.id) === currentDoctorId
          );
          if (doctorExists) {
            setSelectedDoctorId(currentDoctorId);
            form.setFieldsValue({ doctorId: currentDoctorId });
          } else {
            // If current doctor is not in filtered list, clear selection
            setSelectedDoctorId(null);
            form.setFieldsValue({ doctorId: undefined });
          }
        }
      } else {
        setDoctors([]);
        message.warning("Không tìm thấy danh sách bác sĩ");
      }
    } catch (error) {
      console.error("Error fetching doctors:", error);
      message.error("Không thể tải danh sách bác sĩ");
      setDoctors([]);
    } finally {
      setDoctorsLoading(false);
    }
  };

  // Fetch clinics function (defined before useEffects)
  const fetchClinics = async (doctorId) => {
    const targetDoctorId =
      doctorId || appointment?.doctorId?._id || selectedDoctorId;
    if (!targetDoctorId) return;

    try {
      setClinicLoading(true);
      const response = await api.get(`/api/doctors/${targetDoctorId}/clinics`);

      if (response.success && response.data.clinics) {
        setClinics(response.data.clinics);
        // If there's only one clinic, automatically select it
        if (response.data.clinics.length === 1) {
          form.setFieldsValue({ clinicId: response.data.clinics[0]._id });
        }
        // If appointment has a clinicId, try to set it
        else if (appointment.clinicId) {
          const clinicId = appointment.clinicId._id || appointment.clinicId;
          const clinicExists = response.data.clinics.some(
            (c) => (c._id || c.id) === clinicId
          );
          if (clinicExists) {
            form.setFieldsValue({ clinicId: clinicId });
          }
        }
      } else {
        setClinics([]);
        message.warning("Không tìm thấy phòng khám");
      }
    } catch (error) {
      console.error("Error fetching clinics:", error);
      message.error("Không thể tải danh sách phòng khám");
      setClinics([]);
    } finally {
      setClinicLoading(false);
    }
  };

  // Reset form and date when modal opens/closes
  useEffect(() => {
    if (visible) {
      form.resetFields();
      setSelectedDate(null);
      setSelectedTimeSlot(null);
      setAvailableTimeSlots([]);
      setClinics([]);
      // Set tomorrow as default date
      const tomorrow = dayjs().add(1, "day");
      setSelectedDate(tomorrow);
      form.setFieldsValue({ selectedDate: tomorrow });

      // If allowDoctorChange, fetch specializations and doctors list
      if (allowDoctorChange) {
        fetchSpecializations();
        fetchDoctors();
      }

      // Set mode from current appointment (cannot be changed during reschedule)
      if (appointment?.mode) {
        const currentMode = appointment.mode;
        setSelectedMode(currentMode);

        // If current mode is offline, fetch clinics and set current clinicId
        if (currentMode === "offline") {
          const doctorId = appointment.doctorId?._id || appointment.doctorId;
          if (doctorId) {
            fetchClinics(doctorId);
          }
        }
      } else {
        setSelectedMode(null);
      }
    } else {
      // Reset when modal closes
      setSelectedMode(null);
      setSelectedDoctorId(null);
      setDoctors([]);
      setSpecializations([]);
      setSelectedSpecializationId(null);
    }
  }, [visible, form, appointment, allowDoctorChange]);

  // Fetch time slots when date or doctor changes
  useEffect(() => {
    if (visible && selectedDate) {
      const doctorId =
        selectedDoctorId || appointment?.doctorId?._id || appointment?.doctorId;
      if (doctorId) {
        fetchTimeSlots(doctorId);
      }
    }
  }, [visible, selectedDate, selectedDoctorId, appointment]);

  const fetchTimeSlots = async (doctorId) => {
    if (!selectedDate) return;

    const targetDoctorId =
      doctorId ||
      selectedDoctorId ||
      appointment?.doctorId?._id ||
      appointment?.doctorId;
    if (!targetDoctorId) return;

    try {
      setTimeSlotsLoading(true);
      const dateStr = selectedDate.format("YYYY-MM-DD");

      console.log("🔍 Fetching time slots for reschedule:", {
        doctorId: targetDoctorId,
        date: dateStr,
      });

      const response = await api.get(
        `/api/patients/doctors/${targetDoctorId}/time-slots?date=${dateStr}`
      );

      if (response.success && response.data?.timeSlots) {
        // Backend already filters out booked slots, so use all returned slots
        setAvailableTimeSlots(response.data.timeSlots);
        console.log(
          "✅ Available time slots loaded:",
          response.data.timeSlots.length,
          "slots available"
        );
      } else {
        setAvailableTimeSlots([]);
        console.log("⚠️ No time slots found for this date");
      }
    } catch (error) {
      console.error("Error fetching time slots:", error);
      message.error("Không thể tải khung giờ khám. Vui lòng thử lại.");
      setAvailableTimeSlots([]);
    } finally {
      setTimeSlotsLoading(false);
    }
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    setSelectedTimeSlot(null);
    form.setFieldsValue({ selectedTimeSlot: null });
    form.setFieldsValue({ selectedDate: date });
  };

  const handleTimeSlotSelect = (slot) => {
    setSelectedTimeSlot(slot);
    // Don't reset mode - keep the current selection (from appointment or user choice)
    // Only reset clinicId if mode is online
    if (selectedMode === "online") {
      form.setFieldsValue({ clinicId: undefined });
    }
    // Convert slot time to dayjs and set to form
    if (slot.startAt) {
      const slotDateTime = dayjs(slot.startAt);
      form.setFieldsValue({ newDateTime: slotDateTime });
    }
  };

  // Helper function to check if date is weekend (Saturday = 6, Sunday = 0)
  const isWeekend = (date) => {
    if (!date) return false;
    const dayOfWeek = dayjs(date).day();
    return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
  };

  // Helper function to check if date is weekday (Monday-Friday)
  const isWeekday = (date) => {
    if (!date) return false;
    const dayOfWeek = dayjs(date).day();
    return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday
  };

  const handleSubmit = async (values) => {
    try {
      // Validate form first
      if (!selectedTimeSlot) {
        message.error("Vui lòng chọn một khung giờ khám");
        return;
      }

      // Get mode from appointment (cannot be changed during reschedule)
      const currentMode = appointment?.mode || selectedMode;
      if (!currentMode) {
        message.error("Không thể xác định hình thức khám");
        return;
      }

      // If offline mode, clinicId is required
      if (currentMode === "offline" && !values.clinicId) {
        message.error("Vui lòng chọn phòng khám");
        return;
      }

      // Use selectedTimeSlot.startAt as newDateTime
      const newDateTime = selectedTimeSlot.startAt
        ? new Date(selectedTimeSlot.startAt).toISOString()
        : values.newDateTime?.toISOString();

      if (!newDateTime) {
        message.error("Vui lòng chọn thời gian mới");
        return;
      }

      // Check date restrictions based on current appointment date
      const currentAppointmentDate = appointment?.scheduledStart
        ? new Date(appointment.scheduledStart)
        : null;
      const newAppointmentDate = new Date(newDateTime);

      // Validation: If current appointment is weekday, cannot reschedule to weekend
      if (currentAppointmentDate && isWeekday(currentAppointmentDate)) {
        if (isWeekend(newAppointmentDate)) {
          Modal.warning({
            title: "Không thể dời lịch",
            icon: <ExclamationCircleOutlined />,
            content:
              "Lịch hẹn hiện tại của bạn là ngày trong tuần (thứ 2 - thứ 6). Bạn không thể dời lịch sang thứ 7 hoặc chủ nhật. Vui lòng chọn một ngày trong tuần khác.",
            okText: "Đã hiểu",
          });
          return;
        }
      }

      // Prepare confirmation message based on date change
      let confirmationContent =
        "Bạn chỉ có thể dời lịch được 1 lần và sau khi dời lịch bạn không thể quay lại được lịch cũ. Bạn có chắc chắn muốn dời lịch không?";

      // If current appointment is weekend and new appointment is weekday, show warning about price difference
      if (currentAppointmentDate && isWeekend(currentAppointmentDate)) {
        if (isWeekday(newAppointmentDate)) {
          confirmationContent =
            "Lịch hẹn hiện tại của bạn là thứ 7 hoặc chủ nhật. Nếu bạn dời lịch sang ngày trong tuần, bạn sẽ bị mất phần chênh lệch giá do giá khám của thứ 7/chủ nhật và ngày trong tuần khác nhau. Bạn có chắc chắn muốn dời lịch không?";
        }
      }

      // Show confirmation dialog before submitting
      // Only show confirmation for patient requests (not for manager/admin)
      if (!customSubmitHandler) {
        Modal.confirm({
          title: "Xác nhận dời lịch",
          icon: <ExclamationCircleOutlined />,
          content: confirmationContent,
          okText: "Xác nhận",
          cancelText: "Hủy",
          onOk: async () => {
            await submitRescheduleRequest(values, currentMode, newDateTime);
          },
        });
      } else {
        // For manager/admin, submit directly without confirmation
        await submitRescheduleRequest(values, currentMode, newDateTime);
      }
    } catch (error) {
      console.error("Error in handleSubmit:", error);
    }
  };

  const submitRescheduleRequest = async (values, currentMode, newDateTime) => {
    try {
      setLoading(true);

      const requestBody = {
        appointmentId: appointment._id,
        newDateTime: newDateTime,
        reason: values.reason,
        mode: currentMode,
      };

      // Only include clinicId if mode is offline
      if (currentMode === "offline" && values.clinicId) {
        requestBody.clinicId = values.clinicId;
      }

      // Include newDoctorId if doctor was changed (for manager)
      if (
        allowDoctorChange &&
        values.doctorId &&
        values.doctorId !==
          (appointment?.doctorId?._id || appointment?.doctorId)
      ) {
        requestBody.newDoctorId = values.doctorId;
      }

      // Include rescheduleReasonType if provided (for manager)
      if (allowDoctorChange && values.rescheduleReasonType) {
        requestBody.rescheduleReasonType = values.rescheduleReasonType;
      }

      // Use custom submit handler if provided (for manager/admin), otherwise use default patient request
      let response;
      if (customSubmitHandler) {
        response = await customSubmitHandler({
          appointmentId: appointment._id,
          newDateTime: newDateTime,
          reason: values.reason,
          mode: currentMode,
          clinicId: currentMode === "offline" ? values.clinicId : undefined,
          newDoctorId:
            allowDoctorChange &&
            values.doctorId &&
            values.doctorId !==
              (appointment?.doctorId?._id || appointment?.doctorId)
              ? values.doctorId
              : undefined,
          rescheduleReasonType: allowDoctorChange
            ? values.rescheduleReasonType
            : undefined,
        });
      } else {
        response = await api.post("/api/reschedule/request", requestBody);
      }

      if (response.success) {
        message.success(
          customSubmitHandler
            ? "Dời lịch thành công"
            : "Yêu cầu dời lịch đã được gửi thành công"
        );
        form.resetFields();
        setSelectedDate(null);
        setSelectedTimeSlot(null);
        setSelectedMode(null);
        setClinics([]);
        if (onSuccess) {
          onSuccess(response);
        }
      } else {
        message.error(response.message || "Có lỗi xảy ra khi gửi yêu cầu");
      }
    } catch (error) {
      console.error("Error requesting reschedule:", error);
      message.error("Có lỗi xảy ra khi gửi yêu cầu");
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateTime) => {
    const date = new Date(dateTime);
    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatTimeSlot = (slot) => {
    if (!slot.startTime && slot.startAt) {
      const start = new Date(slot.startAt);
      const end = slot.endAt
        ? new Date(slot.endAt)
        : new Date(start.getTime() + 30 * 60 * 1000);
      return `${start.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      })} - ${end.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    }
    return slot.timeRange || slot.startTime || "N/A";
  };

  const disabledDate = (current) => {
    if (!current) return false;
    
    // Disable dates before tomorrow and after 7 days from today
    const tomorrow = dayjs().add(1, "day").startOf("day");
    const maxDate = dayjs().add(7, "day").startOf("day"); // 7 ngày từ hôm nay
    
    // Basic date range validation
    if (current < tomorrow || current > maxDate) {
      return true;
    }
    
    // If current appointment is weekday, disable weekends (Saturday = 6, Sunday = 0)
    if (appointment?.scheduledStart) {
      const currentAppointmentDate = dayjs(appointment.scheduledStart);
      const dayOfWeek = currentAppointmentDate.day();
      
      // If current appointment is weekday (Monday-Friday: 1-5), disable weekends
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const selectedDayOfWeek = current.day();
        // Disable Saturday (6) and Sunday (0)
        if (selectedDayOfWeek === 0 || selectedDayOfWeek === 6) {
          return true;
        }
      }
    }
    
    return false;
  };

  return (
    <Modal
      title={
        <div className="reschedule-modal-title">
          <CalendarOutlined className="title-icon" />
          <span>Dời lịch hẹn</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
      className="reschedule-modal"
    >
      <div className="reschedule-modal-content">
        <div className="current-appointment-info">
          <h4>Thông tin lịch hẹn hiện tại</h4>
          <div className="appointment-details">
            <div className="detail-item">
              <span className="label">Bác sĩ:</span>
              <span className="value">
                {appointment?.doctorId?.fullName || "BS. Chưa xác định"}
              </span>
            </div>
            <div className="detail-item">
              <span className="label">Thời gian:</span>
              <span className="value">
                {appointment?.scheduledStart
                  ? formatDateTime(appointment.scheduledStart)
                  : "Chưa xác định"}
              </span>
            </div>
            <div className="detail-item">
              <span className="label">Trạng thái:</span>
              <span className={`status status-${appointment?.status}`}>
                {appointment?.status === "accepted"
                  ? "Đã xác nhận"
                  : appointment?.status === "pending_doctor"
                  ? "Chờ xác nhận"
                  : appointment?.status}
              </span>
            </div>
            <div className="detail-item">
              <span className="label">Hình thức khám:</span>
              <span className="value">
                {appointment?.mode === "online"
                  ? "Tư vấn online"
                  : appointment?.mode === "offline"
                  ? "Khám tại phòng khám"
                  : "Chưa xác định"}
              </span>
            </div>
          </div>
        </div>

        <Form
          form={form}
          onFinish={handleSubmit}
          layout="vertical"
          className="reschedule-form"
        >
          {/* Doctor Selection - Only show when allowDoctorChange is true */}
          {allowDoctorChange && (
            <>
              {/* Specialization Filter */}
              <Form.Item label="Lọc theo chuyên khoa">
                <Select
                  placeholder="Tất cả chuyên khoa"
                  style={{ width: "100%", fontFamily: "inherit" }}
                  allowClear
                  value={selectedSpecializationId}
                  onChange={(value) => {
                    setSelectedSpecializationId(value);
                    // Reset doctor selection when specialization changes
                    setSelectedDoctorId(null);
                    form.setFieldsValue({ doctorId: undefined });
                    setSelectedTimeSlot(null);
                    setAvailableTimeSlots([]);
                    setClinics([]);
                    form.setFieldsValue({ selectedTimeSlot: null });
                    form.setFieldsValue({ clinicId: undefined });
                    // Fetch doctors with new specialization filter
                    fetchDoctors(value);
                  }}
                >
                  {specializations.map((spec) => (
                    <Option
                      key={spec.id || spec._id}
                      value={spec.id || spec._id}
                    >
                      {spec.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              {/* Doctor Selection */}
              <Form.Item
                name="doctorId"
                label="Chọn bác sĩ"
                rules={[{ required: true, message: "Vui lòng chọn bác sĩ" }]}
              >
                {doctorsLoading ? (
                  <div style={{ padding: "8px 0" }}>
                    <Spin size="small" /> Đang tải danh sách bác sĩ...
                  </div>
                ) : doctors.length === 0 ? (
                  <Text type="secondary">Không có bác sĩ nào khả dụng</Text>
                ) : (
                  <Select
                    placeholder="Chọn bác sĩ"
                    style={{ width: "100%", fontFamily: "inherit" }}
                    showSearch
                    optionFilterProp="label"
                    value={selectedDoctorId}
                    onChange={(value) => {
                      setSelectedDoctorId(value);
                      form.setFieldsValue({ doctorId: value });
                      // Reset time slots and clinics when doctor changes
                      setSelectedTimeSlot(null);
                      setAvailableTimeSlots([]);
                      setClinics([]);
                      form.setFieldsValue({ selectedTimeSlot: null });
                      form.setFieldsValue({ clinicId: undefined });
                      // Fetch time slots for new doctor if date is selected
                      if (selectedDate) {
                        fetchTimeSlots(value);
                      }
                      // Fetch clinics if mode is offline
                      if (selectedMode === "offline") {
                        fetchClinics(value);
                      }
                    }}
                    filterOption={(input, option) => {
                      const label = option?.label || "";
                      return label.toLowerCase().includes(input.toLowerCase());
                    }}
                  >
                    {doctors.map((doctor) => {
                      return (
                        <Option
                          key={doctor._id}
                          value={doctor._id}
                          label={doctor.fullName}
                        >
                          <div style={{ fontFamily: "inherit" }}>
                            <div style={{ fontWeight: 500 }}>
                              {doctor.fullName}
                            </div>
                          </div>
                        </Option>
                      );
                    })}
                  </Select>
                )}
              </Form.Item>
            </>
          )}

          {/* Date Selection */}
          <Form.Item
            name="selectedDate"
            label="Chọn ngày"
            rules={[{ required: true, message: "Vui lòng chọn ngày" }]}
          >
            <DatePicker
              format="DD/MM/YYYY"
              placeholder="Chọn ngày mới"
              disabledDate={disabledDate}
              style={{ width: "100%" }}
              value={selectedDate}
              onChange={handleDateChange}
            />
          </Form.Item>

          {/* Hidden field for newDateTime - will be set when slot is selected */}
          <Form.Item
            name="newDateTime"
            hidden
            rules={[
              { required: true, message: "Vui lòng chọn khung giờ khám" },
            ]}
          >
            <Input type="hidden" />
          </Form.Item>

          {/* Time Slots Selection */}
          {selectedDate && (
            <Form.Item
              label="Chọn khung giờ khám"
              required
              help={
                !selectedTimeSlot
                  ? "Vui lòng chọn một khung giờ từ danh sách bên dưới"
                  : `Đã chọn: ${formatTimeSlot(selectedTimeSlot)}`
              }
            >
              {timeSlotsLoading ? (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <Spin />
                  <div style={{ marginTop: 8 }}>Đang tải khung giờ...</div>
                </div>
              ) : availableTimeSlots.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 20px",
                    color: "#999",
                    border: "1px dashed #d9d9d9",
                    borderRadius: "8px",
                  }}
                >
                  <CalendarOutlined style={{ fontSize: 32, marginBottom: 8 }} />
                  <div>Không có khung giờ khám vào ngày này</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    Vui lòng chọn ngày khác
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(140px, 1fr))",
                    gap: "8px",
                    marginTop: "8px",
                  }}
                >
                  {availableTimeSlots.map((slot) => {
                    // Xác định slot có bị disable không
                    // Disable nếu:
                    // - available = false
                    // - isBlocked = true (bác sĩ nghỉ)
                    // - appointmentStatus là: pending_doctor (đang chờ xác nhận), accepted (đã xác nhận), in_progress (đang khám), done (đã khám)
                    const isDisabled =
                      !slot.available ||
                      slot.isBlocked ||
                      (slot.appointmentStatus &&
                        [
                          "pending_doctor",
                          "accepted",
                          "in_progress",
                          "done",
                        ].includes(slot.appointmentStatus));

                    // Xác định tooltip text cho slot disabled
                    let disabledReason = "";
                    if (slot.isBlocked) {
                      disabledReason = "Bác sĩ nghỉ";
                    } else if (slot.appointmentStatus === "pending_doctor") {
                      disabledReason = "Đang chờ xác nhận";
                    } else if (slot.appointmentStatus === "accepted") {
                      disabledReason = "Đã xác nhận";
                    } else if (slot.appointmentStatus === "in_progress") {
                      disabledReason = "Đang khám";
                    } else if (slot.appointmentStatus === "done") {
                      disabledReason = "Đã khám";
                    }

                    return (
                      <Button
                        key={slot._id || slot.startTime}
                        type={
                          selectedTimeSlot?._id === slot._id ||
                          selectedTimeSlot?.startTime === slot.startTime
                            ? "primary"
                            : "default"
                        }
                        disabled={isDisabled}
                        onClick={() => {
                          if (!isDisabled) {
                            handleTimeSlotSelect(slot);
                          }
                        }}
                        title={isDisabled ? disabledReason : ""}
                        style={{
                          height: "auto",
                          padding: "8px 12px",
                        }}
                      >
                        {formatTimeSlot(slot)}
                      </Button>
                    );
                  })}
                </div>
              )}
            </Form.Item>
          )}

          {/* Clinic Selection - Only show when mode is offline */}
          {selectedMode === "offline" && (
            <Form.Item
              name="clinicId"
              label="Phòng khám"
              rules={[
                {
                  required: true,
                  message: "Vui lòng chọn phòng khám",
                },
              ]}
            >
              {clinicLoading ? (
                <div style={{ padding: "8px 0" }}>
                  <Spin size="small" /> Đang tải thông tin phòng khám...
                </div>
              ) : clinics.length === 0 ? (
                <Text type="secondary">Không có phòng khám nào khả dụng</Text>
              ) : clinics.length === 1 ? (
                // If only one clinic, just display it (already auto-selected)
                <div
                  style={{
                    padding: "8px 12px",
                    background: "#f5f5f5",
                    borderRadius: "6px",
                    border: "1px solid #d9d9d9",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <EnvironmentOutlined
                      style={{ marginRight: 8, color: "#1890ff" }}
                    />
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: 4 }}>
                        {clinics[0].name}
                      </div>
                      {clinics[0].address && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {clinics[0].address}
                        </Text>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                // If multiple clinics, show select dropdown
                <Select
                  placeholder="Chọn phòng khám"
                  style={{ width: "100%" }}
                  showSearch
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    (option?.children ?? "")
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                >
                  {clinics.map((clinic) => (
                    <Option key={clinic._id} value={clinic._id}>
                      <div>
                        <div>
                          <EnvironmentOutlined style={{ marginRight: 4 }} />
                          <strong>{clinic.name}</strong>
                        </div>
                        {clinic.address && (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {clinic.address}
                          </Text>
                        )}
                      </div>
                    </Option>
                  ))}
                </Select>
              )}
            </Form.Item>
          )}

          {/* Reschedule Reason Type - Only show when allowDoctorChange (manager) */}
          {allowDoctorChange && (
            <Form.Item
              name="rescheduleReasonType"
              label="Lý do dời lịch"
              rules={[
                {
                  required: true,
                  message: "Vui lòng chọn lý do dời lịch",
                },
              ]}
            >
              <Select
                placeholder="Chọn lý do dời lịch"
                style={{ width: "100%", fontFamily: "inherit" }}
              >
                <Option value="patient_request">
                  Bệnh nhân yêu cầu dời lịch
                </Option>
                <Option value="doctor_leave">Bác sĩ nghỉ</Option>
              </Select>
            </Form.Item>
          )}

          <Form.Item
            name="reason"
            label={allowDoctorChange ? "Chi tiết lý do" : "Lý do dời lịch"}
            rules={[
              { required: true, message: "Vui lòng nhập lý do dời lịch" },
              { min: 10, message: "Lý do phải có ít nhất 10 ký tự" },
              { max: 500, message: "Lý do không được quá 500 ký tự" },
            ]}
          >
            <TextArea
              rows={4}
              placeholder="Ví dụ: Có việc đột xuất, thay đổi lịch trình công việc, sức khỏe không cho phép..."
              showCount
              maxLength={500}
            />
          </Form.Item>

          <div className="form-actions">
            <Space>
              <Button onClick={onClose} disabled={loading}>
                Hủy
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                Gửi yêu cầu
              </Button>
            </Space>
          </div>
        </Form>

        <div className="reschedule-notice">
          <div className="notice-icon">ℹ️</div>
          <div className="notice-content">
            <p>
              <strong>Lưu ý:</strong>
            </p>
            <ul>
              <li>Yêu cầu dời lịch sẽ được gửi đến bác sĩ để xem xét</li>
              <li>Bác sĩ có thể chấp nhận hoặc từ chối yêu cầu</li>
              <li>Bạn sẽ nhận được thông báo về kết quả</li>
              <li>Chỉ có thể dời lịch trước 24 giờ so với thời gian hẹn</li>
            </ul>
          </div>
        </div>
      </div>
    </Modal>
  );
}
