// Import các thư viện React cần thiết
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Card, Typography, Space, Spin } from "antd";
import { ArrowLeftOutlined, EnvironmentOutlined, ArrowRightOutlined } from "@ant-design/icons";

// Import components
import ClinicMap from "../../components/ClinicMap/ClinicMap";
import { api } from "../../lib/api";
import NavigationBreadcrumb from "../../components/Breadcrumb/NavigationBreadcrumb";
import { HomeOutlined } from "@ant-design/icons";
import "./ClinicMapPage.css";

// Destructure Typography components
const { Title, Text, Paragraph } = Typography;

/**
 * Component ClinicMapPage
 * Trang hiển thị bản đồ vị trí của cơ sở y tế
 * 
 * Chức năng:
 * - Lấy ID cơ sở y tế từ URL params (query parameter ?id=xxx)
 * - Fetch thông tin chi tiết cơ sở y tế từ API
 * - Hiển thị thông tin cơ sở y tế (tên, địa chỉ, số điện thoại, mô tả)
 * - Render component bản đồ để hiển thị vị trí
 * - Xử lý các trạng thái: loading, error, success
 * - Cung cấp chức năng "Chỉ đường" qua Google Maps
 */
const ClinicMapPage = () => {
  // Hook điều hướng
  const navigate = useNavigate();
  
  // Hook lấy query parameters từ URL
  const [searchParams] = useSearchParams();
  
  // Lấy clinicId từ query parameter (vd: /ban-do-co-so-y-te?id=123)
  const clinicId = searchParams.get("id");
  
  // === STATE MANAGEMENT ===
  // State lưu trữ thông tin cơ sở y tế
  const [clinic, setClinic] = useState(null);
  
  // State quản lý trạng thái loading khi fetch dữ liệu
  const [loading, setLoading] = useState(true);
  
  // State lưu trữ thông báo lỗi (nếu có)
  const [error, setError] = useState(null);

  /**
   * useEffect: Fetch dữ liệu cơ sở y tế khi component mount hoặc clinicId thay đổi
   * Dependencies: [clinicId]
   */
  useEffect(() => {
    /**
     * Hàm async để fetch thông tin clinic từ API
     */
    const fetchClinic = async () => {
      // Kiểm tra xem có clinicId trong URL không
      if (!clinicId) {
        setError("Không tìm thấy ID cơ sở y tế");
        setLoading(false);
        return;
      }

      try {
        // Bật trạng thái loading
        setLoading(true);
        
        // Gọi API để lấy thông tin clinic theo ID
        // Endpoint: GET /api/clinics/:id
        const response = await api.get(`/api/clinics/${clinicId}`);
        
        // Kiểm tra response có thành công và có dữ liệu clinic không
        if (response?.success && response?.data?.clinic) {
          // Lưu dữ liệu clinic vào state
          setClinic(response.data.clinic);
        } else {
          // Nếu không có dữ liệu, set error
          setError("Không tìm thấy thông tin cơ sở y tế");
        }
      } catch (err) {
        // Xử lý lỗi khi gọi API (network error, server error, etc.)
        console.error("Error fetching clinic:", err);
        setError("Có lỗi khi tải thông tin cơ sở y tế");
      } finally {
        // Tắt trạng thái loading (chạy dù success hay error)
        setLoading(false);
      }
    };

    // Gọi hàm fetch
    fetchClinic();
  }, [clinicId]); // Re-run khi clinicId thay đổi

  /**
   * Handler: Xử lý sự kiện khi user click nút "Chỉ đường"
   * Mở Google Maps trong tab mới với đích đến là cơ sở y tế
   * 
   * @param {Object} clinicData - Dữ liệu cơ sở y tế
   * 
   * Logic:
   * - Ưu tiên 1: Sử dụng tọa độ (latitude, longitude) nếu có
   * - Ưu tiên 2: Sử dụng địa chỉ (address) nếu không có tọa độ
   * - Mở Google Maps trong tab mới (_blank)
   */
  const handleGetDirections = (clinicData) => {
    // Case 1: Có tọa độ latitude và longitude
    if (clinicData?.latitude && clinicData?.longitude) {
      // Tạo URL Google Maps với tọa độ
      // api=1: Sử dụng Google Maps URLs API
      // destination: Tọa độ đích đến (lat,lng)
      const url = `https://www.google.com/maps/dir/?api=1&destination=${clinicData.latitude},${clinicData.longitude}`;
      
      // Mở Google Maps trong tab mới
      window.open(url, "_blank");
    } 
    // Case 2: Không có tọa độ nhưng có địa chỉ
    else if (clinicData?.address) {
      // Encode địa chỉ để an toàn trong URL (xử lý ký tự đặc biệt, khoảng trắng)
      const address = encodeURIComponent(clinicData.address);
      
      // Tạo URL Google Maps với địa chỉ
      const url = `https://www.google.com/maps/dir/?api=1&destination=${address}`;
      
      // Mở Google Maps trong tab mới
      window.open(url, "_blank");
    }
    // Case 3: Không có tọa độ và không có địa chỉ -> Không làm gì
  };

  // === RENDER LOADING STATE ===
  // Hiển thị khi đang fetch dữ liệu từ API
  if (loading) {
    return (
      <div className="clinic-map-page">
        <div className="container" style={{ padding: "60px 0", textAlign: "center" }}>
          {/* Spinner loading của Ant Design */}
          <Spin size="large" />
          
          {/* Thông báo loading */}
          <div style={{ marginTop: "16px", color: "#666" }}>
            Đang tải thông tin cơ sở y tế...
          </div>
        </div>
      </div>
    );
  }

  // === RENDER ERROR STATE ===
  // Hiển thị khi có lỗi hoặc không tìm thấy clinic
  if (error || !clinic) {
    return (
      <div className="clinic-map-page">
        <div className="container" style={{ padding: "60px 0" }}>
          {/* Breadcrumb navigation */}
          <NavigationBreadcrumb
            items={[
              {
                label: "Trang chủ",
                path: "/",
                icon: <HomeOutlined />,
              },
              {
                label: "Cơ sở y tế",
                path: "/co-so-y-te",
              },
              {
                label: "Bản đồ",
              },
            ]}
          />
          
          {/* Card hiển thị thông báo lỗi */}
          <Card style={{ textAlign: "center", marginTop: "40px" }}>
            {/* Text lỗi màu đỏ */}
            <Text type="danger" style={{ fontSize: "16px" }}>
              {error || "Không tìm thấy thông tin cơ sở y tế"}
            </Text>
            
            {/* Button quay lại danh sách cơ sở y tế */}
            <div style={{ marginTop: "24px" }}>
              <Button type="primary" onClick={() => navigate("/co-so-y-te")}>
                Quay lại danh sách
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // === RENDER SUCCESS STATE ===
  // Hiển thị khi đã load thành công thông tin clinic
  return (
    <div className="clinic-map-page">
      <div className="container">
        {/* Breadcrumb navigation - đường dẫn điều hướng */}
        <NavigationBreadcrumb
          items={[
            {
              label: "Trang chủ",
              path: "/",
              icon: <HomeOutlined />,
            },
            {
              label: "Cơ sở y tế",
              path: "/co-so-y-te",
            },
            {
              label: clinic.name, // Tên clinic hiện tại
            },
          ]}
        />

        <div style={{ marginTop: "24px", marginBottom: "24px" }}>
          {/* Button quay lại danh sách cơ sở y tế */}
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/co-so-y-te")}
            style={{ marginBottom: "16px" }}
          >
            Quay lại danh sách
          </Button>

          {/* Card chứa thông tin clinic và bản đồ */}
          <Card>
            {/* Section 1: Thông tin chi tiết cơ sở y tế */}
            <div style={{ marginBottom: "24px" }}>
              {/* Tiêu đề - Tên cơ sở y tế */}
              <Title level={2} style={{ marginBottom: "8px" }}>
                {clinic.name}
              </Title>
              
              {/* Địa chỉ (nếu có) */}
              {clinic.address && (
                <Space style={{ marginBottom: "8px" }}>
                  <EnvironmentOutlined style={{ color: "#45c3d2" }} />
                  <Text>{clinic.address}</Text>
                </Space>
              )}
              
              {/* Số điện thoại (nếu có) */}
              {clinic.phone && (
                <div style={{ marginBottom: "8px" }}>
                  <Text strong>Điện thoại: </Text>
                  <Text>{clinic.phone}</Text>
                </div>
              )}
              
              {/* Mô tả (nếu có) */}
              {clinic.description && (
                <Paragraph style={{ marginTop: "16px", color: "#666" }}>
                  {clinic.description}
                </Paragraph>
              )}
            </div>

            {/* Section 2: Component bản đồ */}
            <div style={{ marginTop: "24px" }}>
              {/* 
                Component ClinicMap: Hiển thị bản đồ với vị trí clinic
                Props:
                - clinic: Dữ liệu cơ sở y tế (bao gồm tọa độ, địa chỉ, tên)
                - onGetDirections: Callback function khi user click "Chỉ đường"
              */}
              <ClinicMap clinic={clinic} onGetDirections={handleGetDirections} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Export component để sử dụng ở nơi khác
export default ClinicMapPage;

