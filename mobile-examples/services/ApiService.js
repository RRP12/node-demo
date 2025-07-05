// services/ApiService.js - Axios instance with token refresh interceptors
import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

// API Configuration
const API_CONFIG = {
  baseURL: __DEV__ 
    ? 'http://localhost:3000/api/v1'  // Development
    : 'https://your-api.com/api/v1',  // Production
  timeout: 15000,
}

// Create axios instance
const apiClient = axios.create(API_CONFIG)

// Token storage keys
const TOKEN_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
}

// Token management utilities
const TokenManager = {
  async getAccessToken() {
    try {
      return await AsyncStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN)
    } catch (error) {
      console.error('Error getting access token:', error)
      return null
    }
  },

  async getRefreshToken() {
    try {
      return await AsyncStorage.getItem(TOKEN_KEYS.REFRESH_TOKEN)
    } catch (error) {
      console.error('Error getting refresh token:', error)
      return null
    }
  },

  async setTokens(accessToken, refreshToken) {
    try {
      await AsyncStorage.multiSet([
        [TOKEN_KEYS.ACCESS_TOKEN, accessToken],
        [TOKEN_KEYS.REFRESH_TOKEN, refreshToken],
      ])
    } catch (error) {
      console.error('Error setting tokens:', error)
    }
  },

  async clearTokens() {
    try {
      await AsyncStorage.multiRemove([
        TOKEN_KEYS.ACCESS_TOKEN,
        TOKEN_KEYS.REFRESH_TOKEN,
      ])
    } catch (error) {
      console.error('Error clearing tokens:', error)
    }
  },

  async isTokenExpired(token) {
    if (!token) return true
    
    try {
      // Decode JWT payload (simple base64 decode)
      const payload = JSON.parse(atob(token.split('.')[1]))
      const currentTime = Date.now() / 1000
      
      // Check if token expires in next 30 seconds
      return payload.exp < (currentTime + 30)
    } catch (error) {
      console.error('Error checking token expiration:', error)
      return true
    }
  }
}

// Request interceptor - Add auth token to requests
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const accessToken = await TokenManager.getAccessToken()
      
      if (accessToken && !TokenManager.isTokenExpired(accessToken)) {
        config.headers.Authorization = `Bearer ${accessToken}`
      }
      
      // Log request in development
      if (__DEV__) {
        console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`)
      }
      
      return config
    } catch (error) {
      console.error('Request interceptor error:', error)
      return config
    }
  },
  (error) => {
    console.error('Request interceptor error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor - Handle token refresh
apiClient.interceptors.response.use(
  (response) => {
    // Log successful response in development
    if (__DEV__) {
      console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`)
    }
    return response
  },
  async (error) => {
    const originalRequest = error.config
    
    // Check if error is 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      try {
        const refreshToken = await TokenManager.getRefreshToken()
        
        if (!refreshToken) {
          // No refresh token, redirect to login
          await TokenManager.clearTokens()
          // You can emit an event here to redirect to login
          // EventEmitter.emit('LOGOUT')
          return Promise.reject(error)
        }
        
        // Attempt to refresh token
        const refreshResponse = await axios.post(
          `${API_CONFIG.baseURL}/auth/refresh`,
          { refreshToken },
          { timeout: 10000 }
        )
        
        const { accessToken, refreshToken: newRefreshToken } = refreshResponse.data
        
        // Save new tokens
        await TokenManager.setTokens(accessToken, newRefreshToken || refreshToken)
        
        // Update the original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        
        // Retry the original request
        return apiClient(originalRequest)
        
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError)
        
        // Refresh failed, clear tokens and redirect to login
        await TokenManager.clearTokens()
        // EventEmitter.emit('LOGOUT')
        
        return Promise.reject(refreshError)
      }
    }
    
    // Log error in development
    if (__DEV__) {
      console.error(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response?.status}`)
    }
    
    return Promise.reject(error)
  }
)

// API Service class
class ApiService {
  // Authentication endpoints
  async login(email, password) {
    try {
      const response = await apiClient.post('/auth/login', {
        email,
        password,
      })
      
      const { accessToken, refreshToken } = response.data
      await TokenManager.setTokens(accessToken, refreshToken)
      
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  }

  async logout() {
    try {
      // Call logout endpoint if available
      await apiClient.post('/auth/logout')
    } catch (error) {
      console.warn('Logout endpoint error:', error)
    } finally {
      // Always clear local tokens
      await TokenManager.clearTokens()
    }
  }

  async register(userData) {
    try {
      const response = await apiClient.post('/auth/register', userData)
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  }

  // Feed endpoints
  async getPersonalizedFeed(category = null) {
    try {
      const params = category ? { category } : {}
      const response = await apiClient.get('/feed/personalized', { params })
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  }

  async getTrendingFeed(category = null) {
    try {
      const params = category ? { category } : {}
      const response = await apiClient.get('/feed/trending', { params })
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  }

  async followStore(storeId) {
    try {
      const response = await apiClient.post('/feed/follow-store', { storeId })
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  }

  async unfollowStore(storeId) {
    try {
      const response = await apiClient.delete('/feed/follow-store', {
        data: { storeId }
      })
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  }

  async getUserPreferences() {
    try {
      const response = await apiClient.get('/feed/preferences')
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  }

  async updateUserPreferences(categories) {
    try {
      const response = await apiClient.put('/feed/preferences', { categories })
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  }

  async getCategories() {
    try {
      const response = await apiClient.get('/feed/categories')
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  }

  // Utility methods
  async isAuthenticated() {
    const accessToken = await TokenManager.getAccessToken()
    return accessToken && !TokenManager.isTokenExpired(accessToken)
  }

  handleError(error) {
    if (error.response) {
      // Server responded with error status
      return {
        message: error.response.data?.message || 'Server error',
        status: error.response.status,
        data: error.response.data,
      }
    } else if (error.request) {
      // Network error
      return {
        message: 'Network error. Please check your connection.',
        status: 0,
        data: null,
      }
    } else {
      // Other error
      return {
        message: error.message || 'An unexpected error occurred',
        status: -1,
        data: null,
      }
    }
  }
}

// Export singleton instance
export default new ApiService()
export { TokenManager }
