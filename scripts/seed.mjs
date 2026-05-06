// Insere o admin master e a equipe inicial. Idempotente.
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const sql = neon(url);

const ADMIN_EMAIL = 'paulo@biasiengenharia.com.br';
const ADMIN_NAME = 'Paulo Confar';
const ADMIN_PASS = process.env.SEED_ADMIN_PASSWORD || 'BiasiAdmin2026!';

const TEAM = [
  {
    id: 'paulo', name: 'Paulo Confar', role: 'Gestor Comercial',
    age: 32, start_date: '2024-01-15', temp1: 'colerico', temp2: 'melancolico',
    data: {
      activities: ['Liderança da equipe comercial', 'Estratégia comercial', 'Gestão de pipeline'],
      strengths: ['Visão estratégica', 'Foco em resultado', 'Análise crítica'],
      attention: ['Equilibrar exigência com empatia', 'Delegar mais'],
      working_on: ['Construir cultura de feedback', 'Aprofundar 1-on-1s'],
    },
  },
  {
    id: 'guilherme', name: 'Guilherme', role: 'Auxiliar de TI · Suporte ao Comercial',
    age: 28, start_date: '2023-08-01', temp1: 'colerico',
    data: {
      activities: ['Suporte de TI', 'Automação de planilhas', 'Apoio CRM'],
      strengths: ['Resolução rápida', 'Iniciativa', 'Conhecimento técnico'],
      attention: ['Comunicação com não-técnicos', 'Paciência em demandas repetidas'],
      working_on: ['Documentar processos', 'Mentoria reversa com a equipe'],
    },
  },
  {
    id: 'ryan', name: 'Ryan', role: 'Comercial Interno',
    age: 24, start_date: '2024-03-10', temp1: 'fleumatico', temp2: 'colerico',
    data: {
      activities: ['Prospecção ativa', 'Qualificação de leads', 'Follow-up'],
      strengths: ['Equilíbrio sob pressão', 'Aprendizado contínuo', 'Persistência'],
      attention: ['Iniciar conversas difíceis mais cedo', 'Sair da zona de conforto'],
      working_on: ['Aumentar volume de ligações', 'Negociação avançada'],
    },
  },
  {
    id: 'luan', name: 'Luan', role: 'Comercial Interno',
    age: 26, start_date: '2024-05-20', temp1: 'fleumatico',
    data: {
      activities: ['Atendimento a leads', 'Envio de propostas', 'Cadastro CRM'],
      strengths: ['Calma e estabilidade', 'Boa relação interpessoal', 'Trabalho em equipe'],
      attention: ['Iniciativa em situações novas', 'Clareza ao reportar'],
      working_on: ['Tomada de decisão rápida', 'Postura mais ativa em reuniões'],
    },
  },
  {
    id: 'jennifer', name: 'Jennifer', role: 'Analista Comercial',
    age: 27, start_date: '2024-02-05', temp1: 'melancolico',
    data: {
      activities: ['Análise de mercado', 'Estruturação de propostas', 'Pós-venda'],
      strengths: ['Atenção a detalhes', 'Organização', 'Pensamento analítico'],
      attention: ['Soltar perfeccionismo em rascunhos', 'Confiar em primeiras versões'],
      working_on: ['Velocidade de entrega', 'Apresentações em público'],
    },
  },
];

console.log('→ inserindo equipe...');
for (const m of TEAM) {
  await sql`
    INSERT INTO members (id, name, role, age, start_date, temp1, temp2, data)
    VALUES (${m.id}, ${m.name}, ${m.role}, ${m.age}, ${m.start_date}, ${m.temp1}, ${m.temp2 || null}, ${JSON.stringify(m.data)})
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      role = EXCLUDED.role,
      age = EXCLUDED.age,
      start_date = EXCLUDED.start_date,
      temp1 = EXCLUDED.temp1,
      temp2 = EXCLUDED.temp2,
      updated_at = NOW()
  `;
}

console.log('→ inserindo admin...');
const hash = bcrypt.hashSync(ADMIN_PASS, 10);
await sql`
  INSERT INTO users (email, password_hash, name, role, member_id)
  VALUES (${ADMIN_EMAIL}, ${hash}, ${ADMIN_NAME}, 'admin', 'paulo')
  ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    name = EXCLUDED.name,
    role = 'admin',
    member_id = 'paulo',
    active = true
`;

console.log(`✓ admin: ${ADMIN_EMAIL} / ${ADMIN_PASS}`);
console.log('✓ seed concluído');
