const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

function signToken(user) {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRE || '7d';
  return jwt.sign(
    { id: user._id.toString(), email: user.email, name: user.name },
    secret,
    { expiresIn }
  );
}

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
  body('password').isLength({ min: 6 }).withMessage('password min length 6'),
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

      const token = signToken(user);
      console.info('[auth:signup:success]', { userId: user._id.toString() });
      return res.status(201).json({ token, user: safeUser(user) });
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
  body('password').isString().isLength({ min: 6 }).withMessage('password is required'),
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

      const token = signToken(user);
      console.info('[auth:login:success]', { userId: user._id.toString() });
      return res.json({ token, user: safeUser(user) });
    } catch (err) {
      console.error('[auth:login:error]', err);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

// GET /api/auth/me
const { authRequired } = require('../middleware/auth');
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

module.exports = router;
