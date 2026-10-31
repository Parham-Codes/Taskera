import React from 'react';

/**
 * Taskera Brand Vector Logo
 * Features brand gradient (#4F5AE4 to #2563eb), glossy rim light, checkmark, and accent blue dot.
 */
export const TaskeraLogo = ({ className = 'w-8 h-8', idPrefix = 'taskera-logo' }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Taskera Logo"
    >
      <defs>
        <linearGradient
          id={`${idPrefix}-brandGrad`}
          x1="64"
          y1="32"
          x2="448"
          y2="480"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#4F5AE4" />
          <stop offset="50%" stopColor="#4350db" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <linearGradient
          id={`${idPrefix}-checkGrad`}
          x1="160"
          y1="160"
          x2="360"
          y2="360"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e0e7ff" />
        </linearGradient>
        <linearGradient
          id={`${idPrefix}-rimLight`}
          x1="256"
          y1="0"
          x2="256"
          y2="512"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* Complete Circle Badge */}
      <circle cx="256" cy="256" r="256" fill={`url(#${idPrefix}-brandGrad)`} />
      <circle
        cx="256"
        cy="256"
        r="253"
        stroke={`url(#${idPrefix}-rimLight)`}
        strokeWidth="5"
      />
      <path
        d="M164 266L232 334L356 190"
        stroke={`url(#${idPrefix}-checkGrad)`}
        strokeWidth="44"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="350" cy="146" r="22" fill="#60a5fa" />
    </svg>
  );
};

export default TaskeraLogo;
