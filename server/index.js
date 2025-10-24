require('dotenv').config({ path: './.env' });
console.log('Current working directory:', process.cwd());
console.log('MONGODB_URI from .env:', process.env.MONGODB_URI);
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

const app = express();

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:8080';

// Security & middleware
app.use(helmet());
app.use(cors({ origin: [CLIENT_URL, 'http://127.0.0.1:8080', 'http://127.0.0.1:8081', 'http://localhost:8080', 'http://localhost:8081', 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:4173', 'http://127.0.0.1:4173'], credentials: true }));
app.use(express.json());

// Simple structured request logging
app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const ms = Number(end - start) / 1_000_000;
    const log = {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Math.round(ms),
      userId: req.user?.id || null,
      ip: req.ip,
    };
    console.info('[request]', log);
  });
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
});
app.use(limiter);

// Routes (mounted before server start)
app.get('/', (req, res) => {
  res.send('ServiceSwap API running');
});
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Optional Facebook auth stubs (enable when configured)
try {
  const facebookRoutes = require('./routes/social');
  app.use('/api/auth', facebookRoutes);
} catch (e) {
  // social routes not configured; ignore
}

// Core auth routes
app.use('/api/auth', require('./routes/auth'));

app.use('/api/users', require('./routes/users'));
app.use('/api/services', require('./routes/services'));
app.use('/api/trades', require('./routes/trades'));
app.use('/api/feedback', require('./routes/feedback'));
// Secure trade sessions workflow
app.use('/api/trade-sessions', require('./routes/tradeSessions'));
app.use('/api/admin', require('./routes/admin'));

// Optional Discord Karuta workflow integration (gated by env flag)
if (process.env.DISCORD_KARUTA_ENABLED === 'true') {
  try {
    const discordRoutes = require('./routes/discord');
    app.use('/api/discord', discordRoutes);
    console.log('Discord Karuta routes enabled.');
  } catch (e) {
    console.warn('Discord Karuta routes not available:', e.message);
  }
}

// Database and server start with retry
const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error('MONGODB_URI not set in .env');
  process.exit(1);
}
mongoose.set('strictQuery', true);

const connectWithRetry = async (attempt = 1) => {
  try {
    await mongoose.connect(mongoUri, { dbName: process.env.DB_NAME || undefined });
    console.log('Connected to MongoDB');
    const server = http.createServer(app);
    const { initSocket } = require('./socket');
    initSocket(server, { allowedOrigins: [CLIENT_URL, 'http://localhost:8080', 'http://127.0.0.1:8080', 'http://localhost:8081', 'http://127.0.0.1:8081', 'http://localhost:5173', 'http://127.0.0.1:5173'] });
    server.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (err) {
    const delay = Math.min(30000, attempt * 5000);
    console.error(`MongoDB connection failed (attempt ${attempt}). Retrying in ${delay/1000}s...`, err.message || err);
    setTimeout(() => connectWithRetry(attempt + 1), delay);
  }
};

connectWithRetry();

