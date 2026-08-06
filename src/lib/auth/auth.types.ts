export type AuthUser = {
  id: string;
  email: string;
  name: string;
  picture: string | undefined;
  provider: "credentials" | "google";
};

export type AuthSession = {
  user: AuthUser;
  accessToken: string;
};

export type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
};

export type AuthError =
  | "invalid_credentials"
  | "email_taken"
  | "invalid_token"
  | "expired_token"
  | "weak_password"
  | "rate_limit";
