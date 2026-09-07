const express = require("express")
const cookieParser = require("cookie-parser")
const cors = require("cors")

const app = express()
app.use(express.json())
app.use(cookieParser())

// Updated dynamic CORS configuration
const allowedOrigins = [
  "http://localhost:5173",
  "https://interview-gen-ai-git-main-himanshu2005singhs-projects.vercel.app",
  process.env.CLIENT_URL
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like Postman/mobile apps) or matching origins
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error("CORS policy violation"));
    }
  },
  credentials: true,
  exposedHeaders: ['Content-Disposition'] // Required for PDF download filename detection
}))

/* requires all the routes here */
const authRouter = require("./routes/auth.routes")
const interviewRouter = require("./routes/interview.routes")

/* using all the routes here */
app.use("/api/auth", authRouter)
app.use("/api/interview", interviewRouter)

module.exports = app