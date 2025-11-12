import React from "react";

export const Input = ({ className = "", type = "text", ...props }) => {
  return (
    <input
      type={type}
      className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      style={{
        display: "flex",
        height: "2.5rem",
        width: "100%",
        borderRadius: "0.375rem",
        border: "1px solid #e2e8f0",
        backgroundColor: "#f7fafc",
        padding: "0 0.75rem",
        fontSize: "0.875rem",
        lineHeight: "1.25rem",
        outline: "none",
      }}
      {...props}
    />
  );
};
