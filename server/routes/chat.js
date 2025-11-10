const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router({ mergeParams: true });
const mongoose = require('mongoose');
const ChatMessage = require('../models/ChatMessage');
const TradeSession = require('../models/TradeSession');
const { authRequired } = require('../middleware/auth');
const { encrypt, decrypt } = require('../utils/crypto');
const rateLimiters = new Map();

/**
 * Check if a string is a valid MongoDB ObjectId.
 * Ensures route parameters are validated before DB access.
 */
function isObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * Verify that the given user is a participant in the trade session.
 * Returns the session document if membership is valid, otherwise null.
 */
async function ensureSessionMember(sessionId, userId) {
  const session = await TradeSession.findById(sessionId).lean();
  if (!session) return null;
  if (!userId) return null;
  const userIdStr = typeof userId === 'string' ? userId : userId.toString();
  const isMember = session.participants?.a?.toString() === userIdStr || session.participants?.b?.toString() === userIdStr;
  return isMember ? session : null;
}

function rateLimit(key, maxPerMinute = 60) {
  const now = Date.now();
  const bucket = rateLimiters.get(key) || { ts: now, count: 0 };
  if (now - bucket.ts > 60_000) {
    bucket.ts = now;
    bucket.count = 0;
  }
  bucket.count += 1;
  rateLimiters.set(key, bucket);
  return bucket.count <= maxPerMinute;
}

// GET message history
/**
 * GET /api/trade-sessions/:id/messages
 * Fetch chat message history for a session the user participates in.
 */
router.get('/api/trade-sessions/:id/messages', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ message: 'Invalid session id' });
    const session = await ensureSessionMember(id, req.user?.id);
    if (!session) return res.status(403).json({ message: 'Not a participant of this session' });

    const messages = await ChatMessage.find({ session: id }).sort({ createdAt: 1 }).lean();
    const sanitized = messages.map(m => ({
      _id: m._id,
      session: m.session,
      sender: m.sender,
      // For E2EE, clients will use ciphertext; for server-encrypted, clients will decrypt contentEnc via key held server-side
      content: m.contentEnc ? decrypt(m.contentEnc) : null,
      contentEnc: m.contentEnc || null,
      ciphertext: m.ciphertext || null,
      attachments: m.attachments || [],
      readBy: (m.readBy || []).map(u => u.toString()),
      createdAt: m.createdAt,
      updatedAt: m.updatedAt
    }));
    res.json(sanitized);
  } catch (err) {
    console.error('[chat:get_messages:error]', { error: err?.message, stack: err?.stack });
    res.status(500).json({ message: 'Server error' });
  }
});

// POST a message to a session
/**
 * POST /api/trade-sessions/:id/messages
 * Send a chat message to a session. Supports plaintext (server-encrypted)
 * or client-provided ciphertext for E2EE flows.
 */
router.post(
  '/api/trade-sessions/:id/messages',
  authRequired,
  [
    body('content').optional().isString(),
    body('ciphertext').optional().isString(),
    body('attachments').optional().isArray()
  ],
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!isObjectId(id)) return res.status(400).json({ message: 'Invalid session id' });
      const session = await ensureSessionMember(id, req.user?.id);
      if (!session) return res.status(403).json({ message: 'Not a participant of this session' });

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const rateKey = `msg:${id}:${req.user?.id}`;
      if (!rateLimit(rateKey, 120)) return res.status(429).json({ message: 'Rate limit exceeded' });

      const { content, ciphertext, attachments } = req.body;
      if (!content && !ciphertext) return res.status(400).json({ message: 'Either content or ciphertext is required' });

      const doc = {
        session: id,
        sender: req.user?.id,
        contentEnc: null,
        ciphertext: ciphertext || null,
        attachments: Array.isArray(attachments) ? attachments : []
      };
      if (content) {
        // Server-side encryption; clients will request decryption on fetch (depending on policy)
        doc.contentEnc = encrypt(content);
      }
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

      // Broadcast via socket
      const { getIO } = require('../socket');
      const io = getIO();
      io.to(`session:${id}`).emit('chat:message', payload);

      res.status(201).json(payload);
    } catch (err) {
      console.error('[chat:post_message:error]', { error: err?.message, stack: err?.stack });
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// POST read receipt
/**
 * POST /api/trade-sessions/:id/read
 * Mark messages as read for the session, optionally a specific message.
 */
router.post('/api/trade-sessions/:id/read', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const { messageId } = req.body || {};
    if (!isObjectId(id)) return res.status(400).json({ message: 'Invalid session id' });
    const session = await ensureSessionMember(id, req.user?.id);
    if (!session) return res.status(403).json({ message: 'Not a participant of this session' });

    let filter = { session: id };
    if (messageId && isObjectId(messageId)) filter._id = messageId;

    const result = await ChatMessage.updateMany(filter, { $addToSet: { readBy: req.user?.id } });

    const { getIO } = require('../socket');
    const io = getIO();
    io.to(`session:${id}`).emit('chat:read', { sessionId: id, messageId: messageId || null, by: req.user?.id });

    res.json({ updated: result.modifiedCount });
  } catch (err) {
    console.error('[chat:read:error]', { error: err?.message, stack: err?.stack });
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;