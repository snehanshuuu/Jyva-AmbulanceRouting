import { describe, it, expect } from 'vitest';
import { hashSecret, signSession, verifySession, decodeSessionPayload, SessionPayload } from '@/auth/session';

describe('Auth & Session Engine', () => {
  it('hashes secrets deterministically using SHA-256', () => {
    const hash1 = hashSecret('1234');
    const hash2 = hashSecret('1234');
    expect(hash1).toBe(hash2);
    expect(hash1).toBe('03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4');
  });

  it('signs and verifies valid ambulance session token', () => {
    const payload: SessionPayload = {
      role: 'AMBULANCE',
      identifier: 'AMB-014',
      ambulanceId: 'AMB-014',
      issuedAt: Date.now(),
    };

    const token = signSession(payload);
    expect(typeof token).toBe('string');
    expect(token).toContain('.');

    const verified = verifySession(token);
    expect(verified).not.toBeNull();
    expect(verified?.role).toBe('AMBULANCE');
    expect(verified?.ambulanceId).toBe('AMB-014');
  });

  it('signs and verifies valid hospital session token', () => {
    const payload: SessionPayload = {
      role: 'HOSPITAL',
      identifier: 'HOSP-SION',
      hospitalId: 'hosp-sion',
      issuedAt: Date.now(),
    };

    const token = signSession(payload);
    const verified = verifySession(token);
    expect(verified).not.toBeNull();
    expect(verified?.role).toBe('HOSPITAL');
    expect(verified?.hospitalId).toBe('hosp-sion');
  });

  it('rejects tampered token with invalid signature', () => {
    const payload: SessionPayload = {
      role: 'HOSPITAL',
      identifier: 'HOSP-SION',
      hospitalId: 'hosp-sion',
      issuedAt: Date.now(),
    };

    const token = signSession(payload);
    const tampered = token.slice(0, -4) + 'abcd';
    const result = verifySession(tampered);
    expect(result).toBeNull();
  });

  it('decodes session payload safely in edge environment', () => {
    const payload: SessionPayload = {
      role: 'AMBULANCE',
      identifier: 'AMB-014',
      ambulanceId: 'AMB-014',
      issuedAt: Date.now(),
    };

    const token = signSession(payload);
    const decoded = decodeSessionPayload(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.identifier).toBe('AMB-014');
    expect(decoded?.role).toBe('AMBULANCE');
  });

  it('validates demo ambulance (1234) and demo hospital (demo123) against accounts.json', async () => {
    const accounts = (await import('@/data/accounts.json')).default;
    const ambAccount = accounts.find((a: { identifier: string }) => a.identifier === 'AMB-014');
    expect(ambAccount).toBeDefined();
    expect(ambAccount?.secretHash).toBe(hashSecret('1234'));

    const hospAccount = accounts.find((a: { identifier: string }) => a.identifier === 'HOSP-SION');
    expect(hospAccount).toBeDefined();
    expect(hospAccount?.secretHash).toBe(hashSecret('demo123'));
  });
});
