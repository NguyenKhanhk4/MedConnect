import React, { useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../../components/ui/Avatar";
import {
  CalendarOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import { useAppointments } from "../../../hooks/useAppointments";
import {
  formatDateTime,
  getStatusConfig,
} from "../../../utils/appointmentUtils";
import { getFullName } from "../../../utils/doctorUtils";

export function LichSuLichHen() {
  const {
    appointments: allAppointments,
    loading,
    error,
    refreshAppointments,
  } = useAppointments();

  // Filter past appointments
  const pastAppointments = useMemo(() => {
    const now = new Date();
    return allAppointments.filter((appointment) => {
      if (!appointment.scheduledStart) return false;
      const appointmentDate = new Date(appointment.scheduledStart);
      return (
        appointmentDate < now ||
        ["done", "cancelled", "auto_cancelled", "no_show", "rejected"].includes(
          appointment.status
        )
      );
    });
  }, [allAppointments]);

  const getStatusBadge = (status) => {
    const config = getStatusConfig(status);
    const statusClassMap = {
      done: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      auto_cancelled:
        "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      no_show:
        "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
      rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    };

    return (
      <Badge
        variant="secondary"
        className={statusClassMap[status] || "bg-gray-100 text-gray-700"}
      >
        {config.text}
      </Badge>
    );
  };

  const getDoctorInitials = (appointment) => {
    const fullName = appointment.doctorId?.fullName;
    return fullName?.split(" ").pop()?.charAt(0) || "BS";
  };

  if (loading) {
    return (
      <Card className="medical-card fade-in">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-xl font-semibold">
            Lịch sử khám bệnh
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <LoadingOutlined style={{ fontSize: "24px" }} />
          <span className="ml-2">Đang tải dữ liệu...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="medical-card fade-in">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-xl font-semibold">
            Lịch sử khám bệnh
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <p className="text-red-500 mb-4">Lỗi: {error}</p>
          <Button onClick={refreshAppointments} variant="outline">
            Thử lại
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="medical-card fade-in">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-xl font-semibold">
          Lịch sử khám bệnh
        </CardTitle>
        <Button variant="ghost" size="sm" className="text-primary">
          Xem tất cả
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {pastAppointments.length === 0 ? (
          <div className="text-center py-8">
            <FileTextOutlined style={{ fontSize: "48px", color: "#ccc" }} />
            <p className="text-muted-foreground mt-4">
              Chưa có lịch sử khám bệnh
            </p>
          </div>
        ) : (
          pastAppointments.map((appointment) => (
            <div
              key={appointment._id}
              className="flex items-start gap-4 rounded-lg border bg-card p-4 hover:bg-muted/50 transition-colors"
            >
              <Avatar className="h-12 w-12">
                <AvatarImage
                  src={appointment.doctorId?.avatarUrl || "/placeholder.svg"}
                  alt={appointment.doctorId?.fullName}
                />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {getDoctorInitials(appointment)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-foreground">
                      {appointment.doctorId
                        ? getFullName(appointment.doctorId)
                        : "Bác sĩ"}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {appointment.doctorId?.specializationIds?.[0]?.name ||
                        "Chuyên khoa"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <CalendarOutlined style={{ fontSize: "16px" }} />
                    <span>
                      {
                        formatDateTime(appointment.scheduledStart, {
                          includeWeekday: false,
                        }).date
                      }
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ClockCircleOutlined style={{ fontSize: "16px" }} />
                    <span>
                      {formatDateTime(appointment.scheduledStart).time}
                    </span>
                  </div>
                </div>

                {appointment.diagnosis && (
                  <p className="text-sm">
                    <span className="font-medium">Chẩn đoán:</span>{" "}
                    {appointment.diagnosis}
                  </p>
                )}

                <div className="flex items-center gap-2">
                  {getStatusBadge(appointment.status)}
                  {appointment.paymentStatus === "paid" && (
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    >
                      Đã thanh toán
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {appointment.consultationSummary && (
                    <Button size="sm" variant="outline">
                      <FileTextOutlined
                        style={{ fontSize: "16px", marginRight: "6px" }}
                      />
                      Xem tóm tắt
                    </Button>
                  )}
                  {appointment.prescription && (
                    <Button size="sm" variant="outline">
                      <FileTextOutlined
                        style={{ fontSize: "16px", marginRight: "6px" }}
                      />
                      Đơn thuốc
                    </Button>
                  )}
                  <Button size="sm" variant="outline">
                    Chi tiết
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
