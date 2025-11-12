import React from 'react';
import './Dialog.css';

export const Dialog = ({ open, onOpenChange, children, className = "" }) => {
  if (!open) return null;

  return (
    <div className={`dialog-overlay ${className}`} onClick={() => onOpenChange(false)}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};

export const DialogContent = ({ children, className = "" }) => {
  return (
    <div className={`dialog-content-inner ${className}`}>
      {children}
    </div>
  );
};

export const DialogHeader = ({ children, className = "" }) => {
  return (
    <div className={`dialog-header ${className}`}>
      {children}
    </div>
  );
};

export const DialogTitle = ({ children, className = "" }) => {
  return (
    <h2 className={`dialog-title ${className}`}>
      {children}
    </h2>
  );
};
