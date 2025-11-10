const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { authRequired } = require('../middleware/auth');
const User = require('../models/User');
const speakeasy = require('speakeasy');

/**
 * POST /api/auth/2fa/setup
 * Generates a TOTP secret and returns otpauth URI. Requires auth.
 */
router.post('/setup', authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const secret = speakeasy.generateSecret({ length: 20, name: `ServiceSwap:${user.email}` });
    user.setMfaSecret(secret.ascii);
    user.mfaEnabled = false; // enable only after verification
    await user.save();
    return res.json({ otpauth_url: secret.otpauth_url, secret_ascii: secret.ascii });
  } catch (err) {
    console.error('[2fa:setup:error]', err);
    return res.status(500).json({ error: 'Failed to setup 2FA' });
  }
});

/**
 * POST /api/auth/2fa/verify
 * Verifies a TOTP code and enables 2FA.
 */
router.post('/verify', authRequired, [body('code').isString().isLength({ min: 6, max: 6 }).isNumeric()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const user = await User.findById(req.user.id).select('+mfaSecretEnc');
    if (!user) return res.status(404).json({ error: 'User not found' });
    const ok = user.verifyTotp(req.body.code);
    if (!ok) return res.status(403).json({ error: 'Invalid 2FA code' });
    user.mfaEnabled = true;
    await user.save();
    return res.json({ enabled: true });
  } catch (err) {
    console.error('[2fa:verify:error]', err);
    return res.status(500).json({ error: 'Failed to verify 2FA' });
  }
});

/**
 * POST /api/auth/2fa/disable
 * Disables 2FA after confirming a valid TOTP code.
 */
router.post('/disable', authRequired, [body('code').isString().isLength({ min: 6, max: 6 }).isNumeric()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const user = await User.findById(req.user.id).select('+mfaSecretEnc');
    if (!user) return res.status(404).json({ error: 'User not found' });
    const ok = user.verifyTotp(req.body.code);
    if (!ok) return res.status(403).json({ error: 'Invalid 2FA code' });
    user.mfaEnabled = false;
    user.mfaSecretEnc = null;
    await user.save();
    return res.json({ enabled: false });
  } catch (err) {
    console.error('[2fa:disable:error]', err);
    return res.status(500).json({ error: 'Failed to disable 2FA' });
  }
});

module.exports = router;