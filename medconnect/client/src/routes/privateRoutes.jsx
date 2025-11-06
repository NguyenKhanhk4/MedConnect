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
import Profile from "../pages/Auth/Profile";

// Patient Components
import PatientDashboard from "../pages/Patient/PatientDashboard/PatientDashboard";
import { Settings } from "../pages/Patient/components/Settings/Settings";
import FavoriteDoctors from "../pages/Patient/components/FavoriteDoctors/FavoriteDoctors";
import AppointmentBookingHome from "../pages/Appointment/AppointmentBookingHome";
import SpecializationSelection from "../pages/Appointment/SpecializationSelection";
import DoctorSelection from "../pages/Appointment/DoctorSelection";
import TimeSlotSelection from "../pages/Appointment/TimeSlotSelection";
import PaymentResult from "../pages/Appointment/PaymentResult";
import MultiSpecializationBooking from "../pages/Appointment/MultiSpecializationBooking";
import PatientVideoCallPage from "../pages/Patient/components/VideoCallPage/VideoCallPage";

// Doctor Components
import DoctorDashboard from "../pages/Doctor/DoctorDashboard/DoctorDashboard";
import AppointmentList from "../pages/Doctor/AppointmentList/AppointmentList";
import AppointmentDetail from "../pages/Doctor/AppointmentDetail/AppointmentDetail";
import MedicalHistory from "../pages/Doctor/MedicalHistory/MedicalHistory";
import ProfileSettings from "../pages/Doctor/ProfileSettings/ProfileSettings";
import ScheduleManagement from "../pages/Doctor/ScheduleManagement/ScheduleManagement";
import Feedback from "../pages/Doctor/Feedback/Feedback";
import OfflineConsultationPage from "../pages/Doctor/OfflineConsultationPage/OfflineConsultationPage";
import OnlineConsultationPage from "../pages/Doctor/OnlineConsultationPage/OnlineConsultationPage";
import { RescheduleRequests } from "../pages/Doctor/components/RescheduleRequests/RescheduleRequests";
import { Notifications } from "../pages/Doctor/components/Notifications/Notifications";
import DoctorVideoCallPage from "../pages/Doctor/DoctorVideoCallPage/DoctorVideoCallPage";
import ServicePaymentResult from "../pages/Doctor/ServicePaymentResult/ServicePaymentResult";

// Admin Components
import AdminDashboard from "../pages/Admin/AdminDashboard";
import VerifyDoctors from "../pages/Admin/VerifyDoctors";
import UserManagement from "../pages/Admin/UserManagement";
import Specializations from "../pages/Admin/Specializations";
import AppointmentManagement from "../pages/Admin/AppointmentManagement";
import Statistics from "../pages/Admin/Statistics";
import AdminLayout from "../layouts/AdminLayout/AdminLayout";

// Manager Components
import ManagerDashboard from "../pages/Manager/ManagerDashboard/ManagerDashboard";
import ManagerScheduleManagement from "../pages/Manager/ManagerScheduleManagement/ManagerScheduleManagement";
import LeaveRequestManagement from "../pages/Manager/LeaveRequestManagement/LeaveRequestManagement";
import ServicePriceManagement from "../pages/Manager/ServicePriceManagement/ServicePriceManagement";
import InvoiceManagement from "../pages/Manager/InvoiceManagement/InvoiceManagement";
import ServicePaymentManagement from "../pages/Manager/ServicePaymentManagement/ServicePaymentManagement";
import { Notifications as ManagerNotifications } from "../pages/Manager/Notifications/Notifications";
import EducationLevelPriceManagement from "../pages/Manager/EducationLevelPriceManagement/EducationLevelPriceManagement";
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
          element={<PatientVideoCallPage />}
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
          <Route
            path="/benh-nhan/bac-si-ua-thich"
            element={<FavoriteDoctors />}
          />
          <Route path="/benh-nhan/thong-bao" element={<PatientDashboard />} />
          <Route path="/benh-nhan/cai-dat" element={<Settings />} />
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
          element={<DoctorVideoCallPage />}
        />

        <Route element={<DoctorLayout />}>
          {/* Main doctor dashboard */}
          <Route path="/bac-si/trang-chu" element={<DoctorDashboard />} />
          <Route path="/bac-si" element={<DoctorDashboard />} />{" "}
          {/* Legacy route for backward compatibility */}
          {/* ==================== APPOINTMENT MANAGEMENT ==================== */}
          {/* Doctor appointment management routes */}
          <Route path="/bac-si/lich-hen" element={<AppointmentList />} />
          <Route path="/bac-si/lich-hen/:id" element={<AppointmentDetail />} />
          <Route
            path="/bac-si/lich-hen/service-payment-result"
            element={<ServicePaymentResult />}
          />
          <Route
            path="/bac-si/kham-truc-tiep/:appointmentId"
            element={<OfflineConsultationPage />}
          />
          <Route
            path="/bac-si/tu-van-truc-tuyen/:appointmentId"
            element={<OnlineConsultationPage />}
          />
          {/* ==================== SCHEDULE MANAGEMENT ==================== */}
          {/* Doctor schedule and calendar routes */}
          <Route
            path="/bac-si/lich-lam-viec"
            element={<ScheduleManagement />}
          />
          <Route path="/bac-si/quan-ly-lich" element={<ScheduleManagement />} />
          {/* ==================== MEDICAL RECORDS ==================== */}
          {/* Doctor medical records and consultation routes */}
          <Route path="/bac-si/ho-so-kham" element={<MedicalHistory />} />
          {/* ==================== SETTINGS & PROFILE ==================== */}
          {/* Doctor settings and profile management */}
          <Route path="/bac-si/cai-dat" element={<ProfileSettings />} />
          {/* ==================== NOTIFICATIONS & FEEDBACK ==================== */}
          {/* Doctor notifications and feedback routes */}
          <Route path="/bac-si/thong-bao" element={<Notifications />} />
          <Route path="/bac-si/danh-gia" element={<Feedback />} />
          {/* ==================== RESCHEDULE MANAGEMENT ==================== */}
          {/* Doctor reschedule request management */}
          <Route
            path="/bac-si/yeu-cau-doi-lich"
            element={<RescheduleRequests />}
          />
        </Route>
      </Route>
    </Route>

    {/* ==================== OTHER ROUTES WITH DEFAULT LAYOUT ==================== */}
    <Route element={<DefaultLayout />}>
      {/* ==================== AUTHENTICATED ROUTES ==================== */}
      <Route element={<AuthMiddleware />}>
        {/* ==================== SHARED ROUTES ==================== */}
        {/* Routes accessible by all authenticated users */}
        <Route path="/tai-khoan" element={<Profile />} />
      </Route>

      {/* ==================== PATIENT-SPECIFIC ROUTES ==================== */}
      {/* Routes that require patient role specifically */}
      <Route element={<PatientMiddleware />}>
        {/* Appointment booking routes */}
        <Route path="/dat-lich" element={<AppointmentBookingHome />} />
        <Route
          path="/dat-lich/chon-chuyen-khoa"
          element={<SpecializationSelection />}
        />
        <Route path="/dat-lich/chon-bac-si" element={<DoctorSelection />} />
        <Route
          path="/dat-lich/chon-thoi-gian"
          element={<TimeSlotSelection />}
        />
        {/* Payment result route - handles both success and failed */}
        <Route path="/dat-lich/payment-result" element={<PaymentResult />} />
        {/* Multi-specialization booking routes */}
        <Route
          path="/dat-lich-nhieu-chuyen-khoa"
          element={<MultiSpecializationBooking />}
        />
      </Route>
    </Route>

    {/* ==================== ADMIN ROUTES ==================== */}
    {/* Admin routes with admin middleware protection */}
    <Route element={<AdminMiddleware />}>
      <Route element={<AdminLayout />}>
        <Route path="/admin/trang-chu" element={<AdminDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />{" "}
        {/* Legacy route for backward compatibility */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />{" "}
        {/* Legacy route */}
        <Route path="/admin/xac-minh-bac-si" element={<VerifyDoctors />} />
        <Route path="/admin/nguoi-dung" element={<UserManagement />} />
        <Route path="/admin/chuyen-khoa" element={<Specializations />} />
        <Route path="/admin/lich-hen" element={<AppointmentManagement />} />
        {/* Legacy route redirects for backward compatibility */}
        <Route path="/admin/verify-doctors" element={<VerifyDoctors />} />
        <Route path="/admin/users" element={<UserManagement />} />
        <Route path="/admin/specializations" element={<Specializations />} />
        <Route path="/admin/appointments" element={<AppointmentManagement />} />
        <Route path="/admin/thong-ke" element={<Statistics />} />
        <Route path="/admin/statistics" element={<Statistics />} />
      </Route>
    </Route>

    {/* ==================== MANAGER ROUTES ==================== */}
    {/* Manager routes with manager middleware protection */}
    <Route element={<ManagerMiddleware />}>
      <Route element={<ManagerLayout />}>
        <Route path="/manager/trang-chu" element={<ManagerDashboard />} />
        <Route path="/manager" element={<ManagerDashboard />} />
        <Route
          path="/manager/quan-ly-lich"
          element={<ManagerScheduleManagement />}
        />
        <Route
          path="/manager/quan-ly-gia"
          element={<EducationLevelPriceManagement />}
        />
        <Route
          path="/manager/yeu-cau-nghi-phep"
          element={<LeaveRequestManagement />}
        />
        <Route
          path="/manager/quan-ly-gia-dich-vu"
          element={<ServicePriceManagement />}
        />
        <Route
          path="/manager/quan-ly-hoa-don"
          element={<InvoiceManagement />}
        />
        <Route
          path="/manager/thanh-toan-dich-vu"
          element={<ServicePaymentManagement />}
        />
        <Route path="/manager/thong-bao" element={<ManagerNotifications />} />
      </Route>
    </Route>
  </>
);
