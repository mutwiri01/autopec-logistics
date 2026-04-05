const express = require("express");
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

// ─── CORS: raw middleware — runs before everything else ───────────────────────
// Sets Access-Control headers on EVERY response, including crashes and 500s,
// so the browser always sees the real error instead of a fake CORS failure.
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

  // Terminate OPTIONS preflights here — do not forward to any route
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
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

// ─── Body parsing ─────────────────────────────────────────────────────────────
// Files go directly browser→Cloudinary; only small JSON arrives here.
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ─── Supabase client ──────────────────────────────────────────────────────────
// We use the service-role key on the server so RLS is bypassed.
// The client is lazy-initialised: it requires no persistent connection or
// connection pool — every Supabase call is an HTTPS request, making it
// perfectly suited to Vercel's serverless / cold-start environment.
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "❌ Supabase config missing — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
  );
}

// Export a single shared client so all route files can import it
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }, // server-side: no session persistence needed
});

module.exports.supabase = supabase;

// ─── Cloudinary configuration ─────────────────────────────────────────────────
cloudinaryPkg.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── POST /api/sign-upload ────────────────────────────────────────────────────
// Returns a short-lived signed upload token.
// The browser uses this to upload files DIRECTLY to Cloudinary —
// no file bytes travel through Vercel, eliminating timeout issues.
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

    const paramsToSign = { timestamp, folder: safeFolder };

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

// ─── Application routes ───────────────────────────────────────────────────────
app.get("/", (_req, res) => res.send("Autopec is running."));

app.use("/api/repairs", repairRoutes);

app.get("/health", (_req, res) =>
  res.status(200).json({
    status: "OK",
    message: "Server is running",
    db: "supabase", // Supabase is always "connected" via HTTPS
    timestamp: new Date().toISOString(),
  }),
);

app.get("/api", (_req, res) =>
  res.status(200).json({
    message: "Autopec API",
    version: "3.0.0",
    database: "Supabase (PostgreSQL)",
    endpoints: {
      "GET  /api/repairs": "Get all repairs",
      "POST /api/repairs/submit": "Submit repair (JSON only)",
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
  console.error("Unhandled error:", err);

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

// ─── Local dev only ───────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server on port ${PORT}`);
  });
}

module.exports = app;
