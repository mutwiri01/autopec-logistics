import axios from "axios";

/**
 * ERROR FIX 1: URL Sanitization
 * We extract the base URL and use .replace() to ensure that if the
 * environment variable ends in "/" or "/api", they are stripped away.
 * This prevents the final URL from becoming /api/api/...
 */
const rawBaseUrl =
  import.meta.env.VITE_API_URL || "https://autopec-logistics-btwc.vercel.app";
const API_BASE_URL = rawBaseUrl.replace(/\/$/, "").replace(/\/api$/, "");

console.log("API Base URL:", API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 second timeout for file uploads
  maxContentLength: 20 * 1024 * 1024, // 20MB max content length
  maxBodyLength: 20 * 1024 * 1024, // 20MB max body length
});

// Add request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`🚀 ${config.method.toUpperCase()} request to: ${config.url}`);
    return config;
  },
  (error) => {
    console.error("Request error:", error);
    return Promise.reject(error);
  },
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log("✅ Response received:", response.status);
    return response;
  },
  (error) => {
    if (error.code === "ECONNABORTED") {
      console.error("Request timeout");
      return Promise.reject(new Error("Request timeout. Please try again."));
    }

    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error("Response error:", {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers,
      });

      // Enhance error message with server response
      error.message =
        error.response.data?.details ||
        error.response.data?.error ||
        error.message;
    } else if (error.request) {
      // The request was made but no response was received
      console.error("No response received:", error.request);
      error.message = "No response from server. Please check your connection.";
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error("Request setup error:", error.message);
    }

    return Promise.reject(error);
  },
);

// Submit repair request with multimedia support
export const submitRepairRequest = async (formData) => {
  try {
    console.log("📝 Submitting repair request...");

    const data = new FormData();

    const repairData = {
      registrationNumber: formData.registrationNumber,
      problemDescription: formData.problemDescription,
      customerName: formData.customerName || "",
      phoneNumber: formData.phoneNumber || "",
      carModel: formData.carModel || "",
    };

    data.append("repairData", JSON.stringify(repairData));

    // Validate and add multimedia files
    if (formData.multimedia && formData.multimedia.length > 0) {
      console.log(`📎 Adding ${formData.multimedia.length} files...`);

      // Free tier limits
      const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB for images
      const MAX_VIDEO_SIZE = 10 * 1024 * 1024; // 10MB for videos
      const MAX_AUDIO_SIZE = 5 * 1024 * 1024; // 5MB for audio
      const MAX_TOTAL_SIZE = 10 * 1024 * 1024; // 10MB total
      const MAX_FILES = 3; // Max 3 files

      // Check number of files
      if (formData.multimedia.length > MAX_FILES) {
        throw new Error(`Maximum ${MAX_FILES} files allowed per submission`);
      }

      let totalSize = 0;
      const errors = [];

      formData.multimedia.forEach((file) => {
        totalSize += file.size;

        // Check file size based on type
        if (file.type.startsWith("image/") && file.size > MAX_IMAGE_SIZE) {
          errors.push(`${file.name} exceeds 5MB limit for images`);
        } else if (
          file.type.startsWith("video/") &&
          file.size > MAX_VIDEO_SIZE
        ) {
          errors.push(`${file.name} exceeds 10MB limit for videos`);
        } else if (
          file.type.startsWith("audio/") &&
          file.size > MAX_AUDIO_SIZE
        ) {
          errors.push(`${file.name} exceeds 5MB limit for audio`);
        }
      });

      // Check total size
      if (totalSize > MAX_TOTAL_SIZE) {
        errors.push(
          `Total file size exceeds 10MB limit (${(totalSize / (1024 * 1024)).toFixed(2)}MB)`,
        );
      }

      if (errors.length > 0) {
        throw new Error(errors.join(". "));
      }

      formData.multimedia.forEach((file) => {
        if (file instanceof File) {
          console.log(
            `  - Adding file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`,
          );
          data.append("multimedia", file);
        }
      });
    }

    /**
     * ERROR FIX 2: Correcting the Method Call
     * Using the correct API endpoint path
     */
    const response = await api.post("/api/repairs/submit", data, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          console.log(`Upload progress: ${percentCompleted}%`);
        }
      },
    });

    console.log("✅ Submission successful:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error in submitRepairRequest:", error);

    // Enhance error message for user
    if (error.response?.data?.details) {
      error.message = error.response.data.details;
    } else if (error.response?.data?.error) {
      error.message = error.response.data.error;
    } else if (error.message === "Network Error") {
      error.message = "Network error. Please check your internet connection.";
    }

    throw error;
  }
};

// Get all repairs
export const getAllRepairs = async () => {
  try {
    console.log("📋 Fetching all repairs...");
    /**
     * ERROR FIX 3: Preventing path duplication
     * Using the correct API endpoint path
     */
    const response = await api.get("/api/repairs");
    console.log(`✅ Found ${response.data.length} repairs`);
    return response.data;
  } catch (error) {
    console.error("❌ Error in getAllRepairs:", error);
    throw error;
  }
};

// Delete a repair
export const deleteRepair = async (id) => {
  try {
    console.log(`🗑️ Deleting repair: ${id}`);
    const response = await api.delete(`/api/repairs/${id}`);
    console.log("✅ Delete successful");
    return response.data;
  } catch (error) {
    console.error("❌ Error in deleteRepair:", error);
    throw error;
  }
};

// Update repair status
export const updateRepairStatus = async (id, data) => {
  try {
    console.log(`📝 Updating repair ${id} status to: ${data.status}`);
    const response = await api.put(`/api/repairs/${id}/status`, data);
    console.log("✅ Update successful");
    return response.data;
  } catch (error) {
    console.error("❌ Error in updateRepairStatus:", error);
    throw error;
  }
};

// Track repair by registration number
export const trackRepair = async (registrationNumber) => {
  try {
    console.log(`🔍 Tracking repair: ${registrationNumber}`);
    const response = await api.get(`/api/repairs/track/${registrationNumber}`);
    console.log("✅ Tracking successful");
    return response.data;
  } catch (error) {
    console.error("❌ Error in trackRepair:", error);
    throw error;
  }
};

// Helper function to check if a file is valid for upload
export const isValidMediaFile = (file) => {
  const validTypes = ["image/", "video/", "audio/"];
  const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB for images
  const MAX_VIDEO_SIZE = 10 * 1024 * 1024; // 10MB for videos
  const MAX_AUDIO_SIZE = 5 * 1024 * 1024; // 5MB for audio

  const isValidType = validTypes.some((type) => file.type.startsWith(type));

  let isValidSize = true;
  let sizeLimit = "10MB";

  if (file.type.startsWith("image/")) {
    isValidSize = file.size <= MAX_IMAGE_SIZE;
    sizeLimit = "5MB";
  } else if (file.type.startsWith("video/")) {
    isValidSize = file.size <= MAX_VIDEO_SIZE;
    sizeLimit = "10MB";
  } else if (file.type.startsWith("audio/")) {
    isValidSize = file.size <= MAX_AUDIO_SIZE;
    sizeLimit = "5MB";
  }

  let error = null;
  if (!isValidType) {
    error = "Invalid file type. Please upload images, videos, or audio files.";
  } else if (!isValidSize) {
    error = `File too large (max ${sizeLimit}). Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`;
  }

  return {
    valid: isValidType && isValidSize,
    type: isValidType,
    size: isValidSize,
    error: error,
  };
};

// Helper function to format file size
export const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// Helper function to get media type from file
export const getMediaTypeFromFile = (file) => {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "other";
};

// Helper function to create object URL for preview
export const createMediaPreview = (file) => {
  if (file instanceof File) {
    return URL.createObjectURL(file);
  }
  return file;
};

// Helper function to revoke object URL
export const revokeMediaPreview = (url) => {
  if (url && url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
};

export default api;
