import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000, // 30 s — prevents silent hangs
});

const PUBLIC_ENDPOINTS = ["/api/accounts/v2/login/", "/api/accounts/v2/register/", "/auth/jwt/refresh/"];

api.interceptors.request.use(
  (config) => {
    const isPublic = PUBLIC_ENDPOINTS.some((ep) => config.url?.includes(ep));
    if (!isPublic) {
      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error: any) => {
    const originalRequest = error.config;

    // Annotate network / timeout errors with a user-friendly message
    // so extractApiError can surface it without leaking technical details.
    if (!error.response) {
      if (error.code === "ECONNABORTED" || error.code === "ERR_CANCELED") {
        error.userMessage = "The request timed out. Please check your connection and try again.";
      } else {
        error.userMessage = "Unable to reach the server. Please check your internet connection.";
      }
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = typeof window !== "undefined" ? localStorage.getItem("refreshToken") : null;
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/auth/jwt/refresh/`, { refresh: refreshToken });
          if (response.status === 200) {
            const { access } = response.data;
            localStorage.setItem("accessToken", access);
            if (originalRequest.headers) originalRequest.headers.Authorization = `Bearer ${access}`;
            api.defaults.headers.common["Authorization"] = `Bearer ${access}`;
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        console.error("Token refresh failed", refreshError);
      }

      if (typeof window !== "undefined") {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
