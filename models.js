const mongoose = require("mongoose");

const replySchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
  },
  delete_password: {
    type: String,
    required: true,
  },
  reported: {
    type: Boolean,
    default: false,
  },
  created_on: {
    type: Date,
    default: Date.now,
  },
});

const threadSchema = new mongoose.Schema({
  board: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  created_on: {
    type: Date,
    default: Date.now,
  },
  bumped_on: {
    type: Date,
    default: Date.now,
  },
  reported: {
    type: Boolean,
    default: false,
  },
  delete_password: { type: String, required: true },
  replies: [replySchema],
});

const Thread = mongoose.model("Thread", threadSchema);

module.exports = { Thread };
