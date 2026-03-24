import axios from "axios";

// ─── Base URL ─────────────────────────────────────────────────────────────────
// Strip trailing slash and /api suffix so we never end up with /api/api/...
const rawBaseUrl =
  import.meta.env.VITE_API_URL || "https://autopec-logistics-btwc.vercel.app";
const API_BASE_URL = rawBaseUrl.replace(/\/$/, "").replace(/\/api$/, "");

console.log("API Base URL:", API_BASE_URL);

// ─── Free-tier limits (must match cloudinary.js on the server) ───────────────
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_AUDIO_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_TOTAL_SIZE = 15 * 1024 * 1024; // 15MB total (matches server)
const MAX_FILES = 3;
// ─────────────────────────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 60000, // 60s — large uploads need time
  maxContentLength: MAX_TOTAL_SIZE, // Must match server limit
  maxBodyLength: MAX_TOTAL_SIZE,
});

// Request logger
api.interceptors.request.use(
  (config) => {
    console.log(`🚀 ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error("Request setup error:", error);
    return Promise.reject(error);
  },
);

// Response logger + error normaliser
api.interceptors.response.use(
  (response) => {
    console.log("✅ Response:", response.status);
    return response;
  },
  (error) => {
    if (error.code === "ECONNABORTED") {
      return Promise.reject(new Error("Request timed out. Please try again."));
    }

    if (error.response) {
      console.error("Response error:", {
        status: error.response.status,
        data: error.response.data,
      });
      // Surface the server's human-readable message
      error.message =
        error.response.data?.details ||
        error.response.data?.error ||
        error.message;
    } else if (error.request) {
      console.error("No response received");
      error.message = "No response from server. Please check your connection.";
    }

    return Promise.reject(error);
  },
);

// ─── submitRepairRequest ──────────────────────────────────────────────────────
export const submitRepairRequest = async (formData) => {
  try {
    console.log("📝 Submitting repair request...");

    const data = new FormData();

    // Attach the text fields as a JSON blob so the server can parse them
    const repairData = {
      registrationNumber: formData.registrationNumber,
      problemDescription: formData.problemDescription,
      customerName: formData.customerName || "",
      phoneNumber: formData.phoneNumber || "",
      carModel: formData.carModel || "",
    };
    data.append("repairData", JSON.stringify(repairData));

    // ── Validate and attach files ─────────────────────────────────────────────
    if (formData.multimedia && formData.multimedia.length > 0) {
      const files = formData.multimedia;

      if (files.length > MAX_FILES) {
        throw new Error(`Maximum ${MAX_FILES} files allowed per submission.`);
      }

      const errors = [];
      let totalSize = 0;

      files.forEach((file) => {
        totalSize += file.size;

        if (file.type.startsWith("image/") && file.size > MAX_IMAGE_SIZE) {
          errors.push(`"${file.name}" exceeds the 5MB image limit.`);
        } else if (
          file.type.startsWith("video/") &&
          file.size > MAX_VIDEO_SIZE
        ) {
          errors.push(`"${file.name}" exceeds the 10MB video limit.`);
        } else if (
          file.type.startsWith("audio/") &&
          file.size > MAX_AUDIO_SIZE
        ) {
          errors.push(`"${file.name}" exceeds the 5MB audio limit.`);
        }
      });

      if (totalSize > MAX_TOTAL_SIZE) {
        errors.push(
          `Total upload size is ${(totalSize / (1024 * 1024)).toFixed(2)}MB — max ${MAX_TOTAL_SIZE / (1024 * 1024)}MB.`,
        );
      }

      if (errors.length > 0) {
        throw new Error(errors.join(" "));
      }

      files.forEach((file) => {
        if (file instanceof File) {
          console.log(
            `  ➕ ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`,
          );
          data.append("multimedia", file);
        }
      });
    }

    const response = await api.post("/api/repairs/submit", data, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => {
        if (e.total) {
          const pct = Math.round((e.loaded * 100) / e.total);
          console.log(`Upload progress: ${pct}%`);
        }
      },
    });

    console.log("✅ Submission successful:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ submitRepairRequest error:", error);

    // Normalise the error message for the UI
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

// ─── getAllRepairs ────────────────────────────────────────────────────────────
export const getAllRepairs = async () => {
  try {
    console.log("📋 Fetching all repairs...");
    const response = await api.get("/api/repairs");
    console.log(`✅ Found ${response.data.length} repairs`);
    return response.data;
  } catch (error) {
    console.error("❌ getAllRepairs error:", error);
    throw error;
  }
};

// ─── deleteRepair ─────────────────────────────────────────────────────────────
export const deleteRepair = async (id) => {
  try {
    console.log(`🗑️ Deleting repair: ${id}`);
    const response = await api.delete(`/api/repairs/${id}`);
    console.log("✅ Delete successful");
    return response.data;
  } catch (error) {
    console.error("❌ deleteRepair error:", error);
    throw error;
  }
};

// ─── updateRepairStatus ───────────────────────────────────────────────────────
export const updateRepairStatus = async (id, data) => {
  try {
    console.log(`📝 Updating repair ${id} → status: ${data.status}`);
    const response = await api.put(`/api/repairs/${id}/status`, data);
    console.log("✅ Update successful");
    return response.data;
  } catch (error) {
    console.error("❌ updateRepairStatus error:", error);
    throw error;
  }
};

// ─── trackRepair ──────────────────────────────────────────────────────────────
export const trackRepair = async (registrationNumber) => {
  try {
    console.log(`🔍 Tracking: ${registrationNumber}`);
    const response = await api.get(
      `/api/repairs/track/${encodeURIComponent(registrationNumber)}`,
    );
    console.log("✅ Tracking successful");
    return response.data;
  } catch (error) {
    console.error("❌ trackRepair error:", error);
    throw error;
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const isValidMediaFile = (file) => {
  const validPrefixes = ["image/", "video/", "audio/"];
  const isValidType = validPrefixes.some((p) => file.type.startsWith(p));

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
    error = `File too large (max ${sizeLimit}). Current: ${(file.size / (1024 * 1024)).toFixed(2)}MB`;
  }

  return {
    valid: isValidType && isValidSize,
    type: isValidType,
    size: isValidSize,
    error,
  };
};

export const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const getMediaTypeFromFile = (file) => {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "other";
};

export const createMediaPreview = (file) =>
  file instanceof File ? URL.createObjectURL(file) : file;

export const revokeMediaPreview = (url) => {
  if (url && url.startsWith("blob:")) URL.revokeObjectURL(url);
};

export default api;
