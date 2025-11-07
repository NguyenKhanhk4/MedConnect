import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getDoctorAppointmentsWithFallback } from "../../../lib/api";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import "./KhamTrucTiep.scss";

export default function KhamTrucTiep() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("vitals");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [formData, setFormData] = useState({
    reasonForVisit: "",
    visitDate: new Date().toISOString().split("T")[0],
    treatmentResult: "improved",
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
            alert("Không tìm thấy lịch hẹn");
            navigate("/bac-si/lich-hen");
          }
        }
      } catch (error) {
        console.error("Error fetching appointment:", error);
        alert("Có lỗi xảy ra khi tải dữ liệu");
        navigate("/bac-si/lich-hen");
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
      alert("Chỉ được upload file ảnh (JPG, PNG, WebP) hoặc PDF!");
      e.target.value = "";
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("Kích thước file không được vượt quá 10MB!");
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
          alert("Tải file lên thành công!");
        } else {
          alert("Có lỗi xảy ra khi lưu file");
        }
      } else {
        const errorData = await response.json();
        alert(`Lỗi upload: ${errorData.message || "Không thể upload file"}`);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Có lỗi xảy ra khi upload file");
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
      alert("Vui lòng nhập ít nhất một chẩn đoán!");
      return;
    }

    // Kiểm tra tóm tắt buổi khám bắt buộc
    if (!formData.summaryText || !formData.summaryText.trim()) {
      alert("Vui lòng nhập tóm tắt buổi khám!");
      return;
    }

    // Kiểm tra phương pháp điều trị bắt buộc
    if (!formData.treatmentMethod || !formData.treatmentMethod.trim()) {
      alert("Vui lòng nhập phương pháp điều trị!");
      return;
    }

    // Kiểm tra hướng dẫn theo dõi bắt buộc
    if (
      !formData.followUpInstructions ||
      !formData.followUpInstructions.trim()
    ) {
      alert("Vui lòng nhập hướng dẫn theo dõi!");
      return;
    }

    // Thêm thông báo xác nhận
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn lưu hồ sơ cho ${patientName}?`
    );

    if (!confirmed) {
      return; // Nếu người dùng không xác nhận, không thực hiện hành động
    }

    const submitData = {
      appointmentId: appointment._id,
      summaryText: formData.summaryText,
      reasonForVisit: formData.reasonForVisit,
      visitDate: formData.visitDate ? new Date(formData.visitDate) : undefined,
      treatmentResult: formData.treatmentResult,
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

    // Debug logging
    console.log(
      "🔍 Submitting imagingResults:",
      JSON.stringify(submitData.imagingResults, null, 2)
    );

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
        console.log(
          "🔍 KhamTrucTiep - Attempting to end video call for appointmentId:",
          appointmentId
        );
        await VideoCallAPI.default.endCallByAppointmentId(appointmentId);
        console.log("✅ KhamTrucTiep - Video call ended successfully");
      } catch (videoCallError) {
        console.warn(
          "⚠️ KhamTrucTiep - Could not end video call:",
          videoCallError.message
        );
        console.error("⚠️ KhamTrucTiep - Full error:", videoCallError);
        // Don't fail the whole process if video call ending fails
      }

      alert(
        "Đã lưu hồ sơ thành công! Bạn có thể ghi hóa đơn dịch vụ cho bệnh nhân."
      );
      navigate("/bac-si/lich-hen");
    } catch (error) {
      console.error("Error submitting consultation:", error);
      alert("Có lỗi xảy ra: " + error.message);
    }
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
          <div className="header-content">
            <h1>Hoàn thành khám bệnh trực tiếp</h1>
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
              className={`tab-btn ${activeTab === "vitals" ? "active" : ""}`}
              onClick={() => setActiveTab("vitals")}
            >
              📊 Chỉ số
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
              🧪 Xét nghiệm
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
                <div className="form-group">
                  <label>Kết quả điều trị</label>
                  <select
                    value={formData.treatmentResult}
                    onChange={(e) =>
                      handleFieldChange("treatmentResult", e.target.value)
                    }
                    className="form-select"
                  >
                    <option value="recovered">Khỏi hoàn toàn</option>
                    <option value="improved">Cải thiện</option>
                    <option value="unchanged">Không thay đổi</option>
                  </select>
                </div>
              </div>
            )}

            {/* Vitals Tab */}
            {activeTab === "vitals" && (
              <div className="form-section">
                <h3 className="section-title">📊 Chỉ số Sinh Học</h3>
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
                <h3 className="section-title">🔍 Chẩn Đoán Sơ Bộ *</h3>
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
                <h3 className="section-title">🧪 Xét Nghiệm</h3>
                {formData.labResults.length === 0 && (
                  <p className="no-data">Chưa có xét nghiệm nào</p>
                )}
                {formData.labResults.map((lab, index) => (
                  <div key={index} className="array-item">
                    <div className="item-header">
                      <span className="item-number">
                        Xét nghiệm #{index + 1}
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
                    <div className="item-content">
                      <div className="form-group">
                        <label>Tên xét nghiệm</label>
                        <Input
                          type="text"
                          placeholder="VD: Tổng phân tích tế bào máu"
                          value={lab.testName}
                          onChange={(e) =>
                            handleArrayChange(
                              "labResults",
                              index,
                              "testName",
                              e.target.value
                            )
                          }
                        />
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
                ))}
                <Button
                  type="button"
                  onClick={() =>
                    addArrayItem("labResults", { testName: "", result: "" })
                  }
                  className="btn-add"
                >
                  + Thêm xét nghiệm
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
    </div>
  );
}
