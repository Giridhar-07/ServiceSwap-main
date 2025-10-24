const crypto = require('crypto');

function csrfOptional() {
  return (req, res, next) => {
    if (process.env.ENABLE_CSRF === 'true') {
      const token = req.headers['x-csrf-token'] || req.headers['x-xsrf-token'];
      if (!token) return res.status(403).json({ error: 'CSRF token missing' });
      try {
        const secret = process.env.CSRF_SECRET || 'default_csrf_secret';
        const userId = req.user?.id || '';
        const expected = crypto.createHmac('sha256', secret).update(userId).digest('hex');
        if (token !== expected) {
          return res.status(403).json({ error: 'Invalid CSRF token' });
        }
      } catch (e) {
        return res.status(403).json({ error: 'CSRF validation failed' });
      }
    }
    next();
  };
}

module.exports = { csrfOptional };