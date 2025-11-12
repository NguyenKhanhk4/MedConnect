// Copy from Admin UserManagement and adapt for Manager
// Manager can manage patient, doctor, manager users (not admin)
import React, { useState, useEffect, useCallback } from "react";
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
  suspendUser,
  activateUser,
  deleteUser,
  getUserDetails,
  updateUser,
  changeUserPassword,
  createUser,
} from "../../../lib/api";
import "./QuanLyNguoiDung.scss";

const QuanLyNguoiDung = () => {
  const [searchText, setSearchText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [editForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createForm] = Form.useForm();

  // Debounce search text
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchText);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchText]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);

      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (roleFilter !== "all") params.role = roleFilter;

      const data = await getAdminUsers(params);
      // Filter out admin users - manager cannot see/manage admin
      const filteredData = (data.data || data).filter(
        (user) => user.role !== "admin"
      );
      setUsers(filteredData);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Không thể tải danh sách người dùng");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearchChange = useCallback((e) => {
    setSearchText(e.target.value);
  }, []);

  const handleManualSearch = useCallback(() => {
    setSearchQuery(searchText);
  }, [searchText]);

  const handleRoleChange = useCallback((value) => {
    setRoleFilter(value);
  }, []);

  const roleOptions = [
    { value: "all", label: "Tất cả vai trò" },
    { value: "patient", label: "Bệnh nhân" },
    { value: "doctor", label: "Bác sĩ" },
    { value: "manager", label: "Quản lý" },
  ];

  const getRoleTag = (role) => {
    const roleConfig = {
      patient: { color: "blue", text: "Bệnh nhân" },
      doctor: { color: "green", text: "Bác sĩ" },
      manager: { color: "purple", text: "Quản lý" },
    };
    return roleConfig[role] || { color: "default", text: role };
  };

  const getStatusTag = (status) => {
    const statusConfig = {
      active: { color: "green", text: "Hoạt động" },
      inactive: { color: "orange", text: "Không hoạt động" },
      suspended: { color: "red", text: "Tạm khóa" },
    };
    return statusConfig[status] || { color: "default", text: status };
  };

  const handleUserAction = async (action, userId) => {
    try {
      switch (action) {
        case "suspend":
          await suspendUser(userId);
          break;
        case "activate":
          await activateUser(userId);
          break;
        case "delete":
          await deleteUser(userId);
          break;
        default:
          return;
      }
      fetchUsers();
    } catch (err) {
      console.error(`Error ${action} user:`, err);
    }
  };

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

  const handleEditUser = async (userId) => {
    try {
      const response = await getUserDetails(userId);
      const userData = response.data || response;
      setUserDetails(userData);
      setSelectedUser(users.find((user) => user.id === userId));

      editForm.setFieldsValue({
        fullName: userData.fullName,
        email: userData.email,
        phone: userData.phone,
        role: userData.role,
        status: userData.status,
        address: userData.address,
        dateOfBirth: userData.dateOfBirth,
        gender: userData.gender,
      });

      setEditModalVisible(true);
    } catch (err) {
      console.error("Error fetching user details for edit:", err);
      message.error("Không thể tải thông tin người dùng để chỉnh sửa");
    }
  };

  const handleUpdateUser = async (values) => {
    try {
      // Prevent changing role to admin
      if (values.role === "admin") {
        message.error("Không thể thay đổi vai trò thành Quản trị viên");
        return;
      }
      await updateUser(selectedUser.id, values);
      message.success("Cập nhật thông tin người dùng thành công");
      setEditModalVisible(false);
      fetchUsers();
    } catch (err) {
      console.error("Error updating user:", err);
      message.error("Không thể cập nhật thông tin người dùng");
    }
  };

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

  const userMenuItems = (userId, userStatus) => [
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
    {
      key: userStatus === "active" ? "suspend" : "activate",
      label: userStatus === "active" ? "Tạm khóa" : "Kích hoạt",
      icon: <LockOutlined />,
      onClick: () =>
        handleUserAction(
          userStatus === "active" ? "suspend" : "activate",
          userId
        ),
    },
    {
      key: "delete",
      label: "Xóa",
      icon: <MoreOutlined />,
      danger: true,
      onClick: () => handleUserAction("delete", userId),
    },
  ];

  if (loading) {
    return (
      <div className="manager-user-management">
        <div className="page-header">
          <h1>Quản lý người dùng</h1>
          <p>Xem và quản lý người dùng trong hệ thống</p>
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
      <div className="manager-user-management">
        <div className="page-header">
          <h1>Quản lý người dùng</h1>
          <p>Xem và quản lý người dùng trong hệ thống</p>
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
    <div className="manager-user-management">
      <div className="page-header">
        <div>
          <h1>Quản lý người dùng</h1>
          <p>Xem và quản lý người dùng trong hệ thống</p>
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
          <Input
            key="search-input"
            placeholder="Tìm theo tên hoặc email..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={handleSearchChange}
            className="search-input"
            onPressEnter={handleManualSearch}
          />
          <Button
            type="primary"
            onClick={handleManualSearch}
            className="search-button"
            icon={<SearchOutlined />}
          >
            Tìm kiếm
          </Button>
        </div>
        <Select
          value={roleFilter}
          onChange={handleRoleChange}
          options={roleOptions}
          className="role-select"
        />
      </div>

      <div className="results-info">
        <p>Tìm thấy {users.length} người dùng</p>
      </div>

      <div className="users-list">
        {users.map((user) => {
          const roleConfig = getRoleTag(user.role);
          const statusConfig = getStatusTag(user.status);

          return (
            <Card key={user.id} className="user-card">
              <div className="user-info">
                <Avatar size={60} src={user.avatar} />
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

      {/* User Detail Modal - Same as Admin */}
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
                src={userDetails.avatar}
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
              <Descriptions.Item label="Ngày sinh">
                <CalendarOutlined
                  style={{ marginRight: "8px", color: "#1890ff" }}
                />
                {userDetails.roleSpecificData?.dob
                  ? new Date(
                      userDetails.roleSpecificData.dob
                    ).toLocaleDateString("vi-VN")
                  : "Chưa cập nhật"}
              </Descriptions.Item>
              <Descriptions.Item label="Giới tính">
                {userDetails.roleSpecificData?.gender === "male"
                  ? "Nam"
                  : userDetails.roleSpecificData?.gender === "female"
                  ? "Nữ"
                  : userDetails.roleSpecificData?.gender === "other"
                  ? "Khác"
                  : "Chưa cập nhật"}
              </Descriptions.Item>
              <Descriptions.Item label="Địa chỉ" span={2}>
                {userDetails.roleSpecificData?.address ||
                  userDetails.address ||
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
                </Descriptions>
              </>
            )}

            {userDetails.role === "doctor" && userDetails.roleSpecificData && (
              <>
                <Divider />
                <Descriptions title="Thông tin bác sĩ" bordered column={2}>
                  <Descriptions.Item label="Số giấy phép hành nghề">
                    {userDetails.roleSpecificData.licenseNo || "Chưa cập nhật"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Số năm kinh nghiệm">
                    {userDetails.roleSpecificData.yearsExperience || 0} năm
                  </Descriptions.Item>
                  <Descriptions.Item label="Chuyên khoa" span={2}>
                    {userDetails.roleSpecificData.specializationIds &&
                    userDetails.roleSpecificData.specializationIds.length > 0
                      ? userDetails.roleSpecificData.specializationIds
                          .map((spec) => spec.name)
                          .join(", ")
                      : "Chưa cập nhật"}
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
            </Descriptions>
          </div>
        )}
      </Modal>

      {/* User Edit Modal - Same as Admin but exclude admin role */}
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
            rules={[{ required: true, message: "Vui lòng chọn vai trò" }]}
          >
            <Select placeholder="Chọn vai trò">
              <Select.Option value="patient">Bệnh nhân</Select.Option>
              <Select.Option value="doctor">Bác sĩ</Select.Option>
              <Select.Option value="manager">Quản lý</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Trạng thái"
            name="status"
            rules={[{ required: true, message: "Vui lòng chọn trạng thái" }]}
          >
            <Select placeholder="Chọn trạng thái">
              <Select.Option value="active">Hoạt động</Select.Option>
              <Select.Option value="inactive">Không hoạt động</Select.Option>
              <Select.Option value="blocked">Tạm khóa</Select.Option>
            </Select>
          </Form.Item>

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

          <Form.Item style={{ marginBottom: 0, marginTop: "24px" }}>
            <Space>
              <Button type="primary" htmlType="submit">
                Cập nhật thông tin
              </Button>
              <Button onClick={() => setEditModalVisible(false)}>Hủy</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Create User Modal - Exclude admin role */}
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
              // Prevent creating admin users
              if (values.role === "admin") {
                message.error("Không thể tạo tài khoản Quản trị viên");
                return;
              }
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
              <Select.Option value="manager">Quản lý</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="Trạng thái" name="status" initialValue="active">
            <Select placeholder="Chọn trạng thái">
              <Select.Option value="active">Hoạt động</Select.Option>
              <Select.Option value="inactive">Không hoạt động</Select.Option>
              <Select.Option value="blocked">Tạm khóa</Select.Option>
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

export default QuanLyNguoiDung;
