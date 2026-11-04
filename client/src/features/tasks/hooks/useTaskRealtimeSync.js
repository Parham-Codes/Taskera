import { useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../../../context/SocketContext.jsx';

/**
 * Custom Hook: Real-Time Synchronization for Task Board
 * Seamlessly receives task creation, update, and deletion broadcasts from Socket.IO,
 * reconciling client state in-place without full page reloads.
 */
export const useTaskRealtimeSync = ({
  setAllTasks,
  onTaskCountsUpdate,
  onTasksUpdate,
  fetchTasks,
  activeWorkspace,
  user,
}) => {
  const { socket, isConnected, reconnectedAt } = useSocket();

  const fetchTasksRef = useRef(fetchTasks);
  fetchTasksRef.current = fetchTasks;

  const onTasksUpdateRef = useRef(onTasksUpdate);
  onTasksUpdateRef.current = onTasksUpdate;

  const onTaskCountsUpdateRef = useRef(onTaskCountsUpdate);
  onTaskCountsUpdateRef.current = onTaskCountsUpdate;

  const currentUserId = String(user?.id || user?._id || '');
  const activeWorkspaceId = activeWorkspace
    ? String(activeWorkspace.id || activeWorkspace._id)
    : currentUserId
    ? `personal:${currentUserId}`
    : null;

  const activeWorkspaceIdRef = useRef(activeWorkspaceId);
  activeWorkspaceIdRef.current = activeWorkspaceId;

  // Helper to re-compute sidebar task counts whenever state updates
  const computeAndEmitCounts = useCallback(
    (tasksList) => {
      if (!onTaskCountsUpdateRef.current) return;
      const now = Date.now();
      const counts = {
        all: tasksList.length,
        inProgress: tasksList.filter(
          (t) => t.status === 'in-progress' || t.status === 'review'
        ).length,
        myTasks: tasksList.filter((t) => {
          const assignees = Array.isArray(t.assignedTo)
            ? t.assignedTo
            : t.assignedTo ? [t.assignedTo] : [];
          return assignees.some((a) => String(a?._id || a?.id || a) === currentUserId);
        }).length,
        dueSoon: tasksList.filter((t) => {
          if (!t.dueDate || t.status === 'completed') return false;
          const due = new Date(t.dueDate).getTime();
          return due >= now && due <= now + 3 * 24 * 60 * 60 * 1000;
        }).length,
        completed: tasksList.filter((t) => t.status === 'completed').length,
      };
      onTaskCountsUpdateRef.current(counts);
    },
    [currentUserId]
  );

  // Re-synchronize full tasks list when connection recovers after a drop
  useEffect(() => {
    if (reconnectedAt) {
      fetchTasksRef.current?.();
    }
  }, [reconnectedAt]);

  // Attach Socket.IO listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    // 1. Task Created Listener
    const handleTaskCreated = (data) => {
      if (!data?.task?._id) return;

      // Verify workspace tenant boundary
      if (
        data.workspaceId &&
        activeWorkspaceIdRef.current &&
        String(data.workspaceId) !== activeWorkspaceIdRef.current
      ) {
        return;
      }

      setAllTasks((prev) => {
        const taskId = String(data.task._id);
        const existingIndex = prev.findIndex((t) => String(t._id) === taskId);

        let next;
        if (existingIndex !== -1) {
          // If already in list (e.g. current user's optimistic insert), update with server populated data
          next = prev.map((t, i) => (i === existingIndex ? { ...t, ...data.task } : t));
        } else {
          // Prepend newly created task
          next = [data.task, ...prev];
        }

        computeAndEmitCounts(next);
        onTasksUpdateRef.current?.(next);
        return next;
      });
    };

    // 2. Task Updated Listener
    const handleTaskUpdated = (data) => {
      if (!data?.task?._id) return;

      if (
        data.workspaceId &&
        activeWorkspaceIdRef.current &&
        String(data.workspaceId) !== activeWorkspaceIdRef.current
      ) {
        return;
      }

      setAllTasks((prev) => {
        const targetId = String(data.task._id);
        const exists = prev.some((t) => String(t._id) === targetId);

        let next;
        if (!exists) {
          // If task not currently in state, prepend it
          next = [data.task, ...prev];
        } else {
          next = prev.map((t) => (String(t._id) === targetId ? { ...t, ...data.task } : t));
        }

        // If a recurring routine task spawned the next iteration task
        if (data.nextTask?._id) {
          const nextTargetId = String(data.nextTask._id);
          const nextExists = next.some((t) => String(t._id) === nextTargetId);
          if (!nextExists) {
            next = [data.nextTask, ...next];
          } else {
            next = next.map((t) =>
              String(t._id) === nextTargetId ? { ...t, ...data.nextTask } : t
            );
          }
        }

        computeAndEmitCounts(next);
        onTasksUpdateRef.current?.(next);
        return next;
      });
    };

    // 3. Task Deleted Listener
    const handleTaskDeleted = (data) => {
      if (!data?.taskId) return;

      if (
        data.workspaceId &&
        activeWorkspaceIdRef.current &&
        String(data.workspaceId) !== activeWorkspaceIdRef.current
      ) {
        return;
      }

      setAllTasks((prev) => {
        const targetId = String(data.taskId);
        const next = prev.filter((t) => String(t._id) !== targetId);
        computeAndEmitCounts(next);
        onTasksUpdateRef.current?.(next);
        return next;
      });
    };

    socket.on('task:created', handleTaskCreated);
    socket.on('task:updated', handleTaskUpdated);
    socket.on('task:deleted', handleTaskDeleted);

    return () => {
      socket.off('task:created', handleTaskCreated);
      socket.off('task:updated', handleTaskUpdated);
      socket.off('task:deleted', handleTaskDeleted);
    };
  }, [socket, isConnected, setAllTasks, computeAndEmitCounts]);

  return { isConnected };
};

