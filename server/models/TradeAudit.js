const mongoose = require('mongoose');

const tradeAuditSchema = new mongoose.Schema(
  {
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'TradeSession', required: true },
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: {
      a: [{ code: String, type: String, qty: Number }],
      b: [{ code: String, type: String, qty: Number }],
    },
    outcome: { type: String, enum: ['success', 'failed', 'cancelled'], default: 'success' },
    reason: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

tradeAuditSchema.index({ session: 1 });
tradeAuditSchema.index({ fromUser: 1 });
tradeAuditSchema.index({ toUser: 1 });

module.exports = mongoose.model('TradeAudit', tradeAuditSchema);