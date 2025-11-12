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
} from "@ant-design/icons";
import NavigationBreadcrumb from "../../../components/Breadcrumb/NavigationBreadcrumb";
import { api } from "../../../lib/api";
import "./DatLichNhieuChuyenKhoa.css";

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;
const { RangePicker } = DatePicker;

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
  const handleOpenDoctorModal = (spec) => {
    setCurrentSpecialization(spec);
    setSelectedDoctor(null);
    setSelectedSlot(null);
    setShowDoctorModal(true);
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
        setAvailableDoctors(doctors);
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

  // Fetch time slots for selected doctor
  const handleDoctorSelect = async (doctor) => {
    setSelectedDoctor(doctor);
    setSelectedSlot(null);

    try {
      setLoadingSlots(true);
      const response = await api.get(
        `/api/patients/doctors/${doctor._id}/time-slots?date=${visitDate}`
      );

      console.log("Time slots response:", response);

      if (response?.success || response?.data?.success) {
        const slots = response?.data?.timeSlots || response?.timeSlots || [];
        // Update doctor object with slots (include original slot data for saving)
        setAvailableDoctors((prev) =>
          prev.map((d) =>
            d._id === doctor._id
              ? {
                  ...d,
                  availableSlots: slots.map((slot) => ({
                    ...slot,
                    _id: slot._id,
                    startAt: slot.startAt || slot.startAt,
                    endAt: slot.endAt || slot.endAt,
                  })),
                }
              : d
          )
        );
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

    // Check for conflicts with existing local appointments
    const hasConflict = appointments.some((apt) => {
      const aptStart = new Date(apt.scheduledStart);
      const aptEnd = new Date(apt.scheduledEnd);
      const newStart = new Date(selectedSlot.startAt);
      const newEnd = new Date(selectedSlot.endAt);

      return (
        (newStart >= aptStart && newStart < aptEnd) ||
        (newEnd > aptStart && newEnd <= aptEnd) ||
        (newStart <= aptStart && newEnd >= aptEnd)
      );
    });

    // Create local appointment object
    const newAppointment = {
      _id: `temp-${Date.now()}`, // Temporary ID
      doctor: {
        _id: selectedDoctor._id,
        fullName: selectedDoctor.fullName,
        specializationIds: selectedDoctor.specializationIds || [],
        avatarUrl: selectedDoctor.avatarUrl,
        ratingAvg: selectedDoctor.ratingAvg,
        ratingCount: selectedDoctor.ratingCount,
      },
      scheduledStart: selectedSlot.startAt,
      scheduledEnd: selectedSlot.endAt,
      status: "draft", // Not saved yet
      mode: selectedMode,
      reason: `Khám ${currentSpecialization.name}`,
      // Store original data for saving later
      _tempData: {
        doctorId: selectedDoctor._id,
        slotId: selectedSlot._id,
        mode: selectedMode,
        clinicId: selectedMode === "offline" ? undefined : undefined, // Will be required for offline
        reason: `Khám ${currentSpecialization.name}`,
      },
      // Store slot reference for display
      slotId: selectedSlot._id,
    };

    // Add to local appointments
    setAppointments([...appointments, newAppointment]);
    message.success(
      hasConflict
        ? "Đã thêm lịch hẹn (có xung đột thời gian)"
        : "Đã thêm lịch hẹn"
    );

    setShowDoctorModal(false);
    setSelectedDoctor(null);
    setSelectedSlot(null);
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
                    specAppointments.map((apt) => (
                      <Card
                        key={apt._id}
                        size="small"
                        style={{ marginBottom: 8 }}
                        actions={
                          visitStatus === "draft"
                            ? [
                                <Button
                                  size="small"
                                  danger
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
                                </Button>,
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
          title={`Chọn bác sĩ và khung giờ - ${currentSpecialization?.name}`}
          open={showDoctorModal}
          onCancel={() => {
            setShowDoctorModal(false);
            setSelectedDoctor(null);
            setSelectedSlot(null);
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
                    {availableDoctors.map((doctor) => (
                      <Col xs={24} sm={12} md={8} key={doctor._id}>
                        <Card
                          hoverable
                          onClick={() => handleDoctorSelect(doctor)}
                          style={{ cursor: "pointer" }}
                        >
                          <Space direction="vertical" style={{ width: "100%" }}>
                            <Avatar
                              size={64}
                              src={doctor.avatarUrl}
                              icon={<UserOutlined />}
                            />
                            <Text strong>{doctor.fullName}</Text>
                            <Rate
                              disabled
                              defaultValue={doctor.ratingAvg}
                              allowHalf
                            />
                            <Text type="secondary">
                              {doctor.yearsExperience} năm kinh nghiệm
                            </Text>
                          </Space>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </div>
              ) : (
                <>
                  {/* Selected Doctor Info */}
                  <Card size="small" style={{ marginBottom: 16 }}>
                    <Space>
                      <Avatar
                        src={selectedDoctor.avatarUrl}
                        icon={<UserOutlined />}
                      />
                      <div>
                        <Text strong>{selectedDoctor.fullName}</Text>
                        <br />
                        <Rate
                          disabled
                          defaultValue={selectedDoctor.ratingAvg}
                          allowHalf
                        />
                      </div>
                      <Button
                        size="small"
                        onClick={() => {
                          setSelectedDoctor(null);
                          setSelectedSlot(null);
                        }}
                      >
                        Chọn lại
                      </Button>
                    </Space>
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

                  {/* Time Slot Selection */}
                  <Divider />
                  <Title level={5}>Chọn khung giờ</Title>
                  {loadingSlots ? (
                    <Spin />
                  ) : selectedDoctor.availableSlots?.length > 0 ? (
                    <Row gutter={[8, 8]}>
                      {selectedDoctor.availableSlots.map((slot) => (
                        <Col xs={12} sm={8} md={6} key={slot._id}>
                          <Button
                            type={
                              selectedSlot?._id === slot._id
                                ? "primary"
                                : "default"
                            }
                            block
                            onClick={() => setSelectedSlot(slot)}
                          >
                            {slot.timeRange ||
                              `${slot.startTime} - ${slot.endTime}`}
                          </Button>
                        </Col>
                      ))}
                    </Row>
                  ) : (
                    <Empty description="Không có khung giờ trống" />
                  )}

                  {/* Confirm Button */}
                  <div style={{ marginTop: 24, textAlign: "right" }}>
                    <Space>
                      <Button
                        onClick={() => {
                          setShowDoctorModal(false);
                          setSelectedDoctor(null);
                          setSelectedSlot(null);
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
                        Xác nhận
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
