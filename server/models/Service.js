const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, trim: true, lowercase: true },
    users: { type: Number, default: 1, min: 0 },
    sellerName: { type: String, trim: true },
    location: { type: String, trim: true },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    verified: { type: Boolean, default: false },
    // Owner of the service listing
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    // Status of listing lifecycle
    status: { type: String, enum: ['active', 'pending', 'sold', 'archived'], default: 'active', index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    createdByName: { type: String, trim: true },
    createdByEmail: { type: String, trim: true },
  },
  { timestamps: true }
);

serviceSchema.index({ title: 'text', description: 'text' });
serviceSchema.index({ category: 1 });
serviceSchema.index({ seller: 1 });

module.exports = mongoose.model('Service', serviceSchema);
