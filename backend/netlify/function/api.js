const express = require("express");
const serverless = require("serverless-http");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// MongoDB connect
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Test route
app.get("/test", (req, res) => {
  res.json({ message: "Backend Working" });
});

// Example route
app.get("/users", (req, res) => {
  res.json([{ name: "Ali" }, { name: "Ahmed" }]);
});

module.exports.handler = serverless(app);
