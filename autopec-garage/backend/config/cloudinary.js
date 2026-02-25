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

// Free tier limits
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB for free tier
const MAX_FILES_PER_REQUEST = 5; // Limit number of files per request

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
    // Determine folder and resource type based on file mimetype
    let folder = "repairs";
    let resource_type = "auto";
    let format = undefined;

    if (file.mimetype.startsWith("image/")) {
      folder = "repairs/images";
      resource_type = "image";
      // Keep original format for images
      format = file.mimetype.split("/")[1];
    } else if (file.mimetype.startsWith("video/")) {
      folder = "repairs/videos";
      resource_type = "video";
      // For videos, we'll let Cloudinary handle the format
    } else if (file.mimetype.startsWith("audio/")) {
      folder = "repairs/audio";
      resource_type = "video"; // Audio files use video resource type in Cloudinary
    }

    return {
      folder: folder,
      resource_type: resource_type,
      public_id: `${Date.now()}-${Math.round(Math.random() * 1e9)}`,
      format: format,
      // Add transformation for images to optimize storage
      ...(file.mimetype.startsWith("image/") && {
        transformation: [
          { width: 1200, height: 1200, crop: "limit" }, // Limit image size
          { quality: "auto:good" }, // Auto optimize quality
        ],
      }),
      // For videos, limit dimensions
      ...(file.mimetype.startsWith("video/") && {
        transformation: [
          { width: 1280, height: 720, crop: "limit" }, // Limit video size
          { quality: "auto:good" },
          { video_codec: "h264" }, // Standard codec
        ],
      }),
    };
  },
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Check file type
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "video/mp4",
    "video/mpeg",
    "video/quicktime",
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/ogg",
    "audio/webm",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type: ${file.mimetype}. Allowed types: images (JPEG, PNG, GIF, WEBP), videos (MP4), audio (MP3, WAV, OGG, WEBM)`,
      ),
      false,
    );
  }
};

// Create multer upload middleware with limits
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES_PER_REQUEST,
  },
});

// Helper function to delete media from Cloudinary
const deleteMedia = async (publicId, resourceType = "image") => {
  try {
    if (!publicId) {
      console.log("No publicId provided for deletion");
      return;
    }

    console.log(
      `Attempting to delete from Cloudinary: ${publicId} (${resourceType})`,
    );

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true, // Invalidate CDN cache
    });

    console.log("Cloudinary deletion result:", result);

    if (result.result === "ok") {
      console.log(`✅ Successfully deleted ${publicId}`);
    } else {
      console.log(`⚠️ Could not delete ${publicId}: ${result.result}`);
    }

    return result;
  } catch (error) {
    console.error("❌ Error deleting from Cloudinary:", error);
    // Don't throw error, just log it
    return null;
  }
};

// Helper to validate file before upload
const validateFile = (file) => {
  const errors = [];

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    errors.push(
      `File ${file.originalname} exceeds the 10MB limit (${(file.size / (1024 * 1024)).toFixed(2)}MB)`,
    );
  }

  // Check file type
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "video/mp4",
    "video/mpeg",
    "video/quicktime",
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/ogg",
    "audio/webm",
  ];

  if (!allowedTypes.includes(file.mimetype)) {
    errors.push(
      `File ${file.originalname} has unsupported type: ${file.mimetype}`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

module.exports = {
  cloudinary,
  upload,
  deleteMedia,
  validateFile,
  MAX_FILE_SIZE,
  MAX_FILES_PER_REQUEST,
};
