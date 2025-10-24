const User = require('../models/User');

async function superAdminRequired(req, res, next) {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });
    const user = await User.findById(req.user.id).select('role active suspended banned');
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    if (user.banned || user.suspended || user.active === false) {
      return res.status(403).json({ error: 'Account not active' });
    }

    if (user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Super-admin access required' });
    }

    next();
  } catch (err) {
    console.error('[admin:superAdminRequired:error]', err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { superAdminRequired };