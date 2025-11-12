import React from "react";
import { NotificationCenter } from "../../../components/NotificationCenter/NotificationCenter";
import { BrandLogo } from "../../../components/ui/BrandLogo";
import "./DauTrangBenhNhan.scss";

export function DauTrangBenhNhan() {
  return (
    <header className="patient-header">
      <div className="header-content">
        <div className="header-left">
          <BrandLogo />
        </div>
        <div className="header-right">
          <NotificationCenter />
        </div>
      </div>
    </header>
  );
}
