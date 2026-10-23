import React from 'react';
import { Plus, ArrowRight, ArrowLeft } from 'lucide-react';

export const TaskBoardFilterHeader = ({
  filterMeta,
  filteredCount = 0,
  onResetFilter,
  onNewTask,
  lang,
  t,
}) => {
  if (!filterMeta) return null;
  const FilterIcon = filterMeta.icon;

  return (
    <div className="p-4 rounded-3xl glass-panel border border-slate-200/90 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-xs">
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-2xl flex items-center justify-center border ${filterMeta.color}`}
        >
          {FilterIcon && <FilterIcon className="w-5 h-5" />}
        </div>
        <div>
          <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
            {filterMeta.title}
          </h2>
          <p className="text-[11px] text-slate-400">
            {t('showingFilteredTasks')} ({filteredCount})
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onResetFilter}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-input text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-brand-500 transition-colors"
        >
          {lang === 'fa' ? (
            <ArrowRight className="w-3.5 h-3.5" />
          ) : (
            <ArrowLeft className="w-3.5 h-3.5" />
          )}
          <span>{t('backToAllBoard')}</span>
        </button>
        <button
          onClick={onNewTask}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 transition-all shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t('newTask')}</span>
        </button>
      </div>
    </div>
  );
};
