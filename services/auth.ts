import api from "./api";
import { LoginResponse } from "@/types/auth";

export interface RegisterResponse {
  status: number;
  message: string;
  data: any;
}

export const login = async (email: string, password: string): Promise<LoginResponse> => {
  const response = await api.post("/api/accounts/v2/login/", { email, password });
  return response.data;
};

export const register = async (
  email: string,
  password: string,
  confirm_password: string,
  terms_accepted: boolean
): Promise<RegisterResponse> => {
  const response = await api.post("/api/accounts/v2/register/", {
    email,
    password,
    confirm_password,
    terms_accepted,
  });
  return response.data;
};

export const verify2FA = async ({
  uidb64,
  mfa_token,
  otp,
}: {
  uidb64: string;
  mfa_token: string;
  otp: string;
}): Promise<LoginResponse> => {
  const response = await api.post("/api/accounts/2fa/login/", {
    uidb64,
    mfa_token,
    otp,
  });
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
