const cloudinary = require("cloudinary").v2;
require("dotenv").config();

// ─── Cloudinary configuration ─────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

if (
  !process.env.CLOUDINARY_CLOUD_NAME ||
  !process.env.CLOUDINARY_API_KEY ||
  !process.env.CLOUDINARY_API_SECRET
) {
  console.error(
    "❌ Cloudinary config missing — check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET",
  );
}

// ─── Free-tier limits (enforced client-side in api.js) ───────────────────────
// These are exported so api.js and other modules can reference a single source
// of truth instead of duplicating magic numbers.
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_AUDIO_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB hard cap
const MAX_FILES_PER_REQUEST = 3;
const MAX_TOTAL_SIZE = 15 * 1024 * 1024; // 15MB total

// ─── deleteMedia ─────────────────────────────────────────────────────────────
// Deletes a file from Cloudinary by its public_id.
//
// mediaType must be the *Cloudinary* resource_type:
//   "image" → resource_type: "image"
//   "video" → resource_type: "video"
//   "audio" → resource_type: "video"  ← Cloudinary stores audio under "video"
//   "other" → resource_type: "raw"
const deleteMedia = async (publicId, mediaType = "image") => {
  if (!publicId) {
    console.warn("deleteMedia: no publicId provided, skipping.");
    return null;
  }

  const resourceTypeMap = {
    image: "image",
    video: "video",
    audio: "video", // Audio uses Cloudinary's "video" resource type
    other: "raw",
  };

  const resource_type = resourceTypeMap[mediaType] ?? "image";

  try {
    console.log(`🗑️ Deleting ${publicId} (resource_type: ${resource_type})`);
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type,
      invalidate: true,
    });

    if (result.result === "ok") {
      console.log(`✅ Deleted ${publicId}`);
    } else {
      console.warn(`⚠️ Could not delete ${publicId}: ${result.result}`);
    }

    return result;
  } catch (error) {
    console.error("❌ Cloudinary deleteMedia error:", error);
    return null;
  }
};

module.exports = {
  cloudinary,
  deleteMedia,
  MAX_FILE_SIZE,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  MAX_AUDIO_SIZE,
  MAX_FILES_PER_REQUEST,
  MAX_TOTAL_SIZE,
};
