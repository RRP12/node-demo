// Feed/cqrs/commands/FollowStoreCommand.js - Command for following/unfollowing stores
const UserFeedPreferences = require("../../feedSchema")

class FollowStoreCommand {
  constructor() {
    this.name = "FollowStoreCommand"
  }

  /**
   * Execute follow store command
   * @param {Object} payload - Command payload
   * @param {String} payload.userId - User ID
   * @param {String} payload.storeId - Store ID to follow
   * @param {String} payload.action - "follow" or "unfollow"
   * @returns {Object} - Command result
   */
  async execute(payload) {
    const { userId, storeId, action } = payload

    try {
      // Validate input
      if (!userId || !storeId || !action) {
        throw new Error("Missing required fields: userId, storeId, action")
      }

      if (!["follow", "unfollow"].includes(action)) {
        throw new Error("Action must be 'follow' or 'unfollow'")
      }

      // Execute command based on action
      const update = action === "follow" 
        ? { $addToSet: { followedStores: storeId } }
        : { $pull: { followedStores: storeId } }

      const result = await UserFeedPreferences.updateOne(
        { userId },
        update,
        { upsert: true }
      )

      // Return command result
      return {
        success: true,
        commandId: this.generateCommandId(),
        timestamp: new Date(),
        payload: {
          userId,
          storeId,
          action,
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
    return `follow_store_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Validate command payload
   */
  validate(payload) {
    const errors = []

    if (!payload.userId) {
      errors.push("userId is required")
    }

    if (!payload.storeId) {
      errors.push("storeId is required")
    }

    if (!payload.action) {
      errors.push("action is required")
    } else if (!["follow", "unfollow"].includes(payload.action)) {
      errors.push("action must be 'follow' or 'unfollow'")
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

module.exports = FollowStoreCommand
