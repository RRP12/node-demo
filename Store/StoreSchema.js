const mongoose = require("mongoose")
const { STORE_CATEGORIES } = require("../categories")

const storeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,
    category: {
      type: String,
      enum: STORE_CATEGORIES, // e.g. ["fashion", "electronics", ...]
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    location: {
      type: {
        type: String,
        enum: ["Point"], // Must be 'Point'
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
  },
  { timestamps: true }
)
storeSchema.index({ location: "2dsphere" })

// . Query Nearby Stores with $near
// const nearbyStores = await Store.find({
//   location: {
//     $near: {
//       $geometry: {
//         type: 'Point',
//         coordinates: [userLng, userLat]
//       },
//       $maxDistance: 50000  // e.g., within 50 km
//     }
//   }
// });

// Find nearby stores: db.stores.find({ location: { $near: { $geometry: { type: "Point", coordinates: [lng, lat] }, $maxDistance: 5000 } } })
// Stores within area: db.stores.find({ location: { $geoWithin: { $centerSphere: [[lng, lat], radius] } } })

module.exports = mongoose.models.Store || mongoose.model("Store", storeSchema)
