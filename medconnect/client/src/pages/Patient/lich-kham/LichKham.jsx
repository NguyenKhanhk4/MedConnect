import React, { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Spin } from "antd";
import { useAppointments } from "../../../hooks/useAppointments";
import {
  getDaysInMonth,
  getMonthRange,
  formatMonthName,
  isCurrentMonth,
} from "../../../utils/dateUtils";
import "./LichKham.scss";

const daysOfWeek = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export function LichKham() {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Fetch all appointments
  const { appointments: allAppointments, loading } = useAppointments();

  // Get month range for current date
  const monthRange = useMemo(() => getMonthRange(currentDate), [currentDate]);

  // Filter appointments for current month
  const appointments = useMemo(() => {
    if (!allAppointments || allAppointments.length === 0) return [];

    return allAppointments.filter((appointment) => {
      if (!appointment.scheduledStart) return false;
      const appointmentDate = new Date(appointment.scheduledStart);
      return (
        appointmentDate >= monthRange.start && appointmentDate <= monthRange.end
      );
    });
  }, [allAppointments, monthRange]);

  // Get appointment days for calendar
  const appointmentDays = useMemo(() => {
    return appointments.map((appointment) => {
      const appointmentDate = new Date(appointment.scheduledStart);
      return {
        day: appointmentDate.getDate(),
        status: appointment.status,
        mode: appointment.mode,
        id: appointment._id,
      };
    });
  }, [appointments]);

  // Get days for calendar display
  const days = useMemo(() => getDaysInMonth(currentDate), [currentDate]);

  // Format month name
  const monthName = useMemo(() => formatMonthName(currentDate), [currentDate]);

  // Check if current month
  const isCurrentMonthValue = useMemo(
    () => isCurrentMonth(currentDate),
    [currentDate]
  );

  const previousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
    );
  };

  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
    );
  };

  const today = new Date();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-balance">Lịch hẹn</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center min-h-[300px]">
            <Spin size="large" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="calendar-card">
      <CardHeader>
        <div className="calendar-header">
          <CardTitle className="calendar-title">Lịch hẹn</CardTitle>
          <div className="calendar-controls">
            <Button variant="outline" size="icon" onClick={previousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="calendar-month">{monthName}</span>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="calendar-grid">
          {daysOfWeek.map((day) => (
            <div key={day} className="calendar-day-header">
              {day}
            </div>
          ))}
          {days.map((day, index) => {
            const appointmentForDay = appointmentDays.find(
              (apt) => apt.day === day
            );
            const hasAppointment = day && appointmentForDay;
            const isToday =
              day && isCurrentMonthValue && day === today.getDate();

            return (
              <button
                key={index}
                type="button"
                disabled={!day}
                className={`calendar-day ${
                  !day
                    ? ""
                    : isToday
                    ? "today"
                    : hasAppointment
                    ? "has-appointment"
                    : ""
                }`}
                title={
                  hasAppointment ? `Lịch hẹn: ${appointmentForDay.status}` : ""
                }
              >
                {day}
              </button>
            );
          })}
        </div>
        <div className="calendar-legend">
          <div className="legend-item">
            <div className="legend-dot today" />
            <span>Hôm nay</span>
          </div>
          <div className="legend-item">
            <div className="legend-dot appointment" />
            <span>Có lịch hẹn</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
