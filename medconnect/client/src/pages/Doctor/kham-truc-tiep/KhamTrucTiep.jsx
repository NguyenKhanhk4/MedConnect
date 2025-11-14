import { useState, useEffect, Fragment } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getDoctorAppointmentsWithFallback } from "../../../lib/api";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { CustomAlert } from "../../../components/ui/CustomAlert";
import "./KhamTrucTiep.scss";

export default function KhamTrucTiep() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("basic");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [serviceSearch, setServiceSearch] = useState({});
  const [openModal, setOpenModal] = useState(null); // null hoặc index của dịch vụ đang mở modal
  const [clinicalServices, setClinicalServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [formData, setFormData] = useState({
    reasonForVisit: "",
    visitDate: new Date().toISOString().split("T")[0],
    consultationCategory: "examination",
    diagnoses: [{ name: "" }],
    vitals: {
      height: "",
      weight: "",
      bloodPressure: "",
      heartRate: "",
      temperature: "",
    },
    labResults: [{ testName: "", result: "" }],
    imagingResults: [],
    medications: [{ name: "", instruction: "", quantity: "", notes: "" }],
    procedures: [],
    summaryText: "",
    treatmentMethod: "",
    nextAppointmentDate: "",
    followUpInstructions: "",
  });
  const [alertMessage, setAlertMessage] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState(null);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isAIVerified, setIsAIVerified] = useState(false);
  const [aiSuggested, setAiSuggested] = useState(false);

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

  // Hàm gọi AI để gợi ý điều trị
  const handleAISuggestTreatment = async () => {
    // Kiểm tra có chẩn đoán chưa
    const validDiagnoses = formData.diagnoses.filter(
      (d) => d.name && d.name.trim()
    );
    if (validDiagnoses.length === 0) {
      showAlert(
        "Vui lòng nhập ít nhất một chẩn đoán trước khi yêu cầu AI gợi ý!"
      );
      return;
    }

    setIsLoadingAI(true);
    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:3000"
        }/api/ai/suggest-treatment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            appointmentId: appointmentId,
            diagnoses: validDiagnoses,
            existingMedications: formData.medications.filter(
              (m) => m.name && m.name.trim()
            ),
            context: {
              vitals: formData.vitals,
              labResults: formData.labResults.filter(
                (l) => l.testName || l.result
              ),
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Không thể lấy gợi ý từ AI");
      }

      const data = await response.json();
      if (data.success && data.data?.suggestion) {
        const suggestion = data.data.suggestion;
        setAiSuggestion(suggestion);
        setIsAIVerified(false); // Reset verify khi có gợi ý mới
        setAiSuggested(true);

        // Tự động điền vào form (bác sĩ có thể chỉnh sửa)
        setFormData({
          ...formData,
          treatmentMethod: suggestion.treatmentMethod || "",
          medications:
            suggestion.suggestedMedications &&
            suggestion.suggestedMedications.length > 0
              ? suggestion.suggestedMedications
              : formData.medications,
          followUpInstructions:
            suggestion.followUpInstructions || formData.followUpInstructions,
        });

        // Chuyển sang tab summary để bác sĩ xem
        setActiveTab("summary");

        showAlert(
          "AI đã đưa ra gợi ý điều trị. Vui lòng xem xét và verify trước khi lưu!"
        );
      }
    } catch (error) {
      console.error("Error getting AI suggestion:", error);
      showAlert("Có lỗi xảy ra: " + error.message);
    } finally {
      setIsLoadingAI(false);
    }
  };

  // Hàm verify gợi ý từ AI
  const handleVerifyAI = () => {
    setIsAIVerified(true);
    showAlert(
      "Bạn đã xác nhận đã xem xét gợi ý từ AI. Có thể tiếp tục lưu hồ sơ."
    );
  };

  // Fetch danh sách dịch vụ cận lâm sàng từ database
  useEffect(() => {
    const fetchClinicalServices = async () => {
      try {
        setLoadingServices(true);
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/service-prices/active`,
          {
            method: "GET",
            credentials: "include",
          }
        );

        if (response.ok) {
          const data = await response.json();
          
          if (data.success && data.data?.servicePrices) {
            // Lấy danh sách tên dịch vụ từ servicePrices
            const serviceNames = data.data.servicePrices.map(
              (service) => service.serviceName
            );
            setClinicalServices(serviceNames);
          } else {
            console.warn("⚠️ No servicePrices in response:", data);
            setClinicalServices([]);
          }
        } else {
          const errorText = await response.text();
          console.error("❌ Failed to fetch clinical services:", response.status, errorText);
          setClinicalServices([]);
        }
      } catch (error) {
        console.error("❌ Error fetching clinical services:", error);
        setClinicalServices([]);
      } finally {
        setLoadingServices(false);
      }
    };

    fetchClinicalServices();
  }, []);


  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        const response = await getDoctorAppointmentsWithFallback();

        if (response.success && response.data?.appointments) {
          const found = response.data.appointments.find(
            (apt) => apt._id === appointmentId
          );
          if (found) {
            setAppointment(found);
            setFormData((prev) => ({
              ...prev,
              reasonForVisit: found?.reason || found?.notes || "",
              visitDate: found?.scheduledStart
                ? new Date(found.scheduledStart).toISOString().split("T")[0]
                : new Date().toISOString().split("T")[0],
            }));
          } else {
            showAlert("Không tìm thấy lịch hẹn");
            setTimeout(() => navigate("/bac-si/lich-hen"), 1000);
          }
        }
      } catch (error) {
        console.error("Error fetching appointment:", error);
        showAlert("Có lỗi xảy ra khi tải dữ liệu");
        setTimeout(() => navigate("/bac-si/lich-hen"), 1000);
      } finally {
        setLoading(false);
      }
    };

    if (appointmentId) {
      fetchAppointment();
    }
  }, [appointmentId, navigate]);

  const handleFieldChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleVitalChange = (field, value) => {
    setFormData({
      ...formData,
      vitals: {
        ...formData.vitals,
        [field]: value,
      },
    });
  };

  const handleArrayChange = (arrayName, index, field, value) => {
    const newArray = [...formData[arrayName]];
    newArray[index][field] = value;
    setFormData({ ...formData, [arrayName]: newArray });
  };

  const addArrayItem = (arrayName, template) => {
    setFormData({
      ...formData,
      [arrayName]: [...formData[arrayName], template],
    });
  };

  const removeArrayItem = (arrayName, index) => {
    if (arrayName === "diagnoses" && formData[arrayName].length === 1) {
      return; // Không cho phép xóa chẩn đoán cuối cùng
    }
    setFormData({
      ...formData,
      [arrayName]: formData[arrayName].filter((_, i) => i !== index),
    });
  };

  const handleFileUpload = async (e, index) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    if (!allowedTypes.includes(file.type)) {
      showAlert("Chỉ được upload file ảnh (JPG, PNG, WebP) hoặc PDF!");
      e.target.value = "";
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      showAlert("Kích thước file không được vượt quá 10MB!");
      e.target.value = "";
      return;
    }

    setUploadingFile(true);
    try {
      const formDataObj = new FormData();
      formDataObj.append("file", file);

      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:3000"
        }/api/doctors/me/upload-consultation-file`,
        {
          method: "POST",
          credentials: "include",
          body: formDataObj,
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.url) {
          const newImagingResults = [...formData.imagingResults];
          newImagingResults[index].imageUrl = data.data.url;
          newImagingResults[index].fileName = file.name;
          newImagingResults[index].fileSize = file.size;
          newImagingResults[index].fileType = file.type;
          setFormData({ ...formData, imagingResults: newImagingResults });
          showAlert("Tải file lên thành công!");
        } else {
          showAlert("Có lỗi xảy ra khi lưu file");
        }
      } else {
        const errorData = await response.json();
        showAlert(
          `Lỗi upload: ${errorData.message || "Không thể upload file"}`
        );
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      showAlert("Có lỗi xảy ra khi upload file");
    } finally {
      setUploadingFile(false);
      e.target.value = "";
    }
  };

  const handleRemoveFile = (index) => {
    const newImagingResults = [...formData.imagingResults];
    newImagingResults[index].imageUrl = "";
    newImagingResults[index].fileName = "";
    newImagingResults[index].fileSize = "";
    newImagingResults[index].fileType = "";
    setFormData({ ...formData, imagingResults: newImagingResults });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const patientName =
      appointment?.patientId?.fullName ||
      appointment?.patient?.fullName ||
      appointment?.patientName ||
      "bệnh nhân";

    // Kiểm tra chẩn đoán bắt buộc
    const validDiagnoses = formData.diagnoses.filter(
      (d) => d.name && d.name.trim()
    );
    if (validDiagnoses.length === 0) {
      showAlert("Vui lòng nhập ít nhất một chẩn đoán!");
      return;
    }

    // Kiểm tra tóm tắt buổi khám bắt buộc
    if (!formData.summaryText || !formData.summaryText.trim()) {
      showAlert("Vui lòng nhập tóm tắt buổi khám!");
      return;
    }

    // Kiểm tra phương pháp điều trị bắt buộc
    if (!formData.treatmentMethod || !formData.treatmentMethod.trim()) {
      showAlert("Vui lòng nhập phương pháp điều trị!");
      return;
    }

    // Kiểm tra hướng dẫn theo dõi bắt buộc
    if (
      !formData.followUpInstructions ||
      !formData.followUpInstructions.trim()
    ) {
      showAlert("Vui lòng nhập hướng dẫn theo dõi!");
      return;
    }

    // Kiểm tra nếu có AI suggestion nhưng chưa verify
    if (aiSuggestion && !isAIVerified) {
      showAlert(
        "Vui lòng xác nhận đã xem xét gợi ý từ AI trước khi lưu hồ sơ!"
      );
      return;
    }

    // Thêm thông báo xác nhận
    const confirmMessage = aiSuggested
      ? `Bạn có chắc chắn muốn lưu hồ sơ cho ${patientName}? (Đã sử dụng gợi ý từ AI)`
      : `Bạn có chắc chắn muốn lưu hồ sơ cho ${patientName}?`;

    showConfirm(confirmMessage, async () => {
      const submitData = {
        appointmentId: appointment._id,
        summaryText: formData.summaryText,
        reasonForVisit: formData.reasonForVisit,
        visitDate: formData.visitDate
          ? new Date(formData.visitDate)
          : undefined,
        consultationCategory: formData.consultationCategory,
        diagnoses: validDiagnoses,
        vitals: formData.vitals,
        labResults: formData.labResults.filter((l) => l.testName || l.result),
        imagingResults: formData.imagingResults
          .filter((img) => img.imageUrl)
          .map((img) => ({
            type: img.type || "",
            conclusion: img.conclusion || "",
            imageUrl: img.imageUrl || "",
            performedAt: new Date(),
          })),
        medications: formData.medications.filter((m) => m.name),
        procedures: formData.procedures,
        treatmentMethod: formData.treatmentMethod,
        nextAppointmentDate: formData.nextAppointmentDate
          ? new Date(formData.nextAppointmentDate)
          : undefined,
        followUpInstructions: formData.followUpInstructions,
      };

      try {
        const response = await fetch(
          `${
            import.meta.env.VITE_API_URL || "http://localhost:3000"
          }/api/doctors/me/consultation-summaries`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify(submitData),
          }
        );

        if (!response.ok) {
          let errorMessage = "Failed to submit consultation";
          try {
            const error = await response.json();
            errorMessage = error.message || errorMessage;
          } catch (e) {
            errorMessage = `Server error: ${response.status}`;
          }
          throw new Error(errorMessage);
        }

        // Offline: KHÔNG update status thành "done" sau khi lưu hồ sơ
        // Status chỉ chuyển thành "done" sau khi thanh toán dịch vụ thành công (trong webhook)

        // End video call if it exists
        try {
          const VideoCallAPI = await import("../../../services/videoCallAPI");
          await VideoCallAPI.default.endCallByAppointmentId(appointmentId);
        } catch (videoCallError) {
          console.warn(
            "⚠️ KhamTrucTiep - Could not end video call:",
            videoCallError.message
          );
          console.error("⚠️ KhamTrucTiep - Full error:", videoCallError);
          // Don't fail the whole process if video call ending fails
        }

        showAlert(
          "Đã lưu hồ sơ thành công! Bạn có thể ghi hóa đơn dịch vụ cho bệnh nhân."
        );
        setTimeout(() => navigate("/bac-si/lich-hen"), 1000);
      } catch (error) {
        console.error("Error submitting consultation:", error);
        showAlert("Có lỗi xảy ra: " + error.message);
      }
    });
  };

  if (loading) {
    return (
      <div className="offline-consultation-page-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return null;
  }

  return (
    <div className="offline-consultation-page-container">
      <div className="offline-consultation-page-content">
        <div className="consultation-page-header">
          <div className="header-content" style={{ flex: 1 }}>
            <h1>Hoàn thành khám bệnh trực tiếp</h1>
            <div style={{ marginTop: "12px", marginLeft: "-20px" }}>
              <p style={{ 
                margin: 0, 
                fontSize: "14px", 
                color: "#fff",
                marginBottom: "4px"
              }}>
                Bệnh nhân:
              </p>
              <p style={{ 
                margin: 0, 
                fontSize: "24px", 
                fontWeight: "600",
                color: "#fff"
              }}>
                {appointment?.patientId?.fullName ||
                  appointment?.patient?.fullName ||
                  appointment?.patientName ||
                  "Không có"}
              </p>
            </div>
          </div>
        </div>

        <div className="consultation-form-wrapper">
          <div className="form-tabs">
            <button
              type="button"
              className={`tab-btn ${activeTab === "basic" ? "active" : ""}`}
              onClick={() => setActiveTab("basic")}
            >
              📋 Thông tin cơ bản
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === "diagnosis" ? "active" : ""}`}
              onClick={() => setActiveTab("diagnosis")}
            >
              🔍 Chẩn đoán
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === "tests" ? "active" : ""}`}
              onClick={() => setActiveTab("tests")}
            >
              🧪 Dịch vụ cận lâm sàng
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === "treatment" ? "active" : ""}`}
              onClick={() => setActiveTab("treatment")}
            >
              💊 Đơn Thuốc
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === "summary" ? "active" : ""}`}
              onClick={() => setActiveTab("summary")}
            >
              📝 Tóm tắt
            </button>
          </div>

          <form onSubmit={handleSubmit} className="consultation-form-content">
            {/* Basic Info Tab */}
            {activeTab === "basic" && (
              <div className="form-section">
                <div className="section-row">
                  <div className="form-group">
                    <label>Lý do khám *</label>
                    <Input
                      type="text"
                      value={formData.reasonForVisit}
                      onChange={(e) =>
                        handleFieldChange("reasonForVisit", e.target.value)
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Ngày khám *</label>
                    <Input
                      type="date"
                      value={formData.visitDate}
                      onChange={(e) =>
                        handleFieldChange("visitDate", e.target.value)
                      }
                      required
                    />
                  </div>
                </div>
                
                {/* Vitals Section - Gộp vào tab Thông tin cơ bản */}
                <h3 className="section-title" style={{ marginTop: "2rem" }}>📊 Chỉ số Sinh Học</h3>
                <div className="vitals-grid">
                  <div className="form-group">
                    <label>Chiều cao (cm)</label>
                    <Input
                      type="number"
                      placeholder="VD: 170"
                      value={formData.vitals.height}
                      onChange={(e) =>
                        handleVitalChange("height", e.target.value)
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Cân nặng (kg)</label>
                    <Input
                      type="number"
                      placeholder="VD: 70"
                      value={formData.vitals.weight}
                      onChange={(e) =>
                        handleVitalChange("weight", e.target.value)
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Huyết áp (mmHg)</label>
                    <Input
                      type="text"
                      placeholder="VD: 120/80"
                      value={formData.vitals.bloodPressure}
                      onChange={(e) =>
                        handleVitalChange("bloodPressure", e.target.value)
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Nhịp tim (bpm)</label>
                    <Input
                      type="number"
                      placeholder="VD: 72"
                      value={formData.vitals.heartRate}
                      onChange={(e) =>
                        handleVitalChange("heartRate", e.target.value)
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Nhiệt độ (°C)</label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="VD: 36.5"
                      value={formData.vitals.temperature}
                      onChange={(e) =>
                        handleVitalChange("temperature", e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Diagnosis Tab */}
            {activeTab === "diagnosis" && (
              <div className="form-section">
                <div className="section-title-wrapper">
                  <h3 className="section-title">🔍 Chẩn Đoán Sơ Bộ *</h3>
                  <Button
                    type="button"
                    onClick={handleAISuggestTreatment}
                    disabled={
                      isLoadingAI ||
                      formData.diagnoses.filter((d) => d.name && d.name.trim())
                        .length === 0
                    }
                    className="btn-ai-suggest"
                    style={{
                      marginLeft: "auto",
                      backgroundColor: "#1890ff",
                      color: "white",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: "4px",
                      cursor: isLoadingAI ? "not-allowed" : "pointer",
                      opacity: isLoadingAI ? 0.6 : 1,
                    }}
                  >
                    {isLoadingAI ? "⏳ Đang xử lý..." : "🤖 AI gợi ý điều trị"}
                  </Button>
                </div>
                {formData.diagnoses.map((diagnosis, index) => (
                  <div key={index} className="array-item">
                    <div className="item-header">
                      <span className="item-number">Chẩn đoán</span>
                      {formData.diagnoses.length > 1 && (
                        <button
                          type="button"
                          className="btn-remove"
                          onClick={() => removeArrayItem("diagnoses", index)}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <div className="item-content">
                      <div className="form-group">
                        <Input
                          type="text"
                          placeholder="VD: Viêm phế quản cấp"
                          value={diagnosis.name}
                          onChange={(e) =>
                            handleArrayChange(
                              "diagnoses",
                              index,
                              "name",
                              e.target.value
                            )
                          }
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {/* Hiển thị gợi ý từ AI */}
                {aiSuggestion && (
                  <div
                    className="ai-suggestion-box"
                    style={{
                      marginTop: "20px",
                      padding: "16px",
                      backgroundColor: "#fff7e6",
                      border: "2px solid #ffc53d",
                      borderRadius: "8px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "12px",
                      }}
                    >
                      <h4 style={{ margin: 0, color: "#d46b08" }}>
                        ⚠️ Gợi ý từ AI - Cần xác nhận
                      </h4>
                      {!isAIVerified && (
                        <Button
                          type="button"
                          onClick={handleVerifyAI}
                          style={{
                            backgroundColor: "#52c41a",
                            color: "white",
                            border: "none",
                            padding: "6px 12px",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                        >
                          ✓ Đã xem xét
                        </Button>
                      )}
                      {isAIVerified && (
                        <span style={{ color: "#52c41a", fontWeight: "bold" }}>
                          ✓ Đã verify
                        </span>
                      )}
                    </div>

                    {aiSuggestion.treatmentMethod && (
                      <div style={{ marginBottom: "12px" }}>
                        <strong>Phương pháp điều trị:</strong>
                        <p style={{ margin: "8px 0", whiteSpace: "pre-wrap" }}>
                          {aiSuggestion.treatmentMethod}
                        </p>
                      </div>
                    )}

                    {aiSuggestion.suggestedMedications &&
                      aiSuggestion.suggestedMedications.length > 0 && (
                        <div style={{ marginBottom: "12px" }}>
                          <strong>Gợi ý thuốc:</strong>
                          <ul style={{ margin: "8px 0", paddingLeft: "20px" }}>
                            {aiSuggestion.suggestedMedications.map(
                              (med, idx) => (
                                <li key={idx}>
                                  {med.name} - {med.quantity || ""} -{" "}
                                  {med.instruction || ""}
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}

                    {aiSuggestion.followUpInstructions && (
                      <div style={{ marginBottom: "12px" }}>
                        <strong>Hướng dẫn theo dõi:</strong>
                        <p style={{ margin: "8px 0", whiteSpace: "pre-wrap" }}>
                          {aiSuggestion.followUpInstructions}
                        </p>
                      </div>
                    )}

                    <div
                      style={{
                        marginTop: "12px",
                        padding: "8px",
                        backgroundColor: "#fff1f0",
                        border: "1px solid #ffccc7",
                        borderRadius: "4px",
                        fontSize: "13px",
                        color: "#cf1322",
                      }}
                    >
                      <strong>⚠️ Lưu ý:</strong> Đây chỉ là gợi ý từ AI. Bác sĩ
                      PHẢI xem xét, chỉnh sửa và xác nhận trước khi lưu hồ sơ.
                    </div>
                  </div>
                )}

                <h3 className="section-title" style={{ marginTop: "2rem" }}>
                  Hình ảnh chẩn đoán (nếu có)
                </h3>
                {formData.imagingResults.map((imaging, index) => (
                  <div key={index} className="array-item">
                    <div className="item-header">
                      <span className="item-number">Hình ảnh #{index + 1}</span>
                      {formData.imagingResults.length > 1 && (
                        <button
                          type="button"
                          className="btn-remove"
                          onClick={() =>
                            removeArrayItem("imagingResults", index)
                          }
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <div className="item-content">
                      <div className="form-group">
                        <label>Loại hình ảnh</label>
                        <Input
                          type="text"
                          placeholder="VD: X-ray, CT, MRI..."
                          value={imaging.type}
                          onChange={(e) =>
                            handleArrayChange(
                              "imagingResults",
                              index,
                              "type",
                              e.target.value
                            )
                          }
                        />
                      </div>
                      <div className="form-group">
                        <label>Kết luận</label>
                        <Input
                          type="text"
                          placeholder="VD: Không thấy tổn thương..."
                          value={imaging.conclusion}
                          onChange={(e) =>
                            handleArrayChange(
                              "imagingResults",
                              index,
                              "conclusion",
                              e.target.value
                            )
                          }
                        />
                      </div>
                      <div className="form-group">
                        <label>File ảnh</label>
                        <div className="file-upload-group">
                          <input
                            type="file"
                            id={`imaging-file-${index}`}
                            accept=".jpg,.jpeg,.png,.pdf,.webp"
                            onChange={(e) => handleFileUpload(e, index)}
                            disabled={uploadingFile}
                            className="file-input"
                          />
                          <label
                            htmlFor={`imaging-file-${index}`}
                            className="file-upload-label"
                          >
                            <i className="bi bi-cloud-upload"></i>
                            <span>
                              {imaging.imageUrl
                                ? "✓ File đã được chọn"
                                : uploadingFile
                                ? "Đang tải lên..."
                                : "Chọn file hình ảnh (JPG, PNG, WebP, PDF - Tối đa 10MB)"}
                            </span>
                          </label>
                        </div>

                        {/* Hiển thị file đã upload */}
                        {imaging.imageUrl && (
                          <div className="uploaded-file-preview">
                            <div className="file-info">
                              <div className="file-details">
                                <i className="bi bi-file-earmark-image"></i>
                                <div className="file-text">
                                  <div className="file-name">
                                    {imaging.fileName || "File đã upload"}
                                  </div>
                                  <div className="file-size">
                                    {imaging.fileSize
                                      ? `${(
                                          imaging.fileSize /
                                          1024 /
                                          1024
                                        ).toFixed(2)} MB`
                                      : ""}
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                className="btn-remove-file"
                                onClick={() => handleRemoveFile(index)}
                                title="Xóa file"
                              >
                                <i className="bi bi-x-circle"></i>
                              </button>
                            </div>

                            {/* Hiển thị preview hình ảnh */}
                            {imaging.fileType &&
                              imaging.fileType.startsWith("image/") && (
                                <div className="image-preview">
                                  <img
                                    src={`${
                                      import.meta.env.VITE_API_URL ||
                                      "http://localhost:3000"
                                    }${imaging.imageUrl}`}
                                    alt="Preview"
                                    onError={(e) => {
                                      e.target.style.display = "none";
                                      e.target.nextSibling.style.display =
                                        "block";
                                    }}
                                  />
                                  <div
                                    className="image-error"
                                    style={{ display: "none" }}
                                  >
                                    <i className="bi bi-image"></i>
                                    <span>Không thể hiển thị hình ảnh</span>
                                  </div>
                                </div>
                              )}

                            {/* Hiển thị PDF icon */}
                            {imaging.fileType &&
                              imaging.fileType === "application/pdf" && (
                                <div className="pdf-preview">
                                  <i className="bi bi-file-earmark-pdf"></i>
                                  <span>File PDF</span>
                                </div>
                              )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  onClick={() =>
                    addArrayItem("imagingResults", {
                      type: "",
                      conclusion: "",
                      imageUrl: "",
                      fileName: "",
                      fileSize: "",
                      fileType: "",
                    })
                  }
                  className="btn-add"
                >
                  + Thêm hình ảnh
                </Button>
              </div>
            )}

            {/* Treatment Tab */}
            {activeTab === "treatment" && (
              <div className="form-section">
                <h3 className="section-title">💊 Đơn Thuốc</h3>
                {formData.medications.map((medication, index) => (
                  <div key={index} className="array-item">
                    <div className="item-header">
                      <span className="item-number">Thuốc #{index + 1}</span>
                      {formData.medications.length > 1 && (
                        <button
                          type="button"
                          className="btn-remove"
                          onClick={() => removeArrayItem("medications", index)}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <div className="item-content">
                      <div className="form-group">
                        <label>Tên thuốc *</label>
                        <Input
                          type="text"
                          placeholder="VD: Paracetamol"
                          value={medication.name}
                          onChange={(e) =>
                            handleArrayChange(
                              "medications",
                              index,
                              "name",
                              e.target.value
                            )
                          }
                        />
                      </div>
                      <div className="form-group">
                        <label>Số lượng</label>
                        <Input
                          type="text"
                          placeholder="VD: 30 viên"
                          value={medication.quantity}
                          onChange={(e) =>
                            handleArrayChange(
                              "medications",
                              index,
                              "quantity",
                              e.target.value
                            )
                          }
                        />
                      </div>
                      <div className="form-group">
                        <label>Liều dùng</label>
                        <Input
                          type="text"
                          placeholder="VD: Uống 2 viên/lần, 2 lần/ngày..."
                          value={medication.instruction}
                          onChange={(e) =>
                            handleArrayChange(
                              "medications",
                              index,
                              "instruction",
                              e.target.value
                            )
                          }
                        />
                      </div>
                      <div className="form-group">
                        <label>Ghi chú</label>
                        <Input
                          type="text"
                          placeholder="VD: Uống sau khi ăn, tránh ánh sáng..."
                          value={medication.notes}
                          onChange={(e) =>
                            handleArrayChange(
                              "medications",
                              index,
                              "notes",
                              e.target.value
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  onClick={() =>
                    addArrayItem("medications", {
                      name: "",
                      instruction: "",
                      quantity: "",
                      notes: "",
                    })
                  }
                  className="btn-add"
                >
                  + Thêm thuốc
                </Button>
              </div>
            )}

            {/* Tests Tab */}
            {activeTab === "tests" && (
              <div className="form-section">
                <h3 className="section-title">🧪 Dịch vụ cận lâm sàng</h3>
                {formData.labResults.length === 0 && (
                  <p className="no-data">Chưa có dịch vụ cận lâm sàng nào</p>
                )}
                {formData.labResults.map((lab, index) => {
                  // Tính toán filteredServices trước khi render
                  const searchTerm = (serviceSearch[index] || "").toLowerCase();
                  const filteredServices = clinicalServices.filter((service) => {
                    return (
                      searchTerm === "" ||
                      service.toLowerCase().includes(searchTerm)
                    );
                  });
                  
                  return (
                  <div key={index} className="array-item">
                    <div className="item-header">
                      <span className="item-number">
                        Dịch vụ cận lâm sàng #{index + 1}
                      </span>
                      {formData.labResults.length > 1 && (
                        <button
                          type="button"
                          className="btn-remove"
                          onClick={() => removeArrayItem("labResults", index)}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <div className="item-content" style={{ position: "relative", zIndex: 1, overflow: "visible" }}>
                      <div className="form-group">
                        <label>Chọn dịch vụ cận lâm sàng</label>
                        <div
                          onClick={() => {
                            setOpenModal(index);
                            setServiceSearch({
                              ...serviceSearch,
                              [index]: "",
                            });
                          }}
                          style={{
                            padding: "8px 12px",
                            border: "1px solid #d9d9d9",
                            borderRadius: "4px",
                            cursor: "pointer",
                            backgroundColor: "#fff",
                            minHeight: "32px",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          {lab.testName || "-- Chọn dịch vụ --"}
                          <span style={{ marginLeft: "auto" }}>▼</span>
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Kết quả</label>
                        <Input
                          type="text"
                          value={lab.result}
                          onChange={(e) =>
                            handleArrayChange(
                              "labResults",
                              index,
                              "result",
                              e.target.value
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                  );
                })}
                <Button
                  type="button"
                  onClick={() =>
                    addArrayItem("labResults", { testName: "", result: "" })
                  }
                  className="btn-add"
                >
                  + Thêm dịch vụ cận lâm sàng
                </Button>
              </div>
            )}

            {/* Summary Tab */}
            {activeTab === "summary" && (
              <div className="form-section">
                <h3 className="section-title">📝 Tóm Tắt Khám Bệnh</h3>
                <div className="form-group">
                  <label>Tóm tắt buổi khám *</label>
                  <textarea
                    className="form-textarea"
                    rows="6"
                    value={formData.summaryText}
                    onChange={(e) =>
                      handleFieldChange("summaryText", e.target.value)
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Phương pháp điều trị *</label>
                  <textarea
                    className="form-textarea"
                    rows="4"
                    value={formData.treatmentMethod}
                    onChange={(e) =>
                      handleFieldChange("treatmentMethod", e.target.value)
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Hướng dẫn theo dõi *</label>
                  <textarea
                    className="form-textarea"
                    rows="4"
                    value={formData.followUpInstructions}
                    onChange={(e) =>
                      handleFieldChange("followUpInstructions", e.target.value)
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Ngày tái khám</label>
                  <Input
                    type="date"
                    value={formData.nextAppointmentDate}
                    onChange={(e) =>
                      handleFieldChange("nextAppointmentDate", e.target.value)
                    }
                  />
                </div>
              </div>
            )}

            <div className="form-actions">
              <Button
                type="button"
                onClick={() => navigate("/bac-si/lich-hen")}
                variant="outline"
              >
                Hủy
              </Button>
              <Button type="submit" className="btn-submit">
                Xác nhận & Lưu
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal chọn dịch vụ cận lâm sàng */}
      {openModal !== null && (() => {
        const currentIndex = openModal;
        const searchTerm = (serviceSearch[currentIndex] || "").toLowerCase();
        const filteredServices = clinicalServices.filter((service) => {
          return (
            searchTerm === "" ||
            service.toLowerCase().includes(searchTerm)
          );
        });
        const currentLab = formData.labResults[currentIndex];

        return (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              zIndex: 10000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
            }}
            onClick={() => {
              setOpenModal(null);
              setServiceSearch({
                ...serviceSearch,
                [currentIndex]: "",
              });
            }}
          >
            <div
              style={{
                backgroundColor: "#fff",
                borderRadius: "8px",
                width: "100%",
                maxWidth: "600px",
                maxHeight: "80vh",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid #e8e8e8",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "600" }}>
                  Chọn dịch vụ cận lâm sàng
                </h3>
                <button
                  onClick={() => {
                    setOpenModal(null);
                    setServiceSearch({
                      ...serviceSearch,
                      [currentIndex]: "",
                    });
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: "24px",
                    cursor: "pointer",
                    color: "#999",
                    padding: 0,
                    width: "30px",
                    height: "30px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  ×
                </button>
              </div>

              {/* Search Input */}
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #e8e8e8" }}>
                <Input
                  type="text"
                  placeholder="🔍 Tìm dịch vụ..."
                  value={serviceSearch[currentIndex] || ""}
                  onChange={(e) => {
                    setServiceSearch({
                      ...serviceSearch,
                      [currentIndex]: e.target.value,
                    });
                  }}
                  style={{ width: "100%" }}
                  autoFocus
                />
              </div>

              {/* Services List */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "8px 0",
                  maxHeight: "400px",
                }}
              >
                {loadingServices ? (
                  <div style={{ padding: "20px", textAlign: "center", color: "#999" }}>
                    Đang tải danh sách dịch vụ...
                  </div>
                ) : clinicalServices.length === 0 ? (
                  <div style={{ padding: "20px", textAlign: "center", color: "#999" }}>
                    Chưa có dịch vụ nào. Vui lòng thêm dịch vụ trong quản lý.
                  </div>
                ) : filteredServices.length === 0 ? (
                  <div style={{ padding: "20px", textAlign: "center", color: "#999" }}>
                    Không tìm thấy dịch vụ phù hợp
                  </div>
                ) : (
                  <>
                    <div
                      onClick={() => {
                        handleArrayChange("labResults", currentIndex, "testName", "");
                        setOpenModal(null);
                        setServiceSearch({
                          ...serviceSearch,
                          [currentIndex]: "",
                        });
                      }}
                      style={{
                        padding: "12px 20px",
                        cursor: "pointer",
                        backgroundColor: !currentLab?.testName ? "#e6f7ff" : "#fff",
                        borderBottom: "1px solid #f0f0f0",
                      }}
                      onMouseEnter={(e) => {
                        if (!currentLab?.testName) return;
                        e.target.style.backgroundColor = "#f5f5f5";
                      }}
                      onMouseLeave={(e) => {
                        if (!currentLab?.testName) return;
                        e.target.style.backgroundColor = "#fff";
                      }}
                    >
                      -- Chọn dịch vụ --
                    </div>
                    {filteredServices.map((service, idx) => (
                      <div
                        key={`modal-service-${currentIndex}-${idx}`}
                        onClick={() => {
                          handleArrayChange(
                            "labResults",
                            currentIndex,
                            "testName",
                            service
                          );
                          setOpenModal(null);
                          setServiceSearch({
                            ...serviceSearch,
                            [currentIndex]: "",
                          });
                        }}
                        style={{
                          padding: "12px 20px",
                          cursor: "pointer",
                          backgroundColor:
                            currentLab?.testName === service ? "#e6f7ff" : "#fff",
                          borderBottom: "1px solid #f0f0f0",
                        }}
                        onMouseEnter={(e) => {
                          if (currentLab?.testName === service) return;
                          e.target.style.backgroundColor = "#f5f5f5";
                        }}
                        onMouseLeave={(e) => {
                          if (currentLab?.testName === service) return;
                          e.target.style.backgroundColor = "#fff";
                        }}
                      >
                        {service}
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  padding: "16px 20px",
                  borderTop: "1px solid #e8e8e8",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                }}
              >
                <Button
                  type="button"
                  onClick={() => {
                    setOpenModal(null);
                    setServiceSearch({
                      ...serviceSearch,
                      [currentIndex]: "",
                    });
                  }}
                  variant="outline"
                >
                  Hủy
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

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
