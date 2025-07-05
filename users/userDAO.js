const mongoose = require("mongoose")
const User = require("../Auth/schema") // Adjust the path if your User model is elsewhere

const getUsers = async (done) => {
  try {
    const users = await User.find({})
    return done(null, users)
  } catch (err) {
    console.error("Error fetching users from MongoDB:", err)
    return done(err)
  }
}

const getUserById = async (id, done) => {
  console.log("id", id)

  try {
    const user = await User.findById(id)
    if (!user) {
      return done(new Error("User not found with id " + id))
    }
    return done(null, user)
  } catch (error) {
    console.log("Error in getUserById:", error)
  }
}

const updateUserDetails = (id, name, done) => {
  User.findByIdAndUpdate(id, { name }, { new: true }, (err, updatedUser) => {
    if (err) {
      console.error("Error updating user in MongoDB:", err)
      return done(err)
    }
    if (!updatedUser) {
      return done(new Error(`User not found with id ${id}`))
    }
    return done(null, updatedUser)
  })
}

module.exports = { getUsers, getUserById, updateUserDetails }
