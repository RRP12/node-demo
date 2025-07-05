// Feed/feedService.js - CQRS-based Feed Service
const CommandBus = require("./cqrs/CommandBus")
const QueryBus = require("./cqrs/QueryBus")

class FeedService {
  constructor() {
    this.commandBus = CommandBus
    this.queryBus = QueryBus
  }

  /**
   * Get personalized feed for user using CQRS Query
   * @param {String} userId - User ID
   * @param {Object} options - Feed options (category, sortBy, etc.)
   * @returns {Object} - Feed data with products
   */
  async getPersonalizedFeed(userId, options = {}) {
    try {
      const result = await this.queryBus.execute(
        "GetPersonalizedFeed",
        {
          userId,
          ...options,
        },
        { userId, requestType: "feed" }
      )

      if (!result.success) {
        throw new Error(result.error)
      }

      // Track feed access
      await this.trackUserActivity(userId, "feed_access", {
        category: options.category,
        sortBy: options.sortBy,
      })

      return result.data
    } catch (error) {
      console.error("Error getting personalized feed:", error)
      throw new Error("Failed to fetch personalized feed")
    }
  }

  /**
   * Get user feed preferences, create default if not exists
   */
  async getUserPreferences(userId) {
    let userPrefs = await UserFeedPreferences.findOne({ userId })

    if (!userPrefs) {
      // Create minimal default preferences - user should set their interests
      userPrefs = await UserFeedPreferences.create({
        userId,
        followedStores: [],
        preferredCategories: [], // Empty - user needs to choose their interests
        settings: {
          sortBy: "recent",
          maxDistance: 50,
        },
      })
    }

    return userPrefs
  }

  /**
   * Build MongoDB query for feed based on preferences and filters
   */
  async buildFeedQuery(userPrefs, filters) {
    const query = {
      isPublished: true,
      isDeleted: { $ne: true },
    }

    // If user selects a specific category from UI, show only that category
    if (filters.category) {
      query.category = filters.category
    } else {
      // If no category filter, use user's followed stores and preferences
      if (userPrefs.followedStores && userPrefs.followedStores.length > 0) {
        query.$or = [
          { store: { $in: userPrefs.followedStores } },
          { category: { $in: userPrefs.preferredCategories } },
        ]
      } else if (
        userPrefs.preferredCategories &&
        userPrefs.preferredCategories.length > 0
      ) {
        // If not following any stores, use preferred categories
        query.category = { $in: userPrefs.preferredCategories }
      }
      // If no preferences and no category selected, show all published products
    }

    // Apply subcategory filter
    if (filters.subCategory) {
      query.subCategory = filters.subCategory
    }

    // Apply reels only filter
    if (filters.reelsOnly) {
      query["media.reels.0"] = { $exists: true }
    }

    // Location-based filtering (if store has location)
    if (filters.location && filters.maxDistance) {
      const storesNearby = await Store.find({
        location: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [filters.location.lng, filters.location.lat],
            },
            $maxDistance: filters.maxDistance * 1000, // Convert km to meters
          },
        },
      }).select("_id")

      const nearbyStoreIds = storesNearby.map((store) => store._id)

      if (query.$or) {
        query.$or.push({ store: { $in: nearbyStoreIds } })
      } else {
        query.store = { $in: nearbyStoreIds }
      }
    }

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
          createdAt: -1,
        }
      case "trending":
        return {
          "analytics.recentViews": -1,
          createdAt: -1,
        }
      case "recent":
      default:
        return { createdAt: -1 }
    }
  }

  /**
   * Apply personalization scoring to products
   */
  async applyPersonalizationScoring(products, userPrefs) {
    return products
      .map((product) => {
        let score = 0

        // Boost score for followed stores
        if (userPrefs.followedStores.includes(product.store._id)) {
          score += 10
        }

        // Boost score for preferred categories
        if (userPrefs.preferredCategories.includes(product.category)) {
          score += 5
        }

        // Boost score for products with reels
        if (
          product.media &&
          product.media.reels &&
          product.media.reels.length > 0
        ) {
          score += 3
        }

        // Add recency boost (newer products get higher score)
        const daysSinceCreated =
          (Date.now() - new Date(product.createdAt)) / (1000 * 60 * 60 * 24)
        if (daysSinceCreated < 1) score += 5
        else if (daysSinceCreated < 7) score += 3
        else if (daysSinceCreated < 30) score += 1

        return {
          ...product,
          _personalizedScore: score,
        }
      })
      .sort((a, b) => b._personalizedScore - a._personalizedScore)
  }

  /**
   * Update user analytics for better personalization
   */
  async updateUserAnalytics(userId, data) {
    try {
      await UserFeedPreferences.updateOne(
        { userId },
        {
          $set: {
            "analytics.lastFeedAccess": data.feedAccess,
          },
          $push: {
            "analytics.viewedProducts": {
              $each:
                data.viewedCategories?.map((cat) => ({
                  category: cat,
                  viewedAt: new Date(),
                })) || [],
            },
          },
        }
      )
    } catch (error) {
      console.error("Error updating user analytics:", error)
    }
  }

  /**
   * Follow/Unfollow a store
   */
  async toggleStoreFollow(userId, storeId, action = "follow") {
    const update =
      action === "follow"
        ? { $addToSet: { followedStores: storeId } }
        : { $pull: { followedStores: storeId } }

    return await UserFeedPreferences.updateOne({ userId }, update, {
      upsert: true,
    })
  }

  /**
   * Update user category preferences
   */
  async updateCategoryPreferences(userId, categories) {
    return await UserFeedPreferences.updateOne(
      { userId },
      { $set: { preferredCategories: categories } },
      { upsert: true }
    )
  }

  /**
   * Get trending products across platform
   */
  async getTrendingFeed(options = {}) {
    const { category = null } = options

    const query = {
      isPublished: true,
      isDeleted: { $ne: true },
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
    }

    if (category) {
      query.category = category
    }

    const products = await Product.find(query)
      .populate("store", "name category location")
      .sort({
        "analytics.views": -1,
        "analytics.likes": -1,
        createdAt: -1,
      })
      .lean()

    return {
      products,
      count: products.length,
    }
  }
}

module.exports = new FeedService()
