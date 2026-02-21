import api from "./api";
import { LoginResponse } from "@/types/auth";

export const login = async (email: string, password: string): Promise<LoginResponse> => {
  const response = await api.post("/api/accounts/v2/login/", { email, password });
  return response.data;
};

export const logout = async () => {
  const refreshToken = localStorage.getItem("refreshToken");
  if (refreshToken) {
    try {
      await api.post("/api/accounts/v2/logout/", { refresh: refreshToken });
    } catch (error) {
      console.error("Logout failed", error);
    }
  }
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  window.location.href = "/login";
};
