import React from "react";

export const Avatar = ({ className = "", children, ...props }) => {
  return (
    <div
      className={`relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const AvatarImage = ({ className = "", src, alt, ...props }) => {
  return (
    <img
      className={`aspect-square h-full w-full object-cover ${className}`}
      src={src}
      alt={alt}
      {...props}
    />
  );
};

export const AvatarFallback = ({ className = "", children, ...props }) => {
  return (
    <div
      className={`flex h-full w-full items-center justify-center rounded-full bg-muted ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
