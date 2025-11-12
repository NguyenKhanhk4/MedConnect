import React from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, FileText, Settings } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/Card";
import "./HanhDongNhanh.scss";

export function HanhDongNhanh() {
  const navigate = useNavigate();

  const actions = [
    {
      title: "Đặt lịch mới",
      description: "Tạo lịch hẹn khám bệnh",
      icon: Calendar,
      path: "/dat-lich",
    },
    {
      title: "Hồ sơ bệnh án",
      description: "Xem lịch sử khám bệnh",
      icon: FileText,
      path: "/benh-nhan/ho-so-benh-an",
    },
    {
      title: "Cài đặt",
      description: "Quản lý tài khoản",
      icon: Settings,
      path: "/benh-nhan/cai-dat",
    },
  ];
  return (
    <Card className="quick-actions-card">
      <CardHeader>
        <CardTitle className="quick-actions-title">Thao tác nhanh</CardTitle>
      </CardHeader>
      <CardContent className="quick-actions-content">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.title}
              type="button"
              className="quick-action-item"
              onClick={() => action.path && navigate(action.path)}
            >
              <div className="quick-action-icon-wrapper">
                <Icon className="quick-action-icon-svg" />
              </div>
              <div className="quick-action-text">
                <span className="quick-action-title-text">{action.title}</span>
                <span className="quick-action-description-text">
                  {action.description}
                </span>
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
