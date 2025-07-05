const mongoose = require("mongoose")
const { STORE_CATEGORIES, PRODUCT_SUBCATEGORIES } = require("../categories")
const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: String,
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
)

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, unique: true },
    description: String,
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    category: {
      type: String,
      enum: STORE_CATEGORIES,
      required: true,
    },
    subCategory: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          const validList = PRODUCT_SUBCATEGORIES[this.category] || []
          return validList.includes(v)
        },
        message: (props) =>
          `"${props.value}" is not a valid subCategory for category "${props.instance.category}"`,
      },
    },
    tags: [String],
    collection: String,
    price: {
      original: { type: Number, required: true },
      discounted: {
        type: Number,
        validate: {
          validator: function (v) {
            return v == null || v <= this.price.original
          },
          message:
            "Discounted price must be less than or equal to original price.",
        },
      },
      currency: { type: String, default: "INR" },
    },
    stock: {
      totalQuantity: { type: Number, default: 0 },
      variants: [
        {
          sku: String,
          size: String,
          color: String,
          quantity: Number,
          image: String,
        },
      ],
    },
    media: {
      images: [String],
      reels: {
        type: [
          {
            url: { type: String, required: true },
            thumbnail: { type: String, required: true },
            caption: String,
            likes: { type: Number, default: 0 },
            views: { type: Number, default: 0 },
            saves: { type: Number, default: 0 },
            postedAt: { type: Date, default: Date.now },
          },
        ],
        required: true,
        validate: [
          (array) => array.length > 0,
          "At least one reel is required.",
        ],
      },
    },
    reviews: [reviewSchema],
    averageRating: { type: Number, min: 0, max: 5, default: 0 },

    // Analytics for feed ranking
    analytics: {
      views: { type: Number, default: 0 },
      likes: { type: Number, default: 0 },
      saves: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      recentViews: { type: Number, default: 0 }, // Views in last 24 hours
      lastViewedAt: { type: Date },
      clickThroughRate: { type: Number, default: 0 },
      conversionRate: { type: Number, default: 0 },
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isPublished: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
)

// Pre-save middleware to generate slug from title
productSchema.pre("save", function (next) {
  if (this.isModified("title") || this.isNew) {
    // Generate slug from title: lowercase, replace spaces with hyphens, remove special chars
    let baseSlug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/-+/g, "-") // Replace multiple hyphens with single
      .trim("-") // Remove leading/trailing hyphens

    // Add timestamp to ensure uniqueness
    this.slug = `${baseSlug}-${Date.now()}`
  }
  next()
})

// Indexes for fast filtering and feed queries
productSchema.index({ store: 1, category: 1, subCategory: 1 })
productSchema.index({ slug: 1 }, { unique: true })
productSchema.index({ isPublished: 1, isDeleted: 1, createdAt: -1 })
productSchema.index({ category: 1, createdAt: -1 })
productSchema.index({ "analytics.views": -1, "analytics.likes": -1 })
productSchema.index({ "analytics.recentViews": -1, createdAt: -1 })
productSchema.index({ isFeatured: 1, createdAt: -1 })

module.exports = mongoose.model("Product", productSchema)
