import React from "react";

export const Card = ({ className = "", children, ...props }) => {
  return (
    <div
      className={`rounded-lg border bg-card text-card-foreground shadow-sm ${className}`}
      style={{
        borderRadius: "0.75rem",
        border: "2px solid #cbd5e1",
        backgroundColor: "#ffffff",
        color: "#2d3748",
        boxShadow:
          "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        transition: "all 0.2s ease-in-out",
      }}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ className = "", children, ...props }) => {
  return (
    <div className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardTitle = ({ className = "", children, ...props }) => {
  return (
    <h2
      className={`text-2xl font-semibold leading-none tracking-tight ${className}`}
      {...props}
    >
      {children}
    </h2>
  );
};

export const CardContent = ({ className = "", children, ...props }) => {
  return (
    <div className={`p-6 pt-0 ${className}`} {...props}>
      {children}
    </div>
  );
};
