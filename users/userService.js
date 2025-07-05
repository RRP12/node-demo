const userDAO = require("./userDAO")

const getUsers = (done) => {
  userDAO.getUsers(done)
}

const getUserById = (id, done) => {
  console.log("id in service", id)

  userDAO.getUserById(id, done)
}

const updateUserDetails = (id, userName, done) => {
  userDAO.updateUserDetails(id, userName, done)
}
module.exports = { getUsers, getUserById, updateUserDetails }
