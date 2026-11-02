import React from 'react';
import { Calendar, User } from 'lucide-react';
import { formatTaskDate } from '../../utils/taskHelpers.js';

export const TaskDetailMetadata = ({ task, lang, t }) => {
  if (!task) return null;

  const assignees = Array.isArray(task.assignedTo)
    ? task.assignedTo
    : task.assignedTo ? [task.assignedTo] : [];

  const hasDueDate = Boolean(task.dueDate);
  const hasAssignees = assignees.length > 0;

  if (!hasDueDate && !hasAssignees) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
      {hasDueDate && (
        <div className="p-3 rounded-2xl glass-panel border border-slate-200/60 dark:border-slate-800 flex items-center gap-2.5">
          <Calendar className="w-4 h-4 text-brand-500 dark:text-brand-400 shrink-0" />
          <div>
            <p className="text-[10px] font-bold text-slate-400">{t('dueDateLabel')}</p>
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              {formatTaskDate(task.dueDate, lang, true)}
            </p>
          </div>
        </div>
      )}

      {hasAssignees && (
        <div className="p-3 rounded-xl glass-panel border border-slate-200/60 dark:border-slate-800 space-y-2">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-brand-500 shrink-0" />
            <p className="text-[10px] font-bold text-slate-400">
              {t('assigneeLabel')} ({assignees.length})
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {assignees.map((a, i) => (
              <div
                key={a?._id || i}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-100/80 dark:bg-slate-800/60 text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-brand-600 to-indigo-600 text-white font-bold flex items-center justify-center text-[10px]">
                  {(a?.name?.[0] || 'U').toUpperCase()}
                </div>
                <span className="truncate max-w-[140px]">{a?.name}</span>
                {a?.email && (
                  <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">
                    ({a.email})
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

