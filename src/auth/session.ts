import crypto from 'crypto';
import { SessionPayload, decodeSessionPayload } from './sessionTypes';

export * from './sessionTypes';

const SESSION_SECRET = process.env.JYVA_SESSION_SECRET || 'jyva-secret-emergency-key-2026';

export function hashSecret(secret: string): string {
  return crypto.createHash('sha256').update(secret.trim()).digest('hex');
}

export function signSession(payload: SessionPayload): string {
  const json = JSON.stringify(payload);
  const data = Buffer.from(json).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}

export function verifySession(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [data, signature] = parts;
  const expectedSignature = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');

  if (signature !== expectedSignature) {
    return null;
  }

  return decodeSessionPayload(token);
}
