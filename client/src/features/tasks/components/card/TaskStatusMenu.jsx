import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export const TaskStatusMenu = ({
  currentStatus,
  statusColumns = [],
  onStatusChange,
  direction = 'down', // 'down' for fullWidth, 'up' for kanban card
  size = 'md', // 'md' for fullWidth, 'sm' for kanban card
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const currentColumn =
    statusColumns.find((c) => c.id === currentStatus) || statusColumns[0] || {};

  const isSmall = size === 'sm';
  const isUp = direction === 'up';

  return (
    <div
      className="relative"
      ref={menuRef}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center rounded-xl glass-input font-semibold text-slate-700 dark:text-slate-300 hover:border-brand-500/40 transition-all shadow-2xs ${
          isSmall
            ? 'gap-1.5 px-2 py-1 text-[10px] sm:text-[11px] text-slate-600'
            : 'gap-1.5 px-2.5 py-1 text-[11px]'
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            currentColumn.indicatorColor || 'bg-slate-400'
          }`}
        />
        <span>{currentColumn.label}</span>
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>

      {isOpen && (
        <div
          className={`absolute start-0 glass-panel rounded-2xl shadow-xl border border-slate-200/90 dark:border-slate-800 p-1.5 z-40 animate-in fade-in zoom-in-95 duration-100 ${
            isUp ? 'bottom-full mb-1.5 w-36' : 'top-full mt-1.5 w-40'
          }`}
        >
          {statusColumns.map((col) => {
            const isSelected = col.id === currentStatus;
            return (
              <button
                key={col.id}
                type="button"
                onClick={() => {
                  onStatusChange(col.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-start transition-colors ${
                  isSmall ? 'text-[11px]' : 'text-xs'
                } ${
                  isSelected
                    ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 font-bold'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full ${
                      isSmall ? 'w-1.5 h-1.5' : 'w-2 h-2'
                    } ${col.indicatorColor || 'bg-slate-400'}`}
                  />
                  <span>{col.label}</span>
                </div>
                {isSelected && (
                  <Check
                    className={`${isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-brand-500`}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
