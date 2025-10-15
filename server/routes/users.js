const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

// GET /api/users - List recent users (without password)
router.get('/', async (req, res) => {
  const users = await User.find()
    .select('-password')
    .sort({ createdAt: -1 })
    .limit(20);
  res.json(users);
});

// POST /api/users - Create a new user
router.post(
  '/',
  body('name').isString().isLength({ min: 1 }).withMessage('name is required'),
  body('email').isEmail().withMessage('valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('password min length 6'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { name, email, password, phone } = req.body;
      const existing = await User.findOne({ email });
      if (existing) return res.status(409).json({ error: 'Email already in use' });

      const user = new User({ name, email, password, phone });
      await user.save();

      const safe = user.toObject();
      delete safe.password;
      res.status(201).json(safe);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create user' });
    }
  }
);

module.exports = router;
