import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerDoctor, getAllSpecializations } from "../../../lib/api";
import "./DangKyBacSi.scss";

export default function DangKyBacSi() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    specialty: "",
    clinicDefaultId: "",
    license: null,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [specialties, setSpecialties] = useState([]);
  const [loadingSpecialties, setLoadingSpecialties] = useState(true);
  const [clinics, setClinics] = useState([]);
  const [loadingClinics, setLoadingClinics] = useState(true);

  const toE164 = (raw, country = "+84") => {
    const num = String(raw || "").replace(/\D/g, "");
    if (!num) return "";
    if (country === "+84" && num.startsWith("0")) return country + num.slice(1);
    if (num.startsWith("+")) return num;
    return country + num;
  };

  // Fetch specializations from database
  useEffect(() => {
    const fetchSpecializations = async () => {
      try {
        setLoadingSpecialties(true);
        const response = await getAllSpecializations();

        // Handle different response formats
        let specs = [];
        if (response.success) {
          // Format: { success: true, data: [...] }
          if (Array.isArray(response.data)) {
            specs = response.data;
          } else if (response.data?.specializations) {
            // Format: { success: true, data: { specializations: [...] } }
            specs = response.data.specializations;
          } else if (response.specializations) {
            // Format: { success: true, specializations: [...] }
            specs = response.specializations;
          }
        } else if (Array.isArray(response)) {
          // Direct array response
          specs = response;
        }

        // Sort by name for better UX
        specs.sort((a, b) => {
          const nameA = a.name || "";
          const nameB = b.name || "";
          return nameA.localeCompare(nameB);
        });

        setSpecialties(specs);
      } catch (error) {
        console.error("Error fetching specializations:", error);
        // Fallback to empty array if API fails
        setSpecialties([]);
      } finally {
        setLoadingSpecialties(false);
      }
    };

    fetchSpecializations();
  }, []);

  // Fetch clinics from database
  useEffect(() => {
    const fetchClinics = async () => {
      try {
        setLoadingClinics(true);
        const BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";
        const response = await fetch(`${BASE}/api/clinics?limit=1000`, {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          let clinicsArray = [];

          if (data.success && data.data) {
            if (Array.isArray(data.data.clinics)) {
              clinicsArray = data.data.clinics;
            } else if (Array.isArray(data.clinics)) {
              clinicsArray = data.clinics;
            }
          }

          // Sort by name for better UX
          clinicsArray.sort((a, b) => {
            const nameA = a.name || "";
            const nameB = b.name || "";
            return nameA.localeCompare(nameB);
          });

          setClinics(clinicsArray);
        } else {
          setClinics([]);
        }
      } catch (error) {
        console.error("Error fetching clinics:", error);
        setClinics([]);
      } finally {
        setLoadingClinics(false);
      }
    };

    fetchClinics();
  }, []);

  const isValidEmail = (v) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(v || "").trim());
  const isValidVNPhone = (raw) => /^\+84\d{9}$/.test(toE164(raw));
  const isValidPassword = (v) => String(v || "").length >= 8;
  const isValidName = (v) => String(v || "").trim().length >= 2;

  const validateForm = () => {
    const newErrors = {};

    // Validate full name
    if (!formData.fullName.trim()) {
      newErrors.fullName = "Vui lòng nhập họ và tên.";
    } else if (!isValidName(formData.fullName)) {
      newErrors.fullName = "Họ và tên phải có ít nhất 2 ký tự.";
    }

    // Validate phone
    if (!formData.phone.trim()) {
      newErrors.phone = "Vui lòng nhập số điện thoại.";
    } else if (!isValidVNPhone(formData.phone)) {
      newErrors.phone =
        "Số điện thoại không đúng định dạng (VD: 0xxxxxxxxx hoặc +84xxxxxxxxx).";
    }

    // Validate email
    if (!formData.email.trim()) {
      newErrors.email = "Vui lòng nhập email.";
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = "Email không đúng định dạng.";
    }

    // Validate password
    if (!formData.password.trim()) {
      newErrors.password = "Vui lòng nhập mật khẩu.";
    } else if (!isValidPassword(formData.password)) {
      newErrors.password = "Mật khẩu phải tối thiểu 8 ký tự.";
    }

    // Validate confirm password
    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = "Vui lòng xác nhận mật khẩu.";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Mật khẩu xác nhận không khớp.";
    }

    // Validate specialty
    if (!formData.specialty.trim()) {
      newErrors.specialty = "Vui lòng chọn chuyên khoa.";
    }

    // Validate clinic
    if (!formData.clinicDefaultId.trim()) {
      newErrors.clinicDefaultId = "Vui lòng chọn địa chỉ khám.";
    }

    // Validate license image
    if (!formData.license) {
      newErrors.license = "Vui lòng upload ảnh chứng chỉ hành nghề.";
    } else {
      // Check file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (formData.license.size > maxSize) {
        newErrors.license = "Kích thước ảnh không được vượt quá 5MB.";
      }

      // Check file type
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
      ];
      if (!allowedTypes.includes(formData.license.type)) {
        newErrors.license = "Chỉ chấp nhận file ảnh (JPG, PNG, WebP).";
      }
    }

    // Validate consents
    if (!acceptedTerms) {
      newErrors.acceptedTerms = "Bạn cần đồng ý Điều khoản sử dụng.";
    }
    if (!acceptedPrivacy) {
      newErrors.acceptedPrivacy = "Bạn cần đồng ý Chính sách bảo mật.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value, type, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "file" ? files[0] : value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setLoading(true);

      // Prepare form data for API
      const formDataToSend = new FormData();
      formDataToSend.append("fullName", formData.fullName);
      formDataToSend.append("email", formData.email);
      formDataToSend.append("phone", toE164(formData.phone));
      formDataToSend.append("password", formData.password);
      formDataToSend.append("specialty", formData.specialty);
      if (formData.clinicDefaultId) {
        formDataToSend.append("clinicDefaultId", formData.clinicDefaultId);
      }
      if (formData.license) {
        formDataToSend.append("license", formData.license);
      }

      // Call API to register doctor
      await registerDoctor(formDataToSend);

      // Show success message
      alert(
        "Đăng ký thành công! Vui lòng đợi hệ thống xác nhận tài khoản của bạn. Bạn sẽ nhận được email thông báo khi tài khoản được xác nhận."
      );

      // Reset form and clear state
      setFormData({
        fullName: "",
        phone: "",
        email: "",
        password: "",
        confirmPassword: "",
        specialty: "",
        clinicDefaultId: "",
        license: null,
      });
      setAcceptedTerms(false);
      setAcceptedPrivacy(false);
      setErrors({});

      // Redirect to homepage after 3 seconds
      setTimeout(() => {
        navigate("/");
      }, 3000);
    } catch (err) {
      console.error("Registration error:", err);

      // Parse error message from API response
      let errorMessage = "Có lỗi xảy ra khi đăng ký. Vui lòng thử lại.";
      try {
        // Try to parse JSON error response
        const errorText = err.message || "";
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          // If parsing fails, try to extract message from string
          const match = errorText.match(/"message"\s*:\s*"([^"]+)"/);
          if (match) {
            errorData = { message: match[1] };
          } else {
            errorData = { message: errorText };
          }
        }

        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (parseErr) {
        // If not JSON, use the error message as is
        if (err.message && err.message !== "[object Object]") {
          errorMessage = err.message;
        }
      }

      // Map common error messages to Vietnamese
      const errorMap = {
        "Email already exists":
          "Email này đã được sử dụng. Vui lòng sử dụng email khác",
        "Phone number already exists":
          "Số điện thoại này đã được sử dụng. Vui lòng sử dụng số điện thoại khác",
        "Email này đã được sử dụng. Vui lòng sử dụng email khác":
          "Email này đã được sử dụng. Vui lòng sử dụng email khác",
        "Số điện thoại này đã được sử dụng. Vui lòng sử dụng số điện thoại khác":
          "Số điện thoại này đã được sử dụng. Vui lòng sử dụng số điện thoại khác",
      };

      if (errorMap[errorMessage]) {
        errorMessage = errorMap[errorMessage];
      }

      setErrors({
        general: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="doctor-register-wrap">
      <div aria-hidden className="doctor-register-bg" />
      <div aria-hidden className="doctor-register-overlay" />

      <div className="doctor-register-card doctor-register-center-fixed">
        <h1 className="doctor-register-title">ĐĂNG KÝ TÀI KHOẢN BÁC SĨ</h1>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="fullName" className="form-label">
              Họ và tên <span className="required">*</span>
            </label>
            <input
              className="doctor-register-input"
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              placeholder="Nhập họ và tên"
              autoComplete="name"
            />
            {errors.fullName && (
              <div className="error-text">{errors.fullName}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="phone" className="form-label">
              Số điện thoại <span className="required">*</span>
            </label>
            <input
              className="doctor-register-input"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="Nhập số điện thoại"
              autoComplete="tel"
            />
            {errors.phone && <div className="error-text">{errors.phone}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email <span className="required">*</span>
            </label>
            <input
              className="doctor-register-input"
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Nhập địa chỉ email"
              autoComplete="email"
            />
            {errors.email && <div className="error-text">{errors.email}</div>}
          </div>

          <div className="form-group password-field">
            <label htmlFor="password" className="form-label">
              Mật khẩu <span className="required">*</span>
            </label>
            <div className="input-wrapper">
              <input
                className="doctor-register-input"
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Nhập mật khẩu"
                autoComplete="new-password"
              />
              <button
                type="button"
                className={`bi ${
                  showPassword ? "bi-eye-fill" : "bi-eye-slash-fill"
                } password-toggle`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowPassword(!showPassword);
                }}
                onMouseUp={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                style={{ border: "none", background: "none", outline: "none" }}
              />
            </div>
            {errors.password && (
              <div className="error-text">{errors.password}</div>
            )}
          </div>

          <div className="form-group password-field">
            <label htmlFor="confirmPassword" className="form-label">
              Xác nhận mật khẩu <span className="required">*</span>
            </label>
            <div className="input-wrapper">
              <input
                className="doctor-register-input"
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Xác nhận mật khẩu"
                autoComplete="new-password"
              />
              <button
                type="button"
                className={`bi ${
                  showConfirmPassword ? "bi-eye-fill" : "bi-eye-slash-fill"
                } password-toggle`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowConfirmPassword(!showConfirmPassword);
                }}
                onMouseUp={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                style={{ border: "none", background: "none", outline: "none" }}
              />
            </div>
            {errors.confirmPassword && (
              <div className="error-text">{errors.confirmPassword}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="specialty" className="form-label">
              Chuyên khoa <span className="required">*</span>
            </label>
            <select
              className="doctor-register-input"
              id="specialty"
              name="specialty"
              value={formData.specialty}
              onChange={handleInputChange}
              disabled={loadingSpecialties}
            >
              <option value="">
                {loadingSpecialties
                  ? "Đang tải chuyên khoa..."
                  : "Chọn chuyên khoa"}
              </option>
              {specialties.map((specialty) => (
                <option
                  key={specialty._id || specialty.id || specialty.name}
                  value={specialty._id || specialty.id || specialty.name}
                >
                  {specialty.name}
                </option>
              ))}
            </select>
            {errors.specialty && (
              <div className="error-text">{errors.specialty}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="clinicDefaultId" className="form-label">
              Địa chỉ khám <span className="required">*</span>
            </label>
            <select
              className="doctor-register-input"
              id="clinicDefaultId"
              name="clinicDefaultId"
              value={formData.clinicDefaultId}
              onChange={handleInputChange}
              disabled={loadingClinics}
            >
              <option value="">
                {loadingClinics
                  ? "Đang tải địa chỉ khám..."
                  : "Chọn địa chỉ khám"}
              </option>
              {clinics.map((clinic) => (
                <option
                  key={clinic.id || clinic._id}
                  value={clinic.id || clinic._id}
                >
                  {clinic.name} - {clinic.address || "Chưa có địa chỉ"}
                </option>
              ))}
            </select>
            {errors.clinicDefaultId && (
              <div className="error-text">{errors.clinicDefaultId}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="license" className="form-label">
              Ảnh chứng chỉ hành nghề <span className="required">*</span>
            </label>
            <div className="file-upload-group">
              <input
                type="file"
                id="license"
                name="license"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleInputChange}
                className="file-input"
              />
              <label htmlFor="license" className="file-upload-label">
                <i className="bi bi-cloud-upload"></i>
                <span>
                  {formData.license
                    ? formData.license.name
                    : "Chọn ảnh chứng chỉ hành nghề (JPG, PNG, WebP - Tối đa 5MB)"}
                </span>
              </label>
            </div>
            {errors.license && (
              <div className="error-text">{errors.license}</div>
            )}
          </div>

          <div className="consent">
            <label className="consent-row">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
              />
              <span>
                Tôi đã đọc và đồng ý với {""}
                <Link
                  to="/dieu-khoan-su-dung"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Điều khoản sử dụng
                </Link>
              </span>
            </label>
            {errors.acceptedTerms && (
              <div className="error-text">{errors.acceptedTerms}</div>
            )}

            <label className="consent-row">
              <input
                type="checkbox"
                checked={acceptedPrivacy}
                onChange={(e) => setAcceptedPrivacy(e.target.checked)}
              />
              <span>
                Tôi đồng ý với {""}
                <Link
                  to="/chinh-sach-bao-mat"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Chính sách bảo mật
                </Link>
              </span>
            </label>
            {errors.acceptedPrivacy && (
              <div className="error-text">{errors.acceptedPrivacy}</div>
            )}
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? "Đang xử lý..." : "ĐĂNG KÝ"}
          </button>
        </form>

        {errors.general && <div className="error-text">{errors.general}</div>}

        <div className="doctor-register-links">
          <Link to="/dang-nhap">Đã có tài khoản? Đăng nhập</Link>
          <Link to="/" className="home-link">
            {" "}
            Quay về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
