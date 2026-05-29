import axios from "axios";

let API_URL = "http://localhost:5000/api";

if (window.location.protocol === "file:") {
  // Bản Desktop (Electron) kết nối tới server online đồng bộ
  API_URL = "https://damess.onrender.com/api";
} else if (import.meta.env && import.meta.env.DEV) {
  // Development mode
  API_URL = "http://localhost:5000/api";
} else {
  // Bản Web chạy ở đâu thì gọi API ở server đó
  API_URL = `${window.location.origin}/api`;
}

export const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export function getErrorMessage(error) {
  return error?.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại";
}
