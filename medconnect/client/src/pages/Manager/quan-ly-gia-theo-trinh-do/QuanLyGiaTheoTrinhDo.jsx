import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Input,
  Modal,
  Form,
  Select,
  message,
  Space,
  Card,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import {
  getEducationLevelPrices,
  setEducationLevelPrice,
  deleteEducationLevelPrice,
} from "../../../lib/api";
import "./QuanLyGiaTheoTrinhDo.scss";

const { Option } = Select;

const educationLevels = [
  "Bác sĩ",
  "Thạc sĩ",
  "Tiến sĩ",
  "Phó Giáo Sư",
  "Giáo Sư",
];
const modes = [
  { value: "online", label: "Online" },
  { value: "offline", label: "Offline" },
];

export default function QuanLyGiaTheoTrinhDo() {
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPrice, setEditingPrice] = useState(null);
  const [form] = Form.useForm();

  // Fetch prices
  const fetchPrices = async () => {
    try {
      setLoading(true);
      const response = await getEducationLevelPrices();
      if (response.success) {
        // Response format: { success: true, data: { prices: {...}, allPrices: [...] } }
        const pricesData = response.data?.prices || response.prices || {};
        setPrices(pricesData);
      } else {
        message.error(response.message || "Không thể tải danh sách giá");
      }
    } catch (error) {
      console.error("Error fetching prices:", error);
      const errorMessage = error.message || "Không thể tải danh sách giá";
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
  }, []);

  // Handle edit price
  const handleEdit = (educationLevel, mode) => {
    const priceData = prices[educationLevel]?.[mode];
    if (priceData) {
      setEditingPrice({ educationLevel, mode, ...priceData });
      form.setFieldsValue({
        educationLevel,
        mode,
        weekdayPrice: priceData.weekdayPrice,
        weekendPrice: priceData.weekendPrice,
        currency: priceData.currency || "VND",
      });
      setModalVisible(true);
    }
  };

  // Handle add new price
  const handleAdd = () => {
    setEditingPrice(null);
    form.resetFields();
    form.setFieldsValue({
      currency: "VND",
    });
    setModalVisible(true);
  };

  // Handle save price
  const handleSave = async (values) => {
    try {
      // Convert string numbers to actual numbers
      const priceData = {
        ...values,
        weekdayPrice: Number(values.weekdayPrice),
        weekendPrice: Number(values.weekendPrice),
      };
      const response = await setEducationLevelPrice(priceData);

      // Check if response has success property (wrapped in data)
      const success = response.success || response.data?.success;
      if (success) {
        message.success(
          editingPrice ? "Cập nhật giá thành công" : "Thêm giá thành công"
        );
        setModalVisible(false);
        form.resetFields();
        setEditingPrice(null);
        // Refresh prices after successful save - wait a bit to ensure DB is updated
        setTimeout(() => {
          fetchPrices();
        }, 500);
      } else {
        const errorMsg =
          response.message || response.data?.message || "Không thể lưu giá";
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error("Error saving price:", error);
      let errorMessage = "Không thể cập nhật giá";
      try {
        // Try to parse error message from response
        const errorText = error.message || "";
        if (errorText) {
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.message || errorData.error || errorMessage;
          } catch {
            errorMessage = errorText;
          }
        }
      } catch (parseError) {
        errorMessage = error.message || errorMessage;
      }
      message.error(errorMessage);
    }
  };

  // Handle delete price
  const handleDelete = async (priceId) => {
    Modal.confirm({
      title: "Xác nhận xóa",
      content: "Bạn có chắc chắn muốn xóa giá này không?",
      okText: "Xóa",
      okType: "danger",
      cancelText: "Hủy",
      onOk: async () => {
        try {
          await deleteEducationLevelPrice(priceId);
          message.success("Xóa giá thành công");
          fetchPrices();
        } catch (error) {
          console.error("Error deleting price:", error);
          message.error("Không thể xóa giá");
        }
      },
    });
  };

  // Prepare table data
  const tableData = educationLevels.map((level) => {
    const onlinePrice = prices[level]?.online;
    const offlinePrice = prices[level]?.offline;

    return {
      key: level,
      educationLevel: level,
      onlineWeekday:
        onlinePrice && onlinePrice !== null ? onlinePrice.weekdayPrice : "-",
      onlineWeekend:
        onlinePrice && onlinePrice !== null ? onlinePrice.weekendPrice : "-",
      onlineId: onlinePrice && onlinePrice !== null ? onlinePrice.id : null,
      offlineWeekday:
        offlinePrice && offlinePrice !== null ? offlinePrice.weekdayPrice : "-",
      offlineWeekend:
        offlinePrice && offlinePrice !== null ? offlinePrice.weekendPrice : "-",
      offlineId: offlinePrice && offlinePrice !== null ? offlinePrice.id : null,
    };
  });

  const columns = [
    {
      title: "Trình độ học vấn",
      dataIndex: "educationLevel",
      key: "educationLevel",
      width: 150,
      fixed: "left",
    },
    {
      title: "Online - Ngày thường",
      dataIndex: "onlineWeekday",
      key: "onlineWeekday",
      width: 150,
      align: "right",
      render: (value, record) => (
        <Space>
          <span>{value !== "-" ? `${value.toLocaleString()} VND` : "-"}</span>
          {record.onlineId && (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record.educationLevel, "online")}
            />
          )}
        </Space>
      ),
    },
    {
      title: "Online - Cuối tuần",
      dataIndex: "onlineWeekend",
      key: "onlineWeekend",
      width: 150,
      align: "right",
      render: (value) =>
        value !== "-" ? `${value.toLocaleString()} VND` : "-",
    },
    {
      title: "Offline - Ngày thường",
      dataIndex: "offlineWeekday",
      key: "offlineWeekday",
      width: 150,
      align: "right",
      render: (value, record) => (
        <Space>
          <span>{value !== "-" ? `${value.toLocaleString()} VND` : "-"}</span>
          {record.offlineId && (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record.educationLevel, "offline")}
            />
          )}
        </Space>
      ),
    },
    {
      title: "Offline - Cuối tuần",
      dataIndex: "offlineWeekend",
      key: "offlineWeekend",
      width: 150,
      align: "right",
      render: (value) =>
        value !== "-" ? `${value.toLocaleString()} VND` : "-",
    },
    {
      title: "Thao tác",
      key: "action",
      width: 150,
      fixed: "right",
      render: (_, record) => (
        <Space>
          {!record.onlineId && (
            <Button
              type="primary"
              size="small"
              onClick={() => {
                form.setFieldsValue({
                  educationLevel: record.educationLevel,
                  mode: "online",
                  currency: "VND",
                });
                setEditingPrice(null);
                setModalVisible(true);
              }}
            >
              Thêm Online
            </Button>
          )}
          {!record.offlineId && (
            <Button
              type="primary"
              size="small"
              onClick={() => {
                form.setFieldsValue({
                  educationLevel: record.educationLevel,
                  mode: "offline",
                  currency: "VND",
                });
                setEditingPrice(null);
                setModalVisible(true);
              }}
            >
              Thêm Offline
            </Button>
          )}
          {record.onlineId && (
            <Button
              type="link"
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record.onlineId)}
            />
          )}
          {record.offlineId && (
            <Button
              type="link"
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record.offlineId)}
            />
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="education-level-price-management">
      <Card>
        <div className="page-header">
          <div>
            <h1>
              <DollarOutlined /> Quản lý giá khám
            </h1>
            <p>Quản lý giá khám theo trình độ học vấn của bác sĩ</p>
          </div>
          <Button type="primary" onClick={handleAdd}>
            Thêm giá mới
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={tableData}
          loading={loading}
          scroll={{ x: 1000 }}
          pagination={false}
        />
      </Card>

      <Modal
        title={editingPrice ? "Chỉnh sửa giá" : "Thêm giá mới"}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        okText="Lưu"
        cancelText="Hủy"
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item
            name="educationLevel"
            label="Trình độ học vấn"
            rules={[
              { required: true, message: "Vui lòng chọn trình độ học vấn" },
            ]}
          >
            <Select
              disabled={!!editingPrice}
              placeholder="Chọn trình độ học vấn"
            >
              {educationLevels.map((level) => (
                <Option key={level} value={level}>
                  {level}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="mode"
            label="Hình thức khám"
            rules={[
              { required: true, message: "Vui lòng chọn hình thức khám" },
            ]}
          >
            <Select disabled={!!editingPrice} placeholder="Chọn hình thức khám">
              {modes.map((mode) => (
                <Option key={mode.value} value={mode.value}>
                  {mode.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="weekdayPrice"
            label="Giá ngày thường (Thứ 2-6)"
            rules={[
              { required: true, message: "Vui lòng nhập giá ngày thường" },
              {
                validator: (_, value) => {
                  if (!value) {
                    return Promise.reject(
                      new Error("Vui lòng nhập giá ngày thường")
                    );
                  }
                  if (isNaN(value) || value < 0) {
                    return Promise.reject(
                      new Error("Giá phải là số và lớn hơn hoặc bằng 0")
                    );
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input
              type="number"
              min={0}
              placeholder="Nhập giá ngày thường"
              addonAfter="VND"
            />
          </Form.Item>

          <Form.Item
            name="weekendPrice"
            label="Giá cuối tuần (Thứ 7-CN)"
            rules={[
              { required: true, message: "Vui lòng nhập giá cuối tuần" },
              {
                validator: (_, value) => {
                  if (!value) {
                    return Promise.reject(
                      new Error("Vui lòng nhập giá cuối tuần")
                    );
                  }
                  if (isNaN(value) || value < 0) {
                    return Promise.reject(
                      new Error("Giá phải là số và lớn hơn hoặc bằng 0")
                    );
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input
              type="number"
              min={0}
              placeholder="Nhập giá cuối tuần"
              addonAfter="VND"
            />
          </Form.Item>

          <Form.Item name="currency" label="Đơn vị tiền tệ" initialValue="VND">
            <Select disabled>
              <Option value="VND">VND</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
