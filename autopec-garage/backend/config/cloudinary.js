const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
require("dotenv").config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── FREE TIER LIMITS ────────────────────────────────────────────────────────
// Cloudinary free plan: 25 credits/month, 25GB storage, 25GB bandwidth
// Safe per-file limits to stay well within free tier:
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB per image
const MAX_VIDEO_SIZE = 10 * 1024 * 1024; // 10MB per video
const MAX_AUDIO_SIZE = 5 * 1024 * 1024; // 5MB per audio
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB hard cap (multer)
const MAX_FILES_PER_REQUEST = 3; // Max 3 files per submission
const MAX_TOTAL_SIZE = 15 * 1024 * 1024; // 15MB total across all files
// ─────────────────────────────────────────────────────────────────────────────

// Check if Cloudinary is properly configured
if (
  !process.env.CLOUDINARY_CLOUD_NAME ||
  !process.env.CLOUDINARY_API_KEY ||
  !process.env.CLOUDINARY_API_SECRET
) {
  console.error(
    "❌ Cloudinary configuration missing. Please check your environment variables.",
  );
}

// Configure storage for different file types
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    let folder = "repairs";
    let resource_type = "auto";

    if (file.mimetype.startsWith("image/")) {
      folder = "repairs/images";
      resource_type = "image";
    } else if (file.mimetype.startsWith("video/")) {
      folder = "repairs/videos";
      resource_type = "video";
    } else if (file.mimetype.startsWith("audio/")) {
      folder = "repairs/audio";
      // Cloudinary requires resource_type "video" for audio files
      resource_type = "video";
    }

    // Keep transformations minimal on free tier to avoid timeouts.
    // Only apply a simple quality/size cap — no format conversion.
    let transformation = undefined;

    if (file.mimetype.startsWith("image/")) {
      transformation = [
        {
          width: 1200,
          height: 1200,
          crop: "limit",
          quality: "auto:eco",
          fetch_format: "auto",
        },
      ];
    }
    // No transformation for video/audio on free tier — transcoding burns credits fast.

    return {
      folder,
      resource_type,
      // Use a timestamp + random string as the public_id so it's unique
      public_id: `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
      transformation,
      // Do NOT pass a `format` field — letting Cloudinary keep the original
      // format avoids re-encoding failures on the free tier.
    };
  },
});

// File filter — accept common safe formats only
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "video/mp4",
    "video/quicktime",
    "video/webm",
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/webm",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type: ${file.mimetype}. Allowed: JPEG, PNG, WEBP, MP4, WebM, MP3, WAV`,
      ),
      false,
    );
  }
};

// Multer upload instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE, // Per-file cap enforced by multer
    files: MAX_FILES_PER_REQUEST,
    fieldSize: 5 * 1024 * 1024, // 5MB for text fields
  },
});

// ─── deleteMedia ─────────────────────────────────────────────────────────────
// IMPORTANT: audio files are stored as resource_type "video" in Cloudinary.
// The `mediaType` param should reflect the Cloudinary resource_type, not the
// HTML media kind. Callers must pass the correct type.
const deleteMedia = async (publicId, mediaType = "image") => {
  try {
    if (!publicId) {
      console.log("⚠️ deleteMedia: no publicId provided, skipping.");
      return null;
    }

    // Map our internal type names to Cloudinary resource_type values
    // "audio" is stored as "video" in Cloudinary
    const resourceTypeMap = {
      image: "image",
      video: "video",
      audio: "video", // ← critical: audio uses video resource_type
      other: "raw",
    };

    const resource_type = resourceTypeMap[mediaType] || "image";

    console.log(
      `🗑️ Deleting from Cloudinary: ${publicId} (resource_type: ${resource_type})`,
    );

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type,
      invalidate: true,
    });

    if (result.result === "ok") {
      console.log(`✅ Deleted ${publicId}`);
    } else {
      console.log(`⚠️ Could not delete ${publicId}: ${result.result}`);
    }

    return result;
  } catch (error) {
    console.error("❌ Error deleting from Cloudinary:", error);
    return null;
  }
};
// ─────────────────────────────────────────────────────────────────────────────

// Validate a single file object (used before upload)
const validateFile = (file) => {
  const errors = [];

  if (file.mimetype.startsWith("image/") && file.size > MAX_IMAGE_SIZE) {
    errors.push(
      `Image "${file.originalname}" is ${(file.size / (1024 * 1024)).toFixed(2)}MB — max 5MB`,
    );
  } else if (file.mimetype.startsWith("video/") && file.size > MAX_VIDEO_SIZE) {
    errors.push(
      `Video "${file.originalname}" is ${(file.size / (1024 * 1024)).toFixed(2)}MB — max 10MB`,
    );
  } else if (file.mimetype.startsWith("audio/") && file.size > MAX_AUDIO_SIZE) {
    errors.push(
      `Audio "${file.originalname}" is ${(file.size / (1024 * 1024)).toFixed(2)}MB — max 5MB`,
    );
  }

  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "video/mp4",
    "video/quicktime",
    "video/webm",
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/webm",
  ];

  if (!allowedTypes.includes(file.mimetype)) {
    errors.push(
      `"${file.originalname}" has unsupported type: ${file.mimetype}`,
    );
  }

  return { valid: errors.length === 0, errors };
};

// Middleware to validate total upload size after multer has parsed the request
const validateUpload = (req, res, next) => {
  const files = req.files || (req.file ? [req.file] : []);
  if (files.length === 0) return next();

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  if (totalSize > MAX_TOTAL_SIZE) {
    return res.status(400).json({
      error: "Total file size exceeds limit",
      details:
        `All files combined must be under ${MAX_TOTAL_SIZE / (1024 * 1024)}MB. ` +
        `Current total: ${(totalSize / (1024 * 1024)).toFixed(2)}MB`,
    });
  }

  for (const file of files) {
    const { valid, errors } = validateFile(file);
    if (!valid) {
      return res
        .status(400)
        .json({ error: "File validation failed", details: errors.join(", ") });
    }
  }

  next();
};

module.exports = {
  cloudinary,
  upload,
  deleteMedia,
  validateFile,
  validateUpload,
  MAX_FILE_SIZE,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  MAX_AUDIO_SIZE,
  MAX_FILES_PER_REQUEST,
  MAX_TOTAL_SIZE,
};
