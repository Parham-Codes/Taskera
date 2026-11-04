import React from 'react';
import {
  Calendar,
  MessageSquare,
  Trash2,
  Edit2,
  AlertCircle,
  ExternalLink,
  MoreVertical,
} from 'lucide-react';
import { TaskStatusMenu } from './TaskStatusMenu.jsx';
import { TaskBadges } from './TaskBadges.jsx';

export const TaskCardCompact = ({
  task,
  borderClass,
  priorityInfo,
  isOverdue,
  hasRunningTimer,
  statusColumns,
  formatDate,
  draggable = true,
  onDragStart,
  onDragEnd,
  isDragging = false,
  onOpenDetail,
  onEdit,
  onDelete,
  onStatusChange,
  onOpenComments,
  onCategoryClick,
  onTaskContextMenu,
  lang,
  t,
}) => {
  const totalSubtasks = task.subtasks?.length || 0;
  const completedSubtasks =
    task.subtasks?.filter((s) => s.completed)?.length || 0;
  const subtasksPercent =
    totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  const assignees = Array.isArray(task.assignedTo)
    ? task.assignedTo
    : task.assignedTo ? [task.assignedTo] : [];

  return (
    <div
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', task._id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart?.(task);
      }}
      onDragEnd={() => onDragEnd?.()}
      onClick={() => onOpenDetail?.(task)}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onTaskContextMenu?.(e, task);
      }}
      onKeyDown={(e) => {
        if ((e.shiftKey && e.key === 'F10') || e.key === 'ContextMenu') {
          e.preventDefault();
          e.stopPropagation();
          onTaskContextMenu?.(e, task);
        }
      }}
      className={`group glass-panel rounded-2xl p-3.5 border border-slate-200/90 dark:border-slate-800 border-s-4 ${borderClass} hover:border-brand-500/60 hover:shadow-lg dark:hover:border-brand-500/50 transition-all duration-150 space-y-3 cursor-grab active:cursor-grabbing relative select-none ${
        isDragging ? 'opacity-40 scale-95 ring-2 ring-brand-500/60 shadow-2xl' : ''
      }`}
    >
      {/* Top Row: Badges & Hover Quick Actions */}
      <div className="flex items-center justify-between gap-1.5">
        <TaskBadges
          task={task}
          priorityInfo={priorityInfo}
          lang={lang}
          hasRunningTimer={hasRunningTimer}
          onCategoryClick={onCategoryClick}
          compact={true}
        />

        {/* Hover Quick Actions */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-0.5 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <button
            type="button"
            onClick={() => onEdit(task)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            title={t('edit')}
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(task._id)}
            className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all cursor-pointer"
            title={t('delete')}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Task Title & Description */}
      <div>
        <h4
          className={`font-extrabold text-xs sm:text-sm leading-snug tracking-tight ${
            task.status === 'completed'
              ? 'line-through text-slate-400 dark:text-slate-500'
              : 'text-slate-900 dark:text-slate-100'
          }`}
        >
          {task.title}
        </h4>
        {task.description && (
          <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed font-normal">
            {task.description}
          </p>
        )}

        {/* Subtask Mini Progress Bar */}
        {totalSubtasks > 0 && (
          <div className="pt-1.5">
            <div className="w-full bg-slate-200/80 dark:bg-slate-800 rounded-full h-1 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  completedSubtasks === totalSubtasks ? 'bg-emerald-500' : 'bg-brand-500'
                }`}
                style={{ width: `${subtasksPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Due Date & Assignee Footer */}
      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          {task.dueDate && (
            <span
              className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-lg ${
                isOverdue
                  ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400'
              }`}
            >
              {isOverdue ? (
                <AlertCircle className="w-3 h-3 text-red-500 dark:text-red-400" />
              ) : (
                <Calendar className="w-3 h-3 text-brand-500 dark:text-brand-400" />
              )}
              <span>{formatDate(task.dueDate)}</span>
            </span>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenComments(task);
            }}
            className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-brand-500 transition-colors p-1 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-950/30 cursor-pointer"
            title={t('commentsTitle')}
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Assignees Avatars */}
        {assignees.length > 0 && (
          <div
            className="flex items-center -space-x-1.5 rtl:space-x-reverse"
            title={assignees.map((a) => a?.name || 'Member').join(', ')}
          >
            {assignees.slice(0, 3).map((a, i) => (
              <div
                key={a?._id || i}
                className="w-6 h-6 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-600 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-900 shadow-xs shrink-0"
              >
                {(a?.name?.[0] || 'U').toUpperCase()}
              </div>
            ))}
            {assignees.length > 3 && (
              <div className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[9px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-900 shadow-xs shrink-0">
                +{assignees.length - 3}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Row: Mini Status Pill & Open Details Button */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="pt-1 flex items-center justify-between gap-2"
      >
        <TaskStatusMenu
          currentStatus={task.status}
          statusColumns={statusColumns}
          onStatusChange={(newStatus) => onStatusChange(task._id, newStatus)}
          direction="up"
          size="sm"
        />

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTaskContextMenu?.(e, task);
            }}
            className="p-1.5 rounded-xl glass-input hover:border-brand-500/40 text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
            title={t('moreActions')}
            aria-label={t('moreActions')}
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onOpenDetail?.(task)}
            className="p-1.5 rounded-xl glass-input hover:border-brand-500/40 text-brand-600 dark:text-brand-400 hover:bg-brand-50/50 dark:hover:bg-brand-950/30 transition-colors shrink-0 cursor-pointer"
            title={t('openDetails')}
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

