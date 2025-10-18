const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const Trade = require('../models/Trade');
const User = require('../models/User');
const Service = require('../models/Service');
const { authRequired } = require('../middleware/auth');
const mongoose = require('mongoose');

// Get socket.io instance
const { getIO } = require('../socket');

/**
 * @route   GET /api/trades
 * @desc    Get all trades for the authenticated user
 * @access  Private
 */
router.get('/', authRequired, async (req, res) => {
  try {
    const userId = req.user.id;
    console.info('[trades:list:start]', { userId });

    // Find trades where the user is either the sender or receiver
    const trades = await Trade.find({
      $or: [
        { fromUser: userId },
        { toUser: userId }
      ]
    })
    .populate('fromUser', 'name email avatar')
    .populate('toUser', 'name email avatar')
    .populate('service', 'title description price category')
    .sort({ createdAt: -1 });

    console.info('[trades:list:success]', { userId, count: trades.length });
    return res.json(trades);
  } catch (err) {
    console.error('[trades:list:error]', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/trades
 * @desc    Create a new trade offer
 * @access  Private
 */
router.post('/', 
  authRequired,
  [
    body('serviceId').notEmpty().withMessage('Service ID is required'),
    body('offerPrice').isNumeric().withMessage('Offer price must be a number'),
    body('message').optional().isString().withMessage('Message must be a string'),
    body('tradeDetails').optional().isObject().withMessage('Trade details must be an object')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { serviceId, offerPrice, message, tradeDetails } = req.body;
    const fromUserId = req.user.id;

    try {
      console.info('[trades:create:start]', { fromUserId, serviceId, offerPrice });
      // Find the service
      const service = await Service.findById(serviceId);
      if (!service) {
        return res.status(404).json({ message: 'Service not found' });
      }
      // Ensure the service has an owner to avoid TypeError on toString
      if (!service.seller) {
        console.warn('[trades:create:block:no_owner]', { serviceId });
        return res.status(400).json({ message: 'Service is missing owner information' });
      }

      // Check if user is trying to trade with themselves
      if (service.seller.toString() === fromUserId) {
        return res.status(400).json({ message: 'Cannot create a trade offer for your own service' });
      }

      // Create expiration date (48 hours from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48);

      // Create new trade
      const newTrade = new Trade({
        fromUser: fromUserId,
        toUser: service.seller,
        service: serviceId,
        offerPrice,
        originalPrice: service.price,
        message: message || '',
        status: 'pending',
        expiresAt,
        tradeDetails: tradeDetails || {},
        escrowStatus: 'none',
        verificationRequired: false,
        tradeProtectionLevel: 'basic'
      });

      await newTrade.save();

      // Populate the trade with user and service details for the response
      const populatedTrade = await Trade.findById(newTrade._id)
        .populate('fromUser', 'name email avatar')
        .populate('toUser', 'name email avatar')
        .populate('service', 'title description price category');

      // Emit socket event to the service owner
      const io = getIO();
      io.to(`user:${service.seller}`).emit('new_trade_offer', populatedTrade);

      console.info('[trades:create:success]', { tradeId: populatedTrade._id.toString(), fromUserId, toUserId: service.seller.toString() });
      return res.status(201).json(populatedTrade);
    } catch (err) {
      console.error('[trades:create:error]', err);
      return res.status(500).json({ message: 'Server error' });
    }
  }
);

/**
 * @route   PUT /api/trades/:id/accept
 * @desc    Accept a trade offer
 * @access  Private
 */
router.put('/:id/accept', authRequired, async (req, res) => {
  try {
    const tradeId = req.params.id;
    const userId = req.user.id;
    console.info('[trades:accept:start]', { tradeId, userId });

    // Find the trade
    const trade = await Trade.findById(tradeId);
    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }

    // Check if user is the recipient of the trade
    if (trade.toUser.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to accept this trade' });
    }

    // Check if trade is in pending status
    if (trade.status !== 'pending') {
      return res.status(400).json({ message: `Cannot accept a trade that is ${trade.status}` });
    }

    // Update trade status
    trade.status = 'accepted';
    trade.acceptedAt = new Date();
    await trade.save();

    // Populate the trade with user and service details for the response
    const populatedTrade = await Trade.findById(tradeId)
      .populate('fromUser', 'name email avatar')
      .populate('toUser', 'name email avatar')
      .populate('service', 'title description price category');

    // Emit socket event to the trade creator
    const io = getIO();
    io.to(`user:${trade.fromUser}`).emit('trade_accepted', populatedTrade);

    console.info('[trades:accept:success]', { tradeId, userId });
    return res.json(populatedTrade);
  } catch (err) {
    console.error('[trades:accept:error]', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   PUT /api/trades/:id/decline
 * @desc    Decline a trade offer
 * @access  Private
 */
router.put('/:id/decline', authRequired, async (req, res) => {
  try {
    const tradeId = req.params.id;
    const userId = req.user.id;
    console.info('[trades:decline:start]', { tradeId, userId });

    // Find the trade
    const trade = await Trade.findById(tradeId);
    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }

    // Check if user is the recipient of the trade
    if (trade.toUser.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to decline this trade' });
    }

    // Check if trade is in pending status
    if (trade.status !== 'pending') {
      return res.status(400).json({ message: `Cannot decline a trade that is ${trade.status}` });
    }

    // Update trade status
    trade.status = 'declined';
    await trade.save();

    // Populate the trade with user and service details for the response
    const populatedTrade = await Trade.findById(tradeId)
      .populate('fromUser', 'name email avatar')
      .populate('toUser', 'name email avatar')
      .populate('service', 'title description price category');

    // Emit socket event to the trade creator
    const io = getIO();
    io.to(`user:${trade.fromUser}`).emit('trade_declined', populatedTrade);

    console.info('[trades:decline:success]', { tradeId, userId });
    return res.json(populatedTrade);
  } catch (err) {
    console.error('[trades:decline:error]', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   PUT /api/trades/:id/cancel
 * @desc    Cancel a trade offer (by the creator)
 * @access  Private
 */
router.put('/:id/cancel', authRequired, async (req, res) => {
  try {
    const tradeId = req.params.id;
    const userId = req.user.id;
    console.info('[trades:cancel:start]', { tradeId, userId });

    // Find the trade
    const trade = await Trade.findById(tradeId);
    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }

    // Check if user is the creator of the trade
    if (trade.fromUser.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to cancel this trade' });
    }

    // Check if trade is in pending status
    if (trade.status !== 'pending') {
      return res.status(400).json({ message: `Cannot cancel a trade that is ${trade.status}` });
    }

    // Update trade status
    trade.status = 'cancelled';
    await trade.save();

    // Populate the trade with user and service details for the response
    const populatedTrade = await Trade.findById(tradeId)
      .populate('fromUser', 'name email avatar')
      .populate('toUser', 'name email avatar')
      .populate('service', 'title description price category');

    // Emit socket event to the trade recipient
    const io = getIO();
    io.to(`user:${trade.toUser}`).emit('trade_cancelled', populatedTrade);

    console.info('[trades:cancel:success]', { tradeId, userId });
    return res.json(populatedTrade);
  } catch (err) {
    console.error('[trades:cancel:error]', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   PUT /api/trades/:id/complete
 * @desc    Complete a trade
 * @access  Private
 */
router.put('/:id/complete', authRequired, async (req, res) => {
  try {
    const tradeId = req.params.id;
    const userId = req.user.id;

    // Find the trade
    const trade = await Trade.findById(tradeId);
    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }

    // Check if user is involved in the trade
    if (trade.fromUser.toString() !== userId && trade.toUser.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to complete this trade' });
    }

    // Check if trade is in accepted status
    if (trade.status !== 'accepted') {
      return res.status(400).json({ message: `Cannot complete a trade that is ${trade.status}` });
    }

    // Update trade status
    trade.status = 'completed';
    trade.completedAt = new Date();
    await trade.save();

    // Update user trade stats
    const buyer = await User.findById(trade.fromUser);
    const seller = await User.findById(trade.toUser);

    if (buyer) {
      buyer.tradeStats.totalCompleted += 1;
      await buyer.save();
    }

    if (seller) {
      seller.tradeStats.totalCompleted += 1;
      seller.tradeStats.totalEarnings += trade.offerPrice;
      await seller.save();
    }

    // Populate the trade with user and service details for the response
    const populatedTrade = await Trade.findById(tradeId)
      .populate('fromUser', 'name email avatar')
      .populate('toUser', 'name email avatar')
      .populate('service', 'title description price category');

    // Emit socket events to both parties
    const io = getIO();
    io.to(`user:${trade.fromUser}`).emit('trade_completed', populatedTrade);
    io.to(`user:${trade.toUser}`).emit('trade_completed', populatedTrade);

    return res.json(populatedTrade);
  } catch (err) {
    console.error('Error completing trade:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;