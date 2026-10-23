import React from 'react';
import {
  Clock,
  Calendar,
  ExternalLink,
  MessageSquare,
  Edit2,
  Trash2,
} from 'lucide-react';

export const TaskListView = ({
  filteredTasks = [],
  statusColumns = [],
  priorityBadges = {},
  onStatusChange,
  onOpenDetail,
  onOpenComments,
  onEdit,
  onDelete,
  formatDate,
  t,
}) => {
  return (
    <div className="glass-panel rounded-3xl border border-slate-200/90 dark:border-slate-800 divide-y divide-slate-200/60 dark:divide-slate-800 overflow-hidden shadow-xs">
      {filteredTasks.length === 0 ? (
        <div className="p-12 text-center text-slate-400 text-sm">
          {t('noTasksInWorkspace')}
        </div>
      ) : (
        filteredTasks.map((task) => (
          <div
            key={task._id}
            onClick={() => onOpenDetail(task)}
            className="p-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 flex items-center justify-between gap-4 transition-colors cursor-pointer"
          >
            <div
              className="flex items-center gap-3 min-w-0"
              onClick={(e) => e.stopPropagation()}
            >
              <select
                value={task.status}
                onChange={(e) => onStatusChange(task._id, e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-xl glass-input cursor-pointer focus:outline-none font-medium"
              >
                {statusColumns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>

              <div
                className="min-w-0"
                onClick={() => onOpenDetail(task)}
              >
                <p
                  className={`text-sm font-bold truncate ${
                    task.status === 'completed'
                      ? 'line-through text-slate-400 dark:text-slate-500'
                      : 'text-slate-800 dark:text-slate-100'
                  }`}
                >
                  {task.title}
                </p>
                {task.description && (
                  <p className="text-xs text-slate-400 truncate max-w-lg mt-0.5">
                    {task.description}
                  </p>
                )}
              </div>
            </div>

            <div
              className="flex items-center gap-3 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <span
                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-lg border ${
                  priorityBadges[task.priority]?.style || ''
                }`}
              >
                {priorityBadges[task.priority]?.label || task.priority}
              </span>

              {task.totalTimeSpent > 0 && (
                <span className="text-xs font-semibold text-brand-600 dark:text-brand-400 flex items-center gap-1 bg-brand-500/10 px-2 py-0.5 rounded-lg">
                  <Clock className="w-3.5 h-3.5" />
                  {Math.floor(task.totalTimeSpent / 60)}m
                </span>
              )}

              {task.dueDate && (
                <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-brand-500 dark:text-brand-400" />
                  <span>{formatDate(task.dueDate)}</span>
                </span>
              )}

              {task.assignedTo && (
                <div
                  className="w-6 h-6 rounded-lg bg-brand-500/20 text-brand-600 dark:text-brand-400 text-[10px] font-bold flex items-center justify-center"
                  title={task.assignedTo.name}
                >
                  {task.assignedTo.name[0].toUpperCase()}
                </div>
              )}

              <button
                onClick={() => onOpenDetail(task)}
                className="p-1.5 text-slate-400 hover:text-brand-500 transition-colors"
                title={t('openDetails')}
              >
                <ExternalLink className="w-4 h-4" />
              </button>

              <button
                onClick={() => onOpenComments(task)}
                className="p-1.5 text-slate-400 hover:text-brand-500 transition-colors"
                title={t('commentsTitle')}
              >
                <MessageSquare className="w-4 h-4" />
              </button>

              <button
                onClick={() => onEdit(task)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                title={t('edit')}
              >
                <Edit2 className="w-4 h-4" />
              </button>

              <button
                onClick={() => onDelete(task._id)}
                className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                title={t('delete')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};
