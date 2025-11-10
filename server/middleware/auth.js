const jwt = require('jsonwebtoken');

function authRequired(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) {
      res.set('WWW-Authenticate', 'Bearer');
      return res.status(401).json({ error: 'Missing token' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'Server misconfigured' });

    const payload = jwt.verify(token, secret);
    req.user = { id: payload.id, email: payload.email, name: payload.name };
    next();
  } catch (err) {
    res.set('WWW-Authenticate', 'Bearer error="invalid_token"');
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { authRequired };
