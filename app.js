// Load environment variables first
require("dotenv").config()

// Validate environment variables before starting
const { validateEnvironment } = require("./validateEnv")
validateEnvironment()

const express = require("express")
const cors = require("cors")
const app = express()
const mongoose = require("mongoose")

const config = require("./config")
const userRouter = require("./users/userRouter")

const authRoutes = require("./Auth/auth-server")
const storeRouter = require("./Store/routes/storeRouter")
const productRouter = require("./Product/routes/productRouter")
const mediaUploadRouter = require("./media-upload/routes/routes")
const feedRouter = require("./Feed/routes/feedRouter")

// CORS Configuration
const corsOptions = {
  origin: [
    "http://localhost:3000", // React development server
    "http://localhost:3001", // Alternative React port
    "http://localhost:8080", // Vue.js development server
    "http://localhost:8081", // Alternative Vue port
    "http://127.0.0.1:3000", // Local IP
    "http://127.0.0.1:3001", // Local IP alternative
    "null", // Allow file:// protocol for local testing
    // Add your production domains here
    // 'https://yourdomain.com',
    // 'https://www.yourdomain.com'
  ],
  credentials: true, // Allow cookies and auth headers
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  exposedHeaders: ["X-Total-Count"], // Expose custom headers to frontend
  maxAge: 86400, // Cache preflight requests for 24 hours
}

// Apply CORS middleware
app.use(cors(corsOptions))

const logger = (req, res, next) => {
  console.log(` logged ${req.method} ${req.url} ${new Date()} `)
  next()
}
app.use(logger)

// MongoDB Connection with improved configuration
const mongoURI = process.env.MONGO_URI || "mongodb://localhost:27017/yupp"

mongoose
  .connect(mongoURI, {
    // Modern MongoDB connection options
    maxPoolSize: 10, // Maintain up to 10 socket connections
    serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  })
  .then(() => {
    console.log("MongoDB connected successfully to:", mongoURI)
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err)
    process.exit(1) // Exit if can't connect to database
  })

// app.use(express.urlencoded())
app.use(express.json()) // For parsing application/json

// Serve static files (for test page)
app.use(express.static("."))

// API routes
app.use("/api/v1/stores", storeRouter)
app.use("/api/v1/users", userRouter)
app.use("/api/v1/auth", authRoutes)
app.use("/api/v1/products", productRouter)
app.use("/api/v1/media", mediaUploadRouter)
app.use("/api/v1/feed", feedRouter)

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    error: "Not Found",
    message: "The requested resource could not be found.",
  })
})

// Catch-all error handler (always returns JSON)
app.use((err, req, res, next) => {
  console.error("Global error handler:", err)
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
    details: err,
  })
})

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000")
})
// const users = [
//   { id: 1, name: "Alice" },
//   { id: 2, name: "Bob" },
//   { id: 3, name: "Charlie" },
// ]

// app.use(logger)

// app.get("/users/:id", (req, res) => {
//   const user = users.find((u) => u.id === parseInt(req.params.id))
//   try {
//     if (!user) return res.status(404).send("User not found")
//   } catch (error) {
//     return res.status(500).send("Internal Server Error")
//   }
//   res.json(user)
// })

// app.listen(3000, () => {
//   console.log("Server is running on http://localhost:3000")
// })
