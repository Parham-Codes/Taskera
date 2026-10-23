import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Columns,
  Grid3X3,
  CalendarOff,
} from 'lucide-react';

export const CalendarToolbar = ({
  title,
  viewType,
  onViewTypeChange,
  onPrev,
  onNext,
  onToday,
  totalScheduledTasks = 0,
  unscheduledTasksCount = 0,
  showUnscheduled,
  onToggleUnscheduled,
  t,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl glass-panel border border-slate-200/80 dark:border-slate-800 shadow-xs">
      {/* Left side: Navigation (Prev, Today, Next) & Current Date Title */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-between sm:justify-start">
        <div className="flex items-center gap-1 bg-slate-100/70 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200/60 dark:border-slate-750">
          <button
            type="button"
            onClick={onPrev}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-all shadow-2xs rtl:rotate-180"
            title={t('prevPeriod')}
            aria-label={t('prevPeriod')}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onToday}
            className="px-2.5 py-1 text-xs font-bold rounded-lg text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-all shadow-2xs"
          >
            {t('today')}
          </button>

          <button
            type="button"
            onClick={onNext}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-all shadow-2xs rtl:rotate-180"
            title={t('nextPeriod')}
            aria-label={t('nextPeriod')}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Current Period Heading */}
        <div className="flex items-center gap-2">
          <h2 className="text-sm sm:text-base md:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
            {title}
          </h2>
          <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
            {totalScheduledTasks} {t('tasksCountLabel') || ''}
          </span>
        </div>
      </div>

      {/* Right side: Month/Week View Switcher & "Without due date" Toggle Button */}
      <div className="flex items-center gap-2 self-end sm:self-auto">
        {/* Unscheduled Tasks Drawer Toggle */}
        <button
          type="button"
          onClick={onToggleUnscheduled}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
            showUnscheduled
              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
              : 'glass-panel text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white'
          }`}
          title={t('noDueDateTasks')}
        >
          <CalendarOff className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden xs:inline">{t('noDueDateTasks')}</span>
          {unscheduledTasksCount > 0 && (
            <span className="ms-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300">
              {unscheduledTasksCount}
            </span>
          )}
        </button>

        {/* Month vs Week Switcher */}
        <div className="flex items-center p-1 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-750">
          <button
            type="button"
            onClick={() => onViewTypeChange('month')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
              viewType === 'month'
                ? 'bg-brand-500 text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Grid3X3 className="w-3.5 h-3.5" />
            <span>{t('monthView')}</span>
          </button>

          <button
            type="button"
            onClick={() => onViewTypeChange('week')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
              viewType === 'week'
                ? 'bg-brand-500 text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>{t('weekView')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
