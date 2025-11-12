import { Route } from "react-router-dom";

// Layouts
import DefaultLayout from "../layouts/DefaultLayout/DefaultLayout";
import DoctorLayout from "../layouts/DoctorLayout/DoctorLayout";
import PatientLayout from "../layouts/PatientLayout/PatientLayout";

// Middlewares
import AuthMiddleware from "../middlewares/AuthMiddleware";
import PatientMiddleware from "../middlewares/PatientMiddleware";
import AdminMiddleware from "../middlewares/AdminMiddleware";
import DoctorMiddleware from "../middlewares/DoctorMiddleware";
import ManagerMiddleware from "../middlewares/ManagerMiddleware";

// Shared Components
import TaiKhoan from "../pages/Auth/tai-khoan/TaiKhoan";

// Patient Components
import PatientDashboard from "../pages/Patient/PatientDashboard/PatientDashboard";
import { CaiDat as CaiDatPatient } from "../pages/Patient/cai-dat/CaiDat";
import BacSiUaThich from "../pages/Patient/bac-si-ua-thich/BacSiUaThich";
import TrangChuDatLich from "../pages/Appointment/trang-chu-dat-lich/TrangChuDatLich";
import ChonChuyenKhoa from "../pages/Appointment/chon-chuyen-khoa/ChonChuyenKhoa";
import ChonBacSi from "../pages/Appointment/chon-bac-si/ChonBacSi";
import ChonThoiGian from "../pages/Appointment/chon-thoi-gian/ChonThoiGian";
import KetQuaThanhToan from "../pages/Appointment/ket-qua-thanh-toan/KetQuaThanhToan";
import DatLichNhieuChuyenKhoa from "../pages/Appointment/dat-lich-nhieu-chuyen-khoa/DatLichNhieuChuyenKhoa";
import TrangGoiVideoPatient from "../pages/Patient/trang-goi-video/TrangGoiVideo";

// Doctor Components
import TrangChuDoctor from "../pages/Doctor/trang-chu/TrangChu";
import LichHenDoctor from "../pages/Doctor/lich-hen/LichHen";
import ChiTietLichHen from "../pages/Doctor/chi-tiet-lich-hen/ChiTietLichHen";
import HoSoKham from "../pages/Doctor/ho-so-kham/HoSoKham";
import CaiDat from "../pages/Doctor/cai-dat/CaiDat";
import QuanLyLich from "../pages/Doctor/quan-ly-lich/QuanLyLich";
import DanhGia from "../pages/Doctor/danh-gia/DanhGia";
import KhamTrucTiep from "../pages/Doctor/kham-truc-tiep/KhamTrucTiep";
import TuVanTrucTuyen from "../pages/Doctor/tu-van-truc-tuyen/TuVanTrucTuyen";
import { YeuCauDoiLich } from "../pages/Doctor/components/yeu-cau-doi-lich/YeuCauDoiLich";
import { ThongBao } from "../pages/Doctor/components/thong-bao/ThongBao";
import TrangGoiVideoDoctor from "../pages/Doctor/trang-goi-video/TrangGoiVideo";
import KetQuaThanhToanDichVu from "../pages/Doctor/ket-qua-thanh-toan-dich-vu/KetQuaThanhToanDichVu";

// Admin Components
import TrangChuAdmin from "../pages/Admin/trang-chu/TrangChu";
import XacMinhBacSi from "../pages/Admin/xac-minh-bac-si/XacMinhBacSi";
import NguoiDung from "../pages/Admin/nguoi-dung/NguoiDung";
import ChuyenKhoa from "../pages/Admin/chuyen-khoa/ChuyenKhoa";
import LichHenAdmin from "../pages/Admin/lich-hen/LichHen";
import ThongKe from "../pages/Admin/thong-ke/ThongKe";
import AdminLayout from "../layouts/AdminLayout/AdminLayout";

// Manager Components
import TrangChuManager from "../pages/Manager/trang-chu/TrangChu";
import QuanLyLichBacSi from "../pages/Manager/quan-ly-lich-bac-si/QuanLyLichBacSi";
import QuanLyYeuCauNghiPhep from "../pages/Manager/quan-ly-yeu-cau-nghi-phep/QuanLyYeuCauNghiPhep";
import QuanLyGiaDichVu from "../pages/Manager/quan-ly-gia-dich-vu/QuanLyGiaDichVu";
import QuanLyHoaDon from "../pages/Manager/quan-ly-hoa-don/QuanLyHoaDon";
import QuanLyThanhToanDichVu from "../pages/Manager/quan-ly-thanh-toan-dich-vu/QuanLyThanhToanDichVu";
import { ThongBao as ManagerNotifications } from "../pages/Manager/thong-bao/ThongBao";
import QuanLyGiaTheoTrinhDo from "../pages/Manager/quan-ly-gia-theo-trinh-do/QuanLyGiaTheoTrinhDo";
import ManagerLayout from "../layouts/ManagerLayout/ManagerLayout";

/**
 * Private Routes - Routes requiring authentication
 * Organized by user roles and functionality
 */
export const privateRoutes = (
  <>
    {/* ==================== PATIENT ROUTES (WITH PATIENT LAYOUT) ==================== */}
    {/* Patient routes with PatientLayout (includes Sidebar and Header) */}
    <Route element={<AuthMiddleware />}>
      <Route element={<PatientMiddleware />}>
        {/* Fullscreen patient video call route (no PatientLayout) */}
        <Route
          path="/benh-nhan/video-call/:appointmentId"
          element={<TrangGoiVideoPatient />}
        />

        <Route element={<PatientLayout />}>
          {/* Main patient dashboard and related routes */}
          <Route path="/benh-nhan/trang-chu" element={<PatientDashboard />} />
          <Route path="/benh-nhan" element={<PatientDashboard />} />{" "}
          {/* Legacy route for backward compatibility */}
          <Route path="/benh-nhan/tim-bac-si" element={<PatientDashboard />} />
          <Route
            path="/benh-nhan/lich-hen-cua-toi"
            element={<PatientDashboard />}
          />
          <Route
            path="/benh-nhan/ho-so-benh-an"
            element={<PatientDashboard />}
          />
          <Route
            path="/benh-nhan/ho-so-suc-khoe-gia-dinh"
            element={<PatientDashboard />}
          />
          <Route path="/benh-nhan/bac-si-ua-thich" element={<BacSiUaThich />} />
          <Route path="/benh-nhan/thong-bao" element={<PatientDashboard />} />
          <Route path="/benh-nhan/cai-dat" element={<CaiDatPatient />} />
          {/* Legacy route redirects for backward compatibility */}
          <Route path="/tim-bac-si" element={<PatientDashboard />} />
          <Route path="/lich-hen-cua-toi" element={<PatientDashboard />} />
          <Route path="/ho-so-benh-an" element={<PatientDashboard />} />
          <Route
            path="/ho-so-suc-khoe-gia-dinh"
            element={<PatientDashboard />}
          />
          <Route path="/thong-bao" element={<PatientDashboard />} />
          <Route path="/search-doctors" element={<PatientDashboard />} />
          <Route path="/my-appointments" element={<PatientDashboard />} />
          <Route path="/medical-records" element={<PatientDashboard />} />
          <Route path="/family-health-records" element={<PatientDashboard />} />
        </Route>
      </Route>
    </Route>

    {/* ==================== DOCTOR ROUTES (WITH DOCTOR LAYOUT) ==================== */}
    {/* Doctor routes with DoctorLayout (includes Sidebar) */}
    <Route element={<AuthMiddleware />}>
      <Route element={<DoctorMiddleware />}>
        {/* Fullscreen doctor video call route (no DoctorLayout) */}
        <Route
          path="/bac-si/video-call/:appointmentId"
          element={<TrangGoiVideoDoctor />}
        />

        <Route element={<DoctorLayout />}>
          {/* Main doctor dashboard */}
          <Route path="/bac-si/trang-chu" element={<TrangChuDoctor />} />
          <Route path="/bac-si" element={<TrangChuDoctor />} />{" "}
          {/* Legacy route for backward compatibility */}
          {/* ==================== APPOINTMENT MANAGEMENT ==================== */}
          {/* Doctor appointment management routes */}
          <Route path="/bac-si/lich-hen" element={<LichHenDoctor />} />
          <Route path="/bac-si/lich-hen/:id" element={<ChiTietLichHen />} />
          <Route
            path="/bac-si/lich-hen/service-payment-result"
            element={<KetQuaThanhToanDichVu />}
          />
          <Route
            path="/bac-si/kham-truc-tiep/:appointmentId"
            element={<KhamTrucTiep />}
          />
          <Route
            path="/bac-si/tu-van-truc-tuyen/:appointmentId"
            element={<TuVanTrucTuyen />}
          />
          {/* ==================== SCHEDULE MANAGEMENT ==================== */}
          {/* Doctor schedule and calendar routes */}
          <Route path="/bac-si/lich-lam-viec" element={<QuanLyLich />} />
          <Route path="/bac-si/quan-ly-lich" element={<QuanLyLich />} />
          {/* ==================== MEDICAL RECORDS ==================== */}
          {/* Doctor medical records and consultation routes */}
          <Route path="/bac-si/ho-so-kham" element={<HoSoKham />} />
          {/* ==================== SETTINGS & PROFILE ==================== */}
          {/* Doctor settings and profile management */}
          <Route path="/bac-si/cai-dat" element={<CaiDat />} />
          {/* ==================== NOTIFICATIONS & FEEDBACK ==================== */}
          {/* Doctor notifications and feedback routes */}
          <Route path="/bac-si/thong-bao" element={<ThongBao />} />
          <Route path="/bac-si/danh-gia" element={<DanhGia />} />
          {/* ==================== RESCHEDULE MANAGEMENT ==================== */}
          {/* Doctor reschedule request management */}
          <Route path="/bac-si/yeu-cau-doi-lich" element={<YeuCauDoiLich />} />
        </Route>
      </Route>
    </Route>

    {/* ==================== OTHER ROUTES WITH DEFAULT LAYOUT ==================== */}
    <Route element={<DefaultLayout />}>
      {/* ==================== AUTHENTICATED ROUTES ==================== */}
      <Route element={<AuthMiddleware />}>
        {/* ==================== SHARED ROUTES ==================== */}
        {/* Routes accessible by all authenticated users */}
        <Route path="/tai-khoan" element={<TaiKhoan />} />
      </Route>

      {/* ==================== PATIENT-SPECIFIC ROUTES ==================== */}
      {/* Routes that require patient role specifically */}
      <Route element={<PatientMiddleware />}>
        {/* Appointment booking routes */}
        <Route path="/dat-lich" element={<TrangChuDatLich />} />
        <Route path="/dat-lich/chon-chuyen-khoa" element={<ChonChuyenKhoa />} />
        <Route path="/dat-lich/chon-bac-si" element={<ChonBacSi />} />
        <Route path="/dat-lich/chon-thoi-gian" element={<ChonThoiGian />} />
        {/* Payment result route - handles both success and failed */}
        <Route path="/dat-lich/payment-result" element={<KetQuaThanhToan />} />
        {/* Multi-specialization booking routes */}
        <Route
          path="/dat-lich-nhieu-chuyen-khoa"
          element={<DatLichNhieuChuyenKhoa />}
        />
      </Route>
    </Route>

    {/* ==================== ADMIN ROUTES ==================== */}
    {/* Admin routes with admin middleware protection */}
    <Route element={<AdminMiddleware />}>
      <Route element={<AdminLayout />}>
        <Route path="/admin/trang-chu" element={<TrangChuAdmin />} />
        <Route path="/admin" element={<TrangChuAdmin />} />{" "}
        {/* Legacy route for backward compatibility */}
        <Route path="/admin/dashboard" element={<TrangChuAdmin />} />{" "}
        {/* Legacy route */}
        <Route path="/admin/xac-minh-bac-si" element={<XacMinhBacSi />} />
        <Route path="/admin/nguoi-dung" element={<NguoiDung />} />
        <Route path="/admin/chuyen-khoa" element={<ChuyenKhoa />} />
        <Route path="/admin/lich-hen" element={<LichHenAdmin />} />
        {/* Legacy route redirects for backward compatibility */}
        <Route path="/admin/verify-doctors" element={<XacMinhBacSi />} />
        <Route path="/admin/users" element={<NguoiDung />} />
        <Route path="/admin/specializations" element={<ChuyenKhoa />} />
        <Route path="/admin/appointments" element={<LichHenAdmin />} />
        <Route path="/admin/thong-ke" element={<ThongKe />} />
        <Route path="/admin/statistics" element={<ThongKe />} />
      </Route>
    </Route>

    {/* ==================== MANAGER ROUTES ==================== */}
    {/* Manager routes with manager middleware protection */}
    <Route element={<ManagerMiddleware />}>
      <Route element={<ManagerLayout />}>
        <Route path="/manager/trang-chu" element={<TrangChuManager />} />
        <Route path="/manager" element={<TrangChuManager />} />
        <Route path="/manager/quan-ly-lich" element={<QuanLyLichBacSi />} />
        <Route path="/manager/quan-ly-gia" element={<QuanLyGiaTheoTrinhDo />} />
        <Route
          path="/manager/yeu-cau-nghi-phep"
          element={<QuanLyYeuCauNghiPhep />}
        />
        <Route
          path="/manager/quan-ly-gia-dich-vu"
          element={<QuanLyGiaDichVu />}
        />
        <Route path="/manager/quan-ly-hoa-don" element={<QuanLyHoaDon />} />
        <Route
          path="/manager/thanh-toan-dich-vu"
          element={<QuanLyThanhToanDichVu />}
        />
        <Route path="/manager/thong-bao" element={<ManagerNotifications />} />
      </Route>
    </Route>
  </>
);
