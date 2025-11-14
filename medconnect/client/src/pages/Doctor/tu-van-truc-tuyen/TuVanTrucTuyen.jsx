import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getDoctorAppointmentsWithFallback } from "../../../lib/api";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { CustomAlert } from "../../../components/ui/CustomAlert";
import "./TuVanTrucTuyen.scss";

export default function TuVanTrucTuyen() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [formData, setFormData] = useState({
    notes: "",
    attachmentUrl: "",
    attachmentFileName: "",
    attachmentFileSize: "",
    attachmentFileType: "",
    diagnoses: [{ name: "" }],
    medications: [{ name: "", instruction: "", quantity: "" }],
    treatmentMethod: "",
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
    if (formData[arrayName].length > 1) {
      setFormData({
        ...formData,
        [arrayName]: formData[arrayName].filter((_, i) => i !== index),
      });
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.type)) {
      showAlert("Chỉ được upload file ảnh (JPG, PNG, WebP), PDF hoặc DOC!");
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
          setFormData({
            ...formData,
            attachmentUrl: data.data.url,
            attachmentFileName: file.name,
            attachmentFileSize: file.size,
            attachmentFileType: file.type,
          });
          showAlert("Tải file lên thành công!");
        } else {
          showAlert("Có lỗi xảy ra khi lưu file");
        }
      } else {
        const errorData = await response.json();
        showAlert(`Lỗi upload: ${errorData.message || "Không thể upload file"}`);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      showAlert("Có lỗi xảy ra khi upload file");
    } finally {
      setUploadingFile(false);
      e.target.value = "";
    }
  };

  const handleRemoveFile = () => {
    setFormData({
      ...formData,
      attachmentUrl: "",
      attachmentFileName: "",
      attachmentFileSize: "",
      attachmentFileType: "",
    });
  };

  // Hàm gọi AI để gợi ý điều trị
  const handleAISuggestTreatment = async () => {
    // Kiểm tra có chẩn đoán chưa
    const validDiagnoses = formData.diagnoses.filter(
      (d) => d.name && d.name.trim()
    );
    if (validDiagnoses.length === 0) {
      showAlert("Vui lòng nhập ít nhất một chẩn đoán trước khi yêu cầu AI gợi ý!");
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
            suggestion.suggestedMedications && suggestion.suggestedMedications.length > 0
              ? suggestion.suggestedMedications
              : formData.medications,
          notes: suggestion.notes
            ? `${formData.notes ? formData.notes + "\n\n" : ""}${suggestion.notes}\n\n${suggestion.followUpInstructions || ""}`
            : formData.notes,
        });

        showAlert("AI đã đưa ra gợi ý điều trị. Vui lòng xem xét và verify trước khi lưu!");
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
    showAlert("Bạn đã xác nhận đã xem xét gợi ý từ AI. Có thể tiếp tục lưu hồ sơ.");
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

    // Kiểm tra ghi chú tư vấn bắt buộc
    if (!formData.notes || !formData.notes.trim()) {
      showAlert("Vui lòng nhập ghi chú tư vấn!");
      return;
    }

    // Kiểm tra nếu có AI suggestion nhưng chưa verify
    if (aiSuggestion && !isAIVerified) {
      showAlert("Vui lòng xác nhận đã xem xét gợi ý từ AI trước khi lưu hồ sơ!");
      return;
    }

    // Thêm thông báo xác nhận
    const confirmMessage = aiSuggested
      ? `Bạn có chắc chắn muốn lưu hồ sơ cho ${patientName}? (Đã sử dụng gợi ý từ AI)`
      : `Bạn có chắc chắn muốn lưu hồ sơ cho ${patientName}?`;

    showConfirm(
      confirmMessage,
      async () => {

        const submitData = {
          appointmentId: appointment._id,
          notes: formData.notes || undefined,
          attachmentUrl: formData.attachmentUrl || undefined,
          diagnoses: validDiagnoses,
          medications:
            formData.medications.length > 0 ? formData.medications : undefined,
          treatmentMethod: formData.treatmentMethod || undefined,
          aiSuggested: aiSuggested, // Đánh dấu nếu có sử dụng AI
        };

        try {
          const response = await fetch(
            `${
              import.meta.env.VITE_API_URL || "http://localhost:3000"
            }/api/doctors/me/consultation-advice`,
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
            const error = await response.json();
            throw new Error(error.message || "Failed to submit consultation");
          }

          await fetch(
            `${
              import.meta.env.VITE_API_URL || "http://localhost:3000"
            }/api/doctors/me/appointments/${appointmentId}/status`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include",
              body: JSON.stringify({ status: "done" }),
            }
          );

          // End video call if it exists
          try {
            const VideoCallAPI = await import("../../../services/videoCallAPI");
            console.log(
              "🔍 TuVanTrucTuyen - Attempting to end video call for appointmentId:",
              appointmentId
            );
            await VideoCallAPI.default.endCallByAppointmentId(appointmentId);
            console.log("✅ TuVanTrucTuyen - Video call ended successfully");
          } catch (videoCallError) {
            console.warn(
              "⚠️ TuVanTrucTuyen - Could not end video call:",
              videoCallError.message
            );
            console.error("⚠️ TuVanTrucTuyen - Full error:", videoCallError);
            // Don't fail the whole process if video call ending fails
          }

          showAlert("Đã lưu hồ sơ thành công!");
          setTimeout(() => navigate("/bac-si/lich-hen"), 1000);
        } catch (error) {
          console.error("Error submitting consultation:", error);
          showAlert("Có lỗi xảy ra: " + error.message);
        }
      }
    );
  };

  if (loading) {
    return (
      <div className="online-consultation-page-container">
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
    <div className="online-consultation-page-container">
      <div className="online-consultation-page-content">
        <div className="consultation-page-header">
          <div className="header-content">
            <h1>Hoàn thành tư vấn trực tuyến</h1>
            <p className="patient-info">
              Bệnh nhân:{" "}
              <strong>
                {appointment?.patientId?.fullName ||
                  appointment?.patient?.fullName ||
                  appointment?.patientName ||
                  "Không có"}
              </strong>
            </p>
          </div>
          <button
            className="back-btn"
            onClick={() => navigate("/bac-si/lich-hen")}
          >
            ← Quay lại
          </button>
        </div>

        <div className="consultation-form-wrapper">
          <form onSubmit={handleSubmit} className="consultation-form-content">
            {/* Basic Info Section */}
            <div className="form-section basic-info">
              <h3 className="section-title">📋 Thông Tin Cuộc Hẹn</h3>
              <div className="section-row">
                <div className="form-group">
                  <label>Bệnh nhân</label>
                  <Input
                    type="text"
                    value={
                      appointment?.patientId?.fullName ||
                      appointment?.patient?.fullName ||
                      appointment?.patientName ||
                      "Không có"
                    }
                    disabled
                    className="disabled-input"
                  />
                </div>
                <div className="form-group">
                  <label>Ngày khám</label>
                  <Input
                    type="text"
                    value={
                      appointment?.scheduledStart
                        ? new Date(appointment.scheduledStart).toLocaleString(
                            "vi-VN"
                          )
                        : "Không có"
                    }
                    disabled
                    className="disabled-input"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Lý do khám</label>
                <Input
                  type="text"
                  value={
                    appointment?.reason || appointment?.notes || "Không có"
                  }
                  disabled
                  className="disabled-input"
                />
              </div>
            </div>

            {/* Diagnosis Section - Show by default */}
            <div className="form-section">
              <div className="section-title-wrapper">
                <h3 className="section-title">🔍 Chẩn Đoán sơ bộ *</h3>
                <Button
                  type="button"
                  onClick={handleAISuggestTreatment}
                  disabled={isLoadingAI || formData.diagnoses.filter((d) => d.name && d.name.trim()).length === 0}
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
                    <span className="item-number">Chẩn đoán </span>
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
                <div className="ai-suggestion-box" style={{
                  marginTop: "20px",
                  padding: "16px",
                  backgroundColor: "#fff7e6",
                  border: "2px solid #ffc53d",
                  borderRadius: "8px",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
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

                  {aiSuggestion.suggestedMedications && aiSuggestion.suggestedMedications.length > 0 && (
                    <div style={{ marginBottom: "12px" }}>
                      <strong>Gợi ý thuốc:</strong>
                      <ul style={{ margin: "8px 0", paddingLeft: "20px" }}>
                        {aiSuggestion.suggestedMedications.map((med, idx) => (
                          <li key={idx}>
                            {med.name} - {med.quantity || ""} - {med.instruction || ""}
                          </li>
                        ))}
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

                  <div style={{
                    marginTop: "12px",
                    padding: "8px",
                    backgroundColor: "#fff1f0",
                    border: "1px solid #ffccc7",
                    borderRadius: "4px",
                    fontSize: "13px",
                    color: "#cf1322",
                  }}>
                    <strong>⚠️ Lưu ý:</strong> Đây chỉ là gợi ý từ AI. Bác sĩ PHẢI xem xét, chỉnh sửa và xác nhận trước khi lưu hồ sơ.
                  </div>
                </div>
              )}
            </div>

            {/* Treatment Method Section - Nếu có treatmentMethod từ AI */}
            {formData.treatmentMethod && (
              <div className="form-section">
                <h3 className="section-title">💊 Phương Pháp Điều Trị</h3>
                <div className="form-group">
                  <textarea
                    className="form-textarea"
                    rows="4"
                    value={formData.treatmentMethod}
                    onChange={(e) => handleFieldChange("treatmentMethod", e.target.value)}
                    placeholder="Phương pháp điều trị (có thể từ AI gợi ý hoặc tự nhập)"
                  />
                </div>
              </div>
            )}

            {/* Medications Section - Show by default */}
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
                  })
                }
                className="btn-add"
              >
                + Thêm thuốc
              </Button>
            </div>

            {/* File Upload Section */}
            <div className="form-section">
              <div className="form-group">
                <label htmlFor="file-attachment">File đính kèm</label>
                <div className="file-upload-group">
                  <input
                    type="file"
                    id="file-attachment"
                    name="file-attachment"
                    onChange={handleFileUpload}
                    disabled={uploadingFile}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                    className="file-input"
                  />
                  <label
                    htmlFor="file-attachment"
                    className="file-upload-label"
                  >
                    <i className="bi bi-cloud-upload"></i>
                    <span>
                      {formData.attachmentUrl
                        ? "✓ File đã được chọn"
                        : uploadingFile
                        ? "Đang tải lên..."
                        : "Chọn file để đính kèm (PDF, DOC, DOCX, JPG, PNG, WebP - Tối đa 10MB)"}
                    </span>
                  </label>
                </div>

                {/* Hiển thị file đã upload */}
                {formData.attachmentUrl && (
                  <div className="uploaded-file-preview">
                    <div className="file-info">
                      <div className="file-details">
                        <i className="bi bi-file-earmark-image"></i>
                        <div className="file-text">
                          <div className="file-name">
                            {formData.attachmentFileName || "File đã upload"}
                          </div>
                          <div className="file-size">
                            {formData.attachmentFileSize
                              ? `${(
                                  formData.attachmentFileSize /
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
                        onClick={handleRemoveFile}
                        title="Xóa file"
                      >
                        <i className="bi bi-x-circle"></i>
                      </button>
                    </div>

                    {/* Hiển thị preview hình ảnh */}
                    {formData.attachmentFileType &&
                      formData.attachmentFileType.startsWith("image/") && (
                        <div className="image-preview">
                          <img
                            src={`${
                              import.meta.env.VITE_API_URL ||
                              "http://localhost:3000"
                            }${formData.attachmentUrl}`}
                            alt="Preview"
                            onError={(e) => {
                              e.target.style.display = "none";
                              e.target.nextSibling.style.display = "block";
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

                    {/* Hiển thị PDF/DOC icon */}
                    {(formData.attachmentFileType === "application/pdf" ||
                      formData.attachmentFileType === "application/msword" ||
                      formData.attachmentFileType ===
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document") && (
                      <div className="document-preview">
                        <i className="bi bi-file-earmark-pdf"></i>
                        <span>
                          {formData.attachmentFileType === "application/pdf"
                            ? "File PDF"
                            : "File DOC"}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Notes Section - Moved to the end */}
            <div className="form-section">
              <div className="form-group">
                <label>Ghi chú tư vấn *</label>
                <textarea
                  className="form-textarea"
                  rows="6"
                  value={formData.notes}
                  onChange={(e) => handleFieldChange("notes", e.target.value)}
                  required
                  placeholder="Nhập tóm tắt tư vấn, triệu chứng, lời khuyên..."
                />
              </div>
            </div>

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
