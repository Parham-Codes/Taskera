import { Server } from 'socket.io';
import mongoose from 'mongoose';
import { verifyAccessToken } from '../utils/token.js';
import { User, OrganizationMember } from '../models/index.js';

let io = null;

/**
 * Robust cookie string parser with zero external dependencies
 */
const parseCookies = (cookieString) => {
  if (!cookieString || typeof cookieString !== 'string') return {};
  return cookieString.split(';').reduce((acc, pair) => {
    const idx = pair.indexOf('=');
    if (idx < 0) return acc;
    const key = pair.substring(0, idx).trim();
    const val = pair.substring(idx + 1).trim();
    try {
      acc[key] = decodeURIComponent(val);
    } catch {
      acc[key] = val;
    }
    return acc;
  }, {});
};

/**
 * Resolves the room name for a given workspace
 * Organization format: workspace:{organizationId}
 * Personal format: workspace:personal:{userId}
 */
export const getWorkspaceRoom = (workspaceId, userId = null) => {
  if (!workspaceId) return userId ? `workspace:personal:${userId}` : null;
  const str = String(workspaceId?._id || workspaceId?.id || workspaceId);
  if (str === 'personal') {
    return userId ? `workspace:personal:${userId}` : 'workspace:personal';
  }
  if (str.startsWith('personal:')) {
    return `workspace:${str}`;
  }
  return `workspace:${str}`;
};

/**
 * Initialize Socket.IO server with CORS and JWT authentication middleware
 */
export const initSocketServer = (httpServer) => {
  const getClientOrigin = () => {
    const configured = process.env.CLIENT_URL || 'http://localhost:5173';
    try {
      return new URL(configured).origin;
    } catch {
      return configured.trim().replace(/\/+$/, '');
    }
  };

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        const clientOrigin = getClientOrigin();
        // Allow requests with no origin (e.g. tests/tools) or matching client origin
        if (!origin || origin === clientOrigin) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Socket Authentication Middleware
  io.use(async (socket, next) => {
    try {
      let token = null;

      // 1. Check cookies from handshake headers
      const cookies = parseCookies(socket.handshake.headers?.cookie);
      if (cookies.accessToken) {
        token = cookies.accessToken;
      }

      // 2. Fallback to auth payload
      if (!token && socket.handshake.auth?.token) {
        token = socket.handshake.auth.token;
      }

      // 3. Fallback to Authorization header
      if (!token && socket.handshake.headers?.authorization?.startsWith('Bearer ')) {
        token = socket.handshake.headers.authorization.split(' ')[1];
      }

      if (!token) {
        return next(new Error('Authentication error: Token required'));
      }

      let decoded;
      try {
        decoded = verifyAccessToken(token);
      } catch (err) {
        return next(new Error('Authentication error: Invalid or expired token'));
      }

      const user = await User.findById(decoded.sub)
        .select('_id name email')
        .lean();

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.user = {
        ...user,
        id: user._id.toString(),
      };

      next();
    } catch (err) {
      console.error('[Socket] Auth middleware error:', err?.message || err);
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;

    // Join user's personal workspace room by default
    const personalRoom = `workspace:personal:${userId}`;
    socket.join(personalRoom);

    // Handle joining a workspace room with strict RBAC boundary checks
    socket.on('workspace:join', async (data, callback) => {
      try {
        const workspaceId = typeof data === 'object' ? data?.workspaceId : data;

        if (!workspaceId) {
          callback?.({ success: false, error: 'workspaceId is required' });
          return;
        }

        // 1. Personal Workspace
        if (workspaceId === 'personal' || workspaceId === `personal:${userId}`) {
          socket.join(personalRoom);
          callback?.({ success: true, room: personalRoom });
          return;
        }

        // 2. Organization Workspace
        if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
          callback?.({ success: false, error: 'Invalid organization workspace ID' });
          return;
        }

        const member = await OrganizationMember.findOne({
          organizationId: workspaceId,
          userId: socket.user._id,
        }).lean();

        if (!member) {
          callback?.({
            success: false,
            error: 'Access denied: You are not a member of this workspace',
          });
          return;
        }

        const room = `workspace:${workspaceId}`;
        socket.join(room);
        callback?.({ success: true, room });
      } catch (err) {
        console.error('[Socket] workspace:join error:', err?.message || err);
        callback?.({ success: false, error: 'Failed to join workspace room' });
      }
    });

    // Handle leaving a workspace room
    socket.on('workspace:leave', (data, callback) => {
      try {
        const workspaceId = typeof data === 'object' ? data?.workspaceId : data;
        if (!workspaceId) return;

        let room;
        if (workspaceId === 'personal' || workspaceId === `personal:${userId}`) {
          room = personalRoom;
        } else {
          room = `workspace:${workspaceId}`;
        }

        socket.leave(room);
        callback?.({ success: true, room });
      } catch (err) {
        console.error('[Socket] workspace:leave error:', err?.message || err);
      }
    });

    socket.on('disconnect', () => {
      // Socket.io automatically cleans up room memberships on disconnect
    });
  });

  return io;
};

/**
 * Broadcast an event to members of a specific workspace
 * Format: workspace:{workspaceId} or workspace:personal:{userId}
 */
export const emitToWorkspace = (workspaceId, event, payload, targetUserId = null) => {
  if (!io) return;
  const room = getWorkspaceRoom(workspaceId, targetUserId);
  if (!room) return;

  io.to(room).emit(event, payload);
};

export const getIO = () => io;

