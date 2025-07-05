// middleware/validation.js - Input validation middleware
const { STORE_CATEGORIES, PRODUCT_SUBCATEGORIES } = require("../categories")

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} - {isValid: boolean, message: string}
 */
function validatePassword(password) {
  if (!password || password.length < 8) {
    return {
      isValid: false,
      message: "Password must be at least 8 characters long",
    }
  }

  if (!/(?=.*[a-z])/.test(password)) {
    return {
      isValid: false,
      message: "Password must contain at least one lowercase letter",
    }
  }

  if (!/(?=.*[A-Z])/.test(password)) {
    return {
      isValid: false,
      message: "Password must contain at least one uppercase letter",
    }
  }

  if (!/(?=.*\d)/.test(password)) {
    return {
      isValid: false,
      message: "Password must contain at least one number",
    }
  }

  if (!/(?=.*[!@#$%^&*])/.test(password)) {
    return {
      isValid: false,
      message:
        "Password must contain at least one special character (!@#$%^&*)",
    }
  }

  return { isValid: true, message: "Password is valid" }
}

/**
 * Middleware to validate user registration data
 */
function validateUserRegistration(req, res, next) {
  const { name, email, password, role } = req.body

  // Required fields
  if (!name || !email || !password) {
    return res.status(400).json({
      error: "Validation Error",
      message: "Name, email, and password are required",
    })
  }

  // Validate email format
  if (!isValidEmail(email)) {
    return res.status(400).json({
      error: "Validation Error",
      message: "Invalid email format",
    })
  }

  // Validate password strength
  const passwordValidation = validatePassword(password)
  if (!passwordValidation.isValid) {
    return res.status(400).json({
      error: "Validation Error",
      message: passwordValidation.message,
    })
  }

  // Validate role if provided
  if (role && !["seller", "customer", "admin"].includes(role)) {
    return res.status(400).json({
      error: "Validation Error",
      message: "Role must be one of: seller, customer, admin",
    })
  }

  // Validate name length
  if (name.length < 2 || name.length > 50) {
    return res.status(400).json({
      error: "Validation Error",
      message: "Name must be between 2 and 50 characters",
    })
  }

  next()
}

/**
 * Middleware to validate store creation data
 */
function validateStoreCreation(req, res, next) {
  const { name, category, description, location } = req.body

  // Required fields
  if (!name || !category) {
    return res.status(400).json({
      error: "Validation Error",
      message: "Store name and category are required",
    })
  }

  // Validate category
  if (!STORE_CATEGORIES.includes(category)) {
    return res.status(400).json({
      error: "Validation Error",
      message: `Invalid category. Must be one of: ${STORE_CATEGORIES.join(
        ", "
      )}`,
    })
  }

  // Validate name length
  if (name.length < 2 || name.length > 100) {
    return res.status(400).json({
      error: "Validation Error",
      message: "Store name must be between 2 and 100 characters",
    })
  }

  // Validate description length if provided
  if (description && description.length > 500) {
    return res.status(400).json({
      error: "Validation Error",
      message: "Description must be less than 500 characters",
    })
  }

  // Validate location if provided
  if (location) {
    if (
      !location.coordinates ||
      !Array.isArray(location.coordinates) ||
      location.coordinates.length !== 2
    ) {
      return res.status(400).json({
        error: "Validation Error",
        message:
          "Location coordinates must be an array of [longitude, latitude]",
      })
    }

    const [lng, lat] = location.coordinates

    // Validate longitude (-180 to 180)
    if (typeof lng !== "number" || lng < -180 || lng > 180) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Longitude must be a number between -180 and 180",
      })
    }

    // Validate latitude (-90 to 90)
    if (typeof lat !== "number" || lat < -90 || lat > 90) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Latitude must be a number between -90 and 90",
      })
    }
  }

  next()
}

/**
 * Middleware to validate product creation data
 */
function validateProductCreation(req, res, next) {
  const { title, description, category, subCategory, price, media } = req.body

  // Required fields
  if (!title || !description || !category || !subCategory || !price || !media) {
    return res.status(400).json({
      error: "Validation Error",
      message:
        "Title, description, category, subCategory, price, and media are required",
    })
  }

  // Validate category
  if (!STORE_CATEGORIES.includes(category)) {
    return res.status(400).json({
      error: "Validation Error",
      message: `Invalid category. Must be one of: ${STORE_CATEGORIES.join(
        ", "
      )}`,
    })
  }

  // Validate subCategory
  if (
    !PRODUCT_SUBCATEGORIES[category] ||
    !PRODUCT_SUBCATEGORIES[category].includes(subCategory)
  ) {
    return res.status(400).json({
      error: "Validation Error",
      message: `Invalid subCategory for ${category}. Must be one of: ${
        PRODUCT_SUBCATEGORIES[category]?.join(", ") || "none available"
      }`,
    })
  }

  // Validate title length
  if (title.length < 3 || title.length > 200) {
    return res.status(400).json({
      error: "Validation Error",
      message: "Title must be between 3 and 200 characters",
    })
  }

  // Validate description length
  if (description.length < 10 || description.length > 2000) {
    return res.status(400).json({
      error: "Validation Error",
      message: "Description must be between 10 and 2000 characters",
    })
  }

  // Validate price
  if (
    !price.original ||
    typeof price.original !== "number" ||
    price.original <= 0
  ) {
    return res.status(400).json({
      error: "Validation Error",
      message: "Price must be a positive number",
    })
  }

  // Validate currency
  if (!price.currency || !["INR", "USD", "EUR"].includes(price.currency)) {
    return res.status(400).json({
      error: "Validation Error",
      message: "Currency must be one of: INR, USD, EUR",
    })
  }

  // Validate media structure
  if (!media.reels || !Array.isArray(media.reels) || media.reels.length === 0) {
    return res.status(400).json({
      error: "Validation Error",
      message: "At least one reel is required in media",
    })
  }

  // Validate each reel
  for (const reel of media.reels) {
    if (!reel.url || !reel.thumbnail) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Each reel must have url and thumbnail",
      })
    }
  }

  next()
}

/**
 * Sanitize string input to prevent XSS
 * @param {string} input - Input to sanitize
 * @returns {string} - Sanitized input
 */
function sanitizeString(input) {
  if (typeof input !== "string") return input

  return input
    .replace(/[<>]/g, "") // Remove < and > characters
    .trim() // Remove leading/trailing whitespace
}

/**
 * Middleware to sanitize request body
 */
function sanitizeInput(req, res, next) {
  if (req.body && typeof req.body === "object") {
    for (const key in req.body) {
      if (typeof req.body[key] === "string") {
        req.body[key] = sanitizeString(req.body[key])
      }
    }
  }
  next()
}

module.exports = {
  validateUserRegistration,
  validateStoreCreation,
  validateProductCreation,
  sanitizeInput,
  isValidEmail,
  validatePassword,
}
