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

export interface LoginResponse {
  status: number;
  message: string;
  data: {
    user?: User;
    tokens?: AuthTokens;
    requires_2fa?: boolean;
    [key: string]: any;
  };
}
