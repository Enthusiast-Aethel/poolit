import axios from "axios";
import { TOKEN_KEY } from "../config";

const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const url = err.config?.url || "";
    // An expired or invalid token sends the person back to the login page
    if (status === 401 && !url.includes("/auth/login")) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.assign("/login");
    }
    // A temporary password has to be replaced before anything else works
    if (status === 403 && err.response?.data?.code === "PASSWORD_CHANGE_REQUIRED" && window.location.pathname !== "/change-password") {
      window.location.assign("/change-password");
    }
    return Promise.reject(err);
  }
);

export default api;
