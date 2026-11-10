import axios from "axios";
import { TOKEN_KEY } from "../config";

const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// An expired or invalid token sends the person back to the login page
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config.url.includes("/auth/login")) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.assign("/login");
    }
    return Promise.reject(err);
  }
);

export default api;