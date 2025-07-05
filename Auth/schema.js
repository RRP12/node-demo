const { default: mongoose } = require("mongoose")

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true, lowercase: true, required: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["seller", "customer", "admin"],
      default: "customer",
    },
    profileImage: String,
    bio: String,
  },
  { timestamps: true }
)

module.exports = mongoose.model("User", userSchema)
