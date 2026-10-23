import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Calendar as CalendarIcon, Plus } from 'lucide-react';
import { CalendarToolbar } from './calendar/CalendarToolbar.jsx';
import { CalendarGrid } from './calendar/CalendarGrid.jsx';
import { CalendarUnscheduledPanel } from './calendar/CalendarUnscheduledPanel.jsx';
import {
  getInitialCalendarState,
  getPreviousPeriod,
  getNextPeriod,
  getMonthCalendarGrid,
  getWeekCalendarGrid,
  getCalendarTitle,
  extractTaskDateKey,
} from '../../utils/calendarDateUtils.js';

export const TaskCalendarView = ({
  filteredTasks = [],
  onOpenDetail,
  onSelectDate,
  onDueDateChange,
  onNewTask,
  lang = 'fa',
  t,
}) => {
  const [viewType, setViewType] = useState('month'); // 'month' | 'week'
  const [calendarState, setCalendarState] = useState(() =>
    getInitialCalendarState(lang)
  );
  const [prevLang, setPrevLang] = useState(lang);
  const [showUnscheduled, setShowUnscheduled] = useState(false);

  // Drag and drop state
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverDateKey, setDragOverDateKey] = useState(null);
  const [dragOverUnscheduled, setDragOverUnscheduled] = useState(false);

  // Update calendar state when language switches between fa (Jalali) and en (Gregorian)
  if (prevLang !== lang) {
    setPrevLang(lang);
    setCalendarState(getInitialCalendarState(lang));
  }

  // Group filtered tasks by YYYY-MM-DD
  const { tasksByDate, unscheduledTasks, scheduledCount } = useMemo(() => {
    const byDate = {};
    const unscheduled = [];
    let scheduled = 0;

    filteredTasks.forEach((task) => {
      const dateKey = extractTaskDateKey(task.dueDate);
      if (dateKey) {
        if (!byDate[dateKey]) {
          byDate[dateKey] = [];
        }
        byDate[dateKey].push(task);
        scheduled++;
      } else {
        unscheduled.push(task);
      }
    });

    return {
      tasksByDate: byDate,
      unscheduledTasks: unscheduled,
      scheduledCount: scheduled,
    };
  }, [filteredTasks]);

  // Generate Month Grid Cells
  const gridCells = useMemo(() => {
    if (viewType !== 'month') return [];
    return getMonthCalendarGrid({
      year: calendarState.year,
      month: calendarState.month,
      lang,
    });
  }, [viewType, calendarState.year, calendarState.month, lang]);

  // Generate Week Grid Days
  const weekDays = useMemo(() => {
    if (viewType !== 'week') return [];
    return getWeekCalendarGrid({
      activeDate: calendarState.activeDate,
      lang,
    });
  }, [viewType, calendarState.activeDate, lang]);

  // Title for toolbar
  const calendarTitle = useMemo(() => {
    return getCalendarTitle({
      year: calendarState.year,
      month: calendarState.month,
      activeDate: calendarState.activeDate,
      viewType,
      lang,
    });
  }, [calendarState, viewType, lang]);

  // Navigation handlers
  const handlePrev = useCallback(() => {
    setCalendarState((prev) =>
      getPreviousPeriod({
        year: prev.year,
        month: prev.month,
        activeDate: prev.activeDate,
        viewType,
        lang,
      })
    );
  }, [viewType, lang]);

  const handleNext = useCallback(() => {
    setCalendarState((prev) =>
      getNextPeriod({
        year: prev.year,
        month: prev.month,
        activeDate: prev.activeDate,
        viewType,
        lang,
      })
    );
  }, [viewType, lang]);

  const handleToday = useCallback(() => {
    setCalendarState(getInitialCalendarState(lang));
  }, [lang]);

  // Drag and drop handlers
  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.setData('text/plain', task._id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverDateKey(null);
    setDragOverUnscheduled(false);
  };

  const handleDragOverDate = (e, dateKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverDateKey !== dateKey) {
      setDragOverDateKey(dateKey);
    }
  };

  const handleDragLeaveDate = (e, dateKey) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    if (dragOverDateKey === dateKey) {
      setDragOverDateKey(null);
    }
  };

  const handleDropOnDate = async (e, dateKey) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTask?._id;
    setDragOverDateKey(null);
    setDraggedTask(null);

    if (!taskId || !dateKey) return;

    // Check if target date is already the same as task's current date
    const task = filteredTasks.find((t) => t._id === taskId) || draggedTask;
    const currentDateKey = extractTaskDateKey(task?.dueDate);
    if (currentDateKey === dateKey) return; // Prevent duplicate requests

    // Convert dateKey (YYYY-MM-DD) to ISO string at UTC midnight
    const newDueDateIso = new Date(dateKey).toISOString();
    await onDueDateChange(taskId, newDueDateIso);
  };

  const handleDragOverUnscheduled = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!dragOverUnscheduled) setDragOverUnscheduled(true);
  };

  const handleDragLeaveUnscheduled = (e) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setDragOverUnscheduled(false);
  };

  const handleDropOnUnscheduled = async (e) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTask?._id;
    setDragOverUnscheduled(false);
    setDraggedTask(null);

    if (!taskId) return;

    const task = filteredTasks.find((t) => t._id === taskId) || draggedTask;
    if (!task?.dueDate) return; // Already unscheduled

    await onDueDateChange(taskId, null);
  };

  return (
    <div className="space-y-4">
      {/* 1. Calendar Navigation & Action Toolbar */}
      <CalendarToolbar
        title={calendarTitle}
        viewType={viewType}
        onViewTypeChange={setViewType}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        totalScheduledTasks={scheduledCount}
        unscheduledTasksCount={unscheduledTasks.length}
        showUnscheduled={showUnscheduled}
        onToggleUnscheduled={() => setShowUnscheduled(!showUnscheduled)}
        t={t}
      />

      {/* 2. Collapsible Without Due Date Panel */}
      <CalendarUnscheduledPanel
        unscheduledTasks={unscheduledTasks}
        isOpen={showUnscheduled}
        onClose={() => setShowUnscheduled(false)}
        onOpenDetail={onOpenDetail}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        dragOverUnscheduled={dragOverUnscheduled}
        onDragOver={handleDragOverUnscheduled}
        onDragLeave={handleDragLeaveUnscheduled}
        onDrop={handleDropOnUnscheduled}
        t={t}
        lang={lang}
      />

      {/* 3. Main Calendar Grid (Month or Week) */}
      {filteredTasks.length === 0 ? (
        <div className="p-8 sm:p-12 text-center rounded-2xl glass-panel border border-slate-200/80 dark:border-slate-800 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center mx-auto">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">
            {t('noTasksInCalendar')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {t('noTasksInWorkspace')}
          </p>
          <button
            type="button"
            onClick={onNewTask}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{t('newTask')}</span>
          </button>
        </div>
      ) : (
        <CalendarGrid
          viewType={viewType}
          gridCells={gridCells}
          weekDays={weekDays}
          tasksByDate={tasksByDate}
          onSelectDate={onSelectDate}
          onOpenDetail={onOpenDetail}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          draggedTaskId={draggedTask?._id}
          dragOverDateKey={dragOverDateKey}
          onDragOver={handleDragOverDate}
          onDragLeave={handleDragLeaveDate}
          onDrop={handleDropOnDate}
          lang={lang}
          t={t}
        />
      )}
    </div>
  );
};
