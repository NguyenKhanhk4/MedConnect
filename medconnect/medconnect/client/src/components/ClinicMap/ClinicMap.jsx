import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Button, Space, Typography } from "antd";
import { EnvironmentOutlined, ArrowRightOutlined } from "@ant-design/icons";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "./ClinicMap.css";

const { Text } = Typography;

// Fix for default marker icon
const icon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});

const ClinicMap = ({ clinic, onGetDirections }) => {
  // Early return if no clinic data
  if (!clinic) {
    return (
      <div className="clinic-map-container">
        <div className="clinic-map-placeholder">
          <EnvironmentOutlined style={{ fontSize: 48, color: "#d9d9d9" }} />
          <p>Không có thông tin phòng khám</p>
        </div>
      </div>
    );
  }

  // Get coordinates from clinic
  // Priority: geo.coordinates > latitude/longitude
  const getCoordinates = () => {
    if (clinic?.geo?.coordinates && Array.isArray(clinic.geo.coordinates) && clinic.geo.coordinates.length === 2) {
      // geo.coordinates is [lng, lat], Leaflet needs [lat, lng]
      const [lng, lat] = clinic.geo.coordinates;
      if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
        return [lat, lng];
      }
    }
    if (clinic?.latitude && clinic?.longitude) {
      const lat = parseFloat(clinic.latitude);
      const lng = parseFloat(clinic.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        return [lat, lng];
      }
    }
    return null;
  };

  const coordinates = getCoordinates();
  const hasValidCoordinates = coordinates !== null;

  const handleGetDirections = () => {
    if (onGetDirections) {
      onGetDirections(clinic);
    } else {
      // Default: open Google Maps directions
      const address = encodeURIComponent(clinic?.address || "");
      const url = `https://www.google.com/maps/dir/?api=1&destination=${address}`;
      window.open(url, "_blank");
    }
  };

  return (
    <div className="clinic-map-container">
      <div className="clinic-map-header">
        <Space>
          <EnvironmentOutlined />
          <span>Vị trí phòng khám</span>
        </Space>
        <Button
          type="primary"
          icon={<ArrowRightOutlined />}
          size="small"
          onClick={handleGetDirections}
        >
          Chỉ đường
        </Button>
      </div>
      <div className="clinic-map-wrapper">
        {hasValidCoordinates ? (
          <MapContainer
            key={`map-${coordinates[0]}-${coordinates[1]}`}
            center={coordinates}
            zoom={15}
            scrollWheelZoom={true}
            style={{ height: "100%", width: "100%", zIndex: 0 }}
            className="clinic-map"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>'
            />
            <Marker position={coordinates} icon={icon}>
              <Popup>
                <div>
                  <strong>{clinic?.name || "Phòng khám"}</strong>
                  {clinic?.address && (
                    <div style={{ marginTop: 4, fontSize: "12px" }}>
                      {clinic.address}
                    </div>
                  )}
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
          <div className="clinic-map-placeholder">
            <EnvironmentOutlined style={{ fontSize: 48, color: "#d9d9d9" }} />
            <p>Không có thông tin tọa độ phòng khám</p>
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
            {!clinic?.address && (
              <Text type="secondary" style={{ fontSize: "12px", marginTop: 8 }}>
                Vui lòng liên hệ phòng khám để biết địa chỉ
              </Text>
            )}
          </div>
        )}
      </div>
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

export default ClinicMap;

