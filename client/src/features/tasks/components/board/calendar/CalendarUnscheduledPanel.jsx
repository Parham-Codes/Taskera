import React from 'react';
import { CalendarOff, X } from 'lucide-react';
import { PRIORITY_BORDER_COLORS } from '../../../utils/taskHelpers.js';

export const CalendarUnscheduledPanel = ({
  unscheduledTasks = [],
  isOpen,
  onClose,
  onOpenDetail,
  onDragStart,
  onDragEnd,
  dragOverUnscheduled,
  onDragOver,
  onDragLeave,
  onDrop,
  t,
  lang,
}) => {
  if (!isOpen) return null;

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`rounded-2xl transition-all duration-200 p-4 border glass-panel shadow-xs ${
        dragOverUnscheduled
          ? 'ring-2 ring-amber-500/80 bg-amber-500/[0.08] dark:bg-amber-500/[0.12] border-amber-500/50 shadow-md'
          : 'border-slate-200/80 dark:border-slate-800'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CalendarOff className="w-4 h-4 text-amber-500" />
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            {t('noDueDateTasks')}
          </h3>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300">
            {unscheduledTasks.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-[11px] text-slate-400">
            {t('dropToClearDueDate')}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close unscheduled tasks"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {unscheduledTasks.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
          <p>{t('allTasksHaveDueDate')}</p>
          <p className="text-[11px] text-slate-400/80 mt-1">
            {t('dropToClearDueDateHint')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-48 overflow-y-auto pe-1">
          {unscheduledTasks.map((task) => {
            const borderClass =
              PRIORITY_BORDER_COLORS[task.priority] || 'border-s-blue-500';

            return (
              <div
                key={task._id}
                draggable
                onDragStart={(e) => onDragStart(e, task)}
                onDragEnd={onDragEnd}
                onClick={() => onOpenDetail(task)}
                className={`p-2.5 rounded-xl glass-panel border border-slate-200/90 dark:border-slate-800 border-s-4 ${borderClass} hover:border-brand-500/50 hover:shadow-xs transition-all cursor-grab active:cursor-grabbing text-start group`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[10px] font-bold text-slate-400 capitalize">
                    {t(task.status) || task.status}
                  </span>
                  <span className="text-[10px] text-slate-400 group-hover:text-brand-500 transition-colors">
                    {t(task.priority) || task.priority}
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-100 line-clamp-1 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                  {task.title}
                </h4>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
