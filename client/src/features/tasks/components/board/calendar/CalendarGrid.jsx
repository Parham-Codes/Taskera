import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import {
  PERSIAN_WEEKDAYS,
  ENGLISH_WEEKDAYS,
} from '../../../utils/calendarDateUtils.js';
import { toPersianNum } from '../../../utils/taskHelpers.js';

export const CalendarGrid = ({
  viewType = 'month',
  gridCells = [],
  weekDays = [],
  tasksByDate = {},
  onSelectDate,
  onOpenDetail,
  onDragStart,
  onDragEnd,
  draggedTaskId,
  dragOverDateKey,
  onDragOver,
  onDragLeave,
  onDrop,
  lang = 'fa',
  t,
}) => {
  const [expandedDateKey, setExpandedDateKey] = useState(null);

  const weekdays = lang === 'fa' ? PERSIAN_WEEKDAYS : ENGLISH_WEEKDAYS;

  const STATUS_DOT_COLORS = {
    todo: 'bg-slate-400 dark:bg-slate-500',
    'in-progress': 'bg-amber-500',
    review: 'bg-purple-500',
    completed: 'bg-emerald-500',
  };

  const PRIORITY_DOT_COLORS = {
    urgent: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-blue-500',
    low: 'bg-slate-400',
  };

  /* =========================================================================
     MONTH VIEW
     ========================================================================= */
  if (viewType === 'month') {
    return (
      <div className="rounded-2xl glass-panel border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
        {/* Weekday Column Headers */}
        <div className="grid grid-cols-7 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
          {weekdays.map((w) => (
            <div
              key={w.key}
              className="py-2.5 px-2 text-center text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400"
            >
              <span className="hidden sm:inline">{w.full}</span>
              <span className="sm:hidden">{w.short}</span>
            </div>
          ))}
        </div>

        {/* Month Day Cells Grid (7 cols x 5 or 6 rows) */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-200/60 dark:divide-slate-800/60 rtl:divide-x-reverse">
          {gridCells.map((cell) => {
            const dateTasks = tasksByDate[cell.dateKey] || [];
            const isTarget = dragOverDateKey === cell.dateKey;
            const isDimmed = !cell.isCurrentMonth;
            const maxVisible = 3;
            const visibleTasks = dateTasks.slice(0, maxVisible);
            const extraCount = dateTasks.length - maxVisible;

            return (
              <div
                key={cell.dateKey}
                onDragOver={(e) => onDragOver(e, cell.dateKey)}
                onDragLeave={(e) => onDragLeave(e, cell.dateKey)}
                onDrop={(e) => onDrop(e, cell.dateKey)}
                onClick={() => onSelectDate(cell.dateKey)}
                className={`relative min-h-[96px] sm:min-h-[116px] md:min-h-[128px] p-1.5 sm:p-2 flex flex-col justify-between transition-colors cursor-pointer group ${
                  isTarget
                    ? 'ring-2 ring-inset ring-brand-500 bg-brand-500/[0.1] dark:bg-brand-500/[0.18]'
                    : isDimmed
                    ? 'bg-slate-100/30 dark:bg-slate-950/20 text-slate-400 dark:text-slate-600'
                    : 'bg-transparent hover:bg-slate-50/60 dark:hover:bg-slate-800/30'
                }`}
              >
                {/* Cell Header: Day Number + Quick Add Button */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-bold leading-none ${
                      cell.isToday
                        ? 'w-6 h-6 rounded-full bg-brand-500 text-white flex items-center justify-center shadow-xs'
                        : isDimmed
                        ? 'text-slate-400/70 dark:text-slate-600'
                        : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {toPersianNum(cell.day, lang)}
                  </span>

                  {/* Quick Add Task Button on Hover */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDate(cell.dateKey);
                    }}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded-md text-slate-400 hover:text-brand-500 hover:bg-brand-500/10 transition-all"
                    title={t('addTaskOnDate')}
                    aria-label={t('addTaskOnDate')}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Task Items inside Cell */}
                <div className="flex-1 space-y-1 overflow-hidden">
                  {visibleTasks.map((task) => {
                    const isDraggingThis = draggedTaskId === task._id;
                    const statusDot =
                      STATUS_DOT_COLORS[task.status] || 'bg-slate-400';
                    const priorityDot =
                      PRIORITY_DOT_COLORS[task.priority] || 'bg-blue-500';

                    return (
                      <div
                        key={task._id}
                        draggable
                        onDragStart={(e) => onDragStart(e, task)}
                        onDragEnd={onDragEnd}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDetail(task);
                        }}
                        className={`px-1.5 py-1 rounded-lg text-[11px] font-medium border flex items-center gap-1.5 transition-all shadow-2xs truncate ${
                          isDraggingThis
                            ? 'opacity-40 scale-95 border-brand-500/50'
                            : task.status === 'completed'
                            ? 'bg-slate-100/70 dark:bg-slate-800/40 text-slate-400 line-through border-slate-200/50 dark:border-slate-800'
                            : 'bg-white/80 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-brand-500/60 hover:text-brand-600 dark:hover:text-brand-400'
                        }`}
                        title={`${task.title} (${t(task.status)})`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot}`}
                        />
                        <span className="truncate flex-1">{task.title}</span>
                        <span
                          className={`w-1 h-1 rounded-full shrink-0 ${priorityDot}`}
                          title={t(task.priority)}
                        />
                      </div>
                    );
                  })}

                  {/* Extra tasks badge if more than maxVisible */}
                  {extraCount > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedDateKey(
                          expandedDateKey === cell.dateKey ? null : cell.dateKey
                        );
                      }}
                      className="w-full text-start px-1.5 py-0.5 text-[10px] font-bold text-brand-600 dark:text-brand-400 hover:underline"
                    >
                      +{toPersianNum(extraCount, lang)} {t('moreTasks')}
                    </button>
                  )}
                </div>

                {/* Expanded Day Popover when user clicks "+N more" */}
                {expandedDateKey === cell.dateKey && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute z-30 top-1 start-1 end-1 p-2.5 rounded-xl glass-panel border border-brand-500/30 shadow-xl bg-white/95 dark:bg-slate-900/95 space-y-1.5 animate-in fade-in zoom-in-95 duration-100"
                  >
                    <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {toPersianNum(cell.day, lang)}{' '}
                        {cell.isToday && (
                          <span className="text-[10px] font-normal text-brand-500">
                            ({t('today')})
                          </span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => setExpandedDateKey(null)}
                        className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-1 pe-1">
                      {dateTasks.map((task) => (
                        <div
                          key={task._id}
                          draggable
                          onDragStart={(e) => onDragStart(e, task)}
                          onDragEnd={onDragEnd}
                          onClick={() => {
                            setExpandedDateKey(null);
                            onOpenDetail(task);
                          }}
                          className="px-2 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:border-brand-500 flex items-center justify-between gap-1.5 cursor-pointer truncate"
                        >
                          <span className="truncate">{task.title}</span>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {t(task.priority)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* =========================================================================
     WEEK VIEW (7 columns, 1 for each day)
     ========================================================================= */
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3 sm:gap-4 items-start">
      {weekDays.map((day) => {
        const dateTasks = tasksByDate[day.dateKey] || [];
        const isTarget = dragOverDateKey === day.dateKey;
        const weekdayInfo = weekdays[day.weekdayIndex] || weekdays[0];

        return (
          <div
            key={day.dateKey}
            onDragOver={(e) => onDragOver(e, day.dateKey)}
            onDragLeave={(e) => onDragLeave(e, day.dateKey)}
            onDrop={(e) => onDrop(e, day.dateKey)}
            className={`flex flex-col rounded-2xl transition-all duration-200 p-2.5 min-h-[460px] max-h-[75vh] ${
              isTarget
                ? 'ring-2 ring-brand-500/80 bg-brand-500/[0.09] dark:bg-brand-500/[0.14] border-brand-500/50 shadow-xl'
                : 'glass-panel border border-slate-200/80 dark:border-slate-800 shadow-2xs'
            }`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between px-1.5 py-1.5 mb-2 shrink-0 border-b border-slate-200/60 dark:border-slate-800/60">
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-xs font-bold leading-none ${
                    day.isToday
                      ? 'w-6 h-6 rounded-full bg-brand-500 text-white flex items-center justify-center shadow-xs'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {toPersianNum(day.day, lang)}
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {weekdayInfo.full}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-[11px] font-mono font-semibold px-1.5 py-0.2 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                  {toPersianNum(dateTasks.length, lang)}
                </span>
                <button
                  type="button"
                  onClick={() => onSelectDate(day.dateKey)}
                  className="p-1 rounded-md text-slate-400 hover:text-brand-500 hover:bg-brand-500/10 transition-colors"
                  title={t('addTaskOnDate')}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Tasks Container */}
            <div className="flex-1 overflow-y-auto space-y-2 pe-0.5">
              {dateTasks.length === 0 ? (
                <div
                  onClick={() => onSelectDate(day.dateKey)}
                  className="h-32 flex flex-col items-center justify-center text-center p-3 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer hover:border-brand-500/40 text-slate-400 hover:text-brand-500 transition-colors"
                >
                  <Plus className="w-4 h-4 mb-1 opacity-70" />
                  <span className="text-[11px]">{t('noTasksOnDay')}</span>
                </div>
              ) : (
                dateTasks.map((task) => {
                  const isDraggingThis = draggedTaskId === task._id;
                  const statusDot =
                    STATUS_DOT_COLORS[task.status] || 'bg-slate-400';
                  const priorityDot =
                    PRIORITY_DOT_COLORS[task.priority] || 'bg-blue-500';

                  return (
                    <div
                      key={task._id}
                      draggable
                      onDragStart={(e) => onDragStart(e, task)}
                      onDragEnd={onDragEnd}
                      onClick={() => onOpenDetail(task)}
                      className={`p-2.5 rounded-xl border glass-panel transition-all duration-150 cursor-grab active:cursor-grabbing text-start group ${
                        isDraggingThis
                          ? 'opacity-40 scale-95 border-brand-500'
                          : 'border-slate-200/90 dark:border-slate-800 hover:border-brand-500/60 hover:shadow-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${statusDot}`}
                          />
                          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 capitalize">
                            {t(task.status) || task.status}
                          </span>
                        </div>
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${priorityDot}`}
                          title={t(task.priority)}
                        />
                      </div>

                      <h4
                        className={`text-xs font-semibold text-slate-800 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-2 ${
                          task.status === 'completed'
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : ''
                        }`}
                      >
                        {task.title}
                      </h4>

                      {task.categoryId && (
                        <div className="mt-1.5 flex items-center gap-1">
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{
                              backgroundColor:
                                task.categoryId?.color || '#3b82f6',
                            }}
                          />
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {task.categoryId?.name}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
