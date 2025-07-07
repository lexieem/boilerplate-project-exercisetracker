require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const app = express();

const port = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Middleware
app.use(cors());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));

// Basic route
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// Mongoose Schemas
const { Schema } = mongoose;

const userSchema = new Schema({
  username: { type: String, required: true },
});

const exerciseSchema = new Schema({
  userId: { type: String, required: true },
  description: String,
  duration: Number,
  date: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);
const Exercise = mongoose.model("Exercise", exerciseSchema);

// Create new user
app.post("/api/users", async (req, res) => {
  try {
    const newUser = new User({ username: req.body.username });
    const savedUser = await newUser.save();
    res.json({ username: savedUser.username, _id: savedUser._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all users
app.get("/api/users", async (req, res) => {
  const users = await User.find({}, "username _id");
  res.json(users);
});

// Add exercise
app.post("/api/users/:_id/exercises", async (req, res) => {
  const { description, duration, date } = req.body;
  const user = await User.findById(req.params._id);
  if (!user) return res.json({ error: "User not found" });

  const exercise = new Exercise({
    userId: user._id,
    description,
    duration: parseInt(duration),
    date: date ? new Date(date).toDateString() : new Date().toDateString(),
  });

  const savedExercise = await exercise.save();

  res.json({
    _id: user._id,
    username: user.username,
    description: savedExercise.description,
    duration: savedExercise.duration,
    date: savedExercise.date,
  });
});

// Get user logs
app.get("/api/users/:_id/logs", async (req, res) => {
  const { from, to, limit } = req.query;
  const user = await User.findById(req.params._id);
  if (!user) return res.json({ error: "User not found" });

  let filter = { userId: req.params._id };

  // Build date filter if applicable
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }

  let query = Exercise.find(filter).select("description duration date");

  if (limit) query = query.limit(parseInt(limit));

  const exercises = await query.exec();

  const formattedLog = exercises.map((ex) => ({
    description: ex.description,
    duration: ex.duration,
    date: ex.date.toDateString(), // Format back to readable string
  }));

  res.json({
    username: user.username,
    _id: user._id,
    count: formattedLog.length,
    log: formattedLog,
  });
});

// Start server
app.listen(port, () => {
  console.log(`Your app is listening on port ${port}`);
});
