import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, signInWithGoogle } from "../../lib/firebase";
import { signInWithCustomToken, signOut } from "firebase/auth";
import "./Register.scss";

export default function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  const toE164 = (raw, country = "+84") => {
    const num = String(raw || "").replace(/\D/g, "");
    if (!num) return "";
    if (country === "+84" && num.startsWith("0")) return country + num.slice(1);
    if (num.startsWith("+")) return num;
    return country + num;
  };

  // Normalize error to readable string for UI
  const getErrorMessage = (err) => {
    if (!err) return "Có lỗi xảy ra";
    if (typeof err === "string") return err;
    if (err.message) {
      return typeof err.message === "string"
        ? err.message
        : JSON.stringify(err.message);
    }
    if (err.error) {
      return typeof err.error === "string"
        ? err.error
        : JSON.stringify(err.error);
    }
    try {
      return JSON.stringify(err);
    } catch (e) {
      return String(err);
    }
  };

  const isValidEmail = (v) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(v || "").trim());
  const isValidVNPhone = (raw) => /^\+84\d{9}$/.test(toE164(raw));
  const isValidPassword = (v) => String(v || "").length >= 8;
  const isValidName = (v) => String(v || "").trim().length >= 2;

  const goByRole = (role) => {
    switch ((role || "").toUpperCase()) {
      case "PATIENT":
        navigate("/benh-nhan/trang-chu");
        break;
      case "DOCTOR":
        navigate("/bac-si/trang-chu");
        break;
      case "ADMIN":
        navigate("/admin/trang-chu");
        break;
      default:
        navigate("/");
        break;
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Validate full name
    if (!formData.fullName.trim()) {
      newErrors.fullName = "Vui lòng nhập họ và tên.";
    } else if (!isValidName(formData.fullName)) {
      newErrors.fullName = "Họ và tên phải có ít nhất 2 ký tự.";
    }

    // Validate email
    if (!formData.email.trim()) {
      newErrors.email = "Vui lòng nhập email.";
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = "Email không đúng định dạng.";
    }

    // Validate phone
    if (!formData.phone.trim()) {
      newErrors.phone = "Vui lòng nhập số điện thoại.";
    } else if (!isValidVNPhone(formData.phone)) {
      newErrors.phone =
        "Số điện thoại không đúng định dạng (VD: 0xxxxxxxxx hoặc +84xxxxxxxxx).";
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
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
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
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

      const response = await fetch(apiUrl + "/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fullName: formData.fullName.trim(),
          email: formData.email.trim(),
          phone: toE164(formData.phone),
          password: formData.password,
          role: "PATIENT", // Mặc định là bệnh nhân
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 409) {
          setErrors({ general: "Email hoặc số điện thoại đã được sử dụng." });
          return;
        }
        // Try to show server provided message or error
        const serverMsg =
          data?.message ||
          data?.error ||
          JSON.stringify(data || "Không thể tạo tài khoản");
        setErrors({ general: serverMsg });
        return;
      }

      // For patients: automatically log in after registration
      // If server returned a customToken, sign in automatically
      if (data?.customToken && data?.role?.toLowerCase() === "patient") {
        try {
          const fbConfigured = Boolean(import.meta.env.VITE_FB_PROJECT_ID);
          if (fbConfigured) {
            // Sign in with Firebase custom token
            const cred = await signInWithCustomToken(auth, data.customToken);
            const idToken = await cred.user.getIdToken();

            // Create session cookie on backend
            const sessionResponse = await fetch(apiUrl + "/api/auth/session", {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ idToken }),
            });

            if (!sessionResponse.ok) {
              throw new Error("Không tạo được phiên đăng nhập");
            }

          } else {
            console.warn("Firebase not configured, skipping auto-login");
          }
        } catch (err) {
          console.error("Auto-login failed after registration:", err);
          // Still navigate - user can manually log in if needed
          // But for better UX, we should show an error message
          setErrors({
            general: "Đăng ký thành công nhưng không thể tự động đăng nhập. Vui lòng đăng nhập thủ công.",
          });
          setTimeout(() => {
            navigate("/dang-nhap");
          }, 2000);
          return;
        }
      }

      // Navigate to appropriate page based on role
      goByRole(data.role);
    } catch (err) {
      console.error("Registration error:", err);
      setErrors({
        general: getErrorMessage(err) || "Có lỗi xảy ra khi đăng ký",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setLoading(true);
    try {
      const user = await signInWithGoogle();
      const idToken = await user.getIdToken();

      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
      const response = await fetch(apiUrl + "/api/auth/google-register", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          fullName: user.displayName || "",
          role: "PATIENT", // Mặc định là bệnh nhân
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 409) {
        await signOut(auth);
        setErrors({ general: "Tài khoản Google này đã được đăng ký." });
        return;
      }

      if (!response.ok) {
        await signOut(auth);
        throw new Error("Lỗi đăng ký với Google");
      }

      // For patients: ensure session is created (backend should have done this)
      // But verify by checking if we need to create session manually
      if (data?.role?.toLowerCase() === "patient") {
        try {
          // Backend should have created session cookie, but verify
          // by checking if user is authenticated
          const currentUser = auth.currentUser;
          if (currentUser) {
            // Get fresh idToken and ensure session is created
            const freshIdToken = await currentUser.getIdToken();
            const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
            const sessionResponse = await fetch(apiUrl + "/api/auth/session", {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ idToken: freshIdToken }),
            });

            if (!sessionResponse.ok) {
              console.warn("Session creation failed, but continuing...");
            }
          }
        } catch (err) {
          console.warn("Auto-login verification failed:", err);
          // Continue anyway - backend may have already created session
        }
      }

      goByRole(data.role);
    } catch (err) {
      console.error("Google registration error:", err);
      setErrors({
        general: getErrorMessage(err) || "Có lỗi xảy ra khi đăng ký với Google",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-wrap">
      <div aria-hidden className="register-bg" />
      <div aria-hidden className="register-overlay" />

      <div className="register-card register-center-fixed">
        <h1 className="register-title">ĐĂNG KÝ CHO BỆNH NHÂN</h1>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="fullName" className="form-label">
              Họ và tên <span className="required">*</span>
            </label>
            <input
              className="register-input"
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
            <label htmlFor="email" className="form-label">
              Email <span className="required">*</span>
            </label>
            <input
              className="register-input"
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

          <div className="form-group">
            <label htmlFor="phone" className="form-label">
              Số điện thoại <span className="required">*</span>
            </label>
            <input
              className="register-input"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="Nhập số điện thoại"
              autoComplete="tel"
            />
            {errors.phone && <div className="error-text">{errors.phone}</div>}
          </div>

          <div className="form-group password-field">
            <label htmlFor="password" className="form-label">
              Mật khẩu <span className="required">*</span>
            </label>
            <div className="input-wrapper">
              <input
                className="register-input"
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
                className="register-input"
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

          <div className="consent">
            <label className="consent-row">
              <input
                type="checkbox"
                id="terms-checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                style={{
                  display: "block",
                  visibility: "visible",
                  opacity: 1,
                }}
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
                id="privacy-checkbox"
                checked={acceptedPrivacy}
                onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                style={{
                  display: "block",
                  visibility: "visible",
                  opacity: 1,
                }}
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
            Đăng ký
          </button>
        </form>

        <div className="separator">
          <span>Hoặc</span>
        </div>

        <div className="register-alt">
          <button
            type="button"
            onClick={handleGoogleRegister}
            disabled={loading}
            className="btn btn-google btn-full"
          >
            <i className="bi bi-google" />
            Đăng ký bằng Google
          </button>

          <button
            type="button"
            onClick={() => navigate("/dang-ky-bac-si")}
            className="btn btn-doctor btn-full"
          >
            <i className="bi bi-person-badge" />
            Đăng ký cho bác sĩ
          </button>
        </div>

        {errors.general && <div className="error-text">{errors.general}</div>}

        <div className="register-links">
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
