import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Card, Typography, Space, Spin } from "antd";
import { ArrowLeftOutlined, EnvironmentOutlined, ArrowRightOutlined } from "@ant-design/icons";
import ClinicMap from "../../components/ClinicMap/ClinicMap";
import { api } from "../../lib/api";
import NavigationBreadcrumb from "../../components/Breadcrumb/NavigationBreadcrumb";
import { HomeOutlined } from "@ant-design/icons";
import "./ClinicMapPage.css";

const { Title, Text, Paragraph } = Typography;

const ClinicMapPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clinicId = searchParams.get("id");
  const [clinic, setClinic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchClinic = async () => {
      if (!clinicId) {
        setError("Không tìm thấy ID cơ sở y tế");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await api.get(`/api/clinics/${clinicId}`);
        
        if (response?.success && response?.data?.clinic) {
          setClinic(response.data.clinic);
        } else {
          setError("Không tìm thấy thông tin cơ sở y tế");
        }
      } catch (err) {
        console.error("Error fetching clinic:", err);
        setError("Có lỗi khi tải thông tin cơ sở y tế");
      } finally {
        setLoading(false);
      }
    };

    fetchClinic();
  }, [clinicId]);

  const handleGetDirections = (clinicData) => {
    if (clinicData?.latitude && clinicData?.longitude) {
      // Open Google Maps with coordinates
      const url = `https://www.google.com/maps/dir/?api=1&destination=${clinicData.latitude},${clinicData.longitude}`;
      window.open(url, "_blank");
    } else if (clinicData?.address) {
      // Open Google Maps with address
      const address = encodeURIComponent(clinicData.address);
      const url = `https://www.google.com/maps/dir/?api=1&destination=${address}`;
      window.open(url, "_blank");
    }
  };

  if (loading) {
    return (
      <div className="clinic-map-page">
        <div className="container" style={{ padding: "60px 0", textAlign: "center" }}>
          <Spin size="large" />
          <div style={{ marginTop: "16px", color: "#666" }}>
            Đang tải thông tin cơ sở y tế...
          </div>
        </div>
      </div>
    );
  }

  if (error || !clinic) {
    return (
      <div className="clinic-map-page">
        <div className="container" style={{ padding: "60px 0" }}>
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
          <Card style={{ textAlign: "center", marginTop: "40px" }}>
            <Text type="danger" style={{ fontSize: "16px" }}>
              {error || "Không tìm thấy thông tin cơ sở y tế"}
            </Text>
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

  return (
    <div className="clinic-map-page">
      <div className="container">
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
              label: clinic.name,
            },
          ]}
        />

        <div style={{ marginTop: "24px", marginBottom: "24px" }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/co-so-y-te")}
            style={{ marginBottom: "16px" }}
          >
            Quay lại danh sách
          </Button>

          <Card>
            <div style={{ marginBottom: "24px" }}>
              <Title level={2} style={{ marginBottom: "8px" }}>
                {clinic.name}
              </Title>
              {clinic.address && (
                <Space style={{ marginBottom: "8px" }}>
                  <EnvironmentOutlined style={{ color: "#45c3d2" }} />
                  <Text>{clinic.address}</Text>
                </Space>
              )}
              {clinic.phone && (
                <div style={{ marginBottom: "8px" }}>
                  <Text strong>Điện thoại: </Text>
                  <Text>{clinic.phone}</Text>
                </div>
              )}
              {clinic.description && (
                <Paragraph style={{ marginTop: "16px", color: "#666" }}>
                  {clinic.description}
                </Paragraph>
              )}
            </div>

            <div style={{ marginTop: "24px" }}>
              <ClinicMap clinic={clinic} onGetDirections={handleGetDirections} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ClinicMapPage;

