const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let ioInstance = null;

function initSocket(server, options = {}) {
  if (ioInstance) return ioInstance;
  ioInstance = new Server(server, {
    cors: {
      origin: options.allowedOrigins || [
        'http://localhost:8080',
        'http://127.0.0.1:8080',
        'http://localhost:8081',
        'http://127.0.0.1:8081',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
      ],
      credentials: true,
    }
  });

  ioInstance.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(); // allow anonymous but limited
      const secret = process.env.JWT_SECRET;
      const payload = jwt.verify(token, secret);
      socket.data.user = { id: payload.id, email: payload.email, name: payload.name };
      next();
    } catch (err) {
      // proceed without user context
      next();
    }
  });

  ioInstance.on('connection', (socket) => {
    const userId = socket.data?.user?.id;
    if (userId) {
      socket.join(`user:${userId}`);
    }
    socket.join('services');
    socket.emit('connected', { userId });
  });

  return ioInstance;
}

function getIO() {
  return ioInstance;
}

module.exports = { initSocket, getIO };