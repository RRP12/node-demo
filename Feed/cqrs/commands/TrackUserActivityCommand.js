// Feed/cqrs/commands/TrackUserActivityCommand.js - Command for tracking user activity
const UserFeedPreferences = require("../../feedSchema")

class TrackUserActivityCommand {
  constructor() {
    this.name = "TrackUserActivityCommand"
  }

  /**
   * Execute track user activity command
   * @param {Object} payload - Command payload
   * @param {String} payload.userId - User ID
   * @param {String} payload.activityType - Type of activity (feed_access, product_view, etc.)
   * @param {Object} payload.data - Activity data
   * @returns {Object} - Command result
   */
  async execute(payload) {
    const { userId, activityType, data } = payload

    try {
      // Validate input
      const validation = this.validate(payload)
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(", ")}`)
      }

      let updateOperation = {}

      switch (activityType) {
        case "feed_access":
          updateOperation = {
            $set: {
              "analytics.lastFeedAccess": new Date()
            }
          }
          break

        case "product_view":
          updateOperation = {
            $push: {
              "analytics.viewedProducts": {
                productId: data.productId,
                category: data.category,
                viewedAt: new Date(),
                duration: data.duration || 0
              }
            }
          }
          break

        case "category_interaction":
          updateOperation = {
            $inc: {
              [`analytics.categoryInteractions.${data.category}`]: 1
            }
          }
          break

        case "search_query":
          updateOperation = {
            $push: {
              "analytics.searchQueries": {
                query: data.query,
                category: data.category,
                resultsCount: data.resultsCount,
                searchedAt: new Date()
              }
            }
          }
          break

        default:
          throw new Error(`Unknown activity type: ${activityType}`)
      }

      // Execute command
      const result = await UserFeedPreferences.updateOne(
        { userId },
        updateOperation,
        { upsert: true }
      )

      // Return command result
      return {
        success: true,
        commandId: this.generateCommandId(),
        timestamp: new Date(),
        payload: {
          userId,
          activityType,
          data,
          result: {
            matched: result.matchedCount,
            modified: result.modifiedCount,
            upserted: result.upsertedCount
          }
        }
      }

    } catch (error) {
      return {
        success: false,
        commandId: this.generateCommandId(),
        timestamp: new Date(),
        error: error.message,
        payload
      }
    }
  }

  /**
   * Generate unique command ID for tracking
   */
  generateCommandId() {
    return `track_activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Validate command payload
   */
  validate(payload) {
    const errors = []

    if (!payload.userId) {
      errors.push("userId is required")
    }

    if (!payload.activityType) {
      errors.push("activityType is required")
    } else {
      const validActivityTypes = [
        "feed_access", 
        "product_view", 
        "category_interaction", 
        "search_query"
      ]
      if (!validActivityTypes.includes(payload.activityType)) {
        errors.push(`activityType must be one of: ${validActivityTypes.join(", ")}`)
      }
    }

    // Validate data based on activity type
    if (payload.activityType === "product_view") {
      if (!payload.data || !payload.data.productId) {
        errors.push("data.productId is required for product_view activity")
      }
      if (!payload.data || !payload.data.category) {
        errors.push("data.category is required for product_view activity")
      }
    }

    if (payload.activityType === "category_interaction") {
      if (!payload.data || !payload.data.category) {
        errors.push("data.category is required for category_interaction activity")
      }
    }

    if (payload.activityType === "search_query") {
      if (!payload.data || !payload.data.query) {
        errors.push("data.query is required for search_query activity")
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

module.exports = TrackUserActivityCommand
