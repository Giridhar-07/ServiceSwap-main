const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const RefreshToken = require('../models/RefreshToken');

/**
 * Issue short-lived access token (15m by default).
 */
function signAccessToken(user) {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_ACCESS_EXPIRE || '15m';
  return jwt.sign(
    { id: user._id.toString(), email: user.email, name: user.name },
    secret,
    { expiresIn }
  );
}

/**
 * Creates and sets a refresh token cookie. Returns tokenId.
 */
async function issueRefreshTokenCookie(res, user, req) {
  const raw = crypto.randomBytes(64).toString('base64');
  const tokenId = crypto.randomBytes(16).toString('hex');
  const hashed = crypto.createHash('sha256').update(raw).digest('hex');
  const days = parseInt(process.env.REFRESH_EXPIRE_DAYS || '7', 10);
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  await RefreshToken.create({ user: user._id, tokenId, hashed, expiresAt, userAgent: req.headers['user-agent'] || '', ip: req.ip || '' });
  const secure = (process.env.COOKIE_SECURE || 'false') === 'true';
  res.cookie('ss_refresh', `${tokenId}.${raw}`, { httpOnly: true, secure, sameSite: 'lax', expires: expiresAt, path: '/api/auth' });
  return tokenId;
}

module.exports = { signAccessToken, issueRefreshTokenCookie };