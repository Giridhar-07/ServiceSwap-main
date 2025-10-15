const router = require('express').Router();

// This route is a placeholder. To enable real Facebook auth:
// - Set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET in server/.env
// - Implement Passport Facebook strategy and session/JWT handling

router.get('/facebook', (req, res) => {
  // If not configured, return a friendly message
  if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
    return res.status(501).json({
      error: 'Facebook auth not configured. Set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET in server/.env',
    });
  }
  return res.status(501).json({ error: 'Facebook auth flow not yet implemented.' });
});

module.exports = router;
