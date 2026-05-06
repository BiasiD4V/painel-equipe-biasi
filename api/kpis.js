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
      const rows = await sql`SELECT * FROM kpis WHERE member_id = ${member_id} ORDER BY period DESC`;
      return res.status(200).json({ kpis: rows });
    }
    const rows = await sql`SELECT * FROM kpis ORDER BY period DESC LIMIT 500`;
    return res.status(200).json({ kpis: rows });
  }
  if (req.method === 'POST') {
    const u = await requireAuth(req, res, CAN_WRITE);
    if (!u) return;
    const k = req.body || {};
    if (!k.member_id || !k.metric || !k.period) return res.status(400).json({ error: 'campos ausentes' });
    await sql`
      INSERT INTO kpis (member_id, metric, period, value, target)
      VALUES (${k.member_id}, ${k.metric}, ${k.period}, ${k.value || 0}, ${k.target || null})
      ON CONFLICT (member_id, metric, period) DO UPDATE SET
        value = EXCLUDED.value,
        target = EXCLUDED.target
    `;
    await logAudit(u.id, 'upsert', `kpi:${k.metric}:${k.period}`, { member_id: k.member_id });
    return res.status(201).json({ ok: true });
  }
  if (req.method === 'DELETE') {
    const u = await requireAuth(req, res, CAN_WRITE);
    if (!u) return;
    if (!id) return res.status(400).json({ error: 'id ausente' });
    await sql`DELETE FROM kpis WHERE id = ${id}`;
    await logAudit(u.id, 'delete', `kpi:${id}`, null);
    return res.status(200).json({ ok: true });
  }
  res.status(405).json({ error: 'method' });
}
