// Feed/cqrs/QueryBus.js - Query Bus for handling queries
const GetPersonalizedFeedQuery = require("./queries/GetPersonalizedFeedQuery")
const GetTrendingFeedQuery = require("./queries/GetTrendingFeedQuery")
const GetUserPreferencesQuery = require("./queries/GetUserPreferencesQuery")

class QueryBus {
  constructor() {
    this.queries = new Map()
    this.middleware = []
    this.cacheHandlers = []
    
    // Register queries
    this.registerQuery("GetPersonalizedFeed", new GetPersonalizedFeedQuery())
    this.registerQuery("GetTrendingFeed", new GetTrendingFeedQuery())
    this.registerQuery("GetUserPreferences", new GetUserPreferencesQuery())
  }

  /**
   * Register a query handler
   */
  registerQuery(queryName, queryHandler) {
    this.queries.set(queryName, queryHandler)
  }

  /**
   * Add middleware to query pipeline
   */
  addMiddleware(middleware) {
    this.middleware.push(middleware)
  }

  /**
   * Add cache handler
   */
  addCacheHandler(cacheHandler) {
    this.cacheHandlers.push(cacheHandler)
  }

  /**
   * Execute a query
   * @param {String} queryName - Name of the query
   * @param {Object} params - Query parameters
   * @param {Object} context - Execution context (user, request info, etc.)
   * @returns {Object} - Query result
   */
  async execute(queryName, params, context = {}) {
    const startTime = Date.now()
    
    try {
      // Get query handler
      const queryHandler = this.queries.get(queryName)
      if (!queryHandler) {
        throw new Error(`Query '${queryName}' not found`)
      }

      // Validate query parameters
      const validation = queryHandler.validate(params)
      if (!validation.isValid) {
        throw new Error(`Query validation failed: ${validation.errors.join(", ")}`)
      }

      // Check cache first
      const cacheKey = this.generateCacheKey(queryName, params, context)
      const cachedResult = await this.checkCache(cacheKey)
      if (cachedResult) {
        return {
          ...cachedResult,
          fromCache: true,
          executionTime: Date.now() - startTime
        }
      }

      // Execute middleware pipeline
      const enrichedParams = await this.executeMiddleware(params, context)

      // Execute query
      const result = await queryHandler.execute(enrichedParams)

      // Add execution metadata
      result.executionTime = Date.now() - startTime
      result.queryName = queryName
      result.context = context
      result.fromCache = false

      // Cache result if successful
      if (result.success) {
        await this.cacheResult(cacheKey, result, queryName)
      }

      // Log query execution
      this.logQueryExecution(queryName, result, context)

      return result

    } catch (error) {
      const errorResult = {
        success: false,
        queryName,
        error: error.message,
        executionTime: Date.now() - startTime,
        timestamp: new Date(),
        context,
        fromCache: false
      }

      // Log error
      this.logQueryError(queryName, error, context)

      return errorResult
    }
  }

  /**
   * Execute middleware pipeline
   */
  async executeMiddleware(params, context) {
    let enrichedParams = { ...params }

    for (const middleware of this.middleware) {
      enrichedParams = await middleware(enrichedParams, context)
    }

    return enrichedParams
  }

  /**
   * Generate cache key for query
   */
  generateCacheKey(queryName, params, context) {
    const keyData = {
      queryName,
      params,
      userId: context.userId
    }
    
    // Create a simple hash of the key data
    const keyString = JSON.stringify(keyData)
    return `query_${queryName}_${this.simpleHash(keyString)}`
  }

  /**
   * Simple hash function for cache keys
   */
  simpleHash(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * Check cache for existing result
   */
  async checkCache(cacheKey) {
    for (const cacheHandler of this.cacheHandlers) {
      try {
        const cachedResult = await cacheHandler.get(cacheKey)
        if (cachedResult) {
          return cachedResult
        }
      } catch (error) {
        console.error("Cache check error:", error)
      }
    }
    return null
  }

  /**
   * Cache query result
   */
  async cacheResult(cacheKey, result, queryName) {
    // Determine cache TTL based on query type
    const ttl = this.getCacheTTL(queryName)
    
    for (const cacheHandler of this.cacheHandlers) {
      try {
        await cacheHandler.set(cacheKey, result, ttl)
      } catch (error) {
        console.error("Cache set error:", error)
      }
    }
  }

  /**
   * Get cache TTL based on query type
   */
  getCacheTTL(queryName) {
    const ttlMap = {
      "GetPersonalizedFeed": 300,    // 5 minutes
      "GetTrendingFeed": 600,        // 10 minutes
      "GetUserPreferences": 1800     // 30 minutes
    }
    
    return ttlMap[queryName] || 300 // Default 5 minutes
  }

  /**
   * Log query execution
   */
  logQueryExecution(queryName, result, context) {
    console.log(`[QueryBus] ${queryName} executed`, {
      success: result.success,
      executionTime: result.executionTime,
      queryId: result.queryId,
      userId: context.userId,
      fromCache: result.fromCache,
      dataCount: result.data?.count || result.data?.products?.length || 0,
      timestamp: result.timestamp
    })
  }

  /**
   * Log query errors
   */
  logQueryError(queryName, error, context) {
    console.error(`[QueryBus] ${queryName} failed`, {
      error: error.message,
      userId: context.userId,
      timestamp: new Date()
    })
  }

  /**
   * Invalidate cache for specific patterns
   */
  async invalidateCache(pattern) {
    for (const cacheHandler of this.cacheHandlers) {
      try {
        if (cacheHandler.invalidatePattern) {
          await cacheHandler.invalidatePattern(pattern)
        }
      } catch (error) {
        console.error("Cache invalidation error:", error)
      }
    }
  }

  /**
   * Get list of registered queries
   */
  getRegisteredQueries() {
    return Array.from(this.queries.keys())
  }

  /**
   * Get query statistics
   */
  getStatistics() {
    return {
      registeredQueries: this.queries.size,
      middlewareCount: this.middleware.length,
      cacheHandlerCount: this.cacheHandlers.length
    }
  }
}

// Create singleton instance
const queryBus = new QueryBus()

// Add default middleware
queryBus.addMiddleware(async (params, context) => {
  // Add timestamp to all queries
  return {
    ...params,
    _timestamp: new Date(),
    _userId: context.userId
  }
})

// Add simple in-memory cache handler (for development)
const simpleCache = new Map()
queryBus.addCacheHandler({
  async get(key) {
    const cached = simpleCache.get(key)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data
    }
    simpleCache.delete(key)
    return null
  },
  
  async set(key, data, ttlSeconds) {
    simpleCache.set(key, {
      data,
      expiresAt: Date.now() + (ttlSeconds * 1000)
    })
  },
  
  async invalidatePattern(pattern) {
    for (const [key] of simpleCache) {
      if (key.includes(pattern)) {
        simpleCache.delete(key)
      }
    }
  }
})

module.exports = queryBus
