const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
  trade: { type: mongoose.Schema.Types.ObjectId, ref: 'Trade', required: true, index: true },
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, maxlength: 2000 },
}, { timestamps: true });

FeedbackSchema.index({ trade: 1, fromUser: 1 }, { unique: true });

module.exports = mongoose.model('Feedback', FeedbackSchema);