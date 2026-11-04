import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext.jsx';
import { useWorkspace } from './WorkspaceContext.jsx';
import { getSocketURL } from '../api/client.js';

const SocketContext = createContext({
  socket: null,
  isConnected: false,
  reconnectedAt: null,
  currentRoom: null,
});

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();

  const [isConnected, setIsConnected] = useState(false);
  const [reconnectedAt, setReconnectedAt] = useState(null);
  const [currentRoom, setCurrentRoom] = useState(null);

  const socketRef = useRef(null);
  const prevWorkspaceIdRef = useRef(null);
  const wasConnectedRef = useRef(false);

  // Compute active workspace identifier
  const activeWorkspaceId = activeWorkspace
    ? String(activeWorkspace.id || activeWorkspace._id)
    : user
    ? `personal:${user.id || user._id}`
    : null;

  // Initialize or teardown socket based on user authentication state
  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
        wasConnectedRef.current = false;
        setCurrentRoom(null);
      }
      return;
    }

    const socketUrl = getSocketURL();
    const socket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);

      // If reconnected after a prior connection drop, signal re-sync
      if (wasConnectedRef.current) {
        setReconnectedAt(Date.now());
      }
      wasConnectedRef.current = true;

      // Immediately join the current workspace room upon (re)connect
      if (activeWorkspaceId) {
        socket.emit('workspace:join', { workspaceId: activeWorkspaceId }, (res) => {
          if (res?.success) {
            setCurrentRoom(res.room);
          }
        });
      }
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      // If server disconnected the client intentionally, don't clear room yet;
      // Socket.IO will auto-reconnect if client is offline or network dropped.
    });

    socket.on('connect_error', (err) => {
      // Handled silently by socket.io-client reconnection logic
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      wasConnectedRef.current = false;
      setCurrentRoom(null);
    };
  }, [user]);

  // Handle Workspace switching: leave previous room and join new room
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !isConnected || !activeWorkspaceId) return;

    const prevId = prevWorkspaceIdRef.current;

    // Leave previous room if different
    if (prevId && prevId !== activeWorkspaceId) {
      socket.emit('workspace:leave', { workspaceId: prevId });
    }

    // Join new workspace room
    socket.emit('workspace:join', { workspaceId: activeWorkspaceId }, (res) => {
      if (res?.success) {
        setCurrentRoom(res.room);
      }
    });

    prevWorkspaceIdRef.current = activeWorkspaceId;
  }, [activeWorkspaceId, isConnected]);

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected,
        reconnectedAt,
        currentRoom,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);

