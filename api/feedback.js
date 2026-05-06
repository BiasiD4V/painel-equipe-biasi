// Sessões de feedback quinzenal (fichas)
import { sql } from '../lib/db.mjs';
import { requireAuth, logAudit } from '../lib/auth.mjs';

const CAN_WRITE = ['admin','gestor'];

export default async function handler(req, res) {
  const id = req.query.id;
  const member_id = req.query.member_id;

  if (req.method === 'GET') {
    const u = await requireAuth(req, res);
    if (!u) return;
    if (member_id) {
      // member só vê os próprios
      if (u.role === 'member' && u.member_id !== member_id) return res.status(403).json({ error: 'sem permissão' });
      const rows = await sql`SELECT * FROM feedback_sessions
        WHERE member_id = ${member_id} ORDER BY scheduled_date DESC, created_at DESC`;
      return res.status(200).json({ sessions: rows });
    }
    const rows = await sql`SELECT * FROM feedback_sessions ORDER BY scheduled_date DESC LIMIT 200`;
    return res.status(200).json({ sessions: rows });
  }

  if (req.method === 'POST') {
    const u = await requireAuth(req, res);
    if (!u) return;
    if (!CAN_WRITE.includes(u.role)) return res.status(403).json({ error: 'sem permissão' });
    const f = req.body || {};
    if (!f.member_id || !f.scheduled_date) return res.status(400).json({ error: 'campos obrigatórios' });
    const r = await sql`
      INSERT INTO feedback_sessions (member_id, scheduled_date, status, last_topics, period_review, next_topics, member_mood, action_items, notes, created_by)
      VALUES (${f.member_id}, ${f.scheduled_date}, ${f.status||'pendente'},
              ${f.last_topics||null}, ${f.period_review||null}, ${f.next_topics||null},
              ${f.member_mood||null}, ${JSON.stringify(f.action_items||[])}, ${f.notes||null}, ${u.id})
      RETURNING id
    `;
    await logAudit(u.id, 'create', `feedback:${r[0].id}`, { member_id: f.member_id });
    return res.status(201).json({ ok: true, id: r[0].id });
  }

  if (req.method === 'PUT') {
    const u = await requireAuth(req, res);
    if (!u) return;
    if (!CAN_WRITE.includes(u.role)) return res.status(403).json({ error: 'sem permissão' });
    if (!id) return res.status(400).json({ error: 'id ausente' });
    const f = req.body || {};
    await sql`
      UPDATE feedback_sessions SET
        scheduled_date = COALESCE(${f.scheduled_date}, scheduled_date),
        status = COALESCE(${f.status}, status),
        last_topics = COALESCE(${f.last_topics}, last_topics),
        period_review = COALESCE(${f.period_review}, period_review),
        next_topics = COALESCE(${f.next_topics}, next_topics),
        member_mood = COALESCE(${f.member_mood}, member_mood),
        action_items = COALESCE(${f.action_items?JSON.stringify(f.action_items):null}::jsonb, action_items),
        notes = COALESCE(${f.notes}, notes),
        updated_at = NOW()
      WHERE id = ${id}
    `;
    await logAudit(u.id, 'update', `feedback:${id}`, null);
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const u = await requireAuth(req, res);
    if (!u) return;
    if (!CAN_WRITE.includes(u.role)) return res.status(403).json({ error: 'sem permissão' });
    if (!id) return res.status(400).json({ error: 'id ausente' });
    await sql`DELETE FROM feedback_sessions WHERE id = ${id}`;
    await logAudit(u.id, 'delete', `feedback:${id}`, null);
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: 'method' });
}
