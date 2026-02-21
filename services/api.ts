import axios from "axios";

// Default to localhost:8000 if env var is not set, but prefer the env var.
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(
  (config) => {
    // We'll store the token in localStorage for simplicity in this MVP
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add a response interceptor to handle token refresh or errors
api.interceptors.response.use(
  (response) => response,
  async (error: any) => {
    const originalRequest = error.config;

    // Prevent infinite loops
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = typeof window !== "undefined" ? localStorage.getItem("refreshToken") : null;
        
        if (refreshToken) {
          // Verify we aren't already refreshing? For MVP just try once.
          const response = await axios.post(`${API_URL}/auth/jwt/refresh/`, {
            refresh: refreshToken
          });

          if (response.status === 200) {
            const { access } = response.data;
            localStorage.setItem("accessToken", access);
            
            // Update auth header for the original request
            if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${access}`;
            }
            api.defaults.headers.common['Authorization'] = `Bearer ${access}`;
            
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        console.error("Token refresh failed", refreshError);
        // Fall through to logout
      }

      // If refresh fails or no refresh token, logout
      if (typeof window !== "undefined") {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("user");
          // Optional: Redirect to login
          window.location.href = "/login"; 
      }
    }
    return Promise.reject(error);
  }
);

export default api;
