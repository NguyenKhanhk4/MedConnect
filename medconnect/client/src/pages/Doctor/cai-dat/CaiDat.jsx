"use client";

import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  User,
  Mail,
  Phone,
  Award,
  Calendar,
  Lock,
  Upload,
  FileText,
  Building2,
  MapPin,
} from "lucide-react";
import { Image } from "antd";
import {
  getDoctorProfileWithFallback,
  updateDoctorProfile,
  changePassword,
} from "../../../lib/api";
import "./CaiDat.scss";

// Helper function to get full image URL
const getImageUrl = (url) => {
  if (!url) return null;
  // If URL is already absolute (starts with http:// or https://), return as is
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  // If URL starts with /, it's a server path, prepend API base URL
  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3000";
  return `${apiBase}${url.startsWith("/") ? url : `/${url}`}`;
};

const CaiDat = () => {
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingLicense, setUploadingLicense] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    specialization: "",
    bio: "",
    licenseNo: "",
    graduationYear: "",
    yearsExperience: 0,
    educationLevel: "",
    ratingAvg: 0,
    ratingCount: 0,
  });

  useEffect(() => {
    const fetchDoctorInfo = async () => {
      try {
        const doctor = await getDoctorProfileWithFallback();
        if (doctor) {
          setDoctorInfo(doctor);
          setFormData({
            fullName: doctor.userId?.fullName || doctor.fullName || "",
            email: doctor.userId?.email || "",
            phone: doctor.userId?.phone || "",
            specialization:
              doctor.specializationIds
                ?.filter((spec) => spec && spec.name)
                .map((spec) => spec.name)
                .join(", ") || "",
            bio: doctor.bio || "",
            licenseNo: doctor.licenseNo || "",
            graduationYear: doctor.education?.[0]?.year || "",
            yearsExperience: doctor.yearsExperience || 0,
            educationLevel: doctor.educationLevel || "",
            ratingAvg: doctor.ratingAvg || 0,
            ratingCount: doctor.ratingCount || 0,
          });
        }
      } catch (error) {
        console.error("Error fetching doctor info:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDoctorInfo();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    try {
      // Remove email from formData as it should not be editable by doctor
      const { email, ...updateData } = formData;
      const response = await updateDoctorProfile(updateData);

      if (response) {
        // Refresh doctor info after successful update
        const updatedDoctor = await getDoctorProfileWithFallback();

        if (updatedDoctor) {
          setDoctorInfo(updatedDoctor);
          setFormData({
            fullName:
              updatedDoctor.userId?.fullName || updatedDoctor.fullName || "",
            email: updatedDoctor.userId?.email || "",
            phone: updatedDoctor.userId?.phone || "",
            specialization:
              updatedDoctor.specializationIds
                ?.map((spec) => spec.name)
                .join(", ") || "",
            bio: updatedDoctor.bio || "",
            licenseNo: updatedDoctor.licenseNo || "",
            graduationYear: updatedDoctor.education?.[0]?.year || "",
            yearsExperience: updatedDoctor.yearsExperience || 0,
            educationLevel: updatedDoctor.educationLevel || "",
            ratingAvg: updatedDoctor.ratingAvg || 0,
            ratingCount: updatedDoctor.ratingCount || 0,
          });
        }

        // Dispatch custom event to notify other components
        window.dispatchEvent(
          new CustomEvent("doctorProfileUpdated", {
            detail: { doctor: updatedDoctor },
          })
        );

        alert("Thông tin đã được cập nhật thành công");
      } else {
        alert("Có lỗi xảy ra khi cập nhật thông tin");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Có lỗi xảy ra khi cập nhật thông tin");
    }
  };

  //--------------------------------- Change Password  ---------------------------------
  const handlePasswordChange = (field, value) => {
    setPasswordData((prev) => {
      const updated = {
        ...prev,
        [field]: value,
      };

      // Real-time validation when user types
      const errors = {};

      // Validate new password if it matches current password
      if (
        field === "newPassword" &&
        value &&
        updated.currentPassword &&
        value === updated.currentPassword
      ) {
        errors.newPassword = "Mật khẩu mới phải khác mật khẩu hiện tại";
      }
      // Also check when current password changes
      if (
        field === "currentPassword" &&
        updated.newPassword &&
        value === updated.newPassword
      ) {
        errors.newPassword = "Mật khẩu mới phải khác mật khẩu hiện tại";
      }

      // Validate password length
      if (
        field === "newPassword" &&
        value &&
        value.length > 0 &&
        value.length < 8
      ) {
        errors.newPassword = "Mật khẩu mới phải có ít nhất 8 ký tự";
      }

      // Validate confirm password
      if (
        field === "confirmPassword" &&
        value &&
        updated.newPassword &&
        value !== updated.newPassword
      ) {
        errors.confirmPassword = "Mật khẩu xác nhận không khớp";
      }
      if (
        field === "newPassword" &&
        updated.confirmPassword &&
        value !== updated.confirmPassword
      ) {
        errors.confirmPassword = "Mật khẩu xác nhận không khớp";
      }

      // Update errors
      if (Object.keys(errors).length > 0) {
        setPasswordErrors((prev) => ({
          ...prev,
          ...errors,
        }));
      } else {
        // Clear error for the field being edited
        setPasswordErrors((prev) => ({
          ...prev,
          [field]: "",
        }));
      }

      return updated;
    });
  };

  const validatePassword = () => {
    const errors = {};

    if (!passwordData.currentPassword) {
      errors.currentPassword = "Vui lòng nhập mật khẩu hiện tại";
    }

    if (!passwordData.newPassword) {
      errors.newPassword = "Vui lòng nhập mật khẩu mới";
    } else if (passwordData.newPassword.length < 8) {
      errors.newPassword = "Mật khẩu mới phải có ít nhất 8 ký tự";
    }

    if (!passwordData.confirmPassword) {
      errors.confirmPassword = "Vui lòng xác nhận mật khẩu mới";
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = "Mật khẩu xác nhận không khớp";
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      errors.newPassword = "Mật khẩu mới phải khác mật khẩu hiện tại";
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChangePassword = async () => {
    if (!validatePassword()) {
      return;
    }

    try {
      // Call API to change password
      await changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );

      alert("Mật khẩu đã được thay đổi thành công");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordErrors({});
    } catch (error) {
      console.error("Error changing password:", error);

      // Handle API errors
      if (error.status === 400 && error.response?.message) {
        const errorMessage = error.response.message;
        if (
          errorMessage.includes("Mật khẩu hiện tại không đúng") ||
          errorMessage.includes("mật khẩu hiện tại")
        ) {
          setPasswordErrors({
            currentPassword: "Mật khẩu hiện tại không đúng",
          });
        } else if (errorMessage.includes("khác mật khẩu hiện tại")) {
          setPasswordErrors({
            newPassword: "Mật khẩu mới phải khác mật khẩu hiện tại",
          });
        } else {
          alert(errorMessage || "Có lỗi xảy ra khi đổi mật khẩu");
        }
      } else {
        alert(
          error.response?.message ||
            error.message ||
            "Có lỗi xảy ra khi thay đổi mật khẩu"
        );
      }
    }
  };

  //--------------------------------- Change Password ---------------------------------

  // Handle avatar upload
  const resizeImage = (file, maxWidth, maxHeight, quality = 0.8) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions
          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
          resolve(compressedDataUrl);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Ảnh quá lớn, vui lòng chọn ảnh nhỏ hơn 5MB");
      return;
    }

    setUploadingAvatar(true);
    try {
      // Resize image
      const compressedImage = await resizeImage(file, 800, 800, 0.8);

      // Update avatar via API
      await updateDoctorProfile({ avatarUrl: compressedImage });

      // Refresh doctor info
      const updatedDoctor = await getDoctorProfileWithFallback();
      if (updatedDoctor) {
        setDoctorInfo(updatedDoctor);
      }

      // Dispatch custom event to update sidebar
      window.dispatchEvent(new CustomEvent("avatarUpdated"));

      alert("Cập nhật ảnh đại diện thành công!");
    } catch (error) {
      console.error("Error updating avatar:", error);
      alert("Có lỗi xảy ra khi cập nhật ảnh đại diện");
    } finally {
      setUploadingAvatar(false);
      // Reset file input
      e.target.value = "";
    }
  };

  const handleLicenseImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Ảnh quá lớn, vui lòng chọn ảnh nhỏ hơn 5MB");
      return;
    }

    setUploadingLicense(true);
    try {
      // Resize image
      const compressedImage = await resizeImage(file, 1200, 1200, 0.8);

      // Update license image via API - need to check what field name is used
      // Assuming it's licenseImageUrl or licenseImage
      await updateDoctorProfile({ licenseImageUrl: compressedImage });

      // Refresh doctor info
      const updatedDoctor = await getDoctorProfileWithFallback();
      if (updatedDoctor) {
        setDoctorInfo(updatedDoctor);
      }

      alert("Cập nhật ảnh chứng chỉ hành nghề thành công!");
    } catch (error) {
      console.error("Error updating license image:", error);
      alert("Có lỗi xảy ra khi cập nhật ảnh chứng chỉ hành nghề");
    } finally {
      setUploadingLicense(false);
      // Reset file input
      e.target.value = "";
    }
  };

  if (loading) {
    return (
      <div className="profileSettings">
        <div className="container">
          <div className="header">
            <h1>Đang tải thông tin...</h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profileSettings">
      <div className="container">
        {/* Main Content */}
        <div className="main">
          {/* Basic Information */}
          <div className="card">
            <div className="cardHeader">
              <div className="icon cyan">
                <User size={20} />
              </div>
              <h2>Thông tin cơ bản</h2>
            </div>

            {/* Avatar Section */}
            <div className="avatar-section">
              <div className="avatar-container">
                <img
                  src={doctorInfo?.avatarUrl || "/default-avatar.png"}
                  alt="Avatar"
                  className="avatar-image"
                />
              </div>
              <div className="avatar-upload">
                <input
                  type="file"
                  id="avatar-input"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  disabled={uploadingAvatar}
                  style={{ display: "none" }}
                />
                <label htmlFor="avatar-input" className="avatar-upload-label">
                  <Upload size={20} />
                  {uploadingAvatar ? "Đang tải lên..." : "Chọn ảnh đại diện"}
                </label>
                <p className="avatar-hint">JPG, PNG (Tối đa 5MB)</p>
              </div>
            </div>

            <div className="formGrid">
              <div className="formGroup">
                <FormField
                  label="Họ và tên"
                  icon={User}
                  value={formData.fullName}
                  disabled={true}
                  onChange={() => {}}
                />
              </div>
              <div className="formGroup">
                <FormField
                  label="Chuyên khoa"
                  icon={Award}
                  value={formData.specialization}
                  disabled={true}
                  onChange={() => {}}
                />
              </div>
              <div className="formGroup">
                <FormField
                  label="Email"
                  icon={Mail}
                  type="email"
                  value={formData.email}
                  disabled={true}
                  onChange={() => {}}
                />
                <p
                  style={{
                    marginTop: "0.5rem",
                    fontSize: "0.75rem",
                    color: "#666",
                    fontStyle: "italic",
                  }}
                >
                  Nếu muốn thay đổi email vui lòng làm việc với admin
                </p>
              </div>
              <div className="formGroup">
                <FormField
                  label="Số điện thoại"
                  icon={Phone}
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                />
              </div>
              <div className="formGroup">
                <FormField
                  label="Tên bệnh viện"
                  icon={Building2}
                  value={doctorInfo?.clinicDefaultId?.name || "Chưa cập nhật"}
                  disabled={true}
                  onChange={() => {}}
                />
              </div>
              <div className="formGroup">
                <FormField
                  label="Địa chỉ bệnh viện"
                  icon={MapPin}
                  value={
                    doctorInfo?.clinicDefaultId?.address || "Chưa cập nhật"
                  }
                  disabled={true}
                  onChange={() => {}}
                />
              </div>
            </div>

            <div className="formActions">
              <button onClick={handleSave}>Lưu thay đổi</button>
            </div>
          </div>

          {/* Professional Information and Security - Side by Side */}
          <div className="twoColumnGrid">
            {/* Professional Information */}
            <div className="card">
              <div className="cardHeader">
                <div className="icon blue">
                  <Award size={20} />
                </div>
                <h2>Thông tin chuyên môn</h2>
              </div>

              {/* Years Experience Section */}
              <div style={{ marginBottom: "1.5rem" }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "0.5rem",
                    fontWeight: 600,
                    color: "var(--foreground)",
                  }}
                >
                  <Calendar size={16} style={{ color: "#06b6d4" }} />
                  Năm kinh nghiệm
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <div className="inputWrapper" style={{ flex: 1 }}>
                    <Calendar
                      size={18}
                      className="icon"
                      style={{ color: "#06b6d4" }}
                    />
                    <input
                      type="text"
                      value={
                        formData.yearsExperience === 0
                          ? ""
                          : formData.yearsExperience || ""
                      }
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow empty string or numbers only
                        if (value === "" || /^\d+$/.test(value)) {
                          if (value === "") {
                            handleInputChange("yearsExperience", 0);
                          } else {
                            const numValue = parseInt(value, 10);
                            // Allow typing, but cap at 100
                            if (numValue > 100) {
                              handleInputChange("yearsExperience", 100);
                            } else {
                              handleInputChange("yearsExperience", numValue);
                            }
                          }
                        }
                      }}
                      onBlur={(e) => {
                        // Ensure value is set to 0 if empty on blur
                        const value = e.target.value.trim();
                        if (value === "" || isNaN(parseInt(value, 10))) {
                          handleInputChange("yearsExperience", 0);
                        } else {
                          const numValue = parseInt(value, 10);
                          // Cap at 100 if exceeds limit
                          if (numValue > 100) {
                            handleInputChange("yearsExperience", 100);
                          } else if (numValue < 0) {
                            handleInputChange("yearsExperience", 0);
                          }
                        }
                      }}
                      placeholder="0"
                      style={{
                        flex: 1,
                        border: "none",
                        outline: "none",
                        padding: 0,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Education Level Section */}
              <div
                style={{
                  marginTop: "1.5rem",
                  paddingTop: "1.5rem",
                  borderTop: "1px solid var(--border)",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "0.5rem",
                    fontWeight: 600,
                    color: "var(--foreground)",
                  }}
                >
                  Trình độ học vấn *
                </label>
                <div className="inputWrapper">
                  <select
                    value={formData.educationLevel || ""}
                    onChange={(e) =>
                      handleInputChange("educationLevel", e.target.value)
                    }
                    required
                    style={{
                      flex: 1,
                      border: "none",
                      outline: "none",
                      padding: 0,
                      fontSize: "0.875rem",
                      fontFamily: "inherit",
                      background: "transparent",
                      cursor: "pointer",
                    }}
                  >
                    <option value="">Chọn trình độ học vấn</option>
                    <option value="Bác sĩ">Bác sĩ</option>
                    <option value="Thạc sĩ">Thạc sĩ</option>
                    <option value="Tiến sĩ">Tiến sĩ</option>
                    <option value="Phó Giáo Sư">Phó Giáo Sư</option>
                    <option value="Giáo Sư">Giáo Sư</option>
                  </select>
                </div>
              </div>

              {/* Bio Section */}
              <div
                style={{
                  marginTop: "1.5rem",
                  paddingTop: "1.5rem",
                  borderTop: "1px solid var(--border)",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "0.5rem",
                    fontWeight: 600,
                    color: "var(--foreground)",
                  }}
                >
                  <FileText size={16} style={{ color: "#06b6d4" }} />
                  Giới thiệu
                </label>
                <textarea
                  rows="4"
                  value={formData.bio}
                  onChange={(e) => handleInputChange("bio", e.target.value)}
                  placeholder="Nhập thông tin giới thiệu về bạn..."
                  className="textarea"
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    fontSize: "0.875rem",
                    fontFamily: "inherit",
                    resize: "vertical",
                  }}
                />
              </div>

              {/* License Certificate Image */}
              <div
                style={{
                  marginTop: "1.5rem",
                  paddingTop: "1.5rem",
                  borderTop: "1px solid var(--border)",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "0.75rem",
                    fontWeight: 600,
                    color: "var(--foreground)",
                  }}
                >
                  <Award size={16} style={{ color: "#06b6d4" }} />
                  Chứng chỉ hành nghề:
                </label>
                {doctorInfo?.licenseImageUrl ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "1rem",
                    }}
                  >
                    <Image
                      src={getImageUrl(doctorInfo.licenseImageUrl)}
                      alt="Chứng chỉ hành nghề"
                      width={200}
                      height={200}
                      style={{
                        objectFit: "cover",
                        borderRadius: "8px",
                        boxShadow: "var(--shadow-md)",
                      }}
                      preview={{
                        mask: "Xem ảnh",
                      }}
                    />
                    <input
                      type="file"
                      id="license-input"
                      accept="image/*"
                      onChange={handleLicenseImageChange}
                      disabled={uploadingLicense}
                      style={{ display: "none" }}
                    />
                    <label
                      htmlFor="license-input"
                      style={{
                        padding: "0.5rem 1rem",
                        borderRadius: "6px",
                        border: "1px solid var(--border)",
                        backgroundColor: "#fff",
                        cursor: uploadingLicense ? "not-allowed" : "pointer",
                        fontSize: "0.875rem",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        opacity: uploadingLicense ? 0.6 : 1,
                      }}
                    >
                      <Upload size={16} />
                      {uploadingLicense
                        ? "Đang tải lên..."
                        : "Thay đổi ảnh chứng chỉ"}
                    </label>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "1rem",
                      padding: "2rem",
                      border: "2px dashed var(--border)",
                      borderRadius: "8px",
                    }}
                  >
                    <Award size={48} style={{ color: "#ccc" }} />
                    <p
                      style={{
                        fontSize: "0.875rem",
                        color: "#666",
                        margin: 0,
                      }}
                    >
                      Chưa có ảnh chứng chỉ hành nghề
                    </p>
                    <input
                      type="file"
                      id="license-input"
                      accept="image/*"
                      onChange={handleLicenseImageChange}
                      disabled={uploadingLicense}
                      style={{ display: "none" }}
                    />
                    <label
                      htmlFor="license-input"
                      style={{
                        padding: "0.5rem 1rem",
                        borderRadius: "6px",
                        border: "1px solid var(--border)",
                        backgroundColor: "#fff",
                        cursor: uploadingLicense ? "not-allowed" : "pointer",
                        fontSize: "0.875rem",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        opacity: uploadingLicense ? 0.6 : 1,
                      }}
                    >
                      <Upload size={16} />
                      {uploadingLicense
                        ? "Đang tải lên..."
                        : "Tải ảnh chứng chỉ lên"}
                    </label>
                  </div>
                )}
                <p
                  style={{
                    marginTop: "0.5rem",
                    fontSize: "0.75rem",
                    color: "#666",
                    textAlign: "center",
                  }}
                >
                  JPG, PNG (Tối đa 5MB)
                </p>
              </div>

              {/* Save Button */}
              <div
                style={{
                  marginTop: "1.5rem",
                  paddingTop: "1.5rem",
                  borderTop: "1px solid var(--border)",
                }}
              >
                <button
                  onClick={handleSave}
                  style={{
                    width: "100%",
                    padding: "0.75rem 1.5rem",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: "#06b6d4",
                    color: "#fff",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "background-color 0.2s",
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = "#0891b2";
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = "#06b6d4";
                  }}
                >
                  Lưu thay đổi
                </button>
              </div>
            </div>

            {/* Security */}
            <div className="card">
              <div className="cardHeader">
                <div className="icon red">
                  <Lock size={20} />
                </div>
                <h2>Bảo mật</h2>
              </div>

              <div className="securitySection">
                <PasswordField
                  label="Mật khẩu hiện tại"
                  placeholder="Nhập mật khẩu hiện tại"
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    handlePasswordChange("currentPassword", e.target.value)
                  }
                  showPassword={showPassword}
                  onToggle={() => setShowPassword(!showPassword)}
                  error={passwordErrors.currentPassword}
                />
                <PasswordField
                  label="Mật khẩu mới"
                  placeholder="Nhập mật khẩu mới"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    handlePasswordChange("newPassword", e.target.value)
                  }
                  showPassword={showPassword}
                  onToggle={() => setShowPassword(!showPassword)}
                  error={passwordErrors.newPassword}
                />
                <PasswordField
                  label="Xác nhận mật khẩu mới"
                  placeholder="Nhập lại mật khẩu mới"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    handlePasswordChange("confirmPassword", e.target.value)
                  }
                  showPassword={showPassword}
                  onToggle={() => setShowPassword(!showPassword)}
                  error={passwordErrors.confirmPassword}
                />

                <button
                  className="securityButton"
                  onClick={handleChangePassword}
                >
                  Đổi mật khẩu
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper Components
const FormField = ({
  label,
  icon: Icon,
  type = "text",
  value,
  onChange,
  disabled = false,
}) => (
  <div className="formGroup">
    <label>{label}</label>
    <div className="inputWrapper">
      <Icon size={18} className="icon" />
      <input
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        style={
          disabled ? { backgroundColor: "#f5f5f5", cursor: "not-allowed" } : {}
        }
      />
    </div>
  </div>
);

FormField.propTypes = {
  label: PropTypes.string.isRequired,
  icon: PropTypes.elementType.isRequired,
  type: PropTypes.string,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

const InfoCard = ({ icon: Icon, title, content }) => (
  <div className="infoCard">
    <Icon className="icon" size={20} />
    <div className="content">
      <div className="title">{title}</div>
      <div className="value">{content}</div>
    </div>
  </div>
);

InfoCard.propTypes = {
  icon: PropTypes.elementType.isRequired,
  title: PropTypes.string.isRequired,
  content: PropTypes.string.isRequired,
};

const PasswordField = ({
  label,
  placeholder,
  value,
  onChange,
  showPassword,
  onToggle,
  error,
}) => (
  <div className="passwordField">
    <label>{label}</label>
    <div className={`inputWrapper ${error ? "error" : ""}`}>
      <Lock size={18} className="icon" />
      <input
        type={showPassword ? "text" : "password"}
        placeholder={placeholder}
        value={value || ""}
        onChange={onChange}
      />
      <i
        className={`bi ${
          showPassword ? "bi-eye-fill" : "bi-eye-slash-fill"
        } password-toggle`}
        onClick={onToggle}
      />
    </div>
    {error && <div className="error-text">{error}</div>}
  </div>
);

PasswordField.propTypes = {
  label: PropTypes.string.isRequired,
  placeholder: PropTypes.string.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  showPassword: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  error: PropTypes.string,
};

export default CaiDat;
