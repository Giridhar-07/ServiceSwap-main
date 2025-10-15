const router = require('express').Router();
const { body, param, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const TradeSession = require('../models/TradeSession');
const TradeAudit = require('../models/TradeAudit');
const User = require('../models/User');
const { authRequired } = require('../middleware/auth');
const { getIO } = require('../socket');

const sessionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user?.id || req.ip,
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
  [
    param('id').isMongoId(),
    body('mfaA').isString().trim().isLength({ min: 6, max: 6 }),
    body('mfaB').isString().trim().isLength({ min: 6, max: 6 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { id } = req.params;
    const { mfaA, mfaB } = req.body;
    const session = await TradeSession.findById(id);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    if (!(session.confirmations.a && session.confirmations.b)) {
      return res.status(400).json({ error: 'Both users must confirm before finalization' });
    }
    if (mfaA !== session.mfa.a || mfaB !== session.mfa.b) {
      return res.status(403).json({ error: 'Invalid MFA codes' });
    }

    // Transfer items (domain-specific no-op here)
    session.status = 'finalized';
    session.auditLog.push({ event: 'finalized', data: {} });
    await session.save();

    await TradeAudit.create({
      session: session._id,
      fromUser: session.participants.a,
      toUser: session.participants.b,
      items: session.items,
      outcome: 'success',
    });

    const io = getIO();
    io.to(`user:${session.participants.a.toString()}`).emit('trade_session_finalized', { id });
    io.to(`user:${session.participants.b.toString()}`).emit('trade_session_finalized', { id });

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