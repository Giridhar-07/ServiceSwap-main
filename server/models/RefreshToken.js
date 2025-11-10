const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenId: { type: String, required: true, index: true },
  hashed: { type: String, required: true, select: false },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: true },
  revokedAt: { type: Date, default: null },
  replacedById: { type: String, default: null },
  userAgent: { type: String, default: '' },
  ip: { type: String, default: '' },
});

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);