// Apply verifyToken middleware to all routes in this router
const express = require("express")
const Store = require("../StoreSchema")
const { verifyToken } = require("../../middleware/auth")
const {
  validateStoreCreation,
  sanitizeInput,
} = require("../../middleware/validation")

const router = express.Router()

router.post(
  "/create-store",
  verifyToken,
  sanitizeInput,
  validateStoreCreation,
  async (req, res) => {
    try {
      if (req.user.role !== "seller") {
        return res
          .status(403)
          .json({ message: "Only sellers can create stores" })
      }
      const store = new Store({
        ...req.body,
        owner: req.user.id,
      })
      await store.save()
      res.status(201).json(store)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  }
)

module.exports = router
