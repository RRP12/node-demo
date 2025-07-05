// Feed/feedSchema.js - User preferences and follow relationships for feed
const mongoose = require("mongoose")

// Schema for user follow relationships (stores, categories)
const userFeedPreferencesSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },
  
  // Stores the user follows
  followedStores: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Store"
  }],
  
  // Categories the user is interested in
  preferredCategories: [{
    type: String,
    enum: [
      "fashion", "beauty", "electronics", "home-decor", 
      "food-and-beverage", "kids-and-baby", "pets", 
      "fitness", "art-and-collectibles", "others"
    ]
  }],
  
  // Feed settings
  settings: {
    showReelsOnly: {
      type: Boolean,
      default: false
    },
    sortBy: {
      type: String,
      enum: ["recent", "popular", "trending"],
      default: "recent"
    },
    maxDistance: {
      type: Number, // in kilometers for location-based feed
      default: 50
    }
  },
  
  // Analytics for personalization
  analytics: {
    viewedProducts: [{
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product"
      },
      viewedAt: {
        type: Date,
        default: Date.now
      },
      duration: Number // seconds spent viewing
    }],
    
    likedCategories: [{
      category: String,
      score: {
        type: Number,
        default: 1
      }
    }],
    
    lastFeedAccess: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true
})

// Indexes for efficient queries
userFeedPreferencesSchema.index({ userId: 1 })
userFeedPreferencesSchema.index({ followedStores: 1 })
userFeedPreferencesSchema.index({ preferredCategories: 1 })
userFeedPreferencesSchema.index({ "analytics.lastFeedAccess": -1 })

module.exports = mongoose.model("UserFeedPreferences", userFeedPreferencesSchema)
