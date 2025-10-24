const router = require('express').Router();
const { body, param, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const TradeSession = require('../models/TradeSession');
const TradeAudit = require('../models/TradeAudit');
const User = require('../models/User');
const { authRequired } = require('../middleware/auth');
const { csrfOptional } = require('../middleware/security');
const { getIO } = require('../socket');

const sessionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => {
    const userId = req.user && req.user.id ? req.user.id : null;
    if (userId) return String(userId);
    const ipHeader = req.headers['x-forwarded-for'] || req.headers['x-real-ip'];
    const headerIp = Array.isArray(ipHeader) ? ipHeader[0] : ipHeader;
    const rawIp = headerIp || (req.socket && req.socket.remoteAddress) || req.ip;
    const ipStr = typeof rawIp === 'string' ? rawIp : '';
    // Normalize IPv6 forms to a stable key to avoid ERR_ERL_KEY_GEN_IPV6
    if (ipStr.includes(':')) return 'local_ipv6';
    return ipStr || 'unknown';
  },
});

function generateMfaCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function isExternalPayment(code = '') {
  const banned = ['PAYPAL', 'UPI', 'CASHAPP', 'CRYPTO', 'BTC', 'ETH'];
  return banned.includes(code.toUpperCase());
}

// Verify both users have trade license
async function verifyLicenses(userIdA, userIdB) {
  const users = await User.find({ _id: { $in: [userIdA, userIdB] } }, 'hasTradeLicense');
  if (users.length !== 2) return false;
  return users.every(u => u.hasTradeLicense);
}

// POST /api/trade-sessions - initiate session via command kmt @UserB
router.post(
  '/',
  authRequired,
  sessionLimiter,
  [
    body('command').isString().trim(),
    body('targetUserId').optional().isString().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { command, targetUserId } = req.body;
    const fromUserId = req.user.id;

    // Strict command validation: kmt @UserB
    const cmd = command.trim();
    const match = cmd.match(/^kmt\s+@([\w .-]{2,100})$/i);
    if (!match && !targetUserId) {
      return res.status(400).json({ error: 'Invalid trade command. Use kmt @UserName or provide targetUserId.' });
    }

    let toUser = null;
    try {
      if (targetUserId) {
        toUser = await User.findById(targetUserId);
      } else {
        const name = match[1];
        toUser = await User.findOne({ name: new RegExp(`^${name}$`, 'i') });
      }
    } catch (e) {
      return res.status(400).json({ error: 'Invalid target user.' });
    }
    if (!toUser) return res.status(404).json({ error: 'Target user not found' });
    if (toUser._id.toString() === fromUserId) return res.status(400).json({ error: 'Cannot trade with yourself' });

    // Verify trade licenses
    const ok = await verifyLicenses(fromUserId, toUser._id.toString());
    if (!ok) return res.status(403).json({ error: 'One or both users lack a trade license' });

    // Create session
    const session = await TradeSession.create({
      participants: { a: fromUserId, b: toUser._id },
      createdBy: fromUserId,
      status: 'open',
      items: { a: [], b: [] },
      confirmations: { a: false, b: false },
      mfa: { a: generateMfaCode(), b: generateMfaCode() },
      auditLog: [{ event: 'session_opened', data: { fromUserId, toUserId: toUser._id.toString() } }]
    });

    const io = getIO();
    io.to(`user:${fromUserId}`).emit('trade_session_opened', { id: session._id.toString() });
    io.to(`user:${toUser._id.toString()}`).emit('trade_session_opened', { id: session._id.toString() });

    res.status(201).json({
      id: session._id.toString(),
      status: session.status,
      participants: session.participants,
      mfaCodeForYou: session.mfa.a,
    });
  }
);

// PUT /api/trade-sessions/:id/items - add items for current user
router.put(
  '/:id/items',
  authRequired,
  sessionLimiter,
  [
    param('id').isMongoId(),
    body('items').isArray({ min: 1 }),
    body('items.*.code').isString().trim().matches(/^[A-Z0-9]{3,20}$/i),
    body('items.*.type').isString().isIn(['card', 'currency']),
    body('items.*.qty').optional().isInt({ min: 1, max: 1000 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { id } = req.params;
    const { items } = req.body;
    const userId = req.user.id;
    const session = await TradeSession.findById(id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (![session.participants.a.toString(), session.participants.b.toString()].includes(userId)) {
      return res.status(403).json({ error: 'Not a participant in this session' });
    }

    // Block external payment systems
    if (items.some(it => isExternalPayment(it.code))) {
      return res.status(400).json({ error: 'External payment systems are not allowed' });
    }

    const side = session.participants.a.toString() === userId ? 'a' : 'b';
    session.items[side] = items;
    session.status = 'review';
    session.auditLog.push({ event: 'items_updated', data: { side, itemsCount: items.length } });
    await session.save();

    const io = getIO();
    io.to(`user:${session.participants.a.toString()}`).emit('trade_session_items_updated', { id, side });
    io.to(`user:${session.participants.b.toString()}`).emit('trade_session_items_updated', { id, side });

    res.json({ id, status: session.status, items: session.items });
  }
);

// POST /api/trade-sessions/:id/confirm - confirm your items
router.post(
  '/:id/confirm',
  authRequired,
  [param('id').isMongoId()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { id } = req.params;
    const userId = req.user.id;
    const session = await TradeSession.findById(id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    const side = session.participants.a.toString() === userId ? 'a' : session.participants.b.toString() === userId ? 'b' : null;
    if (!side) return res.status(403).json({ error: 'Not a participant' });

    session.confirmations[side] = true;
    session.auditLog.push({ event: 'confirmed', data: { side } });
    if (session.confirmations.a && session.confirmations.b) {
      session.status = 'confirmed';
    }
    await session.save();

    const io = getIO();
    io.to(`user:${session.participants.a.toString()}`).emit('trade_session_confirmed', { id, side });
    io.to(`user:${session.participants.b.toString()}`).emit('trade_session_confirmed', { id, side });

    res.json({ id, status: session.status, confirmations: session.confirmations });
  }
);

// POST /api/trade-sessions/:id/finalize - finalize with MFA codes
router.post(
  '/:id/finalize',
  authRequired,
  csrfOptional(),
  sessionLimiter,
  [
    param('id').isMongoId(),
    body('mfaA').isString().trim().isLength({ min: 6, max: 6 }).isNumeric(),
    body('mfaB').isString().trim().isLength({ min: 6, max: 6 }).isNumeric(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { id } = req.params;
    const { mfaA, mfaB } = req.body;
    const userId = req.user.id;
    console.info('[tradeSessions:finalize:start]', { id, userId, mfaAProvided: mfaA, mfaBProvided: mfaB });

    const session = await TradeSession.findById(id);
    if (!session) {
      console.warn('[tradeSessions:finalize:denied]', { id, userId, reason: 'session_not_found' });
      return res.status(404).json({ error: 'Session not found' });
    }

    console.info('[tradeSessions:finalize:session_state]', {
      id,
      userId,
      sessionStatus: session.status,
      confirmationsA: session.confirmations.a,
      confirmationsB: session.confirmations.b,
      mfaAExpected: session.mfa.a,
      mfaBExpected: session.mfa.b,
      participantsA: session.participants.a.toString(),
      participantsB: session.participants.b.toString(),
    });

    // Must be participant
    if (![session.participants.a.toString(), session.participants.b.toString()].includes(userId)) {
      console.warn('[tradeSessions:finalize:denied]', { id, userId, reason: 'not_participant' });
      return res.status(403).json({ error: 'Not a participant in this session' });
    }

    // Prevent double finalization
    if (session.status === 'finalized') {
      console.warn('[tradeSessions:finalize:denied]', { id, userId, reason: 'already_finalized' });
      return res.status(400).json({ error: 'Session already finalized' });
    }

    // Both partners must have confirmed and session must be in confirmed state
    if (!(session.confirmations.a && session.confirmations.b)) {
      console.warn('[tradeSessions:finalize:denied]', { id, userId, reason: 'not_all_confirmed' });
      return res.status(400).json({ error: 'Both users must confirm before finalization' });
    }
    if (session.status !== 'confirmed') {
      console.warn('[tradeSessions:finalize:denied]', { id, userId, reason: 'session_not_confirmed_status' });
      return res.status(400).json({ error: 'Session not ready for finalization' });
    }

    // Verify MFA codes
    if (mfaA !== session.mfa.a || mfaB !== session.mfa.b) {
      console.warn('[tradeSessions:finalize:denied]', { id, userId, reason: 'invalid_mfa_codes' });
      return res.status(403).json({ error: 'Invalid MFA codes' });
    }

    // Transfer items (domain-specific no-op here)
    session.status = 'finalized';
    session.auditLog.push({ event: 'finalized', data: { by: userId } });
    await session.save();

    await TradeAudit.create({
      session: session._id,
      fromUser: session.participants.a,
      toUser: session.participants.b,
      items: {
        a: session.items.a.map(item => item.toObject()),
        b: session.items.b.map(item => item.toObject()),
      },
      outcome: 'success',
    });

    const io = getIO();
    io.to(`user:${session.participants.a.toString()}`).emit('trade_session_finalized', { id });
    io.to(`user:${session.participants.b.toString()}`).emit('trade_session_finalized', { id });

    console.info('[tradeSessions:finalize:success]', { id, userId });
    res.json({ id, status: session.status });
  }
);

// GET /api/trade-sessions/:id - fetch session (sanitized)
router.get('/:id', authRequired, [param('id').isMongoId()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { id } = req.params;
  const session = await TradeSession.findById(id).populate('participants.a', 'name').populate('participants.b', 'name');
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (![session.participants.a._id.toString(), session.participants.b._id.toString()].includes(req.user.id)) {
    return res.status(403).json({ error: 'Not a participant' });
  }
  res.json({
    id: session._id.toString(),
    status: session.status,
    participants: { a: session.participants.a, b: session.participants.b },
    items: session.items,
    confirmations: session.confirmations,
  });
});

module.exports = router;