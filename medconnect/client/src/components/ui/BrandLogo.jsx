import React from "react";
import { Plus } from "lucide-react";

/**
 * Brand Logo Component
 * Reusable brand/logo component for headers
 * @param {Object} props
 * @param {string} props.brandName - Brand name (default: "MedConnect")
 * @param {string} props.tagline - Brand tagline (default: "Chăm sóc sức khỏe")
 * @param {React.Component} props.icon - Custom icon component (default: Plus)
 * @param {string} props.className - Additional CSS classes
 */
export function BrandLogo({
  brandName = "MedConnect",
  tagline = "Chăm sóc sức khỏe",
  icon: Icon = Plus,
  className = "",
}) {
  return (
    <div className={`brand-container ${className}`}>
      <div className="brand-icon">
        <div className="icon-circle">
          <Icon className="brand-icon-symbol" />
        </div>
      </div>
      <div className="brand-text">
        <div className="brand-name">{brandName}</div>
        {tagline && <div className="brand-tagline">{tagline}</div>}
      </div>
    </div>
  );
}
