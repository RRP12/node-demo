# 📚 Feed Service API Reference

## 🚀 Base URL
```
http://localhost:3000/api/v1/feed
```

## 🔐 Authentication
All personalized endpoints require JWT token in Authorization header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 📋 API Endpoints

### 🎯 **GET /personalized**
Get personalized product feed for authenticated user.

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `category` | string | No | null | Filter by category (fashion, electronics, beauty, etc.) |
| `subCategory` | string | No | null | Filter by subcategory |
| `sortBy` | string | No | "recent" | Sort order: recent, popular, trending |
| `reelsOnly` | boolean | No | false | Show only products with video reels |
| `lat` | number | No | null | User latitude for location-based filtering |
| `lng` | number | No | null | User longitude for location-based filtering |
| `maxDistance` | number | No | 50 | Maximum distance in kilometers |

**Examples:**
```bash
# All fashion products
GET /feed/personalized?category=fashion

# Electronics with reels only
GET /feed/personalized?category=electronics&reelsOnly=true

# Trending products near user
GET /feed/personalized?sortBy=trending&lat=19.0760&lng=72.8777

# All products (no filter)
GET /feed/personalized
```

**Response:**
```json
{
  "success": true,
  "message": "Personalized feed retrieved successfully",
  "data": {
    "products": [
      {
        "_id": "68554142ffbc30794fb9aee8",
        "title": "Summer Floral Dress",
        "description": "Beautiful summer dress with floral patterns",
        "category": "fashion",
        "subCategory": "dresses",
        "price": {
          "original": 2500,
          "currency": "INR"
        },
        "media": {
          "images": ["https://example.com/dress1.jpg"],
          "reels": [
            {
              "url": "https://example.com/dress_reel.mp4",
              "thumbnail": "https://example.com/dress_thumb.jpg",
              "caption": "Perfect summer dress for any occasion!"
            }
          ]
        },
        "store": {
          "_id": "6855409cffbc30794fb9aed9",
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

---

### 🔥 **GET /trending**
Get trending products (public endpoint, no authentication required).

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `category` | string | No | null | Filter trending by category |

**Examples:**
```bash
# All trending products
GET /feed/trending

# Trending electronics
GET /feed/trending?category=electronics
```

**Response:**
```json
{
  "success": true,
  "message": "Trending feed retrieved successfully",
  "data": {
    "products": [
      {
        "_id": "6855417dffbc30794fb9aef0",
        "title": "iPhone 15 Pro",
        "category": "electronics",
        "price": {
          "original": 125000,
          "currency": "INR"
        },
        "store": {
          "name": "TechWorld Electronics",
          "category": "electronics"
        },
        "analytics": {
          "views": 1500,
          "likes": 200
        }
      }
    ],
    "count": 4
  }
}
```

---

### 👥 **POST /follow-store**
Follow a store for personalized feed.

**Request Body:**
```json
{
  "storeId": "6855409cffbc30794fb9aed9"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Store followed successfully"
}
```

---

### 👥 **DELETE /follow-store**
Unfollow a store.

**Request Body:**
```json
{
  "storeId": "6855409cffbc30794fb9aed9"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Store unfollowed successfully"
}
```

---

### ⚙️ **GET /preferences**
Get user's feed preferences.

**Response:**
```json
{
  "success": true,
  "message": "Feed preferences retrieved successfully",
  "data": {
    "followedStores": ["6855409cffbc30794fb9aed9"],
    "preferredCategories": ["fashion", "electronics"],
    "settings": {
      "sortBy": "recent",
      "maxDistance": 50
    }
  }
}
```

---

### ⚙️ **PUT /preferences**
Update user's feed preferences.

**Request Body:**
```json
{
  "categories": ["fashion", "beauty", "electronics"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Feed preferences updated successfully"
}
```

---

### 📂 **GET /categories**
Get available categories (public endpoint).

**Response:**
```json
{
  "success": true,
  "message": "Categories retrieved successfully",
  "data": {
    "categories": [
      "fashion",
      "beauty", 
      "electronics",
      "home-decor",
      "food-and-beverage",
      "kids-and-baby",
      "pets",
      "fitness",
      "art-and-collectibles",
      "others"
    ]
  }
}
```

---

## 🎯 Personalization Scoring

Products in personalized feed get scored based on:

| Factor | Points | Description |
|--------|--------|-------------|
| **Followed Store** | +10 | Product from a store user follows |
| **Preferred Category** | +5 | Product in user's preferred categories |
| **Has Reels** | +3 | Product has video content |
| **Posted Today** | +5 | Very recent content |
| **Posted This Week** | +3 | Recent content |
| **Posted This Month** | +1 | Somewhat recent |

**Example:**
```
User follows "Fashion Store" and prefers ["fashion", "electronics"]

Product: Dress from Fashion Store
- Followed store: +10
- Category match: +5 (fashion)
- Has reels: +3
- Posted today: +5
Total Score: 23 points
```

---

## 🚨 Error Responses

### **401 Unauthorized**
```json
{
  "message": "Unauthorized: Access token is missing"
}
```

### **400 Bad Request**
```json
{
  "success": false,
  "message": "Store ID is required"
}
```

### **500 Internal Server Error**
```json
{
  "success": false,
  "message": "Failed to get personalized feed",
  "error": "Database connection error"
}
```

---

## 📱 Mobile App Integration Examples

### **React Native**
```javascript
// Get fashion feed
const getFashionFeed = async () => {
  try {
    const response = await fetch(
      'http://localhost:3000/api/v1/feed/personalized?category=fashion',
      {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        }
      }
    )
    const data = await response.json()
    return data.data.products
  } catch (error) {
    console.error('Feed error:', error)
  }
}

// Follow a store
const followStore = async (storeId) => {
  try {
    const response = await fetch(
      'http://localhost:3000/api/v1/feed/follow-store',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ storeId })
      }
    )
    return await response.json()
  } catch (error) {
    console.error('Follow error:', error)
  }
}
```

### **Flutter/Dart**
```dart
// Get electronics feed
Future<List<Product>> getElectronicsFeed() async {
  final response = await http.get(
    Uri.parse('http://localhost:3000/api/v1/feed/personalized?category=electronics'),
    headers: {
      'Authorization': 'Bearer $userToken',
      'Content-Type': 'application/json',
    },
  );
  
  if (response.statusCode == 200) {
    final data = json.decode(response.body);
    return (data['data']['products'] as List)
        .map((product) => Product.fromJson(product))
        .toList();
  }
  throw Exception('Failed to load feed');
}
```

---

## 🔧 Testing with cURL

### **Get Fashion Feed**
```bash
curl -X GET "http://localhost:3000/api/v1/feed/personalized?category=fashion" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### **Follow Store**
```bash
curl -X POST "http://localhost:3000/api/v1/feed/follow-store" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"storeId": "6855409cffbc30794fb9aed9"}'
```

### **Get Trending**
```bash
curl -X GET "http://localhost:3000/api/v1/feed/trending?category=electronics" \
  -H "Content-Type: application/json"
```

---

## 📊 Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/personalized` | 100 requests | 1 minute |
| `/trending` | 200 requests | 1 minute |
| `/follow-store` | 50 requests | 1 minute |
| `/preferences` | 30 requests | 1 minute |

---

## 🎯 Best Practices

1. **Cache Results**: Cache category feeds locally for better performance
2. **Handle Errors**: Always implement proper error handling
3. **Use Categories**: Always specify category for better performance
4. **Follow Stores**: Encourage users to follow stores for better personalization
5. **Track Analytics**: Monitor user interactions for insights

---

## 🚀 Quick Start

1. **Get Categories**:
   ```bash
   GET /feed/categories
   ```

2. **Get Fashion Feed**:
   ```bash
   GET /feed/personalized?category=fashion
   ```

3. **Follow a Store**:
   ```bash
   POST /feed/follow-store
   {"storeId": "store_id_here"}
   ```

4. **Get Personalized Feed**:
   ```bash
   GET /feed/personalized
   ```

**Your feed will now be personalized based on followed stores!** 🎉
