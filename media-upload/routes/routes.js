const express = require("express")
const multer = require("multer")
const cloudinary = require("cloudinary").v2
// const { CloudinaryStorage } = require("multer-storage-cloudinary")
const { verifyToken } = require("../../middleware/auth")

const router = express.Router()

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Validation constants
const VIDEO_CONSTRAINTS = {
  maxDuration: 60, // seconds
  minWidth: 720,
  minHeight: 1280,
  aspectRatio: 9 / 16,
  allowedFormats: ["mp4", "mov", "avi", "mkv", "webm"], // Extended video formats
  maxSize: 100 * 1024 * 1024, // 100MB
}

const IMAGE_CONSTRAINTS = {
  maxWidth: 4096,
  maxHeight: 4096,
  minWidth: 200,
  minHeight: 200,
  allowedFormats: ["jpg", "jpeg", "png", "webp", "gif"],
  maxSize: 10 * 1024 * 1024, // 10MB
}

// Helper function to upload to Cloudinary using official SDK
function uploadToCloudinary(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) {
          reject(error)
        } else {
          resolve(result)
        }
      }
    )
    stream.end(buffer)
  })
}

const upload = multer({
  storage: multer.memoryStorage(), // Use memory storage instead of CloudinaryStorage
  limits: {
    fileSize: Math.max(VIDEO_CONSTRAINTS.maxSize, IMAGE_CONSTRAINTS.maxSize),
  },
  fileFilter: (req, file, cb) => {
    // Debug: Log the MIME type being detected
    console.log("File MIME type detected:", file.mimetype)
    console.log("File original name:", file.originalname)

    // Check file extension as fallback when MIME type is generic
    const fileExtension = file.originalname.split(".").pop().toLowerCase()
    const videoExtensions = ["mp4", "mov", "avi", "mkv", "webm"]
    const imageExtensions = ["jpg", "jpeg", "png", "webp", "gif"]

    // Validate file type - be permissive with MIME types and use extension as fallback
    if (
      file.mimetype.startsWith("video/") ||
      videoExtensions.includes(fileExtension)
    ) {
      console.log("Accepting video file")
      cb(null, true)
    } else if (
      file.mimetype.startsWith("image/") ||
      imageExtensions.includes(fileExtension)
    ) {
      console.log("Accepting image file")
      cb(null, true)
    } else if (
      file.mimetype === "application/octet-stream" &&
      (videoExtensions.includes(fileExtension) ||
        imageExtensions.includes(fileExtension))
    ) {
      console.log("Accepting file based on extension (generic MIME type)")
      cb(null, true)
    } else {
      console.log(
        "Rejecting file with MIME type:",
        file.mimetype,
        "and extension:",
        fileExtension
      )
      cb(
        new Error(
          `Unsupported file type: ${file.mimetype} (${file.originalname}). Only images and videos are allowed.`
        )
      )
      return
    }
  },
})

// POST /api/v1/media/upload - Upload image or video (reel)
router.post(
  "/upload",
  verifyToken,
  upload.single("media"),
  async (req, res) => {
    try {
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ message: "No file uploaded." })
      }

      // Determine resource type based on file extension as fallback
      const fileExtension = req.file.originalname.split(".").pop().toLowerCase()
      const videoExtensions = ["mp4", "mov", "avi", "mkv", "webm"]

      let resourceType = "image" // Default to image
      let folder = "images"

      // Check MIME type first, then fallback to extension
      if (
        req.file.mimetype.startsWith("video/") ||
        videoExtensions.includes(fileExtension)
      ) {
        resourceType = "video"
        folder = "reels"
      }

      console.log(
        `Uploading ${req.file.originalname} as ${resourceType} to ${folder}`
      )

      // Upload to Cloudinary using official SDK
      const uploadOptions = {
        folder: folder,
        resource_type: resourceType,
        public_id:
          Date.now() +
          "-" +
          req.file.originalname.replace(/\s+/g, "-").replace(/\.[^/.]+$/, ""),
      }

      const result = await uploadToCloudinary(req.file.buffer, uploadOptions)

      // Return success response with media details
      res.status(201).json({
        url: result.secure_url,
        public_id: result.public_id,
        resource_type: result.resource_type,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
        created_at: result.created_at,
      })
    } catch (err) {
      console.error("Upload error:", err)
      const errorMessage = err.message || "An error occurred during upload"
      res.status(500).json({
        error: errorMessage,
        details: process.env.NODE_ENV === "development" ? err : undefined,
      })
    }
  }
)

module.exports = router
