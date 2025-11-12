import DefaultLayout from "../layouts/DefaultLayout/DefaultLayout";
import AuthLayout from "../layouts/AuthLayout/AuthLayout";
// The homepage component is located at pages/Home/trang-chu/TrangChu.jsx
import TrangChu from "../pages/Home/trang-chu/TrangChu";
import About from "../pages/About/About";
import KhamTaiNha from "../pages/Home/kham-tai-nha/KhamTaiNha";
import KhamTaiVien from "../pages/Home/kham-tai-vien/KhamTaiVien";
import DanhSachBacSi from "../pages/Home/danh-sach-bac-si/DanhSachBacSi";
import DanhGia from "../pages/Home/danh-gia/DanhGia";
import ChuyenKhoa from "../pages/Home/chuyen-khoa/ChuyenKhoa";
import CoSoYTe from "../pages/Home/co-so-y-te/CoSoYTe";
import GoiKham from "../pages/Home/goi-kham/GoiKham";
import DangNhap from "../pages/Auth/dang-nhap/DangNhap";
import DangKy from "../pages/Auth/dang-ky/DangKy";
import DangKyBacSi from "../pages/Auth/dang-ky-bac-si/DangKyBacSi";
import QuenMatKhau from "../pages/Auth/quen-mat-khau/QuenMatKhau";
import XacMinhOtp from "../pages/Auth/xac-minh-otp/XacMinhOtp";
import DatLaiMatKhau from "../pages/Auth/dat-lai-mat-khau/DatLaiMatKhau";
import ChinhSachBaoMat from "../pages/Privacy and Terms/ChinhSachBaoMat";
import DieuKhoanSuDung from "../pages/Privacy and Terms/DieuKhoanSuDung";
import { Route } from "react-router-dom";
import GuestMiddleware from "../middlewares/GuestMiddleware";
export const publicRoutes = (
  <>
    <Route element={<DefaultLayout />}>
      <Route path="/" element={<TrangChu />} />
      <Route path="/gioi-thieu" element={<About />} />
      <Route path="/kham-tai-nha" element={<KhamTaiNha />} />
      <Route path="/kham-tai-vien" element={<KhamTaiVien />} />
      <Route path="/danh-sach-bac-si" element={<DanhSachBacSi />} />
      <Route path="/bac-si/:doctorId/danh-gia" element={<DanhGia />} />
      <Route path="/chuyen-khoa" element={<ChuyenKhoa />} />
      <Route path="/co-so-y-te" element={<CoSoYTe />} />
      <Route path="/goi-kham" element={<GoiKham />} />
      <Route path="/chinh-sach-bao-mat" element={<ChinhSachBaoMat />} />
      <Route path="/dieu-khoan-su-dung" element={<DieuKhoanSuDung />} />
    </Route>
    <Route element={<AuthLayout />}>
      <Route element={<GuestMiddleware />}>
        <Route path="/dang-nhap" element={<DangNhap />} />
        <Route path="/dang-ky" element={<DangKy />} />
        <Route path="/dang-ky-bac-si" element={<DangKyBacSi />} />
        <Route path="/quen-mat-khau" element={<QuenMatKhau />} />
        <Route path="/xac-minh-otp" element={<XacMinhOtp />} />
        <Route path="/dat-lai-mat-khau" element={<DatLaiMatKhau />} />
      </Route>
    </Route>
  </>
);
