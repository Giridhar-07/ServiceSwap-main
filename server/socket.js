const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const TradeSession = require('./models/TradeSession');
const ChatMessage = require('./models/ChatMessage');
const { encrypt, decrypt } = require('./utils/crypto');

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

    // Join a trade session room after verifying membership
    socket.on('join_session', async ({ sessionId }) => {
      try {
        if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) return;
        const session = await TradeSession.findById(sessionId).lean();
        if (!session) return;
        const isMember = userId && (session.participants?.a?.toString() === userId || session.participants?.b?.toString() === userId);
        if (!isMember) return;
        socket.join(`session:${sessionId}`);
        socket.emit('session_joined', { id: sessionId });
      } catch (e) {
        // ignore
      }
    });

    // Real-time chat message (optional if using REST); persist then broadcast
    socket.on('chat:message', async ({ sessionId, content, ciphertext, attachments }) => {
      try {
        if (!userId) return;
        if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) return;
        const session = await TradeSession.findById(sessionId).lean();
        if (!session) return;
        const isMember = session.participants?.a?.toString() === userId || session.participants?.b?.toString() === userId;
        if (!isMember) return;
        if (!content && !ciphertext) return;
        const doc = {
          session: sessionId,
          sender: userId,
          contentEnc: content ? encrypt(content) : null,
          ciphertext: ciphertext || null,
          attachments: Array.isArray(attachments) ? attachments : []
        };
        const msg = await ChatMessage.create(doc);
        const payload = {
          _id: msg._id,
          session: msg.session,
          sender: msg.sender,
          content: msg.contentEnc ? decrypt(msg.contentEnc) : null,
          contentEnc: msg.contentEnc,
          ciphertext: msg.ciphertext,
          attachments: msg.attachments,
          readBy: [],
          createdAt: msg.createdAt
        };
        ioInstance.to(`session:${sessionId}`).emit('chat:message', payload);
      } catch (e) {
        // ignore
      }
    });

    // Typing indicator
    socket.on('chat:typing', async ({ sessionId, isTyping }) => {
      try {
        if (!userId) return;
        if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) return;
        const session = await TradeSession.findById(sessionId).lean();
        if (!session) return;
        const isMember = session.participants?.a?.toString() === userId || session.participants?.b?.toString() === userId;
        if (!isMember) return;
        socket.to(`session:${sessionId}`).emit('chat:typing', { sessionId, userId, isTyping: !!isTyping });
      } catch (e) {
        // ignore
      }
    });

    // Read receipts
    socket.on('chat:read', async ({ sessionId, messageId }) => {
      try {
        if (!userId) return;
        if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) return;
        const session = await TradeSession.findById(sessionId).lean();
        if (!session) return;
        const isMember = session.participants?.a?.toString() === userId || session.participants?.b?.toString() === userId;
        if (!isMember) return;
        const filter = { session: sessionId };
        if (messageId && mongoose.Types.ObjectId.isValid(messageId)) filter._id = messageId;
        await ChatMessage.updateMany(filter, { $addToSet: { readBy: userId } });
        ioInstance.to(`session:${sessionId}`).emit('chat:read', { sessionId, messageId: messageId || null, by: userId });
      } catch (e) {
        // ignore
      }
    });
  });

  return ioInstance;
}

function getIO() {
  return ioInstance;
}

module.exports = { initSocket, getIO };