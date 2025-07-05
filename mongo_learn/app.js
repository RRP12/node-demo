const express = require("express")
const app = express()
const api = require("./api")
const bodyParser = require("body-parser")
const morgan = require("morgan")
const cors = require("cors")
const mongoose = require("mongoose")
// Middleware setup
app.use(bodyParser.json())
app.use(morgan("dev"))
app.use(cors())

// API routes
app.use("/api", api)

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Server is running!",
    endpoints: {
      api: "/api",
      health: "/health",
    },
  })
})

// Server health endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

mongoose.connect(
  "mongodb://localhost:27017/test?retryWrites=true&loadBalanced=false&serverSelectionTimeoutMS=5000&connectTimeoutMS=10000"
)

const db = mongoose.connection
db.on("error", console.error.bind(console, "connection error:"))
db.once("open", function () {
  console.log("Connected to MongoDB")

  app.listen(3000, () => {
    console.log("Server started on port 3000")
    console.log("API available at http://localhost:3000/api")
    console.log("Health check at http://localhost:3000/health")
  })
})

// Start server
