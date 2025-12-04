import React, { useState, useEffect } from "react";
import {
  Card,
  Button,
  Modal,
  Form,
  Input,
  message,
  Row,
  Col,
  Spin,
  Alert,
  Upload,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  HeartOutlined,
  BankOutlined,
  SkinOutlined,
  CrownOutlined,
  SoundOutlined,
  EyeOutlined,
  UserOutlined,
  TeamOutlined,
  UploadOutlined,
  PictureOutlined,
} from "@ant-design/icons";
import {
  getAdminSpecializations,
  addSpecialization,
  updateSpecialization,
  deleteSpecialization,
  getDoctorsBySpecialization,
} from "../../../lib/api";
import { CustomAlert } from "../../../components/ui/CustomAlert";
import "./ChuyenKhoa.scss";

const ChuyenKhoa = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDoctorsModalVisible, setIsDoctorsModalVisible] = useState(false);
  const [editingSpecialization, setEditingSpecialization] = useState(null);
  const [selectedSpecialization, setSelectedSpecialization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [specializations, setSpecializations] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const [confirmConfig, setConfirmConfig] = useState(null);

  // Helper function to show custom confirm
  const showConfirm = (message, onConfirm) => {
    setConfirmConfig({
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmConfig(null);
      },
      onCancel: () => setConfirmConfig(null),
    });
  };
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchSpecializations();
  }, []);

  const fetchSpecializations = async () => {
    try {
      setLoading(true);
      const data = await getAdminSpecializations();
      setSpecializations(data.data || data);
    } catch (err) {
      console.error("Error fetching specializations:", err);
      setError("Không thể tải danh sách chuyên khoa");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSpecialization = () => {
    console.log("Opening add specialization modal");
    setEditingSpecialization(null);
    form.resetFields();
    setFileList([]);
    setIsModalVisible(true);
  };

  const handleEditSpecialization = (specialization) => {
    console.log("Opening edit specialization modal for:", specialization.name);
    setEditingSpecialization(specialization);
    form.setFieldsValue({
      name: specialization.name,
      description: specialization.description || "",
    });

    // Always start with empty file list for new upload
    setFileList([]);
    setIsModalVisible(true);
  };

  const handleDeleteSpecialization = async (id) => {
    // Find specialization to get name for confirmation dialog
    const specialization = specializations.find((s) => s.id === id);
    const specializationName = specialization?.name || "chuyên khoa này";

    // Show confirmation dialog
    showConfirm(
      `Bạn có chắc chắn muốn xóa chuyên khoa "${specializationName}"? Hành động này không thể hoàn tác.`,
      async () => {
        try {
          const result = await deleteSpecialization(id);

          // Show success message with info about doctors affected if any
          const doctorsAffected =
            result.doctorsAffected || result.data?.doctorsAffected || 0;
          const successMessage =
            result.message ||
            result.data?.message ||
            "Đã xóa chuyên khoa thành công";

          if (doctorsAffected > 0) {
            message.success(successMessage, 5); // Show for 5 seconds
          } else {
            message.success(successMessage);
          }

          fetchSpecializations(); // Refresh data
        } catch (err) {
          console.error("Error deleting specialization:", err);

          // Try to parse error message from server
          let errorMessage = "Có lỗi xảy ra khi xóa chuyên khoa";
          try {
            const errorText = err.message || err.response?.data?.message;
            // Try to parse as JSON if it's a JSON string
            if (errorText) {
              const errorJson = JSON.parse(errorText);
              if (errorJson.message) {
                errorMessage = errorJson.message;
              }
            }
          } catch (parseError) {
            // If parsing fails, use the original error message or default
            if (err.message && typeof err.message === "string") {
              errorMessage = err.message;
            }
          }

          message.error(errorMessage);
        }
      }
    );
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();

      // Handle avatar upload
      let avatarUrl = null;
      if (fileList.length > 0 && fileList[0].originFileObj) {
        console.log("Converting file to base64...");
        setUploading(true);
        try {
          // Convert file to base64 with compression
          avatarUrl = await convertFileToBase64(fileList[0].originFileObj);
          console.log(
            "Avatar converted to base64:",
            avatarUrl ? "Success" : "Failed"
          );
          console.log(
            "Compressed image size:",
            avatarUrl ? Math.round(avatarUrl.length / 1024) + "KB" : "N/A"
          );
        } catch (error) {
          console.error("Error converting image:", error);
          message.error("Lỗi khi xử lý ảnh");
          setUploading(false);
          return;
        }
      } else if (fileList.length > 0 && fileList[0].url) {
        // Use existing URL if editing
        avatarUrl = fileList[0].url;
        console.log("Using existing avatar URL:", avatarUrl);
      }

      const formData = {
        ...values,
        avatar: avatarUrl,
      };

      console.log("Submitting form data:", {
        ...formData,
        avatar: avatarUrl ? "Base64 data present" : "No avatar",
      });

      if (editingSpecialization) {
        // Edit existing specialization
        await updateSpecialization(editingSpecialization.id, formData);
        message.success("Đã cập nhật chuyên khoa thành công");
      } else {
        // Add new specialization
        await addSpecialization(formData);
        message.success("Đã thêm chuyên khoa thành công");
      }

      setIsModalVisible(false);
      form.resetFields();
      setFileList([]);
      fetchSpecializations(); // Refresh data
    } catch (err) {
      console.error("Error saving specialization:", err);
      if (err.message && err.message.includes("request entity too large")) {
        message.error("Ảnh quá lớn, vui lòng chọn ảnh nhỏ hơn");
      } else {
        message.error("Có lỗi xảy ra");
      }
    } finally {
      setUploading(false);
    }

  };

  // Convert file to base64 with compression
  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      // Create a canvas to compress the image
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        // Set maximum dimensions
        const maxWidth = 200;
        const maxHeight = 200;

        // Calculate new dimensions maintaining aspect ratio
        let { width, height } = img;
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw and compress image
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to base64 with compression (0.8 quality)
        const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.8);
        resolve(compressedDataUrl);
      };

      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleSpecializationClick = async (specialization) => {
    try {
      setDoctorsLoading(true);
      setSelectedSpecialization(specialization);
      const data = await getDoctorsBySpecialization(specialization.id);
      setDoctors(data.data || data);
      setIsDoctorsModalVisible(true);
    } catch (err) {
      console.error("Error fetching doctors:", err);
      message.error("Không thể tải danh sách bác sĩ");
    } finally {
      setDoctorsLoading(false);
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
    setFileList([]);
  };

  // Upload configuration
  const uploadProps = {
    name: "file",
    listType: "picture-card",
    fileList: fileList,
    accept: "image/*",
    beforeUpload: (file) => {
      console.log("File selected:", file.name, file.size);
      const isImage = file.type.startsWith("image/");
      if (!isImage) {
        message.error("Chỉ được upload file ảnh!");
        return false;
      }
      const isLt5M = file.size / 1024 / 1024 < 5; // Increased to 5MB since we compress
      if (!isLt5M) {
        message.error("Kích thước ảnh phải nhỏ hơn 5MB!");
        return false;
      }
      return true;
    },
    onChange: ({ fileList: newFileList }) => {
      console.log("File list changed:", newFileList);
      setFileList(newFileList);
    },
    onRemove: () => {
      console.log("File removed");
      setFileList([]);
    },
    maxCount: 1,
    showUploadList: {
      showPreviewIcon: true,
      showRemoveIcon: true,
      showDownloadIcon: false,
    },
    customRequest: ({ file, onSuccess }) => {
      console.log("Custom request triggered for:", file.name);
      // Handle the file immediately without actual upload
      setTimeout(() => {
        onSuccess("ok");
      }, 0);
    },
    disabled: uploading,
  };

  const getIconForSpecialization = (name, color) => {
    const iconMap = {
      "Tim mạch": <HeartOutlined style={{ color }} />,
      "Nội khoa": <BankOutlined style={{ color }} />,
      "Da liễu": <SkinOutlined style={{ color }} />,
      "Nha khoa": <CrownOutlined style={{ color }} />,
      "Tai mũi họng": <SoundOutlined style={{ color }} />,
      Mắt: <EyeOutlined style={{ color }} />,
      "Thần kinh": <UserOutlined style={{ color }} />,
      "Nhi khoa": <TeamOutlined style={{ color }} />,
    };
    return iconMap[name] || <UserOutlined style={{ color }} />;
  };

  if (loading) {
    return (
      <div className="specializations">
        <div className="page-header">
          <div className="header-content">
            <div>
              <h1>Quản lý chuyên khoa</h1>
              <p>Thêm và quản lý các chuyên khoa y tế</p>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddSpecialization}
              className="add-button"
            >
              Thêm chuyên khoa
            </Button>
          </div>
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
      <div className="specializations">
        <div className="page-header">
          <div className="header-content">
            <div>
              <h1>Quản lý chuyên khoa</h1>
              <p>Thêm và quản lý các chuyên khoa y tế</p>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddSpecialization}
              className="add-button"
            >
              Thêm chuyên khoa
            </Button>
          </div>
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
    <div className="specializations">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h1>Quản lý chuyên khoa</h1>
            <p>Thêm và quản lý các chuyên khoa y tế</p>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddSpecialization}
            className="add-button"
          >
            Thêm chuyên khoa
          </Button>
        </div>
      </div>

      <Row gutter={[24, 24]} className="specializations-grid">
        {specializations.map((specialization) => (
          <Col xs={24} sm={12} md={8} lg={6} key={specialization.id}>
            <Card
              className="specialization-card"
              hoverable
              onClick={() => handleSpecializationClick(specialization)}
            >
              <div className="card-content">
                <div className="specialization-icon">
                  {specialization.avatar ? (
                    <img
                      src={specialization.avatar}
                      alt={specialization.name}
                      className="specialization-avatar"
                    />
                  ) : (
                    getIconForSpecialization(
                      specialization.name,
                      specialization.color
                    )
                  )}
                </div>
                <div className="specialization-info">
                  <h3>{specialization.name}</h3>
                  {specialization.description && (
                    <p className="specialization-description">
                      {specialization.description}
                    </p>
                  )}
                  <div className="doctor-count">
                    <UserOutlined />
                    <span>{specialization.doctorCount || 0} bác sĩ</span>
                  </div>
                </div>
                <div className="card-actions">
                  <Button
                    type="text"
                    icon={<EditOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditSpecialization(specialization);
                    }}
                    className="action-btn edit-btn"
                  >
                    Sửa
                  </Button>
                  <Button
                    type="text"
                    icon={<DeleteOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSpecialization(specialization.id);
                    }}
                    className="action-btn delete-btn"
                  >
                    Xóa
                  </Button>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Modal
        title={
          editingSpecialization
            ? "Chỉnh sửa chuyên khoa"
            : "Thêm chuyên khoa mới"
        }
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        okText="Lưu"
        cancelText="Hủy"
        className="specialization-modal"
        width={600}
        confirmLoading={uploading}
      >
        <Form form={form} layout="vertical" requiredMark={false}>
          <Form.Item
            name="name"
            label="Tên chuyên khoa"
            rules={[
              { required: true, message: "Vui lòng nhập tên chuyên khoa" },
              { min: 2, message: "Tên chuyên khoa phải có ít nhất 2 ký tự" },
            ]}
          >
            <Input placeholder="Nhập tên chuyên khoa" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Mô tả"
            rules={[
              { required: true, message: "Vui lòng nhập mô tả chuyên khoa" },
              { min: 10, message: "Mô tả phải có ít nhất 10 ký tự" },
            ]}
          >
            <Input.TextArea
              placeholder="Nhập mô tả chi tiết về chuyên khoa"
              rows={4}
              showCount
              maxLength={500}
            />
          </Form.Item>

          <Form.Item
            name="avatar"
            label="Ảnh đại diện"
            valuePropName="fileList"
            getValueFromEvent={(e) => {
              if (Array.isArray(e)) {
                return e;
              }
              return e && e.fileList;
            }}
          >
            <Upload
              {...uploadProps}
              key={`upload-${editingSpecialization?.id || "new"}`}
            >
              <div>
                <PictureOutlined />
                <div style={{ marginTop: 8 }}>Upload ảnh</div>
              </div>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      {/* Doctors Modal */}
      <Modal
        title={`Danh sách bác sĩ - ${selectedSpecialization?.name}`}
        open={isDoctorsModalVisible}
        onCancel={() => setIsDoctorsModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsDoctorsModalVisible(false)}>
            Đóng
          </Button>,
        ]}
        width={800}
        className="doctors-modal"
      >
        {doctorsLoading ? (
          <div style={{ textAlign: "center", padding: "50px" }}>
            <Spin size="large" />
            <p style={{ marginTop: "16px" }}>Đang tải danh sách bác sĩ...</p>
          </div>
        ) : (
          <div className="doctors-list">
            {doctors.length === 0 ? (
              <div style={{ textAlign: "center", padding: "50px" }}>
                <UserOutlined style={{ fontSize: "48px", color: "#ccc" }} />
                <p style={{ marginTop: "16px", color: "#666" }}>
                  Chưa có bác sĩ nào trong chuyên khoa này
                </p>
              </div>
            ) : (
              <Row gutter={[16, 16]}>
                {doctors.map((doctor) => (
                  <Col xs={24} sm={12} md={8} key={doctor.id}>
                    <Card className="doctor-card" size="small">
                      <div className="doctor-info">
                        <div className="doctor-avatar">
                          {doctor.avatarUrl ? (
                            <img src={doctor.avatarUrl} alt={doctor.fullName} />
                          ) : (
                            <UserOutlined />
                          )}
                        </div>
                        <div className="doctor-details">
                          <h4>{doctor.fullName}</h4>
                          <p className="doctor-email">{doctor.email}</p>
                          {doctor.licenseNo && (
                            <p className="doctor-license">
                              📋 {doctor.licenseNo}
                            </p>
                          )}
                          {doctor.bio && (
                            <p className="doctor-bio">{doctor.bio}</p>
                          )}
                        </div>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </div>
        )}
      </Modal>

      {/* Custom Confirm */}
      {confirmConfig && (
        <CustomAlert
          message={confirmConfig.message}
          onConfirm={confirmConfig.onConfirm}
          onClose={confirmConfig.onCancel}
          title="Hệ thống MedConnect"
          type="confirm"
        />
      )}
    </div>
  );
};

export default ChuyenKhoa;
