// ?type=self (member self check-in) | gestor (gestor's perception)
import { sql } from '../lib/db.mjs';
import { requireAuth, logAudit } from '../lib/auth.mjs';
const CAN_WRITE = ['admin','gestor'];

export default async function handler(req, res) {
  const id = req.query.id;
  const member_id = req.query.member_id;
  const days = parseInt(req.query.days || '30', 10);
  const type = req.query.type || 'self';

  if (req.method === 'GET') {
    const u = await requireAuth(req, res);
    if (!u) return;

    if (type === 'gestor') {
      // só admin/gestor leem gestor_checkins
      if (!['admin','gestor'].includes(u.role)) return res.status(403).json({ error: 'sem permissão' });
      if (member_id) {
        const rows = await sql`SELECT * FROM gestor_checkins
          WHERE member_id = ${member_id} AND date >= CURRENT_DATE - ${days}::int
          ORDER BY date DESC, created_at DESC`;
        return res.status(200).json({ checkins: rows });
      }
      const rows = await sql`SELECT * FROM gestor_checkins
        WHERE date >= CURRENT_DATE - ${days}::int ORDER BY date DESC`;
      return res.status(200).json({ checkins: rows });
    }

    // type = self
    if (member_id) {
      // member só vê o próprio
      if (u.role === 'member' && u.member_id !== member_id) return res.status(403).json({ error: 'sem permissão' });
      const rows = await sql`SELECT * FROM daily_checkins
        WHERE member_id = ${member_id} AND date >= CURRENT_DATE - ${days}::int
        ORDER BY date DESC`;
      return res.status(200).json({ checkins: rows });
    }
    const rows = await sql`SELECT * FROM daily_checkins
      WHERE date >= CURRENT_DATE - ${days}::int
      ORDER BY date DESC, member_id`;
    return res.status(200).json({ checkins: rows });
  }

  if (req.method === 'POST') {
    const u = await requireAuth(req, res);
    if (!u) return;
    const c = req.body || {};

    if (type === 'gestor') {
      if (!['admin','gestor'].includes(u.role)) return res.status(403).json({ error: 'sem permissão' });
      if (!c.member_id) return res.status(400).json({ error: 'member_id obrigatório' });
      const date = c.date || new Date().toISOString().slice(0,10);
      await sql`
        INSERT INTO gestor_checkins (member_id, date, perceived_mood, perceived_energy, perceived_workload,
          perceived_engagement, perceived_performance, concerns, wins, notes, created_by)
        VALUES (${c.member_id}, ${date}, ${c.perceived_mood||null}, ${c.perceived_energy||null},
                ${c.perceived_workload||null}, ${c.perceived_engagement||null}, ${c.perceived_performance||null},
                ${c.concerns||null}, ${c.wins||null}, ${c.notes||null}, ${u.id})
        ON CONFLICT (member_id, date, created_by) DO UPDATE SET
          perceived_mood = EXCLUDED.perceived_mood,
          perceived_energy = EXCLUDED.perceived_energy,
          perceived_workload = EXCLUDED.perceived_workload,
          perceived_engagement = EXCLUDED.perceived_engagement,
          perceived_performance = EXCLUDED.perceived_performance,
          concerns = EXCLUDED.concerns,
          wins = EXCLUDED.wins,
          notes = EXCLUDED.notes
      `;
      await logAudit(u.id, 'gestor_checkin', `member:${c.member_id}`, { date });
      return res.status(201).json({ ok: true });
    }

    // self check-in
    // member só registra pra si
    if (u.role === 'member' && u.member_id !== c.member_id) return res.status(403).json({ error: 'sem permissão' });
    if (!CAN_WRITE.includes(u.role) && u.role !== 'member') return res.status(403).json({ error: 'sem permissão' });
    if (!c.member_id || !c.mood || !c.energy || !c.workload) return res.status(400).json({ error: 'campos obrigatórios' });

    const date = c.date || new Date().toISOString().slice(0,10);
    await sql`
      INSERT INTO daily_checkins (member_id, date, mood, energy, workload, focus, blockers, highlights, notes, created_by)
      VALUES (${c.member_id}, ${date}, ${c.mood}, ${c.energy}, ${c.workload}, ${c.focus||null},
              ${c.blockers||null}, ${c.highlights||null}, ${c.notes||null}, ${u.id})
      ON CONFLICT (member_id, date) DO UPDATE SET
        mood = EXCLUDED.mood, energy = EXCLUDED.energy, workload = EXCLUDED.workload,
        focus = EXCLUDED.focus, blockers = EXCLUDED.blockers, highlights = EXCLUDED.highlights,
        notes = EXCLUDED.notes, created_by = EXCLUDED.created_by
    `;
    await logAudit(u.id, 'checkin', `member:${c.member_id}`, { date, mood: c.mood });
    return res.status(201).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const u = await requireAuth(req, res, CAN_WRITE);
    if (!u) return;
    if (!id) return res.status(400).json({ error: 'id ausente' });
    if (type === 'gestor') {
      await sql`DELETE FROM gestor_checkins WHERE id = ${id}`;
    } else {
      await sql`DELETE FROM daily_checkins WHERE id = ${id}`;
    }
    await logAudit(u.id, 'delete', `checkin:${id}`, null);
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: 'method' });
}

