export interface User {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  [key: string]: any;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export type MfaMethod = "authenticator" | "email";

export interface LoginResponse {
  status: number;
  message: string;
  data: {
    user?: User;
    tokens?: AuthTokens;
    requires_2fa?: boolean;
    method?: MfaMethod;
    user_id?: number;
    uidb64?: string;
    mfa_token?: string;
    [key: string]: any;
  };
}
