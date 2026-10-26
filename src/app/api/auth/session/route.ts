import { NextRequest, NextResponse } from 'next/server';
import { verifySession, SESSION_COOKIE_NAME } from '@/auth/session';

export async function GET(req: NextRequest) {
  const cookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = verifySession(cookie);

  if (!session) {
    return NextResponse.json({ authenticated: false, session: null }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true, session });
}
