const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const crypto = require('crypto');
const { signAccessToken, issueRefreshTokenCookie } = require('../utils/tokens');
const { authRequired } = require('../middleware/auth');

function signToken(user) {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRE || '7d';
  return jwt.sign(
    { id: user._id.toString(), email: user.email, name: user.name },
    secret,
    { expiresIn }
  );
}

/**
 * Issue short-lived access token (15m by default).
 */
// access token and refresh cookie handled via tokens util

function safeUser(userDoc) {
  const obj = userDoc.toObject ? userDoc.toObject() : userDoc;
  delete obj.password;
  return obj;
}

// POST /api/auth/signup
router.post(
  '/signup',
  body('name').isString().trim().isLength({ min: 1 }).withMessage('name is required'),
  body('email').isEmail().withMessage('valid email is required'),
  // Enforce strong password: min 8, upper, lower, number, special
  body('password')
    .isString()
    .isLength({ min: 8 }).withMessage('password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('password must include an uppercase letter')
    .matches(/[a-z]/).withMessage('password must include a lowercase letter')
    .matches(/[0-9]/).withMessage('password must include a number')
    .matches(/[!@#$%^&*(),.?":{}|<>_\-]/).withMessage('password must include a special character'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      console.info('[auth:signup:start]', { email: req.body.email });
      const { name, email, password } = req.body;
      const exists = await User.findOne({ email: email.toLowerCase() });
      if (exists) return res.status(409).json({ error: 'Email already in use' });

      const user = new User({ name, email: email.toLowerCase(), password });
      await user.save();

      const accessToken = signAccessToken(user);
      await issueRefreshTokenCookie(res, user, req);
      console.info('[auth:signup:success]', { userId: user._id.toString() });
      return res.status(201).json({ token: accessToken, user: safeUser(user) });
    } catch (err) {
      console.error('[auth:signup:error]', err);
      res.status(500).json({ error: 'Signup failed' });
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  body('email').isEmail().withMessage('valid email is required'),
  body('password').isString().isLength({ min: 8 }).withMessage('password must be at least 8 characters'),
  body('mfaCode').optional().isString().isLength({ min: 6, max: 6 }).isNumeric(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      console.info('[auth:login:start]', { email: req.body.email });
      const { email, password } = req.body;
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });

      const ok = await user.comparePassword(password);
      if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
      // If 2FA is enabled, require TOTP code
      if (user.mfaEnabled) {
        const u2 = await User.findById(user._id).select('+mfaSecretEnc');
        const provided = req.body.mfaCode;
        if (!provided) return res.status(401).json({ error: '2FA code required' });
        const ok2 = u2.verifyTotp(provided);
        if (!ok2) return res.status(403).json({ error: 'Invalid 2FA code' });
      }

      const accessToken = signAccessToken(user);
      await issueRefreshTokenCookie(res, user, req);
      console.info('[auth:login:success]', { userId: user._id.toString() });
      return res.json({ token: accessToken, user: safeUser(user) });
    } catch (err) {
      console.error('[auth:login:error]', err);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

// GET /api/auth/me
router.get('/me', authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    console.info('[auth:me:success]', { userId: req.user.id });
    res.json(user);
  } catch (err) {
    console.error('[auth:me:error]', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Refresh and logout routes

/**
 * POST /api/auth/refresh
 * Rotates refresh token and issues new access token.
 */
router.post('/refresh', async (req, res) => {
  try {
    const cookie = req.cookies?.ss_refresh;
    if (!cookie) {
      res.set('WWW-Authenticate', 'Bearer');
      return res.status(401).json({ error: 'Missing refresh token' });
    }
    const [tokenId, raw] = String(cookie).split('.');
    if (!tokenId || !raw) return res.status(401).json({ error: 'Malformed refresh token' });
    const hashed = crypto.createHash('sha256').update(raw).digest('hex');
    const rt = await RefreshToken.findOne({ tokenId }).select('+hashed');
    if (!rt || rt.revokedAt || rt.hashed !== hashed || rt.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
    const user = await User.findById(rt.user);
    if (!user) return res.status(404).json({ error: 'User not found' });
    // Anomaly detection: user-agent/ip mismatch logs
    const uaNow = req.headers['user-agent'] || '';
    const ipNow = req.ip || '';
    if (rt.userAgent && uaNow && rt.userAgent !== uaNow) {
      console.warn('[anomaly:refresh:user-agent-mismatch]', { tokenId, prev: rt.userAgent, now: uaNow });
    }
    if (rt.ip && ipNow && rt.ip !== ipNow) {
      console.warn('[anomaly:refresh:ip-mismatch]', { tokenId, prev: rt.ip, now: ipNow });
    }
    // Rotate
    rt.revokedAt = new Date();
    const newRaw = crypto.randomBytes(64).toString('base64');
    const newId = crypto.randomBytes(16).toString('hex');
    const newHashed = crypto.createHash('sha256').update(newRaw).digest('hex');
    const days = parseInt(process.env.REFRESH_EXPIRE_DAYS || '7', 10);
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    rt.replacedById = newId;
    await rt.save();
    await RefreshToken.create({ user: user._id, tokenId: newId, hashed: newHashed, expiresAt, userAgent: req.headers['user-agent'] || '', ip: req.ip || '' });
    const secure = (process.env.COOKIE_SECURE || 'false') === 'true';
    res.cookie('ss_refresh', `${newId}.${newRaw}`, { httpOnly: true, secure, sameSite: 'lax', expires: expiresAt, path: '/api/auth' });
    const accessToken = signAccessToken(user);
    return res.json({ token: accessToken });
  } catch (err) {
    console.error('[auth:refresh:error]', err);
    return res.status(500).json({ error: 'Refresh failed' });
  }
});

/**
 * POST /api/auth/logout
 * Revokes refresh token.
 */
router.post('/logout', authRequired, async (req, res) => {
  try {
    const cookie = req.cookies?.ss_refresh;
    if (cookie) {
      const [tokenId] = String(cookie).split('.');
      const rt = await RefreshToken.findOne({ tokenId });
      if (rt && !rt.revokedAt) {
        rt.revokedAt = new Date();
        await rt.save();
      }
    }
    res.clearCookie('ss_refresh', { path: '/api/auth' });
    return res.json({ loggedOut: true });
  } catch (err) {
    console.error('[auth:logout:error]', err);
    return res.status(500).json({ error: 'Logout failed' });
  }
});

module.exports = router;
