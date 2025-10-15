const express = require('express');
const router = express.Router();

const { getIO } = require('../socket');
const User = require('../models/User');
const Service = require('../models/Service');
const Trade = require('../models/Trade');

// Basic healthcheck for Discord integration
router.get('/health', (req, res) => {
  res.json({ status: 'ok', enabled: process.env.DISCORD_KARUTA_ENABLED === 'true' });
});

// Karuta bot trade workflow webhook stub
// Gated by DISCORD_KARUTA_ENABLED and optional DISCORD_WEBHOOK_SECRET
router.post('/karuta/trade', (req, res) => {
  if (process.env.DISCORD_KARUTA_ENABLED !== 'true') {
    return res.status(501).json({ error: 'Discord Karuta integration disabled' });
  }

  const secret = process.env.DISCORD_WEBHOOK_SECRET;
  if (secret) {
    const provided = req.headers['x-karuta-signature'];
    if (!provided || provided !== secret) {
      return res.status(401).json({ error: 'Invalid Discord webhook signature' });
    }
  }

  const event = req.body || {};
  // Minimal validation
  if (!event.type) {
    return res.status(400).json({ error: 'Missing event type' });
  }

  // Optionally emit event to clients without altering existing flows
  try {
    if (process.env.DISCORD_KARUTA_EMIT_EVENTS === 'true') {
      const io = getIO();
      if (io) {
        io.emit('discord_karuta_event', {
          ...event,
          receivedAt: new Date().toISOString()
        });
      }
    }
  } catch (e) {
    // Do not break existing functionality; just log and continue
    console.warn('Discord event emit failed:', e.message || e);
  }

  // Optional: map Discord events to platform trades when enabled
  if (process.env.DISCORD_KARUTA_MAP_TRADES === 'true' && event.type === 'subscription_exchange') {
    (async () => {
      try {
        console.info('[discord:karuta:map:start]', { from: event.fromUserDiscordId, to: event.toUserDiscordId, serviceId: event.serviceId, serviceName: event.serviceName, offerPrice: event.offerPrice });
        if (!event.fromUserDiscordId || !event.toUserDiscordId) {
          console.warn('[discord:karuta:map:skip]', { reason: 'missing discord ids' });
          return;
        }

        const fromUser = await User.findOne({ discordId: event.fromUserDiscordId });
        const toUser = await User.findOne({ discordId: event.toUserDiscordId });
        if (!fromUser || !toUser) {
          console.warn('[discord:karuta:map:skip]', { reason: 'user not found', fromFound: !!fromUser, toFound: !!toUser });
          return;
        }

        let service = null;
        if (event.serviceId) {
          service = await Service.findById(event.serviceId);
        } else if (event.serviceName) {
          service = await Service.findOne({ title: new RegExp(`^${event.serviceName}$`, 'i'), seller: fromUser._id });
        }
        if (!service) {
          console.warn('[discord:karuta:map:skip]', { reason: 'service not found' });
          return;
        }

        const offerPrice = Number(event.offerPrice ?? service.price);
        const expiresAt = new Date(Date.now() + (48 * 60 * 60 * 1000));
        const newTrade = new Trade({
          fromUser: fromUser._id,
          toUser: toUser._id,
          service: service._id,
          offerPrice,
          originalPrice: service.price,
          message: event.note || '',
          status: 'pending',
          expiresAt,
          tradeDetails: {
            duration: event.duration || '',
            accessType: 'share'
          },
          escrowStatus: 'none',
          verificationRequired: false,
          tradeProtectionLevel: 'basic'
        });
        await newTrade.save();

        const io = getIO();
        io.to(`user:${service.seller.toString()}`).emit('new_trade_offer', newTrade);
        console.info('[discord:karuta:map:success]', { tradeId: newTrade._id.toString() });
      } catch (err) {
        console.error('[discord:karuta:map:error]', err);
      }
    })();
  }

  // Always return accepted to Discord webhook caller
  return res.status(202).json({ status: 'accepted' });
});

module.exports = router;