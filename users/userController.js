const userService = require("./userService")

const getUsers = (done) => {
  userService.getUsers(done)
}

const getUserById = (id, done) => {
  console.log("id", id)

  userService.getUserById(id, done)
}

const updateUserDetails = (id, userName, done) => {
  console.log("id in controller", id)
  console.log("userName in controller", userName)

  userService.updateUserDetails(id, userName, done)
}

module.exports = { getUsers, getUserById, updateUserDetails }
// This file is responsible for handling user-related operations
