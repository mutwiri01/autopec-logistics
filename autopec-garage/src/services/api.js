/* eslint-disable no-unused-vars */
import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://autopec-logistics-btwc.vercel.app";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Submit repair request with multimedia support
export const submitRepairRequest = async (formData) => {
  try {
    // Create FormData object for file upload
    const data = new FormData();

    // Prepare repair data as JSON string
    const repairData = {
      registrationNumber: formData.registrationNumber,
      problemDescription: formData.problemDescription,
      customerName: formData.customerName || "",
      phoneNumber: formData.phoneNumber || "",
      carModel: formData.carModel || "",
    };

    // Append repair data as JSON string
    data.append("repairData", JSON.stringify(repairData));

    // Append multimedia files if they exist
    if (formData.multimedia && formData.multimedia.length > 0) {
      formData.multimedia.forEach((file) => {
        // Ensure file is a valid File object
        if (file instanceof File) {
          data.append("multimedia", file);
        }
      });
    }

    // Make the POST request with multipart/form-data
    const response = await axios.post(
      `${API_BASE_URL}/api/repairs/submit`,
      data,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    return response.data;
  } catch (error) {
    console.error("Error in submitRepairRequest:", error.response || error);
    throw error;
  }
};

// Get all repairs
export const getAllRepairs = async () => {
  try {
    const response = await api.get("/api/repairs");
    return response;
  } catch (error) {
    console.error("Error in getAllRepairs:", error.response || error);
    throw error;
  }
};

// Delete a repair
export const deleteRepair = async (id) => {
  try {
    const response = await api.delete(`/api/repairs/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error in deleteRepair:", error.response || error);
    throw error;
  }
};

// Update repair status
export const updateRepairStatus = async (id, data) => {
  try {
    const response = await api.put(`/api/repairs/${id}/status`, data);
    return response.data;
  } catch (error) {
    console.error("Error in updateRepairStatus:", error.response || error);
    throw error;
  }
};

// Track repair by registration number
export const trackRepair = async (registrationNumber) => {
  try {
    const response = await api.get(`/api/repairs/track/${registrationNumber}`);
    return response.data;
  } catch (error) {
    console.error("Error in trackRepair:", error.response || error);
    throw error;
  }
};

// Helper function to check if a file is valid for upload
export const isValidMediaFile = (file) => {
  const validTypes = ["image/", "video/", "audio/"];
  const maxSize = 50 * 1024 * 1024; // 50MB

  const isValidType = validTypes.some((type) => file.type.startsWith(type));
  const isValidSize = file.size <= maxSize;

  return {
    valid: isValidType && isValidSize,
    type: isValidType,
    size: isValidSize,
    error: !isValidType
      ? "Invalid file type"
      : !isValidSize
        ? "File too large (max 50MB)"
        : null,
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
