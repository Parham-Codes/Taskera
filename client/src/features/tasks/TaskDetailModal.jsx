import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Square,
  Clock,
  Calendar,
  AlertCircle,
  User,
  MessageSquare,
  CheckCircle2,
  Trash2,
  Edit2,
  Send,
  Loader2,
  History,
  Timer as TimerIcon,
  Tag,
  CheckSquare,
  Check,
  Plus,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { Modal, Badge } from '../../components/ui/index.js';

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

  // Time Tracker State
  const [activeSession, setActiveSession] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerBusy, setTimerBusy] = useState(false);
  const timerIntervalRef = useRef(null);

  // Comments State
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Subtasks State
  const [newSubtaskInput, setNewSubtaskInput] = useState('');
  const [addingSubtask, setAddingSubtask] = useState(false);

  // Load Task & Comments
  useEffect(() => {
    if (!isOpen || !taskId) return;

    let isMounted = true;
    if (initialTask) {
      setTask(initialTask);
      setLoading(false);

      const ongoing = initialTask.timeLogs?.find(
        (log) => (log.userId?._id || log.userId) === user?.id && !log.endTime
      );
      if (ongoing) {
        setActiveSession(ongoing);
        const startMs = new Date(ongoing.startTime).getTime();
        setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
      } else {
        setActiveSession(null);
        setElapsedSeconds(0);
      }
    } else {
      setLoading(true);
    }
    setError('');

    const loadData = async () => {
      try {
        const [taskRes, commentsRes] = await Promise.all([
          api.get(`/tasks/${taskId}`),
          api.get(`/tasks/${taskId}/comments`).catch(() => ({ data: { data: { comments: [] } } })),
        ]);

        if (isMounted && taskRes.data?.success) {
          const fetchedTask = taskRes.data.data.task;
          setTask(fetchedTask);
          setComments(commentsRes.data?.data?.comments || []);

          // Check if current user has an ongoing unended timer
          const ongoing = fetchedTask.timeLogs?.find(
            (log) => (log.userId?._id || log.userId) === user?.id && !log.endTime
          );

          if (ongoing) {
            setActiveSession(ongoing);
            const startMs = new Date(ongoing.startTime).getTime();
            const currentElapsed = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
            setElapsedSeconds(currentElapsed);
          } else {
            setActiveSession(null);
            setElapsedSeconds(0);
          }
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
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isOpen, taskId, initialTask, user?.id]);

  // Live ticking timer
  useEffect(() => {
    if (activeSession) {
      const startMs = new Date(activeSession.startTime).getTime();
      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [activeSession]);

  // Start Timer
  const handleStartTimer = async () => {
    if (timerBusy || !task) return;
    setTimerBusy(true);
    setError('');

    try {
      const res = await api.post(`/tasks/${task._id}/time/start`);
      if (res.data?.success) {
        const { activeLog, taskStatus, totalTimeSpent, task: populatedTask } = res.data.data;
        setActiveSession(activeLog);
        setElapsedSeconds(0);

        const nextTask = {
          ...(populatedTask || task),
          status: 'in-progress',
          totalTimeSpent: totalTimeSpent || (populatedTask?.totalTimeSpent ?? task.totalTimeSpent),
          timeLogs: populatedTask?.timeLogs || (activeLog ? [...(task.timeLogs || []), activeLog] : (task.timeLogs || [])),
        };

        setTask(nextTask);
        onTaskUpdated?.(nextTask);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start timer');
    } finally {
      setTimerBusy(false);
    }
  };

  // Stop Timer
  const handleStopTimer = async () => {
    if (timerBusy || !task || !activeSession) return;
    setTimerBusy(true);
    setError('');

    try {
      const res = await api.post(`/tasks/${task._id}/time/stop`);
      if (res.data?.success) {
        const { loggedSeconds, totalTimeSpent, log, task: populatedTask } = res.data.data;
        setActiveSession(null);
        setElapsedSeconds(0);

        const nextTask = populatedTask || {
          ...task,
          totalTimeSpent,
          timeLogs: (task.timeLogs || []).map((l) =>
            l._id === log._id || (!l.endTime && (l.userId?._id || l.userId) === user?.id)
              ? { ...l, endTime: log.endTime, duration: loggedSeconds }
              : l
          ),
        };

        setTask(nextTask);
        onTaskUpdated?.(nextTask);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to stop timer');
    } finally {
      setTimerBusy(false);
    }
  };

  // Change Status
  const handleStatusChange = async (newStatus) => {
    try {
      const res = await api.patch(`/tasks/${task._id}`, { status: newStatus });
      if (res.data?.success) {
        setTask((prev) => ({ ...prev, status: newStatus }));
        onTaskUpdated?.(res.data.data.task);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status');
    }
  };

  // Post Comment
  const handleSendComment = async (e) => {
    e?.preventDefault();
    if (!newComment.trim() || submittingComment) return;

    setSubmittingComment(true);
    try {
      const res = await api.post(`/tasks/${task._id}/comments`, {
        content: newComment.trim(),
      });
      if (res.data?.success) {
        setComments((prev) => [...prev, res.data.data.comment]);
        setNewComment('');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Delete Comment
  const handleDeleteComment = async (commentId) => {
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
      (st._id === subtaskId || i === index) ? { ...st, completed: !st.completed } : st
    );
    const optimisticTask = { ...task, subtasks: updatedSubtasks };
    setTask(optimisticTask);
    onTaskUpdated?.(optimisticTask);

    try {
      if (subtaskId) {
        const res = await api.patch(`/tasks/${task._id}/subtasks/${subtaskId}/toggle`);
        if (res.data?.success && res.data.data.task) {
          setTask(res.data.data.task);
          onTaskUpdated?.(res.data.data.task);
        }
      } else {
        const res = await api.patch(`/tasks/${task._id}`, { subtasks: updatedSubtasks });
        if (res.data?.success && res.data.data.task) {
          setTask(res.data.data.task);
          onTaskUpdated?.(res.data.data.task);
        }
      }
    } catch (err) {
      console.error('Failed to toggle subtask:', err);
    }
  };

  const handleAddNewSubtask = async () => {
    if (!newSubtaskInput.trim() || !task || addingSubtask) return;
    setAddingSubtask(true);

    const newSubtask = { title: newSubtaskInput.trim(), completed: false };
    const nextSubtasks = [...(task.subtasks || []), newSubtask];

    const optimisticTask = { ...task, subtasks: nextSubtasks };
    setTask(optimisticTask);
    onTaskUpdated?.(optimisticTask);
    setNewSubtaskInput('');

    try {
      const res = await api.patch(`/tasks/${task._id}`, { subtasks: nextSubtasks });
      if (res.data?.success && res.data.data.task) {
        setTask(res.data.data.task);
        onTaskUpdated?.(res.data.data.task);
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
    setTask(optimisticTask);
    onTaskUpdated?.(optimisticTask);

    try {
      const res = await api.patch(`/tasks/${task._id}`, { subtasks: nextSubtasks });
      if (res.data?.success && res.data.data.task) {
        setTask(res.data.data.task);
        onTaskUpdated?.(res.data.data.task);
      }
    } catch (err) {
      console.error('Failed to delete subtask:', err);
    }
  };

  // Format Seconds into HH:MM:SS
  const formatStopwatch = (totalSec) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const toPersianNum = (val) => {
    if (lang !== 'fa') return String(val);
    return String(val).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
  };

  // Format Total Duration into readable text (e.g. 2h 15m or فارسی)
  const formatDurationText = (totalSec) => {
    if (!totalSec || totalSec <= 0) return `${toPersianNum(0)} ${t('minutesShort')}`;
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;

    const parts = [];
    if (hrs > 0) parts.push(`${toPersianNum(hrs)} ${t('hoursShort')}`);
    if (mins > 0) parts.push(`${toPersianNum(mins)} ${t('minutesShort')}`);
    if (hrs === 0 && mins === 0) parts.push(`${toPersianNum(secs)} ${t('secondsShort')}`);
    return parts.join(lang === 'fa' ? ' و ' : ' ');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString(lang === 'fa' ? 'fa-IR' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return lang === 'fa' ? `${toPersianNum(h)}:${toPersianNum(m)}` : `${h}:${m}`;
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
          <div className="space-y-3 pb-4 border-b border-slate-200/60 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                {task.title}
              </h2>

              <div className="flex items-center gap-2 flex-wrap">
                {task.categoryId && (
                  <span
                    className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs flex items-center gap-1.5"
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

                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                    task.priority === 'urgent'
                      ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
                      : task.priority === 'high'
                      ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30'
                      : task.priority === 'medium'
                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                      : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30'
                  }`}
                >
                  {t(task.priority)}
                </span>
              </div>
            </div>

            {/* Quick Status Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {[
                { id: 'todo', label: t('todo') },
                { id: 'in-progress', label: t('inProgress') },
                { id: 'review', label: t('review') },
                { id: 'completed', label: t('completed') },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => handleStatusChange(st.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                    task.status === st.id
                      ? 'bg-brand-500 text-white shadow-xs'
                      : 'glass-input text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {task.description && (
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line pt-2">
                {task.description}
              </p>
            )}
          </div>

          {/* 2. LIVE TIME TRACKER SECTION (Core Feature) */}
          <div className="glass-panel rounded-3xl p-4 sm:p-5 border border-brand-500/30 relative overflow-hidden space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    activeSession
                      ? 'bg-emerald-500 animate-ping'
                      : 'bg-slate-400 dark:bg-slate-600'
                  }`}
                />
                <h3 className="font-extrabold text-xs sm:text-sm tracking-tight text-slate-900 dark:text-white">
                  {t('timeTracking')}
                </h3>
              </div>

              {activeSession && (
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  {t('timerRunning')}
                </span>
              )}
            </div>

            {/* Stopwatch Display & Big Play/Stop Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center bg-slate-500/5 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800">
              {/* Live Clock Digits */}
              <div className="sm:col-span-7 flex flex-col items-center sm:items-start">
                <span className="text-[11px] font-semibold text-slate-400 mb-1">
                  {activeSession ? t('timerRunning') : t('duration')}
                </span>
                <div className="font-mono text-3xl sm:text-4xl font-extrabold tracking-wider text-slate-900 dark:text-white" dir="ltr">
                  {formatStopwatch(elapsedSeconds)}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="sm:col-span-5 flex items-center justify-center sm:justify-end gap-2.5">
                {!activeSession ? (
                  <button
                    onClick={handleStartTimer}
                    disabled={timerBusy}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
                  >
                    {timerBusy ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 fill-current" />
                    )}
                    <span>{t('startTimer')}</span>
                  </button>
                ) : (
                  <button
                    onClick={handleStopTimer}
                    disabled={timerBusy}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-[0.98] transition-all shadow-md shadow-rose-600/25 disabled:opacity-50"
                  >
                    {timerBusy ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Square className="w-4 h-4 fill-current" />
                    )}
                    <span>{t('stopTimer')}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Total Tracked Metric Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl glass-input">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {t('totalTimeSpent')}
                </p>
                <p className="text-sm sm:text-base font-extrabold text-brand-600 dark:text-brand-400 mt-0.5">
                  {formatDurationText(task.totalTimeSpent || 0)}
                </p>
              </div>

              <div className="p-3 rounded-2xl glass-input">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {t('workSessions')}
                </p>
                <p className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">
                  {(task.timeLogs || []).filter((l) => l.endTime).length} {t('workSessions')}
                </p>
              </div>
            </div>

            {/* Work Sessions History Logs */}
            <div className="pt-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-2">
                <History className="w-3.5 h-3.5" />
                <span>{t('sessionHistory')}</span>
              </div>

              {(!task.timeLogs || task.timeLogs.filter((l) => l.endTime).length === 0) ? (
                <div className="py-4 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  {t('noTimeLogs')}
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto divide-y divide-slate-200/50 dark:divide-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-800 text-xs">
                  {task.timeLogs
                    .filter((l) => l.endTime)
                    .slice()
                    .reverse()
                    .map((log, idx) => (
                      <div
                        key={log._id || idx}
                        className="p-3 flex items-center justify-between gap-3 hover:bg-slate-500/5 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <p className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                              {formatDate(log.startTime)}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {lang === 'fa'
                                ? `از ساعت ${formatTime(log.startTime)} تا ${formatTime(log.endTime)}`
                                : `${formatTime(log.startTime)} to ${formatTime(log.endTime)}`}
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 px-2.5 py-1 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold text-xs border border-brand-500/20 whitespace-nowrap">
                          {formatDurationText(log.duration)}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* 3. Subtasks / Checklist Section (Interactive) */}
          <div className="glass-panel rounded-3xl p-4 sm:p-5 border border-slate-200/60 dark:border-slate-800 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-brand-500" />
                <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                  {t('subtasks')}
                </h3>
              </div>

              {(task.subtasks?.length || 0) > 0 && (
                <span className="text-[11px] font-bold text-slate-500">
                  {task.subtasks.filter((s) => s.completed).length} / {task.subtasks.length} (
                  {Math.round(
                    (task.subtasks.filter((s) => s.completed).length / task.subtasks.length) * 100
                  )}
                  %)
                </span>
              )}
            </div>

            {/* Subtask Progress bar */}
            {(task.subtasks?.length || 0) > 0 && (
              <div className="w-full bg-slate-200/80 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    task.subtasks.filter((s) => s.completed).length === task.subtasks.length
                      ? 'bg-emerald-500'
                      : 'bg-brand-500'
                  }`}
                  style={{
                    width: `${Math.round(
                      (task.subtasks.filter((s) => s.completed).length / task.subtasks.length) * 100
                    )}%`,
                  }}
                />
              </div>
            )}

            {/* Subtasks List */}
            <div className="space-y-2 pt-1">
              {(task.subtasks || []).map((st, idx) => (
                <div
                  key={st._id || idx}
                  className="flex items-center justify-between p-2.5 rounded-2xl glass-input hover:border-brand-500/30 transition-colors text-xs"
                >
                  <button
                    type="button"
                    onClick={() => handleToggleSubtask(st._id, idx)}
                    className="flex items-center gap-2.5 text-start min-w-0 flex-1"
                  >
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                        st.completed
                          ? 'bg-brand-500 border-brand-500 text-white'
                          : 'border-slate-300 dark:border-slate-600 hover:border-brand-500'
                      }`}
                    >
                      {st.completed && <Check className="w-3 h-3" />}
                    </div>
                    <span
                      className={`font-medium truncate ${
                        st.completed
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {st.title}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteSubtask(st._id, idx)}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors ms-2"
                    title={t('delete')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {/* Add New Subtask Input inside modal */}
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={newSubtaskInput}
                  onChange={(e) => setNewSubtaskInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddNewSubtask();
                    }
                  }}
                  placeholder={t('subtaskPlaceholder')}
                  className="flex-1 px-3.5 py-2 text-xs rounded-xl glass-input focus:outline-none focus:ring-2 focus:ring-brand-500/40 text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleAddNewSubtask}
                  disabled={!newSubtaskInput.trim() || addingSubtask}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 transition-all flex items-center gap-1 shrink-0 shadow-2xs active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t('add')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 4. Task Metadata (Due Date, Assignee) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {task.dueDate && (
              <div className="p-3 rounded-2xl glass-panel border border-slate-200/60 dark:border-slate-800 flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-brand-500 dark:text-brand-400 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400">{t('dueDateLabel')}</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatDate(task.dueDate)}
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

          {/* 4. Integrated Comments & Discussion */}
          <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-brand-500" />
              <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                {t('commentsTitle')} ({comments.length})
              </h4>
            </div>

            {/* Comments List */}
            <div className="max-h-56 overflow-y-auto space-y-2.5 pe-1">
              {comments.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">{t('noComments')}</p>
              ) : (
                comments.map((c) => {
                  const isMine = (c.author?._id || c.author) === user?.id;
                  return (
                    <div
                      key={c._id}
                      className={`p-3 rounded-2xl text-xs space-y-1.5 ${
                        isMine
                          ? 'glass-panel border-brand-500/30 ms-4'
                          : 'bg-slate-100/70 dark:bg-slate-800/40 me-4'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {c.author?.name || t('you')}
                        </span>
                        <div className="flex items-center gap-2 text-slate-400">
                          <span>{formatDate(c.createdAt)}</span>
                          {isMine && (
                            <button
                              onClick={() => handleDeleteComment(c._id)}
                              className="text-slate-400 hover:text-red-500"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 whitespace-pre-line">
                        {c.content}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            {/* New Comment Input */}
            <form onSubmit={handleSendComment} className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={t('writeCommentPlaceholder')}
                className="flex-1 px-3.5 py-2 text-xs rounded-xl glass-input focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
              <button
                type="submit"
                disabled={!newComment.trim() || submittingComment}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 transition-all flex items-center gap-1 shadow-xs"
              >
                {submittingComment ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </Modal>
  );
};
