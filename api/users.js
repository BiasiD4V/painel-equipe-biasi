import bcrypt from 'bcryptjs';
import { sql } from '../lib/db.mjs';
import { requireAuth, logAudit, CAN_ADMIN } from '../lib/auth.mjs';

export default async function handler(req, res) {
  const u = await requireAuth(req, res, CAN_ADMIN);
  if (!u) return;
  const id = req.query.id;

  if (req.method === 'GET') {
    const rows = await sql`SELECT id, email, name, role, member_id, active, last_login, created_at FROM users ORDER BY created_at`;
    return res.status(200).json({ users: rows });
  }
  if (req.method === 'POST') {
    const b = req.body || {};
    if (!b.email || !b.password || !b.name || !b.role) return res.status(400).json({ error: 'campos ausentes' });
    if (!['admin','gestor','viewer','member'].includes(b.role)) return res.status(400).json({ error: 'role inválida' });
    const hash = bcrypt.hashSync(b.password, 10);
    try {
      await sql`
        INSERT INTO users (email, password_hash, name, role, member_id)
        VALUES (${b.email.toLowerCase()}, ${hash}, ${b.name}, ${b.role}, ${b.member_id || null})
      `;
      await logAudit(u.id, 'create', `user:${b.email}`, { role: b.role });
      return res.status(201).json({ ok: true });
    } catch (e) {
      if (String(e).includes('duplicate')) return res.status(409).json({ error: 'email já cadastrado' });
      throw e;
    }
  }
  if (req.method === 'PUT') {
    if (!id) return res.status(400).json({ error: 'id ausente' });
    const b = req.body || {};
    if (b.password) {
      const hash = bcrypt.hashSync(b.password, 10);
      await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${id}`;
    }
    await sql`
      UPDATE users SET
        name = COALESCE(${b.name}, name),
        role = COALESCE(${b.role}, role),
        member_id = COALESCE(${b.member_id}, member_id),
        active = COALESCE(${b.active}, active)
      WHERE id = ${id}
    `;
    await logAudit(u.id, 'update', `user:${id}`, b);
    return res.status(200).json({ ok: true });
  }
  if (req.method === 'DELETE') {
    if (!id) return res.status(400).json({ error: 'id ausente' });
    if (Number(id) === u.id) return res.status(400).json({ error: 'não pode excluir a si mesmo' });
    await sql`UPDATE users SET active = false WHERE id = ${id}`;
    await logAudit(u.id, 'delete', `user:${id}`, null);
    return res.status(200).json({ ok: true });
  }
  res.status(405).json({ error: 'method' });
}
