import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../../api/client.js';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { useNotifications } from '../../context/NotificationContext.jsx';
import { useCategories } from '../../context/CategoryContext.jsx';
import { TaskStats } from './TaskStats.jsx';
import { useTaskBoardFilters } from './hooks/useTaskBoardFilters.js';
import { useTaskRealtimeSync } from './hooks/useTaskRealtimeSync.js';

import { TaskBoardNotificationView } from './components/board/TaskBoardNotificationView.jsx';
import { TaskBoardFilterHeader } from './components/board/TaskBoardFilterHeader.jsx';
import { TaskCategoryFilterBar } from './components/board/TaskCategoryFilterBar.jsx';
import { TaskStatusFilterBar } from './components/board/TaskStatusFilterBar.jsx';
import { TaskKanbanBoard } from './components/board/TaskKanbanBoard.jsx';
import { TaskFocusedStackView } from './components/board/TaskFocusedStackView.jsx';
import { TaskListView } from './components/board/TaskListView.jsx';
import { TaskCalendarView } from './components/board/TaskCalendarView.jsx';
import { TaskBoardModals } from './components/board/TaskBoardModals.jsx';
import { formatTaskDate } from './utils/taskHelpers.js';

export const TaskBoard = ({
  search,
  priorityFilter,
  viewMode,
  sidebarFilter = 'all',
  taskModalOpen,
  onCloseTaskModal,
  onOpenTaskModal,
  onTaskCountsUpdate,
  onTasksUpdate,
  onOpenCategoryManager,
  onResetSidebarFilter,
  externalDetailTaskId = null,
  onClearExternalDetailTaskId,
  refreshTrigger = 0,
  newImportedTasks = null,
}) => {
  const { user } = useAuth();
  const { activeWorkspace, members } = useWorkspace();
  const { t, lang } = useLanguage();
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();
  const { categories = [] } = useCategories();

  // Stable Master Tasks List (Never mutated by search or priority filters)
  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState(null);
  const [activeDetailTaskId, setActiveDetailTaskId] = useState(null);
  const [activeCommentTask, setActiveCommentTask] = useState(null);
  const [calendarSelectedDate, setCalendarSelectedDate] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [isDeletingTask, setIsDeletingTask] = useState(false);

  // Drag and Drop State
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverColumnId, setDragOverColumnId] = useState(null);

  // Modular Filter Hook: Encapsulates all search, category, member, status, and priority filtering
  const currentUserId = String(user?.id || user?._id || '');
  const {
    selectedCategoryFilter,
    setSelectedCategoryFilter,
    selectedStatusFilter,
    setSelectedStatusFilter,
    isCategoryFromSidebar,
    isMemberFromSidebar,
    categoryScopedTasks,
    filteredTasks,
    filterMeta,
  } = useTaskBoardFilters({
    allTasks,
    sidebarFilter,
    priorityFilter,
    search,
    categories,
    members,
    currentUserId,
    lang,
    t,
  });

  // Sync externalDetailTaskId from header notification click or deep link URL query param
  useEffect(() => {
    if (externalDetailTaskId) {
      setActiveDetailTaskId(externalDetailTaskId);
      onClearExternalDetailTaskId?.();
    } else {
      try {
        const params = new URLSearchParams(window.location.search);
        const taskIdFromUrl = params.get('task');
        if (taskIdFromUrl) {
          setActiveDetailTaskId(taskIdFromUrl);
        }
      } catch {
        // safe fallback
      }
    }
  }, [externalDetailTaskId, onClearExternalDetailTaskId]);

  const STATUS_COLUMNS = useMemo(
    () => [
      {
        id: 'todo',
        label: t('todo'),
        indicatorColor: 'bg-slate-400 dark:bg-slate-500',
        badgeColor:
          'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
      },
      {
        id: 'in-progress',
        label: t('inProgress'),
        indicatorColor: 'bg-amber-500 shadow-sm shadow-amber-500/50',
        badgeColor:
          'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20',
      },
      {
        id: 'review',
        label: t('review'),
        indicatorColor: 'bg-purple-500 shadow-sm shadow-purple-500/50',
        badgeColor:
          'bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/20',
      },
      {
        id: 'completed',
        label: t('completed'),
        indicatorColor: 'bg-emerald-500 shadow-sm shadow-emerald-500/50',
        badgeColor:
          'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20',
      },
    ],
    [t]
  );

  const PRIORITY_BADGES = useMemo(
    () => ({
      urgent: {
        label: t('urgent'),
        style: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
      },
      high: {
        label: t('high'),
        style:
          'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30',
      },
      medium: {
        label: t('medium'),
        style: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
      },
      low: {
        label: t('low'),
        style: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30',
      },
    }),
    [t]
  );

  // Fetch full unfiltered workspace tasks
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 100 };
      const orgId = activeWorkspace?.id || activeWorkspace?._id;
      if (orgId) {
        params.organizationId = orgId;
      }

      const res = await api.get('/tasks', { params });
      if (res.data?.success) {
        const fetchedTasks = res.data.data.tasks || [];
        setAllTasks(fetchedTasks);
        onTasksUpdate?.(fetchedTasks);

        // Compute stable counts for sidebar
        if (onTaskCountsUpdate) {
          const now = Date.now();
          const userIdStr = String(user?.id || user?._id || '');
          const counts = {
            all: fetchedTasks.length,
            inProgress: fetchedTasks.filter(
              (t) => t.status === 'in-progress' || t.status === 'review'
            ).length,
            myTasks: fetchedTasks.filter((t) => {
              const assignees = Array.isArray(t.assignedTo)
                ? t.assignedTo
                : t.assignedTo ? [t.assignedTo] : [];
              return assignees.some((a) => String(a?._id || a?.id || a) === userIdStr);
            }).length,
            dueSoon: fetchedTasks.filter((t) => {
              if (!t.dueDate || t.status === 'completed') return false;
              const due = new Date(t.dueDate).getTime();
              return due >= now && due <= now + 3 * 24 * 60 * 60 * 1000;
            }).length,
            completed: fetchedTasks.filter((t) => t.status === 'completed').length,
          };
          onTaskCountsUpdate(counts);
        }
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id, activeWorkspace?._id, user?.id, user?._id, onTaskCountsUpdate, onTasksUpdate]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks, refreshTrigger]);

  // Real-Time Socket.IO Synchronization across team members in this workspace
  useTaskRealtimeSync({
    setAllTasks,
    onTaskCountsUpdate,
    onTasksUpdate,
    fetchTasks,
    activeWorkspace,
    user,
  });

  // Instant optimistic prepend when tasks are imported via AI
  useEffect(() => {
    if (Array.isArray(newImportedTasks) && newImportedTasks.length > 0) {
      setAllTasks((prev) => {
        const existingIds = new Set(prev.map((t) => t._id));
        const nonDuplicateNew = newImportedTasks.filter(
          (t) => !existingIds.has(t._id)
        );
        return [...nonDuplicateNew, ...prev];
      });
    }
  }, [newImportedTasks]);

  const handleCardDrop = async (taskId, targetColumnId) => {
    if (!taskId || !targetColumnId) return;
    const task = allTasks.find((t) => t._id === taskId);
    if (!task || task.status === targetColumnId) return;

    // Optimistically update status
    setAllTasks((prev) =>
      prev.map((t) => (t._id === taskId ? { ...t, status: targetColumnId } : t))
    );

    try {
      const res = await api.patch(`/tasks/${taskId}`, { status: targetColumnId });
      if (res.data?.data?.nextTask) {
        setAllTasks((prev) => {
          const nextTask = res.data.data.nextTask;
          const exists = prev.some((t) => t._id === nextTask._id);
          return exists ? prev : [nextTask, ...prev];
        });
      }
    } catch (err) {
      console.error('Failed to update task status on drop:', err);
      fetchTasks();
    }
  };

  const handleSaveTask = async (taskPayload) => {
    if (editingTask?._id) {
      const res = await api.patch(`/tasks/${editingTask._id}`, taskPayload);
      if (res.data?.success) {
        setAllTasks((prev) => {
          const updated = prev.map((t) => (t._id === editingTask._id ? res.data.data.task : t));
          if (res.data?.data?.nextTask) {
            const nextTask = res.data.data.nextTask;
            const exists = updated.some((t) => t._id === nextTask._id);
            return exists ? updated : [nextTask, ...updated];
          }
          return updated;
        });
      }
    } else {
      const res = await api.post('/tasks', taskPayload);
      if (res.data?.success) {
        setAllTasks((prev) => [res.data.data.task, ...prev]);
      }
    }
    setEditingTask(null);
    setCalendarSelectedDate(null);
  };

  const handleDueDateChange = async (taskId, newDueDate) => {
    if (!taskId) return;
    const task = allTasks.find((t) => t._id === taskId);
    if (!task) return;
    const prevDueDate = task.dueDate;

    setAllTasks((prev) =>
      prev.map((t) => (t._id === taskId ? { ...t, dueDate: newDueDate } : t))
    );

    try {
      await api.patch(`/tasks/${taskId}`, { dueDate: newDueDate });
    } catch (err) {
      console.error('Failed to update task due date on drop:', err);
      setAllTasks((prev) =>
        prev.map((t) => (t._id === taskId ? { ...t, dueDate: prevDueDate } : t))
      );
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      setAllTasks((prev) =>
        prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t))
      );
      const res = await api.patch(`/tasks/${taskId}`, { status: newStatus });
      if (res.data?.data?.nextTask) {
        setAllTasks((prev) => {
          const nextTask = res.data.data.nextTask;
          const exists = prev.some((t) => t._id === nextTask._id);
          return exists ? prev : [nextTask, ...prev];
        });
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      fetchTasks();
    }
  };

  const handleRequestDeleteTask = (taskId) => {
    setTaskToDelete(taskId);
  };

  const handleConfirmDeleteTask = async () => {
    if (!taskToDelete) return;
    try {
      setIsDeletingTask(true);
      await api.delete(`/tasks/${taskToDelete}`);
      setAllTasks((prev) => prev.filter((t) => t._id !== taskToDelete));
      setTaskToDelete(null);
    } catch (err) {
      console.error('Failed to delete task:', err);
      fetchTasks();
    } finally {
      setIsDeletingTask(false);
    }
  };

  const handleTaskUpdatedFromModal = (updatedTask) => {
    if (!updatedTask?._id) return;
    const targetId = String(updatedTask._id);
    setAllTasks((prev) => {
      const nextTasks = prev.map((t) =>
        String(t._id) === targetId ? { ...t, ...updatedTask } : t
      );
      if (onTaskCountsUpdate) {
        const now = Date.now();
        const counts = {
          all: nextTasks.length,
          inProgress: nextTasks.filter(
            (t) => t.status === 'in-progress' || t.status === 'review'
          ).length,
          myTasks: nextTasks.filter((t) => {
            const assignees = Array.isArray(t.assignedTo)
              ? t.assignedTo
              : t.assignedTo ? [t.assignedTo] : [];
            const userIdStr = String(user?.id || user?._id || '');
            return assignees.some((a) => String(a?._id || a?.id || a) === userIdStr);
          }).length,
          dueSoon: nextTasks.filter((t) => {
            if (!t.dueDate || t.status === 'completed') return false;
            const due = new Date(t.dueDate).getTime();
            return due >= now && due <= now + 3 * 24 * 60 * 60 * 1000;
          }).length,
          completed: nextTasks.filter((t) => t.status === 'completed').length,
        };
        onTaskCountsUpdate(counts);
      }
      return nextTasks;
    });
  };

  const formatDate = useCallback(
    (dateStr) => formatTaskDate(dateStr, lang),
    [lang]
  );

  const selectedTaskForDetail = allTasks.find(
    (t) => String(t._id) === String(activeDetailTaskId)
  );

  const handleDragOverColumn = (e, columnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumnId !== columnId) setDragOverColumnId(columnId);
  };

  const handleDragLeaveColumn = (e) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setDragOverColumnId(null);
  };

  const handleDropColumn = (e, columnId) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    setDragOverColumnId(null);
    setDraggedTaskId(null);
    handleCardDrop(taskId, columnId);
  };

  const handleOpenNewTask = () => {
    setEditingTask(null);
    setCalendarSelectedDate(null);
    onOpenTaskModal();
  };

  return (
    <div className="space-y-6">
      {/* 1. Micro-Stats Overview Bar */}
      <TaskStats tasks={allTasks} />

      {/* 2. Notification Center View */}
      {sidebarFilter === 'notifications' ? (
        <TaskBoardNotificationView
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onOpenTaskDetail={(taskId) => setActiveDetailTaskId(taskId)}
          lang={lang}
          t={t}
        />
      ) : (
        <>
          {/* 3. Focused Filter Header */}
          {sidebarFilter !== 'all' && filterMeta && (
            <TaskBoardFilterHeader
              filterMeta={filterMeta}
              filteredCount={filteredTasks.length}
              onResetFilter={() => onResetSidebarFilter?.('all')}
              onNewTask={handleOpenNewTask}
              lang={lang}
              t={t}
            />
          )}

          {/* Filter Bar (Category vs Status Filter Tabs) */}
          {isCategoryFromSidebar || isMemberFromSidebar ? (
            <TaskStatusFilterBar
              statusColumns={STATUS_COLUMNS}
              selectedStatus={selectedStatusFilter}
              onSelectStatus={(st) => setSelectedStatusFilter(st)}
              tasks={categoryScopedTasks}
              t={t}
            />
          ) : viewMode === 'list' ? (
            <div className="space-y-3">
              <TaskStatusFilterBar
                statusColumns={STATUS_COLUMNS}
                selectedStatus={selectedStatusFilter}
                onSelectStatus={(st) => setSelectedStatusFilter(st)}
                tasks={categoryScopedTasks}
                t={t}
              />
              {sidebarFilter === 'all' && categories.length > 0 && (
                <TaskCategoryFilterBar
                  categories={categories}
                  selectedCategory={selectedCategoryFilter}
                  onSelectCategory={(catId) => setSelectedCategoryFilter(catId)}
                  tasks={allTasks}
                  t={t}
                />
              )}
            </div>
          ) : (
            sidebarFilter === 'all' && (
              <TaskCategoryFilterBar
                categories={categories}
                selectedCategory={selectedCategoryFilter}
                onSelectCategory={(catId) => setSelectedCategoryFilter(catId)}
                tasks={allTasks}
                t={t}
              />
            )
          )}

          {/* 4. Presentation Views */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-64 rounded-3xl glass-panel animate-pulse"
                />
              ))}
            </div>
          ) : viewMode === 'calendar' ? (
            <TaskCalendarView
              filteredTasks={filteredTasks}
              onOpenDetail={(task) => setActiveDetailTaskId(task._id)}
              onSelectDate={(dateKey) => {
                setCalendarSelectedDate(dateKey);
                setEditingTask(null);
                onOpenTaskModal();
              }}
              onDueDateChange={handleDueDateChange}
              onNewTask={handleOpenNewTask}
              lang={lang}
              t={t}
            />
          ) : sidebarFilter === 'all' && viewMode === 'kanban' ? (
            <TaskKanbanBoard
              statusColumns={STATUS_COLUMNS}
              filteredTasks={filteredTasks}
              draggedTaskId={draggedTaskId}
              dragOverColumnId={dragOverColumnId}
              onDragOver={handleDragOverColumn}
              onDragLeave={handleDragLeaveColumn}
              onDrop={handleDropColumn}
              onDragStart={(task) => setDraggedTaskId(task._id)}
              onDragEnd={() => setDraggedTaskId(null)}
              onOpenDetail={(task) => setActiveDetailTaskId(task._id)}
              onEdit={(task) => {
                setEditingTask(task);
                onOpenTaskModal();
              }}
              onDelete={(taskId) => handleRequestDeleteTask(taskId)}
              onStatusChange={handleStatusChange}
              onOpenComments={(task) => setActiveCommentTask(task)}
              onCategoryClick={(catId) => setSelectedCategoryFilter(catId)}
              onNewTask={handleOpenNewTask}
              priorityBadges={PRIORITY_BADGES}
              formatDate={formatDate}
              lang={lang}
              t={t}
            />
          ) : sidebarFilter !== 'all' && viewMode === 'kanban' ? (
            <TaskFocusedStackView
              filteredTasks={filteredTasks}
              statusColumns={STATUS_COLUMNS}
              priorityBadges={PRIORITY_BADGES}
              onOpenDetail={(task) => setActiveDetailTaskId(task._id)}
              onEdit={(task) => {
                setEditingTask(task);
                onOpenTaskModal();
              }}
              onDelete={(taskId) => handleRequestDeleteTask(taskId)}
              onStatusChange={handleStatusChange}
              onOpenComments={(task) => setActiveCommentTask(task)}
              onCategoryClick={(catId) => setSelectedCategoryFilter(catId)}
              formatDate={formatDate}
              lang={lang}
              t={t}
            />
          ) : (
            <TaskListView
              filteredTasks={filteredTasks}
              statusColumns={STATUS_COLUMNS}
              priorityBadges={PRIORITY_BADGES}
              onStatusChange={handleStatusChange}
              onOpenDetail={(task) => setActiveDetailTaskId(task._id)}
              onOpenComments={(task) => setActiveCommentTask(task)}
              onEdit={(task) => {
                setEditingTask(task);
                onOpenTaskModal();
              }}
              onDelete={(taskId) => handleRequestDeleteTask(taskId)}
              formatDate={formatDate}
              t={t}
            />
          )}
        </>
      )}

      {/* 5. Modals Orchestrator */}
      <TaskBoardModals
        activeDetailTaskId={activeDetailTaskId}
        onCloseDetailModal={() => setActiveDetailTaskId(null)}
        selectedTaskForDetail={selectedTaskForDetail}
        onTaskUpdatedFromModal={handleTaskUpdatedFromModal}
        onEditTaskFromDetail={(t) => {
          setEditingTask(t);
          onOpenTaskModal();
        }}
        onRequestDeleteTask={handleRequestDeleteTask}
        taskModalOpen={taskModalOpen}
        onCloseTaskModal={() => {
          setEditingTask(null);
          setCalendarSelectedDate(null);
          onCloseTaskModal();
        }}
        onSaveTask={handleSaveTask}
        editingTask={editingTask}
        calendarSelectedDate={calendarSelectedDate}
        onOpenCategoryManager={onOpenCategoryManager}
        activeCommentTask={activeCommentTask}
        onCloseCommentDrawer={() => setActiveCommentTask(null)}
        taskToDelete={taskToDelete}
        onCloseDeleteModal={() => !isDeletingTask && setTaskToDelete(null)}
        onConfirmDeleteTask={handleConfirmDeleteTask}
        isDeletingTask={isDeletingTask}
        t={t}
      />
    </div>
  );
};
