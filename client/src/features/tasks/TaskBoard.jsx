import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar,
  MessageSquare,
  Trash2,
  Edit2,
  Plus,
  Clock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  LayoutGrid,
  ExternalLink,
  Bell,
  CheckCheck,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { useNotifications } from '../../context/NotificationContext.jsx';
import { useCategories } from '../../context/CategoryContext.jsx';
import { TaskModal } from './TaskModal.jsx';
import { TaskCard } from './TaskCard.jsx';
import { TaskStats } from './TaskStats.jsx';
import { TaskDetailModal } from './TaskDetailModal.jsx';
import { CommentDrawer } from '../comments/CommentDrawer.jsx';

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
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { categories = [] } = useCategories();

  // Stable Master Tasks List (Never mutated by search or priority filters)
  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState(null);
  const [activeDetailTaskId, setActiveDetailTaskId] = useState(null);
  const [activeCommentTask, setActiveCommentTask] = useState(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  // Drag and Drop State
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverColumnId, setDragOverColumnId] = useState(null);

  // Sync externalDetailTaskId from header notification click
  useEffect(() => {
    if (externalDetailTaskId) {
      setActiveDetailTaskId(externalDetailTaskId);
      onClearExternalDetailTaskId?.();
    }
  }, [externalDetailTaskId, onClearExternalDetailTaskId]);

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

  const STATUS_COLUMNS = [
    {
      id: 'todo',
      label: t('todo'),
      indicatorColor: 'bg-slate-400 dark:bg-slate-500',
      badgeColor: 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
    },
    {
      id: 'in-progress',
      label: t('inProgress'),
      indicatorColor: 'bg-amber-500 shadow-sm shadow-amber-500/50',
      badgeColor: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20',
    },
    {
      id: 'review',
      label: t('review'),
      indicatorColor: 'bg-purple-500 shadow-sm shadow-purple-500/50',
      badgeColor: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/20',
    },
    {
      id: 'completed',
      label: t('completed'),
      indicatorColor: 'bg-emerald-500 shadow-sm shadow-emerald-500/50',
      badgeColor: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20',
    },
  ];

  const PRIORITY_BADGES = {
    urgent: { label: t('urgent'), style: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30' },
    high: { label: t('high'), style: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30' },
    medium: { label: t('medium'), style: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' },
    low: { label: t('low'), style: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30' },
  };

  // Fetch full unfiltered workspace tasks
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (activeWorkspace?.id) {
        params.organizationId = activeWorkspace.id;
      }

      const res = await api.get('/tasks', { params });
      if (res.data?.success) {
        const fetchedTasks = res.data.data.tasks || [];
        setAllTasks(fetchedTasks);
        onTasksUpdate?.(fetchedTasks);

        // Compute stable counts for sidebar
        if (onTaskCountsUpdate) {
          const now = Date.now();
          const counts = {
            all: fetchedTasks.length,
            inProgress: fetchedTasks.filter((t) => t.status === 'in-progress' || t.status === 'review').length,
            myTasks: fetchedTasks.filter((t) => (t.assignedTo?._id || t.assignedTo) === user?.id).length,
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
  }, [activeWorkspace?.id, user?.id, onTaskCountsUpdate]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks, refreshTrigger]);

  // Instant optimistic prepend when tasks are imported via AI
  useEffect(() => {
    if (Array.isArray(newImportedTasks) && newImportedTasks.length > 0) {
      setAllTasks((prev) => {
        // Prevent duplicate IDs
        const existingIds = new Set(prev.map((t) => t._id));
        const nonDuplicateNew = newImportedTasks.filter((t) => !existingIds.has(t._id));
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
        const assigneeId = task.assignedTo?._id || task.assignedTo;
        if (assigneeId !== user?.id) return false;
      } else if (sidebarFilter === 'due-soon') {
        if (!task.dueDate || task.status === 'completed') return false;
        const due = new Date(task.dueDate).getTime();
        if (due > Date.now() + 3 * 24 * 60 * 60 * 1000) return false;
      } else if (sidebarFilter === 'completed') {
        if (task.status !== 'completed') return false;
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
  }, [allTasks, sidebarFilter, priorityFilter, search, selectedCategoryFilter, user?.id]);

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

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm(t('confirmDeleteTask'))) return;
    try {
      setAllTasks((prev) => prev.filter((t) => t._id !== taskId));
      await api.delete(`/tasks/${taskId}`);
    } catch (err) {
      console.error('Failed to delete task:', err);
      fetchTasks();
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
          inProgress: nextTasks.filter((t) => t.status === 'in-progress' || t.status === 'review').length,
          myTasks: nextTasks.filter((t) => String(t.assignedTo?._id || t.assignedTo) === String(user?.id)).length,
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

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString(lang === 'fa' ? 'fa-IR' : 'en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return lang === 'fa' ? 'لحظاتی پیش' : 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} ${lang === 'fa' ? 'دقیقه پیش' : 'm ago'}`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ${lang === 'fa' ? 'ساعت پیش' : 'h ago'}`;
    return formatDate(dateStr);
  };

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

  return (
    <div className="space-y-6">
      {/* 1. STABLE Micro-Stats Overview Bar (Calculated from allTasks, never disrupted by search) */}
      <TaskStats tasks={allTasks} />

      {/* 2. Notification Center View (When sidebarFilter === 'notifications') */}
      {sidebarFilter === 'notifications' ? (
        <div className="glass-panel rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  {t('notificationsTitle')}
                </h3>
                <p className="text-xs text-slate-400">{t('notificationsDesc')}</p>
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-brand-600 dark:text-brand-400 hover:bg-brand-50/60 dark:hover:bg-brand-950/40 transition-colors"
              >
                <CheckCheck className="w-4 h-4" />
                <span>{t('markAllRead')}</span>
              </button>
            )}
          </div>

          <div className="space-y-2">
            {notifications.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm">
                {t('noNotifications')}
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  onClick={() => {
                    markAsRead(n._id);
                    if (n.taskId?._id || n.taskId) {
                      setActiveDetailTaskId(n.taskId?._id || n.taskId);
                    }
                  }}
                  className={`p-4 rounded-2xl flex items-start justify-between gap-3 cursor-pointer transition-all ${
                    !n.isRead
                      ? 'bg-brand-50/80 dark:bg-brand-950/40 border border-brand-500/30 shadow-xs'
                      : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/40 border border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-xs">
                      {n.sender?.name?.[0]?.toUpperCase() || <MessageSquare className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {n.title}
                        </p>
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                        {n.message}
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] text-slate-400 shrink-0 ms-2">
                    {formatRelativeTime(n.createdAt)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <>
          {/* 3. Focused Filter Header (When user clicked a specific sidebar filter) */}
          {sidebarFilter !== 'all' && filterMeta && (
            <div className="p-4 rounded-3xl glass-panel border border-slate-200/90 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center border ${filterMeta.color}`}>
                  <filterMeta.icon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                    {filterMeta.title}
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    {t('showingFilteredTasks')} ({filteredTasks.length})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onResetSidebarFilter?.('all')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-input text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-brand-500 transition-colors"
                >
                  {lang === 'fa' ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
                  <span>{t('backToAllBoard')}</span>
                </button>
                <button
                  onClick={() => {
                    setEditingTask(null);
                    onOpenTaskModal();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 transition-all shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('newTask')}</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Category Filter Pills */}
          {categories.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  selectedCategoryFilter === 'all'
                    ? 'bg-brand-500 text-white shadow-xs font-bold'
                    : 'glass-panel text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {t('allCategories')}
              </button>
              {categories.map((cat) => {
                const isSelected = selectedCategoryFilter === cat._id;
                const count = allTasks.filter(
                  (t) => (t.categoryId?._id || t.categoryId) === cat._id
                ).length;
                return (
                  <button
                    key={cat._id}
                    onClick={() => setSelectedCategoryFilter(isSelected ? 'all' : cat._id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 border ${
                      isSelected
                        ? 'shadow-xs text-white'
                        : 'glass-panel text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                    style={{
                      backgroundColor: isSelected ? cat.color : undefined,
                      borderColor: isSelected ? cat.color : undefined,
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: isSelected ? '#ffffff' : cat.color }}
                    />
                    <span>{cat.name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isSelected
                          ? 'bg-white/25 text-white'
                          : 'bg-slate-200/70 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* 4. Tasks Presentation: Board vs Focused Single Grid vs List */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-64 rounded-3xl glass-panel animate-pulse" />
              ))}
            </div>
          ) : sidebarFilter === 'all' && viewMode === 'kanban' ? (
            /* Modernized, Airy 4-Column Kanban Board */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
              {STATUS_COLUMNS.map((column) => {
                const columnTasks = filteredTasks.filter((t) => t.status === column.id);

                const isTarget = dragOverColumnId === column.id;

                return (
                  <div
                    key={column.id}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dragOverColumnId !== column.id) setDragOverColumnId(column.id);
                    }}
                    onDragLeave={(e) => {
                      if (e.currentTarget.contains(e.relatedTarget)) return;
                      setDragOverColumnId(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
                      setDragOverColumnId(null);
                      setDraggedTaskId(null);
                      handleCardDrop(taskId, column.id);
                    }}
                    className={`flex flex-col rounded-2xl transition-all duration-200 p-2.5 min-h-[460px] max-h-[72vh] xl:max-h-[75vh] ${
                      isTarget
                        ? 'ring-2 ring-brand-500/80 bg-brand-500/[0.09] dark:bg-brand-500/[0.14] border-brand-500/50 shadow-xl'
                        : 'bg-slate-200/40 dark:bg-slate-900/30 border border-slate-200/60 dark:border-slate-800/50'
                    }`}
                  >
                    {/* Sleek Column Header */}
                    <div className="flex items-center justify-between px-2 py-2 mb-2 shrink-0">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${column.indicatorColor}`} />
                        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200">
                          {column.label}
                        </h3>
                        <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                          {columnTasks.length}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          setEditingTask(null);
                          onOpenTaskModal();
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors"
                        title={t('newTask')}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Cards Container with internal scroll when content overflows */}
                    <div className="flex-1 space-y-2.5 p-1 pt-1 pb-2 overflow-y-auto">
                      {columnTasks.length === 0 && !isTarget ? (
                        <div className="h-28 rounded-xl border border-dashed border-slate-300/70 dark:border-slate-800/80 flex flex-col items-center justify-center text-slate-400 text-xs">
                          <span>{t('noTasks')}</span>
                        </div>
                      ) : (
                        columnTasks.map((task) => (
                          <TaskCard
                            key={task._id}
                            task={task}
                            t={t}
                            lang={lang}
                            formatDate={formatDate}
                            statusColumns={STATUS_COLUMNS}
                            priorityBadges={PRIORITY_BADGES}
                            onOpenDetail={(task) => setActiveDetailTaskId(task._id)}
                            onEdit={() => {
                              setEditingTask(task);
                              onOpenTaskModal();
                            }}
                            onDelete={() => handleDeleteTask(task._id)}
                            onStatusChange={handleStatusChange}
                            onOpenComments={() => setActiveCommentTask(task)}
                            onCategoryClick={(catId) => setSelectedCategoryFilter(catId)}
                            draggable={true}
                            onDragStart={() => setDraggedTaskId(task._id)}
                            onDragEnd={() => setDraggedTaskId(null)}
                            isDragging={draggedTaskId === task._id}
                          />
                        ))
                      )}

                      {/* Animated Drop Target Indicator */}
                      {isTarget && (
                        <div className="h-14 rounded-2xl border-2 border-dashed border-brand-500/70 bg-brand-500/10 flex items-center justify-center gap-2 text-brand-600 dark:text-brand-400 text-xs font-bold animate-in fade-in zoom-in-95 duration-150">
                          <span className="w-2 h-2 rounded-full bg-brand-500 animate-ping" />
                          <span>
                            {lang === 'fa'
                              ? `انتقال به ${column.label}`
                              : `Drop here to move to ${column.label}`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : sidebarFilter !== 'all' && viewMode === 'kanban' ? (
            /* Focused Filtered Tasks: FULL-WIDTH Responsive Stack */
            <div className="w-full">
              {filteredTasks.length === 0 ? (
                <div className="w-full p-16 rounded-3xl glass-panel border border-slate-200/90 dark:border-slate-800 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                    <LayoutGrid className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                    {t('noTasksInWorkspace')}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3 w-full">
                  {filteredTasks.map((task) => (
                    <TaskCard
                      key={task._id}
                      task={task}
                      t={t}
                      lang={lang}
                      formatDate={formatDate}
                      statusColumns={STATUS_COLUMNS}
                      priorityBadges={PRIORITY_BADGES}
                      onOpenDetail={(task) => setActiveDetailTaskId(task._id)}
                      onEdit={() => {
                        setEditingTask(task);
                        onOpenTaskModal();
                      }}
                      onDelete={() => handleDeleteTask(task._id)}
                      onStatusChange={handleStatusChange}
                      onOpenComments={() => setActiveCommentTask(task)}
                      onCategoryClick={(catId) => setSelectedCategoryFilter(catId)}
                      fullWidth={true}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* List View */
            <div className="glass-panel rounded-3xl border border-slate-200/90 dark:border-slate-800 divide-y divide-slate-200/60 dark:divide-slate-800 overflow-hidden shadow-xs">
              {filteredTasks.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-sm">
                  {t('noTasksInWorkspace')}
                </div>
              ) : (
                filteredTasks.map((task) => (
                  <div
                    key={task._id}
                    onClick={() => setActiveDetailTaskId(task._id)}
                    className="p-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 flex items-center justify-between gap-4 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={task.status}
                        onChange={(e) => handleStatusChange(task._id, e.target.value)}
                        className="text-xs px-2.5 py-1.5 rounded-xl glass-input cursor-pointer focus:outline-none font-medium"
                      >
                        {STATUS_COLUMNS.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </select>

                      <div className="min-w-0" onClick={() => setActiveDetailTaskId(task._id)}>
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

                    <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-lg border ${
                          PRIORITY_BADGES[task.priority]?.style || ''
                        }`}
                      >
                        {PRIORITY_BADGES[task.priority]?.label || task.priority}
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
                        onClick={() => setActiveDetailTaskId(task._id)}
                        className="p-1.5 text-slate-400 hover:text-brand-500 transition-colors"
                        title={t('openDetails')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setActiveCommentTask(task)}
                        className="p-1.5 text-slate-400 hover:text-brand-500 transition-colors"
                        title={t('commentsTitle')}
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          setEditingTask(task);
                          onOpenTaskModal();
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteTask(task._id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* 5. Dedicated Task Detail & Time Tracker Modal (Instant 0ms with initialTask) */}
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
        onDeleteTask={handleDeleteTask}
      />

      {/* 6. Create / Edit Task Modal */}
      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => {
          setEditingTask(null);
          onCloseTaskModal();
        }}
        onSubmit={handleSaveTask}
        initialTask={editingTask}
        onOpenCategoryManager={onOpenCategoryManager}
      />

      {/* 7. Comment Drawer */}
      <CommentDrawer
        isOpen={Boolean(activeCommentTask)}
        onClose={() => setActiveCommentTask(null)}
        task={activeCommentTask}
      />
    </div>
  );
};
