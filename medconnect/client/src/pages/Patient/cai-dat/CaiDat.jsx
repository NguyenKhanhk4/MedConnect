import React, { useState, useEffect } from "react";
import { User, Lock, Upload, Eye, EyeOff } from "lucide-react";
import { useUserProfile } from "../../../hooks/useUserProfile";
import { updateCurrentPatientProfile, changePassword } from "../../../lib/api";
import {
  formatDateForDisplay,
  formatDateForAPI,
  formatDateInput,
  handleDateInputKeyDown,
  getInitialFormData,
  mapProfileToFormData,
} from "../../../utils/formUtils";
import {
  isValidVietnamesePhone,
  isValidEmail,
  validateDateDDMMYYYY,
  validateBirthDate,
  validateCitizenId,
  validateRepresentativeCitizenId,
  validateFullName,
  validateRepresentativeName,
  validatePassword,
  validateTextLength,
} from "../../../utils/validationUtils";
import { resizeImage, validateImageFile } from "../../../utils/imageUtils";
import { CustomAlert } from "../../../components/ui/CustomAlert";
import "./CaiDat.scss";

export function CaiDat() {
  const {
    userProfile,
    refreshProfile,
    loading: profileLoading,
  } = useUserProfile();
  const [activeTab, setActiveTab] = useState("profile");
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    gender: "",
    email: "",
    birthDate: "",
    bloodType: "",
    address: "",
    allergies: "",
    // Thông tin cá nhân bổ sung
    ethnicity: "",
    occupation: "",
    citizenId: "",
    // Địa chỉ chi tiết (không có wardCode, districtCode, provinceCode)
    houseNumber: "",
    // Người đại diện
    representativeName: "",
    representativeCitizenId: "",
    representativeRelation: "",
    representativePhone: "",
    // Tiền sử y tế
    medicalHistory: [],
    // Bảo hiểm y tế
    healthInsurance: "",
    healthInsuranceIssueDate: "",
    healthInsuranceExpiryDate: "",
    // Ghi chú
    notes: "",
    // Password change fields
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Password change states
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordVisibility, setPasswordVisibility] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [alertMessage, setAlertMessage] = useState(null);

  // Helper function to show custom alert
  const showAlert = (message) => {
    setAlertMessage(message);
  };

  const togglePasswordVisibility = (field) => {
    setPasswordVisibility((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  // Update form data when user profile loads
  useEffect(() => {
    if (userProfile) {
      setFormData(mapProfileToFormData(userProfile));
    } else if (!profileLoading) {
      setFormData(getInitialFormData());
    }
  }, [userProfile, profileLoading]);

  const tabs = [
    { id: "profile", label: "Hồ sơ", icon: User },
    { id: "security", label: "Bảo mật", icon: Lock },
  ];

  const validateField = (field, value) => {
    const errors = {};

    switch (field) {
      case "fullName":
        errors.fullName = validateFullName(value, true);
        break;

      case "email":
        if (value && !isValidEmail(value)) {
          errors.email = "Email không đúng định dạng";
        }
        break;

      case "healthInsuranceIssueDate":
        if (value) {
          const validation = validateDateDDMMYYYY(value);
          if (!validation.isValid) {
            errors.healthInsuranceIssueDate = `Ngày cấp ${validation.error}`;
          }
        }
        break;

      case "healthInsuranceExpiryDate":
        if (value) {
          const validation = validateDateDDMMYYYY(value);
          if (!validation.isValid) {
            errors.healthInsuranceExpiryDate = `Ngày hết hạn ${validation.error}`;
          } else if (formData.healthInsuranceIssueDate) {
            const issueValidation = validateDateDDMMYYYY(
              formData.healthInsuranceIssueDate
            );
            if (
              issueValidation.isValid &&
              validation.date <= issueValidation.date
            ) {
              errors.healthInsuranceExpiryDate =
                "Ngày hết hạn phải sau ngày cấp";
            }
          }
        }
        break;

      case "phone":
        if (value && !isValidVietnamesePhone(value)) {
          errors.phone = "Số điện thoại không đúng định dạng";
        }
        break;

      case "birthDate":
        errors.birthDate = validateBirthDate(value);
        break;

      case "citizenId":
        errors.citizenId = validateCitizenId(value);
        break;

      case "representativeCitizenId":
        errors.representativeCitizenId = validateRepresentativeCitizenId(value);
        break;

      case "representativePhone":
        if (value && !isValidVietnamesePhone(value)) {
          errors.representativePhone =
            "Số điện thoại người đại diện không đúng định dạng";
        }
        break;

      case "representativeName":
        errors.representativeName = validateRepresentativeName(value);
        break;

      case "allergies":
        errors.allergies = validateTextLength(value, 500, "Ghi chú dị ứng");
        break;

      case "notes":
        errors.notes = validateTextLength(value, 1000, "Ghi chú");
        break;

      case "currentPassword":
        if (value && value.length < 6) {
          errors.currentPassword = "Mật khẩu hiện tại phải có ít nhất 6 ký tự";
        }
        break;

      case "newPassword":
        errors.newPassword = validatePassword(value, 8, 50);
        if (
          !errors.newPassword &&
          value &&
          formData.currentPassword &&
          value === formData.currentPassword
        ) {
          errors.newPassword = "Mật khẩu mới phải khác mật khẩu hiện tại";
        }
        break;

      case "confirmPassword":
        if (value && value !== formData.newPassword) {
          errors.confirmPassword = "Mật khẩu xác nhận không khớp";
        }
        break;
    }

    return errors;
  };

  const handleInputChange = (field, value) => {
    let processedValue = value;

    // Auto-format date fields: DD/MM/YYYY
    if (
      field === "birthDate" ||
      field === "healthInsuranceIssueDate" ||
      field === "healthInsuranceExpiryDate"
    ) {
      processedValue = formatDateInput(value);
    }

    setFormData((prev) => ({
      ...prev,
      [field]: processedValue,
    }));

    // Real-time validation
    const fieldValidation = validateField(field, processedValue);
    setFieldErrors((prev) => ({
      ...prev,
      [field]: fieldValidation[field] || null,
    }));

    // If new password changes, re-validate confirm password
    if (field === "newPassword") {
      const confirmPasswordValidation = validateField(
        "confirmPassword",
        formData.confirmPassword
      );
      setFieldErrors((prev) => ({
        ...prev,
        confirmPassword: confirmPasswordValidation.confirmPassword || null,
      }));
    }

    // If current password changes, re-validate new password to check if they match
    if (field === "currentPassword" && formData.newPassword) {
      const newPasswordValidation = validateField(
        "newPassword",
        formData.newPassword
      );
      setFieldErrors((prev) => ({
        ...prev,
        newPassword: newPasswordValidation.newPassword || null,
      }));
    }
  };

  const validateForm = () => {
    const errors = {};

    // Validate required fields
    errors.fullName = validateFullName(formData.fullName, true);

    // Validate email format
    if (formData.email && !isValidEmail(formData.email)) {
      errors.email = "Email không đúng định dạng";
    }

    // Validate phone format
    if (formData.phone && !isValidVietnamesePhone(formData.phone)) {
      errors.phone = "Số điện thoại không đúng định dạng";
    }

    // Validate date of birth
    errors.birthDate = validateBirthDate(formData.birthDate);

    // Validate health insurance issue date
    if (formData.healthInsuranceIssueDate) {
      const validation = validateDateDDMMYYYY(
        formData.healthInsuranceIssueDate
      );
      if (!validation.isValid) {
        errors.healthInsuranceIssueDate = `Ngày cấp ${validation.error}`;
      }
    }

    // Validate health insurance expiry date
    if (formData.healthInsuranceExpiryDate) {
      const validation = validateDateDDMMYYYY(
        formData.healthInsuranceExpiryDate
      );
      if (!validation.isValid) {
        errors.healthInsuranceExpiryDate = `Ngày hết hạn ${validation.error}`;
      } else if (formData.healthInsuranceIssueDate) {
        const issueValidation = validateDateDDMMYYYY(
          formData.healthInsuranceIssueDate
        );
        if (
          issueValidation.isValid &&
          validation.date <= issueValidation.date
        ) {
          errors.healthInsuranceExpiryDate = "Ngày hết hạn phải sau ngày cấp";
        }
      }
    }

    // Validate citizen ID
    errors.citizenId = validateCitizenId(formData.citizenId);

    // Validate representative citizen ID
    errors.representativeCitizenId = validateRepresentativeCitizenId(
      formData.representativeCitizenId
    );

    // Validate representative phone
    if (
      formData.representativePhone &&
      !isValidVietnamesePhone(formData.representativePhone)
    ) {
      errors.representativePhone =
        "Số điện thoại người đại diện không đúng định dạng";
    }

    // Validate representative name
    errors.representativeName = validateRepresentativeName(
      formData.representativeName
    );

    // Validate text lengths
    errors.allergies = validateTextLength(
      formData.allergies,
      500,
      "Ghi chú dị ứng"
    );
    errors.notes = validateTextLength(formData.notes, 1000, "Ghi chú");

    // Remove null values
    return Object.fromEntries(
      Object.entries(errors).filter(([_, value]) => value !== null)
    );
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // Validate form data
      const validationErrors = validateForm();
      if (Object.keys(validationErrors).length > 0) {
        showAlert(
          "Vui lòng kiểm tra lại thông tin:\n" +
            Object.values(validationErrors).join("\n")
        );
        return;
      }

      // Prepare data for API
      const updateData = {
        fullName: formData.fullName,
        phone: formData.phone,
        gender: formData.gender,
        dob: formatDateForAPI(formData.birthDate),
        address: formData.address,
        bloodType: formData.bloodType,
        allergyNotes: formData.allergies,
        // Thông tin cá nhân bổ sung
        ethnicity: formData.ethnicity,
        occupation: formData.occupation,
        citizenId: formData.citizenId,
        // Địa chỉ chi tiết
        houseNumber: formData.houseNumber,
        // Người đại diện
        representativeName: formData.representativeName,
        representativeCitizenId: formData.representativeCitizenId,
        representativeRelation: formData.representativeRelation,
        representativePhone: formData.representativePhone,
        // Tiền sử y tế
        medicalHistory: formData.medicalHistory,
        // Bảo hiểm y tế (không bắt buộc)
        healthInsurance: formData.healthInsurance || null,
        healthInsuranceIssueDate: formData.healthInsuranceIssueDate
          ? formatDateForAPI(formData.healthInsuranceIssueDate)
          : null,
        healthInsuranceExpiryDate: formData.healthInsuranceExpiryDate
          ? formatDateForAPI(formData.healthInsuranceExpiryDate)
          : null,
        // Ghi chú
        notes: formData.notes,
      };

      // Call API to update patient profile
      const response = await updateCurrentPatientProfile(updateData);

      // Refresh the profile data
      await refreshProfile();

      // Show success message
      showAlert("Cập nhật thông tin thành công!");
    } catch (error) {
      console.error("Error saving profile:", error);
      showAlert("Có lỗi xảy ra khi cập nhật thông tin. Vui lòng thử lại.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Thêm logic hủy thay đổi ở đây
  };

  //--------------------------------- Change Password  ---------------------------------
  const handleChangePassword = async () => {
    try {
      setIsChangingPassword(true);

      // Validate password fields
      const passwordErrors = {};

      if (!formData.currentPassword?.trim()) {
        passwordErrors.currentPassword = "Mật khẩu hiện tại là bắt buộc";
      }

      if (!formData.newPassword?.trim()) {
        passwordErrors.newPassword = "Mật khẩu mới là bắt buộc";
      } else if (formData.newPassword.length < 8) {
        passwordErrors.newPassword = "Mật khẩu mới phải có ít nhất 8 ký tự";
      }

      if (!formData.confirmPassword?.trim()) {
        passwordErrors.confirmPassword = "Xác nhận mật khẩu là bắt buộc";
      } else if (formData.confirmPassword !== formData.newPassword) {
        passwordErrors.confirmPassword = "Mật khẩu xác nhận không khớp";
      }

      // Check if new password is different from current password
      if (
        formData.currentPassword &&
        formData.newPassword &&
        formData.currentPassword === formData.newPassword
      ) {
        passwordErrors.newPassword = "Mật khẩu mới phải khác mật khẩu hiện tại";
      }

      if (Object.keys(passwordErrors).length > 0) {
        setFieldErrors(passwordErrors);
        return;
      }

      // Call API to change password
      try {
        await changePassword(formData.currentPassword, formData.newPassword);

        // Clear password fields on success
        setFormData((prev) => ({
          ...prev,
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        }));

        // Clear errors
        setFieldErrors((prev) => ({
          ...prev,
          currentPassword: null,
          newPassword: null,
          confirmPassword: null,
        }));

        showAlert("Đổi mật khẩu thành công!");
      } catch (error) {
        // Handle API errors
        if (error.status === 400 && error.response?.message) {
          const errorMessage = error.response.message;
          if (
            errorMessage.includes("Mật khẩu hiện tại không đúng") ||
            errorMessage.includes("mật khẩu hiện tại")
          ) {
            setFieldErrors({
              currentPassword: "Mật khẩu hiện tại không đúng",
            });
          } else if (errorMessage.includes("khác mật khẩu hiện tại")) {
            setFieldErrors({
              newPassword: "Mật khẩu mới phải khác mật khẩu hiện tại",
            });
          } else {
            showAlert(errorMessage || "Có lỗi xảy ra khi đổi mật khẩu");
          }
        } else {
          showAlert(
            error.response?.message ||
              error.message ||
              "Có lỗi xảy ra khi đổi mật khẩu. Vui lòng thử lại."
          );
        }
        throw error;
      }
    } catch (error) {
      console.error("Error changing password:", error);
      // Error handling is done above
    } finally {
      setIsChangingPassword(false);
    }
  };
  //--------------------------------- Change Password ---------------------------------

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate image file
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      showAlert(validation.error);
      return;
    }

    setUploadingAvatar(true);
    try {
      // Resize and compress image
      const compressedImage = await resizeImage(file, 800, 800, 0.8);

      // Update avatar via API
      await updateCurrentPatientProfile({ avatarUrl: compressedImage });

      // Refresh profile
      await refreshProfile();

      // Dispatch custom event to update sidebar/header if needed
      window.dispatchEvent(new CustomEvent("avatarUpdated"));

      showAlert("Cập nhật ảnh đại diện thành công!");
    } catch (error) {
      console.error("Error updating avatar:", error);
      showAlert("Có lỗi xảy ra khi cập nhật ảnh đại diện");
    } finally {
      setUploadingAvatar(false);
      // Reset file input
      e.target.value = "";
    }
  };

  return (
    <div className="settings-container">
      {/* Header */}
      <div className="settings-header">
        <h1 className="settings-title">Cài đặt</h1>
        <p className="settings-subtitle">
          Quản lý thông tin tài khoản và tùy chọn cá nhân
        </p>
      </div>

      {/* Tabs */}
      <div className="settings-tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon className="tab-icon" />
              <span className="tab-label">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="settings-content">
        {activeTab === "profile" && (
          <div className="profile-section">
            <div className="section-header">
              <h2 className="section-title">Thông tin cá nhân</h2>
              <p className="section-subtitle">
                Cập nhật thông tin hồ sơ của bạn
              </p>
            </div>

            {/* Profile Picture */}
            <div className="profile-picture-section">
              <div className="avatar-container">
                <img
                  src={
                    userProfile?.avatarUrl ||
                    userProfile?.photoURL ||
                    userProfile?.avatar ||
                    "/patient-consultation.png"
                  }
                  alt="Profile"
                  className="profile-avatar"
                />
              </div>
              <div className="upload-section">
                <input
                  type="file"
                  id="avatar-input"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleAvatarChange}
                  disabled={uploadingAvatar}
                  style={{ display: "none" }}
                />
                <label
                  htmlFor="avatar-input"
                  className={`upload-button ${
                    uploadingAvatar ? "disabled" : ""
                  }`}
                  style={{ pointerEvents: uploadingAvatar ? "none" : "auto" }}
                >
                  <Upload className="upload-icon" />
                  {uploadingAvatar ? "Đang tải lên..." : "Tải ảnh lên"}
                </label>
                <p className="upload-text">JPG, PNG, WebP tối đa 5MB</p>
              </div>
            </div>

            {/* Thông tin cơ bản */}
            <div className="form-section">
              <h3 className="section-subtitle">Thông tin cơ bản</h3>
              <div className="form-grid">
                <div className="form-column">
                  <div className="form-group">
                    <label className="form-label">Họ và tên *</label>
                    <input
                      type="text"
                      className={`form-input ${
                        fieldErrors.fullName ? "error" : ""
                      }`}
                      value={formData.fullName}
                      onChange={(e) =>
                        handleInputChange("fullName", e.target.value)
                      }
                      placeholder="Nhập họ và tên"
                      required
                    />
                    {fieldErrors.fullName && (
                      <div className="error-text">{fieldErrors.fullName}</div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Số điện thoại</label>
                    <input
                      type="tel"
                      className={`form-input ${
                        fieldErrors.phone ? "error" : ""
                      }`}
                      value={formData.phone}
                      onChange={(e) =>
                        handleInputChange("phone", e.target.value)
                      }
                      placeholder="Nhập số điện thoại"
                    />
                    {fieldErrors.phone && (
                      <div className="error-text">{fieldErrors.phone}</div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Giới tính</label>
                    <select
                      className="form-input form-select-small"
                      value={formData.gender}
                      onChange={(e) =>
                        handleInputChange("gender", e.target.value)
                      }
                    >
                      <option value="">Chọn giới tính</option>
                      <option value="male">Nam</option>
                      <option value="female">Nữ</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Dân tộc</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.ethnicity}
                      onChange={(e) =>
                        handleInputChange("ethnicity", e.target.value)
                      }
                      placeholder="Nhập dân tộc"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Địa chỉ</label>
                    <textarea
                      className="form-textarea"
                      value={formData.address}
                      onChange={(e) =>
                        handleInputChange("address", e.target.value)
                      }
                      rows={3}
                      placeholder="Nhập địa chỉ đầy đủ"
                    />
                  </div>
                </div>

                <div className="form-column">
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className={`form-input ${
                        fieldErrors.email ? "error" : ""
                      }`}
                      value={formData.email}
                      onChange={(e) =>
                        handleInputChange("email", e.target.value)
                      }
                      placeholder="Nhập email"
                    />
                    {fieldErrors.email && (
                      <div className="error-text">{fieldErrors.email}</div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Ngày sinh</label>
                    <input
                      type="text"
                      className={`form-input ${
                        fieldErrors.birthDate ? "error" : ""
                      }`}
                      value={formData.birthDate}
                      onChange={(e) =>
                        handleInputChange("birthDate", e.target.value)
                      }
                      onKeyDown={handleDateInputKeyDown}
                      maxLength={10}
                      placeholder="DD/MM/YYYY"
                    />
                    {fieldErrors.birthDate && (
                      <div className="error-text">{fieldErrors.birthDate}</div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Nghề nghiệp</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.occupation}
                      onChange={(e) =>
                        handleInputChange("occupation", e.target.value)
                      }
                      placeholder="Nhập nghề nghiệp"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Căn cước công dân</label>
                    <input
                      type="text"
                      className={`form-input ${
                        fieldErrors.citizenId ? "error" : ""
                      }`}
                      value={formData.citizenId}
                      onChange={(e) => {
                        // Only allow numbers, limit to 12 digits
                        const digitsOnly = e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 12);
                        handleInputChange("citizenId", digitsOnly);
                      }}
                      maxLength={12}
                      placeholder="Nhập số căn cước công dân (12 số)"
                    />
                    {fieldErrors.citizenId && (
                      <div className="error-text">{fieldErrors.citizenId}</div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Số nhà</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.houseNumber}
                      onChange={(e) =>
                        handleInputChange("houseNumber", e.target.value)
                      }
                      placeholder="Nhập số nhà"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Thông tin y tế */}
            <div className="form-section">
              <h3 className="section-subtitle">Thông tin y tế</h3>
              <div className="form-grid">
                <div className="form-column">
                  <div className="form-group">
                    <label className="form-label">Nhóm máu</label>
                    <select
                      className="form-input form-select-small"
                      value={formData.bloodType}
                      onChange={(e) =>
                        handleInputChange("bloodType", e.target.value)
                      }
                    >
                      <option value="">Chọn nhóm máu</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="Không rõ">Không rõ</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Bảo hiểm y tế (nếu có)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.healthInsurance}
                      onChange={(e) =>
                        handleInputChange("healthInsurance", e.target.value)
                      }
                      placeholder="Nhập số thẻ BHYT"
                      maxLength={15}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Ngày cấp BHYT (nếu có)</label>
                    <input
                      type="text"
                      className={`form-input ${
                        fieldErrors.healthInsuranceIssueDate ? "error" : ""
                      }`}
                      value={formData.healthInsuranceIssueDate}
                      onChange={(e) =>
                        handleInputChange(
                          "healthInsuranceIssueDate",
                          e.target.value
                        )
                      }
                      onKeyDown={handleDateInputKeyDown}
                      maxLength={10}
                      placeholder="DD/MM/YYYY"
                    />
                    {fieldErrors.healthInsuranceIssueDate && (
                      <div className="error-text">
                        {fieldErrors.healthInsuranceIssueDate}
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Ngày hết hạn BHYT (nếu có)
                    </label>
                    <input
                      type="text"
                      className={`form-input ${
                        fieldErrors.healthInsuranceExpiryDate ? "error" : ""
                      }`}
                      value={formData.healthInsuranceExpiryDate}
                      onChange={(e) =>
                        handleInputChange(
                          "healthInsuranceExpiryDate",
                          e.target.value
                        )
                      }
                      onKeyDown={handleDateInputKeyDown}
                      maxLength={10}
                      placeholder="DD/MM/YYYY"
                    />
                    {fieldErrors.healthInsuranceExpiryDate && (
                      <div className="error-text">
                        {fieldErrors.healthInsuranceExpiryDate}
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-column">
                  <div className="form-group">
                    <label className="form-label">Tiền sử bệnh lý</label>
                    <textarea
                      className="form-textarea"
                      placeholder="Nhập các bệnh lý đã mắc phải (mỗi bệnh một dòng)..."
                      value={
                        formData.medicalHistory
                          ? formData.medicalHistory.join("\n")
                          : ""
                      }
                      onChange={(e) => {
                        const medicalHistory = e.target.value
                          .split("\n")
                          .filter((item) => item.trim());
                        handleInputChange("medicalHistory", medicalHistory);
                      }}
                      rows={4}
                    />
                    <div className="form-help-text">
                      Mỗi bệnh lý một dòng, ví dụ: Tiểu đường, Cao huyết áp, Hen
                      suyễn
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Dị ứng</label>
                    <textarea
                      className={`form-textarea ${
                        fieldErrors.allergies ? "error" : ""
                      }`}
                      value={formData.allergies}
                      onChange={(e) =>
                        handleInputChange("allergies", e.target.value)
                      }
                      rows={3}
                      placeholder="Nhập thông tin dị ứng (nếu có)"
                      maxLength={500}
                    />
                    {fieldErrors.allergies && (
                      <div className="error-text">{fieldErrors.allergies}</div>
                    )}
                    <div className="form-help-text">
                      Tối đa 500 ký tự. Ví dụ: Dị ứng với penicillin, Dị ứng với
                      thức ăn hải sản
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
              <button className="cancel-button" onClick={handleCancel}>
                Hủy
              </button>
              <button
                className="save-button"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        )}

        {activeTab === "security" && (
          <div className="security-section">
            <div className="section-header">
              <h2 className="section-title">Bảo mật</h2>
            </div>

            <div className="change-password-form">
              <div className="form-group">
                <label className="form-label">Mật khẩu hiện tại</label>
                <div className="password-input-container">
                  <Lock className="password-icon" />
                  <input
                    type={passwordVisibility.current ? "text" : "password"}
                    className={`form-input password-input ${
                      fieldErrors.currentPassword ? "error" : ""
                    }`}
                    placeholder="Nhập mật khẩu hiện tại"
                    value={formData.currentPassword || ""}
                    onChange={(e) =>
                      handleInputChange("currentPassword", e.target.value)
                    }
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => togglePasswordVisibility("current")}
                  >
                    {passwordVisibility.current ? <Eye /> : <EyeOff />}
                  </button>
                </div>
                {fieldErrors.currentPassword && (
                  <div className="error-text">
                    {fieldErrors.currentPassword}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Mật khẩu mới</label>
                <div className="password-input-container">
                  <Lock className="password-icon" />
                  <input
                    type={passwordVisibility.new ? "text" : "password"}
                    className={`form-input password-input ${
                      fieldErrors.newPassword ? "error" : ""
                    }`}
                    placeholder="Nhập mật khẩu mới"
                    value={formData.newPassword || ""}
                    onChange={(e) =>
                      handleInputChange("newPassword", e.target.value)
                    }
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => togglePasswordVisibility("new")}
                  >
                    {passwordVisibility.new ? <Eye /> : <EyeOff />}
                  </button>
                </div>
                {fieldErrors.newPassword && (
                  <div className="error-text">{fieldErrors.newPassword}</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Xác nhận mật khẩu mới</label>
                <div className="password-input-container">
                  <Lock className="password-icon" />
                  <input
                    type={passwordVisibility.confirm ? "text" : "password"}
                    className={`form-input password-input ${
                      fieldErrors.confirmPassword ? "error" : ""
                    }`}
                    placeholder="Nhập lại mật khẩu mới"
                    value={formData.confirmPassword || ""}
                    onChange={(e) =>
                      handleInputChange("confirmPassword", e.target.value)
                    }
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => togglePasswordVisibility("confirm")}
                  >
                    {passwordVisibility.confirm ? <Eye /> : <EyeOff />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <div className="error-text">
                    {fieldErrors.confirmPassword}
                  </div>
                )}
              </div>

              <button
                className="change-password-button"
                onClick={handleChangePassword}
                disabled={isChangingPassword}
              >
                {isChangingPassword ? "Đang xử lý..." : "Đổi mật khẩu"}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Custom Alert */}
      <CustomAlert
        message={alertMessage}
        onClose={() => setAlertMessage(null)}
        title="Hệ thống MedConnect"
      />
    </div>
  );
}
