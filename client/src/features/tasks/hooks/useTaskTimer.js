import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../../api/client.js';

/**
 * Custom hook to manage live task time tracking, intervals, start/stop actions and sync.
 */
export const useTaskTimer = ({ task, user, onTaskUpdated, setError }) => {
  const [activeSession, setActiveSession] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [pausedSubtaskId, setPausedSubtaskId] = useState(null);
  const [pausedElapsedSeconds, setPausedElapsedSeconds] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerBusy, setTimerBusy] = useState(false);
  const timerIntervalRef = useRef(null);

  // Sync activeSession from task timeLogs
  useEffect(() => {
    if (!task) {
      setActiveSession(null);
      setIsPaused(false);
      setElapsedSeconds(0);
      setPausedElapsedSeconds(0);
      setPausedSubtaskId(null);
      return;
    }

    const ongoing = task.timeLogs?.find(
      (log) => (log.userId?._id || log.userId) === user?.id && !log.endTime
    );

    if (ongoing) {
      setActiveSession(ongoing);
      setIsPaused(false);
      const startMs = new Date(ongoing.startTime).getTime();
      setElapsedSeconds(
        pausedElapsedSeconds + Math.max(0, Math.floor((Date.now() - startMs) / 1000))
      );
    } else if (!isPaused) {
      setActiveSession(null);
      setElapsedSeconds(0);
      setPausedElapsedSeconds(0);
      setPausedSubtaskId(null);
    }
  }, [task?._id, task?.timeLogs, user?.id, isPaused]);

  // Live ticking interval
  useEffect(() => {
    if (activeSession) {
      const startMs = new Date(activeSession.startTime).getTime();
      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds(
          pausedElapsedSeconds + Math.max(0, Math.floor((Date.now() - startMs) / 1000))
        );
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [activeSession, pausedElapsedSeconds]);

  // Start (or Resume) Timer
  const startTimer = useCallback(
    async (subtaskId = null) => {
      if (timerBusy || !task) return;
      setTimerBusy(true);
      setError?.('');

      try {
        const payload = subtaskId ? { subtaskId } : {};
        const res = await api.post(`/tasks/${task._id}/time/start`, payload);
        if (res.data?.success) {
          const { activeLog, totalTimeSpent, task: populatedTask } = res.data.data;
          setActiveSession(activeLog);
          setIsPaused(false);

          // If starting the same target that was paused, retain accumulated seconds; otherwise start fresh
          const isSameTarget =
            String(activeLog?.subtaskId || '') === String(pausedSubtaskId || '');
          if (!isSameTarget) {
            setPausedElapsedSeconds(0);
            setPausedSubtaskId(null);
            setElapsedSeconds(0);
          }

          const nextTask = {
            ...(populatedTask || task),
            status: 'in-progress',
            totalTimeSpent:
              totalTimeSpent || (populatedTask?.totalTimeSpent ?? task.totalTimeSpent),
            timeLogs:
              populatedTask?.timeLogs ||
              (activeLog ? [...(task.timeLogs || []), activeLog] : task.timeLogs || []),
          };

          onTaskUpdated?.(nextTask);
          return nextTask;
        }
      } catch (err) {
        setError?.(err.response?.data?.message || 'Failed to start timer');
      } finally {
        setTimerBusy(false);
      }
    },
    [timerBusy, task, pausedSubtaskId, onTaskUpdated, setError]
  );

  // Pause Timer (temporary stop without resetting session stopwatch)
  const pauseTimer = useCallback(
    async (subtaskId = null) => {
      if (timerBusy || !task || !activeSession) return;
      setTimerBusy(true);
      setError?.('');

      try {
        const targetSubtaskId = subtaskId || activeSession.subtaskId || null;
        const payload = targetSubtaskId ? { subtaskId: targetSubtaskId } : {};
        const res = await api.post(`/tasks/${task._id}/time/pause`, payload);
        if (res.data?.success) {
          const { totalTimeSpent, log, task: populatedTask } = res.data.data;

          // Freeze current elapsed seconds
          setPausedElapsedSeconds(elapsedSeconds);
          setPausedSubtaskId(targetSubtaskId);
          setIsPaused(true);
          setActiveSession(null);

          const nextTask = populatedTask || {
            ...task,
            totalTimeSpent,
            timeLogs: (task.timeLogs || []).map((l) =>
              l._id === log._id ? { ...l, ...log } : l
            ),
          };

          onTaskUpdated?.(nextTask);
          return nextTask;
        }
      } catch (err) {
        setError?.(err.response?.data?.message || 'Failed to pause timer');
      } finally {
        setTimerBusy(false);
      }
    },
    [timerBusy, task, activeSession, elapsedSeconds, onTaskUpdated, setError]
  );

  // Stop Timer (end session and reset stopwatch)
  const stopTimer = useCallback(
    async (subtaskId = null) => {
      if (timerBusy || !task) return;
      setTimerBusy(true);
      setError?.('');

      try {
        const targetSubtaskId =
          subtaskId || activeSession?.subtaskId || pausedSubtaskId || null;
        const payload = targetSubtaskId ? { subtaskId: targetSubtaskId } : {};
        const res = await api.post(`/tasks/${task._id}/time/stop`, payload);
        if (res.data?.success) {
          const { totalTimeSpent, task: populatedTask } = res.data.data;

          setActiveSession(null);
          setIsPaused(false);
          setPausedElapsedSeconds(0);
          setPausedSubtaskId(null);
          setElapsedSeconds(0);

          const nextTask = populatedTask || {
            ...task,
            totalTimeSpent: totalTimeSpent || task.totalTimeSpent,
          };

          onTaskUpdated?.(nextTask);
          return nextTask;
        }
      } catch (err) {
        setError?.(err.response?.data?.message || 'Failed to stop timer');
      } finally {
        setTimerBusy(false);
      }
    },
    [timerBusy, task, activeSession, pausedSubtaskId, onTaskUpdated, setError]
  );

  const activeSubtaskId = activeSession?.subtaskId || (isPaused ? pausedSubtaskId : null);

  return {
    activeSession,
    isPaused,
    activeSubtaskId,
    elapsedSeconds,
    timerBusy,
    startTimer,
    pauseTimer,
    stopTimer,
  };
};
