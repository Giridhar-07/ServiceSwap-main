const mongoose = require('mongoose');

const authCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  clientId: { type: String, required: true },
  redirectUri: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  usedAt: { type: Date, default: null },
});

module.exports = mongoose.model('AuthCode', authCodeSchema);