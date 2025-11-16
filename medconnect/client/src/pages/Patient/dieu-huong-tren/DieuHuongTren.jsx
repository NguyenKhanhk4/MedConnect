import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "../../../components/ui/Button";
import { Menu, Calendar, User, Plus } from "lucide-react";
import { BrandLogo } from "../../../components/ui/BrandLogo";
import "./DieuHuongTren.scss";

const NAVIGATION_ITEMS = [
  { label: "Trang chủ", href: "/" },
  { label: "Tại nhà", href: "/kham-tai-nha" },
  { label: "Tại viện", href: "/kham-tai-vien" },
  { label: "Giới thiệu", href: "/gioi-thieu" },
];

export function DieuHuongTren() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleNavigation = (path) => () => navigate(path);

  return (
    <header className="top-navigation">
      <div className="top-navigation-container">
        {/* Left side - Menu + Logo */}
        <div className="top-navigation-left">
          <Button
            variant="ghost"
            size="icon"
            className="menu-button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu className="menu-icon" />
          </Button>

          <BrandLogo icon={Plus} tagline={null} />
        </div>

        {/* Center - Navigation Links */}
        <nav className="top-navigation-center">
          <ul className="navigation-list">
            {NAVIGATION_ITEMS.map((item) => (
              <li key={item.href}>
                <button
                  onClick={handleNavigation(item.href)}
                  className={`navigation-item ${
                    location.pathname === item.href ? "active" : ""
                  }`}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Right side - Actions */}
        <div className="top-navigation-right">
          <Button
            variant="outline"
            className="book-appointment-btn"
            onClick={handleNavigation("/dat-lich")}
          >
            <Calendar className="btn-icon" />
            Đặt lịch
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="profile-btn"
            onClick={handleNavigation("/tai-khoan")}
          >
            <User className="profile-icon" />
          </Button>
        </div>
      </div>
    </header>
  );
}
