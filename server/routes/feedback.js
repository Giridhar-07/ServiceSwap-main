const router = require('express').Router();
const { body, param, validationResult } = require('express-validator');
const { authRequired } = require('../middleware/auth');
const Feedback = require('../models/Feedback');
const Trade = require('../models/Trade');

function errorsOrNull(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
}

// POST /api/feedback - create feedback for a completed trade
router.post('/', authRequired, [
  body('tradeId').isMongoId(),
  body('rating').isInt({ min: 1, max: 5 }),
  body('comment').optional().isString().isLength({ max: 2000 }),
], async (req, res) => {
  errorsOrNull(req, res);
  const { tradeId, rating, comment } = req.body;
  const userId = req.user.id;

  const trade = await Trade.findById(tradeId).select('status fromUser toUser');
  if (!trade) return res.status(404).json({ error: 'Trade not found' });
  if (trade.status !== 'completed') return res.status(400).json({ error: 'Feedback allowed only for completed trades' });
  const isParticipant = [trade.fromUser.toString(), trade.toUser.toString()].includes(userId);
  if (!isParticipant) return res.status(403).json({ error: 'Not a participant in this trade' });

  const toUser = trade.fromUser.toString() === userId ? trade.toUser : trade.fromUser;

  try {
    const fb = await Feedback.create({ trade: trade._id, fromUser: userId, toUser, rating, comment });
    res.status(201).json(fb);
  } catch (e) {
    if (e.code === 11000) {
      return res.status(409).json({ error: 'Feedback already submitted for this trade by you' });
    }
    console.error('[feedback:create:error]', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/feedback/trade/:id - list feedback entries for a trade
router.get('/trade/:id', authRequired, [param('id').isMongoId()], async (req, res) => {
  errorsOrNull(req, res);
  const { id } = req.params;
  const fbs = await Feedback.find({ trade: id }).populate('fromUser', 'name').populate('toUser', 'name').sort({ createdAt: -1 });
  res.json(fbs);
});

module.exports = router;