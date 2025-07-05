const StandUp = require("../../models/standup")

module.exports = (router) => {
  router.get("/standup", (req, res) => {
    res.send("Hello World!")
  })

  router.post("/standup", async (req, res) => {
    try {
      let note = new StandUp(req.body)
      const savedNote = await note.save()
      res.status(201).json(savedNote)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })
}
