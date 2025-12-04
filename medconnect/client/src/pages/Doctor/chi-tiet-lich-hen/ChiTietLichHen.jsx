import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Paperclip,
  Calendar,
  Clock,
  User,
} from "lucide-react";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { useDoctorAppointments } from "../../../hooks/useDoctor";
import "./ChiTietLichHen.scss";

export default function ChiTietLichHen({ appointmentId, onBack }) {
  const { getAppointmentDetail } = useDoctorAppointments();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAppointmentDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getAppointmentDetail(appointmentId);
        setAppointment(data);
      } catch (err) {
        setError(err.message);
        console.error("Failed to fetch appointment detail:", err);
      } finally {
        setLoading(false);
      }
    };

    if (appointmentId) {
      fetchAppointmentDetail();
    }
  }, [appointmentId, getAppointmentDetail]);

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return { date: "--/--/----", time: "--:--" };
    const date = new Date(dateTimeString);
    return {
      date: date.toLocaleDateString("vi-VN"),
      time: date.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return {
          label: "Chờ xác nhận",
          className: "bg-yellow-100 text-yellow-700",
        };
      case "accepted":
        return {
          label: "Đã xác nhận",
          className: "bg-green-100 text-green-700",
        };
      case "checkin":
        return {
          label: "Đã checkin",
          className: "bg-green-100 text-green-700",
        };
      case "rejected":
        return { label: "Đã từ chối", className: "bg-red-100 text-red-700" };
      case "completed":
        return { label: "Hoàn thành", className: "bg-blue-100 text-blue-700" };
      default:
        return {
          label: "Không xác định",
          className: "bg-gray-100 text-gray-700",
        };
    }
  };

  const getTypeBadge = (type) => {
    switch (type?.toLowerCase()) {
      case "online":
        return { label: "Trực tuyến", className: "bg-teal-100 text-teal-700" };
      case "offline":
        return {
          label: "Tại phòng khám",
          className: "bg-cyan-100 text-cyan-700",
        };
      default:
        return {
          label: "Không xác định",
          className: "bg-gray-100 text-gray-700",
        };
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-gray-500">Đang tải chi tiết lịch hẹn...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-red-500">Lỗi: {error}</div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-gray-500">Không tìm thấy lịch hẹn</div>
      </div>
    );
  }

  const { date, time } = formatDateTime(appointment.scheduledStart);
  const statusBadge = getStatusBadge(appointment.status);
  const typeBadge = getTypeBadge(appointment.appointmentType);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 px-4 py-2 mb-6 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-primary transition-colors"
      >
        <ArrowLeft size={20} />
        Quay lại
      </button>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold text-gray-900">Chi tiết lịch hẹn</h1>
        <div className="flex gap-2">
          <Badge className={typeBadge.className}>{typeBadge.label}</Badge>
          <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient Information */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            Thông tin bệnh nhân
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900">
                {appointment.patientId?.fullName || "Không có"}
              </h3>
              <p className="text-sm text-gray-600">
                {appointment.patientId?.email || "Không có"}
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="w-4 h-4" />
              {appointment.patientId?.phone || "Không có"}
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail className="w-4 h-4" />
              {appointment.patientId?.email || "Không có"}
            </div>

            {appointment.patientId?.address && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                {appointment.patientId.address}
              </div>
            )}
          </div>
        </Card>

        {/* Appointment Details */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Thông tin lịch hẹn
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="font-medium">Ngày:</span>
              <span>{date}</span>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="font-medium">Giờ:</span>
              <span>{time}</span>
            </div>

            <div>
              <span className="font-medium">Loại khám:</span>
              <Badge className={`ml-2 ${typeBadge.className}`}>
                {typeBadge.label}
              </Badge>
            </div>

            <div>
              <span className="font-medium">Trạng thái:</span>
              <Badge className={`ml-2 ${statusBadge.className}`}>
                {statusBadge.label}
              </Badge>
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Thao tác nhanh</h2>
          <div className="space-y-3">
            {appointment.status === "pending" && (
              <>
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                  Chấp nhận lịch hẹn
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-red-600 text-red-600 hover:bg-red-50"
                >
                  Từ chối lịch hẹn
                </Button>
              </>
            )}

            {appointment.status === "accepted" && (
              <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white">
                Bắt đầu khám
              </Button>
            )}

            {appointment.status === "completed" && (
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                Xem tóm tắt khám
              </Button>
            )}
          </div>
        </Card>
      </div>

      {/* Reason and Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Lý do khám</h2>
          <p className="text-gray-700">
            {appointment.reason || "Không có thông tin"}
          </p>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Ghi chú</h2>
          <p className="text-gray-700">
            {appointment.notes || "Không có ghi chú"}
          </p>
        </Card>
      </div>

      {/* Attachments */}
      {appointment.attachments && appointment.attachments.length > 0 && (
        <Card className="p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Paperclip className="w-5 h-5" />
            Tệp đính kèm
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {appointment.attachments.map((attachment, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Paperclip className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-sm">{attachment.name}</span>
                </div>
                <Button size="sm" variant="outline" className="w-full">
                  Tải xuống
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
