# 📱 Feed Service Documentation

## 🎯 Overview

The Feed Service provides personalized product feeds for mobile e-commerce applications using a **Fan-out on Read** strategy. It delivers category-based filtering, store following, and personalized content ranking without complex pagination.

## 🏗️ Architecture

### **Strategy: Fan-out on Read**
- **Real-time queries** when user opens feed
- **Dynamic personalization** based on user preferences
- **Category-based filtering** from UI selection
- **No pagination complexity** - perfect for mobile

### **Core Components**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Feed Routes   │───▶│  Feed Service   │───▶│   Database      │
│                 │    │                 │    │                 │
│ • /personalized │    │ • Query Builder │    │ • Products      │
│ • /trending     │    │ • Personalization│   │ • Stores        │
│ • /follow-store │    │ • Scoring       │    │ • User Prefs    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### **1. Basic Feed Request**
```javascript
GET /api/v1/feed/personalized?category=fashion
Authorization: Bearer YOUR_JWT_TOKEN
```

### **2. Response Format**
```json
{
  "success": true,
  "message": "Personalized feed retrieved successfully",
  "data": {
    "products": [
      {
        "_id": "68554142ffbc30794fb9aee8",
        "title": "Summer Floral Dress",
        "category": "fashion",
        "price": { "original": 2500, "currency": "INR" },
        "store": {
          "name": "Trendy Fashion Hub",
          "category": "fashion"
        },
        "_personalizedScore": 23
      }
    ],
    "count": 1,
    "filters": {
      "category": "fashion",
      "sortBy": "recent",
      "reelsOnly": false
    }
  }
}
```

## 📋 API Endpoints

### **🎯 Personalized Feed**
```http
GET /api/v1/feed/personalized
```

**Query Parameters:**
- `category` (optional): Filter by category (fashion, electronics, beauty, etc.)
- `subCategory` (optional): Filter by subcategory
- `sortBy` (optional): Sort order (recent, popular, trending) - default: recent
- `reelsOnly` (optional): Show only products with video reels - default: false
- `lat` & `lng` (optional): User location for nearby stores
- `maxDistance` (optional): Maximum distance in km - default: 50

**Examples:**
```javascript
// Fashion products only
GET /feed/personalized?category=fashion

// Electronics with video reels
GET /feed/personalized?category=electronics&reelsOnly=true

// Trending products near user
GET /feed/personalized?sortBy=trending&lat=19.0760&lng=72.8777

// All products (no filter)
GET /feed/personalized
```

### **🔥 Trending Feed (Public)**
```http
GET /api/v1/feed/trending
```

**Query Parameters:**
- `category` (optional): Filter trending by category

**Examples:**
```javascript
// All trending products
GET /feed/trending

// Trending electronics
GET /feed/trending?category=electronics
```

### **👥 Store Following**
```http
POST /api/v1/feed/follow-store
DELETE /api/v1/feed/follow-store
```

**Request Body:**
```json
{
  "storeId": "6855409cffbc30794fb9aed9"
}
```

### **⚙️ User Preferences**
```http
GET /api/v1/feed/preferences
PUT /api/v1/feed/preferences
```

**Update Preferences:**
```json
{
  "categories": ["fashion", "beauty", "electronics"]
}
```

### **📂 Available Categories**
```http
GET /api/v1/feed/categories
```

## 🧠 How Personalization Works

### **Scoring Algorithm**
Each product gets a personalized score based on:

| **Factor** | **Points** | **Description** |
|------------|------------|-----------------|
| **Followed Store** | +10 | Product from a store user follows |
| **Preferred Category** | +5 | Product in user's preferred categories |
| **Has Reels** | +3 | Product has video content |
| **Posted Today** | +5 | Very recent content |
| **Posted This Week** | +3 | Recent content |
| **Posted This Month** | +1 | Somewhat recent |

### **Example Scoring**
```javascript
// User follows "Fashion Store" and prefers ["fashion", "electronics"]

Product A: iPhone from Electronics Store
- Category match: +5 (electronics)
- Has reels: +3
- Posted today: +5
- Total: 13 points

Product B: Dress from Fashion Store (followed)
- Followed store: +10
- Category match: +5 (fashion)
- Has reels: +3
- Posted today: +5
- Total: 23 points ← Higher ranking
```

## 🎯 Mobile App Integration

### **React Native Example**
```javascript
import { useState, useEffect } from 'react'

const FeedScreen = () => {
  const [products, setProducts] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('fashion')
  
  const loadFeed = async (category) => {
    const response = await fetch(
      `/api/v1/feed/personalized?category=${category}`,
      {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      }
    )
    const data = await response.json()
    setProducts(data.data.products)
  }
  
  useEffect(() => {
    loadFeed(selectedCategory)
  }, [selectedCategory])
  
  return (
    <View>
      {/* Category Tabs */}
      <CategoryTabs 
        selected={selectedCategory}
        onSelect={setSelectedCategory}
      />
      
      {/* Products List */}
      <FlatList
        data={products}
        renderItem={({ item }) => <ProductCard product={item} />}
      />
    </View>
  )
}
```

### **Category Switching**
```javascript
const categories = ['fashion', 'electronics', 'beauty', 'home-decor']

const CategoryTabs = ({ selected, onSelect }) => (
  <ScrollView horizontal>
    {categories.map(category => (
      <TouchableOpacity
        key={category}
        onPress={() => onSelect(category)}
        style={[
          styles.tab,
          selected === category && styles.activeTab
        ]}
      >
        <Text>{category}</Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
)
```

## 🔧 Technical Implementation

### **Database Queries**
The service builds MongoDB queries dynamically:

```javascript
// Basic query structure
const query = {
  isPublished: true,
  isDeleted: { $ne: true }
}

// Add category filter
if (category) {
  query.category = category
}

// Add store following
if (userFollowsStores) {
  query.$or = [
    { store: { $in: followedStoreIds } },
    { category: { $in: preferredCategories } }
  ]
}
```

### **Indexes for Performance**
```javascript
// Product collection indexes
{ store: 1, category: 1, subCategory: 1 }
{ isPublished: 1, isDeleted: 1, createdAt: -1 }
{ category: 1, createdAt: -1 }
{ "analytics.views": -1, "analytics.likes": -1 }
```

## 📊 Data Models

### **User Feed Preferences**
```javascript
{
  userId: ObjectId,
  followedStores: [ObjectId],
  preferredCategories: ["fashion", "electronics"],
  settings: {
    sortBy: "recent",
    maxDistance: 50
  },
  analytics: {
    viewedProducts: [...],
    lastFeedAccess: Date
  }
}
```

### **Product with Analytics**
```javascript
{
  title: "Summer Floral Dress",
  category: "fashion",
  store: ObjectId,
  analytics: {
    views: 1500,
    likes: 200,
    saves: 50,
    recentViews: 100
  },
  isPublished: true,
  isFeatured: true
}
```

## 🎨 Frontend UI Patterns

### **Category-Based Navigation**
```
┌─────────────────────────────────────┐
│ [Fashion] [Electronics] [Beauty]    │ ← Category tabs
├─────────────────────────────────────┤
│ 📱 iPhone 15 Pro                   │
│ ⭐ 4.8 • 💖 1.2K • TechWorld       │
├─────────────────────────────────────┤
│ 👗 Summer Dress                    │
│ ⭐ 4.9 • 💖 856 • Fashion Hub      │
└─────────────────────────────────────┘
```

### **No Pagination Needed**
- ✅ **Single API call** gets all products in category
- ✅ **Instant switching** between categories
- ✅ **Simple state management**
- ✅ **Fast user experience**

## 🚀 Performance Benefits

### **Why No Pagination?**
1. **Mobile UX**: Users expect instant category switching
2. **Simplicity**: No complex state management
3. **Speed**: Single API call vs multiple paginated calls
4. **Memory**: Modern phones can handle reasonable product lists
5. **Caching**: Easier to cache complete category results

### **Optimization Strategies**
- **Database indexes** for fast queries
- **Lean queries** (exclude unnecessary fields)
- **Store population** only essential fields
- **Personalization scoring** in memory
- **Category-based caching** potential

## 🔄 Scaling Considerations

### **Current: Fan-out on Read**
- ✅ **Simple implementation**
- ✅ **Real-time results**
- ✅ **Easy to modify**
- ⚠️ **Query cost per request**

### **Future: Fan-out on Write**
When scaling to millions of users:
- **Pre-compute feeds** for each user
- **Redis caching** for fast access
- **Background jobs** for feed updates
- **CDN integration** for media

## 📈 Analytics & Monitoring

### **Key Metrics to Track**
- Feed load times
- Category switching frequency
- User engagement per category
- Store following conversion
- Product view-through rates

### **Performance Monitoring**
```javascript
// Log feed performance
console.log(`Feed query took ${queryTime}ms for ${productCount} products`)

// Track user behavior
analytics.track('feed_viewed', {
  category: selectedCategory,
  productCount: products.length,
  loadTime: responseTime
})
```

## 🛠️ Development Setup

### **Environment Variables**
```bash
MONGO_URI=mongodb://localhost:27017/yupp
ACCESS_TOKEN_SECRET=your_jwt_secret
```

### **Testing the Feed**
```bash
# Start server
npm start

# Test fashion feed
curl "http://localhost:3000/api/v1/feed/personalized?category=fashion" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test trending feed
curl "http://localhost:3000/api/v1/feed/trending"
```

## 🎯 Best Practices

### **Mobile App Development**
1. **Cache category results** locally
2. **Show loading states** during category switches
3. **Implement pull-to-refresh** for feed updates
4. **Use optimistic updates** for following stores
5. **Handle offline scenarios** gracefully

### **API Usage**
1. **Always include category** for better performance
2. **Use store following** for personalization
3. **Implement proper error handling**
4. **Cache user preferences** locally
5. **Track user interactions** for analytics

---

## 🎉 Summary

The Feed Service provides a **simple, fast, and personalized** product feed experience optimized for mobile applications. With no pagination complexity and intelligent personalization, it delivers exactly what users want to see based on their preferences and behavior.

**Perfect for modern mobile e-commerce apps!** 📱🚀
