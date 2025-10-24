const router = require('express').Router();
const { param, body, validationResult } = require('express-validator');
const { authRequired } = require('../middleware/auth');
const { superAdminRequired } = require('../middleware/admin');
const User = require('../models/User');
const Trade = require('../models/Trade');
const TradeSession = require('../models/TradeSession');
const TradeAudit = require('../models/TradeAudit');

function sendValidationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
}

// GET /api/admin/users - list recent users
router.get('/users', authRequired, superAdminRequired, async (req, res) => {
  const users = await User.find({}, 'name email role active suspended banned createdAt').sort({ createdAt: -1 }).limit(50);
  res.json(users);
});

// PUT /api/admin/users/:id/suspend
router.put('/users/:id/suspend', authRequired, superAdminRequired, [param('id').isMongoId()], async (req, res) => {
  sendValidationErrors(req, res);
  const { id } = req.params;
  const user = await User.findByIdAndUpdate(id, { suspended: true }, { new: true }).select('name email role active suspended banned');
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ message: 'User suspended', user });
});

// PUT /api/admin/users/:id/unsuspend
router.put('/users/:id/unsuspend', authRequired, superAdminRequired, [param('id').isMongoId()], async (req, res) => {
  sendValidationErrors(req, res);
  const { id } = req.params;
  const user = await User.findByIdAndUpdate(id, { suspended: false }, { new: true }).select('name email role active suspended banned');
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ message: 'User unsuspended', user });
});

// PUT /api/admin/users/:id/ban
router.put('/users/:id/ban', authRequired, superAdminRequired, [param('id').isMongoId()], async (req, res) => {
  sendValidationErrors(req, res);
  const { id } = req.params;
  const user = await User.findByIdAndUpdate(id, { banned: true, active: false }, { new: true }).select('name email role active suspended banned');
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ message: 'User banned', user });
});

// PUT /api/admin/users/:id/unban
router.put('/users/:id/unban', authRequired, superAdminRequired, [param('id').isMongoId()], async (req, res) => {
  sendValidationErrors(req, res);
  const { id } = req.params;
  const user = await User.findByIdAndUpdate(id, { banned: false, active: true }, { new: true }).select('name email role active suspended banned');
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ message: 'User unbanned', user });
});

// GET /api/admin/trades - list trades (latest 100)
router.get('/trades', authRequired, superAdminRequired, async (req, res) => {
  const trades = await Trade.find({}).populate('fromUser', 'name').populate('toUser', 'name').populate('service', 'title price').sort({ createdAt: -1 }).limit(100);
  res.json(trades);
});

// GET /api/admin/sessions - list trade sessions
router.get('/sessions', authRequired, superAdminRequired, async (req, res) => {
  const sessions = await TradeSession.find({}).populate('participants.a', 'name').populate('participants.b', 'name').sort({ createdAt: -1 }).limit(100);
  res.json(sessions);
});

// GET /api/admin/audits - list trade audits
router.get('/audits', authRequired, superAdminRequired, async (req, res) => {
  const audits = await TradeAudit.find({}).sort({ createdAt: -1 }).limit(100);
  res.json(audits);
});

module.exports = router;