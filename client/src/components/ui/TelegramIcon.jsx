import React from 'react';

export const TelegramIcon = ({ className = 'w-4 h-4', ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    {/* Clean, officially-proportioned Telegram Paper Airplane SVG */}
    <path
      d="M21.5 3.5L2.5 10.8C1.2 11.3 1.2 12.3 2.3 12.6L7.2 14.1L18.5 7C19 6.7 19.5 6.9 19.1 7.3L9.9 15.6V19.5C9.9 20.3 10.5 19.9 10.9 19.5L13.7 16.8L18.3 20.2C19.1 20.7 19.8 20.3 20 19.3L22.9 4.8C23.2 3.6 22.4 2.9 21.5 3.5Z"
      fill="currentColor"
    />
  </svg>
);
