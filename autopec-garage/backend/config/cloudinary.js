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

// Free tier limits - ADJUSTED FOR FREE TIER
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB total per upload (free tier limit)
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB for images
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB for videos (but free tier may still limit)
const MAX_FILES_PER_REQUEST = 3; // Reduced to 3 files max for free tier reliability
const MAX_TOTAL_SIZE = 10 * 1024 * 1024; // 10MB total for all files combined

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

// Configure storage for different file types - SIMPLIFIED FOR FREE TIER
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
    } else if (file.mimetype.startsWith("audio/")) {
      folder = "repairs/audio";
      resource_type = "video"; // Audio files use video resource type in Cloudinary
    }

    // SIMPLIFIED TRANSFORMATIONS FOR FREE TIER - less processing = fewer errors
    const transformation = [];

    if (file.mimetype.startsWith("image/")) {
      // Only resize if needed, no quality auto-optimization which can cause issues
      transformation.push({ width: 1200, height: 1200, crop: "limit" });
    } else if (file.mimetype.startsWith("video/")) {
      // Minimal video processing
      transformation.push({ width: 1280, height: 720, crop: "limit" });
    }

    return {
      folder: folder,
      resource_type: resource_type,
      public_id: `${Date.now()}-${Math.round(Math.random() * 1e9)}`,
      format: format,
      transformation: transformation.length > 0 ? transformation : undefined,
      // Add timeout to prevent hanging
      timeout: 60000, // 60 seconds timeout
    };
  },
});

// File filter function - STRICTER FOR FREE TIER
const fileFilter = (req, file, cb) => {
  // Check file type - limited to common formats for free tier
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "video/mp4",
    "video/quicktime",
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type: ${file.mimetype}. Allowed types: JPEG, PNG, WEBP images, MP4 videos, MP3/WAV audio`,
      ),
      false,
    );
  }
};

// Custom validation middleware to check total size before upload
const validateUpload = (req, res, next) => {
  if (!req.files && !req.file) {
    return next();
  }

  const files = req.files || (req.file ? [req.file] : []);
  let totalSize = 0;

  for (const file of files) {
    totalSize += file.size;
  }

  // Check total size
  if (totalSize > MAX_TOTAL_SIZE) {
    return res.status(400).json({
      error: "Total file size exceeds limit",
      details: `Total size of all files must be less than ${MAX_TOTAL_SIZE / (1024 * 1024)}MB. Current total: ${(totalSize / (1024 * 1024)).toFixed(2)}MB`,
    });
  }

  // Check individual file sizes
  for (const file of files) {
    if (file.mimetype.startsWith("image/") && file.size > MAX_IMAGE_SIZE) {
      return res.status(400).json({
        error: "Image file too large",
        details: `Image must be less than ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`,
      });
    }
    if (file.mimetype.startsWith("video/") && file.size > MAX_VIDEO_SIZE) {
      return res.status(400).json({
        error: "Video file too large",
        details: `Video must be less than ${MAX_VIDEO_SIZE / (1024 * 1024)}MB`,
      });
    }
  }

  next();
};

// Create multer upload middleware with limits
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_VIDEO_SIZE, // Allow up to video size, we'll check per type
    files: MAX_FILES_PER_REQUEST,
    fieldSize: 10 * 1024 * 1024, // 10MB for text fields
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
      invalidate: true,
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
    return null;
  }
};

// Helper to validate file before upload
const validateFile = (file) => {
  const errors = [];

  // Check file size based on type
  if (file.mimetype.startsWith("image/") && file.size > MAX_IMAGE_SIZE) {
    errors.push(
      `Image ${file.originalname} exceeds the ${MAX_IMAGE_SIZE / (1024 * 1024)}MB limit (${(file.size / (1024 * 1024)).toFixed(2)}MB)`,
    );
  } else if (file.mimetype.startsWith("video/") && file.size > MAX_VIDEO_SIZE) {
    errors.push(
      `Video ${file.originalname} exceeds the ${MAX_VIDEO_SIZE / (1024 * 1024)}MB limit (${(file.size / (1024 * 1024)).toFixed(2)}MB)`,
    );
  } else if (
    !file.mimetype.startsWith("image/") &&
    !file.mimetype.startsWith("video/") &&
    file.size > MAX_FILE_SIZE
  ) {
    errors.push(
      `File ${file.originalname} exceeds the ${MAX_FILE_SIZE / (1024 * 1024)}MB limit (${(file.size / (1024 * 1024)).toFixed(2)}MB)`,
    );
  }

  // Check file type
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "video/mp4",
    "video/quicktime",
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
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
  validateUpload,
  MAX_FILE_SIZE,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  MAX_FILES_PER_REQUEST,
  MAX_TOTAL_SIZE,
};
