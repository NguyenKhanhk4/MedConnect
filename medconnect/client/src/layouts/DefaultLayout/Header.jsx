import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { auth } from "../../lib/firebase";
import { signOut } from "firebase/auth";
import { useAuth } from "../../hooks/useAuth";
import { useUserProfile } from "../../hooks/useUserProfile";
import {
  MenuOutlined,
  SearchOutlined,
  BellOutlined,
  UserOutlined,
  CalendarOutlined,
  DownOutlined,
} from "@ant-design/icons";
import { Avatar, Dropdown, Badge, Button, Space, Input } from "antd";
import { NotificationCenter } from "../../components/NotificationCenter/NotificationCenter";
import "./Header.scss";

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { userProfile } = useUserProfile();

  // Get patient avatar from userProfile
  const patientAvatar = 
    userProfile?.avatarUrl || 
    userProfile?.avatar || 
    userProfile?.photoURL || 
    user?.photoURL || 
    null;

  // Navigation categories cho trang chủ
  const defaultCategories = [
    { key: "all", label: "Trang chủ", path: "/" },
    { key: "home", label: "Tại nhà", path: "/kham-tai-nha" },
    { key: "hospital", label: "Tại viện", path: "/kham-tai-vien" },
    { key: "about", label: "Giới thiệu", path: "/gioi-thieu" },
  ];

  // Navigation categories cho trang search
  const searchCategories = [
    {
      key: "specialty",
      label: "Chuyên khoa",
      path: "/chuyen-khoa",
    },
    { key: "doctor", label: "Bác sĩ", path: "/danh-sach-bac-si" },
    { key: "facility", label: "Cơ sở y tế", path: "/co-so-y-te" },
    { key: "package", label: "Gói khám", path: "/goi-kham" },
  ];

  // Chọn categories dựa trên trang hiện tại
  const isDoctorPage = location.pathname === "/danh-sach-bac-si";
  const isSpecialtyPage = location.pathname === "/chuyen-khoa";
  const isFacilityPage = location.pathname === "/co-so-y-te";
  const isPackagePage = location.pathname === "/goi-kham";
  const isAppointmentPage = location.pathname.startsWith("/dat-lich");
  const isDoctorDashboard = location.pathname.startsWith("/bac-si");

  const useSearchCategories =
    isDoctorPage ||
    isSpecialtyPage ||
    isFacilityPage ||
    isPackagePage ||
    isAppointmentPage;
  const categories = useSearchCategories ? searchCategories : defaultCategories;

  const [activeCat, setActiveCat] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // register dropdown state (was referenced but not defined)
  const [registerDropdownOpen, setRegisterDropdownOpen] = useState(false);
  const [legalDropdownOpen, setLegalDropdownOpen] = useState(false);
  // search placeholder state (fix: placeholders / phIndex undefined)
  const placeholders = [
    "Tìm bác sĩ, chuyên khoa, cơ sở...",
    "Nhập từ khóa tìm kiếm...",
  ];
  const [phIndex, setPhIndex] = useState(0);
  // optional: rotate placeholder every 4s
  useEffect(() => {
    const t = setInterval(
      () => setPhIndex((i) => (i + 1) % placeholders.length),
      4000
    );
    return () => clearInterval(t);
  }, []);

  // showSearch state (fix: showSearch undefined)
  const [showSearch, setShowSearch] = useState(false);
  const toggleSearch = () => setShowSearch((v) => !v);

  // Appointment state for patient header
  const [appointments, setAppointments] = useState([]); // ensure default array
  const [loadingAppts, setLoadingAppts] = useState(false);

  // Check if current page is patient page
  const isPatientPage = location.pathname.startsWith("/benh-nhan");

  useEffect(() => {
    let mounted = true;
    if (!user || !isPatientPage) return;
    const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3000";
    (async () => {
      try {
        setLoadingAppts(true);
        const res = await fetch(`${apiBase}/api/patients/me/appointments`, {
          // include headers/token if needed
        });
        if (!mounted) return;
        if (!res.ok) {
          console.warn(
            "[Header] appointments fetch failed:",
            res.status,
            await res.text()
          );
          setAppointments([]);
          return;
        }
        const json = await res.json();
        // normalize to array
        const list = Array.isArray(json.data)
          ? json.data
          : Array.isArray(json)
          ? json
          : [];
        setAppointments(list);
      } catch (err) {
        console.error("Load appointments error:", err);
        if (mounted) setAppointments([]);
      } finally {
        if (mounted) setLoadingAppts(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user, isPatientPage]);

  // prepare safe values for render
  const apptList = Array.isArray(appointments) ? appointments.slice(0, 6) : [];
  const apptCount = Array.isArray(appointments) ? appointments.length : 0;

  // convert to antd menu items (avoid deprecated overlay prop)
  const apptMenuItems = apptList.map((item) => ({
    key: item._id || item.id,
    label: (
      <div
        onClick={() => {
          navigate(`/lich-hen/${item._id || item.id}`);
        }}
        style={{ display: "flex", justifyContent: "space-between", gap: 8 }}
      >
        <div>
          <div style={{ fontWeight: 700 }}>
            {item.title || item.reason || "Lịch hẹn"}
          </div>
          <div style={{ fontSize: 12, color: "#666" }}>
            {item.date || item.dateTime || ""}
          </div>
        </div>
        <div style={{ whiteSpace: "nowrap" }}>{item.status || ""}</div>
      </div>
    ),
  }));

  // Set active category based on current path
  useEffect(() => {
    const currentPath = location.pathname;

    // Nếu đang ở trang appointment, highlight "Bác sĩ" vì appointment thường đến từ trang bác sĩ
    if (currentPath.startsWith("/dat-lich")) {
      setActiveCat("doctor");
    } else if (currentPath === "/chuyen-khoa") {
      setActiveCat("specialty");
    } else if (currentPath === "/co-so-y-te") {
      setActiveCat("facility");
    } else if (currentPath === "/danh-sach-bac-si") {
      setActiveCat("doctor");
    } else if (currentPath === "/goi-kham") {
      setActiveCat("package");
    } else if (currentPath === "/tim-kiem") {
      setActiveCat("specialty"); // Default to specialty for search page
    } else if (currentPath === "/kham-tai-nha") {
      setActiveCat("home");
    } else if (currentPath === "/kham-tai-vien") {
      setActiveCat("hospital");
    } else if (currentPath === "/gioi-thieu") {
      setActiveCat("about");
    } else if (
      currentPath === "/chinh-sach-bao-mat" ||
      currentPath === "/dieu-khoan-su-dung"
    ) {
      setActiveCat("legal");
    } else {
      setActiveCat("all");
    }
  }, [location.pathname]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      // User state is managed by useAuth hook
      console.log("Auth state changed:", u);
    });
    return () => unsubscribe();
  }, []);

  // Load patient's upcoming appointments when on patient page and logged in
  useEffect(() => {
    let mounted = true;
    if (!user || !isPatientPage) return;
    const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3000";
    (async () => {
      try {
        setLoadingAppts(true);
        // adjust endpoint to match your backend
        const res = await fetch(`${apiBase}/api/patients/me/appointments`, {
          headers: {
            // include token if your backend needs auth: Authorization: `Bearer ${await user.getIdToken()}`
          },
        });
        if (!mounted) return;
        const json = await res.json();
        setAppointments(Array.isArray(json.data) ? json.data : json || []);
      } catch (err) {
        console.error("Load appointments error:", err);
        if (mounted) setAppointments([]);
      } finally {
        if (mounted) setLoadingAppts(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user, isPatientPage]);

  const handleLogout = async () => {
    try {
      // Sign out from Firebase first
      await signOut(auth);
      // Use window.location.href for hard redirect to homepage to avoid middleware redirects
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
      // Fallback: hard redirect to homepage
      window.location.href = "/";
    }
  };

  // Handle user menu actions (single definition)
  const onUserMenuClick = ({ key }) => {
    // logout
    if (key === "logout") {
      handleLogout();
      return;
    }

    // profile shortcut
    if (key === "profile") {
      navigate("/benh-nhan/cai-dat");
      return;
    }

    // dashboard shortcut
    if (key === "dashboard") {
      navigate("/benh-nhan/trang-chu", { replace: false });
      return;
    }

    // admin dashboard shortcut
    if (key === "admin") {
      navigate("/admin/trang-chu");
      return;
    }

    // manager dashboard shortcut
    if (key === "manager") {
      navigate("/manager/trang-chu");
      return;
    }

    // fallback: navigate to route named by key
    if (key) navigate(`/${key}`);
  };

  return (
    <header className="header">
      <div className="container header__content">
        {/* Left */}
        <div className="header__left">
          <button
            className="hamburger"
            aria-label="Menu"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <MenuOutlined style={{ fontSize: 28, color: "#111" }} />
          </button>
          <div
            className="logo"
            onClick={() => navigate("/")}
            style={{ cursor: "pointer" }}
          >
            <span className="logo-icon">+</span>
            <span className="logo-text">MedConnect</span>
          </div>
        </div>

        {/* Center */}
        <nav className="header__center">
          {categories.map((c) => (
            <Link
              key={c.key}
              to={c.path}
              className={`cat ${activeCat === c.key ? "active" : ""}`}
              onClick={() => setActiveCat(c.key)}
            >
              {c.label}
            </Link>
          ))}

          {/* Legal dropdown */}
          <div className="register-dropdown">
            <button
              className={`cat dropdown-toggle ${
                activeCat === "legal" ? "active" : ""
              }`}
              onClick={() => setLegalDropdownOpen(!legalDropdownOpen)}
            >
              Pháp lý
              <DownOutlined style={{ fontSize: "12px" }} />
            </button>
            {legalDropdownOpen && (
              <div className="dropdown-menu">
                <Link
                  to="/chinh-sach-bao-mat"
                  className="dropdown-item"
                  onClick={() => setLegalDropdownOpen(false)}
                >
                  Chính sách bảo mật
                </Link>
                <Link
                  to="/dieu-khoan-su-dung"
                  className="dropdown-item"
                  onClick={() => setLegalDropdownOpen(false)}
                >
                  Điều khoản sử dụng
                </Link>
              </div>
            )}
          </div>

          {/* Search (Ant Design) - REMOVED */}
          {/* {showSearch && (
            <div
              className="header__search"
              onClick={() => navigate("/tim-kiem")}
            >
              <Input
                className="search-custom"
                placeholder={placeholders[phIndex]}
                readOnly
                prefix={<SearchOutlined style={{ color: "#45c3d2" }} />}
              />
            </div>
          )} */}
        </nav>

        {/* Right */}
        <div className="header__right">
          {/* Booking button - visible luôn */}
          <Button
            type="primary"
            className="btn-booking"
            icon={<CalendarOutlined />}
            onClick={() => {
              // Check if user is logged in
              if (!user) {
                // If not logged in, redirect to login page
                navigate("/dang-nhap", {
                  state: {
                    from: "/dat-lich",
                    message: "Vui lòng đăng nhập để đặt lịch khám",
                  },
                });
                return;
              }

              // If logged in, navigate to appointment booking page
              navigate("/dat-lich");
            }}
          >
            Đặt lịch
          </Button>

          <div className="auth-links">
            {/* Only show login / register when NOT logged in.
                When user is logged in, name/logout will be handled by the Avatar dropdown below. */}
            {!user && (
              <>
                <Link to="/dang-nhap" className="btn-outline">
                  Đăng nhập
                </Link>
                <div className="register-dropdown">
                  <button
                    className="btn-primary dropdown-toggle"
                    onClick={() =>
                      setRegisterDropdownOpen(!registerDropdownOpen)
                    }
                  >
                    Đăng ký
                    <i className="bi bi-chevron-down"></i>
                  </button>
                  {registerDropdownOpen && (
                    <div className="dropdown-menu">
                      <Link
                        to="/dang-ky"
                        className="dropdown-item"
                        onClick={() => setRegisterDropdownOpen(false)}
                      >
                        <i className="bi bi-person"></i>
                        Tài khoản bệnh nhân
                      </Link>
                      <Link
                        to="/dang-ky-bac-si"
                        className="dropdown-item"
                        onClick={() => setRegisterDropdownOpen(false)}
                      >
                        <i className="bi bi-person-badge"></i>
                        Tài khoản bác sĩ
                      </Link>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Notification Center */}
          {user && !isDoctorDashboard && (
            <div className="patient-header-controls" style={{ marginLeft: 12 }}>
              <NotificationCenter />
            </div>
          )}

          {user && !isDoctorDashboard && (
            <Dropdown
              menu={{
                items: [
                  {
                    key: "user",
                    label: (
                      <div
                        style={{
                          display: "flex",
                          gap: 12,
                          alignItems: "center",
                          padding: "8px 0",
                          minWidth: 220,
                        }}
                      >
                        <Avatar 
                          size={48} 
                          src={patientAvatar}
                          icon={!patientAvatar && <UserOutlined />}
                        />
                        <div>
                          <div style={{ fontWeight: 700 }}>
                             {userProfile?.fullName || userProfile?.displayName || user?.displayName || "Bệnh nhân"}
                          </div>
                        </div>
                      </div>
                    ),
                    disabled: true,
                  },
                  { type: "divider", key: "d1" },
                  // Only show profile and dashboard for non-admin, non-manager users
                  ...(userProfile?.role !== "admin" &&
                  userProfile?.role !== "ADMIN" &&
                  userProfile?.role !== "manager" &&
                  userProfile?.role !== "MANAGER"
                    ? [
                        {
                          key: "profile",
                          label: (
                            <div style={{ minWidth: 220 }}>
                              <div style={{ fontWeight: 700 }}>Hồ sơ</div>
                              <div style={{ fontSize: 12, color: "#666" }}>
                                Xem và chỉnh sửa thông tin cá nhân
                              </div>
                            </div>
                          ),
                        },
                        { key: "dashboard", label: "Trang cá nhân" },
                      ]
                    : []),
                  // Admin Dashboard link - only show for admin users
                  ...(userProfile?.role === "admin" ||
                  userProfile?.role === "ADMIN"
                    ? [
                        {
                          key: "admin",
                          label: (
                            <div style={{ minWidth: 220 }}>
                              <div
                                style={{ fontWeight: 700, color: "#1890ff" }}
                              >
                                🛡️ Admin Dashboard
                              </div>
                              <div style={{ fontSize: 12, color: "#666" }}>
                                Quản trị hệ thống
                              </div>
                            </div>
                          ),
                        },
                      ]
                    : []),
                  // Manager Dashboard link - only show for manager users
                  ...(userProfile?.role === "manager" ||
                  userProfile?.role === "MANAGER"
                    ? [
                        {
                          key: "manager",
                          label: (
                            <div style={{ minWidth: 220 }}>
                              <div
                                style={{ fontWeight: 700, color: "#722ed1" }}
                              >
                                📅 Manager Dashboard
                              </div>
                              <div style={{ fontSize: 12, color: "#666" }}>
                                Quản lý lịch bác sĩ
                              </div>
                            </div>
                          ),
                        },
                      ]
                    : []),
                  { type: "divider", key: "d2" },
                  { key: "logout", label: "Đăng xuất", danger: true },
                ],
                onClick: onUserMenuClick,
              }}
              placement="bottomRight"
              trigger={["click"]}
            >
              <Avatar
                size={48}
                className="patient-avatar"
                src={patientAvatar}
                style={{
                  cursor: "pointer",
                  backgroundColor: patientAvatar ? "transparent" : "var(--primary-color, #12c2e9)",
                }}
                icon={!patientAvatar && <UserOutlined />}
              />
            </Dropdown>
          )}
        </div>
      </div>

      {/* Sidebar */}
      {sidebarOpen && (
        <>
          <div
            className="sidebar-overlay"
            onClick={() => setSidebarOpen(false)}
          ></div>
          <div className="sidebar">
            <div className="sidebar-header">
              <h3>Danh mục</h3>
              <button
                className="sidebar-close"
                onClick={() => setSidebarOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="sidebar-content">
              <div className="sidebar-section">
                <h4>Dịch vụ y tế</h4>
                <ul>
                  <li>
                    <Link to="/" onClick={() => setSidebarOpen(false)}>
                      Trang chủ
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/kham-tai-nha"
                      onClick={() => setSidebarOpen(false)}
                    >
                      Khám tại nhà
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/kham-tai-vien"
                      onClick={() => setSidebarOpen(false)}
                    >
                      Khám tại viện
                    </Link>
                  </li>
                  <li>
                    <Link to="/tim-kiem" onClick={() => setSidebarOpen(false)}>
                      Tìm kiếm tổng hợp
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="sidebar-section">
                <h4>Chuyên khoa</h4>
                <ul>
                  <li>
                    <Link
                      to="/chuyen-khoa"
                      onClick={() => setSidebarOpen(false)}
                    >
                      Tất cả chuyên khoa
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/danh-sach-bac-si"
                      onClick={() => setSidebarOpen(false)}
                    >
                      Danh sách bác sĩ
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/co-so-y-te"
                      onClick={() => setSidebarOpen(false)}
                    >
                      Cơ sở y tế
                    </Link>
                  </li>
                  <li>
                    <Link to="/goi-kham" onClick={() => setSidebarOpen(false)}>
                      Gói khám sức khỏe
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="sidebar-section">
                <h4>Hỗ trợ</h4>
                <ul>
                  <li>
                    <Link
                      to="/gioi-thieu"
                      onClick={() => setSidebarOpen(false)}
                    >
                      Giới thiệu
                    </Link>
                  </li>
                  <li>
                    <Link to="/lien-he" onClick={() => setSidebarOpen(false)}>
                      Liên hệ
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="sidebar-section">
                <h4>Pháp lý</h4>
                <ul>
                  <li>
                    <Link
                      to="/chinh-sach-bao-mat"
                      onClick={() => setSidebarOpen(false)}
                    >
                      Chính sách bảo mật
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/dieu-khoan-su-dung"
                      onClick={() => setSidebarOpen(false)}
                    >
                      Điều khoản sử dụng
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="sidebar-section">
                <h4>Tài khoản</h4>
                <ul>
                  {user ? (
                    <>
                      <li>
                        <Link
                          to="/profile"
                          onClick={() => setSidebarOpen(false)}
                        >
                          Thông tin cá nhân
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/lich-hen"
                          onClick={() => setSidebarOpen(false)}
                        >
                          Lịch hẹn của tôi
                        </Link>
                      </li>
                      <li>
                        <button
                          onClick={() => {
                            handleLogout();
                            setSidebarOpen(false);
                          }}
                          className="sidebar-logout"
                        >
                          Đăng xuất
                        </button>
                      </li>
                    </>
                  ) : (
                    <>
                      <li>
                        <Link
                          to="/dang-nhap"
                          onClick={() => setSidebarOpen(false)}
                        >
                          Đăng nhập
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/dang-ky"
                          onClick={() => setSidebarOpen(false)}
                        >
                          Đăng ký người dùng
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/dang-ky-bac-si"
                          onClick={() => setSidebarOpen(false)}
                        >
                          Đăng ký bác sĩ
                        </Link>
                      </li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
};

export default Header;
