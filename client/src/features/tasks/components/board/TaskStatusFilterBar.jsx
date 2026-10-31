import React from 'react';

export const TaskStatusFilterBar = ({
  statusColumns = [],
  selectedStatus = 'all',
  onSelectStatus,
  tasks = [],
  t,
}) => {
  const allCount = tasks.length;

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
      {/* All Tasks Tab */}
      <button
        type="button"
        onClick={() => onSelectStatus('all')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 border cursor-pointer ${
          selectedStatus === 'all'
            ? 'bg-brand-500 text-white border-brand-500 shadow-xs font-bold'
            : 'glass-panel text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        <span>{t('all')}</span>
        <span
          className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
            selectedStatus === 'all'
              ? 'bg-white/25 text-white'
              : 'bg-slate-200/70 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
          }`}
        >
          {allCount}
        </span>
      </button>

      {/* Individual Status Tabs */}
      {statusColumns.map((col) => {
        const isSelected = selectedStatus === col.id;
        const count = tasks.filter((t) => t.status === col.id).length;

        return (
          <button
            key={col.id}
            type="button"
            onClick={() => onSelectStatus(isSelected ? 'all' : col.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 border cursor-pointer ${
              isSelected
                ? 'bg-brand-500 text-white border-brand-500 shadow-xs font-bold'
                : 'glass-panel text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isSelected ? 'bg-white' : col.indicatorColor || 'bg-slate-400'
              }`}
            />
            <span>{col.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                isSelected
                  ? 'bg-white/25 text-white'
                  : 'bg-slate-200/70 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
};
