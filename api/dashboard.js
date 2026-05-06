import { sql } from '../lib/db.mjs';
import { requireAuth } from '../lib/auth.mjs';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method' });
  const u = await requireAuth(req, res);
  if (!u) return;

  // Membro só vê o próprio dashboard
  const memberFilter = u.role === 'member' ? u.member_id : null;

  // checkins últimos 30 dias agregados por dia
  const checkinsTrend = memberFilter
    ? await sql`
        SELECT date, AVG(mood)::float AS mood, AVG(energy)::float AS energy,
               AVG(workload)::float AS workload, AVG(focus)::float AS focus, COUNT(*) AS count
        FROM daily_checkins
        WHERE date >= CURRENT_DATE - 30 AND member_id = ${memberFilter}
        GROUP BY date ORDER BY date`
    : await sql`
        SELECT date, AVG(mood)::float AS mood, AVG(energy)::float AS energy,
               AVG(workload)::float AS workload, AVG(focus)::float AS focus, COUNT(*) AS count
        FROM daily_checkins
        WHERE date >= CURRENT_DATE - 30
        GROUP BY date ORDER BY date`;

  // checkin médio por membro (últimos 7 dias)
  const perMember = memberFilter
    ? await sql`
        SELECT m.id, m.name, AVG(c.mood)::float AS mood, AVG(c.energy)::float AS energy,
               AVG(c.workload)::float AS workload, COUNT(c.id)::int AS checkins
        FROM members m LEFT JOIN daily_checkins c ON c.member_id = m.id AND c.date >= CURRENT_DATE - 7
        WHERE m.active = true AND m.id = ${memberFilter}
        GROUP BY m.id, m.name`
    : await sql`
        SELECT m.id, m.name, AVG(c.mood)::float AS mood, AVG(c.energy)::float AS energy,
               AVG(c.workload)::float AS workload, COUNT(c.id)::int AS checkins
        FROM members m LEFT JOIN daily_checkins c ON c.member_id = m.id AND c.date >= CURRENT_DATE - 7
        WHERE m.active = true
        GROUP BY m.id, m.name ORDER BY m.name`;

  // contadores gerais
  const totals = memberFilter
    ? await sql`
        SELECT
          (SELECT COUNT(*) FROM observations WHERE member_id = ${memberFilter} AND COALESCE(data->>'status','aberto') != 'resolvido') AS obs_open,
          (SELECT COUNT(*) FROM okrs WHERE member_id = ${memberFilter} AND status = 'em_andamento') AS okrs_active,
          (SELECT COUNT(*) FROM one_on_ones WHERE member_id = ${memberFilter} AND status = 'agendado') AS oo_scheduled,
          (SELECT COUNT(*) FROM kpis WHERE member_id = ${memberFilter}) AS kpis,
          (SELECT COUNT(*) FROM daily_checkins WHERE member_id = ${memberFilter}) AS checkins`
    : await sql`
        SELECT
          (SELECT COUNT(*) FROM members WHERE active = true) AS members,
          (SELECT COUNT(*) FROM observations WHERE COALESCE(data->>'status','aberto') != 'resolvido') AS obs_open,
          (SELECT COUNT(*) FROM okrs WHERE status = 'em_andamento') AS okrs_active,
          (SELECT COUNT(*) FROM one_on_ones WHERE status = 'agendado' AND scheduled_at >= NOW()) AS oo_scheduled,
          (SELECT COUNT(*) FROM daily_checkins WHERE date = CURRENT_DATE) AS checkins_today`;

  // KPIs comerciais agregados (últimos 3 meses)
  const kpiAgg = memberFilter
    ? await sql`
        SELECT metric, period, SUM(value)::float AS value, AVG(value)::float AS avg_value
        FROM kpis WHERE member_id = ${memberFilter}
        GROUP BY metric, period ORDER BY period DESC LIMIT 24`
    : await sql`
        SELECT metric, period, SUM(value)::float AS value
        FROM kpis GROUP BY metric, period ORDER BY period DESC LIMIT 24`;

  res.status(200).json({
    trend: checkinsTrend,
    perMember,
    totals: totals[0] || {},
    kpis: kpiAgg
  });
}
