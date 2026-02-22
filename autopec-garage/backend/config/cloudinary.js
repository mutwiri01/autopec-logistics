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

// Create storage for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "autopec",
    resource_type: "auto",
    allowed_formats: [
      "jpg",
      "jpeg",
      "png",
      "gif",
      "mp4",
      "mov",
      "mp3",
      "wav",
      "webm",
      "m4a",
    ],
    transformation: (req, file) => {
      if (file.mimetype.startsWith("image/")) {
        return { width: 1000, crop: "limit", quality: "auto" };
      }
      return null;
    },
  },
});

// Create multer upload instance
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    // Accept images, videos, and audio
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype.startsWith("video/") ||
      file.mimetype.startsWith("audio/")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only images, videos, and audio files are allowed"), false);
    }
  },
});

// Delete media from Cloudinary
const deleteMedia = async (publicId) => {
  try {
    if (!publicId) return null;
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "video", // This works for all types
    });
    return result;
  } catch (error) {
    console.error("Error deleting media from Cloudinary:", error);
    throw error;
  }
};

module.exports = {
  cloudinary,
  upload, // Export as 'upload'
  deleteMedia,
};
