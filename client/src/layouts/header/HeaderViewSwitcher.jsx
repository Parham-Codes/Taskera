import React from 'react';
import { LayoutGrid, List as ListIcon, Calendar } from 'lucide-react';

export const HeaderViewSwitcher = ({
  viewMode,
  onViewModeChange,
  t,
}) => {
  return (
    <div className="hidden sm:flex items-center glass-panel p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
      <button
        type="button"
        onClick={() => onViewModeChange('kanban')}
        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
          viewMode === 'kanban'
            ? 'bg-brand-500 text-white shadow-xs'
            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
        }`}
        title={t('boardView')}
      >
        <LayoutGrid className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onViewModeChange('list')}
        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
          viewMode === 'list'
            ? 'bg-brand-500 text-white shadow-xs'
            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
        }`}
        title={t('listView')}
      >
        <ListIcon className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onViewModeChange('calendar')}
        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
          viewMode === 'calendar'
            ? 'bg-brand-500 text-white shadow-xs'
            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
        }`}
        title={t('calendarView')}
      >
        <Calendar className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

