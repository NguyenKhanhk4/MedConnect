import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Result, Button, Spin, Card, Typography, Descriptions } from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import {
  checkPayOSStatus,
  cancelPayOSPayment,
} from "../../../services/payService";
import "./KetQuaThanhToanDichVu.scss";

const { Title, Text } = Typography;

const KetQuaThanhToanDichVu = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [error, setError] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const orderCode = searchParams.get("orderCode");
        const status = searchParams.get("status"); // 'success' or 'failed'
        const cancel = searchParams.get("cancel"); // 'true' if user cancelled

        if (!orderCode) {
          setError("Không tìm thấy thông tin đơn hàng");
          setIsSuccess(false);
          setLoading(false);
          return;
        }

        // If user cancelled payment, call cancel API to clean up database
        if (cancel === "true") {
          try {
            await cancelPayOSPayment(orderCode);
            console.log("✅ Service payment link cancelled");
          } catch (cancelErr) {
            console.error("Error cancelling payment:", cancelErr);
          }
          localStorage.removeItem("pendingServicePaymentId");
          localStorage.removeItem("pendingServiceOrderCode");
          localStorage.removeItem("pendingServiceAppointmentId");
          setIsSuccess(false);
          setLoading(false);
          return;
        }

        // If status is explicitly 'failed', call cancel API to clean up database
        if (status === "failed") {
          try {
            await cancelPayOSPayment(orderCode);
            console.log("✅ Service payment failed - payment marked as failed");
          } catch (cancelErr) {
            console.error("Error cancelling payment:", cancelErr);
          }
          localStorage.removeItem("pendingServicePaymentId");
          localStorage.removeItem("pendingServiceOrderCode");
          localStorage.removeItem("pendingServiceAppointmentId");
          setIsSuccess(false);
          setLoading(false);
          return;
        }

        // Check payment status from PayOS
        const response = await checkPayOSStatus(orderCode);

        if (response.success) {
          setPaymentInfo(response.data);
          // Check if payment is actually paid
          const isPaid =
            response.data.status === "PAID" || response.data.status === "paid";
          setIsSuccess(isPaid);

          // Clear localStorage if payment successful
          if (isPaid) {
            localStorage.removeItem("pendingServicePaymentId");
            localStorage.removeItem("pendingServiceOrderCode");
            localStorage.removeItem("pendingServiceAppointmentId");
          }

          // If payment is cancelled or failed from PayOS, cleanup
          const isCancelled =
            response.data.status === "CANCELLED" ||
            response.data.status === "cancelled";
          const isFailed =
            response.data.status === "EXPIRED" ||
            response.data.status === "expired" ||
            response.data.status === "FAILED" ||
            response.data.status === "failed";

          if (isCancelled || isFailed) {
            try {
              await cancelPayOSPayment(orderCode);
              console.log(
                "✅ Service payment cancelled/failed - payment marked as failed"
              );
            } catch (cancelErr) {
              console.error("Error cancelling payment:", cancelErr);
            }
            localStorage.removeItem("pendingServicePaymentId");
            localStorage.removeItem("pendingServiceOrderCode");
            localStorage.removeItem("pendingServiceAppointmentId");
          }
        } else {
          setError("Không thể xác minh trạng thái thanh toán");
          setIsSuccess(false);
        }
      } catch (err) {
        console.error("Error verifying payment:", err);
        setError("Có lỗi xảy ra khi xác minh thanh toán");
        setIsSuccess(false);
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [searchParams]);

  const handleViewAppointments = () => {
    // Navigate với state để trigger reload appointments
    navigate("/bac-si/lich-hen", {
      state: { shouldReload: true, timestamp: Date.now() },
    });
  };

  const handleBackToHome = () => {
    navigate("/bac-si/trang-chu");
  };

  if (loading) {
    return (
      <div className="service-payment-result-container">
        <Card className="payment-card">
          <div className="loading-container">
            <Spin
              indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />}
              size="large"
            />
            <Title level={4} style={{ marginTop: 24 }}>
              Đang xác minh thanh toán...
            </Title>
            <Text type="secondary">Vui lòng đợi trong giây lát</Text>
          </div>
        </Card>
      </div>
    );
  }

  // Payment Failed
  if (!isSuccess) {
    const orderCode = searchParams.get("orderCode");

    return (
      <div className="service-payment-result-container payment-failed">
        <Card className="payment-card">
          <Result
            status="error"
            icon={<CloseCircleOutlined style={{ color: "#ff4d4f" }} />}
            title={
              <Title level={2} style={{ color: "#ff4d4f", marginBottom: 8 }}>
                Thanh toán thất bại
              </Title>
            }
            subTitle={
              <div className="subtitle-container">
                <Text style={{ fontSize: 16 }}>
                  {error ||
                    "Đã có lỗi xảy ra trong quá trình thanh toán dịch vụ. Vui lòng thử lại."}
                </Text>
                {orderCode && (
                  <Text
                    type="secondary"
                    style={{ display: "block", marginTop: 8 }}
                  >
                    Mã đơn hàng: {orderCode}
                  </Text>
                )}
              </div>
            }
            extra={[
              <Button
                type="primary"
                size="large"
                key="appointments"
                onClick={handleViewAppointments}
              >
                Xem lịch hẹn
              </Button>,
              <Button size="large" key="home" onClick={handleBackToHome}>
                Về trang chủ
              </Button>,
            ]}
          >
            <div className="failure-reasons">
              <Title level={5}>Có thể do các nguyên nhân sau:</Title>
              <ul>
                <li>Số dư tài khoản không đủ</li>
                <li>Thông tin thanh toán không chính xác</li>
                <li>Quá thời gian thanh toán</li>
                <li>Người dùng hủy giao dịch</li>
              </ul>
              <Text type="secondary">
                Nếu bạn đã thanh toán nhưng vẫn nhận được thông báo này, vui
                lòng liên hệ với bộ phận hỗ trợ để được giúp đỡ.
              </Text>
            </div>
          </Result>
        </Card>
      </div>
    );
  }

  // Payment Success
  return (
    <div className="service-payment-result-container payment-success">
      <Card className="payment-card">
        <Result
          status="success"
          icon={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
          title={
            <Title level={2} style={{ color: "#52c41a", marginBottom: 8 }}>
              Thanh toán dịch vụ thành công!
            </Title>
          }
          subTitle="Bệnh nhân đã thanh toán thành công cho các dịch vụ đã sử dụng. Email xác nhận đã được gửi cho bệnh nhân."
          extra={[
            <Button
              type="primary"
              size="large"
              key="appointments"
              onClick={handleViewAppointments}
            >
              Xem lịch hẹn
            </Button>,
            <Button size="large" key="home" onClick={handleBackToHome}>
              Về trang chủ
            </Button>,
          ]}
        >
          {paymentInfo && (
            <div className="payment-details">
              <Descriptions bordered column={1} size="small">
                <Descriptions.Item label="Mã đơn hàng">
                  <Text strong>{paymentInfo.orderCode}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Số tiền">
                  <Text strong style={{ color: "#52c41a" }}>
                    {new Intl.NumberFormat("vi-VN", {
                      style: "currency",
                      currency: "VND",
                    }).format(paymentInfo.amount || 0)}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái">
                  <Text strong style={{ color: "#52c41a" }}>
                    {paymentInfo.status === "PAID"
                      ? "Đã thanh toán"
                      : paymentInfo.status}
                  </Text>
                </Descriptions.Item>
                {paymentInfo.description && (
                  <Descriptions.Item label="Mô tả">
                    {paymentInfo.description}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </div>
          )}
        </Result>
      </Card>
    </div>
  );
};

export default KetQuaThanhToanDichVu;
