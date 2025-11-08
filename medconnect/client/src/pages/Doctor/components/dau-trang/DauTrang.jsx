import React from "react";
import { NotificationCenter } from "../../../../components/NotificationCenter/NotificationCenter";
import "./DauTrang.scss";

export function DauTrang() {
  return (
    <header className="doctor-header">
      <div className="doctor-header-content">
        {/* Left Section - Title */}
        <div className="doctor-header-left">
          <h1 className="doctor-header-title"></h1>
        </div>

        {/* Right Section - Notifications */}
        <div className="doctor-header-right">
          <NotificationCenter />
        </div>
      </div>
    </header>
  );
}
