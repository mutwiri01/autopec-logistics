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

// ─── Helper: always extract a plain string from any error ────────────────────
// Prevents React from crashing when an error object is accidentally passed to
// setError() / setState(). Handles nested Cloudinary error shapes too.
const extractErrorMessage = (error) => {
  // Cloudinary returns { error: { message: "..." } }
  if (error?.response?.data?.error?.message) {
    return String(error.response.data.error.message);
  }
  // Our backend returns { details: "..." } or { error: "..." }
  if (
    error?.response?.data?.details &&
    typeof error.response.data.details === "string"
  ) {
    return error.response.data.details;
  }
  if (
    error?.response?.data?.error &&
    typeof error.response.data.error === "string"
  ) {
    return error.response.data.error;
  }
  // Axios error message
  if (typeof error?.message === "string") return error.message;
  // Last resort — stringify whatever we have
  try {
    return JSON.stringify(error);
  } catch {
    return "An unknown error occurred.";
  }
};

// ─── Axios instance (for calls to OUR backend only) ──────────────────────────
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
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
    if (!error.request) {
      // Request was never sent
      return Promise.reject(error);
    }
    if (!error.response) {
      error.message = "No response from server. Please check your connection.";
      return Promise.reject(error);
    }
    console.error(
      "Response error:",
      error.response.status,
      error.response.data,
    );
    // Always ensure .message is a plain string
    error.message = extractErrorMessage(error);
    return Promise.reject(error);
  },
);

// ─── uploadFileToCloudinary ───────────────────────────────────────────────────
// Gets a signature from our backend, then uploads the file directly from the
// browser to Cloudinary — zero bytes go through Vercel.
const uploadFileToCloudinary = async (file, onProgress) => {
  // Determine Cloudinary folder and resource_type from the file's mime type
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
    resource_type = "video"; // Cloudinary stores audio under the "video" type
  }

  // Step 1: fetch upload signature from our backend
  let signData;
  try {
    const signRes = await api.post("/api/sign-upload", {
      folder,
      resource_type,
    });
    signData = signRes.data;
  } catch (err) {
    throw new Error(`Could not get upload token: ${extractErrorMessage(err)}`);
  }

  const { signature, timestamp, api_key, cloud_name } = signData;

  // Guard: if env vars are missing on the server, cloud_name will be undefined
  if (!cloud_name || cloud_name === "undefined") {
    throw new Error(
      "Cloudinary is not configured on the server. " +
        "Please add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and " +
        "CLOUDINARY_API_SECRET to your Vercel environment variables.",
    );
  }

  // Step 2: build the FormData for Cloudinary's upload endpoint
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", api_key);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);
  formData.append("folder", folder);

  if (resource_type === "image") {
    formData.append("transformation", "c_limit,w_1200,h_1200,q_auto:eco");
  }

  // Step 3: upload directly — browser → Cloudinary, Vercel not involved
  let uploadRes;
  try {
    uploadRes = await axios.post(
      `https://api.cloudinary.com/v1_1/${cloud_name}/${resource_type}/upload`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000, // 2 min for large files on Cloudinary free tier
        onUploadProgress: (e) => {
          if (onProgress && e.total) {
            onProgress(Math.round((e.loaded * 100) / e.total));
          }
        },
      },
    );
  } catch (err) {
    // Cloudinary 401 = bad signature or wrong api_key / cloud_name
    if (err?.response?.status === 401) {
      throw new Error(
        "Cloudinary authentication failed (401). " +
          "Check that CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET are set " +
          "correctly in your Vercel environment variables.",
      );
    }
    // Any other Cloudinary error — always produce a plain string
    throw new Error(`File upload failed: ${extractErrorMessage(err)}`);
  }

  const isAudio = file.type.startsWith("audio/");
  const typeMap = { image: "image", video: "video" };

  return {
    type: isAudio ? "audio" : typeMap[resource_type] || "other",
    url: uploadRes.data.secure_url,
    publicId: uploadRes.data.public_id,
    filename: file.name,
  };
};

// ─── submitRepairRequest ──────────────────────────────────────────────────────
export const submitRepairRequest = async (formData, onProgress) => {
  try {
    console.log("📝 Starting submission...");

    const files = formData.multimedia || [];

    // Validate file count and sizes before doing anything
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
        `Combined size ${(totalSize / (1024 * 1024)).toFixed(2)}MB exceeds the ${MAX_TOTAL_SIZE / (1024 * 1024)}MB limit.`,
      );
    }

    if (sizeErrors.length > 0) throw new Error(sizeErrors.join(" "));

    // Upload each file directly to Cloudinary
    const multimedia = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`📤 Uploading ${i + 1}/${files.length}: ${file.name}`);

      const result = await uploadFileToCloudinary(file, (pct) => {
        if (onProgress) {
          const base = (i / files.length) * 100;
          const share = (1 / files.length) * pct;
          onProgress(Math.round(base + share));
        }
      });

      console.log(`✅ Uploaded: ${result.url}`);
      multimedia.push(result);
    }

    // Send only JSON to our backend — small and fast
    const payload = {
      registrationNumber: formData.registrationNumber,
      problemDescription: formData.problemDescription,
      customerName: formData.customerName || "",
      phoneNumber: formData.phoneNumber || "",
      carModel: formData.carModel || "",
      multimedia,
    };

    console.log("📡 Sending to backend...");
    const response = await api.post("/api/repairs/submit", payload);
    console.log("✅ Submission successful");
    return response.data;
  } catch (error) {
    // Always re-throw with a plain string message so React can render it safely
    const msg = extractErrorMessage(error);
    console.error("❌ submitRepairRequest error:", msg);
    const clean = new Error(msg);
    throw clean;
  }
};

// ─── getAllRepairs ────────────────────────────────────────────────────────────
export const getAllRepairs = async () => {
  try {
    const response = await api.get("/api/repairs");
    console.log(`✅ Found ${response.data.length} repairs`);
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
};

// ─── deleteRepair ─────────────────────────────────────────────────────────────
export const deleteRepair = async (id) => {
  try {
    const response = await api.delete(`/api/repairs/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
};

// ─── updateRepairStatus ───────────────────────────────────────────────────────
export const updateRepairStatus = async (id, data) => {
  try {
    const response = await api.put(`/api/repairs/${id}/status`, data);
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
};

// ─── trackRepair ──────────────────────────────────────────────────────────────
export const trackRepair = async (registrationNumber) => {
  try {
    const response = await api.get(
      `/api/repairs/track/${encodeURIComponent(registrationNumber)}`,
    );
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
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
