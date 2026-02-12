import mongoose from "mongoose";

const careerAssessmentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  mcqAnswers: [
    {
      question: String,
      answer: String,
    },
  ],

  scaleAnswers: [
    {
      question: String,
      value: Number, // 1–5
    },
  ],

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("CareerAssessment", careerAssessmentSchema);
