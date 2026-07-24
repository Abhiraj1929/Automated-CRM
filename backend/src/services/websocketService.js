const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');

class WebSocketService {
  constructor() {
    this.io = null;
    this.clients = new Map(); // userId -> Set<socket>
  }

  init(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: true,
      },
      path: '/ws',
    });

    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;
        if (!token) return next(new Error('Authentication required'));

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id || decoded.userId;
        socket.userRole = decoded.role;
        next();
      } catch (err) {
        next(new Error('Invalid token'));
      }
    });

    this.io.on('connection', (socket) => {
      const userId = socket.userId;
      if (!userId) return;

      // Track connected user
      if (!this.clients.has(userId)) this.clients.set(userId, new Set());
      this.clients.get(userId).add(socket);

      console.log(`🔌 User connected: ${userId} (${this.clients.get(userId).size} sockets)`);

      // Join user-specific room
      socket.join(`user:${userId}`);

      socket.on('disconnect', () => {
        const userSockets = this.clients.get(userId);
        if (userSockets) {
          userSockets.delete(socket);
          if (userSockets.size === 0) this.clients.delete(userId);
        }
        console.log(`🔌 User disconnected: ${userId}`);
      });
    });

    console.log('✅ WebSocket service initialized');
  }

  // Send to specific user
  toUser(userId, event, data) {
    if (!this.io) return;
    this.io.to(`user:${userId}`).emit(event, data);
  }

  // Broadcast to all connected users
  broadcast(event, data) {
    if (!this.io) return;
    this.io.emit(event, data);
  }

  // Send notification with real-time push
  async sendNotification({ userId, title, message, type, entityType, entityId, actionUrl }) {
    // Save to database
    const { data } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type: type || 'info',
        entity_type: entityType,
        entity_id: entityId,
        action_url: actionUrl,
      })
      .select()
      .single();

    // Push via WebSocket
    this.toUser(userId, 'notification', {
      id: data?.id,
      title,
      message,
      type,
      entityType,
      entityId,
      actionUrl,
      createdAt: new Date().toISOString(),
    });

    return data;
  }

  // Broadcast entity changes (lead updated, opportunity stage changed, etc.)
  broadcastEntityChange(entityType, entityId, action, data) {
    this.broadcast('entity:change', {
      entityType,
      entityId,
      action,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  getConnectedUsers() {
    return Array.from(this.clients.keys());
  }

  isUserOnline(userId) {
    return this.clients.has(userId) && this.clients.get(userId).size > 0;
  }
}

module.exports = new WebSocketService();
