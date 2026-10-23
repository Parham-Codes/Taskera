import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../../api/client.js';

/**
 * Custom hook to manage live task time tracking, intervals, start/stop actions and sync.
 */
export const useTaskTimer = ({ task, user, onTaskUpdated, setError }) => {
  const [activeSession, setActiveSession] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerBusy, setTimerBusy] = useState(false);
  const timerIntervalRef = useRef(null);

  // Sync activeSession from task timeLogs
  useEffect(() => {
    if (!task) {
      setActiveSession(null);
      setElapsedSeconds(0);
      return;
    }

    const ongoing = task.timeLogs?.find(
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
  }, [task?._id, task?.timeLogs, user?.id]);

  // Live ticking interval
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
  const startTimer = useCallback(async () => {
    if (timerBusy || !task) return;
    setTimerBusy(true);
    setError?.('');

    try {
      const res = await api.post(`/tasks/${task._id}/time/start`);
      if (res.data?.success) {
        const { activeLog, totalTimeSpent, task: populatedTask } = res.data.data;
        setActiveSession(activeLog);
        setElapsedSeconds(0);

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
  }, [timerBusy, task, onTaskUpdated, setError]);

  // Stop Timer
  const stopTimer = useCallback(async () => {
    if (timerBusy || !task || !activeSession) return;
    setTimerBusy(true);
    setError?.('');

    try {
      const res = await api.post(`/tasks/${task._id}/time/stop`);
      if (res.data?.success) {
        const { loggedSeconds, totalTimeSpent, log, task: populatedTask } =
          res.data.data;
        setActiveSession(null);
        setElapsedSeconds(0);

        const nextTask = populatedTask || {
          ...task,
          totalTimeSpent,
          timeLogs: (task.timeLogs || []).map((l) =>
            l._id === log._id ||
            (!l.endTime && (l.userId?._id || l.userId) === user?.id)
              ? { ...l, endTime: log.endTime, duration: loggedSeconds }
              : l
          ),
        };

        onTaskUpdated?.(nextTask);
        return nextTask;
      }
    } catch (err) {
      setError?.(err.response?.data?.message || 'Failed to stop timer');
    } finally {
      setTimerBusy(false);
    }
  }, [timerBusy, task, activeSession, user?.id, onTaskUpdated, setError]);

  return {
    activeSession,
    elapsedSeconds,
    timerBusy,
    startTimer,
    stopTimer,
  };
};
