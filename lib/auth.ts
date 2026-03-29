import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { getSQL } from './neon';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-me-in-production');
const COOKIE_NAME = 'session';
const TOKEN_EXPIRY = '7d';

export async function signIn(username: string, password: string): Promise<{ id: string; username: string } | null> {
  const sql = getSQL();
  const rows = await sql`SELECT id, username, password_hash FROM editors WHERE username = ${username}`;
  const user = rows[0];
  if (!user || !user.password_hash) return null;

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) return null;

  const token = await new SignJWT({ sub: user.id, username: user.username })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(JWT_SECRET);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 86400,
  });

  return { id: user.id, username: user.username };
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession(): Promise<{ userId: string; username: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return { userId: payload.sub as string, username: payload.username as string };
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hashSync(password, 12);
}
