// Import React
import React from "react";

// Import React Leaflet components (thư viện bản đồ cho React)
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";

// Import Ant Design components
import { Button, Space, Typography } from "antd";
import { EnvironmentOutlined, ArrowRightOutlined } from "@ant-design/icons";

// Import Leaflet CSS (bắt buộc để hiển thị bản đồ đúng)
import "leaflet/dist/leaflet.css";

// Import Leaflet library và các assets cho marker
import L from "leaflet";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Import CSS component
import "./ClinicMap.css";

// Destructure Typography components
const { Text } = Typography;

/**
 * Cấu hình icon cho Marker trên bản đồ
 * Fix lỗi: Leaflet không tự động load được marker icon khi dùng với webpack
 * 
 * Các thuộc tính:
 * - iconUrl: Đường dẫn icon marker bình thường
 * - iconRetinaUrl: Icon cho màn hình Retina (độ phân giải cao)
 * - shadowUrl: Hình bóng đổ của marker
 * - iconSize: Kích thước icon [width, height] pixels
 * - iconAnchor: Điểm neo [x, y] - vị trí này của icon sẽ được đặt tại tọa độ thực tế
 * - popupAnchor: Vị trí popup hiển thị so với icon [x, y]
 * - tooltipAnchor: Vị trí tooltip hiển thị so với icon [x, y]
 * - shadowSize: Kích thước bóng đổ [width, height] pixels
 */
const icon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],        // Chiều rộng 25px, chiều cao 41px
  iconAnchor: [12, 41],      // Điểm neo ở giữa đáy icon (x=12, y=41)
  popupAnchor: [1, -34],     // Popup hiển thị phía trên icon
  tooltipAnchor: [16, -28],  // Tooltip hiển thị bên phải phía trên
  shadowSize: [41, 41],      // Kích thước bóng đổ
});

/**
 * Component ClinicMap
 * Component hiển thị bản đồ vị trí cơ sở y tế sử dụng React Leaflet
 * 
 * Props:
 * @param {Object} clinic - Dữ liệu cơ sở y tế
 * @param {string} clinic.name - Tên cơ sở y tế
 * @param {string} clinic.address - Địa chỉ
 * @param {number} clinic.latitude - Vĩ độ (latitude)
 * @param {number} clinic.longitude - Kinh độ (longitude)
 * @param {Object} clinic.geo - Tọa độ dạng GeoJSON
 * @param {number[]} clinic.geo.coordinates - Tọa độ [lng, lat] (GeoJSON format)
 * @param {Function} onGetDirections - Callback khi user click "Chỉ đường"
 * 
 * Chức năng:
 * - Hiển thị bản đồ tương tác với marker tại vị trí clinic
 * - Xử lý tọa độ từ 2 format: GeoJSON (geo.coordinates) hoặc lat/lng riêng lẻ
 * - Chuyển đổi tọa độ từ GeoJSON [lng, lat] sang Leaflet [lat, lng]
 * - Hiển thị popup với thông tin clinic khi click marker
 * - Fallback: Hiển thị placeholder nếu không có tọa độ
 * - Reusable: Có thể dùng ở nhiều nơi (trang map, trang đặt lịch, etc.)
 */
const ClinicMap = ({ clinic, onGetDirections }) => {
  // === EARLY RETURN: Không có dữ liệu clinic ===
  if (!clinic) {
    return (
      <div className="clinic-map-container">
        <div className="clinic-map-placeholder">
          {/* Icon vị trí màu xám */}
          <EnvironmentOutlined style={{ fontSize: 48, color: "#d9d9d9" }} />
          
          {/* Thông báo không có thông tin */}
          <p>Không có thông tin phòng khám</p>
        </div>
      </div>
    );
  }

  /**
   * Hàm lấy tọa độ từ dữ liệu clinic
   * Xử lý 2 format tọa độ khác nhau và chuyển đổi về format Leaflet
   * 
   * Priority (thứ tự ưu tiên):
   * 1. geo.coordinates (GeoJSON format) - Ưu tiên cao nhất vì có 2dsphere index
   * 2. latitude/longitude (Legacy format) - Fallback cho dữ liệu cũ
   * 
   * Conversion (chuyển đổi):
   * - GeoJSON format: [longitude, latitude] -> Leaflet: [latitude, longitude]
   * - Phải đảo thứ tự vì 2 format khác nhau!
   * 
   * Validation (kiểm tra):
   * - Kiểm tra type: phải là number
   * - Kiểm tra NaN: không được là NaN (Not a Number)
   * - Kiểm tra array: phải có đúng 2 phần tử
   * 
   * @returns {Array|null} - [lat, lng] hoặc null nếu không có tọa độ hợp lệ
   */
  const getCoordinates = () => {
    // === PRIORITY 1: GeoJSON format (geo.coordinates) ===
    // Kiểm tra: có tồn tại? là array? có 2 phần tử?
    if (clinic?.geo?.coordinates && Array.isArray(clinic.geo.coordinates) && clinic.geo.coordinates.length === 2) {
      // Destructure GeoJSON coordinates: [lng, lat]
      const [lng, lat] = clinic.geo.coordinates;
      
      // Validate: Phải là số và không phải NaN
      if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
        // QUAN TRỌNG: Đảo thứ tự từ [lng, lat] sang [lat, lng] cho Leaflet
        return [lat, lng];
      }
    }
    
    // === PRIORITY 2: Legacy format (latitude/longitude riêng lẻ) ===
    // Kiểm tra: có tồn tại cả latitude và longitude?
    if (clinic?.latitude && clinic?.longitude) {
      // Parse về số (có thể là string từ API)
      const lat = parseFloat(clinic.latitude);
      const lng = parseFloat(clinic.longitude);
      
      // Validate: Không được là NaN
      if (!isNaN(lat) && !isNaN(lng)) {
        // Trả về format Leaflet: [lat, lng]
        return [lat, lng];
      }
    }
    
    // === FALLBACK: Không có tọa độ hợp lệ ===
    return null;
  };

  // Gọi hàm lấy tọa độ
  const coordinates = getCoordinates();
  
  // Check xem có tọa độ hợp lệ không
  const hasValidCoordinates = coordinates !== null;

  /**
   * Handler: Xử lý sự kiện khi user click nút "Chỉ đường"
   * 
   * Logic:
   * - Nếu parent component truyền callback onGetDirections -> gọi callback
   * - Nếu không -> sử dụng default behavior (mở Google Maps với địa chỉ)
   */
  const handleGetDirections = () => {
    // Case 1: Parent component đã cung cấp custom handler
    if (onGetDirections) {
      // Gọi callback và truyền dữ liệu clinic
      onGetDirections(clinic);
    } 
    // Case 2: Không có custom handler -> sử dụng default behavior
    else {
      // Encode địa chỉ để an toàn trong URL
      const address = encodeURIComponent(clinic?.address || "");
      
      // Tạo URL Google Maps với địa chỉ
      const url = `https://www.google.com/maps/dir/?api=1&destination=${address}`;
      
      // Mở Google Maps trong tab mới
      window.open(url, "_blank");
    }
  };

  // === RENDER COMPONENT ===
  return (
    <div className="clinic-map-container">
      {/* Header: Tiêu đề và nút Chỉ đường */}
      <div className="clinic-map-header">
        {/* Tiêu đề với icon vị trí */}
        <Space>
          <EnvironmentOutlined />
          <span>Vị trí phòng khám</span>
        </Space>
        
        {/* Button Chỉ đường */}
        <Button
          type="primary"
          icon={<ArrowRightOutlined />}
          size="small"
          onClick={handleGetDirections}
        >
          Chỉ đường
        </Button>
      </div>
      
      {/* Wrapper chứa bản đồ hoặc placeholder */}
      <div className="clinic-map-wrapper">
        {/* === CASE 1: Có tọa độ hợp lệ -> Render bản đồ === */}
        {hasValidCoordinates ? (
          <MapContainer
            /**
             * Key prop: Force re-render khi tọa độ thay đổi
             * Quan trọng: MapContainer không tự động update center khi props thay đổi
             * Dùng key để React tạo instance mới khi coordinates thay đổi
             */
            key={`map-${coordinates[0]}-${coordinates[1]}`}
            
            /**
             * center: Tọa độ trung tâm bản đồ [lat, lng]
             * Đây là điểm mà bản đồ sẽ focus khi load
             */
            center={coordinates}
            
            /**
             * zoom: Mức độ zoom của bản đồ (1-20)
             * 1 = Toàn thế giới, 20 = Zoom tối đa
             * 15 = Zoom vừa phải cho xem đường phố
             */
            zoom={15}
            
            /**
             * scrollWheelZoom: Cho phép zoom bằng chuột scroll
             * true = user có thể zoom bằng scroll wheel
             */
            scrollWheelZoom={true}
            
            /**
             * style: CSS inline cho map container
             * height/width 100%: Lấy full kích thước của wrapper
             * zIndex 0: Đảm bảo không che các element khác
             */
            style={{ height: "100%", width: "100%", zIndex: 0 }}
            
            className="clinic-map"
          >
            {/**
             * TileLayer: Layer hiển thị tiles bản đồ từ OpenStreetMap
             * 
             * URL template format:
             * - {s}: Subdomain (a, b, c) - để load balance requests
             * - {z}: Zoom level (1-20)
             * - {x}: Tile coordinate X
             * - {y}: Tile coordinate Y
             * 
             * OpenStreetMap tự động cung cấp tiles dựa trên template này
             */}
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              
              /**
               * attribution: Credit cho OpenStreetMap (bắt buộc theo license)
               * Hiển thị ở góc dưới bên phải bản đồ
               */
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>'
            />
            
            {/**
             * Marker: Đánh dấu vị trí clinic trên bản đồ
             * 
             * position: Tọa độ [lat, lng] của marker
             * icon: Custom icon đã config ở trên
             */}
            <Marker position={coordinates} icon={icon}>
              {/**
               * Popup: Hiển thị khi user click vào marker
               * Leaflet tự động handle việc show/hide popup
               */}
              <Popup>
                <div>
                  {/* Tên cơ sở y tế */}
                  <strong>{clinic?.name || "Phòng khám"}</strong>
                  
                  {/* Địa chỉ (nếu có) */}
                  {clinic?.address && (
                    <div style={{ marginTop: 4, fontSize: "12px" }}>
                      {clinic.address}
                    </div>
                  )}
                  
                  {/* Button Chỉ đường trong popup */}
                  <Button
                    type="link"
                    size="small"
                    icon={<ArrowRightOutlined />}
                    onClick={handleGetDirections}
                    style={{ padding: 0, marginTop: 8 }}
                  >
                    Chỉ đường
                  </Button>
                </div>
              </Popup>
            </Marker>
          </MapContainer>
        ) : (
          // === CASE 2: Không có tọa độ -> Render placeholder ===
          <div className="clinic-map-placeholder">
            {/* Icon vị trí màu xám */}
            <EnvironmentOutlined style={{ fontSize: 48, color: "#d9d9d9" }} />
            
            {/* Thông báo không có tọa độ */}
            <p>Không có thông tin tọa độ phòng khám</p>
            
            {/* Case 2.1: Có địa chỉ -> Hiển thị button chỉ đường với địa chỉ */}
            {clinic?.address && (
              <Button
                type="primary"
                icon={<ArrowRightOutlined />}
                onClick={handleGetDirections}
                style={{ marginTop: 16 }}
              >
                Mở chỉ đường với địa chỉ: {clinic.address}
              </Button>
            )}
            
            {/* Case 2.2: Không có địa chỉ -> Hiển thị thông báo liên hệ */}
            {!clinic?.address && (
              <Text type="secondary" style={{ fontSize: "12px", marginTop: 8 }}>
                Vui lòng liên hệ phòng khám để biết địa chỉ
              </Text>
            )}
          </div>
        )}
      </div>
      
      {/* Footer: Hiển thị địa chỉ ở dưới bản đồ (nếu có) */}
      {clinic?.address && (
        <div className="clinic-map-footer">
          <Text type="secondary" style={{ fontSize: "12px" }}>
            {clinic.address}
          </Text>
        </div>
      )}
    </div>
  );
};

// Export component để sử dụng ở nơi khác
export default ClinicMap;

