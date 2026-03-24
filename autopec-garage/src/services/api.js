import axios from "axios";

// ─── Base URL ─────────────────────────────────────────────────────────────────
const rawBaseUrl =
  import.meta.env.VITE_API_URL || "https://autopec-logistics-btwc.vercel.app";
const API_BASE_URL = rawBaseUrl.replace(/\/$/, "").replace(/\/api$/, "");

console.log("API Base URL:", API_BASE_URL);

// ─── Free-tier limits ─────────────────────────────────────────────────────────
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_VIDEO_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_AUDIO_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_TOTAL_SIZE = 15 * 1024 * 1024; // 15MB combined
export const MAX_FILES = 3;

// ─── Axios instance ───────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000, // 30s is plenty — only JSON travels through Vercel now
});

api.interceptors.request.use(
  (config) => {
    console.log(`🚀 ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error),
);

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
      console.error(
        "Response error:",
        error.response.status,
        error.response.data,
      );
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

// ─── uploadFileToCloudinary ───────────────────────────────────────────────────
// 1. Fetch a signed upload token from YOUR backend (fast, no file involved)
// 2. POST the file directly from the browser to Cloudinary's upload API
//    (bypasses Vercel entirely — no timeouts)
// Returns a { type, url, publicId, filename } object.
const uploadFileToCloudinary = async (file, onProgress) => {
  // Determine folder and resource_type
  let folder = "repairs";
  let resource_type = "auto";

  if (file.type.startsWith("image/")) {
    folder = "repairs/images";
    resource_type = "image";
  } else if (file.type.startsWith("video/")) {
    folder = "repairs/videos";
    resource_type = "video";
  } else if (file.type.startsWith("audio/")) {
    folder = "repairs/audio";
    resource_type = "video"; // Cloudinary stores audio under "video"
  }

  // Step 1: get signature from our backend
  const signRes = await api.post("/api/sign-upload", { folder, resource_type });
  const { signature, timestamp, api_key, cloud_name } = signRes.data;

  // Step 2: build the multipart form for Cloudinary's upload API
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", api_key);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);
  formData.append("folder", folder);

  // Apply the same lightweight transformation the server signed for images
  if (resource_type === "image") {
    formData.append("transformation", "c_limit,w_1200,h_1200,q_auto:eco");
  }

  // Step 3: upload directly to Cloudinary (browser → Cloudinary, no Vercel hop)
  const uploadRes = await axios.post(
    `https://api.cloudinary.com/v1_1/${cloud_name}/${resource_type}/upload`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120000, // 2 min — Cloudinary can be slow on free tier
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded * 100) / e.total));
        }
      },
    },
  );

  const mediaTypeMap = { image: "image", video: "video" };
  const isAudio = file.type.startsWith("audio/");

  return {
    type: isAudio ? "audio" : mediaTypeMap[resource_type] || "other",
    url: uploadRes.data.secure_url,
    publicId: uploadRes.data.public_id,
    filename: file.name,
  };
};

// ─── submitRepairRequest ──────────────────────────────────────────────────────
// Uploads each file directly to Cloudinary, then sends a single JSON request
// to the backend with the resulting URLs. Nothing heavy passes through Vercel.
export const submitRepairRequest = async (formData, onProgress) => {
  try {
    console.log("📝 Starting submission...");

    // ── Validate files before doing anything ─────────────────────────────────
    const files = formData.multimedia || [];

    if (files.length > MAX_FILES) {
      throw new Error(`Maximum ${MAX_FILES} files allowed per submission.`);
    }

    const sizeErrors = [];
    let totalSize = 0;

    files.forEach((file) => {
      totalSize += file.size;
      if (file.type.startsWith("image/") && file.size > MAX_IMAGE_SIZE)
        sizeErrors.push(`"${file.name}" exceeds the 5MB image limit.`);
      else if (file.type.startsWith("video/") && file.size > MAX_VIDEO_SIZE)
        sizeErrors.push(`"${file.name}" exceeds the 10MB video limit.`);
      else if (file.type.startsWith("audio/") && file.size > MAX_AUDIO_SIZE)
        sizeErrors.push(`"${file.name}" exceeds the 5MB audio limit.`);
    });

    if (totalSize > MAX_TOTAL_SIZE) {
      sizeErrors.push(
        `Combined size is ${(totalSize / (1024 * 1024)).toFixed(2)}MB — max ${MAX_TOTAL_SIZE / (1024 * 1024)}MB.`,
      );
    }

    if (sizeErrors.length > 0) {
      throw new Error(sizeErrors.join(" "));
    }

    // ── Upload each file directly to Cloudinary ───────────────────────────────
    const multimedia = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`📤 Uploading file ${i + 1}/${files.length}: ${file.name}`);

      const result = await uploadFileToCloudinary(file, (pct) => {
        if (onProgress) {
          // Spread progress across files: each file gets an equal share
          const base = (i / files.length) * 100;
          const share = (1 / files.length) * pct;
          onProgress(Math.round(base + share));
        }
      });

      console.log(`✅ Uploaded: ${result.url}`);
      multimedia.push(result);
    }

    // ── POST JSON to our backend ──────────────────────────────────────────────
    const payload = {
      registrationNumber: formData.registrationNumber,
      problemDescription: formData.problemDescription,
      customerName: formData.customerName || "",
      phoneNumber: formData.phoneNumber || "",
      carModel: formData.carModel || "",
      multimedia,
    };

    console.log("📡 Sending JSON to backend...");
    const response = await api.post("/api/repairs/submit", payload);
    console.log("✅ Submission successful:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ submitRepairRequest error:", error);

    if (error.response?.data?.details)
      error.message = error.response.data.details;
    else if (error.response?.data?.error)
      error.message = error.response.data.error;
    else if (error.message === "Network Error")
      error.message = "Network error. Please check your internet connection.";

    throw error;
  }
};

// ─── getAllRepairs ────────────────────────────────────────────────────────────
export const getAllRepairs = async () => {
  try {
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
  if (!isValidType)
    error = "Invalid file type. Please upload images, videos, or audio files.";
  else if (!isValidSize)
    error = `File too large (max ${sizeLimit}). Current: ${(file.size / (1024 * 1024)).toFixed(2)}MB`;

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
