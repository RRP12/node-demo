// Feed/cqrs/queries/GetTrendingFeedQuery.js - Query for getting trending feed
const Product = require("../../../Product/productSchema")

class GetTrendingFeedQuery {
  constructor() {
    this.name = "GetTrendingFeedQuery"
  }

  /**
   * Execute trending feed query
   * @param {Object} params - Query parameters
   * @param {String} params.category - Category filter
   * @param {Number} params.days - Number of days to look back (default: 7)
   * @returns {Object} - Query result
   */
  async execute(params) {
    const {
      category = null,
      days = 7
    } = params

    try {
      // Build query for trending products
      const query = this.buildTrendingQuery(category, days)
      
      // Execute query
      const products = await Product.find(query)
        .populate('store', 'name category location')
        .sort({
          "analytics.views": -1,
          "analytics.likes": -1,
          createdAt: -1
        })
        .lean()
      
      // Apply trending scoring
      const trendingProducts = this.applyTrendingScoring(products)
      
      // Return query result
      return {
        success: true,
        queryId: this.generateQueryId(),
        timestamp: new Date(),
        data: {
          products: trendingProducts,
          count: trendingProducts.length,
          filters: {
            category,
            days
          },
          metadata: {
            queryType: "trending",
            timeRange: `${days} days`,
            sortedBy: "trending_score"
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
   * Build query for trending products
   */
  buildTrendingQuery(category, days) {
    const query = {
      isPublished: true,
      isDeleted: { $ne: true },
      createdAt: { 
        $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) 
      }
    }

    if (category) {
      query.category = category
    }

    return query
  }

  /**
   * Apply trending scoring algorithm
   */
  applyTrendingScoring(products) {
    return products.map(product => {
      let trendingScore = 0
      
      // Base analytics score
      const views = product.analytics?.views || 0
      const likes = product.analytics?.likes || 0
      const saves = product.analytics?.saves || 0
      const shares = product.analytics?.shares || 0
      
      // Weighted scoring
      trendingScore += views * 1        // 1 point per view
      trendingScore += likes * 5        // 5 points per like
      trendingScore += saves * 10       // 10 points per save
      trendingScore += shares * 15      // 15 points per share
      
      // Recency boost (newer content gets higher score)
      const hoursOld = (Date.now() - new Date(product.createdAt)) / (1000 * 60 * 60)
      if (hoursOld < 24) {
        trendingScore *= 2.0    // 2x boost for content < 24 hours
      } else if (hoursOld < 72) {
        trendingScore *= 1.5    // 1.5x boost for content < 72 hours
      } else if (hoursOld < 168) {
        trendingScore *= 1.2    // 1.2x boost for content < 1 week
      }
      
      // Engagement rate boost
      const engagementRate = views > 0 ? (likes + saves + shares) / views : 0
      if (engagementRate > 0.1) {
        trendingScore *= 1.3    // 30% boost for high engagement
      } else if (engagementRate > 0.05) {
        trendingScore *= 1.1    // 10% boost for medium engagement
      }
      
      // Featured content boost
      if (product.isFeatured) {
        trendingScore *= 1.2    // 20% boost for featured products
      }
      
      // Reels content boost (video performs better)
      if (product.media?.reels?.length > 0) {
        trendingScore *= 1.4    // 40% boost for video content
      }
      
      return {
        ...product,
        _trendingScore: Math.round(trendingScore),
        _engagementRate: engagementRate,
        _hoursOld: Math.round(hoursOld)
      }
    }).sort((a, b) => b._trendingScore - a._trendingScore)
  }

  /**
   * Generate unique query ID for tracking
   */
  generateQueryId() {
    return `trending_feed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Validate query parameters
   */
  validate(params) {
    const errors = []

    if (params.days && (typeof params.days !== "number" || params.days <= 0 || params.days > 30)) {
      errors.push("days must be a positive number between 1 and 30")
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

module.exports = GetTrendingFeedQuery
