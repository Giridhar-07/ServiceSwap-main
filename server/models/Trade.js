const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/crypto');

const tradeSchema = new mongoose.Schema({
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  // Link to interactive trade session created at request initiation
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'TradeSession', default: null },
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
  // Encrypted blob for credentials; AES-256-GCM base64 string
  credentialsEnc: { type: String, select: false },
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
tradeSchema.index({ session: 1 });

module.exports = mongoose.model('Trade', tradeSchema);

/**
 * Pre-save hook to encrypt credentials into credentialsEnc and clear plaintext.
 */
tradeSchema.pre('save', function(next) {
  try {
    const creds = this.tradeDetails && this.tradeDetails.credentials ? this.tradeDetails.credentials : null;
    const hasPlain = creds && (creds.username || creds.email || creds.password || creds.additionalInfo);
    if (hasPlain) {
      const payload = JSON.stringify({
        username: creds.username || '',
        email: creds.email || '',
        password: creds.password || '',
        additionalInfo: creds.additionalInfo || ''
      });
      this.credentialsEnc = encrypt(payload);
      // Remove plaintext before persisting
      this.tradeDetails.credentials = {};
    }
    next();
  } catch (err) {
    next(err);
  }
});

/**
 * Instance method to read decrypted credentials if present.
 */
tradeSchema.methods.getDecryptedCredentials = function() {
  try {
    if (!this.credentialsEnc) return null;
    const json = decrypt(this.credentialsEnc);
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
};