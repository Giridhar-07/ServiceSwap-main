const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Service title is required'],
    trim: true,
    maxLength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Service description is required'],
    trim: true,
    maxLength: [2000, 'Description cannot exceed 2000 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'Streaming & Entertainment',
      'Fitness & Health',
      'Education & Learning',
      'Music & Audio',
      'Gaming',
      'Software & Tools',
      'Mobile & Apps',
      'Transportation',
      'Food & Delivery',
      'Shopping & Retail',
      'Home & Lifestyle',
      'Travel & Hospitality'
    ]
  },
  // Pricing
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [1, 'Price must be at least ₹1'],
    max: [50000, 'Price cannot exceed ₹50,000']
  },
  originalPrice: {
    type: Number,
    required: [true, 'Original price is required'],
    min: [1, 'Original price must be at least ₹1']
  },
  // Service details
  slotsAvailable: {
    type: Number,
    required: [true, 'Available slots is required'],
    min: [1, 'At least 1 slot is required'],
    max: [10, 'Maximum 10 slots allowed']
  },
  totalSlots: {
    type: Number,
    required: [true, 'Total slots is required']
  },
  validTill: {
    type: Date,
    required: [true, 'Valid till date is required'],
    validate: {
      validator: function(value) {
        return value > new Date();
      },
      message: 'Valid till date must be in the future'
    }
  },
  // Owner details
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Service owner is required']
  },
  ownerContact: {
    whatsapp: {
      type: String,
      required: [true, 'WhatsApp contact is required'],
      match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit WhatsApp number']
    },
    email: {
      type: String,
      required: false
    }
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true,
    maxLength: [100, 'Location cannot exceed 100 characters']
  },
  // Service credentials (encrypted)
  credentials: {
    username: {
      type: String,
      default: null
    },
    email: {
      type: String,
      default: null
    },
    password: {
      type: String,
      default: null
    },
    additionalInfo: {
      type: String,
      default: null
    }
  },
  // Service status
  status: {
    type: String,
    enum: ['active', 'sold', 'expired', 'suspended'],
    default: 'active'
  },
  // Verification
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationLevel: {
    type: String,
    enum: ['basic', 'premium'],
    default: 'basic'
  },
  // Analytics
  views: {
    type: Number,
    default: 0
  },
  interestedUsers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    interestedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Images
  images: [{
    url: {
      type: String,
      required: true
    },
    caption: {
      type: String,
      default: ''
    }
  }],
  // Tags for search
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  // Additional features
  features: [{
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    }
  }],
  // Service specific fields
  serviceSpecific: {
    // For streaming services
    accountType: {
      type: String,
      enum: ['individual', 'family', 'premium', 'basic'],
      default: null
    },
    // For fitness services
    membershipType: {
      type: String,
      enum: ['monthly', 'quarterly', 'yearly', 'lifetime'],
      default: null
    },
    // For education services
    courseLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
      default: null
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for discount percentage
serviceSchema.virtual('discountPercentage').get(function() {
  if (!this.originalPrice || this.originalPrice <= 0) return 0;
  return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
});

// Virtual for savings amount
serviceSchema.virtual('savingsAmount').get(function() {
  return this.originalPrice - this.price;
});

// Virtual for time remaining
serviceSchema.virtual('timeRemaining').get(function() {
  const now = new Date();
  const validTill = new Date(this.validTill);
  const diffTime = validTill - now;
  
  if (diffTime <= 0) return 'Expired';
  
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays > 30) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? 's' : ''} remaining`;
  }
  
  return `${diffDays} day${diffDays > 1 ? 's' : ''} remaining`;
});

// Method to increment view count
serviceSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Method to add interested user
serviceSchema.methods.addInterestedUser = function(userId) {
  // Check if user is already interested
  const existingUser = this.interestedUsers.find(
    item => item.user.toString() === userId.toString()
  );
  
  if (!existingUser) {
    this.interestedUsers.push({
      user: userId,
      interestedAt: new Date()
    });
    return this.save();
  }
  
  return Promise.resolve(this);
};

// Method to check if service is available
serviceSchema.methods.isAvailable = function() {
  return this.status === 'active' && 
         this.slotsAvailable > 0 && 
         new Date(this.validTill) > new Date();
};

// Method to book a slot
serviceSchema.methods.bookSlot = function() {
  if (this.slotsAvailable > 0) {
    this.slotsAvailable -= 1;
    if (this.slotsAvailable === 0) {
      this.status = 'sold';
    }
    return this.save();
  }
  throw new Error('No slots available');
};

// Static method to get services by category
serviceSchema.statics.getByCategory = function(category) {
  return this.find({ 
    category: category, 
    status: 'active',
    validTill: { $gt: new Date() }
  }).populate('owner', 'name email tradeStats.rating');
};

// Static method for search
serviceSchema.statics.searchServices = function(query, options = {}) {
  const {
    category,
    minPrice,
    maxPrice,
    location,
    sortBy = 'createdAt',
    sortOrder = -1,
    limit = 20,
    skip = 0
  } = options;

  let searchQuery = {
    status: 'active',
    validTill: { $gt: new Date() }
  };

  // Text search
  if (query) {
    searchQuery.$or = [
      { title: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
      { tags: { $in: [new RegExp(query, 'i')] } }
    ];
  }

  // Category filter
  if (category && category !== 'all') {
    searchQuery.category = category;
  }

  // Price filter
  if (minPrice !== undefined) {
    searchQuery.price = { ...searchQuery.price, $gte: minPrice };
  }
  if (maxPrice !== undefined) {
    searchQuery.price = { ...searchQuery.price, $lte: maxPrice };
  }

  // Location filter
  if (location) {
    searchQuery.location = { $regex: location, $options: 'i' };
  }

  return this.find(searchQuery)
    .populate('owner', 'name email tradeStats.rating')
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit);
};

// Indexes for better performance
serviceSchema.index({ category: 1, status: 1 });
serviceSchema.index({ price: 1 });
serviceSchema.index({ validTill: 1 });
serviceSchema.index({ owner: 1 });
serviceSchema.index({ title: 'text', description: 'text', tags: 'text' });
serviceSchema.index({ location: 1 });

module.exports = mongoose.model('Service', serviceSchema);