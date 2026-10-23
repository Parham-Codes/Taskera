import React from 'react';
import { Clock, CheckSquare } from 'lucide-react';
import { Badge } from '../../../../components/ui/index.js';
import { formatShortDuration } from '../../utils/taskHelpers.js';

export const TaskBadges = ({
  task,
  priorityInfo,
  lang,
  hasRunningTimer,
  onCategoryClick,
  compact = false,
}) => {
  const totalSubtasks = task.subtasks?.length || 0;
  const completedSubtasks =
    task.subtasks?.filter((s) => s.completed)?.length || 0;
  const subtasksPercent =
    totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  const priorityDotColor =
    task.priority === 'urgent'
      ? 'bg-red-500 shadow-sm shadow-red-500/50 animate-pulse'
      : task.priority === 'high'
      ? 'bg-orange-500'
      : task.priority === 'medium'
      ? 'bg-blue-500'
      : 'bg-slate-400';

  return (
    <div className={`flex items-center flex-wrap ${compact ? 'gap-1.5' : 'gap-2'}`}>
      {/* 1. Priority Badge */}
      <Badge className={priorityInfo.style} size="xs">
        <span className={`w-1.5 h-1.5 rounded-full me-1 ${priorityDotColor}`} />
        {priorityInfo.label}
      </Badge>

      {/* 2. Time Spent / Active Recording Badge */}
      {(task.totalTimeSpent > 0 || hasRunningTimer) && (
        <span
          className={`flex items-center gap-1 font-bold rounded-full border ${
            compact ? 'text-[10px] px-2 py-0.5' : 'text-[11px] px-2.5 py-0.5'
          } ${
            hasRunningTimer
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
              : compact
              ? 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
              : 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-500/20'
          }`}
        >
          <Clock className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          <span>
            {hasRunningTimer ? (
              <span className={`flex items-center ${compact ? 'gap-1' : 'gap-1.5'}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                {lang === 'fa'
                  ? compact
                    ? 'در حال ثبت'
                    : 'در حال ثبت زمان'
                  : compact
                  ? 'Active'
                  : 'Recording'}
              </span>
            ) : (
              formatShortDuration(task.totalTimeSpent)
            )}
          </span>
        </span>
      )}

      {/* 3. Category Pill */}
      {task.categoryId && (
        <span
          onClick={(e) => {
            if (onCategoryClick) {
              e.stopPropagation();
              onCategoryClick(task.categoryId?._id || task.categoryId);
            }
          }}
          className={`inline-flex items-center gap-1 font-bold rounded-full border shadow-2xs ${
            compact ? 'text-[10px] px-2 py-0.5' : 'text-[11px] px-2.5 py-0.5'
          } ${
            onCategoryClick
              ? 'cursor-pointer hover:opacity-80 active:scale-95 transition-transform'
              : ''
          }`}
          style={{
            backgroundColor: `${task.categoryId.color || '#4F5AE4'}18`,
            borderColor: `${task.categoryId.color || '#4F5AE4'}35`,
            color: task.categoryId.color || '#4F5AE4',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: task.categoryId.color || '#4F5AE4' }}
          />
          <span className={compact ? 'max-w-[70px] truncate' : ''}>
            {task.categoryId.name}
          </span>
        </span>
      )}

      {/* 4. Subtasks Progress Pill */}
      {totalSubtasks > 0 && (
        <span
          className={`inline-flex items-center font-bold rounded-full border ${
            compact ? 'gap-1 text-[10px] px-1.5 py-0.5' : 'gap-1.5 text-[11px] px-2.5 py-0.5'
          } ${
            completedSubtasks === totalSubtasks
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
              : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
          }`}
          title={`${completedSubtasks} / ${totalSubtasks} (${subtasksPercent}%)`}
        >
          <CheckSquare className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          <span>
            {completedSubtasks}/{totalSubtasks}
          </span>
        </span>
      )}
    </div>
  );
};
