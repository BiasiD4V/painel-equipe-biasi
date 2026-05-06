import { sql } from '../lib/db.mjs';
import { requireAuth, logAudit, CAN_WRITE } from '../lib/auth.mjs';

export default async function handler(req, res) {
  const id = req.query.id;
  if (req.method === 'GET') {
    const u = await requireAuth(req, res);
    if (!u) return;
    if (id) {
      if (u.role === 'member' && u.member_id !== id) return res.status(403).json({ error: 'sem permissão' });
      const rows = await sql`SELECT * FROM members WHERE id = ${id} AND active = true`;
      if (!rows.length) return res.status(404).json({ error: 'não encontrado' });
      return res.status(200).json({ member: rows[0] });
    }
    let rows;
    if (u.role === 'member') {
      rows = u.member_id ? await sql`SELECT * FROM members WHERE id = ${u.member_id} AND active = true` : [];
    } else {
      rows = await sql`SELECT * FROM members WHERE active = true ORDER BY name`;
    }
    return res.status(200).json({ members: rows });
  }
  if (req.method === 'POST') {
    const u = await requireAuth(req, res, CAN_WRITE);
    if (!u) return;
    const m = req.body || {};
    if (!m.id || !m.name) return res.status(400).json({ error: 'id e name obrigatórios' });
    await sql`
      INSERT INTO members (id, name, role, start_date, birthday, email, phone, education, temp1, temp2, data)
      VALUES (${m.id}, ${m.name}, ${m.role || null}, ${m.start_date || null}, ${m.birthday || null},
              ${m.email || null}, ${m.phone || null}, ${m.education || null},
              ${m.temp1 || null}, ${m.temp2 || null}, ${JSON.stringify(m.data || {})})
    `;
    await logAudit(u.id, 'create', `member:${m.id}`, { name: m.name });
    return res.status(201).json({ ok: true });
  }
  if (req.method === 'PUT') {
    // member pode editar só o próprio (campos limitados); admin/gestor editam tudo
    const u = await requireAuth(req, res);
    if (!u) return;
    if (!id) return res.status(400).json({ error: 'id ausente' });
    const isSelf = u.role === 'member' && u.member_id === id;
    const isWriter = ['admin','gestor'].includes(u.role);
    if (!isWriter && !isSelf) return res.status(403).json({ error: 'sem permissão' });
    let m = req.body || {};
    // membro só pode mexer no .data (manual, career, skills, etc) — não em nome/cargo/datas
    if (!isWriter) {
      m = { data: m.data };
    }
    await sql`
      UPDATE members SET
        name = COALESCE(${m.name}, name),
        role = COALESCE(${m.role}, role),
        start_date = COALESCE(${m.start_date}, start_date),
        birthday = COALESCE(${m.birthday}, birthday),
        email = COALESCE(${m.email}, email),
        phone = COALESCE(${m.phone}, phone),
        education = COALESCE(${m.education}, education),
        temp1 = COALESCE(${m.temp1}, temp1),
        temp2 = COALESCE(${m.temp2}, temp2),
        data = COALESCE(${m.data ? JSON.stringify(m.data) : null}::jsonb, data),
        updated_at = NOW()
      WHERE id = ${id}
    `;
    await logAudit(u.id, 'update', `member:${id}`, m);
    return res.status(200).json({ ok: true });
  }
  if (req.method === 'DELETE') {
    const u = await requireAuth(req, res, CAN_WRITE);
    if (!u) return;
    if (!id) return res.status(400).json({ error: 'id ausente' });
    await sql`UPDATE members SET active = false WHERE id = ${id}`;
    await logAudit(u.id, 'delete', `member:${id}`, null);
    return res.status(200).json({ ok: true });
  }
  res.status(405).json({ error: 'method' });
}
