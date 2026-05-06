// Cria todas as tabelas do schema. Idempotente.
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
  age INT,
  start_date DATE,
  birthday DATE,
  email TEXT,
  phone TEXT,
  temp1 TEXT,
  temp2 TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`;

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

await sql`CREATE INDEX IF NOT EXISTS idx_obs_member ON observations(member_id)`;
await sql`CREATE INDEX IF NOT EXISTS idx_hist_member ON history(member_id)`;
await sql`CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id)`;
await sql`CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC)`;
await sql`CREATE INDEX IF NOT EXISTS idx_okrs_member ON okrs(member_id)`;
await sql`CREATE INDEX IF NOT EXISTS idx_oo_member ON one_on_ones(member_id)`;
await sql`CREATE INDEX IF NOT EXISTS idx_kpis_member ON kpis(member_id)`;

console.log('✓ schema criado');
