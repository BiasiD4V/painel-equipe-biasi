import bcrypt from 'bcryptjs';
import { sql } from '../../lib/db.mjs';
import { signSession, setSessionCookie, logAudit } from '../../lib/auth.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'credenciais ausentes' });

    const rows = await sql`SELECT id, email, name, role, password_hash, active FROM users WHERE LOWER(email) = LOWER(${email}) LIMIT 1`;
    if (!rows.length || !rows[0].active) {
      return res.status(401).json({ error: 'credenciais inválidas' });
    }
    const u = rows[0];
    const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok) return res.status(401).json({ error: 'credenciais inválidas' });

    const token = await signSession(u);
    setSessionCookie(res, token);
    await sql`UPDATE users SET last_login = NOW() WHERE id = ${u.id}`;
    await logAudit(u.id, 'login', 'auth', { email: u.email });
    return res.status(200).json({ user: { id: u.id, email: u.email, name: u.name, role: u.role } });
  } catch (e) {
    console.error('login error', e);
    return res.status(500).json({ error: 'erro interno' });
  }
}
