// Feed/cqrs/queries/GetPersonalizedFeedQuery.js - Query for getting personalized feed
const Product = require("../../../Product/productSchema")
const UserFeedPreferences = require("../../feedSchema")

class GetPersonalizedFeedQuery {
  constructor() {
    this.name = "GetPersonalizedFeedQuery"
  }

  /**
   * Execute personalized feed query
   * @param {Object} params - Query parameters
   * @param {String} params.userId - User ID
   * @param {String} params.category - Category filter
   * @param {String} params.subCategory - Subcategory filter
   * @param {String} params.sortBy - Sort order
   * @param {Boolean} params.reelsOnly - Show only products with reels
   * @param {Object} params.location - User location
   * @param {Number} params.maxDistance - Maximum distance
   * @returns {Object} - Query result
   */
  async execute(params) {
    const {
      userId,
      category = null,
      subCategory = null,
      sortBy = "recent",
      reelsOnly = false,
      location = null,
      maxDistance = 50
    } = params

    try {
      // Get user preferences
      const userPrefs = await this.getUserPreferences(userId)
      
      // Build query
      const query = await this.buildQuery(userPrefs, {
        category,
        subCategory,
        reelsOnly,
        location,
        maxDistance
      })
      
      // Get sort criteria
      const sortCriteria = this.getSortCriteria(sortBy)
      
      // Execute query
      const products = await Product.find(query)
        .populate('store', 'name category location')
        .sort(sortCriteria)
        .lean()
      
      // Apply personalization scoring
      const personalizedProducts = this.applyPersonalizationScoring(products, userPrefs)
      
      // Return query result
      return {
        success: true,
        queryId: this.generateQueryId(),
        timestamp: new Date(),
        data: {
          products: personalizedProducts,
          count: personalizedProducts.length,
          filters: {
            category,
            subCategory,
            sortBy,
            reelsOnly
          },
          userPreferences: {
            followedStoresCount: userPrefs.followedStores?.length || 0,
            preferredCategories: userPrefs.preferredCategories || []
          }
        }
      }

    } catch (error) {
      return {
        success: false,
        queryId: this.generateQueryId(),
        timestamp: new Date(),
        error: error.message,
        params
      }
    }
  }

  /**
   * Get user preferences with defaults
   */
  async getUserPreferences(userId) {
    let userPrefs = await UserFeedPreferences.findOne({ userId }).lean()
    
    if (!userPrefs) {
      // Return default preferences
      userPrefs = {
        userId,
        followedStores: [],
        preferredCategories: [],
        settings: {
          sortBy: "recent",
          maxDistance: 50
        }
      }
    }
    
    return userPrefs
  }

  /**
   * Build MongoDB query based on preferences and filters
   */
  async buildQuery(userPrefs, filters) {
    const query = {
      isPublished: true,
      isDeleted: { $ne: true }
    }

    // Apply category filter (highest priority)
    if (filters.category) {
      query.category = filters.category
    } else {
      // If no category filter, use user preferences
      if (userPrefs.followedStores && userPrefs.followedStores.length > 0) {
        query.$or = [
          { store: { $in: userPrefs.followedStores } },
          { category: { $in: userPrefs.preferredCategories || [] } }
        ]
      } else if (userPrefs.preferredCategories && userPrefs.preferredCategories.length > 0) {
        query.category = { $in: userPrefs.preferredCategories }
      }
    }

    // Apply subcategory filter
    if (filters.subCategory) {
      query.subCategory = filters.subCategory
    }

    // Apply reels filter
    if (filters.reelsOnly) {
      query["media.reels.0"] = { $exists: true }
    }

    // Location-based filtering would go here
    // (Implementation depends on store location setup)

    return query
  }

  /**
   * Get sort criteria based on sort type
   */
  getSortCriteria(sortBy) {
    switch (sortBy) {
      case "popular":
        return { 
          "analytics.views": -1, 
          "analytics.likes": -1, 
          createdAt: -1 
        }
      case "trending":
        return { 
          "analytics.recentViews": -1, 
          createdAt: -1 
        }
      case "recent":
      default:
        return { createdAt: -1 }
    }
  }

  /**
   * Apply personalization scoring to products
   */
  applyPersonalizationScoring(products, userPrefs) {
    return products.map(product => {
      let score = 0
      
      // Boost for followed stores
      if (userPrefs.followedStores && userPrefs.followedStores.includes(product.store._id)) {
        score += 10
      }
      
      // Boost for preferred categories
      if (userPrefs.preferredCategories && userPrefs.preferredCategories.includes(product.category)) {
        score += 5
      }
      
      // Boost for products with reels
      if (product.media && product.media.reels && product.media.reels.length > 0) {
        score += 3
      }
      
      // Recency boost
      const daysSinceCreated = (Date.now() - new Date(product.createdAt)) / (1000 * 60 * 60 * 24)
      if (daysSinceCreated < 1) score += 5
      else if (daysSinceCreated < 7) score += 3
      else if (daysSinceCreated < 30) score += 1
      
      return {
        ...product,
        _personalizedScore: score
      }
    }).sort((a, b) => b._personalizedScore - a._personalizedScore)
  }

  /**
   * Generate unique query ID for tracking
   */
  generateQueryId() {
    return `personalized_feed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Validate query parameters
   */
  validate(params) {
    const errors = []

    if (!params.userId) {
      errors.push("userId is required")
    }

    if (params.sortBy && !["recent", "popular", "trending"].includes(params.sortBy)) {
      errors.push("sortBy must be 'recent', 'popular', or 'trending'")
    }

    if (params.maxDistance && (typeof params.maxDistance !== "number" || params.maxDistance <= 0)) {
      errors.push("maxDistance must be a positive number")
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

module.exports = GetPersonalizedFeedQuery
