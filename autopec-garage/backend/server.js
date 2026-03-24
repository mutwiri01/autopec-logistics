const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const repairRoutes = require("./routes/repairs");
const cloudinaryPkg = require("cloudinary").v2;
require("dotenv").config();

const app = express();

// ─── Allowed origins ──────────────────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://autopec-logistics.vercel.app",
  "https://autopec-logistics-btwc.vercel.app",
];

// ─── CORS: raw middleware runs FIRST, before everything else ─────────────────
// Guarantees Access-Control-Allow-Origin is on EVERY response including
// uncaught 500s — without this they appear as CORS errors in the browser.
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

  // Short-circuit all OPTIONS preflights — never forward to routes
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

// cors() package as a second safety layer
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
// File uploads no longer pass through this server (direct-to-Cloudinary).
// Only small JSON payloads arrive here now.
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ─── Cloudinary configuration ─────────────────────────────────────────────────
cloudinaryPkg.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── POST /api/sign-upload ────────────────────────────────────────────────────
// Returns a short-lived Cloudinary upload signature.
// The frontend uploads files DIRECTLY to Cloudinary using this signature —
// zero file bytes travel through Vercel, eliminating the 10s timeout problem.
app.post("/api/sign-upload", (req, res) => {
  try {
    const { folder = "repairs", resource_type = "image" } = req.body;

    const allowedFolders = [
      "repairs",
      "repairs/images",
      "repairs/videos",
      "repairs/audio",
    ];
    const safeFolder = allowedFolders.includes(folder) ? folder : "repairs";

    const timestamp = Math.round(Date.now() / 1000);

    // These params must be sent by the frontend when calling Cloudinary directly.
    const paramsToSign = {
      timestamp,
      folder: safeFolder,
    };

    // Add a lightweight transformation for images to conserve free-tier credits
    if (resource_type === "image") {
      paramsToSign.transformation = "c_limit,w_1200,h_1200,q_auto:eco";
    }

    const signature = cloudinaryPkg.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET,
    );

    return res.json({
      signature,
      timestamp,
      api_key: process.env.CLOUDINARY_API_KEY,
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      folder: safeFolder,
    });
  } catch (err) {
    console.error("sign-upload error:", err);
    return res
      .status(500)
      .json({ error: "Failed to generate upload signature" });
  }
});

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
    version: "2.0.0",
    endpoints: {
      "GET  /api/repairs": "Get all repairs",
      "POST /api/repairs/submit": "Submit repair (JSON, no files)",
      "PUT  /api/repairs/:id/status": "Update repair status",
      "GET  /api/repairs/track/:reg": "Track by registration number",
      "DEL  /api/repairs/:id": "Delete a repair",
      "GET  /api/repairs/status/:status": "Get repairs by status",
      "POST /api/sign-upload": "Get signed Cloudinary upload token",
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
    return res
      .status(400)
      .json({ error: "Validation error", details: err.message });
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

// ─── Local dev server ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
  });
}

module.exports = app;
