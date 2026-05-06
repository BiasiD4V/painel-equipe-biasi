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
      const rows = await sql`SELECT * FROM one_on_ones WHERE member_id = ${member_id} ORDER BY scheduled_at DESC`;
      return res.status(200).json({ one_on_ones: rows });
    }
    const rows = await sql`SELECT * FROM one_on_ones ORDER BY scheduled_at DESC LIMIT 200`;
    return res.status(200).json({ one_on_ones: rows });
  }
  if (req.method === 'POST') {
    const u = await requireAuth(req, res, CAN_WRITE);
    if (!u) return;
    const o = req.body || {};
    if (!o.id || !o.member_id || !o.scheduled_at) return res.status(400).json({ error: 'campos ausentes' });
    await sql`
      INSERT INTO one_on_ones (id, member_id, scheduled_at, agenda, notes, action_items, status)
      VALUES (${o.id}, ${o.member_id}, ${o.scheduled_at},
              ${JSON.stringify(o.agenda || [])}, ${o.notes || null},
              ${JSON.stringify(o.action_items || [])}, ${o.status || 'agendado'})
    `;
    await logAudit(u.id, 'create', `1on1:${o.id}`, { member_id: o.member_id });
    return res.status(201).json({ ok: true });
  }
  if (req.method === 'PUT') {
    const u = await requireAuth(req, res, CAN_WRITE);
    if (!u) return;
    if (!id) return res.status(400).json({ error: 'id ausente' });
    const o = req.body || {};
    await sql`
      UPDATE one_on_ones SET
        scheduled_at = COALESCE(${o.scheduled_at}, scheduled_at),
        agenda = COALESCE(${o.agenda ? JSON.stringify(o.agenda) : null}::jsonb, agenda),
        notes = COALESCE(${o.notes}, notes),
        action_items = COALESCE(${o.action_items ? JSON.stringify(o.action_items) : null}::jsonb, action_items),
        status = COALESCE(${o.status}, status),
        updated_at = NOW()
      WHERE id = ${id}
    `;
    await logAudit(u.id, 'update', `1on1:${id}`, null);
    return res.status(200).json({ ok: true });
  }
  if (req.method === 'DELETE') {
    const u = await requireAuth(req, res, CAN_WRITE);
    if (!u) return;
    if (!id) return res.status(400).json({ error: 'id ausente' });
    await sql`DELETE FROM one_on_ones WHERE id = ${id}`;
    await logAudit(u.id, 'delete', `1on1:${id}`, null);
    return res.status(200).json({ ok: true });
  }
  res.status(405).json({ error: 'method' });
}
