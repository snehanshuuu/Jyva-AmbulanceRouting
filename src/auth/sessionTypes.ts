export interface SessionPayload {
  role: 'AMBULANCE' | 'HOSPITAL';
  identifier: string;
  ambulanceId?: string;
  hospitalId?: string;
  label?: string;
  issuedAt: number;
}

export const SESSION_COOKIE_NAME = 'jyva_session';

export function decodeSessionPayload(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  try {
    const base64 = parts[0].replace(/-/g, '+').replace(/_/g, '/');
    const json = typeof Buffer !== 'undefined'
      ? Buffer.from(parts[0], 'base64url').toString('utf8')
      : atob(base64);
    const parsed = JSON.parse(json) as SessionPayload;
    // Session expires after 24 hours
    if (Date.now() - parsed.issuedAt > 24 * 60 * 60 * 1000) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
