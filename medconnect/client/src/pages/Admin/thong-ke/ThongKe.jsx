import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Row, Col, Button, Space, DatePicker, Spin, Alert } from "antd";
import {
  UserOutlined,
  TeamOutlined,
  CalendarOutlined,
  DollarOutlined,
  DownOutlined,
  MedicineBoxOutlined,
  RiseOutlined,
  LineChartOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { getAdminStatistics } from "../../../lib/api";
import "./ThongKe.scss";

const ThongKe = () => {
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState("today");
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [dateRange, setDateRange] = useState([null, null]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statistics, setStatistics] = useState(null);

  const periods = [
    { key: "today", label: "Hôm Nay" },
    { key: "week", label: "Tuần" },
    { key: "month", label: "Tháng" },
    { key: "year", label: "Năm" },
    { key: "custom", label: "Tùy Chỉnh" },
  ];

  useEffect(() => {
    fetchStatistics();
  }, [selectedPeriod, dateRange]);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = { period: selectedPeriod };
      if (selectedPeriod === "custom" && dateRange[0] && dateRange[1]) {
        params.startDate = dayjs(dateRange[0]).format("YYYY-MM-DD");
        params.endDate = dayjs(dateRange[1]).format("YYYY-MM-DD");
      }

      const response = await getAdminStatistics(params);
      const data = response.data || response;

      // Validate data structure
      if (!data || typeof data !== "object") {
        throw new Error("Dữ liệu thống kê không hợp lệ");
      }

      setStatistics(data);
      
      // Debug: Log revenue trend data
      if (data.revenueTrend) {
        console.log("📊 Revenue Trend Data:", data.revenueTrend);
        console.log("📊 Revenue Trend Length:", data.revenueTrend.length);
        if (data.revenueTrend.length > 0) {
          console.log("📊 First item:", data.revenueTrend[0]);
          console.log("📊 Sample items:", data.revenueTrend.slice(0, 3));
          // Check if there's any non-zero revenue
          const hasRevenue = data.revenueTrend.some(item => 
            (item.online && item.online > 0) || 
            (item.offline && item.offline > 0) || 
            (item.total && item.total > 0)
          );
          console.log("📊 Has any revenue:", hasRevenue);
        }
      }
    } catch (err) {
      console.error("Error fetching statistics:", err);
      setError(err.message || "Không thể tải dữ liệu thống kê");
      setStatistics(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date) => {
    if (!date) return "--";
    return dayjs(date).format("DD/MM/YYYY");
  };

  // Custom hook to measure container size
  const useContainerSize = (defaultHeight) => {
    const containerRef = useRef(null);
    const [size, setSize] = useState({ width: 0, height: defaultHeight });

    useEffect(() => {
      const updateSize = () => {
        if (containerRef.current) {
          const { width, height } = containerRef.current.getBoundingClientRect();
          if (width > 0 && height > 0) {
            setSize({ width, height });
          }
        }
      };

      updateSize();
      window.addEventListener("resize", updateSize);
      // Use ResizeObserver if available for better performance
      let resizeObserver;
      if (containerRef.current && window.ResizeObserver) {
        resizeObserver = new ResizeObserver(updateSize);
        resizeObserver.observe(containerRef.current);
      }

      return () => {
        window.removeEventListener("resize", updateSize);
        if (resizeObserver) {
          resizeObserver.disconnect();
        }
      };
    }, [defaultHeight]);

    return [containerRef, size];
  };

  // Chart Wrapper Component with size measurement
  const ChartWrapper = ({ height, children, emptyMessage }) => {
    const [containerRef, size] = useContainerSize(height);

    return (
      <div 
        ref={containerRef}
        className="chart-container" 
        style={{ height: `${height}px`, width: "100%", minWidth: 0, position: "relative" }}
      >
        {size.width > 0 && size.height > 0 ? (
          <ResponsiveContainer width={size.width} height={size.height} minWidth={0} minHeight={height}>
            {children}
          </ResponsiveContainer>
        ) : (
          <div style={{ width: "100%", height: `${height}px`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Spin />
          </div>
        )}
      </div>
    );
  };

  // StatCard Component
  const StatCard = ({ label, value, icon, colorClass, onClick }) => {
    return (
      <div
        className={`stat-card-modern ${colorClass} ${onClick ? "clickable" : ""}`}
        onClick={onClick}
      >
        {/* Background Gradient Accent */}
        <div className="stat-card-bg-accent" />

        {/* Content */}
        <div className="stat-card-content-wrapper">
          <div className="stat-card-header-modern">
            <p className="stat-card-label">{label}</p>
            {icon && <span className="stat-card-icon-modern">{icon}</span>}
          </div>
          <div className="stat-card-value-wrapper">
            <p className="stat-card-value-modern">{value}</p>
          </div>
        </div>

        {/* Border Accent */}
        <div className="stat-card-border-accent" />
      </div>
    );
  };

  const statCards =
    statistics &&
    statistics.totalDoctors &&
    statistics.totalPatients &&
    statistics.todayAppointments &&
    statistics.monthRevenue
      ? [
          {
            title: "TỔNG BÁC SĨ",
            value: (statistics.totalDoctors.value || 0).toLocaleString(),
            change:
              statistics.totalDoctors.changeLabel || "0 so với tháng trước",
            icon: <MedicineBoxOutlined />,
            cardClass: "stat-card-blue",
            textColor: "text-blue",
            path: "/admin/users",
            clickable: true,
            showChange: true,
          },
          {
            title: "TỔNG BỆNH NHÂN",
            value: (statistics.totalPatients.value || 0).toLocaleString(),
            change:
              statistics.totalPatients.changeLabel || "0 so với tuần trước",
            icon: <TeamOutlined />,
            cardClass: "stat-card-cyan",
            textColor: "text-cyan",
            path: "/admin/users",
            clickable: true,
            showChange: true,
          },
          {
            title: "LỊCH HẸN",
            value: (statistics.todayAppointments.value || 0).toLocaleString(),
            change:
              statistics.todayAppointments.changeLabel || "0 so với hôm qua",
            icon: <CalendarOutlined />,
            cardClass: "stat-card-emerald",
            textColor: "text-emerald",
            path: "/admin/lich-hen",
            clickable: true,
            showChange: true,
          },
          {
            title: (() => {
              const periodLabels = {
                today: "DOANH THU (HÔM NAY)",
                week: "DOANH THU (TUẦN)",
                month: "DOANH THU (THÁNG)",
                year: "DOANH THU (NĂM)",
                custom: "DOANH THU (TÙY CHỈNH)",
              };
              return periodLabels[selectedPeriod] || "DOANH THU (THÁNG)";
            })(),
            value: formatCurrency(statistics.monthRevenue.value || 0),
            change:
              statistics.monthRevenue.changeLabel || "0% so với tháng trước",
            icon: null,
            cardClass: "stat-card-violet",
            textColor: "text-violet",
            showChange: false,
          },
        ]
      : [
          {
            title: "TỔNG BÁC SĨ",
            value: "0",
            change: "+0 so với tháng trước",
            icon: <MedicineBoxOutlined />,
            cardClass: "stat-card-blue",
            textColor: "text-blue",
            path: "/admin/users",
            clickable: true,
            showChange: true,
          },
          {
            title: "TỔNG BỆNH NHÂN",
            value: "0",
            change: "+0 so với tuần trước",
            icon: <TeamOutlined />,
            cardClass: "stat-card-cyan",
            textColor: "text-cyan",
            path: "/admin/users",
            clickable: true,
            showChange: true,
          },
          {
            title: "LỊCH HẸN",
            value: "0",
            change: "+0 so với hôm qua",
            icon: <CalendarOutlined />,
            cardClass: "stat-card-emerald",
            textColor: "text-emerald",
            path: "/admin/lich-hen",
            clickable: true,
            showChange: true,
          },
          {
            title: (() => {
              const periodLabels = {
                today: "DOANH THU (HÔM NAY)",
                week: "DOANH THU (TUẦN)",
                month: "DOANH THU (THÁNG)",
                year: "DOANH THU (NĂM)",
                custom: "DOANH THU (TÙY CHỈNH)",
              };
              return periodLabels[selectedPeriod] || "DOANH THU (THÁNG)";
            })(),
            value: "₫0",
            change: "+0% so với tháng trước",
            icon: null,
            cardClass: "stat-card-violet",
            textColor: "text-violet",
            showChange: false,
          },
        ];

  if (loading && !statistics) {
    return (
      <div className="statistics">
        <div className="statistics-header">
          <div className="header-content">
            <div>
              <h1>Thống kê</h1>
            </div>
          </div>
        </div>
        <div style={{ textAlign: "center", padding: "50px" }}>
          <Spin size="large" />
          <p style={{ marginTop: "16px" }}>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="statistics">
      {/* Header Section */}
      <div className="statistics-header">
        <div className="header-content">
          <div>
            <h1>Thống kê</h1>
            {error && (
              <Alert
                message="Lỗi"
                description={error}
                type="error"
                showIcon
                style={{ marginTop: "16px" }}
                closable
                onClose={() => setError(null)}
              />
            )}
          </div>
          <div className="filter-buttons">
            <Space size="small">
              {periods.map((period) => (
                <div key={period.key} className="filter-btn-wrapper">
                  <Button
                    type={selectedPeriod === period.key ? "primary" : "default"}
                    className={`filter-btn ${
                      selectedPeriod === period.key ? "active" : ""
                    }`}
                    onClick={() => {
                      if (period.key === "custom") {
                        setShowCustomPicker(!showCustomPicker);
                      } else {
                        setSelectedPeriod(period.key);
                        setShowCustomPicker(false);
                        setDateRange([null, null]);
                      }
                    }}
                    icon={period.key === "custom" ? <DownOutlined /> : null}
                  >
                    {period.label}
                  </Button>
                  {period.key === "custom" && showCustomPicker && (
                    <div className="custom-date-picker-dropdown">
                      <div className="custom-date-picker-content">
                        <div className="date-picker-field">
                          <label className="date-picker-label">Từ Ngày</label>
                          <DatePicker
                            format="DD/MM/YYYY"
                            placeholder="dd/mm/yyyy"
                            value={dateRange[0]}
                            onChange={(date) => {
                              setDateRange([date, dateRange[1]]);
                            }}
                            allowClear
                            style={{ width: "100%" }}
                          />
                        </div>
                        <div className="date-picker-field">
                          <label className="date-picker-label">Đến Ngày</label>
                          <DatePicker
                            format="DD/MM/YYYY"
                            placeholder="dd/mm/yyyy"
                            value={dateRange[1]}
                            onChange={(date) => {
                              setDateRange([dateRange[0], date]);
                            }}
                            disabledDate={(current) => {
                              if (!dateRange[0]) return false;
                              return (
                                current &&
                                dayjs(current).isBefore(
                                  dayjs(dateRange[0]).startOf("day")
                                )
                              );
                            }}
                            allowClear
                            style={{ width: "100%" }}
                          />
                        </div>
                        <Button
                          type="primary"
                          className="apply-date-btn"
                          onClick={() => {
                            if (dateRange[0] && dateRange[1]) {
                              setSelectedPeriod("custom");
                              setShowCustomPicker(false);
                            }
                          }}
                          disabled={!dateRange[0] || !dateRange[1]}
                          block
                        >
                          Áp Dụng
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </Space>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="statistics-content">
        {/* Stat Cards */}
        <Row gutter={[16, 16]} className="stat-cards-row">
          {statCards.map((card, index) => (
            <Col xs={24} sm={12} lg={6} key={index}>
              <StatCard
                label={card.title}
                value={card.value}
                icon={card.icon}
                colorClass={card.textColor}
                onClick={
                  card.clickable && card.path
                    ? () => navigate(card.path)
                    : undefined
                }
              />
            </Col>
          ))}
        </Row>

        {/* Charts Section */}
        {/* Row 1: User Distribution, Appointment Ratio, Top Patients */}
        <Row gutter={[16, 16]} className="charts-row">
          {/* User Distribution */}
          <Col xs={24} lg={8}>
            <Card
              className="chart-card"
              title={
                <div>
                  <div className="chart-card-title">Phân Bố Người Dùng</div>
                  <div className="chart-card-subtitle">Tỷ lệ theo vai trò</div>
                </div>
              }
            >
              <div className="pie-chart-placeholder">
                {statistics?.userDistribution ? (
                  <ChartWrapper height={250}>
                    <PieChart>
                        <Pie
                          data={[
                            {
                              name: "Bệnh Nhân",
                              value: statistics.userDistribution.patient || 0,
                            },
                            {
                              name: "Bác Sĩ",
                              value: statistics.userDistribution.doctor || 0,
                            },
                            {
                              name: "Admin",
                              value: statistics.userDistribution.admin || 0,
                            },
                            {
                              name: "Quản Lý",
                              value: statistics.userDistribution.manager || 0,
                            },
                          ].filter((item) => item.value > 0)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={false}
                          outerRadius={90}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          <Cell fill="#1890ff" />
                          <Cell fill="#52c41a" />
                          <Cell fill="#fa8c16" />
                          <Cell fill="#722ed1" />
                        </Pie>
                        <Tooltip
                          formatter={(value, name) => [`${value} người`, name]}
                        />
                      </PieChart>
                  </ChartWrapper>
                ) : (
                  <div className="chart-container" style={{ height: "250px", width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div className="chart-empty">Chưa có dữ liệu</div>
                  </div>
                )}
                <div className="pie-legend">
                  {statistics?.userDistribution && (
                    <>
                      <div className="legend-item-center">
                        <span className="legend-dot legend-dot-blue"></span>
                        <span className="legend-label">Bệnh Nhân</span>
                        <span className="legend-percentage">
                          {statistics.userDistribution.patientPercent || 0}% (
                          {statistics.userDistribution.patient || 0} người)
                        </span>
                      </div>
                      <div className="legend-item-center">
                        <span
                          className="legend-dot"
                          style={{ backgroundColor: "#52c41a" }}
                        ></span>
                        <span className="legend-label">Bác Sĩ</span>
                        <span className="legend-percentage">
                          {statistics.userDistribution.doctorPercent || 0}% (
                          {statistics.userDistribution.doctor || 0} người)
                        </span>
                      </div>
                      {statistics.userDistribution.admin > 0 && (
                        <div className="legend-item-center">
                          <span
                            className="legend-dot"
                            style={{ backgroundColor: "#fa8c16" }}
                          ></span>
                          <span className="legend-label">Admin</span>
                          <span className="legend-percentage">
                            {statistics.userDistribution.adminPercent || 0}% (
                            {statistics.userDistribution.admin || 0} người)
                          </span>
                        </div>
                      )}
                      {statistics.userDistribution.manager > 0 && (
                        <div className="legend-item-center">
                          <span
                            className="legend-dot"
                            style={{ backgroundColor: "#722ed1" }}
                          ></span>
                          <span className="legend-label">Quản Lý</span>
                          <span className="legend-percentage">
                            {statistics.userDistribution.managerPercent || 0}% (
                            {statistics.userDistribution.manager || 0} người)
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </Card>
          </Col>

          {/* Appointment Type Ratio */}
          <Col xs={24} lg={8}>
            <Card
              className="chart-card"
              title={
                <div>
                  <div className="chart-card-title">Tỷ Lệ Loại Khám</div>
                  <div className="chart-card-subtitle">
                    Phân bố online vs offline
                  </div>
                </div>
              }
            >
              <div className="pie-chart-placeholder">
                {statistics?.appointmentRatio ? (
                  <ChartWrapper height={200}>
                    <PieChart>
                        <Pie
                          data={[
                            {
                              name: "Online",
                              value: statistics.appointmentRatio.online || 0,
                            },
                            {
                              name: "Offline",
                              value: statistics.appointmentRatio.offline || 0,
                            },
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          <Cell fill="#1890ff" />
                          <Cell fill="#13c2c2" />
                        </Pie>
                        <Tooltip
                          formatter={(value, name) => [`${value}%`, name]}
                        />
                      </PieChart>
                  </ChartWrapper>
                ) : (
                  <div className="chart-container" style={{ height: "200px", width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div className="chart-empty">Chưa có dữ liệu</div>
                  </div>
                )}
                <div className="pie-legend">
                  <div className="legend-item-center">
                    <span className="legend-dot legend-dot-blue"></span>
                    <span className="legend-label">Online</span>
                    <span className="legend-percentage">
                      {statistics?.appointmentRatio?.online || 0}% (
                      {statistics?.appointmentRatio?.onlineCount || 0} cuộc)
                    </span>
                  </div>
                  <div className="legend-item-center">
                    <span className="legend-dot legend-dot-cyan"></span>
                    <span className="legend-label">Offline</span>
                    <span className="legend-percentage">
                      {statistics?.appointmentRatio?.offline || 0}% (
                      {statistics?.appointmentRatio?.offlineCount || 0} cuộc)
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </Col>

          {/* Top Patients */}
          <Col xs={24} lg={8}>
            <Card
              className="chart-card"
              title={
                <div>
                  <div className="chart-card-title">
                    Bệnh Nhân Đến Khám Nhiều Nhất
                  </div>
                  <div className="chart-card-subtitle">
                    Top 5 bệnh nhân có lần khám nhiều nhất
                  </div>
                </div>
              }
            >
              <div className="patient-list">
                {statistics?.topPatients?.length > 0
                  ? statistics.topPatients.map((patient) => (
                      <div key={patient.rank} className="patient-item">
                        <div className="patient-info">
                          <div className="patient-name">
                            {patient.rank}. {patient.name}
                          </div>
                          <div className="patient-detail">
                            Khám: {patient.visitCount} lần | Lần cuối:{" "}
                            {formatDate(patient.lastVisit)}
                          </div>
                        </div>
                      </div>
                    ))
                  : [1, 2, 3, 4, 5].map((index) => (
                      <div key={index} className="patient-item">
                        <div className="patient-info">
                          <div className="patient-name">{index}. --</div>
                          <div className="patient-detail">
                            Khám: 0 lần | Lần cuối: --
                          </div>
                        </div>
                      </div>
                    ))}
              </div>
            </Card>
          </Col>
        </Row>

        {/* Row 2: Top Doctors Online and Offline */}
        <Row gutter={[16, 16]} className="charts-row">
          {/* Top Doctors Online */}
          <Col xs={24} lg={12}>
            <Card
              className="chart-card"
              title={
                <div>
                  <div className="chart-card-title">
                    Bác Sĩ Khám Online Nhiều Nhất
                  </div>
                  <div className="chart-card-subtitle">
                    Top 3 bác sĩ khám online tháng này
                  </div>
                </div>
              }
            >
              <div className="chart-placeholder">
                {statistics?.topDoctorsOnline?.length > 0 ? (
                  <ChartWrapper height={300}>
                    <BarChart
                      data={statistics.topDoctorsOnline.map((doctor) => ({
                        name: doctor.name,
                        count: doctor.count,
                      }))}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#1890ff" />
                    </BarChart>
                  </ChartWrapper>
                ) : (
                  <div className="chart-container" style={{ height: "300px", width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div className="chart-empty">Chưa có dữ liệu</div>
                  </div>
                )}
                <div className="chart-legend-list">
                  {statistics?.topDoctorsOnline?.length > 0
                    ? statistics.topDoctorsOnline.map((doctor) => (
                        <div key={doctor.rank} className="legend-item">
                          <span className="legend-name">
                            {doctor.rank}. {doctor.name}
                          </span>
                          <span className="legend-value">
                            {doctor.count} cuộc
                          </span>
                        </div>
                      ))
                    : [1, 2, 3].map((index) => (
                        <div key={index} className="legend-item">
                          <span className="legend-name">--</span>
                          <span className="legend-value">0 cuộc</span>
                        </div>
                      ))}
                </div>
              </div>
            </Card>
          </Col>

          {/* Top Doctors Offline */}
          <Col xs={24} lg={12}>
            <Card
              className="chart-card"
              title={
                <div>
                  <div className="chart-card-title">
                    Bác Sĩ Khám Offline Nhiều Nhất
                  </div>
                  <div className="chart-card-subtitle">
                    Top 3 bác sĩ khám offline tháng này
                  </div>
                </div>
              }
            >
              <div className="chart-placeholder">
                {statistics?.topDoctorsOffline?.length > 0 ? (
                  <ChartWrapper height={300}>
                    <BarChart
                      data={statistics.topDoctorsOffline.map((doctor) => ({
                        name: doctor.name,
                        count: doctor.count,
                      }))}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#13c2c2" />
                    </BarChart>
                  </ChartWrapper>
                ) : (
                  <div className="chart-container" style={{ height: "300px", width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div className="chart-empty">Chưa có dữ liệu</div>
                  </div>
                )}
                <div className="chart-legend-list">
                  {statistics?.topDoctorsOffline?.length > 0
                    ? statistics.topDoctorsOffline.map((doctor) => (
                        <div key={doctor.rank} className="legend-item">
                          <span className="legend-name">
                            {doctor.rank}. {doctor.name}
                          </span>
                          <span className="legend-value">
                            {doctor.count} cuộc
                          </span>
                        </div>
                      ))
                    : [1, 2, 3].map((index) => (
                        <div key={index} className="legend-item">
                          <span className="legend-name">--</span>
                          <span className="legend-value">0 cuộc</span>
                        </div>
                      ))}
                </div>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Revenue Trend Chart */}
        <Row gutter={[16, 16]} className="trend-row">
          <Col xs={24}>
            <Card
              className="chart-card trend-card"
              title={
                <div>
                  <div className="chart-card-title">
                    Doanh Thu Theo Khoảng Thời Gian
                  </div>
                  <div className="chart-card-subtitle">
                    Xu hướng doanh thu hàng ngày (Online vs Offline)
                  </div>
                </div>
              }
            >
              <div className="trend-chart-placeholder">
                <div className="trend-legend">
                  <div className="legend-item-inline">
                    <span className="legend-line legend-line-cyan"></span>
                    <span>Offline</span>
                  </div>
                  <div className="legend-item-inline">
                    <span className="legend-line legend-line-blue"></span>
                    <span>Online</span>
                  </div>
                  <div className="legend-item-inline">
                    <span className="legend-line legend-line-dashed"></span>
                    <span>Tổng</span>
                  </div>
                </div>
                {statistics?.revenueTrend &&
                  statistics.revenueTrend.length > 0 ? (
                    <ChartWrapper height={400}>
                      <LineChart
                        data={statistics.revenueTrend}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis 
                          tickFormatter={(value) => {
                            if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                            if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                            return value.toString();
                          }}
                        />
                        <Tooltip
                          formatter={(value) => formatCurrency(value)}
                          labelFormatter={(label) => `Thời gian: ${label}`}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="offline"
                          stroke="#13c2c2"
                          strokeWidth={2}
                          name="Offline"
                        />
                        <Line
                          type="monotone"
                          dataKey="online"
                          stroke="#1890ff"
                          strokeWidth={2}
                          name="Online"
                        />
                        <Line
                          type="monotone"
                          dataKey="total"
                          stroke="#8c8c8c"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          name="Tổng"
                        />
                      </LineChart>
                    </ChartWrapper>
                  ) : (
                    <div className="chart-container" style={{ height: "400px", width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div className="chart-empty">Chưa có dữ liệu</div>
                    </div>
                  )}
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default ThongKe;
