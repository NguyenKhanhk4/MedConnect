import React from "react";
import { CalendarOutlined, TeamOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { Card, Button, Statistic, Row, Col } from "antd";
import "./TrangChu.scss";

export default function TrangChu() {
  const navigate = useNavigate();

  return (
    <div className="manager-dashboard">
      <div className="dashboard-header">
        <h1>Dashboard Quản lý</h1>
        <p>Quản lý lịch làm việc của các bác sĩ</p>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8}>
          <Card
            hoverable
            className="dashboard-card"
            onClick={() => navigate("/manager/quan-ly-lich")}
          >
            <div className="card-content">
              <CalendarOutlined className="card-icon" />
              <div className="card-info">
                <h3>Quản lý lịch</h3>
                <p>Xem và quản lý lịch làm việc của bác sĩ</p>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <Card
            hoverable
            className="dashboard-card"
            onClick={() => navigate("/manager/danh-sach-bac-si")}
          >
            <div className="card-content">
              <TeamOutlined className="card-icon" />
              <div className="card-info">
                <h3>Danh sách bác sĩ</h3>
                <p>Xem danh sách tất cả bác sĩ</p>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
