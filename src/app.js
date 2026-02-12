import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import hbs from "hbs";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import MongoStore from "connect-mongo";
import flash from "connect-flash";
import mongoose from "mongoose";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import Card from "./models/Card.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

// Define User Schema
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  tests: [
    {
      field: String,
      questions: [
        {
          question: String,
          options: [String],
          correctAnswer: String,
          userAnswer: String,
        },
      ],
      score: Number,
      passed: Boolean,
      timings: [Number],
      feedbackData: Object,
      date: { type: Date, default: Date.now },
    },
  ],
});

// Compile model from schema
const User = mongoose.model("User", userSchema);

// Set up view engine
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "../templates/views"));
hbs.registerPartials(path.join(__dirname, "../templates/views/partials"));
app.use(express.static(path.join(__dirname, "../public")));

// Middleware to parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    name: "voyager.sid",
    secret: process.env.SESSION_SECRET || "supersecret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: "sessions",
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      httpOnly: true,
      sameSite: "lax",
    },
  }),
);

app.use(flash());

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Passport configuration for authentication
passport.use(
  new LocalStrategy(
    { usernameField: "username", passwordField: "password" }, // Explicitly specify fields
    async (username, password, done) => {
      try {
        const user = await User.findOne({ username });
        if (!user) {
          return done(null, false, { message: "Incorrect username." });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Incorrect password." });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    },
  ),
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Route for the home page (redirect to login if not authenticated)
app.get("/", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/login");
  }
  res.redirect("/home");
});

// Route to render the login form
app.get("/login", (req, res) => {
  res.render("login", { message: req.flash("error") });
});

// Route to render the home page
app.get("/home", (req, res) => {
  res.render("index");
});

// Route to handle login logic
app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/home",
    failureRedirect: "/login",
    failureFlash: true,
  }),
);

// Route to render the registration form
app.get("/register", (req, res) => {
  res.render("register");
});

// Route to handle registration logic
app.post("/register", async (req, res) => {
  const { username, password, name, email } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      username,
      password: hashedPassword,
      name,
      email,
    });
    await newUser.save();
    res.redirect("/login");
  } catch (err) {
    console.error("Registration error:", err);
    res.redirect("/register");
  }
});

// Middleware to protect routes
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}
const api_key = process.env.GOOGLE_GENERATIVE_AI_KEY;
const genAI = new GoogleGenerativeAI(api_key);
const generationConfig = {
  temperature: 0.9,
  topP: 1,
  topK: 1,
  maxOutputTokens: 4096,
};
let generatedQuestionsWithAnswers = [];

app.get("/ask", ensureAuthenticated, (req, res) => {
  res.render("ask");
});

import { Queue } from "bullmq";
import OpenAI from "openai";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { QdrantVectorStore } from "@langchain/qdrant";
import CareerAssessment from "./models/CareerAssessment.js";
import { VOYAGER_ASSESSMENT } from "./constants.js";

const client = new OpenAI({
  apiKey:
    process.env.OPENAI_API_KEY || "AIzaSyB2BqN_HUBqew-c3ACUKx9hhflH4-aE1T0",
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

import fs from "fs";
import { QueueEvents } from "bullmq";
import { TaskType } from "@google/generative-ai";
const connection = { host: "localhost", port: 6379 }; // Valkey connection

const careerQueue = new Queue("file-upload", { connection });
const queueEvents = new QueueEvents("file-upload", { connection });

careerQueue.setMaxListeners(50);
queueEvents.setMaxListeners(50);

// 1. Endpoint to ingest market reports
app.post("/ingest-data", async (req, res) => {
  const PDF_FOLDER = "./pdfs"; // Path to your local folder

  try {
    const files = fs
      .readdirSync(PDF_FOLDER)
      .filter((file) => path.extname(file).toLowerCase() === ".pdf");

    if (files.length === 0) {
      return res.status(400).json({ message: "No PDFs found in folder." });
    }

    console.log(`Adding ${files.length} files to queue...`);

    // 1. Add all files to the queue and keep track of Job IDs
    const jobs = await Promise.all(
      files.map((file) =>
        careerQueue.add(
          "process-pdf",
          {
            filename: file,
            path: path.resolve(PDF_FOLDER, file),
          },
          { removeOnComplete: true },
        ),
      ),
    );

    // 2. Wait for all specific Job IDs to complete
    // We wait for each job's completion event
    await Promise.all(jobs.map((job) => job.waitUntilFinished(queueEvents)));

    // 3. Send success only after all workers are done
    res.json({
      message: "Success: All PDFs ingested and indexed in Qdrant.",
      count: files.length,
    });
  } catch (error) {
    console.error("Ingestion failed:", error);
    res.status(500).json({ error: "Internal Server Error during ingestion" });
  }
});

app.post("/guidance", ensureAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ guidance: "User not authenticated" });
    }

    const { username, tests } = user;

    /* =============================
       BASIC TEST PERFORMANCE
       ============================= */

    const totalTests = tests.length;

    const performanceSummary = {
      totalTests,
      averageScore:
        totalTests === 0
          ? 0
          : Math.round(
              tests.reduce((acc, t) => acc + (t.score || 0), 0) / totalTests,
            ),
      passedTests: tests.filter((t) => t.passed).length,
      failedTests: tests.filter((t) => !t.passed).length,
    };

    /* =============================
       FETCH LATEST CAREER ASSESSMENT
       ============================= */

    const assessment = await CareerAssessment.findOne({ user: user._id })
      .sort({ createdAt: -1 })
      .lean();

    let mcqText = "No career assessment MCQ responses available.";
    let scaleText = "No self-assessment scale responses available.";

    if (assessment) {
      mcqText = assessment.mcqAnswers
        .map(
          (a, i) => `${i + 1}. Question: ${a.question}\n   Answer: ${a.answer}`,
        )
        .join("\n");

      scaleText = assessment.scaleAnswers
        .map(
          (a, i) =>
            `${i + 1}. Statement: ${a.question}\n   Rating: ${a.value} / 5`,
        )
        .join("\n");
    }

    // Convert profile to search query
    const query = `Recommend careers for someone who likes ${mcqText} and ${scaleText} and is skilled in ${performanceSummary}.`;

    const key = "AIzaSyB2BqN_HUBqew-c3ACUKx9hhflH4-aE1T0";

    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: key,
      model: "gemini-embedding-001", // The unified model you found in the docs
      taskType: TaskType.RETRIEVAL_DOCUMENT, // Use DOCUMENT for ingestion (worker)
    });

    const vectorStore = await QdrantVectorStore.fromExistingCollection(
      embeddings,
      {
        url: "http://localhost:6333",
        collectionName: "career-knowledge",
      },
    );

    // Retrieve top 3 relevant market trends/job descriptions
    const searchResults = await vectorStore.similaritySearch(query, 3);
    const marketContext = searchResults.map((d) => d.pageContent).join("\n\n");

    console.log(marketContext);

    /* =============================
       AI PROMPT (RAW, MODEL-LED)
       ============================= */

    const prompt = `
You are an expert career counselor.
You are the Voyager AI Career Counselor. 
    Use the following 2026 Market Context to guide the student:
    ---
    ${marketContext}
    ---
    Analyze the student's profile and provide 3 specialized career paths with 'Why' and 'Next Steps'.

USER
----
Username: ${username}

ACADEMIC / TEST PERFORMANCE
---------------------------
- Total Tests Taken: ${performanceSummary.totalTests}
- Average Score: ${performanceSummary.averageScore}%
- Passed Tests: ${performanceSummary.passedTests}
- Failed Tests: ${performanceSummary.failedTests}

CAREER ASSESSMENT – DISCOVERY QUESTIONS (MCQs)
----------------------------------------------
${mcqText}

CAREER ASSESSMENT – SELF ASSESSMENT (SCALE 1–5)
-----------------------------------------------
${scaleText}

TASK
----
Analyze the user's answers holistically and provide:

1. A short summary of the user's natural strengths, interests, and working style.
2. 3–4 career paths that genuinely align with the user's responses.
3. A brief explanation (1–2 lines) of why each career fits.
4. Practical next steps the user can take in the next 3–6 months.

STYLE RULES
-----------
- Keep language simple and encouraging.
- Be specific, not generic.
- Do NOT mention scores, traits, or psychometric terms explicitly.
- Do NOT include markdown, JSON, emojis, or disclaimers.
`;

    /* =============================
       GENERATE RESPONSE
       ============================= */

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig,
    });

    const response = await model.generateContent(prompt);
    const text = response.response ? await response.response.text() : "";

    const cleanedText = text
      .replace(/```/g, "")
      .replace(/\r?\n{3,}/g, "\n\n")
      .trim();

    res.json({ guidance: cleanedText });
  } catch (error) {
    console.error("Error generating guidance:", error);
    res.status(500).json({
      guidance:
        "We couldn’t generate guidance right now. Please try again later.",
    });
  }
});

app.post("/ask", async (req, res) => {
  const { question } = req.body;
  try {
    const prompt = `You are a career guidance chat bot. Answer the following question: ${question}`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig,
    });
    const response = await model.generateContent(prompt);
    const generatedText = response.response
      ? await response.response.text()
      : "";

    // Enhanced cleanup: Remove any problematic characters or symbols
    const cleanedText = generatedText
      .replace(/```json|```/g, "") // Remove markdown JSON blocks
      .replace(/\*\*|\*/g, "") // Remove asterisks
      .replace(/(\r\n|\n|\r)/gm, "") // Remove line breaks
      .replace(/",\s*}/g, '"}') // Fix trailing commas before closing braces
      .trim();

    res.json({ response: cleanedText });
  } catch (error) {
    console.error("Error generating response:", error);
    res.status(500).json({ response: "Failed to generate response" });
  }
});

// Route to render the question generation form
app.get("/generate-questions", ensureAuthenticated, (req, res) => {
  res.render("generate-questions-form");
});

app.post("/generate-questions", ensureAuthenticated, async (req, res) => {
  const { field } = req.body;

  try {
    const prompt = `Generate a set of 10 objective-type questions related to ${field}, along with the correct answers...
    Format the response as JSON:
    [
      {
        "question": "<Question text>",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctAnswer": "<Correct option>"
      }
    ]`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig,
    });
    const response = await model.generateContent(prompt);
    const generatedText = response.response
      ? await response.response.text()
      : "";

    // Enhanced cleanup: Remove any problematic characters or symbols
    const cleanedText = generatedText
      .replace(/```json|```/g, "") // Remove markdown JSON blocks
      .replace(/\*\*|\*/g, "") // Remove asterisks
      .replace(/(\r\n|\n|\r)/gm, "") // Remove line breaks
      .replace(/",\s*}/g, '"}') // Fix trailing commas before closing braces
      .trim();

    console.log("Cleaned Text:", cleanedText); // Log cleaned text for debugging

    let questionsWithAnswers = [];
    try {
      questionsWithAnswers = JSON.parse(cleanedText);
    } catch (jsonError) {
      console.error("Failed to parse JSON:", jsonError.message);

      // Attempt to recover by cleaning up malformed entries
      const cleanedEntries = cleanedText
        .split("},")
        .map((entry) => entry.trim() + "}");
      questionsWithAnswers = cleanedEntries
        .map((entry) => {
          try {
            return JSON.parse(entry);
          } catch {
            return null;
          }
        })
        .filter((entry) => entry !== null); // Filter out null (malformed) entries

      if (questionsWithAnswers.length === 0) {
        return res.status(500).send("Invalid JSON response from the AI model.");
      }
    }

    // Get the authenticated user
    const user = req.user;

    // Create a test entry and save it to the user's tests
    const testEntry = {
      field: field,
      questions: questionsWithAnswers.map((qna) => ({
        question: qna.question,
        options: qna.options,
        correctAnswer: qna.correctAnswer,
        userAnswer: null, // Placeholder for user answer
      })),
      score: null,
      passed: null,
      timings: [],
      date: new Date(),
    };

    user.tests.push(testEntry);
    await user.save();

    // Render the questions page with the generated questions
    res.render("questions", { field, questionsWithAnswers, cleanedText });
  } catch (error) {
    console.error("Error generating questions:", error);
    res.status(500).send("Failed to generate questions");
  }
});
app.get("/test-details/:id", ensureAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    const testId = req.params.id;
    const test = user.tests.id(testId);

    if (!test) {
      return res.status(404).send("Test not found");
    }

    res.render("test-details", { test });
  } catch (error) {
    console.error("Error fetching test details:", error);
    res.status(500).send("Error fetching test details");
  }
});

hbs.registerHelper("pluck", function (array, key) {
  return array.map((item) => item[key]);
});
hbs.registerHelper("json", function (context) {
  return JSON.stringify(context);
});

app.get("/dashboard", ensureAuthenticated, async (req, res) => {
  try {
    const cards = await Card.find({ user: req.user._id }).sort({
      createdAt: -1,
    });

    console.log("Cards", cards);

    res.render("dashboard", { cards, userName: req.user.name });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});

// Route to handle answer submission
app.post("/submit-answers", ensureAuthenticated, async (req, res) => {
  const { answers, timings, field } = req.body;

  try {
    let correctCount = 0;
    let incorrectCount = 0;
    const user = req.user;
    const test = user.tests[user.tests.length - 1]; // Get the most recent test

    // Compare user's answers with correct answers and calculate score
    test.questions = test.questions.map((qna, index) => {
      const userAnswer = answers[index];
      const correctAnswer = qna.correctAnswer;

      if (userAnswer === correctAnswer) {
        correctCount++;
      } else {
        incorrectCount++;
      }

      return {
        ...qna,
        userAnswer: userAnswer || null, // Ensure null is used if no answer
      };
    });

    test.score = (correctCount / test.questions.length) * 100;
    test.passed = correctCount >= 7;
    test.timings = Object.values(timings);
    await user.save();

    // Generate feedback data based on performance
    const feedbackData = {
      feedback: test.questions.map((qna, index) => {
        return qna.userAnswer === qna.correctAnswer
          ? `Well done on question ${index + 1}.`
          : `Review the topic for question ${index + 1}.`;
      }),
      additionalTests: ["Practice more on weak areas."],
      additionalCourses: ["Consider taking an advanced course in the field."],
    };

    const timeLabels = Object.keys(timings).map(
      (key, index) => `Question ${index + 1}`,
    );
    const timeData = Object.values(timings);

    // Save the feedback in the test entry
    test.feedbackData = feedbackData;
    await user.save();

    // Render the result page with the feedback
    res.render("result", {
      field: field || "N/A",
      timeLabels: JSON.stringify(timeLabels),
      timeData: JSON.stringify(timeData),
      correctCount,
      incorrectCount,
      passedCount: test.passed ? 1 : 0,
      failedCount: test.passed ? 0 : 1,
      score: test.score,
      feedbackData,
    });
  } catch (error) {
    console.error("Error submitting answers:", error);
    res.status(500).send("Failed to submit answers");
  }
});
hbs.registerHelper("incrementIndex", function (index) {
  return parseInt(index, 10) + 1;
});
app.get("/premium", (req, res) => {
  res.render("premium");
});

app.post("/add-card", ensureAuthenticated, async (req, res) => {
  const { projectName, projectDescription } = req.body;

  console.log("Received card data:", req.body);

  try {
    const card = new Card({
      user: req.user._id,
      projectName,
      projectDescription,
    });

    await card.save();
    res.redirect("/dashboard");
  } catch (error) {
    console.error("Error saving card:", error);
    res.status(500).send("Error saving card");
  }
});

app.post("/delete-card/:id", ensureAuthenticated, async (req, res) => {
  try {
    await Card.deleteOne({
      _id: req.params.id,
      user: req.user._id,
    });
    res.redirect("/dashboard");
  } catch (err) {
    console.error(err);
    res.status(500).send("Delete failed");
  }
});

app.post("/edit-card/:id", ensureAuthenticated, async (req, res) => {
  const { projectName, projectDescription } = req.body;

  try {
    await Card.updateOne(
      { _id: req.params.id, user: req.user._id },
      { projectName, projectDescription },
    );
    res.redirect("/dashboard");
  } catch (err) {
    console.error(err);
    res.status(500).send("Edit failed");
  }
});

app.post("/update-progress/:id", ensureAuthenticated, async (req, res) => {
  const { progress } = req.body;

  try {
    await Card.updateOne(
      { _id: req.params.id, user: req.user._id },
      { progress },
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

app.get("/assessment", ensureAuthenticated, (req, res) => {
  res.render("assessment", {
    mcqQuestions: VOYAGER_ASSESSMENT.discovery,
    scaleQuestions: VOYAGER_ASSESSMENT.psychometric,
    userName: req.user.name,
  });
});

app.post("/submit-career-test", ensureAuthenticated, async (req, res) => {
  const { mcqAnswers, scaleAnswers } = req.body;

  const saved = await CareerAssessment.create({
    user: req.user._id,
    mcqAnswers,
    scaleAnswers,
  });

  res.json({ success: true });
});

app.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.redirect("/login");
    });
  });
});

// Start the server
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

export default app;
