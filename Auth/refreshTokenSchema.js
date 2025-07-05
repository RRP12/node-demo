const mongoose = require("mongoose")

const refreshTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User", // This references your User model
    },
    // Optional: You can add an expiry for refresh tokens in the database
    // expiresAt: {
    //   type: Date,
    //   required: true,
    // },
  },
  { timestamps: true }
) // `createdAt` and `updatedAt` will be automatically managed

module.exports = mongoose.model("RefreshToken", refreshTokenSchema)
