import api from "./api";

export interface PasswordResetMessageResponse {
  message: string;
}

/**
 * Request a password reset email.
 * Backend silently returns 200 even if the email does not exist (anti-enumeration).
 */
export const requestPasswordResetEmail = async (
  email: string
): Promise<PasswordResetMessageResponse> => {
  const response = await api.post(
    "/api/accounts/v2/request-reset-password/",
    { email }
  );
  return response.data;
};

/**
 * Complete a password reset with uidb64 + token from the email link and the new password.
 */
export const resetPassword = async (
  uidb64: string,
  token: string,
  newPassword: string
): Promise<PasswordResetMessageResponse> => {
  const response = await api.patch(
    "/api/accounts/v2/reset-password-complete/",
    { uidb64, token, password: newPassword }
  );
  return response.data;
};
