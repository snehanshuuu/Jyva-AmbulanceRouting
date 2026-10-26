import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/auth/session';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    path: '/',
    expires: new Date(0),
    maxAge: 0,
  });
  return response;
}
