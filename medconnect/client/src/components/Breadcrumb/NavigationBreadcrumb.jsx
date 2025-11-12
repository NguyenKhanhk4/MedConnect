import React from "react";
import { useNavigate } from "react-router-dom";
import { Breadcrumb } from "antd";
import { HomeOutlined } from "@ant-design/icons";
import "./NavigationBreadcrumb.css";

const NavigationBreadcrumb = ({ items = [] }) => {
  const navigate = useNavigate();

  const handleNavigation = (path, e) => {
    e.preventDefault();
    navigate(path);
  };

  const breadcrumbItems = items.map((item, index) => {
    const isLast = index === items.length - 1;

    if (isLast) {
      // Last item (current page) should not be clickable
      return {
        key: index,
        title: (
          <>
            {item.icon && (
              <span style={{ marginRight: "4px" }}>{item.icon}</span>
            )}
            {item.label}
          </>
        ),
      };
    }

    // Clickable items
    return {
      key: index,
      title: (
        <a
          href={item.path}
          onClick={(e) => handleNavigation(item.path, e)}
          className="breadcrumb-link"
        >
          {item.icon && <span style={{ marginRight: "4px" }}>{item.icon}</span>}
          {item.label}
        </a>
      ),
    };
  });

  return (
    <Breadcrumb className="navigation-breadcrumb" items={breadcrumbItems} />
  );
};

export default NavigationBreadcrumb;
