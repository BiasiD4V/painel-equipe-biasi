import { sql } from '../lib/db.mjs';
import { requireAuth, logAudit, CAN_WRITE } from '../lib/auth.mjs';

export default async function handler(req, res) {
  const id = req.query.id;
  const member_id = req.query.member_id;

  if (req.method === 'GET') {
    const u = await requireAuth(req, res);
    if (!u) return;
    if (member_id) {
      if (u.role === 'member' && u.member_id !== member_id) return res.status(403).json({ error: 'sem permissão' });
      const rows = await sql`SELECT * FROM observations WHERE member_id = ${member_id} ORDER BY created_at DESC`;
      return res.status(200).json({ observations: rows });
    }
    const rows = await sql`SELECT * FROM observations ORDER BY created_at DESC LIMIT 200`;
    return res.status(200).json({ observations: rows });
  }
  if (req.method === 'POST') {
    const u = await requireAuth(req, res, CAN_WRITE);
    if (!u) return;
    const o = req.body || {};
    if (!o.id || !o.member_id) return res.status(400).json({ error: 'id e member_id obrigatórios' });
    await sql`
      INSERT INTO observations (id, member_id, data, created_by)
      VALUES (${o.id}, ${o.member_id}, ${JSON.stringify(o.data || {})}, ${u.id})
    `;
    await logAudit(u.id, 'create', `observation:${o.id}`, { member_id: o.member_id });
    return res.status(201).json({ ok: true });
  }
  if (req.method === 'PUT') {
    const u = await requireAuth(req, res, CAN_WRITE);
    if (!u) return;
    if (!id) return res.status(400).json({ error: 'id ausente' });
    const o = req.body || {};
    await sql`UPDATE observations SET data = ${JSON.stringify(o.data || {})}, updated_at = NOW() WHERE id = ${id}`;
    await logAudit(u.id, 'update', `observation:${id}`, null);
    return res.status(200).json({ ok: true });
  }
  if (req.method === 'DELETE') {
    const u = await requireAuth(req, res, CAN_WRITE);
    if (!u) return;
    if (!id) return res.status(400).json({ error: 'id ausente' });
    await sql`DELETE FROM observations WHERE id = ${id}`;
    await logAudit(u.id, 'delete', `observation:${id}`, null);
    return res.status(200).json({ ok: true });
  }
  res.status(405).json({ error: 'method' });
}
