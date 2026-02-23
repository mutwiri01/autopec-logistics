const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const repairRoutes = require("./routes/repairs");
require("dotenv").config();

const app = express();

// Middleware - Updated CORS to allow all origins
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

      if (allowedOrigins.indexOf(origin) === -1) {
        const msg =
          "The CORS policy for this site does not allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root Route
app.get("/", (req, res) => {
  res.send("Autopec is running.");
});

// Routes
app.use("/api/repairs", repairRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Server is running" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({
    error: err.message || "Internal server error",
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

// Add this with your other routes
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

// MongoDB Connection - Fixed: Removed deprecated options
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
