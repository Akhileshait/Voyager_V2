const mongoose = require("mongoose");

const careerAssessmentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  mcqAnswers: [
    {
      questionId: Number,
      answer: String,
    },
  ],

  scaleAnswers: [
    {
      questionId: Number,
      value: Number, // 1–5
    },
  ],

  scoreSummary: {
    analytical: Number,
    creativity: Number,
    leadership: Number,
    stability: Number,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("CareerAssessment", careerAssessmentSchema);
