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
  params: async (req, file) => {
    // Determine folder and resource type based on file mimetype
    let folder = "autopec";
    let resourceType = "auto";
    let format = undefined;

    if (file.mimetype.startsWith("image/")) {
      folder = "autopec/images";
      resourceType = "image";
      format = file.mimetype.split("/")[1];
    } else if (file.mimetype.startsWith("video/")) {
      folder = "autopec/videos";
      resourceType = "video";
    } else if (file.mimetype.startsWith("audio/")) {
      folder = "autopec/audio";
      resourceType = "video"; // Cloudinary uses 'video' for audio too
    }

    return {
      folder: folder,
      resource_type: resourceType,
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
      public_id: `${Date.now()}-${Math.round(Math.random() * 1e9)}`,
      format: format,
    };
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
const deleteMedia = async (publicId, resourceType = "image") => {
  try {
    if (!publicId) return null;

    // Determine resource type based on publicId path or passed parameter
    let type = resourceType;
    if (publicId.includes("videos")) {
      type = "video";
    } else if (publicId.includes("audio")) {
      type = "video"; // Audio uses video resource type in Cloudinary
    }

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: type,
    });
    return result;
  } catch (error) {
    console.error("Error deleting media from Cloudinary:", error);
    throw error;
  }
};

module.exports = {
  cloudinary,
  upload,
  deleteMedia,
};
