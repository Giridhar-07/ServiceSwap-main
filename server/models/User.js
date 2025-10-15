const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxLength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minLength: [6, 'Password must be at least 6 characters']
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number']
  },
  avatar: {
    type: String,
    default: null
  },
  // Discord integration
  discordId: {
    type: String,
    default: null,
    trim: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: {
    type: String,
    default: null
  },
  passwordResetToken: {
    type: String,
    default: null
  },
  passwordResetExpires: {
    type: Date,
    default: null
  },
  // Trade-related fields
  hasTradeLicense: {
    type: Boolean,
    default: true
  },
  tradeStats: {
    totalTrades: {
      type: Number,
      default: 0
    },
    successfulTrades: {
      type: Number,
      default: 0
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalEarnings: {
      type: Number,
      default: 0
    },
    lastTradeAt: {
      type: Date,
      default: null
    }
  },
  // User preferences
  preferences: {
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      },
      tradeUpdates: {
        type: Boolean,
        default: true
      }
    },
    privacy: {
      showEmail: {
        type: Boolean,
        default: false
      },
      showPhone: {
        type: Boolean,
        default: false
      }
    }
  },
  // Account status
  status: {
    type: String,
    enum: ['active', 'suspended', 'banned'],
    default: 'active'
  },
  lastLoginAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for success rate
userSchema.virtual('successRate').get(function() {
  if (this.tradeStats.totalTrades === 0) return 0;
  return Math.round((this.tradeStats.successfulTrades / this.tradeStats.totalTrades) * 100);
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash password if it's modified
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate verification token
userSchema.methods.generateVerificationToken = function() {
  const token = Math.random().toString(36).substring(2, 15) + 
                Math.random().toString(36).substring(2, 15);
  this.verificationToken = token;
  return token;
};

// Update trade stats
userSchema.methods.updateTradeStats = function(isSuccessful = true, earnings = 0) {
  this.tradeStats.totalTrades += 1;
  if (isSuccessful) {
    this.tradeStats.successfulTrades += 1;
    this.tradeStats.totalEarnings += earnings;
  }
  this.tradeStats.lastTradeAt = new Date();
  
  // Recalculate rating based on success rate
  this.tradeStats.rating = (this.tradeStats.successfulTrades / this.tradeStats.totalTrades) * 5;
  
  return this.save();
};

// Index for performance
userSchema.index({ email: 1 });
userSchema.index({ discordId: 1 });
userSchema.index({ 'tradeStats.rating': -1 });
userSchema.index({ 'tradeStats.totalTrades': -1 });

module.exports = mongoose.model('User', userSchema);