const express = require("express")
const Product = require("../productSchema")
const Store = require("../../Store/StoreSchema.js")
const { verifyToken } = require("../../middleware/auth")
const {
  validateProductCreation,
  sanitizeInput,
} = require("../../middleware/validation")

const router = express.Router()

// POST /api/v1/products/add - Add a product to a store (seller only)
router.post(
  "/add",
  verifyToken,
  sanitizeInput,
  validateProductCreation,
  async (req, res) => {
    try {
      if (req.user.role !== "seller") {
        return res
          .status(403)
          .json({ message: "Only sellers can add products." })
      }
      const { store, ...productData } = req.body
      // Check if the store exists and belongs to the seller
      const foundStore = await Store.findOne({ _id: store, owner: req.user.id })
      if (!foundStore) {
        return res
          .status(404)
          .json({ message: "Store not found or not owned by this seller." })
      }

      // Create the product
      const product = new Product({ ...productData, store })
      await product.save()

      // Add the product reference to the store's products array
      foundStore.products.push(product._id)
      await foundStore.save()

      res.status(201).json(product)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  }
)

// Edit a product (seller only)
router.put("/edit/:id", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "seller") {
      return res
        .status(403)
        .json({ message: "Only sellers can edit products." })
    }
    const product = await Product.findById(req.params.id)
    if (!product) {
      return res.status(404).json({ message: "Product not found." })
    }
    // Check if the product belongs to a store owned by this seller
    const foundStore = await Store.findOne({
      _id: product.store,
      owner: req.user.id,
    })
    if (!foundStore) {
      return res
        .status(403)
        .json({ message: "You do not own the store for this product." })
    }
    Object.assign(product, req.body)
    await product.save()
    res.status(200).json(product)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Delete a product (seller only)
router.delete("/delete/:id", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "seller") {
      return res
        .status(403)
        .json({ message: "Only sellers can delete products." })
    }
    const product = await Product.findById(req.params.id)
    if (!product) {
      return res.status(404).json({ message: "Product not found." })
    }
    // Check if the product belongs to a store owned by this seller
    const foundStore = await Store.findOne({
      _id: product.store,
      owner: req.user.id,
    })
    if (!foundStore) {
      return res
        .status(403)
        .json({ message: "You do not own the store for this product." })
    }

    // Remove the product reference from the store's products array
    foundStore.products.pull(product._id)
    await foundStore.save()

    // Delete the product
    await product.deleteOne()
    res.status(200).json({ message: "Product deleted successfully." })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
