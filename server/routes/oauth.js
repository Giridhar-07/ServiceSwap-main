const router = require('express').Router();
const { query, body, validationResult } = require('express-validator');
const crypto = require('crypto');
const { authRequired } = require('../middleware/auth');
const AuthCode = require('../models/AuthCode');
const User = require('../models/User');
const { signAccessToken, issueRefreshTokenCookie } = require('../utils/tokens');

/**
 * GET /api/oauth/authorize
 * Issues authorization code for authenticated user.
 */
router.get('/authorize', authRequired, [
  query('client_id').isString(),
  query('redirect_uri').isString(),
  query('response_type').equals('code'),
  query('state').optional().isString()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { client_id, redirect_uri, state = '' } = req.query;
  const allowedClient = process.env.OAUTH_CLIENT_ID || client_id;
  const allowedRedirect = process.env.OAUTH_REDIRECT_URI || redirect_uri;
  if (client_id !== allowedClient || redirect_uri !== allowedRedirect) {
    return res.status(400).json({ error: 'Invalid client or redirect' });
  }
  const code = crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await AuthCode.create({ code, user: req.user.id, clientId: client_id, redirectUri: redirect_uri, expiresAt });
  const url = new URL(redirect_uri);
  url.searchParams.set('code', code);
  if (state) url.searchParams.set('state', state);
  return res.redirect(url.toString());
});

/**
 * POST /api/oauth/token
 * Exchanges authorization code for access token.
 */
router.post('/token', [
  body('client_id').isString(),
  body('client_secret').isString(),
  body('code').isString(),
  body('redirect_uri').isString(),
  body('grant_type').equals('authorization_code')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { client_id, client_secret, code, redirect_uri } = req.body;
  const allowedClient = process.env.OAUTH_CLIENT_ID || client_id;
  const allowedSecret = process.env.OAUTH_CLIENT_SECRET || client_secret;
  const allowedRedirect = process.env.OAUTH_REDIRECT_URI || redirect_uri;
  if (client_id !== allowedClient || client_secret !== allowedSecret || redirect_uri !== allowedRedirect) {
    return res.status(400).json({ error: 'Invalid client credentials' });
  }
  const authCode = await AuthCode.findOne({ code });
  if (!authCode || authCode.usedAt || authCode.expiresAt < new Date() || authCode.redirectUri !== redirect_uri) {
    return res.status(400).json({ error: 'Invalid or expired code' });
  }
  authCode.usedAt = new Date();
  await authCode.save();
  const user = await User.findById(authCode.user);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const accessToken = signAccessToken(user);
  // Optionally issue refresh cookie
  await issueRefreshTokenCookie(res, user, req);
  return res.json({ access_token: accessToken, token_type: 'Bearer', expires_in: 900 });
});

module.exports = router;