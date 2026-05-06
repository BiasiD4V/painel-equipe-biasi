import { SignJWT, jwtVerify } from 'jose';
import { sql } from './db.mjs';

const SECRET = process.env.JWT_SECRET;
if (!SECRET) throw new Error('JWT_SECRET não configurado');
const KEY = new TextEncoder().encode(SECRET);
const COOKIE = 'biasi_session';

export async function signSession(user) {
  return await new SignJWT({ uid: user.id, role: user.role, name: user.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(KEY);
}

export async function verifyToken(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, KEY);
    return payload;
  } catch {
    return null;
  }
}

export function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(/;\s*/).forEach(p => {
    const idx = p.indexOf('=');
    if (idx > 0) out[p.slice(0, idx)] = decodeURIComponent(p.slice(idx + 1));
  });
  return out;
}

export function setSessionCookie(res, token) {
  const maxAge = 60 * 60 * 24 * 7;
  res.setHeader('Set-Cookie',
    `${COOKIE}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`
  );
}

export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`);
}

export async function getUser(req) {
  const cookies = parseCookies(req);
  const token = cookies[COOKIE];
  const payload = await verifyToken(token);
  if (!payload) return null;
  const rows = await sql`SELECT id, email, name, role, member_id, active FROM users WHERE id = ${payload.uid} LIMIT 1`;
  if (!rows.length || !rows[0].active) return null;
  return rows[0];
}

export async function requireAuth(req, res, roles = null) {
  const user = await getUser(req);
  if (!user) {
    res.status(401).json({ error: 'não autenticado' });
    return null;
  }
  if (roles && !roles.includes(user.role)) {
    res.status(403).json({ error: 'sem permissão' });
    return null;
  }
  return user;
}

export async function logAudit(userId, action, resource, details) {
  try {
    await sql`INSERT INTO audit_log (user_id, action, resource, details) VALUES (${userId}, ${action}, ${resource}, ${JSON.stringify(details || {})})`;
  } catch (e) {
    console.error('audit log error', e);
  }
}

export const ROLES = {
  ADMIN: 'admin',
  GESTOR: 'gestor',
  VIEWER: 'viewer',
  MEMBER: 'member',
};

export const CAN_WRITE = ['admin', 'gestor'];
export const CAN_ADMIN = ['admin'];
export const CAN_READ_ALL = ['admin', 'gestor', 'viewer'];
