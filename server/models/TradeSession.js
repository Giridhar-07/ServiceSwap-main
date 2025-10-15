const mongoose = require('mongoose');

const tradeItemSchema = new mongoose.Schema({
  code: { type: String, required: true, trim: true },
  type: { type: String, enum: ['card', 'currency'], required: true },
  qty: { type: Number, default: 1, min: 1 },
});

const tradeSessionSchema = new mongoose.Schema(
  {
    participants: {
      a: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      b: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['open', 'review', 'confirmed', 'finalized', 'cancelled'], default: 'open', index: true },
    items: {
      a: [tradeItemSchema],
      b: [tradeItemSchema],
    },
    confirmations: {
      a: { type: Boolean, default: false },
      b: { type: Boolean, default: false },
    },
    mfa: {
      a: { type: String, required: true },
      b: { type: String, required: true },
    },
    auditLog: [
      {
        at: { type: Date, default: Date.now },
        event: { type: String, required: true },
        data: { type: Object },
      }
    ],
  },
  { timestamps: true }
);

tradeSessionSchema.index({ 'participants.a': 1 });
tradeSessionSchema.index({ 'participants.b': 1 });
tradeSessionSchema.index({ status: 1 });

module.exports = mongoose.model('TradeSession', tradeSessionSchema);