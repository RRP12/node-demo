const mongoose = require("mongoose")

const standupSchema = new mongoose.Schema({
  teamMember: {
    type: String,
  },
  project: {
    type: String,
  },

  workYesterday: {
    type: String,
  },
  workToady: {
    type: String,
  },
  impidement: {
    type: String,
  },
  createdOn: {
    type: Date,
    default: Date.now,
  },
})

module.exports = mongoose.model("Standup", standupSchema)
