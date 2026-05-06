import { clearSessionCookie, getUser, logAudit } from '../../lib/auth.mjs';

export default async function handler(req, res) {
  const u = await getUser(req);
  clearSessionCookie(res);
  if (u) await logAudit(u.id, 'logout', 'auth', null);
  res.status(200).json({ ok: true });
}
