const Team = require("../../models/teamMember")

module.exports = (router) => {
  router.get("/team", (req, res) => {
    res.send("Hello World!")
  })

  router.post("/team", async (req, res) => {
    let member = new Team(req.body)

    await member.save((err, note) => {
      if (err) {
        res.status(500).json({ error: err.message })
      } else {
        res.status(201).json(note)
      }
    })
  })
}
