const mongoose = require('mongoose');

const tradeItemSchema = new mongoose.Schema({
  code: { type: String, required: true, trim: true },
  type: { type: String, enum: ['card', 'currency'], required: true },
  qty: { type: Number, default: 1, min: 1 },
});

const tradeAuditSchema = new mongoose.Schema(
  {
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'TradeSession', required: true },
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: {
      a: [tradeItemSchema],
      b: [tradeItemSchema],
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