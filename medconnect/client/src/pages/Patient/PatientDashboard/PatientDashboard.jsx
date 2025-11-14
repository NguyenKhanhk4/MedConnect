import React, { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { PhanChaoMung } from "../phan-chao-mung/PhanChaoMung";
import { TheThongKe } from "../the-thong-ke/TheThongKe";
import { LichHenSapToi } from "../lich-hen-sap-toi/LichHenSapToi";
import { TuVanHienTai } from "../tu-van-hien-tai/TuVanHienTai";
import { HanhDongNhanh } from "../hanh-dong-nhanh/HanhDongNhanh";
import { TimKiemBacSi } from "../tim-kiem-bac-si/TimKiemBacSi";
import { LichHenCuaToi } from "../lich-hen-cua-toi/LichHenCuaToi";
import { LichDatHo } from "../lich-dat-ho/LichDatHo";
import { HoSoSucKhoe } from "../ho-so-suc-khoe/HoSoSucKhoe";
import { HoSoSucKhoeGiaDinh } from "../ho-so-suc-khoe-gia-dinh/HoSoSucKhoeGiaDinh";
import { ThongBao } from "../thong-bao/ThongBao";
import "./PatientDashboard.scss";

/**
 * PatientDashboard Component
 *
 * Implements UC16: Patient dashboard with upcoming appointments and past consultation records
 *
 * Features:
 * - Profile management (UC4)
 * - Quick actions for common tasks (UC8, UC10)
 * - Doctor search shortcut (UC8, UC18)
 * - Upcoming appointments (UC12, UC16)
 * - Appointment history (UC16)
 * - Payment history (UC11)
 * - Notifications center (UC12)
 *
 * Business Rules Compliance:
 * - Data privacy: Uses authenticated user context only
 * - Medical liability: Dashboard is informational only
 */

// Route mapping configuration
const ROUTE_MAP = {
  "/benh-nhan/tim-bac-si": TimKiemBacSi,
  "/tim-bac-si": TimKiemBacSi,
  "/search-doctors": TimKiemBacSi,
  "/benh-nhan/lich-hen-cua-toi": LichHenCuaToi,
  "/lich-hen-cua-toi": LichHenCuaToi,
  "/my-appointments": LichHenCuaToi,
  "/benh-nhan/lich-dat-ho": LichDatHo,
  "/benh-nhan/ho-so-benh-an": HoSoSucKhoe,
  "/ho-so-benh-an": HoSoSucKhoe,
  "/medical-records": HoSoSucKhoe,
  "/benh-nhan/ho-so-suc-khoe-gia-dinh": HoSoSucKhoeGiaDinh,
  "/ho-so-suc-khoe-gia-dinh": HoSoSucKhoeGiaDinh,
  "/family-health-records": HoSoSucKhoeGiaDinh,
  "/benh-nhan/thong-bao": ThongBao,
  "/thong-bao": ThongBao,
};

// Default dashboard home component
const DefaultDashboard = () => (
  <div className="container mx-auto px-4 py-6 lg:px-8 lg:py-8">
    <div className="space-y-6">
      <PhanChaoMung />
      <TheThongKe />
      <TuVanHienTai />
      {/* Main grid: Quick Actions, and Upcoming Appointments */}
      <div className="dashboard-main-grid">
        {/* Left column: Upcoming Appointments (2/3 width on desktop) */}
        <div className="dashboard-left-column">
          <LichHenSapToi />
        </div>
        {/* Right column: Quick Actions (1/3 width on desktop) */}
        <div className="dashboard-right-column">
          <HanhDongNhanh />
        </div>
      </div>
    </div>
  </div>
);

export default function PatientDashboard() {
  const location = useLocation();

  // Scroll to top when route changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Render content based on current route
  const content = useMemo(() => {
    const Component = ROUTE_MAP[location.pathname];
    return Component ? <Component /> : <DefaultDashboard />;
  }, [location.pathname]);

  return content;
}
