import { getUser } from '../../lib/auth.mjs';

export default async function handler(req, res) {
  const u = await getUser(req);
  if (!u) return res.status(401).json({ error: 'não autenticado' });
  res.status(200).json({ user: { id: u.id, email: u.email, name: u.name, role: u.role, member_id: u.member_id } });
}
