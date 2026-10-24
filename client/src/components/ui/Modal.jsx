import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useScrollLock } from '../../utils/useScrollLock.js';

export const Modal = ({
  isOpen,
  onClose,
  title,
  icon: Icon,
  children,
  maxWidth = 'max-w-lg',
  headerExtra = null,
}) => {
  useScrollLock(isOpen);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Render via portal directly to document.body with clean responsive viewport padding
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3.5 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto overscroll-contain"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full ${maxWidth} max-h-[88vh] my-auto flex flex-col bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-6 relative animate-in zoom-in-95 duration-200`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-200/60 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            {Icon && <Icon className="w-5 h-5 text-brand-500 shrink-0" />}
            <h3 className="font-bold text-sm sm:text-base tracking-tight">{title}</h3>
          </div>

          <div className="flex items-center gap-2">
            {headerExtra}
            <button
              onClick={onClose}
              className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content with custom scrollbar */}
        <div className="mt-4 flex-1 overflow-y-auto pe-1">{children}</div>
      </div>
    </div>,
    document.body
  );
};
