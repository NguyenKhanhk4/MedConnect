import { useState, useEffect } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import Sidebar from "../../pages/Doctor/Sidebar/Sidebar";
import { DauTrang } from "../../pages/Doctor/components/dau-trang/DauTrang";
import "./DoctorLayout.scss";

export default function DoctorLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeMenu, setActiveMenu] = useState("dashboard");

  // Update activeMenu based on current route
  useEffect(() => {
    const path = location.pathname;
    if (
      path === "/bac-si/trang-chu" ||
      path === "/bac-si" ||
      path === "/bac-si/"
    ) {
      setActiveMenu("dashboard");
    } else if (path === "/bac-si/quan-ly-lich") {
      setActiveMenu("schedule");
    } else if (path.startsWith("/bac-si/lich-hen")) {
      setActiveMenu("appointments");
    } else if (path === "/bac-si/ho-so-kham") {
      setActiveMenu("medical-history");
    } else if (path === "/bac-si/thong-bao") {
      setActiveMenu("notifications");
    } else if (path === "/bac-si/yeu-cau-doi-lich") {
      setActiveMenu("reschedule-requests");
    } else if (path === "/bac-si/danh-gia") {
      setActiveMenu("reviews");
    } else if (path === "/bac-si/cai-dat") {
      setActiveMenu("settings");
    }
  }, [location.pathname]);

  const handleMenuChange = (menuId) => {
    setActiveMenu(menuId);

    // Navigate to appropriate route based on menu selection
    if (menuId === "dashboard") {
      navigate("/bac-si/trang-chu");
    } else if (menuId === "schedule") {
      navigate("/bac-si/quan-ly-lich");
    } else if (menuId === "appointments") {
      navigate("/bac-si/lich-hen");
    } else if (menuId === "medical-history") {
      navigate("/bac-si/ho-so-kham");
    } else if (menuId === "notifications") {
      navigate("/bac-si/thong-bao");
    } else if (menuId === "reschedule-requests") {
      navigate("/bac-si/yeu-cau-doi-lich");
    } else if (menuId === "reviews") {
      navigate("/bac-si/danh-gia");
    } else if (menuId === "settings") {
      navigate("/bac-si/cai-dat");
    }
  };

  return (
    <div className="doctor-layout-container">
      <Sidebar activeMenu={activeMenu} onMenuChange={handleMenuChange} />
      <div className="doctor-layout-main">
        <DauTrang />
        <main
          className={`doctor-layout-content ${
            location.pathname === "/bac-si/ho-so-kham" ||
            location.pathname.startsWith("/bac-si/lich-hen")
              ? "no-scroll"
              : ""
          }`}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
