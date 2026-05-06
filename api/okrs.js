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
      const rows = await sql`SELECT * FROM okrs WHERE member_id = ${member_id} ORDER BY quarter DESC, created_at DESC`;
      return res.status(200).json({ okrs: rows });
    }
    const rows = await sql`SELECT * FROM okrs ORDER BY quarter DESC, created_at DESC`;
    return res.status(200).json({ okrs: rows });
  }
  if (req.method === 'POST') {
    const u = await requireAuth(req, res, CAN_WRITE);
    if (!u) return;
    const o = req.body || {};
    if (!o.id || !o.member_id || !o.objective || !o.quarter) return res.status(400).json({ error: 'campos ausentes' });
    await sql`
      INSERT INTO okrs (id, member_id, quarter, objective, key_results, progress, status)
      VALUES (${o.id}, ${o.member_id}, ${o.quarter}, ${o.objective},
              ${JSON.stringify(o.key_results || [])}, ${o.progress || 0}, ${o.status || 'em_andamento'})
    `;
    await logAudit(u.id, 'create', `okr:${o.id}`, { member_id: o.member_id });
    return res.status(201).json({ ok: true });
  }
  if (req.method === 'PUT') {
    const u = await requireAuth(req, res, CAN_WRITE);
    if (!u) return;
    if (!id) return res.status(400).json({ error: 'id ausente' });
    const o = req.body || {};
    await sql`
      UPDATE okrs SET
        objective = COALESCE(${o.objective}, objective),
        quarter = COALESCE(${o.quarter}, quarter),
        key_results = COALESCE(${o.key_results ? JSON.stringify(o.key_results) : null}::jsonb, key_results),
        progress = COALESCE(${o.progress}, progress),
        status = COALESCE(${o.status}, status),
        updated_at = NOW()
      WHERE id = ${id}
    `;
    await logAudit(u.id, 'update', `okr:${id}`, null);
    return res.status(200).json({ ok: true });
  }
  if (req.method === 'DELETE') {
    const u = await requireAuth(req, res, CAN_WRITE);
    if (!u) return;
    if (!id) return res.status(400).json({ error: 'id ausente' });
    await sql`DELETE FROM okrs WHERE id = ${id}`;
    await logAudit(u.id, 'delete', `okr:${id}`, null);
    return res.status(200).json({ ok: true });
  }
  res.status(405).json({ error: 'method' });
}
