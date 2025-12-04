import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card,
  Input,
  Select,
  Avatar,
  Tag,
  Button,
  Space,
  Dropdown,
  Spin,
  Alert,
  Modal,
  Form,
  message,
  Descriptions,
  Divider,
  Image,
  Pagination,
} from "antd";
import {
  SearchOutlined,
  MoreOutlined,
  UserOutlined,
  CalendarOutlined,
  EyeOutlined,
  EditOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  IdcardOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  getAdminUsers,
  banUser,
  suspendUser,
  activateUser,
  deleteUser,
  getUserDetails,
  updateUser,
  changeUserPassword,
  createUser,
  getAllSpecializations,
} from "../../../lib/api";
import "./NguoiDung.scss";

// Helper function to get full image URL
const getImageUrl = (url) => {
  if (!url) return null;
  // If URL is a base64 data URL, return as is
  if (url.startsWith("data:image/")) {
    return url;
  }
  // If URL is already absolute (starts with http:// or https://), return as is
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  // If URL starts with /, it's a server path, prepend API base URL
  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3000";
  return `${apiBase}${url.startsWith("/") ? url : `/${url}`}`;
};

const NguoiDung = () => {
  const [searchText, setSearchText] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allUsers, setAllUsers] = useState([]); // Store all users loaded from API
  const [users, setUsers] = useState([]); // Filtered users
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [editForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createForm] = Form.useForm();
  const [specializations, setSpecializations] = useState([]);
  const [clinics, setClinics] = useState([]);

  // Load users from API (only when roleFilter changes, not search term)
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {};
      if (roleFilter !== "all") params.role = roleFilter;

      const data = await getAdminUsers(params);

      // Handle different response formats
      let usersData = [];
      if (data && data.success && data.data) {
        usersData = Array.isArray(data.data) ? data.data : [];
      } else if (Array.isArray(data)) {
        usersData = data;
      } else if (data && data.data && Array.isArray(data.data)) {
        usersData = data.data;
      }

      setAllUsers(usersData); // Store all users
      // Filter will be applied by useEffect
    } catch (err) {
      console.error("Error fetching users:", err);
      setError(
        "Không thể tải danh sách người dùng: " +
          (err.message || "Lỗi không xác định")
      );
      setAllUsers([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Filter users locally (like VerifyDoctors) - based on search term
  const filterUsers = (users, searchTerm) => {
    if (!searchTerm.trim()) return users;

    const term = searchTerm.toLowerCase().trim();
    return users.filter((user) => {
      const name = (user.fullName || user.name || "").toLowerCase();
      const email = (user.email || "").toLowerCase();
      const phone = (user.phone || "").toLowerCase();

      return (
        name.includes(term) || email.includes(term) || phone.includes(term)
      );
    });
  };

  // Apply local filter when searchText or allUsers changes
  useEffect(() => {
    const filtered = filterUsers(allUsers, searchText);
    setUsers(filtered);
    setCurrentPage(1); // Reset to page 1 when filter changes
  }, [searchText, allUsers]);

  // Reset to page 1 when roleFilter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter]);

  // Calculate paginated users
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return users.slice(startIndex, endIndex);
  }, [users, currentPage, pageSize]);

  // Handle page change
  const handlePageChange = (page, size) => {
    setCurrentPage(page);
    if (size !== pageSize) {
      setPageSize(size);
      setCurrentPage(1); // Reset to page 1 when page size changes
    }
  };

  // Load specializations and clinics
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load specializations
        const specResponse = await getAllSpecializations({ limit: 100 });
        if (specResponse.success && specResponse.data) {
          setSpecializations(specResponse.data);
        }

        // Load clinics
        const BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";
        const clinicsResponse = await fetch(`${BASE}/api/clinics?limit=1000`, {
          credentials: "include",
        });
        if (clinicsResponse.ok) {
          const clinicsData = await clinicsResponse.json();

          // API returns { success: true, data: { clinics: [...], pagination: {...} } }
          let clinicsArray = [];
          if (clinicsData.success && clinicsData.data) {
            if (Array.isArray(clinicsData.data.clinics)) {
              clinicsArray = clinicsData.data.clinics;
            } else if (Array.isArray(clinicsData.clinics)) {
              // Fallback for different response format
              clinicsArray = clinicsData.clinics;
            }
          }

          setClinics(clinicsArray);
        } else {
          console.error("❌ Failed to load clinics:", clinicsResponse.status);
          setClinics([]);
        }
      } catch (err) {
        console.error("Error loading specializations/clinics:", err);
      }
    };
    loadData();
  }, []);

  const handleSearchChange = useCallback((e) => {
    setSearchText(e.target.value);
    // Filter will be applied by useEffect
  }, []);

  const handleManualSearch = useCallback((value) => {
    setSearchText(value);
    // Filter will be applied by useEffect
  }, []);

  const handleRoleChange = useCallback((value) => {
    setRoleFilter(value);
  }, []);

  const roleOptions = [
    { value: "all", label: "Tất cả vai trò" },
    { value: "patient", label: "Bệnh nhân" },
    { value: "doctor", label: "Bác sĩ" },
    { value: "admin", label: "Quản trị viên" },
    { value: "manager", label: "Quản lý" },
  ];

  const getRoleTag = (role) => {
    const roleConfig = {
      patient: { color: "blue", text: "Bệnh nhân" },
      doctor: { color: "green", text: "Bác sĩ" },
      admin: { color: "red", text: "Quản trị viên" },
      manager: { color: "purple", text: "Quản lý" },
    };
    return roleConfig[role] || { color: "default", text: role };
  };

  const getStatusTag = (status) => {
    const statusConfig = {
      active: { color: "green", text: "Hoạt động" },
      inactive: { color: "orange", text: "Không hoạt động" },
      suspended: { color: "orange", text: "Tạm khóa" },
      banned: { color: "red", text: "Cấm" },
    };
    return statusConfig[status] || { color: "default", text: status };
  };

  const handleUserAction = async (action, userId) => {
    try {
      switch (action) {
        case "ban":
          await banUser(userId);
          message.success("Đã cấm người dùng");
          break;
        case "suspend":
          await suspendUser(userId);
          message.success("Đã tạm khóa người dùng");
          break;
        case "activate":
          await activateUser(userId);
          message.success("Đã kích hoạt người dùng");
          break;
        case "delete":
          await deleteUser(userId);
          message.success("Đã xóa người dùng");
          break;
        default:
          return;
      }
      // Refresh users list
      fetchUsers();
    } catch (err) {
      console.error(`Error ${action} user:`, err);
      message.error(`Không thể thực hiện thao tác: ${err.message}`);
    }
  };

  // Handle view details
  const handleViewDetails = async (userId) => {
    try {
      const response = await getUserDetails(userId);
      setUserDetails(response.data || response);
      setSelectedUser(users.find((user) => user.id === userId));
      setDetailModalVisible(true);
    } catch (err) {
      console.error("Error fetching user details:", err);
      message.error("Không thể tải thông tin chi tiết người dùng");
    }
  };

  // Handle edit user
  const handleEditUser = async (userId) => {
    try {
      const response = await getUserDetails(userId);
      const userData = response.data || response;
      setUserDetails(userData);
      setSelectedUser(users.find((user) => user.id === userId));

      // Populate form with current user data
      const formValues = {
        fullName: userData.fullName,
        email: userData.email,
        phone: userData.phone,
        role: userData.role,
        status: userData.status,
      };

      // Add doctor-specific fields if user is a doctor
      if (userData.role === "doctor" && userData.roleSpecificData) {
        formValues.specializationIds =
          userData.roleSpecificData.specializationIds?.map(
            (spec) => spec._id
          ) || [];
        formValues.yearsExperience =
          userData.roleSpecificData.yearsExperience || 0;
        formValues.educationLevel =
          userData.roleSpecificData.educationLevel || "";
        formValues.bio = userData.roleSpecificData.bio || "";

        // Set clinicAddress to clinic ID for the Select component
        const clinicId = userData.roleSpecificData.clinicDefaultId?._id || null;
        formValues.clinicAddress = clinicId; // Use clinic ID as Select value
        formValues.clinicDefaultId = clinicId;
      }

      editForm.setFieldsValue(formValues);

      setEditModalVisible(true);
    } catch (err) {
      console.error("Error fetching user details for edit:", err);
      message.error("Không thể tải thông tin người dùng để chỉnh sửa");
    }
  };

  // Handle update user
  const handleUpdateUser = async (values) => {
    try {
      await updateUser(selectedUser.id, values);
      message.success("Cập nhật thông tin người dùng thành công");
      setEditModalVisible(false);
      fetchUsers();
    } catch (err) {
      console.error("Error updating user:", err);
      message.error("Không thể cập nhật thông tin người dùng");
    }
  };

  // Handle change password
  const handleChangePassword = async (values) => {
    try {
      await changeUserPassword(selectedUser.id, values.newPassword);
      message.success("Đổi mật khẩu thành công");
      passwordForm.resetFields();
    } catch (err) {
      console.error("Error changing password:", err);
      message.error("Không thể đổi mật khẩu");
    }
  };

  const userMenuItems = (userId, userStatus) => {
    const items = [
      {
        key: "view",
        label: "Xem chi tiết",
        icon: <EyeOutlined />,
        onClick: () => handleViewDetails(userId),
      },
      {
        key: "edit",
        label: "Chỉnh sửa",
        icon: <EditOutlined />,
        onClick: () => handleEditUser(userId),
      },
    ];

    // Add Ban button (only if not already banned)
    if (userStatus !== "banned") {
      items.push({
        key: "ban",
        label: "Cấm",
        icon: <LockOutlined />,
        danger: true,
        onClick: () => handleUserAction("ban", userId),
      });
    }

    // Add Suspend/Activate button
    if (userStatus === "active") {
      items.push({
        key: "suspend",
        label: "Tạm khóa",
        icon: <LockOutlined />,
        onClick: () => handleUserAction("suspend", userId),
      });
    } else if (userStatus === "suspended") {
      items.push({
        key: "activate",
        label: "Kích hoạt",
        icon: <LockOutlined />,
        onClick: () => handleUserAction("activate", userId),
      });
    }

    // Add Delete button
    items.push({
      key: "delete",
      label: "Xóa",
      icon: <MoreOutlined />,
      danger: true,
      onClick: () => handleUserAction("delete", userId),
    });

    return items;
  };

  if (loading) {
    return (
      <div className="user-management">
        <div className="page-header">
          <h1>Quản lý người dùng</h1>
          <p>Xem và quản lý tất cả người dùng trong hệ thống</p>
        </div>
        <div style={{ textAlign: "center", padding: "50px" }}>
          <Spin size="large" />
          <p style={{ marginTop: "16px" }}>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="user-management">
        <div className="page-header">
          <h1>Quản lý người dùng</h1>
          <p>Xem và quản lý tất cả người dùng trong hệ thống</p>
        </div>
        <Alert
          message="Lỗi tải dữ liệu"
          description={error}
          type="error"
          showIcon
          style={{ margin: "20px 0" }}
        />
      </div>
    );
  }

  return (
    <div className="user-management">
      <div className="page-header">
        <div>
          <h1>Quản lý người dùng</h1>
          <p>Xem và quản lý tất cả người dùng trong hệ thống</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            createForm.resetFields();
            setCreateModalVisible(true);
          }}
        >
          Tạo người dùng mới
        </Button>
      </div>

      <div className="search-filters">
        <div className="search-input-group">
          <Input.Search
            placeholder="Tìm kiếm người dùng..."
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            value={searchText}
            onChange={handleSearchChange}
            onSearch={handleManualSearch}
            style={{ width: "100%", maxWidth: "500px" }}
          />
        </div>
        <Select
          value={roleFilter}
          onChange={handleRoleChange}
          options={roleOptions}
          className="role-select"
          size="large"
        />
      </div>

      <div className="results-info">
        <p>Tìm thấy {users.length} người dùng</p>
      </div>

      <div className="users-list">
        {paginatedUsers.map((user) => {
          const roleConfig = getRoleTag(user.role);
          const statusConfig = getStatusTag(user.status);

          return (
            <Card key={user.id} className="user-card">
              <div className="user-info">
                <Avatar
                  size={60}
                  src={user.avatar ? getImageUrl(user.avatar) : null}
                  icon={<UserOutlined />}
                />
                <div className="user-details">
                  <div className="user-name">
                    <h3>{user.name}</h3>
                    <Tag color={roleConfig.color}>{roleConfig.text}</Tag>
                    <Tag color={statusConfig.color}>{statusConfig.text}</Tag>
                  </div>
                  <p className="user-email">{user.email}</p>
                  <div className="user-meta">
                    <div className="meta-item">
                      <CalendarOutlined />
                      <span>Tham gia: {user.joinDate}</span>
                    </div>
                    <div className="meta-item">
                      <UserOutlined />
                      <span>Hoạt động: {user.lastActive}</span>
                    </div>
                  </div>
                </div>
                <div className="user-actions">
                  <Dropdown
                    menu={{ items: userMenuItems(user.id, user.status) }}
                    trigger={["click"]}
                    placement="bottomRight"
                  >
                    <Button type="text" icon={<MoreOutlined />} />
                  </Dropdown>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Pagination */}
      {users.length > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "2rem",
            marginBottom: "1rem",
          }}
        >
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={users.length}
            onChange={handlePageChange}
            onShowSizeChange={handlePageChange}
            showSizeChanger
            showQuickJumper
            showTotal={(total, range) =>
              `${range[0]}-${range[1]} của ${total} người dùng`
            }
            pageSizeOptions={["5", "10", "20", "50", "100"]}
          />
        </div>
      )}

      {/* User Detail Modal */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <UserOutlined style={{ color: "#1890ff" }} />
            <span>Thông tin chi tiết người dùng</span>
          </div>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            Đóng
          </Button>,
        ]}
        width={800}
      >
        {userDetails && (
          <div className="user-detail-modal">
            <div className="user-header">
              <Avatar
                size={80}
                src={
                  userDetails.avatar ? getImageUrl(userDetails.avatar) : null
                }
                icon={<UserOutlined />}
              />
              <div className="user-info">
                <h2>{userDetails.fullName}</h2>
                <div className="user-tags">
                  <Tag color={getRoleTag(userDetails.role).color}>
                    {getRoleTag(userDetails.role).text}
                  </Tag>
                  <Tag color={getStatusTag(userDetails.status).color}>
                    {getStatusTag(userDetails.status).text}
                  </Tag>
                </div>
              </div>
            </div>

            <Divider />

            {/* Basic Information */}
            <Descriptions title="Thông tin cơ bản" bordered column={2}>
              <Descriptions.Item label="Họ và tên" span={2}>
                {userDetails.roleSpecificData?.fullName || userDetails.fullName}
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                <MailOutlined
                  style={{ marginRight: "8px", color: "#1890ff" }}
                />
                {userDetails.roleSpecificData?.email || userDetails.email}
              </Descriptions.Item>
              <Descriptions.Item label="Số điện thoại">
                <PhoneOutlined
                  style={{ marginRight: "8px", color: "#1890ff" }}
                />
                {userDetails.roleSpecificData?.phone ||
                  userDetails.phone ||
                  "Chưa cập nhật"}
              </Descriptions.Item>
            </Descriptions>

            {/* Role-specific Information */}
            {userDetails.role === "patient" && userDetails.roleSpecificData && (
              <>
                <Divider />
                <Descriptions title="Thông tin bệnh nhân" bordered column={2}>
                  <Descriptions.Item label="Mã bảo hiểm y tế">
                    {userDetails.roleSpecificData.insuranceNumber ||
                      "Chưa cập nhật"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Nghề nghiệp">
                    {userDetails.roleSpecificData.occupation || "Chưa cập nhật"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Dân tộc">
                    {userDetails.roleSpecificData.ethnicity || "Chưa cập nhật"}
                  </Descriptions.Item>
                  <Descriptions.Item label="CCCD/CMND">
                    {userDetails.roleSpecificData.citizenId || "Chưa cập nhật"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Dị ứng" span={2}>
                    {userDetails.roleSpecificData.allergyNotes ||
                    userDetails.roleSpecificData.allergies
                      ? userDetails.roleSpecificData.allergyNotes ||
                        userDetails.roleSpecificData.allergies
                      : "Không có"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Tiền sử bệnh lý" span={2}>
                    {userDetails.roleSpecificData.medicalHistory &&
                    userDetails.roleSpecificData.medicalHistory.length > 0
                      ? userDetails.roleSpecificData.medicalHistory.join(", ")
                      : "Không có"}
                  </Descriptions.Item>
                </Descriptions>
              </>
            )}

            {userDetails.role === "doctor" && userDetails.roleSpecificData && (
              <>
                <Divider />
                <Descriptions title="Thông tin bác sĩ" bordered column={2}>
                  <Descriptions.Item label="Giấy phép hành nghề" span={2}>
                    {userDetails.roleSpecificData.licenseNo ? (
                      <Image
                        src={getImageUrl(
                          `/server-uploads/doctors/${userDetails.roleSpecificData.licenseNo}`
                        )}
                        alt="Giấy phép hành nghề"
                        width={200}
                        height={200}
                        style={{
                          objectFit: "cover",
                          borderRadius: "8px",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                        }}
                        preview={{
                          mask: "Xem ảnh",
                        }}
                      />
                    ) : (
                      "Chưa cập nhật"
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="Số năm kinh nghiệm">
                    {userDetails.roleSpecificData.yearsExperience || 0} năm
                  </Descriptions.Item>
                  <Descriptions.Item label="Trình độ học vấn">
                    {userDetails.roleSpecificData.educationLevel ||
                      "Chưa cập nhật"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Chuyên khoa" span={2}>
                    {userDetails.roleSpecificData.specializationIds &&
                    userDetails.roleSpecificData.specializationIds.length > 0
                      ? userDetails.roleSpecificData.specializationIds
                          .map((spec) => spec.name)
                          .join(", ")
                      : "Chưa cập nhật"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Phòng khám">
                    {userDetails.roleSpecificData.clinicDefaultId?.name ||
                      "Chưa cập nhật"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Địa chỉ phòng khám">
                    {userDetails.roleSpecificData.clinicDefaultId?.address ||
                      "Chưa cập nhật"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Giới thiệu" span={2}>
                    {userDetails.roleSpecificData.bio || "Chưa cập nhật"}
                  </Descriptions.Item>
                </Descriptions>
              </>
            )}

            <Divider />

            <Descriptions title="Thông tin hệ thống" bordered column={2}>
              <Descriptions.Item label="ID người dùng">
                <IdcardOutlined
                  style={{ marginRight: "8px", color: "#1890ff" }}
                />
                {userDetails._id || userDetails.id}
              </Descriptions.Item>
              <Descriptions.Item label="Vai trò">
                {getRoleTag(userDetails.role).text}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                {getStatusTag(userDetails.status).text}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày tạo">
                {userDetails.createdAt
                  ? new Date(userDetails.createdAt).toLocaleDateString("vi-VN")
                  : "Chưa có thông tin"}
              </Descriptions.Item>
              <Descriptions.Item label="Cập nhật lần cuối">
                {userDetails.updatedAt
                  ? new Date(userDetails.updatedAt).toLocaleDateString("vi-VN")
                  : "Chưa có thông tin"}
              </Descriptions.Item>
              <Descriptions.Item label="Hoạt động cuối">
                {userDetails.lastActive || "Chưa có thông tin"}
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>

      {/* User Edit Modal */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <EditOutlined style={{ color: "#1890ff" }} />
            <span>Chỉnh sửa thông tin người dùng</span>
          </div>
        }
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdateUser}>
          <Form.Item
            label="Họ và tên"
            name="fullName"
            rules={[{ required: true, message: "Vui lòng nhập họ và tên" }]}
          >
            <Input placeholder="Nhập họ và tên" />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Vui lòng nhập email" },
              { type: "email", message: "Email không hợp lệ" },
            ]}
          >
            <Input placeholder="Nhập email" />
          </Form.Item>

          <Form.Item label="Số điện thoại" name="phone">
            <Input placeholder="Nhập số điện thoại" />
          </Form.Item>

          <Form.Item
            label="Vai trò"
            name="role"
          >
            <Form.Item noStyle shouldUpdate>
              {({ getFieldValue }) => {
                const roleValue = getFieldValue("role");
                return (
                  <Input 
                    disabled={true}
                    value={roleValue ? getRoleTag(roleValue).text : ""}
                  />
                );
              }}
            </Form.Item>
          </Form.Item>

          <Form.Item
            label="Trạng thái"
            name="status"
            rules={[{ required: true, message: "Vui lòng chọn trạng thái" }]}
          >
            <Select placeholder="Chọn trạng thái">
              <Select.Option value="active">Hoạt động</Select.Option>
              <Select.Option value="inactive">Không hoạt động</Select.Option>
              <Select.Option value="suspended">Tạm khóa</Select.Option>
              <Select.Option value="banned">Cấm</Select.Option>
            </Select>
          </Form.Item>

          {/* Doctor-specific fields */}
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.role !== currentValues.role
            }
          >
            {({ getFieldValue }) =>
              getFieldValue("role") === "doctor" ? (
                <>
                  <Divider>Thông tin bác sĩ</Divider>

                  <Form.Item
                    label="Chuyên khoa"
                    name="specializationIds"
                    tooltip="Có thể chọn nhiều chuyên khoa"
                  >
                    <Select
                      mode="multiple"
                      placeholder="Chọn chuyên khoa"
                      showSearch
                      filterOption={(input, option) =>
                        option?.children
                          ?.toLowerCase()
                          .includes(input.toLowerCase()) ?? false
                      }
                    >
                      {specializations.map((spec) => (
                        <Select.Option
                          key={spec.id || spec._id}
                          value={spec.id || spec._id}
                        >
                          {spec.name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item label="Năm kinh nghiệm" name="yearsExperience">
                    <Input
                      type="number"
                      placeholder="Nhập số năm kinh nghiệm"
                      min={0}
                    />
                  </Form.Item>

                  <Form.Item label="Trình độ học vấn" name="educationLevel">
                    <Select placeholder="Chọn trình độ học vấn">
                      <Select.Option value="Bác sĩ">Bác sĩ</Select.Option>
                      <Select.Option value="Thạc sĩ">Thạc sĩ</Select.Option>
                      <Select.Option value="Tiến sĩ">Tiến sĩ</Select.Option>
                      <Select.Option value="Phó Giáo Sư">
                        Phó Giáo Sư
                      </Select.Option>
                      <Select.Option value="Giáo Sư">Giáo Sư</Select.Option>
                    </Select>
                  </Form.Item>

                  <Form.Item label="Giới thiệu" name="bio">
                    <Input.TextArea
                      placeholder="Nhập giới thiệu về bác sĩ"
                      rows={4}
                    />
                  </Form.Item>

                  <Form.Item
                    label="Địa chỉ phòng khám"
                    name="clinicAddress"
                    tooltip="Chọn phòng khám từ danh sách có sẵn"
                  >
                    <Select
                      placeholder="Chọn phòng khám"
                      showSearch
                      filterOption={(input, option) => {
                        const label = option?.children?.toLowerCase() || "";
                        return label.includes(input.toLowerCase());
                      }}
                      allowClear
                      onChange={(value) => {
                        // When clinic is selected, set clinicDefaultId
                        editForm.setFieldsValue({
                          clinicDefaultId: value || null,
                        });
                      }}
                    >
                      {Array.isArray(clinics) &&
                        clinics.map((clinic) => (
                          <Select.Option
                            key={clinic.id || clinic._id}
                            value={clinic.id || clinic._id}
                          >
                            {clinic.name} -{" "}
                            {clinic.address || "Chưa có địa chỉ"}
                          </Select.Option>
                        ))}
                    </Select>
                  </Form.Item>

                  {/* Hidden field to store clinic ID */}
                  <Form.Item name="clinicDefaultId" style={{ display: "none" }}>
                    <Input />
                  </Form.Item>
                </>
              ) : null
            }
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: "24px" }}>
            <Space>
              <Button type="primary" htmlType="submit">
                Cập nhật thông tin
              </Button>
              <Button onClick={() => setEditModalVisible(false)}>Hủy</Button>
            </Space>
          </Form.Item>
        </Form>

        <Divider>Đổi mật khẩu</Divider>

        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handleChangePassword}
        >
          <Form.Item
            label="Mật khẩu mới"
            name="newPassword"
            rules={[
              { required: true, message: "Vui lòng nhập mật khẩu mới" },
              { min: 6, message: "Mật khẩu phải có ít nhất 6 ký tự" },
            ]}
          >
            <Input.Password placeholder="Nhập mật khẩu mới" />
          </Form.Item>

          <Form.Item
            label="Xác nhận mật khẩu"
            name="confirmPassword"
            dependencies={["newPassword"]}
            rules={[
              { required: true, message: "Vui lòng xác nhận mật khẩu" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("newPassword") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error("Mật khẩu xác nhận không khớp")
                  );
                },
              }),
            ]}
          >
            <Input.Password placeholder="Xác nhận mật khẩu mới" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<LockOutlined />}>
              Đổi mật khẩu
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Create User Modal */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <PlusOutlined style={{ color: "#1890ff" }} />
            <span>Tạo người dùng mới</span>
          </div>
        }
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          createForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={async (values) => {
            try {
              await createUser(values);
              message.success("Tạo người dùng thành công");
              setCreateModalVisible(false);
              createForm.resetFields();
              fetchUsers();
            } catch (err) {
              console.error("Error creating user:", err);
              message.error(err.message || "Không thể tạo người dùng");
            }
          }}
        >
          <Form.Item
            label="Họ và tên"
            name="fullName"
            rules={[{ required: true, message: "Vui lòng nhập họ và tên" }]}
          >
            <Input placeholder="Nhập họ và tên" />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Vui lòng nhập email" },
              { type: "email", message: "Email không hợp lệ" },
            ]}
          >
            <Input placeholder="Nhập email" />
          </Form.Item>

          <Form.Item label="Số điện thoại" name="phone">
            <Input placeholder="Nhập số điện thoại (tùy chọn)" />
          </Form.Item>

          <Form.Item
            label="Vai trò"
            name="role"
            rules={[{ required: true, message: "Vui lòng chọn vai trò" }]}
          >
            <Select placeholder="Chọn vai trò">
              <Select.Option value="patient">Bệnh nhân</Select.Option>
              <Select.Option value="doctor">Bác sĩ</Select.Option>
              <Select.Option value="admin">Quản trị viên</Select.Option>
              <Select.Option value="manager">Quản lý</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="Trạng thái" name="status" initialValue="active">
            <Select placeholder="Chọn trạng thái">
              <Select.Option value="active">Hoạt động</Select.Option>
              <Select.Option value="inactive">Không hoạt động</Select.Option>
              <Select.Option value="suspended">Tạm khóa</Select.Option>
              <Select.Option value="banned">Cấm</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Mật khẩu"
            name="password"
            rules={[
              { required: true, message: "Vui lòng nhập mật khẩu" },
              { min: 8, message: "Mật khẩu phải có ít nhất 8 ký tự" },
            ]}
          >
            <Input.Password placeholder="Nhập mật khẩu" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: "24px" }}>
            <Space>
              <Button type="primary" htmlType="submit">
                Tạo người dùng
              </Button>
              <Button
                onClick={() => {
                  setCreateModalVisible(false);
                  createForm.resetFields();
                }}
              >
                Hủy
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default NguoiDung;
