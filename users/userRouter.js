const { Router } = require("express")
const express = require("express")
const routes = express.Router()
const jwt = require("jsonwebtoken")
// Import verifyToken middleware
const userController = require("./userController")

// Apply verifyToken middleware to all routes in this router
routes.get("/", verifyToken, (req, res) => {
  try {
    userController.getUsers((err, result) => {
      if (err) {
        // Improved error handling: log and return the actual error
        console.error("Error in GET /api/v1/users:", err)
        return res.status(500).json({ error: err.message || err })
      }
      return res.status(200).send({ status: "OK", result })
    })
  } catch (error) {
    console.error("Unexpected error in GET /api/v1/users:", error)
    return res.status(500).json({ error: error.message || error })
  }
})

routes.get("/:id", verifyToken, (req, res) => {
  try {
    const id = req.params.id

    userController.getUserById(id, (err, result) => {
      if (err) {
        // Send the error message for better debugging
        const errorMessage = err.message || "Failed to retrieve user."
        let statusCode = 404
        if (!err.message || !err.message.toLowerCase().includes("not found")) {
          statusCode = 500 // Internal server error for other types of errors
        }
        return res.status(statusCode).json({ error: errorMessage })
      }
      return res.status(200).send({ status: "OK", result })
    })
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Internal Server Error some time try ", error })
  }
})

routes.put("/:id", verifyToken, (req, res) => {
  try {
    const id = req.params.id
    const userName = req.body.name

    console.log("userName", userName)

    userController.updateUserDetails(id, userName, (err, result) => {
      if (err) {
        // Send the error message
        const errorMessage = err.message || "Failed to update user."
        let statusCode = 404 // Default for "User not found"
        if (
          err.message &&
          err.message.toLowerCase().includes("user not found")
        ) {
          statusCode = 404
        } else {
          statusCode = 500 // Internal server error for file issues or other errors
        }
        return res.status(statusCode).json({ error: errorMessage })
      }
      return res.status(200).send({ status: "OK", result })
    })
  } catch (error) {
    return res.status(500).json({
      error: "Internal Server Error in PUT route",
      message: error.message,
    })
  }
})

function verifyToken(request, response, next) {
  const authzHeader = request.headers["authorization"]
  const accessToken = authzHeader && authzHeader.split(" ")[1]

  if (accessToken == null) {
    return response
      .status(401)
      .json({ message: "Unauthorized: Access token is missing." })
  }

  jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET, (error, user) => {
    if (error) {
      console.error("JWT Verification Error:", error.name, error.message)
      let message = "Forbidden: Invalid access token."
      let statusCode = 403
      if (error.name === "TokenExpiredError") {
        message = "Forbidden: Access token has expired."
        statusCode = 401 // Or 403, 401 is often used for expired tokens
      } else if (error.name === "JsonWebTokenError") {
        message = "Forbidden: Malformed access token."
      }
      return response.status(statusCode).json({ message: message })
    }
    // Attach decoded user payload (e.g., { uid: '...', id: '...', role: '...' }) to request object
    request.user = user
    next()
  })
}
module.exports = routes
