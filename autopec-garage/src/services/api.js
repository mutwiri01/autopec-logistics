import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://autopec-logistics-btwc.vercel.app/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const submitRepairRequest = (data) => api.post("/repairs/submit", data);
export const getAllRepairs = () => api.get("/repairs");
export const deleteRepair = (id) => api.delete(`/repairs/${id}`);
export const updateRepairStatus = (id, data) =>
  api.put(`/repairs/${id}/status`, data);
export const trackRepair = (registrationNumber) =>
  api.get(`/repairs/track/${registrationNumber}`);

export default api;
