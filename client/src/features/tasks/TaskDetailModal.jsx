import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, Trash2, Edit2, Loader2, Timer as TimerIcon } from 'lucide-react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { Modal, ConfirmModal } from '../../components/ui/index.js';
import { useTaskTimer } from './hooks/useTaskTimer.js';
import { useTaskComments } from './hooks/useTaskComments.js';
import {
  TaskDetailHeader,
  TaskDetailTimeTracker,
  TaskDetailSubtasks,
  TaskDetailComments,
  TaskDetailMetadata,
} from './components/detail/index.js';

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
  const [addingSubtask, setAddingSubtask] = useState(false);

  // Refs to decouple background fetching from subtask mutations
  const initialTaskRef = useRef(initialTask);
  initialTaskRef.current = initialTask;
  const isSubtaskMutatingRef = useRef(false);

  const handleTaskUpdatedInternal = (updatedTask) => {
    setTask(updatedTask);
    onTaskUpdated?.(updatedTask);
  };

  // Determine user permissions for timer
  const isPersonal = !task?.organizationId;
  const currentUserId = String(user?.id || user?._id || '');
  const isCreator = String(task?.createdBy?._id || task?.createdBy || '') === currentUserId;
  const assignees = Array.isArray(task?.assignedTo)
    ? task.assignedTo
    : task?.assignedTo ? [task.assignedTo] : [];
  const isAssignee = assignees.some((a) => String(a?._id || a?.id || a) === currentUserId);
  const canTrackTime = isPersonal ? isCreator : isAssignee;

  // Custom Time Tracking Hook
  const {
    activeSession,
    isPaused,
    activeSubtaskId,
    elapsedSeconds,
    timerBusy,
    startTimer,
    pauseTimer,
    stopTimer,
  } = useTaskTimer({
    task,
    user,
    onTaskUpdated: handleTaskUpdatedInternal,
    setError,
  });

  // Custom Comments Hook
  const {
    comments,
    isMuted,
    canMute,
    mutingLoading,
    submittingComment,
    commentToDelete,
    deletingCommentId,
    setCommentToDelete,
    setInitialCommentsData,
    handleToggleMute,
    handleSendComment,
    handleRequestDeleteComment,
    handleConfirmDeleteComment,
  } = useTaskComments({
    task,
    setError,
  });

  // Load Task & Comments
  useEffect(() => {
    if (!isOpen || !taskId) return;

    let isMounted = true;
    const seedTask = initialTaskRef.current;
    if (seedTask && String(seedTask._id) === String(taskId)) {
      setTask(seedTask);
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
          setTask((current) => {
            if (
              isSubtaskMutatingRef.current &&
              current &&
              String(current._id) === String(fetchedTask._id)
            ) {
              return {
                ...fetchedTask,
                subtasks: current.subtasks || fetchedTask.subtasks,
              };
            }
            return fetchedTask;
          });

          setInitialCommentsData({
            comments: commentsRes.data?.data?.comments || [],
            isMuted: Boolean(commentsRes.data?.data?.meta?.isMuted),
            canMute: Boolean(commentsRes.data?.data?.meta?.canMute),
          });
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
  }, [isOpen, taskId]);

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

  // Subtask Handlers
  const handleToggleSubtask = async (subtaskId, index) => {
    if (!task) return;

    const previousTask = task;
    isSubtaskMutatingRef.current = true;

    const updatedSubtasks = (task.subtasks || []).map((st, i) => {
      const isMatch = subtaskId
        ? String(st._id) === String(subtaskId)
        : i === index;
      return isMatch ? { ...st, completed: !st.completed } : st;
    });

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
      handleTaskUpdatedInternal(previousTask);
      setError(err.response?.data?.message || 'Failed to toggle subtask');
    } finally {
      isSubtaskMutatingRef.current = false;
    }
  };

  const handleAddNewSubtask = async (title) => {
    if (!title || !task || addingSubtask) return;
    setAddingSubtask(true);
    isSubtaskMutatingRef.current = true;

    const previousTask = task;
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
      handleTaskUpdatedInternal(previousTask);
      setError(err.response?.data?.message || 'Failed to add subtask');
    } finally {
      setAddingSubtask(false);
      isSubtaskMutatingRef.current = false;
    }
  };

  const handleDeleteSubtask = async (subtaskId, index) => {
    if (!task) return;
    isSubtaskMutatingRef.current = true;

    const previousTask = task;
    const nextSubtasks = (task.subtasks || []).filter((st, i) =>
      subtaskId ? String(st._id) !== String(subtaskId) : i !== index
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
      handleTaskUpdatedInternal(previousTask);
      setError(err.response?.data?.message || 'Failed to delete subtask');
    } finally {
      isSubtaskMutatingRef.current = false;
    }
  };

  if (!isOpen) return null;

  return (
    <>
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
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title={t('edit')}
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  onDeleteTask?.(task._id);
                  onClose();
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
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
              canTrackTime={canTrackTime}
              activeSession={activeSession}
              isPaused={isPaused}
              activeSubtaskId={activeSubtaskId}
              elapsedSeconds={elapsedSeconds}
              timerBusy={timerBusy}
              onStartTimer={startTimer}
              onPauseTimer={pauseTimer}
              onStopTimer={stopTimer}
              lang={lang}
              t={t}
            />

            {/* 3. Subtasks / Checklist */}
            <TaskDetailSubtasks
              subtasks={task.subtasks || []}
              canTrackTime={canTrackTime}
              activeSubtaskId={activeSubtaskId}
              isPaused={isPaused}
              activeSession={activeSession}
              subtaskElapsedSeconds={elapsedSeconds}
              timerBusy={timerBusy}
              onStartSubtaskTimer={(stId) => startTimer(stId)}
              onPauseSubtaskTimer={(stId) => pauseTimer(stId)}
              onStopSubtaskTimer={(stId) => stopTimer(stId)}
              onToggleSubtask={handleToggleSubtask}
              onDeleteSubtask={handleDeleteSubtask}
              onAddSubtask={handleAddNewSubtask}
              addingSubtask={addingSubtask}
              lang={lang}
              t={t}
            />

            {/* 4. Task Metadata (Due Date, Assignee) */}
            <TaskDetailMetadata
              task={task}
              lang={lang}
              t={t}
            />

            {/* 5. Integrated Comments & Discussion */}
            <TaskDetailComments
              comments={comments}
              currentUser={user}
              currentUserId={user?.id}
              onDeleteComment={handleRequestDeleteComment}
              deletingCommentId={deletingCommentId}
              onSendComment={handleSendComment}
              submittingComment={submittingComment}
              isMuted={isMuted}
              canMute={canMute}
              onToggleMute={handleToggleMute}
              mutingLoading={mutingLoading}
              lang={lang}
              t={t}
            />
          </div>
        ) : null}
      </Modal>

      {/* Confirm Delete Comment Modal */}
      <ConfirmModal
        isOpen={Boolean(commentToDelete)}
        onClose={() => !deletingCommentId && setCommentToDelete(null)}
        onConfirm={handleConfirmDeleteComment}
        title={t('confirmDeleteCommentTitle')}
        description={t('confirmDeleteCommentDesc')}
        confirmText={t('confirmDeleteBtn')}
        cancelText={t('cancel')}
        variant="danger"
        loading={Boolean(deletingCommentId)}
      />
    </>
  );
};
