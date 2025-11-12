import { useLocation, useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { verifyPasswordOtp } from "../../../services/userService";

export default function XacMinhOtp() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const e = location.state?.email;
    if (e) setEmail(e);
  }, [location.state]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      setLoading(true);
      const res = await verifyPasswordOtp(email.trim(), otp.trim());
      // Phản hồi từ server sử dụng cấu trúc đóng gói { success, data, meta, message }
      // resetToken được trả về trong data.resetToken
      const token = res?.data?.resetToken || res?.resetToken;
      console.log("VerifyOtp - Navigating with:", { token, email });
      // Truyền token qua navigation state (không lưu token vào localStorage để an toàn)
      navigate("/dat-lai-mat-khau", { state: { token, email } });
    } catch (err) {
      // Phân tích thông điệp lỗi trả về từ server
      let errorMessage = "Mã OTP không hợp lệ.";
      try {
        const errorData = JSON.parse(err.message);
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // Nếu parse thất bại thì dùng thông báo mặc định
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
        <h1 className="login-title">Xác minh mã OTP</h1>
        <form onSubmit={onSubmit}>
          <input
            className="login-input"
            value={email}
            placeholder="Email"
            autoComplete="email"
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
            Email đã được xác định từ bước trước.
          </div>
          <input
            className="login-input"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="Nhập mã OTP"
            required
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            Xác minh
          </button>
        </form>
        {error && <div className="error-text">{error}</div>}
        <div className="login-links">
          <Link to="/quen-mat-khau">Gửi lại OTP</Link>
        </div>
      </div>
    </div>
  );
}
