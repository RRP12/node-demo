const express = require("express")
const app = express()
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const userschema = require("./schema")
const RefreshToken = require("./refreshTokenSchema") // Ensure this matches your filename
require("dotenv").config()
const routes = express.Router()
app.use(express.json())

// Import shared middleware
const { verifyToken } = require("../middleware/auth")
const {
  validateUserRegistration,
  sanitizeInput,
  isValidEmail,
} = require("../middleware/validation")

// We will replace this with database storage for refresh tokens
// let refreshTokens = []
// let users = []
routes.get("/users", verifyToken, async (request, response) => {
  try {
    // Optional: Add role-based access control here if needed
    // For example, only allow 'admin' users to list all users
    // if (request.user.role !== 'admin') {
    //   return response.status(403).json({ message: "Forbidden: You do not have permission to access this resource." });
    // }

    const allUsers = await userschema.find({}).select("-password") // Exclude passwords
    response.status(200).json(allUsers)
  } catch (error) {
    console.error("Error fetching all users:", error)
    response
      .status(500)
      .json({ message: "Failed to retrieve users", error: error.message })
  }
})

routes.post(
  "/users",
  sanitizeInput,
  validateUserRegistration,
  async (request, response) => {
    try {
      const { name, email, password, role, profileImage, bio } = request.body

      // Basic validation for required fields
      if (!name || !email || !password) {
        return response
          .status(400)
          .json({ message: "Name, Email, and Password are required." })
      }

      // Check if user already exists by email
      const existingUser = await userschema.findOne({ email })
      if (existingUser) {
        return response
          .status(409)
          .json({ message: "User with this email already exists." })
      }

      const hashedPassword = await bcrypt.hash(password, 10) // Hash the provided password

      const newUser = {
        name,
        email,
        password: hashedPassword, // Store the hashed password in the 'password' field
        role,
        profileImage,
        bio,
      }
      const savedUser = await userschema.create(newUser) // Correctly pass the newUser object
      response
        .status(201)
        .json({ message: "User created successfully", userId: savedUser._id })
    } catch (error) {
      console.error("Error creating user:", error) // Log the specific error
      response
        .status(500)
        .json({ message: "Failed to create user", error: error.message })
    }
  }
)

// routes.post("/login", async (request, response) => {
//   // Check if user exists based on UID
//   const user = users.find((user) => user.uid == request.body.uid)
//   if (user == null) {
//     return response.status(400).send("User NOT found!!!")
//   }
//   try {
//     // If user found, check that provided password matches the actual one
//     if (await bcrypt.compare(request.body.pwd, user.pwd)) {
//       // const uid = request.body.uid // uid is already in user object
//       // const jwtUser = { uid: uid } // user object can be used directly
//       const accessToken = mintAccessToken(user)
//       const refreshToken = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET)
//       refreshTokens.push(refreshToken)
//       response.json({ accessToken: accessToken, refreshToken: refreshToken })
//     } else {
//       response.send("Access denied.")
//     }
//   } catch {
//     response.status(500).send()
//   }
// })

routes.post("/login", sanitizeInput, async (request, response) => {
  try {
    const { email, password } = request.body

    if (!email || !password) {
      return response
        .status(400)
        .json({ message: "Email and Password are required." })
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return response.status(400).json({ message: "Invalid email format." })
    }

    const user = await userschema.findOne({ email: email })

    if (!user) {
      return response.status(404).json({ message: "User not found." })
    }

    // User found, proceed with authentication

    // If user found, check that provided password matches the actual one
    const isMatch = await bcrypt.compare(password, user.password)

    if (isMatch) {
      const userPayloadForToken = {
        id: user._id, // MongoDB's default ID (primary identifier)
        email: user.email, // Email for reference
        role: user.role,
      }
      const accessToken = mintAccessToken(userPayloadForToken)
      const refreshToken = jwt.sign(
        userPayloadForToken,
        process.env.REFRESH_TOKEN_SECRET
      )
      // Store the refresh token in the database
      await RefreshToken.create({
        token: refreshToken,
        userId: user._id, // Link to the user
        // Optional: Add an expiry if your schema supports it and you want DB-level expiry
      })
      response.json({ accessToken: accessToken, refreshToken: refreshToken })
    } else {
      response.status(401).json({ message: "Invalid credentials." })
    }
  } catch (error) {
    console.error("Login error:", error)
    response
      .status(500)
      .json({ message: "Internal server error", error: error.message })
  }
})

routes.delete("/logout", async (request, response) => {
  const { refresh_token } = request.body

  if (!refresh_token) {
    return response.status(400).json({ message: "Refresh token is required." })
  }

  try {
    // Attempt to delete the refresh token from the database
    const result = await RefreshToken.deleteOne({ token: refresh_token })

    if (result.deletedCount === 0) {
      // Optional: If you want to inform the client the token wasn't found,
      // though for logout, simply proceeding to 204 is often acceptable.
      // console.log("Logout attempt: Refresh token not found in DB - ", refresh_token)
    } else {
      console.log("Refresh token deleted from DB:", refresh_token)
    }
    response.sendStatus(204) // Successfully processed, no content to return
  } catch (error) {
    console.error("Logout error:", error)
    response
      .status(500)
      .json({ message: "Internal server error during logout." })
  }
})

routes.post("/token", async (request, response) => {
  const refreshToken = request.body.refresh_token
  if (refreshToken == null) {
    return response.sendStatus(401)
  }

  try {
    const storedToken = await RefreshToken.findOne({ token: refreshToken })
    if (!storedToken) {
      return response
        .status(403)
        .json({ message: "Refresh token not found or invalid." })
    }

    jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET,
      (error, user) => {
        if (error) {
          // This could be due to token expiry if JWT has its own expiry, or if it's malformed
          return response
            .status(403)
            .json({ message: "Invalid refresh token." })
        }
        // 'user' here is the payload from the verified refresh token
        const accessToken = mintAccessToken({
          id: user.id,
          email: user.email,
          role: user.role,
        })
        response.json({ accessToken: accessToken })
      }
    )
  } catch (dbError) {
    console.error("Error during token refresh:", dbError)
    response
      .status(500)
      .json({ message: "Internal server error during token refresh." })
  }
})

// Create and return access token
function mintAccessToken(user) {
  // user parameter is now an object like { id: '...', email: '...', role: '...' }
  console.log("User payload for access token:", user)
  // Ensure only necessary, non-sensitive user information is in the token
  const userPayload = { id: user.id, email: user.email, role: user.role }
  return jwt.sign(userPayload, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "15m",
  })
}

// Route to get current authenticated user's profile (/me endpoint)
routes.get("/me", verifyToken, async (request, response) => {
  try {
    // Get user ID from JWT token (set by verifyToken middleware)
    const userId = request.user.id

    const user = await userschema.findById(userId).select("-password") // Exclude password

    if (!user) {
      return response.status(404).json({
        message: "User not found. Your account may have been deleted.",
      })
    }

    // Return user profile with additional computed fields
    const userProfile = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage,
      bio: user.bio,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      // Add computed fields
      accountAge: Math.floor(
        (Date.now() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24)
      ), // days
      isProfileComplete: !!(
        user.name &&
        user.email &&
        user.profileImage &&
        user.bio
      ),
    }

    response.status(200).json({
      success: true,
      message: "User profile retrieved successfully",
      data: userProfile,
    })
  } catch (error) {
    console.error("Error fetching current user profile:", error)
    response.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    })
  }
})

// Route to get a specific user by their MongoDB _id
routes.get("/users/:userId", verifyToken, async (request, response) => {
  try {
    const userId = request.params.userId

    // Validate if userId is a valid MongoDB ObjectId (optional but good practice)
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      return response.status(400).json({ message: "Invalid user ID format." })
    }

    const user = await userschema.findById(userId).select("-password") // Exclude password

    if (!user) {
      return response.status(404).json({ message: "User not found." })
    }
    response.status(200).json(user)
  } catch (error) {
    console.error("Error fetching user by ID:", error)
    // Handle cases like invalid ObjectId format if not caught by regex
    if (error.name === "CastError" && error.kind === "ObjectId") {
      return response.status(400).json({ message: "Invalid user ID format." })
    }
    response
      .status(500)
      .json({ message: "Internal server error", error: error.message })
  }
})

console.log("Auth Server1 started - OK")
module.exports = routes
