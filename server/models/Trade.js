const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  offerPrice: { type: Number, required: true, min: 0 },
  originalPrice: { type: Number, required: true, min: 0 },
  message: { type: String, default: '' },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'declined', 'completed', 'cancelled', 'expired'], 
    default: 'pending' 
  },
  expiresAt: { type: Date },
  acceptedAt: { type: Date },
  completedAt: { type: Date },
  tradeDetails: {
    duration: { type: String, default: '' },
    accessType: { type: String, enum: ['transfer', 'share'], default: 'share' },
    credentials: {
      username: { type: String },
      email: { type: String },
      password: { type: String },
      additionalInfo: { type: String }
    }
  },
  escrowStatus: { type: String, enum: ['none', 'held', 'released'], default: 'none' },
  verificationRequired: { type: Boolean, default: true },
  tradeProtectionLevel: { type: String, enum: ['basic', 'premium'], default: 'basic' }
}, {
  timestamps: true
});

tradeSchema.index({ fromUser: 1 });
tradeSchema.index({ toUser: 1 });
tradeSchema.index({ service: 1 });
tradeSchema.index({ status: 1 });

module.exports = mongoose.model('Trade', tradeSchema);