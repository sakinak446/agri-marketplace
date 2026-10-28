import { API_URL } from "../config/api";
import axios from "axios";

export const orderApi = axios.create({ baseURL: `${API_URL}/api` });
orderApi.interceptors.request.use((config) => {
  config.headers.Authorization = `Bearer ${localStorage.getItem("token") || ""}`;
  return config;
});
export const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);
export const orderError = (error) => error.response?.data?.message || "Unable to connect. Please try again.";
