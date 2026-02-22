const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure storage for different media types
const createStorage = (folder, resourceType) => {
  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: `autopec/${folder}`,
      resource_type: resourceType,
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov', 'mp3', 'wav', 'webm'],
      transformation: (req, file) => {
        if (file.mimetype.startsWith('image/')) {
          return { width: 1000, crop: 'limit' };
        }
        return null;
      }
    }
  });
};

// Create multer upload instances for different media types
const uploadImage = multer({
  storage: createStorage('images', 'image'),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

const uploadVideo = multer({
  storage: createStorage('videos', 'video'),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'), false);
    }
  }
});

const uploadAudio = multer({
  storage: createStorage('audio', 'auto'),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'), false);
    }
  }
});

// Generic upload for any media type
const uploadMedia = multer({
  storage: createStorage('media', 'auto'),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.startsWith('image/') ||
      file.mimetype.startsWith('video/') ||
      file.mimetype.startsWith('audio/')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only images, videos, and audio files are allowed'), false);
    }
  }
});

// Delete media from Cloudinary
const deleteMedia = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting media from Cloudinary:', error);
    throw error;
  }
};

module.exports = {
  cloudinary,
  uploadImage,
  uploadVideo,
  uploadAudio,
  uploadMedia,
  deleteMedia
};