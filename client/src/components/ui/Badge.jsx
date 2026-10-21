import React from 'react';

export const Badge = ({ children, variant = 'default', size = 'sm', className = '' }) => {
  const sizeClasses = {
    xs: 'text-[10px] px-2 py-0.5 rounded-md font-bold',
    sm: 'text-xs px-2.5 py-0.5 rounded-lg font-semibold',
  };

  return (
    <span className={`inline-flex items-center gap-1 border ${sizeClasses[size] || sizeClasses.sm} ${className}`}>
      {children}
    </span>
  );
};
