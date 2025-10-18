const router = require('express').Router();
const { query, body, param, validationResult } = require('express-validator');
const Service = require('../models/Service');
const { authRequired } = require('../middleware/auth');
const { getIO } = require('../socket');

// GET /api/services?search=&category=&limit=&page=
router.get(
  '/',
  [
    query('search').optional().isString().trim(),
    query('category').optional().isString().trim().toLowerCase(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('page').optional().isInt({ min: 1 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { search = '', category = '', limit = 30, page = 1 } = req.query;
    const filter = {};

    // Map canonical categories to include common synonyms from legacy data
    const mapCategoryToSynonyms = (cat) => {
      const c = (cat || '').toLowerCase();
      if (!c || c === 'all') return null;
      const synonyms = {
        streaming: ['streaming', 'streaming & entertainment'],
        fitness: ['fitness', 'fitness & health'],
        education: ['education', 'education & learning'],
        music: ['music', 'music & audio'],
        gaming: ['gaming'],
        software: ['software', 'software & tools', 'mobile & apps'],
      };
      return synonyms[c] || [c];
    };

    const cats = mapCategoryToSynonyms(category);
    if (cats) {
      filter.category = { $in: cats };
    }
    if (search) {
      filter.$text = { $search: search };
    }

    const docs = await Service.find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json(docs);
  }
);

// GET /api/services/my - current user's listings
router.get('/my', authRequired, async (req, res) => {
  try {
    const docs = await Service.find({ seller: req.user.id }).sort({ createdAt: -1 });
    res.json(docs);
  } catch (err) {
    console.error('[services:my:error]', err);
    res.status(500).json({ error: 'Failed to fetch your services' });
  }
});

// POST /api/services - create new service
router.post(
  '/',
  authRequired,
  [
    body('title').isString().trim().isLength({ min: 5 }),
    body('description').isString().trim().isLength({ min: 20 }),
    body('category').isString().trim().isLength({ min: 2 }),
    body('price').isNumeric(),
    body('originalPrice').isNumeric(),
    body('users').optional().isInt({ min: 0, max: 10 }),
    body('sellerName').optional().isString().trim(),
    body('location').optional().isString().trim(),
    body('createdByName').optional().isString().trim(),
    body('createdByEmail').optional().isString().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      console.info('[services:create:start]', { userId: req.user.id, body: { title: req.body.title, category: req.body.category, price: req.body.price } });
      const doc = await Service.create({
        title: req.body.title,
        description: req.body.description,
        category: req.body.category.toLowerCase(),
        price: req.body.price,
        originalPrice: req.body.originalPrice,
        users: req.body.users ?? 1,
        sellerName: req.body.sellerName || req.user.name,
        location: req.body.location,
        createdByName: req.body.createdByName || req.user.name,
        createdByEmail: req.body.createdByEmail || req.user.email,
        seller: req.user.id,
        status: 'active',
        verified: false,
        rating: 0,
      });
      
      // Emit real-time event to all connected clients in the services room
      const io = getIO();
      io.to('services').emit('new_service', doc);
      console.info('[services:create:success]', { serviceId: doc._id.toString(), userId: req.user.id });
      
      res.status(201).json(doc);
    } catch (err) {
      console.error('[services:create:error]', err);
      res.status(500).json({ error: 'Failed to create service' });
    }
  }
);

// PUT /api/services/:id/status - update service status
router.put(
  '/:id/status',
  authRequired,
  [
    param('id').isMongoId(),
    body('status').isString().isIn(['active', 'pending', 'sold', 'archived'])
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const service = await Service.findById(req.params.id);
      if (!service) return res.status(404).json({ error: 'Service not found' });
      if (service.seller?.toString() !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized to update this service' });
      }

      service.status = req.body.status;
      await service.save();

      const io = getIO();
      io.to('services').emit('service_status_updated', { id: service._id.toString(), status: service.status });
      io.to(`user:${req.user.id}`).emit('service_status_updated', { id: service._id.toString(), status: service.status });

      res.json({ id: service._id.toString(), status: service.status });
    } catch (err) {
      console.error('[services:status:error]', err);
      res.status(500).json({ error: 'Failed to update status' });
    }
  }
);

// PUT /api/services/:id - edit service details
router.put(
  '/:id',
  authRequired,
  [
    param('id').isMongoId(),
    body('title').optional().isString().trim().isLength({ min: 5 }),
    body('description').optional().isString().trim().isLength({ min: 20 }),
    body('category').optional().isString().trim().isLength({ min: 2 }),
    body('price').optional().isNumeric(),
    body('originalPrice').optional().isNumeric(),
    body('users').optional().isInt({ min: 0, max: 10 }),
    body('location').optional().isString().trim(),
    body('status').optional().isString().isIn(['active', 'pending', 'sold', 'archived'])
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const service = await Service.findById(req.params.id);
      if (!service) return res.status(404).json({ error: 'Service not found' });
      if (service.seller?.toString() !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized to edit this service' });
      }

      const fields = ['title', 'description', 'category', 'price', 'originalPrice', 'users', 'location', 'status'];
      fields.forEach((f) => {
        if (req.body[f] !== undefined) {
          service[f] = f === 'category' ? String(req.body[f]).toLowerCase() : req.body[f];
        }
      });

      await service.save();

      const io = getIO();
      io.to('services').emit('service_updated', { id: service._id.toString(), service });
      io.to(`user:${req.user.id}`).emit('service_updated', { id: service._id.toString(), service });

      res.json(service);
    } catch (err) {
      console.error('[services:edit:error]', err);
      res.status(500).json({ error: 'Failed to update service' });
    }
  }
);

// DELETE /api/services/:id - delete a service
router.delete(
  '/:id',
  authRequired,
  [param('id').isMongoId()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const service = await Service.findById(req.params.id);
      if (!service) return res.status(404).json({ error: 'Service not found' });
      if (service.seller?.toString() !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized to delete this service' });
      }

      await service.deleteOne();

      const io = getIO();
      io.to('services').emit('service_deleted', { id: req.params.id });
      io.to(`user:${req.user.id}`).emit('service_deleted', { id: req.params.id });

      res.json({ id: req.params.id, deleted: true });
    } catch (err) {
      console.error('[services:delete:error]', err);
      res.status(500).json({ error: 'Failed to delete service' });
    }
  }
);

module.exports = router;
