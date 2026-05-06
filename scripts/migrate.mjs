// Schema completo. Idempotente.
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) throw new Error('DATABASE_URL ausente');
const sql = neon(url);

console.log('→ criando schema...');

await sql`CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT,
  birthday DATE,
  start_date DATE,
  email TEXT,
  phone TEXT,
  education TEXT,
  temp1 TEXT,
  temp2 TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`;

// Compatibilidade com schema antigo
await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS education TEXT`;
await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS birthday DATE`;
// Remove age column se ainda existir
try { await sql`ALTER TABLE members DROP COLUMN IF EXISTS age`; } catch(e) {}

await sql`CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','gestor','viewer','member')),
  member_id TEXT REFERENCES members(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`;

await sql`CREATE TABLE IF NOT EXISTS observations (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`;

await sql`CREATE TABLE IF NOT EXISTS history (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`;

await sql`CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`;

await sql`CREATE TABLE IF NOT EXISTS okrs (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  quarter TEXT NOT NULL,
  objective TEXT NOT NULL,
  key_results JSONB NOT NULL DEFAULT '[]'::jsonb,
  progress INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'em_andamento',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`;

await sql`CREATE TABLE IF NOT EXISTS one_on_ones (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  agenda JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  action_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'agendado',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`;

await sql`CREATE TABLE IF NOT EXISTS kpis (
  id SERIAL PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  metric TEXT NOT NULL,
  period TEXT NOT NULL,
  value NUMERIC NOT NULL,
  target NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (member_id, metric, period)
)`;

// NOVA: check-in diário (ao longo do tempo, gera gráficos)
await sql`CREATE TABLE IF NOT EXISTS daily_checkins (
  id SERIAL PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  mood SMALLINT NOT NULL CHECK (mood BETWEEN 1 AND 5),
  energy SMALLINT NOT NULL CHECK (energy BETWEEN 1 AND 5),
  workload SMALLINT NOT NULL CHECK (workload BETWEEN 1 AND 5),
  focus SMALLINT CHECK (focus BETWEEN 1 AND 5),
  blockers TEXT,
  highlights TEXT,
  notes TEXT,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (member_id, date)
)`;

// NOVA: alertas / notificações pendentes
await sql`CREATE TABLE IF NOT EXISTS alerts (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  member_id TEXT REFERENCES members(id) ON DELETE CASCADE,
  trigger_date DATE NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_by INT REFERENCES users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`;

await sql`CREATE INDEX IF NOT EXISTS idx_obs_member ON observations(member_id)`;
await sql`CREATE INDEX IF NOT EXISTS idx_hist_member ON history(member_id)`;
await sql`CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id)`;
await sql`CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC)`;
await sql`CREATE INDEX IF NOT EXISTS idx_okrs_member ON okrs(member_id)`;
await sql`CREATE INDEX IF NOT EXISTS idx_oo_member ON one_on_ones(member_id)`;
await sql`CREATE INDEX IF NOT EXISTS idx_kpis_member ON kpis(member_id)`;
await sql`CREATE INDEX IF NOT EXISTS idx_checkin_member_date ON daily_checkins(member_id, date DESC)`;
await sql`CREATE INDEX IF NOT EXISTS idx_alerts_trigger ON alerts(trigger_date, acknowledged)`;

// NOVA: check-in do gestor (percepção dele sobre o colaborador)
await sql`CREATE TABLE IF NOT EXISTS gestor_checkins (
  id SERIAL PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  perceived_mood SMALLINT CHECK (perceived_mood BETWEEN 1 AND 5),
  perceived_energy SMALLINT CHECK (perceived_energy BETWEEN 1 AND 5),
  perceived_workload SMALLINT CHECK (perceived_workload BETWEEN 1 AND 5),
  perceived_engagement SMALLINT CHECK (perceived_engagement BETWEEN 1 AND 5),
  perceived_performance SMALLINT CHECK (perceived_performance BETWEEN 1 AND 5),
  concerns TEXT,
  wins TEXT,
  notes TEXT,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (member_id, date, created_by)
)`;
await sql`CREATE INDEX IF NOT EXISTS idx_gck_member_date ON gestor_checkins(member_id, date DESC)`;

// NOVA: sessões de feedback quinzenais (fichas)
await sql`CREATE TABLE IF NOT EXISTS feedback_sessions (
  id SERIAL PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','realizado','cancelado')),
  last_topics TEXT,
  period_review TEXT,
  next_topics TEXT,
  member_mood SMALLINT,
  action_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`;
await sql`CREATE INDEX IF NOT EXISTS idx_fb_member_date ON feedback_sessions(member_id, scheduled_date DESC)`;

// NOVA: configurações globais (permissões por role)
await sql`CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by INT REFERENCES users(id) ON DELETE SET NULL
)`;

console.log('✓ schema criado');
