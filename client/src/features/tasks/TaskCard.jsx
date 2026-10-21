import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar,
  MessageSquare,
  Trash2,
  Edit2,
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronDown,
  Check,
  GripVertical,
  CheckSquare,
} from 'lucide-react';
import { Badge } from '../../components/ui/index.js';

export const TaskCard = ({
  task,
  t,
  lang,
  formatDate,
  statusColumns,
  priorityBadges,
  onOpenDetail,
  onEdit,
  onDelete,
  onStatusChange,
  onOpenComments,
  fullWidth = false,
  draggable = true,
  onDragStart,
  onDragEnd,
  isDragging = false,
  onCategoryClick,
}) => {
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const statusMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target)) {
        setStatusMenuOpen(false);
      }
    };
    if (statusMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [statusMenuOpen]);

  const priorityInfo = priorityBadges[task.priority] || priorityBadges.medium;

  const currentColumn =
    statusColumns.find((c) => c.id === task.status) || statusColumns[0];

  const isOverdue =
    task.dueDate &&
    task.status !== 'completed' &&
    new Date(task.dueDate).setHours(23, 59, 59, 999) < Date.now();

  const hasRunningTimer = task.timeLogs?.some((l) => !l.endTime);

  const totalSubtasks = task.subtasks?.length || 0;
  const completedSubtasks = task.subtasks?.filter((s) => s.completed)?.length || 0;
  const subtasksPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  const formatShortDuration = (totalSec) => {
    if (!totalSec || totalSec <= 0) return null;
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
    if (hrs > 0) return `${hrs}h`;
    return `${mins}m`;
  };

  const priorityBorderColors = {
    urgent: 'border-s-red-500',
    high: 'border-s-orange-500',
    medium: 'border-s-blue-500',
    low: 'border-s-slate-400',
  };

  /* =========================================================================
     FULL WIDTH MODE (For Focused Views in Sidebar)
     ========================================================================= */
  if (fullWidth) {
    return (
      <div
        onClick={() => onOpenDetail?.(task)}
        className={`group w-full glass-panel rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 border-s-4 ${
          priorityBorderColors[task.priority] || 'border-s-blue-500'
        } hover:border-brand-500/60 hover:shadow-md transition-all duration-150 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4`}
      >
        {/* Left Side: Priority, Status Pill Menu, Title & Description */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={priorityInfo.style} size="xs">
              <span
                className={`w-1.5 h-1.5 rounded-full me-1 ${
                  task.priority === 'urgent'
                    ? 'bg-red-500 shadow-sm shadow-red-500/50 animate-pulse'
                    : task.priority === 'high'
                    ? 'bg-orange-500'
                    : task.priority === 'medium'
                    ? 'bg-blue-500'
                    : 'bg-slate-400'
                }`}
              />
              {priorityInfo.label}
            </Badge>

            {/* Interactive Status Pill Menu (No ugly select!) */}
            <div className="relative" ref={statusMenuRef} onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setStatusMenuOpen(!statusMenuOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl glass-input text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:border-brand-500/40 transition-all shadow-2xs"
              >
                <span className={`w-2 h-2 rounded-full ${currentColumn.indicatorColor || 'bg-slate-400'}`} />
                <span>{currentColumn.label}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {statusMenuOpen && (
                <div className="absolute top-full start-0 mt-1.5 w-40 glass-panel rounded-2xl shadow-xl border border-slate-200/90 dark:border-slate-800 p-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
                  {statusColumns.map((col) => {
                    const isSelected = col.id === task.status;
                    return (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => {
                          onStatusChange(task._id, col.id);
                          setStatusMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs text-start transition-colors ${
                          isSelected
                            ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 font-bold'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${col.indicatorColor || 'bg-slate-400'}`} />
                          <span>{col.label}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-brand-500" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Time Tracking Pill */}
            {(task.totalTimeSpent > 0 || hasRunningTimer) && (
              <span
                className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  hasRunningTimer
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-500/20'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {hasRunningTimer ? (
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      {lang === 'fa' ? 'در حال ثبت زمان' : 'Recording'}
                    </span>
                  ) : (
                    formatShortDuration(task.totalTimeSpent)
                  )}
                </span>
              </span>
            )}

            {/* Category Pill */}
            {task.categoryId && (
              <span
                onClick={(e) => {
                  if (onCategoryClick) {
                    e.stopPropagation();
                    onCategoryClick(task.categoryId?._id || task.categoryId);
                  }
                }}
                className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${
                  onCategoryClick ? 'cursor-pointer hover:opacity-80 active:scale-95 transition-transform' : ''
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
                <span>{task.categoryId.name}</span>
              </span>
            )}

            {/* Subtasks Progress Pill */}
            {totalSubtasks > 0 && (
              <span
                className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  completedSubtasks === totalSubtasks
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
                }`}
                title={`${completedSubtasks} / ${totalSubtasks} (${subtasksPercent}%)`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>
                  {completedSubtasks}/{totalSubtasks}
                </span>
              </span>
            )}
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

          {task.assignedTo && (
            <div
              className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300"
              title={`Assigned to ${task.assignedTo.name}`}
            >
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white text-xs font-bold flex items-center justify-center shadow-xs">
                {task.assignedTo.name[0].toUpperCase()}
              </div>
              <span className="hidden sm:inline text-xs font-medium">
                {task.assignedTo.name}
              </span>
            </div>
          )}

          <button
            onClick={() => onOpenComments(task)}
            className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-brand-500 transition-colors p-1.5 rounded-xl hover:bg-brand-50 dark:hover:bg-brand-950/30"
            title={t('commentsTitle')}
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          <button
            onClick={() => onEdit(task)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={t('edit')}
          >
            <Edit2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => onDelete(task._id)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            title={t('delete')}
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => onOpenDetail?.(task)}
            className="p-1.5 rounded-xl glass-input hover:border-brand-500/40 text-brand-600 dark:text-brand-400 hover:bg-brand-50/50 dark:hover:bg-brand-950/30 transition-colors"
            title={t('openDetails')}
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  /* =========================================================================
     STANDARD KANBAN CARD MODE (Draggable across columns)
     ========================================================================= */
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
      className={`group glass-panel rounded-2xl p-3.5 border border-slate-200/90 dark:border-slate-800 border-s-4 ${
        priorityBorderColors[task.priority] || 'border-s-blue-500'
      } hover:border-brand-500/60 hover:shadow-lg dark:hover:border-brand-500/50 transition-all duration-150 space-y-3 cursor-grab active:cursor-grabbing relative select-none ${
        isDragging ? 'opacity-40 scale-95 ring-2 ring-brand-500/60 shadow-2xl' : ''
      }`}
    >
      {/* Top Row: Priority Pill, Timer Badge, Drag Handle & Hover Actions */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge className={priorityInfo.style} size="xs">
            <span
              className={`w-1.5 h-1.5 rounded-full me-1 ${
                task.priority === 'urgent'
                  ? 'bg-red-500 shadow-sm shadow-red-500/50 animate-pulse'
                  : task.priority === 'high'
                  ? 'bg-orange-500'
                  : task.priority === 'medium'
                  ? 'bg-blue-500'
                  : 'bg-slate-400'
              }`}
            />
            {priorityInfo.label}
          </Badge>

          {/* Time Spent Pill */}
          {(task.totalTimeSpent > 0 || hasRunningTimer) && (
            <span
              className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                hasRunningTimer
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>
                {hasRunningTimer ? (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    {lang === 'fa' ? 'در حال ثبت' : 'Active'}
                  </span>
                ) : (
                  formatShortDuration(task.totalTimeSpent)
                )}
              </span>
            </span>
          )}

          {/* Category Badge */}
            {task.categoryId && (
              <span
                onClick={(e) => {
                  if (onCategoryClick) {
                    e.stopPropagation();
                    onCategoryClick(task.categoryId?._id || task.categoryId);
                  }
                }}
                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs ${
                  onCategoryClick ? 'cursor-pointer hover:opacity-80 active:scale-95 transition-transform' : ''
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
                <span className="max-w-[70px] truncate">{task.categoryId.name}</span>
              </span>
            )}

            {/* Subtasks Progress Pill */}
            {totalSubtasks > 0 && (
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                  completedSubtasks === totalSubtasks
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
                }`}
                title={`${completedSubtasks} / ${totalSubtasks} (${subtasksPercent}%)`}
              >
                <CheckSquare className="w-3 h-3" />
                <span>
                  {completedSubtasks}/{totalSubtasks}
                </span>
              </span>
            )}
          </div>

        {/* Hover Quick Actions */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-0.5 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <button
            onClick={() => onEdit(task)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            title={t('edit')}
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(task._id)}
            className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
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
            onClick={(e) => {
              e.stopPropagation();
              onOpenComments(task);
            }}
            className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-brand-500 transition-colors p-1 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-950/30"
            title={t('commentsTitle')}
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Assignee Avatar */}
        {task.assignedTo && (
          <div
            className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-600 dark:text-slate-400"
            title={`Assigned to ${task.assignedTo.name}`}
          >
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
              {task.assignedTo.name[0].toUpperCase()}
            </div>
            <span className="max-w-[70px] truncate hidden sm:inline">
              {task.assignedTo.name}
            </span>
          </div>
        )}
      </div>

      {/* Bottom Row: Sleek Mini Status Pill & Open Details Button (Zero select!) */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="pt-1 flex items-center justify-between gap-2"
      >
        {/* Interactive Status Pill Menu */}
        <div className="relative" ref={statusMenuRef}>
          <button
            type="button"
            onClick={() => setStatusMenuOpen(!statusMenuOpen)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-xl glass-input text-[10px] sm:text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:border-brand-500/40 transition-all shadow-2xs"
          >
            <span className={`w-2 h-2 rounded-full ${currentColumn.indicatorColor || 'bg-slate-400'}`} />
            <span>{currentColumn.label}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {statusMenuOpen && (
            <div className="absolute bottom-full start-0 mb-1.5 w-36 glass-panel rounded-2xl shadow-xl border border-slate-200/90 dark:border-slate-800 p-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
              {statusColumns.map((col) => {
                const isSelected = col.id === task.status;
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => {
                      onStatusChange(task._id, col.id);
                      setStatusMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-xl text-[11px] text-start transition-colors ${
                      isSelected
                        ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 font-bold'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${col.indicatorColor || 'bg-slate-400'}`} />
                      <span>{col.label}</span>
                    </div>
                    {isSelected && <Check className="w-3 h-3 text-brand-500" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button
          onClick={() => onOpenDetail?.(task)}
          className="p-1.5 rounded-xl glass-input hover:border-brand-500/40 text-brand-600 dark:text-brand-400 hover:bg-brand-50/50 dark:hover:bg-brand-950/30 transition-colors shrink-0"
          title={t('openDetails')}
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
