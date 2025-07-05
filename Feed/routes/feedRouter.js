// Feed/routes/feedRouter.js - Feed API routes
const express = require("express")
const router = express.Router()
const feedService = require("../feedServiceCQRS")
const { verifyToken } = require("../../middleware/auth")
const { sanitizeInput } = require("../../middleware/validation")

/**
 * GET /api/v1/feed/personalized
 * Get personalized feed for authenticated user
 */
router.get("/personalized", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id
    const options = {
      category: req.query.category,
      subCategory: req.query.subCategory,
      sortBy: req.query.sortBy || "recent",
      reelsOnly: req.query.reelsOnly === "true",
      location:
        req.query.lat && req.query.lng
          ? {
              lat: parseFloat(req.query.lat),
              lng: parseFloat(req.query.lng),
            }
          : null,
      maxDistance: parseInt(req.query.maxDistance) || 50,
    }

    const feed = await feedService.getPersonalizedFeed(userId, options)

    res.status(200).json({
      success: true,
      message: "Personalized feed retrieved successfully",
      data: feed,
    })
  } catch (error) {
    console.error("Error getting personalized feed:", error)
    res.status(500).json({
      success: false,
      message: "Failed to get personalized feed",
      error: error.message,
    })
  }
})

/**
 * GET /api/v1/feed/trending
 * Get trending products feed (public)
 */
router.get("/trending", async (req, res) => {
  try {
    const options = {
      category: req.query.category,
    }

    const feed = await feedService.getTrendingFeed(options)

    res.status(200).json({
      success: true,
      message: "Trending feed retrieved successfully",
      data: feed,
    })
  } catch (error) {
    console.error("Error getting trending feed:", error)
    res.status(500).json({
      success: false,
      message: "Failed to get trending feed",
      error: error.message,
    })
  }
})

/**
 * POST /api/v1/feed/follow-store
 * Follow a store for personalized feed
 */
router.post("/follow-store", verifyToken, sanitizeInput, async (req, res) => {
  try {
    const userId = req.user.id
    const { storeId } = req.body

    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: "Store ID is required",
      })
    }

    await feedService.toggleStoreFollow(userId, storeId, "follow")

    res.status(200).json({
      success: true,
      message: "Store followed successfully",
    })
  } catch (error) {
    console.error("Error following store:", error)
    res.status(500).json({
      success: false,
      message: "Failed to follow store",
      error: error.message,
    })
  }
})

/**
 * DELETE /api/v1/feed/follow-store
 * Unfollow a store
 */
router.delete("/follow-store", verifyToken, sanitizeInput, async (req, res) => {
  try {
    const userId = req.user.id
    const { storeId } = req.body

    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: "Store ID is required",
      })
    }

    await feedService.toggleStoreFollow(userId, storeId, "unfollow")

    res.status(200).json({
      success: true,
      message: "Store unfollowed successfully",
    })
  } catch (error) {
    console.error("Error unfollowing store:", error)
    res.status(500).json({
      success: false,
      message: "Failed to unfollow store",
      error: error.message,
    })
  }
})

/**
 * PUT /api/v1/feed/preferences
 * Update user feed preferences
 */
router.put("/preferences", verifyToken, sanitizeInput, async (req, res) => {
  try {
    const userId = req.user.id
    const { categories, settings } = req.body

    if (categories) {
      await feedService.updateCategoryPreferences(userId, categories)
    }

    // Update other settings if needed
    if (settings) {
      // Add settings update logic here
    }

    res.status(200).json({
      success: true,
      message: "Feed preferences updated successfully",
    })
  } catch (error) {
    console.error("Error updating preferences:", error)
    res.status(500).json({
      success: false,
      message: "Failed to update preferences",
      error: error.message,
    })
  }
})

/**
 * GET /api/v1/feed/preferences
 * Get user feed preferences
 */
router.get("/preferences", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id
    const preferences = await feedService.getUserPreferences(userId)

    res.status(200).json({
      success: true,
      message: "Feed preferences retrieved successfully",
      data: {
        followedStores: preferences.followedStores,
        preferredCategories: preferences.preferredCategories,
        settings: preferences.settings,
      },
    })
  } catch (error) {
    console.error("Error getting preferences:", error)
    res.status(500).json({
      success: false,
      message: "Failed to get preferences",
      error: error.message,
    })
  }
})

/**
 * GET /api/v1/feed/categories
 * Get available categories for feed filtering
 */
router.get("/categories", (req, res) => {
  const { STORE_CATEGORIES } = require("../../categories")

  res.status(200).json({
    success: true,
    message: "Categories retrieved successfully",
    data: {
      categories: STORE_CATEGORIES,
    },
  })
})

/**
 * GET /api/v1/feed/health
 * CQRS system health check
 */
router.get("/health", async (req, res) => {
  try {
    const healthStatus = await feedService.healthCheck()

    const statusCode = healthStatus.status === "healthy" ? 200 : 503

    res.status(statusCode).json({
      success: healthStatus.status === "healthy",
      message: `Feed service is ${healthStatus.status}`,
      data: healthStatus,
    })
  } catch (error) {
    res.status(503).json({
      success: false,
      message: "Feed service health check failed",
      error: error.message,
    })
  }
})

/**
 * GET /api/v1/feed/stats
 * CQRS system statistics
 */
router.get("/stats", async (req, res) => {
  try {
    const stats = feedService.getSystemStatistics()

    res.status(200).json({
      success: true,
      message: "CQRS system statistics retrieved successfully",
      data: stats,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get system statistics",
      error: error.message,
    })
  }
})

module.exports = router
