import { Server } from 'socket.io';

let io = null;
const userSockets = new Map(); // userId -> Set of socketIds

export const initSocket = (server, allowedOrigins) => {
  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Registration event so we map userId to connection
    socket.on('register', (userId) => {
      if (userId) {
        if (!userSockets.has(userId)) {
          userSockets.set(userId, new Set());
        }
        userSockets.get(userId).add(socket.id);
        console.log(`Registered user [${userId}] to socket [${socket.id}]`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
      // Clean registration map
      for (const [userId, socketIds] of userSockets.entries()) {
        if (socketIds.has(socket.id)) {
          socketIds.delete(socket.id);
          console.log(`Removed socket [${socket.id}] from user [${userId}]`);
          if (socketIds.size === 0) {
            userSockets.delete(userId);
            console.log(`User [${userId}] completely disconnected from sockets.`);
          }
          break;
        }
      }
    });
  });

  return io;
};

export const getIo = () => io;

export const sendNotificationToUser = (userId, notification) => {
  if (io && userId) {
    const socketIds = userSockets.get(userId);
    if (socketIds && socketIds.size > 0) {
      socketIds.forEach(socketId => {
        io.to(socketId).emit('notification', notification);
      });
      console.log(`Dispatched real-time notification to user [${userId}]`);
    }
  }
};

export const broadcastLeadUpdate = (leadId, lead) => {
  if (io) {
    io.emit('lead_updated', { leadId, lead });
    console.log(`Broadcasted lead_updated event for lead [${leadId}]`);
  }
};

export const broadcastUserUpdate = (userId, user) => {
  if (io) {
    io.emit('user_updated', { userId, user });
    console.log(`Broadcasted user_updated event for user [${userId}]`);
  }
};

export const broadcastAuditLogged = (log) => {
  if (io) {
    io.emit('audit_logged', log);
    console.log(`Broadcasted audit_logged event`);
  }
};
