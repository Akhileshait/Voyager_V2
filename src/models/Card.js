// models/Card.js
const mongoose = require("mongoose");

const cardSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  projectName: {
    type: String,
    required: true,
  },
  projectDescription: {
    type: String,
  },
  progress: {
    type: Number,
    default: 0, // 0–100
    min: 0,
    max: 100,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Card", cardSchema);
