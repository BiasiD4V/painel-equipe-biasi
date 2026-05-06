// Endpoint consolidado: ?action=alerts|audit|dashboard
import { sql } from '../lib/db.mjs';
import { requireAuth, CAN_ADMIN } from '../lib/auth.mjs';

export default async function handler(req, res) {
  const action = req.query.action;
  const u = await requireAuth(req, res);
  if (!u) return;

  // Permissões: GET aberto pra todos lerem, PUT só admin
  if (action === 'permissions') {
    if (req.method === 'GET') {
      const rows = await sql`SELECT value FROM settings WHERE key = 'permissions' LIMIT 1`;
      return res.status(200).json({ permissions: rows[0]?.value || null });
    }
    if (req.method === 'PUT') {
      if (!CAN_ADMIN.includes(u.role)) return res.status(403).json({ error: 'só admin' });
      const value = req.body || {};
      await sql`
        INSERT INTO settings (key, value, updated_by, updated_at)
        VALUES ('permissions', ${JSON.stringify(value)}, ${u.id}, NOW())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = ${u.id}, updated_at = NOW()
      `;
      return res.status(200).json({ ok: true });
    }
  }

  if (req.method !== 'GET') return res.status(405).json({ error: 'method' });

  if (action === 'alerts') {
    const today = new Date(); today.setHours(0,0,0,0);
    const yyyy = today.getFullYear();
    const inDays = (d) => Math.round((d - today) / 86400000);
    let members = await sql`SELECT id, name, role, birthday, start_date FROM members WHERE active = true`;
    if (u.role === 'member') members = members.filter(m => m.id === u.member_id);
    const alerts = [];
    for (const m of members) {
      if (m.birthday) {
        const b = new Date(m.birthday);
        let next = new Date(yyyy, b.getMonth(), b.getDate());
        if (next < today) next = new Date(yyyy + 1, b.getMonth(), b.getDate());
        const days = inDays(next);
        if (days <= 7) alerts.push({
          type: 'birthday', urgency: days <= 1 ? 'high' : days <= 3 ? 'medium' : 'low',
          when: days, date: next.toISOString().slice(0,10),
          member_id: m.id, member_name: m.name,
          title: days === 0 ? `Hoje é aniversário de ${m.name}!`
                : days === 1 ? `Amanhã é aniversário de ${m.name}`
                : `Em ${days} dias: aniversário de ${m.name}`,
          icon: '🎂'
        });
      }
      if (m.start_date) {
        const s = new Date(m.start_date);
        let next = new Date(yyyy, s.getMonth(), s.getDate());
        if (next < today) next = new Date(yyyy + 1, s.getMonth(), s.getDate());
        const years = next.getFullYear() - s.getFullYear();
        const days = inDays(next);
        if (days <= 7 && years >= 1) alerts.push({
          type: 'work_anniversary', urgency: days <= 1 ? 'high' : days <= 3 ? 'medium' : 'low',
          when: days, date: next.toISOString().slice(0,10),
          member_id: m.id, member_name: m.name, years,
          title: days === 0 ? `Hoje ${m.name} completa ${years} ano${years>1?'s':''} de casa!`
                : days === 1 ? `Amanhã ${m.name} completa ${years} ano${years>1?'s':''} de casa`
                : `Em ${days} dias: ${m.name} completa ${years} ano${years>1?'s':''} de casa`,
          icon: '🎉'
        });
      }
    }
    alerts.sort((a, b) => a.when - b.when);
    return res.status(200).json({ alerts });
  }

  if (action === 'audit') {
    if (!CAN_ADMIN.includes(u.role)) return res.status(403).json({ error: 'sem permissão' });
    const limit = Math.min(parseInt(req.query.limit || '100', 10), 500);
    const rows = await sql`
      SELECT a.id, a.action, a.resource, a.details, a.created_at,
             us.name AS user_name, us.email AS user_email
      FROM audit_log a LEFT JOIN users us ON us.id = a.user_id
      ORDER BY a.created_at DESC LIMIT ${limit}
    `;
    return res.status(200).json({ logs: rows });
  }

  if (action === 'dashboard') {
    const memberFilter = u.role === 'member' ? u.member_id : null;
    const trend = memberFilter
      ? await sql`SELECT date, AVG(mood)::float AS mood, AVG(energy)::float AS energy,
            AVG(workload)::float AS workload, AVG(focus)::float AS focus, COUNT(*) AS count
          FROM daily_checkins WHERE date >= CURRENT_DATE - 30 AND member_id = ${memberFilter}
          GROUP BY date ORDER BY date`
      : await sql`SELECT date, AVG(mood)::float AS mood, AVG(energy)::float AS energy,
            AVG(workload)::float AS workload, AVG(focus)::float AS focus, COUNT(*) AS count
          FROM daily_checkins WHERE date >= CURRENT_DATE - 30
          GROUP BY date ORDER BY date`;
    const perMember = memberFilter
      ? await sql`SELECT m.id, m.name, AVG(c.mood)::float AS mood, AVG(c.energy)::float AS energy,
            AVG(c.workload)::float AS workload, COUNT(c.id)::int AS checkins
          FROM members m LEFT JOIN daily_checkins c ON c.member_id = m.id AND c.date >= CURRENT_DATE - 7
          WHERE m.active = true AND m.id = ${memberFilter} GROUP BY m.id, m.name`
      : await sql`SELECT m.id, m.name, AVG(c.mood)::float AS mood, AVG(c.energy)::float AS energy,
            AVG(c.workload)::float AS workload, COUNT(c.id)::int AS checkins
          FROM members m LEFT JOIN daily_checkins c ON c.member_id = m.id AND c.date >= CURRENT_DATE - 7
          WHERE m.active = true GROUP BY m.id, m.name ORDER BY m.name`;
    const totals = memberFilter
      ? await sql`SELECT
          (SELECT COUNT(*) FROM observations WHERE member_id = ${memberFilter} AND COALESCE(data->>'status','aberto') != 'resolvido') AS obs_open,
          (SELECT COUNT(*) FROM okrs WHERE member_id = ${memberFilter} AND status = 'em_andamento') AS okrs_active,
          (SELECT COUNT(*) FROM one_on_ones WHERE member_id = ${memberFilter} AND status = 'agendado') AS oo_scheduled,
          (SELECT COUNT(*) FROM kpis WHERE member_id = ${memberFilter}) AS kpis,
          (SELECT COUNT(*) FROM daily_checkins WHERE member_id = ${memberFilter}) AS checkins`
      : await sql`SELECT
          (SELECT COUNT(*) FROM members WHERE active = true) AS members,
          (SELECT COUNT(*) FROM observations WHERE COALESCE(data->>'status','aberto') != 'resolvido') AS obs_open,
          (SELECT COUNT(*) FROM okrs WHERE status = 'em_andamento') AS okrs_active,
          (SELECT COUNT(*) FROM one_on_ones WHERE status = 'agendado' AND scheduled_at >= NOW()) AS oo_scheduled,
          (SELECT COUNT(*) FROM daily_checkins WHERE date = CURRENT_DATE) AS checkins_today`;
    return res.status(200).json({ trend, perMember, totals: totals[0] || {}, kpis: [] });
  }

  res.status(400).json({ error: 'action inválida' });
}
