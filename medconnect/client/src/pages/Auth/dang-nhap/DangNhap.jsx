import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { auth, signInWithGoogle } from "../../../lib/firebase";
import { signInWithCustomToken, signOut, updateProfile } from "firebase/auth";
import "./DangNhap.scss";

export default function DangNhap() {
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [emailValid, setEmailValid] = useState(false);
  const [phoneValid, setPhoneValid] = useState(false);
  const [passwordValid, setPasswordValid] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
  const setAuthAllowed = (v) =>
    v
      ? sessionStorage.setItem("auth_allowed", "1")
      : sessionStorage.removeItem("auth_allowed");

  const toE164 = (raw, country = "+84") => {
    const num = String(raw || "").replace(/\D/g, "");
    if (!num) return "";
    if (country === "+84" && num.startsWith("0")) return country + num.slice(1);
    if (num.startsWith("+")) return num;
    return country + num;
  };
  const isValidEmail = (v) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(v || "").trim());
  const isValidVNPhone = (raw) => /^\+84\d{9}$/.test(toE164(raw));
  const isValidPassword = (v) => String(v || "").length >= 8;

  // Real-time validation functions
  const validateEmailRealTime = (value) => {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      setEmailError("");
      setEmailValid(false);
      return;
    }
    if (!isValidEmail(trimmedValue)) {
      setEmailError("Email không đúng định dạng");
      setEmailValid(false);
    } else {
      setEmailError("");
      setEmailValid(true);
    }
  };

  const validatePhoneRealTime = (value) => {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      setPhoneError("");
      setPhoneValid(false);
      return;
    }
    if (!isValidVNPhone(trimmedValue)) {
      setPhoneError("Số điện thoại không đúng định dạng (VD: 0xxxxxxxxx)");
      setPhoneValid(false);
    } else {
      setPhoneError("");
      setPhoneValid(true);
    }
  };

  const validatePasswordRealTime = (value) => {
    if (!value) {
      setPasswordError("");
      setPasswordValid(false);
      return;
    }
    if (!isValidPassword(value)) {
      setPasswordError("Mật khẩu phải tối thiểu 8 ký tự");
      setPasswordValid(false);
    } else {
      setPasswordError("");
      setPasswordValid(true);
    }
  };

  const goByRole = (role) => {
    // Check if user was redirected from a specific page
    const from = location.state?.from;
    const doctor = location.state?.doctor;

    if (from === "/dat-lich" || from === "/dat-lich/chon-thoi-gian") {
      // If coming from appointment booking, redirect back with doctor data
      if (from === "/dat-lich/chon-thoi-gian") {
        navigate("/dat-lich/chon-thoi-gian", {
          state: {
            doctor: doctor,
            specialization: doctor?.specializationIds?.[0] || null,
          },
        });
      } else {
        navigate("/dat-lich", {
          state: {
            doctor: doctor,
          },
        });
      }
      return;
    }

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
      case "MANAGER":
        navigate("/manager/trang-chu");
        break;
      default:
        navigate("/");
        break;
    }
  };

  async function passwordLogin(identifier, pwd) {
    setGeneralError("");

    const r = await fetch(`${apiUrl}/api/auth/login-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ identifier, password: pwd }),
    });

    const data = await r.json().catch(() => ({}));

    if (!r.ok) {
      if (r.status === 404) {
        setGeneralError("Bạn chưa có tài khoản. Vui lòng đăng ký tài khoản.");
        return;
      }
      if (r.status === 401)
        throw new Error("Email/SĐT hoặc mật khẩu không đúng");
      throw new Error(data?.message || data?.error || "Không đăng nhập được");
    }

    const token = data?.customToken ?? data?.data?.customToken;
    const roleFromLogin = data?.role ?? data?.data?.role;
    const fullNameFromLogin =
      data?.user?.fullName ?? data?.data?.user?.fullName;

    if (!token) throw new Error("Thiếu customToken từ server");

    const cred = await signInWithCustomToken(auth, token);

    if (fullNameFromLogin) {
      try {
        await updateProfile(cred.user, { displayName: fullNameFromLogin });
      } catch (err) {
        console.warn("updateProfile failed:", err);
      }
    }

    const idToken = await cred.user.getIdToken();

    const r2 = await fetch(`${apiUrl}/api/auth/session`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    if (!r2.ok) throw new Error("Không tạo được phiên đăng nhập");

    let roleFromMe;
    let fullNameFromMe;

    try {
      const meRes = await fetch(`${apiUrl}/api/auth/me`, {
        credentials: "include",
      });
      const meData = await meRes.json().catch(() => ({}));
      roleFromMe = meData?.data?.user?.role ?? meData?.user?.role ?? null;
      fullNameFromMe =
        meData?.data?.profile?.fullName ?? meData?.profile?.fullName ?? null;
      const finalName = fullNameFromLogin || fullNameFromMe || "";
      if (finalName) sessionStorage.setItem("mc_fullname", finalName);
    } catch (err) {
      console.warn("Fetch /me failed:", err);
    }

    const finalRole = roleFromLogin ?? roleFromMe;
    if (!finalRole) {
      setGeneralError("Không xác định được vai trò người dùng.");
      return;
    }

    setAuthAllowed(true);
    goByRole(finalRole);
  }

  const validateForm = () => {
    let isValid = true;

    // Clear previous errors
    setEmailError("");
    setPhoneError("");
    setPasswordError("");
    setGeneralError("");

    // Validate password
    if (!password.trim()) {
      setPasswordError("Vui lòng nhập mật khẩu");
      setPasswordValid(false);
      isValid = false;
    } else if (!isValidPassword(password)) {
      setPasswordError("Mật khẩu phải tối thiểu 8 ký tự");
      setPasswordValid(false);
      isValid = false;
    } else {
      setPasswordValid(true);
    }

    // Validate email or phone based on mode
    if (mode === "email") {
      if (!email.trim()) {
        setEmailError("Vui lòng nhập email");
        setEmailValid(false);
        isValid = false;
      } else if (!isValidEmail(email)) {
        setEmailError("Email không đúng định dạng");
        setEmailValid(false);
        isValid = false;
      } else {
        setEmailValid(true);
      }
    } else {
      if (!phone.trim()) {
        setPhoneError("Vui lòng nhập số điện thoại");
        setPhoneValid(false);
        isValid = false;
      } else if (!isValidVNPhone(phone)) {
        setPhoneError("Số điện thoại không đúng định dạng (VD: 0xxxxxxxxx)");
        setPhoneValid(false);
        isValid = false;
      } else {
        setPhoneValid(true);
      }
    }

    return isValid;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      setLoading(true);
      const identifier = mode === "email" ? email.trim() : toE164(phone);
      await passwordLogin(identifier, password);
    } catch (err) {
      console.error("Login error:", err);
      // Handle both string and object error messages
      let errorMessage = "Không đăng nhập được";
      if (typeof err?.message === "string") {
        errorMessage = err.message;
      } else if (typeof err === "string") {
        errorMessage = err;
      } else if (err?.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err?.data?.message) {
        errorMessage = err.data.message;
      }
      setGeneralError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    setLoading(true);
    setGeneralError("");
    try {
      const user = await signInWithGoogle();
      const idToken = await user.getIdToken();

      const r = await fetch(`${apiUrl}/api/auth/google-login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (r.status === 403) {
        setAuthAllowed(false);
        try {
          await signOut(auth);
        } catch (err) {
          setGeneralError("Bạn chưa có tài khoản. Vui lòng đăng ký tài khoản.");
        }
        return;
      }

      if (!r.ok) {
        setAuthAllowed(false);
        try {
          await signOut(auth);
        } catch (err) {
          throw new Error("Lỗi đăng nhập Google");
        }
      }

      const data = await r.json().catch(() => ({}));

      let roleFromMe;
      let fullNameFromMe;

      try {
        const meRes = await fetch(`${apiUrl}/api/auth/me`, {
          credentials: "include",
        });
        const meData = await meRes.json().catch(() => ({}));
        roleFromMe = meData?.data?.user?.role ?? meData?.user?.role ?? null;
        fullNameFromMe =
          meData?.data?.profile?.fullName ?? meData?.profile?.fullName ?? null;
        if (fullNameFromMe)
          sessionStorage.setItem("mc_fullname", fullNameFromMe);
      } catch (err) {
        console.warn("Fetch /me failed:", err);
      }

      const finalRole = data?.role ?? data?.data?.role ?? roleFromMe;
      if (!finalRole) {
        setGeneralError("Không xác định được vai trò người dùng.");
        return;
      }

      setAuthAllowed(true);
      goByRole(finalRole);
    } catch (err) {
      setAuthAllowed(false);
      try {
        await signOut(auth);
      } catch (err) {
        // Handle both string and object error messages
        let errorMessage = "Lỗi đăng nhập Google";
        if (typeof err?.message === "string") {
          errorMessage = err.message;
        } else if (typeof err === "string") {
          errorMessage = err;
        } else if (err?.response?.data?.message) {
          errorMessage = err.response.data.message;
        } else if (err?.data?.message) {
          errorMessage = err.data.message;
        }
        setGeneralError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <div aria-hidden className="login-bg" />
      <div aria-hidden className="login-overlay" />
      <div className="login-card login-center-fixed">
        <h1 className="login-title">Chào mừng đến với MedConnect</h1>
        <form onSubmit={onSubmit}>
          {mode === "email" ? (
            <>
              <div className="input-group">
                <input
                  className={`login-input ${
                    emailError
                      ? "input-error"
                      : emailValid
                      ? "input-success"
                      : ""
                  }`}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    validateEmailRealTime(e.target.value);
                  }}
                  onBlur={(e) => validateEmailRealTime(e.target.value)}
                  placeholder="Nhập địa chỉ email"
                  autoComplete="email"
                  type="email"
                />
                {emailValid && (
                  <i className="bi bi-check-circle-fill input-success-icon" />
                )}
                {emailError && (
                  <i className="bi bi-exclamation-circle-fill input-error-icon" />
                )}
              </div>
              {emailError && <div className="error-text">{emailError}</div>}
            </>
          ) : (
            <>
              <div className="input-group">
                <input
                  className={`login-input ${
                    phoneError
                      ? "input-error"
                      : phoneValid
                      ? "input-success"
                      : ""
                  }`}
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    validatePhoneRealTime(e.target.value);
                  }}
                  onBlur={(e) => validatePhoneRealTime(e.target.value)}
                  placeholder="Nhập số điện thoại "
                  autoComplete="tel"
                  type="tel"
                />
                {phoneValid && (
                  <i className="bi bi-check-circle-fill input-success-icon" />
                )}
                {phoneError && (
                  <i className="bi bi-exclamation-circle-fill input-error-icon" />
                )}
              </div>
              {phoneError && <div className="error-text">{phoneError}</div>}
            </>
          )}

          <div className="password-group">
            <div
              className={`input-group ${
                !passwordValid && !passwordError ? "no-validation-icon" : ""
              }`}
            >
              <input
                className={`login-input ${
                  passwordError
                    ? "input-error"
                    : passwordValid
                    ? "input-success"
                    : ""
                }`}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  validatePasswordRealTime(e.target.value);
                }}
                onBlur={(e) => validatePasswordRealTime(e.target.value)}
                placeholder="Nhập mật khẩu"
                autoComplete="current-password"
              />
              {passwordValid && (
                <i className="bi bi-check-circle-fill input-success-icon" />
              )}
              {passwordError && (
                <i className="bi bi-exclamation-circle-fill input-error-icon" />
              )}
              <button
                type="button"
                className={`bi ${
                  showPassword ? "bi-eye-fill" : "bi-eye-slash-fill"
                } password-toggle`}
                onClick={() => setShowPassword(!showPassword)}
                style={{ cursor: "pointer", zIndex: 10 }}
              />
            </div>
          </div>

          {passwordError && <div className="error-text">{passwordError}</div>}

          <button
            type="submit"
            disabled={
              loading ||
              !(mode === "email"
                ? emailValid && passwordValid
                : phoneValid && passwordValid)
            }
            className="btn btn-primary"
          >
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>

        <div className="separator">
          <span>Hoặc</span>
        </div>

        <div className="login-alt">
          <button
            type="button"
            onClick={() => setMode(mode === "email" ? "phone" : "email")}
            className="btn btn-outline btn-full"
          >
            <i className="bi bi-phone-vibrate" />
            {mode === "email"
              ? "Đăng nhập bằng điện thoại"
              : "Đăng nhập bằng email"}
          </button>

          <button
            type="button"
            onClick={onGoogle}
            disabled={loading}
            className="btn btn-google btn-full"
          >
            <i className="bi bi-google" />
            Đăng nhập bằng Google
          </button>
        </div>

        {generalError && <div className="error-text">{generalError}</div>}

        <div className="login-links">
          <div className="login-links-top">
            <Link to="/quen-mat-khau">Quên mật khẩu</Link>
            <Link to="/dang-ky">Đăng ký tài khoản mới</Link>
          </div>
          <Link to="/" className="home-link">
            {" "}
            Quay về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
