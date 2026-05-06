import { sql } from '../lib/db.mjs';
import { requireAuth, logAudit, CAN_WRITE } from '../lib/auth.mjs';

export default async function handler(req, res) {
  const id = req.query.id;
  const member_id = req.query.member_id;
  const days = parseInt(req.query.days || '30', 10);

  if (req.method === 'GET') {
    const u = await requireAuth(req, res);
    if (!u) return;
    if (member_id) {
      if (u.role === 'member' && u.member_id !== member_id) return res.status(403).json({ error: 'sem permissão' });
      const rows = await sql`
        SELECT * FROM daily_checkins
        WHERE member_id = ${member_id} AND date >= CURRENT_DATE - ${days}::int
        ORDER BY date DESC
      `;
      return res.status(200).json({ checkins: rows });
    }
    // todos os checkins recentes (para dashboard geral)
    const rows = await sql`
      SELECT * FROM daily_checkins
      WHERE date >= CURRENT_DATE - ${days}::int
      ORDER BY date DESC, member_id
    `;
    return res.status(200).json({ checkins: rows });
  }

  if (req.method === 'POST') {
    const u = await requireAuth(req, res, CAN_WRITE);
    if (!u) return;
    const c = req.body || {};
    if (!c.member_id || !c.mood || !c.energy || !c.workload) return res.status(400).json({ error: 'campos obrigatórios' });
    const date = c.date || new Date().toISOString().slice(0,10);
    await sql`
      INSERT INTO daily_checkins (member_id, date, mood, energy, workload, focus, blockers, highlights, notes, created_by)
      VALUES (${c.member_id}, ${date}, ${c.mood}, ${c.energy}, ${c.workload}, ${c.focus||null},
              ${c.blockers||null}, ${c.highlights||null}, ${c.notes||null}, ${u.id})
      ON CONFLICT (member_id, date) DO UPDATE SET
        mood = EXCLUDED.mood,
        energy = EXCLUDED.energy,
        workload = EXCLUDED.workload,
        focus = EXCLUDED.focus,
        blockers = EXCLUDED.blockers,
        highlights = EXCLUDED.highlights,
        notes = EXCLUDED.notes,
        created_by = EXCLUDED.created_by
    `;
    await logAudit(u.id, 'checkin', `member:${c.member_id}`, { date, mood: c.mood });
    return res.status(201).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const u = await requireAuth(req, res, CAN_WRITE);
    if (!u) return;
    if (!id) return res.status(400).json({ error: 'id ausente' });
    await sql`DELETE FROM daily_checkins WHERE id = ${id}`;
    await logAudit(u.id, 'delete', `checkin:${id}`, null);
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: 'method' });
}
