import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'crypto';
import bcrypt from 'bcryptjs';

const COOKIE_NAME = 'pilotagem_session';
const SECRET = process.env.SESSION_SECRET || 'troque-esta-chave-pilotagem-2026';

function sign(data) {
  return createHmac('sha256', SECRET).update(data).digest('base64url');
}

export function createSessionToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token) {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString());
  } catch {
    return null;
  }
}

export function getSession() {
  const token = cookies().get(COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

export const SESSION_COOKIE = COOKIE_NAME;
export const hashPassword = (pw) => bcrypt.hashSync(pw, 10);
export const checkPassword = (pw, hash) => bcrypt.compareSync(pw, hash);
