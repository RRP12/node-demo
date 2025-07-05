// Feed/cqrs/commands/UpdatePreferencesCommand.js - Command for updating user preferences
const UserFeedPreferences = require("../../feedSchema")
const { STORE_CATEGORIES } = require("../../../categories")

class UpdatePreferencesCommand {
  constructor() {
    this.name = "UpdatePreferencesCommand"
  }

  /**
   * Execute update preferences command
   * @param {Object} payload - Command payload
   * @param {String} payload.userId - User ID
   * @param {Array} payload.categories - Preferred categories
   * @param {Object} payload.settings - User settings
   * @returns {Object} - Command result
   */
  async execute(payload) {
    const { userId, categories, settings } = payload

    try {
      // Validate input
      const validation = this.validate(payload)
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(", ")}`)
      }

      // Build update object
      const updateData = {}
      
      if (categories) {
        updateData.preferredCategories = categories
      }

      if (settings) {
        updateData.settings = {
          ...updateData.settings,
          ...settings
        }
      }

      // Add timestamp
      updateData.updatedAt = new Date()

      // Execute command
      const result = await UserFeedPreferences.updateOne(
        { userId },
        { $set: updateData },
        { upsert: true }
      )

      // Return command result
      return {
        success: true,
        commandId: this.generateCommandId(),
        timestamp: new Date(),
        payload: {
          userId,
          categories,
          settings,
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
    return `update_prefs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Validate command payload
   */
  validate(payload) {
    const errors = []

    if (!payload.userId) {
      errors.push("userId is required")
    }

    // Validate categories if provided
    if (payload.categories) {
      if (!Array.isArray(payload.categories)) {
        errors.push("categories must be an array")
      } else {
        const invalidCategories = payload.categories.filter(
          cat => !STORE_CATEGORIES.includes(cat)
        )
        if (invalidCategories.length > 0) {
          errors.push(`Invalid categories: ${invalidCategories.join(", ")}`)
        }
      }
    }

    // Validate settings if provided
    if (payload.settings) {
      if (typeof payload.settings !== "object") {
        errors.push("settings must be an object")
      } else {
        // Validate sortBy if provided
        if (payload.settings.sortBy && 
            !["recent", "popular", "trending"].includes(payload.settings.sortBy)) {
          errors.push("settings.sortBy must be 'recent', 'popular', or 'trending'")
        }

        // Validate maxDistance if provided
        if (payload.settings.maxDistance && 
            (typeof payload.settings.maxDistance !== "number" || payload.settings.maxDistance <= 0)) {
          errors.push("settings.maxDistance must be a positive number")
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

module.exports = UpdatePreferencesCommand
