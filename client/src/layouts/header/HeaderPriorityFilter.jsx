import React from 'react';
import { SlidersHorizontal, ChevronDown, Check } from 'lucide-react';

export const HeaderPriorityFilter = ({
  priorityFilter,
  onPriorityFilterChange,
  isOpen,
  onToggleOpen,
  menuRef,
  t,
}) => {
  const priorityOptions = [
    { id: 'all', label: t('allPriorities'), dotColor: 'bg-slate-400' },
    { id: 'urgent', label: t('urgent'), dotColor: 'bg-red-500' },
    { id: 'high', label: t('high'), dotColor: 'bg-orange-500' },
    { id: 'medium', label: t('medium'), dotColor: 'bg-blue-500' },
    { id: 'low', label: t('low'), dotColor: 'bg-slate-400' },
  ];

  const currentOption =
    priorityOptions.find((p) => p.id === priorityFilter) || priorityOptions[0];

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={onToggleOpen}
        className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 text-xs rounded-xl glass-input hover:border-brand-500/40 transition-all font-semibold text-slate-700 dark:text-slate-300 shadow-xs cursor-pointer"
        title={t('priority')}
      >
        <SlidersHorizontal className="w-3.5 h-3.5 text-brand-500 shrink-0" />
        <span className="hidden sm:inline-flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${currentOption.dotColor}`} />
          {currentOption.label}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      </button>

      {/* Floating Priority Dropdown */}
      {isOpen && (
        <div className="absolute top-full end-0 mt-1.5 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {t('priority')}
          </div>
          {priorityOptions.map((opt) => {
            const isSelected = priorityFilter === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  onPriorityFilterChange(opt.id);
                  onToggleOpen();
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs text-start transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 font-bold'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${opt.dotColor}`} />
                  <span>{opt.label}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-brand-500" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

