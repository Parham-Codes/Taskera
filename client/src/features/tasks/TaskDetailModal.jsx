import React, { useState, useEffect } from 'react';
import {
  Calendar,
  AlertCircle,
  Trash2,
  Edit2,
  Loader2,
  Timer as TimerIcon,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { Modal } from '../../components/ui/index.js';
import { useTaskTimer } from './hooks/useTaskTimer.js';
import { TaskDetailHeader } from './components/detail/TaskDetailHeader.jsx';
import { TaskDetailTimeTracker } from './components/detail/TaskDetailTimeTracker.jsx';
import { TaskDetailSubtasks } from './components/detail/TaskDetailSubtasks.jsx';
import { TaskDetailComments } from './components/detail/TaskDetailComments.jsx';
import { formatTaskDate } from './utils/taskHelpers.js';

export const TaskDetailModal = ({
  isOpen,
  onClose,
  taskId,
  initialTask = null,
  onTaskUpdated,
  onEditTask,
  onDeleteTask,
}) => {
  const { user } = useAuth();
  const { t, lang } = useLanguage();

  const [task, setTask] = useState(initialTask || null);
  const [loading, setLoading] = useState(!initialTask);
  const [error, setError] = useState('');

  // Comments State
  const [comments, setComments] = useState([]);
  const [submittingComment, setSubmittingComment] = useState(false);

  // Subtasks State
  const [addingSubtask, setAddingSubtask] = useState(false);

  const handleTaskUpdatedInternal = (updatedTask) => {
    setTask(updatedTask);
    onTaskUpdated?.(updatedTask);
  };

  // Custom Time Tracking Hook
  const {
    activeSession,
    elapsedSeconds,
    timerBusy,
    startTimer,
    stopTimer,
  } = useTaskTimer({
    task,
    user,
    onTaskUpdated: handleTaskUpdatedInternal,
    setError,
  });

  // Load Task & Comments
  useEffect(() => {
    if (!isOpen || !taskId) return;

    let isMounted = true;
    if (initialTask) {
      setTask(initialTask);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError('');

    const loadData = async () => {
      try {
        const [taskRes, commentsRes] = await Promise.all([
          api.get(`/tasks/${taskId}`),
          api.get(`/tasks/${taskId}/comments`).catch(() => ({
            data: { data: { comments: [] } },
          })),
        ]);

        if (isMounted && taskRes.data?.success) {
          const fetchedTask = taskRes.data.data.task;
          setTask(fetchedTask);
          setComments(commentsRes.data?.data?.comments || []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.message || 'Error loading task details');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, taskId, initialTask]);

  // Change Status
  const handleStatusChange = async (newStatus) => {
    if (!task) return;
    try {
      const res = await api.patch(`/tasks/${task._id}`, { status: newStatus });
      if (res.data?.success) {
        const next = { ...task, status: newStatus };
        setTask(next);
        onTaskUpdated?.(res.data.data.task || next);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status');
    }
  };

  // Comments Handlers
  const handleSendComment = async (content) => {
    if (!task || !content) return;
    setSubmittingComment(true);
    try {
      const res = await api.post(`/tasks/${task._id}/comments`, { content });
      if (res.data?.success) {
        setComments((prev) => [...prev, res.data.data.comment]);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!task) return;
    try {
      await api.delete(`/tasks/${task._id}/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c._id !== commentId));
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  // Subtask Handlers
  const handleToggleSubtask = async (subtaskId, index) => {
    if (!task) return;

    const updatedSubtasks = (task.subtasks || []).map((st, i) =>
      st._id === subtaskId || i === index ? { ...st, completed: !st.completed } : st
    );
    const optimisticTask = { ...task, subtasks: updatedSubtasks };
    handleTaskUpdatedInternal(optimisticTask);

    try {
      const endpoint = subtaskId
        ? `/tasks/${task._id}/subtasks/${subtaskId}/toggle`
        : `/tasks/${task._id}`;
      const payload = subtaskId ? {} : { subtasks: updatedSubtasks };
      const res = await api.patch(endpoint, payload);
      if (res.data?.success && res.data.data.task) {
        handleTaskUpdatedInternal(res.data.data.task);
      }
    } catch (err) {
      console.error('Failed to toggle subtask:', err);
    }
  };

  const handleAddNewSubtask = async (title) => {
    if (!title || !task || addingSubtask) return;
    setAddingSubtask(true);

    const newSubtask = { title, completed: false };
    const nextSubtasks = [...(task.subtasks || []), newSubtask];

    const optimisticTask = { ...task, subtasks: nextSubtasks };
    handleTaskUpdatedInternal(optimisticTask);

    try {
      const res = await api.patch(`/tasks/${task._id}`, { subtasks: nextSubtasks });
      if (res.data?.success && res.data.data.task) {
        handleTaskUpdatedInternal(res.data.data.task);
      }
    } catch (err) {
      console.error('Failed to add subtask:', err);
    } finally {
      setAddingSubtask(false);
    }
  };

  const handleDeleteSubtask = async (subtaskId, index) => {
    if (!task) return;
    const nextSubtasks = (task.subtasks || []).filter((st, i) =>
      st._id ? st._id !== subtaskId : i !== index
    );

    const optimisticTask = { ...task, subtasks: nextSubtasks };
    handleTaskUpdatedInternal(optimisticTask);

    try {
      const res = await api.patch(`/tasks/${task._id}`, { subtasks: nextSubtasks });
      if (res.data?.success && res.data.data.task) {
        handleTaskUpdatedInternal(res.data.data.task);
      }
    } catch (err) {
      console.error('Failed to delete subtask:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('taskDetails')}
      icon={TimerIcon}
      maxWidth="max-w-3xl"
      headerExtra={
        task && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                onEditTask?.(task);
                onClose();
              }}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={t('edit')}
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                onDeleteTask?.(task._id);
                onClose();
              }}
              className="p-1.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              title={t('delete')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )
      }
    >
      {loading && !task ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
          <span className="text-xs text-slate-400">{t('loading')}</span>
        </div>
      ) : error && !task ? (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : task ? (
        <div className="space-y-6">
          {error && (
            <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Task Title & Quick Status Bar */}
          <TaskDetailHeader
            task={task}
            t={t}
            onStatusChange={handleStatusChange}
          />

          {/* 2. Live Time Tracker */}
          <TaskDetailTimeTracker
            task={task}
            activeSession={activeSession}
            elapsedSeconds={elapsedSeconds}
            timerBusy={timerBusy}
            onStartTimer={startTimer}
            onStopTimer={stopTimer}
            lang={lang}
            t={t}
          />

          {/* 3. Subtasks / Checklist */}
          <TaskDetailSubtasks
            subtasks={task.subtasks || []}
            onToggleSubtask={handleToggleSubtask}
            onDeleteSubtask={handleDeleteSubtask}
            onAddSubtask={handleAddNewSubtask}
            addingSubtask={addingSubtask}
            t={t}
          />

          {/* 4. Task Metadata (Due Date, Assignee) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {task.dueDate && (
              <div className="p-3 rounded-2xl glass-panel border border-slate-200/60 dark:border-slate-800 flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-brand-500 dark:text-brand-400 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400">{t('dueDateLabel')}</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatTaskDate(task.dueDate, lang, true)}
                  </p>
                </div>
              </div>
            )}

            {task.assignedTo && (
              <div className="p-3 rounded-2xl glass-panel border border-slate-200/60 dark:border-slate-800 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                  {task.assignedTo.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400">{t('assigneeLabel')}</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {task.assignedTo.name} ({task.assignedTo.email})
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 5. Integrated Comments & Discussion */}
          <TaskDetailComments
            comments={comments}
            currentUserId={user?.id}
            onDeleteComment={handleDeleteComment}
            onSendComment={handleSendComment}
            submittingComment={submittingComment}
            lang={lang}
            t={t}
          />
        </div>
      ) : null}
    </Modal>
  );
};
