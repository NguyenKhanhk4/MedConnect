import React from "react";

export const Button = ({
  className = "",
  variant = "default",
  size = "default",
  children,
  style = {},
  ...props
}) => {
  const baseStyles = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    whiteSpace: "nowrap",
    borderRadius: "0.75rem", // Bo tròn hơn
    fontSize: "0.875rem",
    fontWeight: "500",
    transition: "all 0.2s ease",
    cursor: props.disabled ? "not-allowed" : "pointer",
    border: "none",
    boxShadow:
      variant === "default" && !props.disabled
        ? "0 2px 4px rgba(0, 0, 0, 0.1)"
        : "none",
    // Apply size-specific styles - Tất cả buttons cùng size
    ...(size === "sm" && {
      height: "2.25rem",
      minHeight: "2.25rem",
      maxHeight: "2.25rem",
      padding: "0.5rem 1rem",
    }),
    ...(size === "default" && {
      height: "2.5rem",
      minHeight: "2.5rem",
      maxHeight: "2.5rem",
      padding: "0.625rem 1rem",
    }),
    ...(size === "icon" && {
      height: "2.5rem",
      minHeight: "2.5rem",
      maxHeight: "2.5rem",
      width: "2.5rem",
      padding: "0",
    }),
    // Apply variant styles
    ...(variant === "outline" && {
      border: "1.5px solid #cbd5e1",
      backgroundColor: props.disabled ? "#f1f5f9" : "#ffffff",
      color: props.disabled ? "#9ca3af" : "#2d3748",
    }),
    ...(variant === "default" && {
      backgroundColor: props.disabled ? "#9ca3af" : "#2b6cb0",
      color: "#ffffff",
    }),
    ...(variant === "secondary" && {
      backgroundColor: props.disabled ? "#e5e7eb" : "#f1f5f9",
      color: props.disabled ? "#9ca3af" : "#334155",
      border: "1.5px solid #e2e8f0",
    }),
    ...(variant === "ghost" && {
      backgroundColor: "transparent",
      color: props.disabled ? "#9ca3af" : "#2d3748",
    }),
  };

  // Merge base styles with custom styles, allowing custom styles to override
  const mergedStyles = {
    ...baseStyles,
    ...style,
    // Force critical properties to stay consistent
    borderRadius: baseStyles.borderRadius,
    height: baseStyles.height,
    minHeight: baseStyles.minHeight,
    maxHeight: baseStyles.maxHeight,
    padding: baseStyles.padding,
  };

  const handleMouseEnter = (e) => {
    if (props.disabled) return;
    // Light lift effect on hover
    e.currentTarget.style.transform = "translateY(-2px)";
    e.currentTarget.style.boxShadow =
      variant === "default"
        ? "0 4px 12px rgba(43, 108, 176, 0.25)"
        : variant === "outline"
        ? "0 2px 8px rgba(0, 0, 0, 0.1)"
        : "0 2px 8px rgba(0, 0, 0, 0.08)";

    // Slight color change on hover
    const currentBg = style.backgroundColor;
    if (!currentBg) {
      // No custom color - use variant default hover
      if (variant === "default") {
        e.currentTarget.style.backgroundColor = "#2563eb";
      } else if (variant === "outline") {
        e.currentTarget.style.backgroundColor = "#f8fafc";
        e.currentTarget.style.borderColor = "#94a3b8";
      } else if (variant === "ghost") {
        e.currentTarget.style.backgroundColor = "#f1f5f9";
      }
    } else {
      // Has custom color - darken it on hover
      if (currentBg === "#dc2626") {
        // Red cancel button - darker red
        e.currentTarget.style.backgroundColor = "#b91c1c";
      } else if (currentBg === "#1890ff") {
        // Video call button - darker blue
        e.currentTarget.style.backgroundColor = "#1677ff";
      } else {
        // Generic hover effect - slightly darker
        e.currentTarget.style.filter = "brightness(0.95)";
      }
    }
  };

  const handleMouseLeave = (e) => {
    if (props.disabled) return;
    e.currentTarget.style.transform = "translateY(0)";
    e.currentTarget.style.boxShadow =
      variant === "default" && !props.disabled
        ? "0 2px 4px rgba(0, 0, 0, 0.1)"
        : "none";

    // Reset colors and effects
    e.currentTarget.style.filter = "none";
    if (!style.backgroundColor) {
      if (variant === "default") {
        e.currentTarget.style.backgroundColor = "#2b6cb0";
      } else if (variant === "outline") {
        e.currentTarget.style.backgroundColor = "#ffffff";
        e.currentTarget.style.borderColor = "#cbd5e1";
      } else if (variant === "ghost") {
        e.currentTarget.style.backgroundColor = "transparent";
      }
    } else {
      // Reset to original custom color
      e.currentTarget.style.backgroundColor = style.backgroundColor;
    }
  };

  const handleMouseDown = (e) => {
    if (props.disabled) return;
    // Slight press effect
    e.currentTarget.style.transform = "translateY(0)";
    e.currentTarget.style.boxShadow = "0 1px 2px rgba(0, 0, 0, 0.1)";
  };

  const handleMouseUp = (e) => {
    if (props.disabled) return;
    // Return to hover state
    e.currentTarget.style.transform = "translateY(-2px)";
    e.currentTarget.style.boxShadow =
      variant === "default"
        ? "0 4px 12px rgba(43, 108, 176, 0.25)"
        : "0 2px 8px rgba(0, 0, 0, 0.1)";
  };

  return (
    <button
      className={className}
      style={mergedStyles}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      {...props}
    >
      {children}
    </button>
  );
};
