import { sql } from '../lib/db.mjs';
import { requireAuth, CAN_ADMIN } from '../lib/auth.mjs';

export default async function handler(req, res) {
  const u = await requireAuth(req, res, CAN_ADMIN);
  if (!u) return;
  const limit = Math.min(parseInt(req.query.limit || '100', 10), 500);
  const rows = await sql`
    SELECT a.id, a.action, a.resource, a.details, a.created_at,
           u.name AS user_name, u.email AS user_email
    FROM audit_log a LEFT JOIN users u ON u.id = a.user_id
    ORDER BY a.created_at DESC LIMIT ${limit}
  `;
  res.status(200).json({ logs: rows });
}
