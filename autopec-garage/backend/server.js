const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const repairRoutes = require("./routes/repairs");
require("dotenv").config();

const app = express();

// Middleware - Fixed CORS configuration
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://autopec-logistics.vercel.app",
  "https://autopec-logistics-btwc.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, etc)
      if (!origin) return callback(null, true);

      // Check if origin is allowed
      if (
        allowedOrigins.indexOf(origin) !== -1 ||
        process.env.NODE_ENV !== "production"
      ) {
        callback(null, true);
      } else {
        console.log("CORS blocked origin:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

// Increase payload limit for file uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Root Route
app.get("/", (req, res) => {
  res.send("Autopec is running.");
});

// Routes
app.use("/api/repairs", repairRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// Add API info endpoint
app.get("/api", (req, res) => {
  res.status(200).json({
    message: "Autopec API",
    endpoints: {
      "GET /api/repairs": "Get all repairs",
      "POST /api/repairs/submit": "Submit a new repair request",
      "PUT /api/repairs/:id/status": "Update repair status",
      "GET /api/repairs/track/:registration": "Track repair by registration",
      "DELETE /api/repairs/:id": "Delete a repair",
      "GET /api/repairs/status/:status": "Get repairs by status",
    },
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err);

  // Handle specific error types
  if (err.name === "MulterError") {
    let message = err.message;
    let code = err.code;

    // More user-friendly messages
    if (err.code === "LIMIT_FILE_SIZE") {
      message =
        "File too large. Maximum file size is 10MB for images, 100MB for videos.";
    } else if (err.code === "LIMIT_FILE_COUNT") {
      message = "Too many files. Maximum 3 files allowed per request.";
    } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
      message = "Unexpected file field. Please check your upload.";
    }

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

  // Handle CORS errors
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      error: "CORS error",
      details: "Origin not allowed",
    });
  }

  res.status(500).json({
    error: err.message || "Internal server error",
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

// MongoDB Connection with better error handling
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log("✅ Connected to MongoDB successfully");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
};

connectDB();

// Handle MongoDB connection errors after initial connection
mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.log("MongoDB disconnected");
});

mongoose.connection.on("reconnected", () => {
  console.log("MongoDB reconnected");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
});

module.exports = app;
