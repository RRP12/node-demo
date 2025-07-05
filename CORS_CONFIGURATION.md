# 🌐 CORS Configuration Documentation

## 🎯 Overview

CORS (Cross-Origin Resource Sharing) has been configured to allow your frontend applications to access the API from different domains and ports. This is essential for modern web development where frontend and backend often run on different ports.

## ✅ Current CORS Configuration

### **Allowed Origins**
```javascript
origin: [
  'http://localhost:3000',    // React development server
  'http://localhost:3001',    // Alternative React port
  'http://localhost:8080',    // Vue.js development server
  'http://localhost:8081',    // Alternative Vue port
  'http://127.0.0.1:3000',    // Local IP
  'http://127.0.0.1:3001',    // Local IP alternative
  // Production domains can be added here
]
```

### **Allowed Methods**
- `GET` - Read operations
- `POST` - Create operations
- `PUT` - Update operations
- `DELETE` - Delete operations
- `PATCH` - Partial updates
- `OPTIONS` - Preflight requests

### **Allowed Headers**
- `Content-Type` - For JSON/form data
- `Authorization` - For JWT tokens
- `X-Requested-With` - For AJAX requests
- `Accept` - Content negotiation
- `Origin` - Request origin

### **Security Features**
- ✅ **Credentials**: `true` - Allows cookies and auth headers
- ✅ **Exposed Headers**: `X-Total-Count` - Custom headers visible to frontend
- ✅ **Max Age**: `86400` seconds (24 hours) - Cache preflight requests
- ✅ **Origin Validation**: Only allowed domains can access the API

## 🧪 Testing CORS

### **1. Preflight Request Test**
```bash
curl -X OPTIONS "http://localhost:3000/api/v1/feed/trending" \
  -H "Origin: http://localhost:3001" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Authorization" \
  -I
```

**Expected Response:**
```
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: http://localhost:3001
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET,POST,PUT,DELETE,PATCH,OPTIONS
Access-Control-Allow-Headers: Content-Type,Authorization,X-Requested-With,Accept,Origin
Access-Control-Max-Age: 86400
```

### **2. Cross-Origin GET Request**
```bash
curl "http://localhost:3000/api/v1/feed/trending" \
  -H "Origin: http://localhost:3001" \
  -I
```

**Expected Response:**
```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: http://localhost:3001
Access-Control-Allow-Credentials: true
Content-Type: application/json
```

### **3. Unauthorized Origin Test**
```bash
curl "http://localhost:3000/api/v1/feed/trending" \
  -H "Origin: http://unauthorized-domain.com" \
  -I
```

**Expected Response:**
```
HTTP/1.1 200 OK
# Notice: NO Access-Control-Allow-Origin header
# Browser will block this request
```

## 📱 Frontend Integration Examples

### **React/JavaScript (fetch)**
```javascript
// This will work because localhost:3001 is allowed
const response = await fetch('http://localhost:3000/api/v1/feed/trending', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  credentials: 'include' // Include cookies/auth
})

const data = await response.json()
```

### **React/JavaScript (axios)**
```javascript
import axios from 'axios'

// Configure axios with CORS
const api = axios.create({
  baseURL: 'http://localhost:3000/api/v1',
  withCredentials: true, // Include cookies/auth
  headers: {
    'Content-Type': 'application/json'
  }
})

// Use the API
const response = await api.get('/feed/trending')
```

### **Vue.js Example**
```javascript
// In your Vue component
async fetchFeed() {
  try {
    const response = await this.$http.get('http://localhost:3000/api/v1/feed/trending', {
      headers: {
        'Authorization': `Bearer ${this.userToken}`
      },
      withCredentials: true
    })
    this.products = response.data.data.products
  } catch (error) {
    console.error('CORS or API error:', error)
  }
}
```

### **Angular Example**
```typescript
import { HttpClient, HttpHeaders } from '@angular/common/http'

constructor(private http: HttpClient) {}

getFeed() {
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${this.token}`
  })
  
  return this.http.get('http://localhost:3000/api/v1/feed/trending', {
    headers,
    withCredentials: true
  })
}
```

## 🚀 Production Configuration

### **Adding Production Domains**
```javascript
// In app.js, update corsOptions.origin:
origin: [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://yourdomain.com',        // Production domain
  'https://www.yourdomain.com',    // WWW version
  'https://app.yourdomain.com',    // App subdomain
  'https://admin.yourdomain.com'   // Admin subdomain
]
```

### **Environment-Based Configuration**
```javascript
// Dynamic CORS based on environment
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://yourdomain.com',
        'https://www.yourdomain.com'
      ]
    : [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:8080',
        'http://localhost:8081'
      ],
  credentials: true,
  // ... other options
}
```

### **Wildcard for Development (NOT for Production)**
```javascript
// ONLY for development - NEVER use in production
const corsOptions = {
  origin: process.env.NODE_ENV === 'development' ? true : allowedOrigins,
  // ... other options
}
```

## 🔒 Security Best Practices

### **✅ DO:**
- ✅ **Specify exact origins** instead of wildcards
- ✅ **Use HTTPS** in production
- ✅ **Validate origins** against a whitelist
- ✅ **Set credentials: true** only when needed
- ✅ **Use environment variables** for production domains
- ✅ **Monitor CORS errors** in logs

### **❌ DON'T:**
- ❌ **Use `origin: "*"`** with `credentials: true`
- ❌ **Allow all origins** in production
- ❌ **Expose sensitive headers** unnecessarily
- ❌ **Set overly long** max-age values
- ❌ **Ignore CORS errors** in development

## 🐛 Common CORS Issues & Solutions

### **Issue 1: "CORS policy: No 'Access-Control-Allow-Origin' header"**
**Solution:** Add your frontend domain to the `origin` array
```javascript
origin: [
  'http://localhost:3000',
  'http://your-frontend-domain.com' // Add this
]
```

### **Issue 2: "CORS policy: The request client is not a secure context"**
**Solution:** Use HTTPS in production or localhost for development

### **Issue 3: "CORS policy: Request header field authorization is not allowed"**
**Solution:** Add 'Authorization' to `allowedHeaders`
```javascript
allowedHeaders: [
  'Content-Type',
  'Authorization', // Make sure this is included
  'X-Requested-With'
]
```

### **Issue 4: Cookies not being sent**
**Solution:** Set `credentials: true` and `withCredentials: true` on frontend

## 📊 CORS Monitoring

### **Server Logs**
CORS requests will show in your server logs:
```
logged OPTIONS /api/v1/feed/trending Fri Jun 20 2025 17:31:39 GMT+0530
logged GET /api/v1/feed/trending Fri Jun 20 2025 17:31:39 GMT+0530
```

### **Browser DevTools**
Check Network tab for:
- ✅ **Preflight OPTIONS** requests
- ✅ **Access-Control-Allow-Origin** headers
- ❌ **CORS error messages** in console

## 🎯 Summary

Your API now supports CORS and can be accessed from:
- ✅ **React apps** on localhost:3000, 3001
- ✅ **Vue.js apps** on localhost:8080, 8081
- ✅ **Any frontend** on allowed origins
- ✅ **Mobile apps** using WebView
- ✅ **Browser extensions** (with proper origin)

**CORS is properly configured for development and ready for production!** 🚀

## 🔧 Quick Commands

```bash
# Test CORS preflight
curl -X OPTIONS "http://localhost:3000/api/v1/feed/trending" \
  -H "Origin: http://localhost:3001" -I

# Test cross-origin request
curl "http://localhost:3000/api/v1/feed/trending" \
  -H "Origin: http://localhost:3001" -I

# Test unauthorized origin
curl "http://localhost:3000/api/v1/feed/trending" \
  -H "Origin: http://evil-site.com" -I
```
