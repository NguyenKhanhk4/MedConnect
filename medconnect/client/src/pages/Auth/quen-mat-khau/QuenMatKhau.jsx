import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { requestPasswordOtp } from "../../../services/userService";

export default function QuenMatKhau() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      setLoading(true);
      const response = await requestPasswordOtp(email.trim());
      setMessage(
        response.message ||
          "Nếu email hợp lệ, mã OTP đã được gửi. Vui lòng kiểm tra hộp thư."
      );
      setTimeout(() => navigate("/xac-minh-otp", { state: { email } }), 800);
    } catch (err) {
      let errorMessage = "Không gửi được OTP. Vui lòng thử lại.";
      try {
        const errorData = JSON.parse(err.message);
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // If parsing fails, use default message
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
        <h1 className="login-title">Quên mật khẩu</h1>
        <form onSubmit={onSubmit}>
          <input
            className="login-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email đã đăng ký của bạn"
            autoComplete="email"
            required
          />
          <small
            style={{
              display: "block",
              color: "#6b7280",
              marginTop: 4,
              marginBottom: 12,
            }}
          >
            Vui lòng nhập email đã đăng ký để nhận mã OTP.
          </small>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            Gửi mã OTP
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
