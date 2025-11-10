const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { authRequired } = require('../middleware/auth');

// Use a local JSON parser to capture raw body for signature verification
router.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf.toString(); } }));

/**
 * POST /api/payments/razorpay/order
 * Creates a payment order stub. In production use Razorpay SDK.
 */
router.post('/razorpay/order', authRequired, [
  body('amount').isInt({ min: 1 }),
  body('currency').isIn(['INR']),
  body('receipt').optional().isString()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { amount, currency, receipt } = req.body;
  // Stub order response
  return res.json({ id: `order_${Date.now()}`, amount, currency, receipt: receipt || null, status: 'created' });
});

/**
 * POST /api/payments/razorpay/webhook
 * Verifies signature and logs event.
 */
router.post('/razorpay/webhook', (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
    if (!secret) return res.status(501).json({ error: 'Webhook secret not configured' });
    const signature = req.headers['x-razorpay-signature'] || req.headers['X-Razorpay-Signature'];
    const expected = crypto.createHmac('sha256', secret).update(req.rawBody || JSON.stringify(req.body)).digest('hex');
    if (signature !== expected) {
      return res.status(403).json({ error: 'Invalid signature' });
    }
    console.info('[razorpay:webhook]', req.body?.event || 'unknown', { id: req.body?.payload?.payment?.entity?.id });
    return res.json({ received: true });
  } catch (err) {
    console.error('[razorpay:webhook:error]', err);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * POST /api/payments/paytm/webhook
 * Verifies HMAC signature with merchant key.
 */
router.post('/paytm/webhook', (req, res) => {
  try {
    const key = process.env.PAYTM_WEBHOOK_KEY || '';
    if (!key) return res.status(501).json({ error: 'Webhook key not configured' });
    const signature = req.headers['x-paytm-signature'] || req.headers['X-Paytm-Signature'];
    const expected = crypto.createHmac('sha256', key).update(req.rawBody || JSON.stringify(req.body)).digest('hex');
    if (signature !== expected) {
      return res.status(403).json({ error: 'Invalid signature' });
    }
    console.info('[paytm:webhook]', req.body?.event || 'unknown');
    return res.json({ received: true });
  } catch (err) {
    console.error('[paytm:webhook:error]', err);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;