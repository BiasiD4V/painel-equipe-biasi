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
      const rows = await sql`SELECT * FROM history WHERE member_id = ${member_id} ORDER BY created_at DESC`;
      return res.status(200).json({ history: rows });
    }
    return res.status(400).json({ error: 'member_id obrigatório' });
  }
  if (req.method === 'POST') {
    const u = await requireAuth(req, res, CAN_WRITE);
    if (!u) return;
    const h = req.body || {};
    if (!h.id || !h.member_id) return res.status(400).json({ error: 'id e member_id obrigatórios' });
    await sql`
      INSERT INTO history (id, member_id, data, created_by)
      VALUES (${h.id}, ${h.member_id}, ${JSON.stringify(h.data || {})}, ${u.id})
    `;
    await logAudit(u.id, 'create', `history:${h.id}`, { member_id: h.member_id });
    return res.status(201).json({ ok: true });
  }
  if (req.method === 'PUT') {
    const u = await requireAuth(req, res, CAN_WRITE);
    if (!u) return;
    if (!id) return res.status(400).json({ error: 'id ausente' });
    await sql`UPDATE history SET data = ${JSON.stringify(req.body?.data || {})} WHERE id = ${id}`;
    await logAudit(u.id, 'update', `history:${id}`, null);
    return res.status(200).json({ ok: true });
  }
  if (req.method === 'DELETE') {
    const u = await requireAuth(req, res, CAN_WRITE);
    if (!u) return;
    if (!id) return res.status(400).json({ error: 'id ausente' });
    await sql`DELETE FROM history WHERE id = ${id}`;
    await logAudit(u.id, 'delete', `history:${id}`, null);
    return res.status(200).json({ ok: true });
  }
  res.status(405).json({ error: 'method' });
}
