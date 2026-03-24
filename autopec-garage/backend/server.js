const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const repairRoutes = require("./routes/repairs");
require("dotenv").config();

const app = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://autopec-logistics.vercel.app",
  "https://autopec-logistics-btwc.vercel.app",
];

// Middleware that manually sets CORS headers on EVERY response.
// This runs before the cors() package so that even error responses
// (including 4xx from multer) always carry the right headers —
// without them the browser masks the real error as a CORS failure.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (
    origin &&
    (allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production")
  ) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With",
  );

  // Respond immediately to preflight OPTIONS requests — do NOT forward to routes
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

// cors() package is kept as a second layer for any edge cases
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        process.env.NODE_ENV !== "production"
      ) {
        return callback(null, true);
      }
      console.warn("CORS blocked origin:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

// ─── Body parsing ─────────────────────────────────────────────────────────────
// Keep JSON/urlencoded limit at 10MB (matches Cloudinary free tier total).
// multipart/form-data (file uploads) is handled by multer in the routes.
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get("/", (_req, res) => res.send("Autopec is running."));

app.use("/api/repairs", repairRoutes);

app.get("/health", (_req, res) =>
  res.status(200).json({
    status: "OK",
    message: "Server is running",
    timestamp: new Date().toISOString(),
  }),
);

app.get("/api", (_req, res) =>
  res.status(200).json({
    message: "Autopec API",
    version: "1.0.0",
    endpoints: {
      "GET  /api/repairs": "Get all repairs",
      "POST /api/repairs/submit": "Submit a new repair request",
      "PUT  /api/repairs/:id/status": "Update repair status",
      "GET  /api/repairs/track/:reg": "Track repair by registration",
      "DEL  /api/repairs/:id": "Delete a repair",
      "GET  /api/repairs/status/:status": "Get repairs by status",
    },
  }),
);

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Global error handler:", err);

  if (err.name === "MulterError") {
    let message = err.message;
    if (err.code === "LIMIT_FILE_SIZE")
      message = "File too large. Max: 5MB images/audio, 10MB video.";
    else if (err.code === "LIMIT_FILE_COUNT")
      message = "Too many files. Maximum 3 files allowed.";
    else if (err.code === "LIMIT_UNEXPECTED_FILE")
      message = "Unexpected file field. Use 'multimedia' as the field name.";

    return res.status(400).json({
      error: "File upload error",
      details: message,
      code: err.code,
    });
  }

  if (err.name === "ValidationError") {
    return res.status(400).json({
      error: "Validation error",
      details: err.message,
    });
  }

  if (err.message === "Not allowed by CORS") {
    return res
      .status(403)
      .json({ error: "CORS error", details: "Origin not allowed" });
  }

  return res.status(500).json({
    error: err.message || "Internal server error",
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

// ─── MongoDB connection ───────────────────────────────────────────────────────
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
};

connectDB();

mongoose.connection.on("error", (err) => console.error("MongoDB error:", err));
mongoose.connection.on("disconnected", () =>
  console.log("MongoDB disconnected"),
);
mongoose.connection.on("reconnected", () => console.log("MongoDB reconnected"));

// ─── Start server (local dev) ─────────────────────────────────────────────────
// On Vercel the app is exported as a serverless function; listen() is only
// called when running locally.
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
  });
}

module.exports = app;
