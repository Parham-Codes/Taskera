import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Bell,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { useNotifications } from '../../context/NotificationContext.jsx';
import { useCategories } from '../../context/CategoryContext.jsx';
import { TaskModal } from './TaskModal.jsx';
import { TaskStats } from './TaskStats.jsx';
import { TaskDetailModal } from './TaskDetailModal.jsx';
import { CommentDrawer } from '../comments/CommentDrawer.jsx';
import { ConfirmModal } from '../../components/ui/index.js';

import { TaskBoardNotificationView } from './components/board/TaskBoardNotificationView.jsx';
import { TaskBoardFilterHeader } from './components/board/TaskBoardFilterHeader.jsx';
import { TaskCategoryFilterBar } from './components/board/TaskCategoryFilterBar.jsx';
import { TaskKanbanBoard } from './components/board/TaskKanbanBoard.jsx';
import { TaskFocusedStackView } from './components/board/TaskFocusedStackView.jsx';
import { TaskListView } from './components/board/TaskListView.jsx';
import { TaskCalendarView } from './components/board/TaskCalendarView.jsx';
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
  const { activeWorkspace } = useWorkspace();
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
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [calendarSelectedDate, setCalendarSelectedDate] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [isDeletingTask, setIsDeletingTask] = useState(false);

  // Drag and Drop State
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverColumnId, setDragOverColumnId] = useState(null);

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
          const currentUserId = String(user?.id || user?._id || '');
          const counts = {
            all: fetchedTasks.length,
            inProgress: fetchedTasks.filter(
              (t) => t.status === 'in-progress' || t.status === 'review'
            ).length,
            myTasks: fetchedTasks.filter((t) => {
              const assignees = Array.isArray(t.assignedTo)
                ? t.assignedTo
                : t.assignedTo ? [t.assignedTo] : [];
              return assignees.some((a) => String(a?._id || a?.id || a) === currentUserId);
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

  // Client-side filtering: 0ms latency, zero layout shift, stable TaskStats!
  const filteredTasks = useMemo(() => {
    return allTasks.filter((task) => {
      // 1. Sidebar filter
      if (sidebarFilter === 'in-progress') {
        if (task.status !== 'in-progress' && task.status !== 'review') return false;
      } else if (sidebarFilter === 'my-tasks') {
        const assignees = Array.isArray(task.assignedTo)
          ? task.assignedTo
          : task.assignedTo ? [task.assignedTo] : [];
        const currentUserId = String(user?.id || user?._id || '');
        const isMine = assignees.some((a) => String(a?._id || a?.id || a) === currentUserId);
        if (!isMine) return false;
      } else if (sidebarFilter === 'due-soon') {
        if (!task.dueDate || task.status === 'completed') return false;
        const due = new Date(task.dueDate).getTime();
        const now = Date.now();
        if (due < now || due > now + 3 * 24 * 60 * 60 * 1000) return false;
      } else if (sidebarFilter === 'completed') {
        if (task.status !== 'completed') return false;
      } else if (sidebarFilter?.startsWith('cat:')) {
        const targetCatId = sidebarFilter.replace('cat:', '');
        const catId = task.categoryId?._id || task.categoryId;
        if (String(catId) !== String(targetCatId)) return false;
      }

      // 2. Priority Filter from Header
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
        return false;
      }

      // 3. Search text
      if (search?.trim()) {
        const q = search.trim().toLowerCase();
        const matchTitle = task.title?.toLowerCase().includes(q);
        const matchDesc = task.description?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc) return false;
      }

      // 4. Category Filter
      if (selectedCategoryFilter !== 'all') {
        const catId = task.categoryId?._id || task.categoryId;
        if (catId !== selectedCategoryFilter) return false;
      }

      return true;
    });
  }, [
    allTasks,
    sidebarFilter,
    priorityFilter,
    search,
    selectedCategoryFilter,
    user?.id,
  ]);

  const handleCardDrop = async (taskId, targetColumnId) => {
    if (!taskId || !targetColumnId) return;
    const task = allTasks.find((t) => t._id === taskId);
    if (!task || task.status === targetColumnId) return;

    // Optimistically update status
    setAllTasks((prev) =>
      prev.map((t) => (t._id === taskId ? { ...t, status: targetColumnId } : t))
    );

    try {
      await api.patch(`/tasks/${taskId}`, { status: targetColumnId });
    } catch (err) {
      console.error('Failed to update task status on drop:', err);
      fetchTasks();
    }
  };

  const handleSaveTask = async (taskPayload) => {
    if (editingTask?._id) {
      const res = await api.patch(`/tasks/${editingTask._id}`, taskPayload);
      if (res.data?.success) {
        setAllTasks((prev) =>
          prev.map((t) => (t._id === editingTask._id ? res.data.data.task : t))
        );
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

    // Optimistically update dueDate
    setAllTasks((prev) =>
      prev.map((t) => (t._id === taskId ? { ...t, dueDate: newDueDate } : t))
    );

    try {
      await api.patch(`/tasks/${taskId}`, { dueDate: newDueDate });
    } catch (err) {
      console.error('Failed to update task due date on drop:', err);
      // Rollback on failure
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
      await api.patch(`/tasks/${taskId}`, { status: newStatus });
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
            const currentUserId = String(user?.id || user?._id || '');
            return assignees.some((a) => String(a?._id || a?.id || a) === currentUserId);
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

  // Filter metadata when viewing a specific sidebar filter
  const filterMeta = {
    'in-progress': {
      title: t('quickFilterInProgress'),
      icon: Clock,
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    },
    'my-tasks': {
      title: t('quickFilterMyTasks'),
      icon: UserCheck,
      color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    },
    'due-soon': {
      title: t('quickFilterDueSoon'),
      icon: AlertTriangle,
      color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    },
    'completed': {
      title: t('quickFilterCompleted'),
      icon: CheckCircle2,
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    },
    'notifications': {
      title: t('notificationsTitle'),
      icon: Bell,
      color: 'text-brand-500 bg-brand-500/10 border-brand-500/20',
    },
  }[sidebarFilter];

  // Selected task object for instant 0ms TaskDetailModal rendering
  const selectedTaskForDetail = allTasks.find(
    (t) => String(t._id) === String(activeDetailTaskId)
  );

  // Drag and drop event helpers
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
      {/* 1. STABLE Micro-Stats Overview Bar */}
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

          {/* Quick Category Filter Pills */}
          <TaskCategoryFilterBar
            categories={categories}
            selectedCategory={selectedCategoryFilter}
            onSelectCategory={(catId) => setSelectedCategoryFilter(catId)}
            tasks={allTasks}
            t={t}
          />

          {/* 4. Tasks Presentation */}
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
            /* Calendar View */
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
            /* 4-Column Kanban Board */
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
            /* Focused Filtered Tasks: FULL-WIDTH Responsive Stack */
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
            /* List View */
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

      {/* 5. Dedicated Task Detail & Time Tracker Modal */}
      <TaskDetailModal
        isOpen={Boolean(activeDetailTaskId)}
        onClose={() => setActiveDetailTaskId(null)}
        taskId={activeDetailTaskId}
        initialTask={selectedTaskForDetail}
        onTaskUpdated={handleTaskUpdatedFromModal}
        onEditTask={(t) => {
          setEditingTask(t);
          onOpenTaskModal();
        }}
        onDeleteTask={handleRequestDeleteTask}
      />

      {/* 6. Create / Edit Task Modal */}
      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => {
          setEditingTask(null);
          setCalendarSelectedDate(null);
          onCloseTaskModal();
        }}
        onSubmit={handleSaveTask}
        initialTask={editingTask}
        defaultDueDate={calendarSelectedDate || ''}
        onOpenCategoryManager={onOpenCategoryManager}
      />

      {/* 7. Comment Drawer */}
      <CommentDrawer
        isOpen={Boolean(activeCommentTask)}
        onClose={() => setActiveCommentTask(null)}
        task={activeCommentTask}
      />

      {/* 8. Confirm Delete Task Modal */}
      <ConfirmModal
        isOpen={Boolean(taskToDelete)}
        onClose={() => !isDeletingTask && setTaskToDelete(null)}
        onConfirm={handleConfirmDeleteTask}
        title={t('confirmDeleteTaskTitle')}
        description={t('confirmDeleteTaskDesc')}
        confirmText={t('confirmDeleteBtn')}
        cancelText={t('cancel')}
        variant="danger"
        loading={isDeletingTask}
      />
    </div>
  );
};
