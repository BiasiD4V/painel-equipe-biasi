import { sql } from '../lib/db.mjs';
import { requireAuth } from '../lib/auth.mjs';

// Calcula alertas de aniversário (1 dia antes) e marco de tempo de casa
// (1 dia antes de completar X anos). Não persiste ainda; gera dinâmicamente.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method' });
  const u = await requireAuth(req, res);
  if (!u) return;

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
      if (days <= 7) {
        alerts.push({
          type: 'birthday',
          urgency: days <= 1 ? 'high' : days <= 3 ? 'medium' : 'low',
          when: days,
          date: next.toISOString().slice(0,10),
          member_id: m.id,
          member_name: m.name,
          title: days === 0 ? `Hoje é aniversário de ${m.name}!`
                  : days === 1 ? `Amanhã é aniversário de ${m.name}`
                  : `Em ${days} dias: aniversário de ${m.name}`,
          icon: '🎂'
        });
      }
    }
    if (m.start_date) {
      const s = new Date(m.start_date);
      let nextAnniv = new Date(yyyy, s.getMonth(), s.getDate());
      if (nextAnniv < today) nextAnniv = new Date(yyyy + 1, s.getMonth(), s.getDate());
      const years = nextAnniv.getFullYear() - s.getFullYear();
      const days = inDays(nextAnniv);
      if (days <= 7 && years >= 1) {
        alerts.push({
          type: 'work_anniversary',
          urgency: days <= 1 ? 'high' : days <= 3 ? 'medium' : 'low',
          when: days,
          date: nextAnniv.toISOString().slice(0,10),
          member_id: m.id,
          member_name: m.name,
          title: days === 0 ? `Hoje ${m.name} completa ${years} ano${years>1?'s':''} de casa!`
                  : days === 1 ? `Amanhã ${m.name} completa ${years} ano${years>1?'s':''} de casa`
                  : `Em ${days} dias: ${m.name} completa ${years} ano${years>1?'s':''} de casa`,
          icon: '🎉',
          years
        });
      }
    }
  }

  alerts.sort((a, b) => a.when - b.when);
  res.status(200).json({ alerts });
}
