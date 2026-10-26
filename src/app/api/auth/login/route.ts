import { NextRequest, NextResponse } from 'next/server';
import accountsData from '@/data/accounts.json';
import { hashSecret, signSession, SESSION_COOKIE_NAME, SessionPayload } from '@/auth/session';

interface AccountRecord {
  id: string;
  role: 'AMBULANCE' | 'HOSPITAL';
  identifier: string;
  plate?: string;
  secretHash: string;
  ambulanceId?: string;
  hospitalId?: string;
  label?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { role, identifier, secret } = body;

    if (!role || !identifier || !secret) {
      return NextResponse.json(
        { error: 'Role, identifier, and access secret/PIN are required' },
        { status: 400 }
      );
    }

    const cleanRole = String(role).toUpperCase();
    const cleanId = String(identifier).trim().toUpperCase();
    const incomingHash = hashSecret(secret);

    const accounts = accountsData as unknown as AccountRecord[];
    const account = accounts.find((acc) => {
      if (acc.role !== cleanRole) return false;
      const matchId =
        acc.identifier.toUpperCase() === cleanId ||
        (acc.plate && acc.plate.toUpperCase() === cleanId) ||
        (acc.ambulanceId && acc.ambulanceId.toUpperCase() === cleanId) ||
        (acc.hospitalId && acc.hospitalId.toUpperCase() === cleanId);
      return matchId && acc.secretHash === incomingHash;
    });

    if (!account) {
      const errorMsg =
        cleanRole === 'AMBULANCE'
          ? 'Invalid Ambulance ID / Plate or PIN'
          : 'Invalid Hospital ID or staff password';
      return NextResponse.json({ error: errorMsg }, { status: 401 });
    }

    const payload: SessionPayload = {
      role: account.role,
      identifier: account.identifier,
      ambulanceId: account.ambulanceId,
      hospitalId: account.hospitalId,
      label: account.label,
      issuedAt: Date.now(),
    };

    const token = signSession(payload);
    const redirectUrl = account.role === 'AMBULANCE' ? '/ambulance' : '/hospital';

    const response = NextResponse.json({
      success: true,
      role: account.role,
      redirectUrl,
      session: payload,
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60,
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Login failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
