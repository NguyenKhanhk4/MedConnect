import React, { useState, useEffect } from "react";
import { User, Lock, CreditCard, Upload, Eye, EyeOff } from "lucide-react";
import { useUserProfile } from "../../../../hooks/useUserProfile";
import {
  updateCurrentPatientProfile,
  changePassword,
} from "../../../../lib/api";
import "./Settings.scss";

export function Settings() {
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
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Update form data when user profile loads
  useEffect(() => {
    if (userProfile) {
      // Format date for display (DD/MM/YYYY for date input)
      const formatDateForDisplay = (dateString) => {
        if (!dateString) return "";
        try {
          const date = new Date(dateString);
          if (isNaN(date.getTime())) return "";

          // Format as DD/MM/YYYY for date input
          const day = String(date.getDate()).padStart(2, "0");
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const year = date.getFullYear();

          return `${day}/${month}/${year}`;
        } catch (error) {
          return "";
        }
      };

      const newFormData = {
        fullName: userProfile.fullName || userProfile.displayName || "",
        phone: userProfile.phone || "",
        gender: userProfile.gender || "",
        email: userProfile.email || "",
        birthDate: formatDateForDisplay(userProfile.dob),
        bloodType: userProfile.bloodType || "",
        address: userProfile.address || "",
        allergies: userProfile.allergyNotes || "",
        // Thông tin cá nhân bổ sung
        ethnicity: userProfile.ethnicity || "",
        occupation: userProfile.occupation || "",
        citizenId: userProfile.citizenId || "",
        // Địa chỉ chi tiết
        houseNumber: userProfile.houseNumber || "",
        // Người đại diện
        representativeName: userProfile.representativeName || "",
        representativeCitizenId: userProfile.representativeCitizenId || "",
        representativeRelation: userProfile.representativeRelation || "",
        representativePhone: userProfile.representativePhone || "",
        // Tiền sử y tế
        medicalHistory: userProfile.medicalHistory || [],
        // Bảo hiểm y tế
        healthInsurance: userProfile.healthInsurance || "",
        healthInsuranceIssueDate: formatDateForDisplay(
          userProfile.healthInsuranceIssueDate
        ),
        healthInsuranceExpiryDate: formatDateForDisplay(
          userProfile.healthInsuranceExpiryDate
        ),
        // Ghi chú
        notes: userProfile.notes || "",
      };

      setFormData(newFormData);
    } else if (!profileLoading) {
      // If no user profile and not loading, set empty form to allow editing
      setFormData({
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
        // Địa chỉ chi tiết
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
      });
    }
  }, [userProfile, profileLoading]);

  const tabs = [
    { id: "profile", label: "Hồ sơ", icon: User },
    { id: "security", label: "Bảo mật", icon: Lock },
    { id: "payment", label: "Thanh toán", icon: CreditCard },
  ];

  const validateField = (field, value) => {
    const errors = {};

    switch (field) {
      case "fullName":
        if (!value?.trim()) {
          errors.fullName = "Họ và tên là bắt buộc";
        } else if (value.trim().length < 2) {
          errors.fullName = "Họ và tên phải có ít nhất 2 ký tự";
        }
        break;

      case "email":
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors.email = "Email không đúng định dạng";
        }
        break;

      case "healthInsuranceIssueDate":
        if (value) {
          const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
          if (!dateRegex.test(value)) {
            errors.healthInsuranceIssueDate =
              "Ngày cấp phải có định dạng DD/MM/YYYY";
          } else {
            const [, day, month, year] = value.match(dateRegex);
            const issueDate = new Date(year, month - 1, day);
            if (isNaN(issueDate.getTime())) {
              errors.healthInsuranceIssueDate = "Ngày cấp không hợp lệ";
            }
          }
        }
        break;

      case "healthInsuranceExpiryDate":
        if (value) {
          const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
          if (!dateRegex.test(value)) {
            errors.healthInsuranceExpiryDate =
              "Ngày hết hạn phải có định dạng DD/MM/YYYY";
          } else {
            const [, day, month, year] = value.match(dateRegex);
            const expiryDate = new Date(year, month - 1, day);
            if (isNaN(expiryDate.getTime())) {
              errors.healthInsuranceExpiryDate = "Ngày hết hạn không hợp lệ";
            }
          }
        }
        break;

      case "phone":
        if (
          value &&
          !/^(\+84|84|0)[1-9][0-9]{8,9}$/.test(value.replace(/\s/g, ""))
        ) {
          errors.phone = "Số điện thoại không đúng định dạng";
        }
        break;

      case "birthDate":
        if (value) {
          // Validate DD/MM/YYYY format
          const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
          if (!dateRegex.test(value)) {
            errors.birthDate = "Ngày sinh phải có định dạng DD/MM/YYYY";
          } else {
            const [, day, month, year] = value.match(dateRegex);
            const birthDate = new Date(year, month - 1, day);
            const today = new Date();
            const age = today.getFullYear() - birthDate.getFullYear();

            if (birthDate > today) {
              errors.birthDate = "Ngày sinh không thể là tương lai";
            } else if (age > 120) {
              errors.birthDate = "Tuổi không hợp lệ";
            } else if (isNaN(birthDate.getTime())) {
              errors.birthDate = "Ngày sinh không hợp lệ";
            }
          }
        }
        break;

      case "citizenId":
        if (value && !/^[0-9]{12}$/.test(value)) {
          errors.citizenId = "Căn cước công dân phải có đúng 12 chữ số";
        }
        break;

      case "representativeCitizenId":
        if (value && !/^[0-9]{9,12}$/.test(value)) {
          errors.representativeCitizenId =
            "CCCD/CMND người đại diện phải có 9-12 chữ số";
        }
        break;

      case "representativePhone":
        if (
          value &&
          !/^(\+84|84|0)[1-9][0-9]{8,9}$/.test(value.replace(/\s/g, ""))
        ) {
          errors.representativePhone =
            "Số điện thoại người đại diện không đúng định dạng";
        }
        break;

      case "representativeName":
        if (value && value.trim().length < 2) {
          errors.representativeName =
            "Họ tên người đại diện phải có ít nhất 2 ký tự";
        } else if (value && value.length > 100) {
          errors.representativeName =
            "Họ tên người đại diện không được quá 100 ký tự";
        } else if (value && !/^[a-zA-ZÀ-ỹ\s]+$/.test(value)) {
          errors.representativeName =
            "Họ tên chỉ được chứa chữ cái và khoảng trắng";
        }
        break;

      case "allergies":
        if (value && value.length > 500) {
          errors.allergies = "Ghi chú dị ứng không được quá 500 ký tự";
        }
        break;

      case "notes":
        if (value && value.length > 1000) {
          errors.notes = "Ghi chú không được quá 1000 ký tự";
        }
        break;

      case "currentPassword":
        if (value && value.length < 6) {
          errors.currentPassword = "Mật khẩu hiện tại phải có ít nhất 6 ký tự";
        }
        break;

      case "newPassword":
        if (value && value.length < 8) {
          errors.newPassword = "Mật khẩu mới phải có ít nhất 8 ký tự";
        } else if (value && value.length > 50) {
          errors.newPassword = "Mật khẩu mới không được quá 50 ký tự";
        } else if (
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

    // Auto-format birth date: DD/MM/YYYY
    if (
      field === "birthDate" ||
      field === "healthInsuranceIssueDate" ||
      field === "healthInsuranceExpiryDate"
    ) {
      // Remove all non-digit characters
      const digitsOnly = value.replace(/\D/g, "");

      // Limit to 8 digits (DDMMYYYY)
      const limitedDigits = digitsOnly.slice(0, 8);

      // Format: DD/MM/YYYY
      if (limitedDigits.length <= 2) {
        // DD
        processedValue = limitedDigits;
      } else if (limitedDigits.length <= 4) {
        // DD/MM
        processedValue = `${limitedDigits.slice(0, 2)}/${limitedDigits.slice(
          2
        )}`;
      } else {
        // DD/MM/YYYY
        processedValue = `${limitedDigits.slice(0, 2)}/${limitedDigits.slice(
          2,
          4
        )}/${limitedDigits.slice(4)}`;
      }
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
    if (!formData.fullName?.trim()) {
      errors.fullName = "Họ và tên là bắt buộc";
    } else if (formData.fullName.trim().length < 2) {
      errors.fullName = "Họ và tên phải có ít nhất 2 ký tự";
    }

    // Validate email format
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Email không đúng định dạng";
    }

    // Validate phone format (Vietnamese phone numbers)
    if (
      formData.phone &&
      !/^(\+84|84|0)[1-9][0-9]{8,9}$/.test(formData.phone.replace(/\s/g, ""))
    ) {
      errors.phone = "Số điện thoại không đúng định dạng";
    }

    // Validate date of birth
    if (formData.birthDate) {
      const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
      if (!dateRegex.test(formData.birthDate)) {
        errors.birthDate = "Ngày sinh phải có định dạng DD/MM/YYYY";
      } else {
        const [, day, month, year] = formData.birthDate.match(dateRegex);
        const birthDate = new Date(year, month - 1, day);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();

        if (birthDate > today) {
          errors.birthDate = "Ngày sinh không thể là tương lai";
        } else if (age > 120) {
          errors.birthDate = "Tuổi không hợp lệ";
        } else if (isNaN(birthDate.getTime())) {
          errors.birthDate = "Ngày sinh không hợp lệ";
        }
      }
    }

    // Validate health insurance issue date
    if (formData.healthInsuranceIssueDate) {
      const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
      if (!dateRegex.test(formData.healthInsuranceIssueDate)) {
        errors.healthInsuranceIssueDate =
          "Ngày cấp phải có định dạng DD/MM/YYYY";
      } else {
        const [, day, month, year] =
          formData.healthInsuranceIssueDate.match(dateRegex);
        const issueDate = new Date(year, month - 1, day);
        if (isNaN(issueDate.getTime())) {
          errors.healthInsuranceIssueDate = "Ngày cấp không hợp lệ";
        }
      }
    }

    // Validate health insurance expiry date
    if (formData.healthInsuranceExpiryDate) {
      const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
      if (!dateRegex.test(formData.healthInsuranceExpiryDate)) {
        errors.healthInsuranceExpiryDate =
          "Ngày hết hạn phải có định dạng DD/MM/YYYY";
      } else {
        const [, day, month, year] =
          formData.healthInsuranceExpiryDate.match(dateRegex);
        const expiryDate = new Date(year, month - 1, day);
        if (isNaN(expiryDate.getTime())) {
          errors.healthInsuranceExpiryDate = "Ngày hết hạn không hợp lệ";
        } else if (formData.healthInsuranceIssueDate) {
          // Check if expiry date is after issue date
          const issueDateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
          if (issueDateRegex.test(formData.healthInsuranceIssueDate)) {
            const [, issueDay, issueMonth, issueYear] =
              formData.healthInsuranceIssueDate.match(issueDateRegex);
            const issueDate = new Date(issueYear, issueMonth - 1, issueDay);
            if (expiryDate <= issueDate) {
              errors.healthInsuranceExpiryDate =
                "Ngày hết hạn phải sau ngày cấp";
            }
          }
        }
      }
    }

    // Validate citizen ID format (Vietnamese CCCD - must be exactly 12 digits)
    if (formData.citizenId && !/^[0-9]{12}$/.test(formData.citizenId)) {
      errors.citizenId = "Căn cước công dân phải có đúng 12 chữ số";
    }

    // Validate representative citizen ID
    if (
      formData.representativeCitizenId &&
      !/^[0-9]{9,12}$/.test(formData.representativeCitizenId)
    ) {
      errors.representativeCitizenId =
        "CCCD/CMND người đại diện phải có 9-12 chữ số";
    }

    // Validate representative phone
    if (
      formData.representativePhone &&
      !/^(\+84|84|0)[1-9][0-9]{8,9}$/.test(
        formData.representativePhone.replace(/\s/g, "")
      )
    ) {
      errors.representativePhone =
        "Số điện thoại người đại diện không đúng định dạng";
    }

    // Validate representative name
    if (formData.representativeName) {
      if (formData.representativeName.trim().length < 2) {
        errors.representativeName =
          "Họ tên người đại diện phải có ít nhất 2 ký tự";
      } else if (formData.representativeName.length > 100) {
        errors.representativeName =
          "Họ tên người đại diện không được quá 100 ký tự";
      } else if (!/^[a-zA-ZÀ-ỹ\s]+$/.test(formData.representativeName)) {
        errors.representativeName =
          "Họ tên chỉ được chứa chữ cái và khoảng trắng";
      }
    }

    // Validate allergy notes length
    if (formData.allergies && formData.allergies.length > 500) {
      errors.allergies = "Ghi chú dị ứng không được quá 500 ký tự";
    }

    // Validate notes length
    if (formData.notes && formData.notes.length > 1000) {
      errors.notes = "Ghi chú không được quá 1000 ký tự";
    }

    return errors;
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // Validate form data
      const validationErrors = validateForm();
      if (Object.keys(validationErrors).length > 0) {
        alert(
          "Vui lòng kiểm tra lại thông tin:\n" +
            Object.values(validationErrors).join("\n")
        );
        return;
      }

      // Format date for API (convert DD/MM/YYYY to ISO string)
      const formatDateForAPI = (dateString) => {
        if (!dateString) return null;
        try {
          // Handle DD/MM/YYYY format from text input
          const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
          if (dateRegex.test(dateString)) {
            const [, day, month, year] = dateString.match(dateRegex);
            const date = new Date(year, month - 1, day);
            if (isNaN(date.getTime())) return null;
            return date.toISOString();
          }
          return null;
        } catch (error) {
          return null;
        }
      };

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
      alert("Cập nhật thông tin thành công!");
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Có lỗi xảy ra khi cập nhật thông tin. Vui lòng thử lại.");
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

        alert("Đổi mật khẩu thành công!");
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
            alert(errorMessage || "Có lỗi xảy ra khi đổi mật khẩu");
          }
        } else {
          alert(
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

    // Check file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      alert("Chỉ chấp nhận file ảnh (JPG, PNG, WebP)");
      return;
    }

    setUploadingAvatar(true);
    try {
      // Resize image
      const compressedImage = await resizeImage(file, 800, 800, 0.8);

      // Update avatar via API
      await updateCurrentPatientProfile({ avatarUrl: compressedImage });

      // Refresh profile
      await refreshProfile();

      // Dispatch custom event to update sidebar/header if needed
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
                      onKeyDown={(e) => {
                        // Allow: backspace, delete, tab, escape, enter, and numbers
                        if (
                          [46, 8, 9, 27, 13, 110, 190].indexOf(e.keyCode) !==
                            -1 ||
                          // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
                          (e.keyCode === 65 && e.ctrlKey === true) ||
                          (e.keyCode === 67 && e.ctrlKey === true) ||
                          (e.keyCode === 86 && e.ctrlKey === true) ||
                          (e.keyCode === 88 && e.ctrlKey === true) ||
                          // Allow: home, end, left, right, down, up
                          (e.keyCode >= 35 && e.keyCode <= 40)
                        ) {
                          return;
                        }
                        // Ensure that it is a number and stop the keypress
                        if (
                          (e.shiftKey || e.keyCode < 48 || e.keyCode > 57) &&
                          (e.keyCode < 96 || e.keyCode > 105)
                        ) {
                          e.preventDefault();
                        }
                      }}
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
                      onKeyDown={(e) => {
                        // Allow: backspace, delete, tab, escape, enter, and numbers
                        if (
                          [46, 8, 9, 27, 13, 110, 190].indexOf(e.keyCode) !==
                            -1 ||
                          // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
                          (e.keyCode === 65 && e.ctrlKey === true) ||
                          (e.keyCode === 67 && e.ctrlKey === true) ||
                          (e.keyCode === 86 && e.ctrlKey === true) ||
                          (e.keyCode === 88 && e.ctrlKey === true) ||
                          // Allow: home, end, left, right, down, up
                          (e.keyCode >= 35 && e.keyCode <= 40)
                        ) {
                          return;
                        }
                        // Ensure that it is a number and stop the keypress
                        if (
                          (e.shiftKey || e.keyCode < 48 || e.keyCode > 57) &&
                          (e.keyCode < 96 || e.keyCode > 105)
                        ) {
                          e.preventDefault();
                        }
                      }}
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
                      onKeyDown={(e) => {
                        // Allow: backspace, delete, tab, escape, enter, and numbers
                        if (
                          [46, 8, 9, 27, 13, 110, 190].indexOf(e.keyCode) !==
                            -1 ||
                          // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
                          (e.keyCode === 65 && e.ctrlKey === true) ||
                          (e.keyCode === 67 && e.ctrlKey === true) ||
                          (e.keyCode === 86 && e.ctrlKey === true) ||
                          (e.keyCode === 88 && e.ctrlKey === true) ||
                          // Allow: home, end, left, right, down, up
                          (e.keyCode >= 35 && e.keyCode <= 40)
                        ) {
                          return;
                        }
                        // Ensure that it is a number and stop the keypress
                        if (
                          (e.shiftKey || e.keyCode < 48 || e.keyCode > 57) &&
                          (e.keyCode < 96 || e.keyCode > 105)
                        ) {
                          e.preventDefault();
                        }
                      }}
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
                    type={showCurrentPassword ? "text" : "password"}
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
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? <Eye /> : <EyeOff />}
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
                    type={showNewPassword ? "text" : "password"}
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
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <Eye /> : <EyeOff />}
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
                    type={showConfirmPassword ? "text" : "password"}
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
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <Eye /> : <EyeOff />}
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

        {activeTab === "payment" && (
          <div className="payment-section">
            <div className="section-header">
              <h2 className="section-title">Thông tin thanh toán</h2>
              <p className="section-subtitle">
                Quản lý phương thức thanh toán và hóa đơn
              </p>
            </div>

            <div className="payment-settings">
              <div className="payment-item">
                <div className="payment-info">
                  <h3 className="payment-title">Phương thức thanh toán</h3>
                  <p className="payment-description">
                    Quản lý thẻ tín dụng, ví điện tử
                  </p>
                </div>
                <button className="payment-button">Quản lý</button>
              </div>

              <div className="payment-item">
                <div className="payment-info">
                  <h3 className="payment-title">Lịch sử thanh toán</h3>
                  <p className="payment-description">
                    Xem tất cả giao dịch và hóa đơn
                  </p>
                </div>
                <button className="payment-button">Xem lịch sử</button>
              </div>

              <div className="payment-item">
                <div className="payment-info">
                  <h3 className="payment-title">Hóa đơn điện tử</h3>
                  <p className="payment-description">
                    Tải xuống hóa đơn và biên lai
                  </p>
                </div>
                <button className="payment-button">Tải xuống</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
