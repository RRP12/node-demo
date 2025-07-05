// Feed/feedServiceCQRS.js - CQRS-based Feed Service
const CommandBus = require("./cqrs/CommandBus")
const QueryBus = require("./cqrs/QueryBus")

class FeedServiceCQRS {
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
          ...options
        },
        { userId, requestType: "feed" }
      )

      if (!result.success) {
        throw new Error(result.error)
      }

      // Track feed access using command
      await this.trackUserActivity(userId, "feed_access", {
        category: options.category,
        sortBy: options.sortBy
      })

      return result.data
    } catch (error) {
      console.error("Error getting personalized feed:", error)
      throw new Error("Failed to fetch personalized feed")
    }
  }

  /**
   * Get trending feed using CQRS Query
   * @param {Object} options - Feed options (category, days, etc.)
   * @returns {Object} - Trending feed data
   */
  async getTrendingFeed(options = {}) {
    try {
      const result = await this.queryBus.execute(
        "GetTrendingFeed",
        options,
        { requestType: "trending" }
      )

      if (!result.success) {
        throw new Error(result.error)
      }

      return result.data
    } catch (error) {
      console.error("Error getting trending feed:", error)
      throw new Error("Failed to fetch trending feed")
    }
  }

  /**
   * Get user feed preferences using CQRS Query
   * @param {String} userId - User ID
   * @param {Object} options - Query options
   * @returns {Object} - User preferences data
   */
  async getUserPreferences(userId, options = {}) {
    try {
      const result = await this.queryBus.execute(
        "GetUserPreferences",
        { 
          userId,
          ...options
        },
        { userId, requestType: "preferences" }
      )

      if (!result.success) {
        throw new Error(result.error)
      }

      return result.data
    } catch (error) {
      console.error("Error getting user preferences:", error)
      throw new Error("Failed to fetch user preferences")
    }
  }

  /**
   * Follow/Unfollow a store using CQRS Command
   * @param {String} userId - User ID
   * @param {String} storeId - Store ID
   * @param {String} action - "follow" or "unfollow"
   * @returns {Object} - Command result
   */
  async toggleStoreFollow(userId, storeId, action = "follow") {
    try {
      const result = await this.commandBus.execute(
        "FollowStore",
        {
          userId,
          storeId,
          action
        },
        { userId, requestType: "store_follow" }
      )

      if (!result.success) {
        throw new Error(result.error)
      }

      // Invalidate user's feed cache
      await this.invalidateUserFeedCache(userId)

      return result
    } catch (error) {
      console.error("Error toggling store follow:", error)
      throw new Error("Failed to update store follow status")
    }
  }

  /**
   * Update user category preferences using CQRS Command
   * @param {String} userId - User ID
   * @param {Array} categories - Preferred categories
   * @param {Object} settings - User settings
   * @returns {Object} - Command result
   */
  async updateCategoryPreferences(userId, categories, settings = null) {
    try {
      const result = await this.commandBus.execute(
        "UpdatePreferences",
        {
          userId,
          categories,
          settings
        },
        { userId, requestType: "update_preferences" }
      )

      if (!result.success) {
        throw new Error(result.error)
      }

      // Invalidate user's feed cache
      await this.invalidateUserFeedCache(userId)

      return result
    } catch (error) {
      console.error("Error updating category preferences:", error)
      throw new Error("Failed to update preferences")
    }
  }

  /**
   * Track user activity using CQRS Command
   * @param {String} userId - User ID
   * @param {String} activityType - Type of activity
   * @param {Object} data - Activity data
   * @returns {Object} - Command result
   */
  async trackUserActivity(userId, activityType, data = {}) {
    try {
      const result = await this.commandBus.execute(
        "TrackUserActivity",
        {
          userId,
          activityType,
          data
        },
        { userId, requestType: "track_activity" }
      )

      // Don't throw error for analytics failures
      if (!result.success) {
        console.warn("Failed to track user activity:", result.error)
      }

      return result
    } catch (error) {
      console.warn("Error tracking user activity:", error)
      // Don't throw - analytics failures shouldn't break the main flow
      return { success: false, error: error.message }
    }
  }

  /**
   * Invalidate user's feed cache
   * @param {String} userId - User ID
   */
  async invalidateUserFeedCache(userId) {
    try {
      await this.queryBus.invalidateCache(`GetPersonalizedFeed_${userId}`)
      await this.queryBus.invalidateCache(`GetUserPreferences_${userId}`)
    } catch (error) {
      console.warn("Error invalidating cache:", error)
    }
  }

  /**
   * Get CQRS system statistics
   * @returns {Object} - System statistics
   */
  getSystemStatistics() {
    return {
      commands: this.commandBus.getStatistics(),
      queries: this.queryBus.getStatistics(),
      registeredCommands: this.commandBus.getRegisteredCommands(),
      registeredQueries: this.queryBus.getRegisteredQueries()
    }
  }

  /**
   * Health check for CQRS system
   * @returns {Object} - Health status
   */
  async healthCheck() {
    try {
      // Test query execution
      const queryTest = await this.queryBus.execute(
        "GetTrendingFeed",
        { category: "electronics" },
        { requestType: "health_check" }
      )

      // Test command execution (dry run)
      const commandTest = await this.commandBus.execute(
        "TrackUserActivity",
        {
          userId: "health_check_user",
          activityType: "feed_access",
          data: { test: true }
        },
        { requestType: "health_check" }
      )

      return {
        status: "healthy",
        timestamp: new Date(),
        tests: {
          queryBus: queryTest.success,
          commandBus: commandTest.success
        },
        statistics: this.getSystemStatistics()
      }
    } catch (error) {
      return {
        status: "unhealthy",
        timestamp: new Date(),
        error: error.message,
        statistics: this.getSystemStatistics()
      }
    }
  }
}

module.exports = new FeedServiceCQRS()
