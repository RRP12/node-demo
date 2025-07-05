// middleware/auth.js - Simple JWT authentication middleware for MVP
const jwt = require("jsonwebtoken")

/**
 * Simple middleware to verify JWT token and attach user to request
 * This replaces the duplicate verifyToken functions across your app
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1] // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      message: "Unauthorized: Access token is missing",
    })
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, user) => {
    if (error) {
      console.error("JWT Verification Error:", error.name, error.message)

      let message = "Forbidden: Invalid access token"
      let statusCode = 403

      if (error.name === "TokenExpiredError") {
        message = "Forbidden: Access token has expired"
        statusCode = 401
      } else if (error.name === "JsonWebTokenError") {
        message = "Forbidden: Malformed access token"
      }

      return res.status(statusCode).json({ message: message })
    }

    // Attach decoded user payload to request object
    // Now req.user contains: { id, email, role, iat, exp }
    req.user = user
    next()
  })
}

module.exports = {
  verifyToken,
}
