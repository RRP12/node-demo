// Feed/cqrs/queries/GetUserPreferencesQuery.js - Query for getting user preferences
const UserFeedPreferences = require("../../feedSchema")
const Store = require("../../../Store/StoreSchema")

class GetUserPreferencesQuery {
  constructor() {
    this.name = "GetUserPreferencesQuery"
  }

  /**
   * Execute user preferences query
   * @param {Object} params - Query parameters
   * @param {String} params.userId - User ID
   * @param {Boolean} params.includeStoreDetails - Include full store details
   * @param {Boolean} params.includeAnalytics - Include user analytics
   * @returns {Object} - Query result
   */
  async execute(params) {
    const {
      userId,
      includeStoreDetails = false,
      includeAnalytics = false
    } = params

    try {
      // Validate input
      const validation = this.validate(params)
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(", ")}`)
      }

      // Get user preferences
      let userPrefs = await UserFeedPreferences.findOne({ userId }).lean()
      
      if (!userPrefs) {
        // Return default preferences if none exist
        userPrefs = {
          userId,
          followedStores: [],
          preferredCategories: [],
          settings: {
            sortBy: "recent",
            maxDistance: 50
          },
          analytics: {
            lastFeedAccess: null,
            viewedProducts: [],
            categoryInteractions: {}
          },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }

      // Prepare response data
      const responseData = {
        userId: userPrefs.userId,
        followedStores: userPrefs.followedStores || [],
        preferredCategories: userPrefs.preferredCategories || [],
        settings: userPrefs.settings || {
          sortBy: "recent",
          maxDistance: 50
        },
        createdAt: userPrefs.createdAt,
        updatedAt: userPrefs.updatedAt
      }

      // Include store details if requested
      if (includeStoreDetails && userPrefs.followedStores?.length > 0) {
        const storeDetails = await Store.find({
          _id: { $in: userPrefs.followedStores }
        }).select('name category description location').lean()
        
        responseData.followedStoreDetails = storeDetails
      }

      // Include analytics if requested
      if (includeAnalytics && userPrefs.analytics) {
        responseData.analytics = {
          lastFeedAccess: userPrefs.analytics.lastFeedAccess,
          totalProductViews: userPrefs.analytics.viewedProducts?.length || 0,
          categoryInteractions: userPrefs.analytics.categoryInteractions || {},
          recentActivity: this.getRecentActivity(userPrefs.analytics)
        }
      }

      // Add computed statistics
      responseData.statistics = {
        followedStoresCount: userPrefs.followedStores?.length || 0,
        preferredCategoriesCount: userPrefs.preferredCategories?.length || 0,
        isNewUser: !userPrefs.analytics?.lastFeedAccess,
        accountAge: userPrefs.createdAt ? 
          Math.floor((Date.now() - new Date(userPrefs.createdAt)) / (1000 * 60 * 60 * 24)) : 0
      }

      // Return query result
      return {
        success: true,
        queryId: this.generateQueryId(),
        timestamp: new Date(),
        data: responseData
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
   * Get recent user activity summary
   */
  getRecentActivity(analytics) {
    const recentActivity = {
      recentViews: [],
      topCategories: [],
      lastWeekActivity: 0
    }

    if (analytics.viewedProducts) {
      // Get recent views (last 7 days)
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      recentActivity.recentViews = analytics.viewedProducts
        .filter(view => new Date(view.viewedAt) > weekAgo)
        .slice(-10) // Last 10 views

      recentActivity.lastWeekActivity = recentActivity.recentViews.length

      // Get top categories
      const categoryCount = {}
      analytics.viewedProducts.forEach(view => {
        if (view.category) {
          categoryCount[view.category] = (categoryCount[view.category] || 0) + 1
        }
      })

      recentActivity.topCategories = Object.entries(categoryCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([category, count]) => ({ category, count }))
    }

    return recentActivity
  }

  /**
   * Generate unique query ID for tracking
   */
  generateQueryId() {
    return `user_prefs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Validate query parameters
   */
  validate(params) {
    const errors = []

    if (!params.userId) {
      errors.push("userId is required")
    }

    if (params.includeStoreDetails !== undefined && typeof params.includeStoreDetails !== "boolean") {
      errors.push("includeStoreDetails must be a boolean")
    }

    if (params.includeAnalytics !== undefined && typeof params.includeAnalytics !== "boolean") {
      errors.push("includeAnalytics must be a boolean")
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

module.exports = GetUserPreferencesQuery
