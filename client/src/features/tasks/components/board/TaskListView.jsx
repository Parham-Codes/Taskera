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
    <div className="glass-panel rounded-2xl border border-slate-200/90 dark:border-slate-800 divide-y divide-slate-200/60 dark:divide-slate-800 overflow-hidden shadow-xs">
      {filteredTasks.length === 0 ? (
        <div className="p-12 text-center text-slate-400 text-sm">
          {t('noTasksInWorkspace')}
        </div>
      ) : (
        filteredTasks.map((task) => (
          <div
            key={task._id}
            onClick={() => onOpenDetail(task)}
            className="p-3.5 sm:p-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 flex flex-col lg:flex-row lg:items-center justify-between gap-3 transition-colors cursor-pointer"
          >
            {/* Top part: Status selector & Title */}
            <div
              className="flex items-start sm:items-center gap-3 min-w-0 flex-1"
              onClick={(e) => e.stopPropagation()}
            >
              <select
                value={task.status}
                onChange={(e) => onStatusChange(task._id, e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-lg glass-input cursor-pointer focus:outline-none font-medium shrink-0 mt-0.5 sm:mt-0"
              >
                {statusColumns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>

              <div
                className="min-w-0 flex-1"
                onClick={() => onOpenDetail(task)}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <p
                    className={`text-sm font-bold truncate ${
                      task.status === 'completed'
                        ? 'line-through text-slate-400 dark:text-slate-500'
                        : 'text-slate-800 dark:text-slate-100'
                    }`}
                  >
                    {task.title}
                  </p>

                  {task.categoryId && (
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0"
                      style={{
                        borderColor: `${task.categoryId?.color || '#4F5AE4'}40`,
                        backgroundColor: `${task.categoryId?.color || '#4F5AE4'}15`,
                        color: task.categoryId?.color || '#4F5AE4',
                      }}
                    >
                      {task.categoryId?.name || 'Category'}
                    </span>
                  )}
                </div>

                {task.description && (
                  <p className="text-xs text-slate-400 truncate max-w-xl mt-0.5">
                    {task.description}
                  </p>
                )}
              </div>
            </div>

            {/* Bottom (mobile/tablet) / Right (desktop): Priority, Meta, Assignees & Actions */}
            <div
              className="flex items-center justify-between lg:justify-end gap-2.5 sm:gap-3 shrink-0 pt-2 lg:pt-0 border-t border-slate-100 dark:border-slate-800/60 lg:border-t-0 flex-wrap sm:flex-nowrap"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                <span
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border ${
                    priorityBadges[task.priority]?.style || ''
                  }`}
                >
                  {priorityBadges[task.priority]?.label || task.priority}
                </span>

                {task.totalTimeSpent > 0 && (
                  <span className="text-xs font-semibold text-brand-600 dark:text-brand-400 flex items-center gap-1 bg-brand-500/10 px-2 py-0.5 rounded-md">
                    <Clock className="w-3.5 h-3.5" />
                    {Math.floor(task.totalTimeSpent / 60)}m
                  </span>
                )}

                {task.dueDate && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-brand-500 dark:text-brand-400" />
                    <span>{formatDate(task.dueDate)}</span>
                  </span>
                )}

                {(() => {
                  const assignees = Array.isArray(task.assignedTo)
                    ? task.assignedTo
                    : task.assignedTo ? [task.assignedTo] : [];
                  if (assignees.length === 0) return null;
                  return (
                    <div
                      className="flex items-center -space-x-1.5 rtl:space-x-reverse"
                      title={assignees.map((a) => a?.name || 'Member').join(', ')}
                    >
                      {assignees.slice(0, 3).map((a, i) => (
                        <div
                          key={a?._id || i}
                          className="w-6 h-6 rounded-md bg-brand-500/20 text-brand-600 dark:text-brand-400 text-[10px] font-bold flex items-center justify-center ring-1 ring-white dark:ring-slate-900"
                        >
                          {(a?.name?.[0] || 'U').toUpperCase()}
                        </div>
                      ))}
                      {assignees.length > 3 && (
                        <div className="w-6 h-6 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[9px] font-bold flex items-center justify-center ring-1 ring-white dark:ring-slate-900">
                          +{assignees.length - 3}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 ms-auto lg:ms-0">
                <button
                  onClick={() => onOpenDetail(task)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title={t('openDetails')}
                  aria-label={t('openDetails')}
                >
                  <ExternalLink className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onOpenComments(task)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title={t('commentsTitle')}
                  aria-label={t('commentsTitle')}
                >
                  <MessageSquare className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onEdit(task)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title={t('edit')}
                  aria-label={t('edit')}
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onDelete(task._id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                  title={t('delete')}
                  aria-label={t('delete')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};
