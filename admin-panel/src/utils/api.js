// src/utils/api.js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "http://31.97.231.30//api",
  timeout: 15000,
});

api.interceptors.request.use((cfg) => {
  try {
    const token = localStorage.getItem("auth_token");
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
  } catch (e) {
    // ignore errors in token retrieval
  }

  // ✅ Set Content-Type only if not FormData
  if (cfg.data && cfg.data instanceof FormData) {
    // Let the browser/axios handle multipart boundary
    if (cfg.headers && cfg.headers["Content-Type"]) {
      delete cfg.headers["Content-Type"];
    }
  } else {
    cfg.headers["Content-Type"] = "application/json";
  }

  return cfg;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      try {
        localStorage.removeItem("auth_token");
      } catch (e) {}
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default api;

