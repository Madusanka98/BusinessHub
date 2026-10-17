export interface SessionPayload {
  userId: string;
  email: string;
  fullName: string;
  isSuperAdmin: boolean;
  activeBusinessId: string | null;
  iat?: number;
  exp?: number;
}

export interface AuthResult {
  success: boolean;
  user?: SessionPayload;
  error?: string;
}
