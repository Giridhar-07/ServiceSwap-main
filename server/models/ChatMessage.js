const mongoose = require('mongoose');

// ChatMessage model stores messages per TradeSession with encryption-ready fields.
// - If using server-side encryption: store plaintext encrypted in `contentEnc`.
// - If using end-to-end encryption: store client ciphertext in `ciphertext`.
// Attachments can reference stored files (handled elsewhere) via URL.
const chatMessageSchema = new mongoose.Schema({
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'TradeSession', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  contentEnc: { type: String, default: null },
  ciphertext: { type: String, default: null },
  attachments: [{
    url: { type: String, required: true },
    name: { type: String, default: '' },
    size: { type: Number, default: 0 },
    mime: { type: String, default: '' }
  }],
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  meta: {
    type: Object,
    default: {}
  }
}, {
  timestamps: true
});

chatMessageSchema.index({ session: 1, createdAt: 1 });
chatMessageSchema.index({ sender: 1, createdAt: 1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);