import React from 'react';
import {
  Calendar,
  MessageSquare,
  Trash2,
  Edit2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { TaskStatusMenu } from './TaskStatusMenu.jsx';
import { TaskBadges } from './TaskBadges.jsx';

export const TaskCardFullWidth = ({
  task,
  borderClass,
  priorityInfo,
  isOverdue,
  hasRunningTimer,
  statusColumns,
  formatDate,
  onOpenDetail,
  onEdit,
  onDelete,
  onStatusChange,
  onOpenComments,
  onCategoryClick,
  lang,
  t,
}) => {
  const assignees = Array.isArray(task.assignedTo)
    ? task.assignedTo
    : task.assignedTo ? [task.assignedTo] : [];

  return (
    <div
      onClick={() => onOpenDetail?.(task)}
      className={`group w-full glass-panel rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 border-s-4 ${borderClass} hover:border-brand-500/60 hover:shadow-md transition-all duration-150 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4`}
    >
      {/* Left Side: Priority, Status Pill Menu, Badges, Title & Description */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <TaskBadges
            task={task}
            priorityInfo={priorityInfo}
            lang={lang}
            hasRunningTimer={hasRunningTimer}
            onCategoryClick={onCategoryClick}
            compact={false}
          />

          {/* Interactive Status Pill Menu */}
          <TaskStatusMenu
            currentStatus={task.status}
            statusColumns={statusColumns}
            onStatusChange={(newStatus) => onStatusChange(task._id, newStatus)}
            direction="down"
            size="md"
          />
        </div>

        <div>
          <h4
            className={`font-extrabold text-sm sm:text-base leading-snug tracking-tight ${
              task.status === 'completed'
                ? 'line-through text-slate-400 dark:text-slate-500'
                : 'text-slate-900 dark:text-slate-100'
            }`}
          >
            {task.title}
          </h4>
          {task.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed font-normal">
              {task.description}
            </p>
          )}
        </div>
      </div>

      {/* Right Side: Due Date, Assignee, Comments, Actions */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-200/60 dark:border-slate-800 shrink-0"
      >
        {task.dueDate && (
          <span
            className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-xl ${
              isOverdue
                ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            {isOverdue ? (
              <AlertCircle className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
            ) : (
              <Calendar className="w-3.5 h-3.5 text-brand-500 dark:text-brand-400" />
            )}
            <span>{formatDate(task.dueDate)}</span>
          </span>
        )}

        {assignees.length > 0 && (
          <div
            className="flex items-center -space-x-2 rtl:space-x-reverse text-xs font-semibold text-slate-600 dark:text-slate-300"
            title={assignees.map((a) => a?.name || 'Member').join(', ')}
          >
            {assignees.slice(0, 3).map((a, i) => (
              <div
                key={a?._id || i}
                className="w-7 h-7 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white text-xs font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-900 shadow-xs shrink-0"
              >
                {(a?.name?.[0] || 'U').toUpperCase()}
              </div>
            ))}
            {assignees.length > 3 && (
              <div className="w-7 h-7 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-900 shadow-xs shrink-0">
                +{assignees.length - 3}
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => onOpenComments(task)}
          className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-brand-500 transition-colors p-1.5 rounded-xl hover:bg-brand-50 dark:hover:bg-brand-950/30 cursor-pointer"
          title={t('commentsTitle')}
        >
          <MessageSquare className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => onEdit(task)}
          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title={t('edit')}
        >
          <Edit2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => onDelete(task._id)}
          className="p-1.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
          title={t('delete')}
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => onOpenDetail?.(task)}
          className="p-1.5 rounded-xl glass-input hover:border-brand-500/40 text-brand-600 dark:text-brand-400 hover:bg-brand-50/50 dark:hover:bg-brand-950/30 transition-colors cursor-pointer"
          title={t('openDetails')}
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

