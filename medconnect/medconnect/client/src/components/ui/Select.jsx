import React, { useState, useRef, useEffect } from "react";
import "./Select.css";

export const Select = ({ value, onValueChange, children, className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleValueChange = (newValue) => {
    onValueChange(newValue);
    setIsOpen(false);
  };

  return (
    <div className={`select-container ${className}`} ref={selectRef}>
      {React.Children.map(children, (child) => {
        // Check if child is a valid React element
        if (!child || typeof child !== "object" || !child.type) {
          return child;
        }

        if (child.type.displayName === "SelectTrigger") {
          return React.cloneElement(
            child,
            {
              isOpen,
              onClick: () => setIsOpen(!isOpen),
              value,
            },
            React.Children.map(child.props.children, (subChild) => {
              // Check if subChild is a valid React element
              if (
                subChild &&
                typeof subChild === "object" &&
                subChild.type &&
                (subChild.type.displayName === "SelectValue" ||
                  subChild.type.name === "SelectValue")
              ) {
                return React.cloneElement(subChild, { value });
              }
              return subChild;
            })
          );
        }
        if (child.type.displayName === "SelectContent") {
          return React.cloneElement(child, {
            isOpen,
            onValueChange: handleValueChange,
          });
        }
        return child;
      })}
    </div>
  );
};

export const SelectTrigger = ({
  children,
  className = "",
  isOpen,
  onClick,
  value,
}) => {
  return (
    <button
      className={`select-trigger ${
        isOpen ? "select-trigger-open" : ""
      } ${className}`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
};

export const SelectValue = ({ placeholder = "Select...", value, children }) => {
  // If children are provided, use them (for custom display text)
  if (children !== undefined && children !== "") {
    return <span className="select-value">{children}</span>;
  }
  // If value is empty or undefined, show placeholder
  if (!value || value === "") {
    return (
      <span className="select-value" style={{ color: "#9ca3af" }}>
        {placeholder}
      </span>
    );
  }
  // Otherwise, show the value
  return <span className="select-value">{value}</span>;
};

export const SelectContent = ({
  children,
  className = "",
  isOpen,
  onValueChange,
}) => {
  if (!isOpen) return null;

  return (
    <div className={`select-content ${className}`}>
      {React.Children.map(children, (child) => {
        if (child.type.displayName === "SelectItem") {
          return React.cloneElement(child, { onValueChange });
        }
        return child;
      })}
    </div>
  );
};

export const SelectItem = ({
  value,
  children,
  className = "",
  onValueChange,
}) => {
  const handleClick = () => {
    onValueChange(value);
  };

  return (
    <div className={`select-item ${className}`} onClick={handleClick}>
      {children}
    </div>
  );
};

// Add displayName for React DevTools
SelectTrigger.displayName = "SelectTrigger";
SelectContent.displayName = "SelectContent";
SelectItem.displayName = "SelectItem";
SelectValue.displayName = "SelectValue";
