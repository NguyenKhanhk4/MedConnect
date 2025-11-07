import { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { resetPasswordWithToken } from "../../../services/userService";

export default function DatLaiMatKhau() {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const t = location.state?.token;
    const e = location.state?.email;
    console.log("ResetPassword - Received state:", { token: t, email: e });

    // Security: do NOT read token/email from localStorage. Require navigation state (in-memory)
    if (t && e) {
      setToken(t);
      setEmail(e);
      console.log("ResetPassword - Set token and email from state");
    } else {
      console.warn(
        "ResetPassword - Missing token or email in navigation state. Redirecting to forgot-password."
      );
      // If user arrived here without proper state (e.g., reload), redirect back to request OTP
      navigate("/quen-mat-khau");
    }
  }, [location.state]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    // Kiểm tra các trường bắt buộc
    if (!email) {
      setError("Vui lòng nhập email của bạn.");
      return;
    }
    if (!password) {
      setError("Vui lòng nhập mật khẩu mới.");
      return;
    }
    if (!confirm) {
      setError("Vui lòng xác nhận mật khẩu mới.");
      return;
    }
    if (password.length < 8) {
      setError("Mật khẩu phải có ít nhất 8 ký tự.");
      return;
    }
    if (password !== confirm) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    try {
      setLoading(true);
      console.log("ResetPassword - About to call API with:", {
        token: token ? token.substring(0, 20) + "..." : "NULL",
        email,
        password: "***",
        confirm: "***",
      });
      await resetPasswordWithToken(
        token.trim(),
        email.trim(),
        password,
        confirm
      );
      setMessage("Đổi mật khẩu thành công. Bạn có thể đăng nhập lại.");
      // No client-side persistent token to cleanup when using navigation state
      setTimeout(() => navigate("/dang-nhap"), 1000);
    } catch (err) {
      // Parse error message from server
      let errorMessage =
        "Không thể đặt lại mật khẩu. Mã xác thực không hợp lệ.";
      console.log("ResetPassword error:", err);
      try {
        const errorData = JSON.parse(err.message);
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // If parsing fails, use default message
        if (err.message) {
          errorMessage = err.message;
        }
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <div aria-hidden className="login-bg" />
      <div aria-hidden className="login-overlay" />
      <div className="login-card login-center-fixed">
        <h1 className="login-title">Đặt lại mật khẩu</h1>
        <form onSubmit={onSubmit}>
          <input
            className="login-input"
            value={email}
            placeholder="Email"
            type="email"
            disabled
            style={{ backgroundColor: "#f5f5f5", color: "#666" }}
          />
          <div
            className="field-hint"
            style={{
              fontSize: 12,
              color: "#4b7780",
              marginTop: 6,
              marginBottom: 8,
            }}
          >
            Email của bạn.
          </div>
          {/* token is kept in state (hidden) and will be used on submit */}
          <div style={{ position: "relative", width: "100%" }}>
            <input
              className="login-input"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mật khẩu mới"
              required
              style={{
                width: "100%",
                boxSizing: "border-box",
                paddingRight: 56,
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "#4b7780",
                padding: 4,
              }}
            >
              {showPassword ? "Ẩn" : "Hiện"}
            </button>
          </div>
          <div
            className="field-hint"
            style={{
              fontSize: 12,
              color: "#4b7780",
              marginTop: 6,
              marginBottom: 8,
            }}
          >
            Mật khẩu ít nhất 8 ký tự.
          </div>
          <div style={{ position: "relative", width: "100%" }}>
            <input
              className="login-input"
              type={showConfirm ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Xác nhận mật khẩu mới"
              required
              style={{
                width: "100%",
                boxSizing: "border-box",
                paddingRight: 56,
              }}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((s) => !s)}
              aria-label={showConfirm ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              title={showConfirm ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "#4b7780",
                padding: 4,
              }}
            >
              {showConfirm ? "Ẩn" : "Hiện"}
            </button>
          </div>
          <div
            className="field-hint"
            style={{
              fontSize: 12,
              color: "#4b7780",
              marginTop: 6,
              marginBottom: 8,
            }}
          >
            Nhập lại mật khẩu.
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            Đổi mật khẩu
          </button>
        </form>
        {message && (
          <div className="info-text" style={{ marginTop: 12 }}>
            {message}
          </div>
        )}
        {error && (
          <div className="error-text" style={{ marginTop: 12 }}>
            {error}
          </div>
        )}
        <div className="login-links">
          <Link to="/dang-nhap">Quay lại đăng nhập</Link>
        </div>
      </div>
    </div>
  );
}
