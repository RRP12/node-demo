const Project = require("../../models/project")

module.exports = (router) => {
  router.get("/projects", (req, res) => {
    res.send("Hello World!")
  })

  router.post("/project", async (req, res) => {
    try {
      let project = new Project(req.body)
      const savedProject = await project.save()
      res.status(201).json(savedProject)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })
}
