# PHÂN TÍCH LUỒNG HOẠT ĐỘNG ADMIN DASHBOARD

## TỔNG QUAN HỆ THỐNG

Admin Dashboard của MedConnect được xây dựng với kiến trúc **React Router + Express.js**, sử dụng **Firebase Authentication** và **MongoDB**. Luồng hoạt động được chia thành 3 tầng chính:

1. **Frontend (React)**: Giao diện người dùng, routing, state management
2. **Middleware**: Xác thực và phân quyền
3. **Backend (Express)**: API endpoints, xử lý business logic, database

---

## 1. LUỒNG KHỞI ĐỘNG VÀ ROUTING

### 1.1. Entry Point - App.jsx

**File**: `client/src/App.jsx`

```javascript
// Dòng 23-50: Component App chính
const App = () => {
  // Chỉ test API trong development mode
  const { data, error, isError } = useQuery({...});
  
  return <Layout />; // Render Layout component
};
```

**Chức năng**: 
- Component gốc của ứng dụng
- Trả về `<Layout />` component

---

### 1.2. Layout Component - core/Layout.jsx

**File**: `client/src/core/Layout.jsx`

```javascript
// Dòng 6-16: Component Layout chính
const Layout = () => {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {publicRoutes}    // Routes công khai (trang chủ, đăng nhập, ...)
        {privateRoutes}   // Routes yêu cầu đăng nhập (admin, doctor, patient)
      </Routes>
    </>
  );
};
```

**Chức năng**:
- Khai báo routing cho toàn bộ ứng dụng
- `publicRoutes`: Routes không cần đăng nhập
- `privateRoutes`: Routes cần đăng nhập (bao gồm admin routes)

---

### 1.3. Private Routes Configuration - routes/privateRoutes.jsx

**File**: `client/src/routes/privateRoutes.jsx`

```javascript
// Dòng 199-220: Cấu hình Admin Routes
<Route element={<AdminMiddleware />}>        // Middleware kiểm tra quyền admin
  <Route element={<AdminLayout />}>          // Layout chung cho admin
    <Route path="/admin/trang-chu" element={<TrangChuAdmin />} />
    <Route path="/admin" element={<TrangChuAdmin />} />
    <Route path="/admin/xac-minh-bac-si" element={<XacMinhBacSi />} />
    <Route path="/admin/nguoi-dung" element={<NguoiDung />} />
    <Route path="/admin/chuyen-khoa" element={<ChuyenKhoa />} />
    <Route path="/admin/lich-hen" element={<LichHenAdmin />} />
    <Route path="/admin/thong-ke" element={<ThongKe />} />
  </Route>
</Route>
```

**Luồng xử lý**:
1. Khi user truy cập `/admin/*`, React Router kiểm tra `AdminMiddleware` trước
2. Nếu pass middleware, render `AdminLayout`
3. `AdminLayout` render `<Outlet />` để hiển thị component tương ứng với route

---

## 2. MIDDLEWARE XÁC THỰC VÀ PHÂN QUYỀN

### 2.1. AdminMiddleware - Kiểm tra quyền Admin

**File**: `client/src/middlewares/AdminMiddleware.jsx`

```javascript
// Dòng 5-54: Component AdminMiddleware
const AdminMiddleware = () => {
  // Bước 1: Lấy thông tin user từ Firebase Auth
  const { user, loading } = useAuth();
  
  // Bước 2: Lấy profile user từ database
  const { userProfile, loading: profileLoading } = useUserProfile();

  // Bước 3: Hiển thị loading khi đang kiểm tra
  if (loading || profileLoading) {
    return <div>Đang kiểm tra quyền truy cập admin...</div>;
  }

  // Bước 4: Nếu chưa đăng nhập, redirect về trang đăng nhập
  if (!user) {
    return <Navigate to="/dang-nhap" replace />;
  }

  // Bước 5: Kiểm tra role có phải admin không
  const isAdmin =
    userProfile?.role === "admin" ||
    userProfile?.role === "ADMIN" ||
    user?.role === "admin" ||
    user?.role === "ADMIN";

  // Bước 6: Nếu không phải admin, redirect về trang phù hợp với role
  if (!isAdmin) {
    const userRole = userProfile?.role || user?.role;
    if (userRole === "doctor") {
      return <Navigate to="/bac-si/trang-chu" replace />;
    } else if (userRole === "patient" || userRole === "user") {
      return <Navigate to="/benh-nhan/trang-chu" replace />;
    }
    return <Navigate to="/" replace />;
  }

  // Bước 7: Nếu là admin, render Outlet (cho phép truy cập)
  return <Outlet />;
};
```

**Luồng xử lý chi tiết**:

1. **useAuth() Hook** (Dòng 6):
   - File: `client/src/hooks/useAuth.js`
   - Sử dụng `auth.onAuthStateChanged()` từ Firebase
   - Trả về `{ user, loading }` - thông tin user từ Firebase Authentication
   - **Code chạy**: 
     ```javascript
     // Dòng 8-14: useEffect lắng nghe auth state changes
     useEffect(() => {
       const unsub = auth.onAuthStateChanged((u) => {
         setUser(u || null);
         setLoading(false);
       });
       return () => unsub();
     }, []);
     ```

2. **useUserProfile() Hook** (Dòng 7):
   - File: `client/src/hooks/useUserProfile.js`
   - Gọi API để lấy profile từ database
   - **Code chạy**:
     ```javascript
     // Dòng 11-124: useEffect fetch user profile
     useEffect(() => {
       const fetchUserProfile = async () => {
         const firebaseUser = auth.currentUser;
         if (!firebaseUser) {
           setUserProfile(null);
           return;
         }
         
         // Gọi API getCurrentPatientProfile() hoặc getCurrentUser()
         const patientResponse = await getCurrentPatientProfile();
         const profileData = patientResponse?.data || patientResponse;
         
         // Combine Firebase user với profile data
         const combinedProfile = {
           uid: firebaseUser.uid,
           email: profileData?.user?.email || firebaseUser.email,
           role: profileData?.user?.role,  // <-- Role được lấy từ đây
           ...
         };
         setUserProfile(combinedProfile);
       };
       
       const unsubscribe = auth.onAuthStateChanged((user) => {
         if (user) {
           fetchUserProfile();
         }
       });
       return () => unsubscribe();
     }, []);
     ```

3. **Kiểm tra quyền Admin** (Dòng 33-37):
   - Kiểm tra `userProfile?.role === "admin"` hoặc `user?.role === "admin"`
   - Nếu không phải admin → redirect về trang phù hợp

4. **Render Outlet** (Dòng 53):
   - Nếu là admin, render `<Outlet />` để hiển thị component con

---

## 3. ADMIN LAYOUT - GIAO DIỆN CHUNG

### 3.1. AdminLayout Component

**File**: `client/src/layouts/AdminLayout/AdminLayout.jsx`

```javascript
// Dòng 22-177: Component AdminLayout
const AdminLayout = () => {
  const location = useLocation();  // Lấy đường dẫn hiện tại
  const navigate = useNavigate();  // Navigation function
  const [collapsed, setCollapsed] = useState(false);  // State cho sidebar

  // Dòng 28-60: Định nghĩa menu items
  const menuItems = [
    { key: "/admin/trang-chu", icon: <HomeOutlined />, label: "Tổng quan" },
    { key: "/admin/xac-minh-bac-si", icon: <SafetyCertificateOutlined />, label: "Xác minh bác sĩ" },
    { key: "/admin/nguoi-dung", icon: <TeamOutlined />, label: "Quản lý người dùng" },
    { key: "/admin/chuyen-khoa", icon: <MedicineBoxOutlined />, label: "Quản lý chuyên khoa" },
    { key: "/admin/lich-hen", icon: <CalendarOutlined />, label: "Quản lý lịch hẹn" },
    { key: "/admin/thong-ke", icon: <FileTextOutlined />, label: "Thống kê" },
  ];

  // Dòng 62-64: Xử lý click menu
  const handleMenuClick = ({ key }) => {
    navigate(key);  // Navigate đến route tương ứng
  };

  // Dòng 66-74: Xử lý logout
  const handleLogout = async () => {
    try {
      await clearUserData();  // Clear user data từ localStorage/sessionStorage
    } catch (error) {
      console.error("Error during admin logout:", error);
      window.location.reload();
    }
  };

  // Dòng 85-173: Render JSX
  return (
    <Layout className="admin-layout">
      <Sider>  {/* Sidebar bên trái */}
        <div className="admin-logo">MedConnect</div>
        <div className="admin-profile">Admin</div>
        <Menu
          selectedKeys={[location.pathname]}  // Highlight menu item theo route hiện tại
          items={menuItems}
          onClick={handleMenuClick}  // Xử lý click
        />
      </Sider>
      
      <Layout className="admin-main">
        <Header className="admin-header">
          {/* Header với notification và user menu */}
        </Header>
        
        <Content className="admin-content">
          <Outlet />  {/* Render component con theo route */}
        </Content>
      </Layout>
    </Layout>
  );
};
```

**Luồng xử lý**:

1. **Khởi tạo** (Dòng 22-25):
   - `useLocation()`: Lấy pathname hiện tại (ví dụ: `/admin/trang-chu`)
   - `useNavigate()`: Function để navigate
   - `useState(false)`: State để collapse/expand sidebar

2. **Menu Items** (Dòng 28-60):
   - Định nghĩa danh sách menu với `key` là đường dẫn route
   - Mỗi menu item có icon và label

3. **Handle Menu Click** (Dòng 62-64):
   - Khi click menu item, gọi `navigate(key)`
   - React Router sẽ chuyển route và render component tương ứng

4. **Render Layout** (Dòng 85-173):
   - **Sidebar (Sider)**: Menu navigation bên trái
   - **Header**: Header bar trên cùng
   - **Content**: Chứa `<Outlet />` - render component con

5. **Outlet Component** (Dòng 170):
   - React Router sẽ render component tương ứng với route hiện tại
   - Ví dụ: `/admin/trang-chu` → render `<TrangChuAdmin />`

---

## 4. TRANG TỔNG QUAN (DASHBOARD)

### 4.1. TrangChu Component - Admin Dashboard

**File**: `client/src/pages/Admin/trang-chu/TrangChu.jsx`

```javascript
// Dòng 21-316: Component TrangChu (Admin Dashboard)
const TrangChu = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statsData, setStatsData] = useState({...});
  const [recentActivities, setRecentActivities] = useState([]);
  const [systemStatus, setSystemStatus] = useState([]);

  // Dòng 42-44: useEffect chạy khi component mount
  useEffect(() => {
    fetchDashboardData();  // Gọi hàm fetch dữ liệu
  }, []);

  // Dòng 46-66: Hàm fetch dữ liệu dashboard
  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Bước 1: Gọi API lấy stats
      const stats = await getAdminDashboardStats();
      setStatsData(stats.data || stats);

      // Bước 2: Gọi API lấy activities
      await fetchActivities(0, 10);

      // Bước 3: Gọi API lấy system status
      const status = await getAdminSystemStatus();
      setSystemStatus(status.data || status);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Không thể tải dữ liệu dashboard");
    } finally {
      setLoading(false);
    }
  };

  // Dòng 68-95: Hàm fetch activities
  const fetchActivities = async (offset = 0, limit = 10, append = false) => {
    try {
      setActivitiesLoading(true);
      const response = await getAdminDashboardActivities({ limit, offset });
      const newActivities = response.data || response;

      if (append) {
        setRecentActivities((prev) => [...prev, ...newActivities]);
      } else {
        setRecentActivities(newActivities);
      }
    } catch (err) {
      console.error("Error fetching activities:", err);
    } finally {
      setActivitiesLoading(false);
    }
  };

  // Dòng 117-157: Định nghĩa stats cards
  const statsCards = [
    {
      title: "Tổng người dùng",
      value: statsData.totalUsers,
      icon: <UserOutlined />,
      path: "/admin/users",
    },
    {
      title: "Bác sĩ đã xác minh",
      value: statsData.verifiedDoctors,
      icon: <SafetyCertificateOutlined />,
      path: "/admin/verify-doctors",
    },
    // ... các stats khác
  ];

  // Dòng 192-313: Render JSX
  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>Tổng quan hệ thống</h1>
      </div>

      <Row gutter={[24, 24]}>
        {statsCards.map((stat, index) => (
          <Col xs={24} sm={12} lg={6} key={index}>
            <Card
              className="stat-card clickable"
              onClick={() => navigate(stat.path)}  // Navigate khi click card
            >
              <div className="stat-icon">{stat.icon}</div>
              <div className="stat-content">
                <div className="stat-title">{stat.title}</div>
                <div className="stat-value">{stat.value}</div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card title="Hoạt động gần đây">
            <List
              dataSource={recentActivities}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar icon={getActivityIcon(item.type)} />}
                    title={item.title}
                    description={item.time}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Tình trạng hệ thống">
            {systemStatus.map((item, index) => (
              <div key={index} className="status-item">
                <div className="status-label">{item.label}</div>
                <div className="status-value">{item.value}</div>
              </div>
            ))}
          </Card>
        </Col>
      </Row>
    </div>
  );
};
```

**Luồng xử lý chi tiết**:

1. **Component Mount** (Dòng 42-44):
   - Khi component được render, `useEffect` chạy
   - Gọi `fetchDashboardData()`

2. **Fetch Dashboard Data** (Dòng 46-66):
   - **Bước 1**: Gọi `getAdminDashboardStats()`
     - File: `client/src/lib/api.js` (Dòng 1061-1067)
     - **Code chạy**:
       ```javascript
       export async function getAdminDashboardStats() {
         const r = await fetch(`${BASE}/api/admin/dashboard/stats`, {
           credentials: "include",  // Gửi cookie để xác thực
         });
         if (!r.ok) throw new Error(await r.text());
         return r.json();
       }
       ```
     - **Backend**: `GET /api/admin/dashboard/stats`
     - **Controller**: `server/controllers/adminController.js` (Dòng 117-178)
       ```javascript
       export const getDashboardStats = async (req, res) => {
         // Lấy số lượng users
         const totalUsers = await User.countDocuments();
         
         // Lấy số lượng doctors đã verify
         const verifiedDoctors = await Doctor.countDocuments({ isVerified: true });
         
         // Lấy số lượng doctors chờ verify
         const pendingDoctors = await Doctor.countDocuments({ isVerified: false });
         
         // Lấy tổng số appointments
         const totalAppointments = await Appointment.countDocuments({});
         
         // Tính revenue từ Payment collection
         const revenueResult = await Payment.aggregate([
           { $match: { status: { $in: ['captured', 'authorized'] } } },
           { $project: { netRevenue: { $subtract: ['$total', '$refundAmount'] } } },
           { $group: { _id: null, totalRevenue: { $sum: '$netRevenue' } } }
         ]);
         
         const revenue = revenueResult[0]?.totalRevenue || 0;
         
         res.json({ success: true, data: { totalUsers, verifiedDoctors, pendingDoctors, monthlyAppointments: totalAppointments, revenue } });
       };
       ```
     - **Response**: `{ success: true, data: { totalUsers, verifiedDoctors, pendingDoctors, monthlyAppointments, revenue } }`

   - **Bước 2**: Gọi `getAdminDashboardActivities()`
     - File: `client/src/lib/api.js` (Dòng 1081-1095)
     - **Code chạy**:
       ```javascript
       export async function getAdminDashboardActivities(params = {}) {
         const { limit = 50, offset = 0 } = params;
         const url = `${BASE}/api/admin/dashboard/activities?limit=${limit}&offset=${offset}`;
         const r = await fetch(url, { credentials: "include" });
         if (!r.ok) throw new Error(await r.text());
         return r.json();
       }
       ```
     - **Backend**: `GET /api/admin/dashboard/activities`
     - **Controller**: `server/controllers/adminController.js` (Dòng 181-249)
       ```javascript
       export const getDashboardActivities = async (req, res) => {
         // Lấy 3 users mới nhất
         const recentUsers = await User.find()
           .sort({ createdAt: -1 })
           .limit(3)
           .select("fullName role createdAt")
           .lean();
         
         // Lấy 2 doctors mới nhất đã verify
         const recentDoctors = await Doctor.find()
           .populate({ path: "userId", select: "fullName" })
           .sort({ createdAt: -1 })
           .limit(2)
           .select("userId isVerified createdAt")
           .lean();
         
         const activities = [];
         
         // Thêm user registrations
         recentUsers.forEach((user) => {
           activities.push({
             title: `${user.fullName} đã đăng ký tài khoản ${user.role === "doctor" ? "bác sĩ" : "bệnh nhân"}`,
             time: getTimeAgo(user.createdAt),
             type: "user_registration",
           });
         });
         
         // Thêm doctor verifications
         recentDoctors.forEach((doctor) => {
           if (doctor.isVerified && doctor.userId) {
             activities.push({
               title: `BS. ${doctor.userId.fullName} đã được xác minh`,
               time: getTimeAgo(doctor.createdAt),
               type: "doctor_verification",
             });
           }
         });
         
         // Sắp xếp theo thời gian
         activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
         
         res.json({ success: true, data: activities.slice(0, 4) });
       };
       ```

   - **Bước 3**: Gọi `getAdminSystemStatus()`
     - File: `client/src/lib/api.js` (Dòng 1097-1103)
     - **Backend**: `GET /api/admin/dashboard/system-status`
     - **Controller**: `server/controllers/adminController.js` (Dòng 251-280)
       ```javascript
       export const getSystemStatus = async (req, res) => {
         const status = [
           { label: "Hệ thống", value: "Hoạt động bình thường" },
           { label: "Cơ sở dữ liệu", value: "Kết nối ổn định" },
           { label: "API", value: "Phản hồi nhanh" },
         ];
         res.json({ success: true, data: status });
       };
       ```

3. **Render UI** (Dòng 192-313):
   - Hiển thị stats cards với dữ liệu từ `statsData`
   - Hiển thị danh sách activities
   - Hiển thị system status

4. **Click Stat Card** (Dòng 211):
   - Khi click vào stat card, gọi `navigate(stat.path)`
   - Ví dụ: Click "Tổng người dùng" → navigate đến `/admin/users`

---

## 5. TRANG XÁC MINH BÁC SĨ

### 5.1. XacMinhBacSi Component

**File**: `client/src/pages/Admin/xac-minh-bac-si/XacMinhBacSi.jsx`

```javascript
// Dòng 26-718: Component XacMinhBacSi
const XacMinhBacSi = () => {
  const [activeTab, setActiveTab] = useState("pending");  // Tab mặc định: "pending"
  const [loading, setLoading] = useState(true);
  const [pendingDoctors, setPendingDoctors] = useState([]);
  const [verifiedDoctors, setVerifiedDoctors] = useState([]);
  const [rejectedDoctors, setRejectedDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Dòng 37-39: useEffect chạy khi component mount
  useEffect(() => {
    fetchDoctors();  // Gọi hàm fetch danh sách doctors
  }, []);

  // Dòng 41-59: Hàm fetch danh sách doctors
  const fetchDoctors = async () => {
    try {
      setLoading(true);

      // Bước 1: Lấy danh sách doctors chờ xác minh
      const pending = await getPendingDoctors();
      setPendingDoctors(pending.data || pending || []);

      // Bước 2: Lấy danh sách doctors đã xác minh
      const verified = await getVerifiedDoctors();
      setVerifiedDoctors(verified.data || verified || []);

      // Bước 3: Lấy danh sách doctors bị từ chối
      const rejected = await getRejectedDoctors();
      setRejectedDoctors(rejected.data || rejected || []);
    } catch (err) {
      console.error("Error fetching doctors:", err);
      setError("Không thể tải danh sách bác sĩ");
    } finally {
      setLoading(false);
    }
  };

  // Dòng 61-70: Hàm phê duyệt doctor
  const handleApprove = async (doctorId) => {
    try {
      await approveDoctor(doctorId);  // Gọi API approve
      message.success("Đã phê duyệt bác sĩ thành công");
      fetchDoctors();  // Refresh danh sách
    } catch (err) {
      console.error("Error approving doctor:", err);
      message.error("Có lỗi xảy ra khi phê duyệt");
    }
  };

  // Dòng 72-135: Hàm từ chối doctor
  const handleReject = async (doctorId, closeModal = false) => {
    return new Promise((resolve) => {
      Modal.confirm({
        title: "Từ chối bác sĩ",
        content: (
          <Input.TextArea
            placeholder="Nhập lý do từ chối..."
            onChange={(e) => {
              rejectionReasonValue = e.target.value;
            }}
          />
        ),
        onOk: async () => {
          if (!rejectionReasonValue.trim()) {
            message.error("Vui lòng nhập lý do từ chối");
            return Promise.reject();
          }
          
          try {
            await rejectDoctor(doctorId, rejectionReasonValue.trim());
            message.success("Đã từ chối bác sĩ thành công");
            fetchDoctors();  // Refresh danh sách
            resolve(true);
          } catch (err) {
            message.error("Có lỗi xảy ra khi từ chối");
            return Promise.reject();
          }
        },
      });
    });
  };

  // Dòng 329-400: Định nghĩa tabs
  const tabItems = [
    {
      key: "pending",
      label: "Chờ xác minh",
      children: (
        <div className="doctors-list">
          {filteredPendingDoctors.map((doctor) =>
            renderDoctorRow(doctor, "pending")
          )}
        </div>
      ),
    },
    {
      key: "verified",
      label: "Đã xác minh",
      children: (
        <div className="doctors-list">
          {filteredVerifiedDoctors.map((doctor) =>
            renderDoctorRow(doctor, "verified")
          )}
        </div>
      ),
    },
    {
      key: "rejected",
      label: "Đã từ chối",
      children: (
        <div className="doctors-list">
          {filteredRejectedDoctors.map((doctor) =>
            renderDoctorRow(doctor, "rejected")
          )}
        </div>
      ),
    },
  ];

  // Dòng 681-715: Render JSX
  return (
    <div className="verify-doctors">
      <div className="page-header">
        <h1>Xác minh bác sĩ</h1>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}  // Thay đổi tab
        items={tabItems}
      />

      {renderDetailModal()}  {/* Modal chi tiết doctor */}
    </div>
  );
};
```

**Luồng xử lý chi tiết**:

1. **Component Mount** (Dòng 37-39):
   - Gọi `fetchDoctors()` để lấy danh sách doctors

2. **Fetch Doctors** (Dòng 41-59):
   - **Bước 1**: Gọi `getPendingDoctors()`
     - File: `client/src/lib/api.js`
     - **Backend**: `GET /api/admin/doctors/pending`
     - **Controller**: `server/controllers/adminController.js`
       ```javascript
       export const getPendingDoctors = async (req, res) => {
         const doctors = await Doctor.find({ isVerified: false })
           .populate("userId", "email phone fullName")
           .populate("specializationIds", "name")
           .populate("clinicDefaultId", "name")
           .lean();
         
         res.json({ success: true, data: doctors });
       };
       ```

   - **Bước 2**: Gọi `getVerifiedDoctors()`
     - **Backend**: `GET /api/admin/doctors/verified`
     - **Controller**: Lấy doctors có `isVerified: true`

   - **Bước 3**: Gọi `getRejectedDoctors()`
     - **Backend**: `GET /api/admin/doctors/rejected`
     - **Controller**: Lấy doctors có `status: "rejected"`

3. **Approve Doctor** (Dòng 61-70):
   - Gọi `approveDoctor(doctorId)`
   - File: `client/src/lib/api.js`
   - **Backend**: `POST /api/admin/doctors/:id/approve`
   - **Controller**: `server/controllers/adminController.js`
     ```javascript
     export const approveDoctor = async (req, res) => {
       const { id } = req.params;
       
       // Tìm doctor
       const doctor = await Doctor.findById(id);
       if (!doctor) {
         return res.status(404).json({ success: false, message: "Doctor not found" });
       }
       
       // Cập nhật isVerified = true
       doctor.isVerified = true;
       doctor.status = "approved";
       await doctor.save();
       
       // Gửi email thông báo cho doctor
       // ... (code gửi email)
       
       res.json({ success: true, message: "Doctor approved successfully" });
     };
     ```

4. **Reject Doctor** (Dòng 72-135):
   - Hiển thị Modal để nhập lý do từ chối
   - Gọi `rejectDoctor(doctorId, reason)`
   - **Backend**: `POST /api/admin/doctors/:id/reject`
   - **Controller**: `server/controllers/adminController.js`
     ```javascript
     export const rejectDoctor = async (req, res) => {
       const { id } = req.params;
       const { reason } = req.body;
       
       // Tìm doctor
       const doctor = await Doctor.findById(id);
       if (!doctor) {
         return res.status(404).json({ success: false, message: "Doctor not found" });
       }
       
       // Cập nhật status = "rejected"
       doctor.status = "rejected";
       doctor.rejectionReason = reason;
       await doctor.save();
       
       // Gửi email thông báo cho doctor
       // ... (code gửi email)
       
       res.json({ success: true, message: "Doctor rejected successfully" });
     };
     ```

5. **Render Tabs** (Dòng 329-400):
   - Hiển thị 3 tabs: "pending", "verified", "rejected"
   - Mỗi tab hiển thị danh sách doctors tương ứng

6. **View Details** (Dòng 137-145):
   - Khi click "Xem chi tiết", mở modal hiển thị thông tin chi tiết doctor
   - Modal hiển thị: thông tin cá nhân, chuyên khoa, tài liệu đính kèm, ...

---

## 6. BACKEND API ROUTES

### 6.1. Admin Routes Configuration

**File**: `server/routes/admin/admin.routes.js`

```javascript
// Dòng 51-102: Cấu hình admin routes
const adminRouter = express.Router();

// Áp dụng authGuard middleware cho tất cả routes
adminRouter.use(authGuard);

// Dashboard routes
adminRouter.get("/dashboard/stats", getDashboardStats);
adminRouter.get("/dashboard/activities", getDashboardActivities);
adminRouter.get("/dashboard/system-status", getSystemStatus);

// Doctors routes
adminRouter.get("/doctors", getAllDoctors);
adminRouter.get("/doctors/pending", getPendingDoctors);
adminRouter.get("/doctors/verified", getVerifiedDoctors);
adminRouter.get("/doctors/rejected", getRejectedDoctors);
adminRouter.post("/doctors/:id/approve", approveDoctor);
adminRouter.post("/doctors/:id/reject", rejectDoctor);

// Users routes
adminRouter.get("/users", getAllUsers);
adminRouter.post("/users", createUser);
adminRouter.get("/users/:id", getUserDetails);
adminRouter.put("/users/:id", updateUser);
adminRouter.delete("/users/:id", deleteUser);

// Specializations routes
adminRouter.get("/specializations", getAllSpecializations);
adminRouter.post("/specializations", addSpecialization);
adminRouter.put("/specializations/:id", updateSpecialization);
adminRouter.delete("/specializations/:id", deleteSpecialization);

// Appointments routes
adminRouter.get("/appointments", getAllAppointments);
adminRouter.put("/appointments/:id/status", updateAppointmentStatus);
adminRouter.delete("/appointments/:id", deleteAppointment);

// Payment routes
adminRouter.get("/payment/revenue-stats", getPaymentRevenueStats);
adminRouter.get("/payment/invoices", getAdminInvoices);

// Statistics routes
adminRouter.get("/statistics", getStatistics);
```

**Luồng xử lý**:

1. **authGuard Middleware** (Dòng 54):
   - File: `server/middleware/auth.js`
   - **Code chạy**:
     ```javascript
     export async function authGuard(req, res, next) {
       // Bước 1: Lấy session cookie từ request
       const cookie = req.cookies[COOKIE_NAME] || "";
       
       if (!cookie) {
         return fail(res, 401, "UNAUTHORIZED", "No session cookie found");
       }
       
       try {
         // Bước 2: Verify session cookie với Firebase Admin
         const decoded = await admin.auth().verifySessionCookie(cookie, true);
         
         // Bước 3: Lấy thông tin user từ Firebase Admin nếu cần
         if (!decoded.email && decoded.uid) {
           const userRecord = await admin.auth().getUser(decoded.uid);
           decoded.email = userRecord.email;
         }
         
         // Bước 4: Gán user vào req.user
         req.user = decoded;
         next();  // Cho phép tiếp tục
       } catch (e) {
         return fail(res, 401, "UNAUTHORIZED", e.message);
       }
     }
     ```

2. **Route Registration** (File: `server/routes/api.router.js`):
   ```javascript
   import adminRouter from "./admin/admin.routes.js";
   
   apiRouter.use("/admin", adminRouter);
   ```
   - Tất cả routes bắt đầu với `/api/admin/*` sẽ đi qua `adminRouter`

3. **Controller Functions** (File: `server/controllers/adminController.js`):
   - Mỗi route gọi một controller function tương ứng
   - Controller function xử lý business logic và trả về response

---

## 7. TÓM TẮT LUỒNG HOẠT ĐỘNG TỔNG THỂ

### 7.1. Luồng truy cập Admin Dashboard

```
1. User truy cập /admin/trang-chu
   ↓
2. React Router kiểm tra route trong privateRoutes.jsx
   ↓
3. AdminMiddleware kiểm tra quyền:
   - useAuth() → Lấy user từ Firebase Auth
   - useUserProfile() → Lấy profile từ database
   - Kiểm tra role === "admin"
   - Nếu không phải admin → redirect
   - Nếu là admin → render Outlet
   ↓
4. AdminLayout render:
   - Sidebar với menu navigation
   - Header với user menu
   - Content với <Outlet />
   ↓
5. TrangChu component render:
   - useEffect() → Gọi fetchDashboardData()
   - getAdminDashboardStats() → Gọi API /api/admin/dashboard/stats
   - getAdminDashboardActivities() → Gọi API /api/admin/dashboard/activities
   - getAdminSystemStatus() → Gọi API /api/admin/dashboard/system-status
   ↓
6. Backend xử lý:
   - authGuard middleware kiểm tra session cookie
   - Verify cookie với Firebase Admin
   - Controller function xử lý business logic
   - Query database (MongoDB)
   - Trả về response JSON
   ↓
7. Frontend nhận response:
   - setStatsData() → Cập nhật state
   - setRecentActivities() → Cập nhật state
   - setSystemStatus() → Cập nhật state
   - Render UI với dữ liệu mới
```

### 7.2. Luồng phê duyệt bác sĩ

```
1. Admin click "Phê duyệt" trên doctor card
   ↓
2. handleApprove(doctorId) được gọi
   ↓
3. approveDoctor(doctorId) → Gọi API POST /api/admin/doctors/:id/approve
   ↓
4. Backend xử lý:
   - authGuard kiểm tra quyền
   - approveDoctor controller:
     - Tìm doctor theo ID
     - Cập nhật isVerified = true
     - Cập nhật status = "approved"
     - Lưu vào database
     - Gửi email thông báo (nếu có)
     - Trả về response
   ↓
5. Frontend nhận response:
   - Hiển thị message.success("Đã phê duyệt bác sĩ thành công")
   - fetchDoctors() → Refresh danh sách doctors
   ↓
6. UI cập nhật:
   - Doctor chuyển từ tab "pending" sang tab "verified"
```

### 7.3. Luồng từ chối bác sĩ

```
1. Admin click "Từ chối" trên doctor card
   ↓
2. handleReject(doctorId) được gọi
   ↓
3. Modal.confirm() hiển thị để nhập lý do từ chối
   ↓
4. Admin nhập lý do và click "Xác nhận từ chối"
   ↓
5. rejectDoctor(doctorId, reason) → Gọi API POST /api/admin/doctors/:id/reject
   ↓
6. Backend xử lý:
   - authGuard kiểm tra quyền
   - rejectDoctor controller:
     - Tìm doctor theo ID
     - Cập nhật status = "rejected"
     - Cập nhật rejectionReason = reason
     - Lưu vào database
     - Gửi email thông báo với lý do từ chối
     - Trả về response
   ↓
7. Frontend nhận response:
   - Hiển thị message.success("Đã từ chối bác sĩ thành công")
   - fetchDoctors() → Refresh danh sách doctors
   ↓
8. UI cập nhật:
   - Doctor chuyển từ tab "pending" sang tab "rejected"
```

---

## 8. CÁC ĐIỂM QUAN TRỌNG

### 8.1. Authentication Flow

- **Frontend**: Sử dụng Firebase Authentication (`auth.onAuthStateChanged()`)
- **Backend**: Sử dụng Firebase Admin SDK để verify session cookie
- **Session Cookie**: Được tạo khi user đăng nhập, lưu trong cookie của browser
- **Middleware**: `authGuard` kiểm tra cookie trước mỗi API request

### 8.2. Authorization Flow

- **Role-based**: Kiểm tra `userProfile.role === "admin"` trong `AdminMiddleware`
- **Auto-redirect**: Nếu không phải admin, tự động redirect về trang phù hợp
- **Multiple Checks**: Kiểm tra role ở cả `userProfile` và `user` object

### 8.3. Data Flow

- **Frontend → Backend**: Gửi request với `credentials: "include"` để gửi cookie
- **Backend → Database**: Query MongoDB với Mongoose
- **Database → Backend**: Trả về dữ liệu từ MongoDB
- **Backend → Frontend**: Trả về JSON response
- **Frontend**: Cập nhật state và render UI

### 8.4. Error Handling

- **Frontend**: Try-catch trong async functions, hiển thị error message
- **Backend**: Try-catch trong controllers, trả về error response
- **API Errors**: Kiểm tra `r.ok` trước khi parse JSON
- **User Feedback**: Sử dụng `message.success()` và `message.error()` từ Ant Design

---

## 9. CÁC FILE QUAN TRỌNG

### Frontend:
- `client/src/App.jsx` - Entry point
- `client/src/core/Layout.jsx` - Main layout với routing
- `client/src/routes/privateRoutes.jsx` - Cấu hình admin routes
- `client/src/middlewares/AdminMiddleware.jsx` - Middleware kiểm tra quyền admin
- `client/src/layouts/AdminLayout/AdminLayout.jsx` - Layout chung cho admin
- `client/src/pages/Admin/trang-chu/TrangChu.jsx` - Trang dashboard
- `client/src/pages/Admin/xac-minh-bac-si/XacMinhBacSi.jsx` - Trang xác minh bác sĩ
- `client/src/hooks/useAuth.js` - Hook lấy thông tin user từ Firebase
- `client/src/hooks/useUserProfile.js` - Hook lấy profile user từ database
- `client/src/lib/api.js` - Các hàm API calls

### Backend:
- `server/routes/api.router.js` - Đăng ký admin router
- `server/routes/admin/admin.routes.js` - Cấu hình admin routes
- `server/middleware/auth.js` - authGuard middleware
- `server/controllers/adminController.js` - Controller functions xử lý business logic
- `server/models/*.model.js` - MongoDB models (User, Doctor, Appointment, ...)

---

## 10. KẾT LUẬN

Admin Dashboard của MedConnect được xây dựng với kiến trúc rõ ràng, tách biệt giữa Frontend và Backend. Luồng hoạt động từ khi user truy cập đến khi hiển thị dữ liệu đều được xử lý qua các bước:

1. **Routing**: React Router điều hướng request
2. **Middleware**: Kiểm tra authentication và authorization
3. **Layout**: Render layout chung
4. **Component**: Render component tương ứng với route
5. **API Calls**: Gọi API để lấy dữ liệu
6. **Backend Processing**: Xử lý business logic và query database
7. **Response**: Trả về dữ liệu và cập nhật UI

Mỗi bước đều có error handling và user feedback để đảm bảo trải nghiệm người dùng tốt nhất.
