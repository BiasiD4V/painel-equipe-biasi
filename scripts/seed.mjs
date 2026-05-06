// Insere o admin master, Ryan e a equipe inicial. Idempotente.
// Dados reais extraídos de "Sobre a Biasi" e MAPEAMENTO.
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const sql = neon(url);

// equipe comercial real
const TEAM = [
  {
    id: 'paulo', name: 'Paulo Confar', role: 'Gerente Comercial',
    start_date: '2021-03-08',
    education: 'Engenharia Civil — USF São Francisco · Técnico em Edificações — ETE Vasco Antônio Venchiarutti (Jundiaí)',
    temp1: 'colerico', temp2: 'melancolico',
    data: {
      activities: [
        'Liderança da equipe comercial',
        'Análise de demanda dos integrantes',
        'Fechamento de escopo, EAP e cotações',
        'Elaboração de proposta técnica e comercial',
        'Negociação com clientes e fornecedores',
        'Gestão de pipeline e curva ABC'
      ],
      strengths: ['Visão estratégica', 'Foco em resultado', 'Análise crítica', 'Decisão rápida'],
      attention: ['Equilibrar exigência com empatia', 'Delegar mais', 'Sair do operacional'],
      working_on: ['Construir cultura de feedback semanal', 'Aprofundar 1-on-1s', 'Manter o 80/20']
    }
  },
  {
    id: 'ryan', name: 'Ryan Stradioto', role: 'Assistente de Engenharia · Comercial',
    start_date: '2022-09-13',
    education: 'Engenharia Elétrica (cursando) — Anhembi Morumbi · Técnico em Administração — CEPROVI',
    temp1: 'fleumatico', temp2: 'colerico',
    data: {
      activities: [
        'Levantamento de quantitativos, materiais e mão de obra',
        'Leitura e interpretação de projetos e memoriais',
        'Identificação de inconsistências e itens faltantes',
        'Elaboração de planilha orçamentária e composição de custos',
        'Elaboração de proposta técnica e comercial',
        'Cotações com fornecedores e ranking A/B/C',
        'Cronograma físico e planejamento de execução'
      ],
      strengths: ['Equilíbrio sob pressão', 'Aprendizado contínuo', 'Análise técnica', 'Persistência'],
      attention: ['Iniciar conversas difíceis mais cedo', 'Sair da zona de conforto'],
      working_on: ['Aumentar volume de propostas', 'Negociação avançada', 'Apresentar em reuniões']
    }
  },
  {
    id: 'luan', name: 'Luan', role: 'Assistente de Engenharia · Comercial',
    start_date: '2026-03-30',
    education: 'Engenharia Elétrica (cursando) — Universidade Anchieta · Técnico em Automação Industrial — ETEC Bento Quirino',
    temp1: 'fleumatico',
    data: {
      activities: [
        'Análise de e-mail do cliente: escopo, prazos, anexos',
        'Criação da pasta da obra e organização de arquivos',
        'Conferência de projetos e identificação de disciplinas',
        'Levantamento de materiais com PlanSwift',
        'Envio de listas a fornecedores e cotação',
        'Ranking e classificação A/B/C dos fornecedores'
      ],
      strengths: ['Calma e estabilidade', 'Boa relação interpessoal', 'Trabalho em equipe', 'Organização'],
      attention: ['Iniciativa em situações novas', 'Clareza ao reportar'],
      working_on: ['Tomada de decisão rápida', 'Postura mais ativa em reuniões', 'Domínio do PlanSwift']
    }
  },
  {
    id: 'jennifer', name: 'Jennifer', role: 'Jovem Aprendiz · Comercial',
    start_date: '2025-03-26',
    education: 'Ensino Médio (cursando) · Técnico em Administração (cursando)',
    temp1: 'melancolico',
    data: {
      activities: [
        'Pegar projetos e documentos da obra',
        'Análise inicial com a SophIA (assistente de IA)',
        'Apoio em estruturação de propostas',
        'Organização de arquivos e pós-venda'
      ],
      strengths: ['Atenção a detalhes', 'Organização', 'Pensamento analítico', 'Disciplina'],
      attention: ['Soltar perfeccionismo em rascunhos', 'Confiar em primeiras versões', 'Falar mais'],
      working_on: ['Velocidade de entrega', 'Apresentações em público', 'Domínio dos assistentes de IA']
    }
  },
  {
    id: 'guilherme', name: 'Guilherme', role: 'Auxiliar de TI · Suporte ao Comercial',
    start_date: '2026-01-26',
    education: 'Ciência da Computação (cursando) — UNIP Jundiaí',
    temp1: 'colerico',
    data: {
      activities: [
        'Criar e evoluir o Hub interno de orçamentos',
        'Estruturar o banco de dados do Hub',
        'Integrar Supabase, planilhas e arquivos',
        'Automação da captura de informações de obras',
        'Views analíticas para consulta rápida',
        'Manter base de conhecimento atualizada'
      ],
      strengths: ['Resolução rápida', 'Iniciativa', 'Conhecimento técnico', 'Mentalidade de dono'],
      attention: ['Comunicação com não-técnicos', 'Paciência em demandas repetidas'],
      working_on: ['Documentar processos', 'Mentoria reversa com a equipe', 'Receber feedback do uso real']
    }
  }
];

console.log('→ inserindo equipe...');
for (const m of TEAM) {
  await sql`
    INSERT INTO members (id, name, role, start_date, education, temp1, temp2, data)
    VALUES (${m.id}, ${m.name}, ${m.role}, ${m.start_date}, ${m.education||null}, ${m.temp1}, ${m.temp2 || null}, ${JSON.stringify(m.data)})
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      role = EXCLUDED.role,
      start_date = EXCLUDED.start_date,
      education = EXCLUDED.education,
      temp1 = EXCLUDED.temp1,
      temp2 = EXCLUDED.temp2,
      data = EXCLUDED.data,
      updated_at = NOW()
  `;
}

// admin master Paulo
console.log('→ inserindo admin (Paulo)...');
const ADMIN_EMAIL = 'paulo@biasiengenharia.com.br';
const ADMIN_PASS = process.env.SEED_ADMIN_PASSWORD || 'BiasiAdmin2026!';
const adminHash = bcrypt.hashSync(ADMIN_PASS, 10);
await sql`
  INSERT INTO users (email, password_hash, name, role, member_id)
  VALUES (${ADMIN_EMAIL}, ${adminHash}, 'Paulo Confar', 'admin', 'paulo')
  ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    name = EXCLUDED.name,
    role = 'admin',
    member_id = 'paulo',
    active = true
`;

// Ryan como member (vê só o próprio card)
console.log('→ inserindo Ryan...');
const ryanHash = bcrypt.hashSync('1Onepiece_@', 10);
await sql`
  INSERT INTO users (email, password_hash, name, role, member_id)
  VALUES ('ryan.stradioto@biasiengenharia.com.br', ${ryanHash}, 'Ryan Stradioto', 'member', 'ryan')
  ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    name = EXCLUDED.name,
    role = 'member',
    member_id = 'ryan',
    active = true
`;

console.log(`✓ admin: ${ADMIN_EMAIL} / ${ADMIN_PASS}`);
console.log(`✓ ryan : ryan.stradioto@biasiengenharia.com.br / 1Onepiece_@`);
console.log('✓ seed concluído');
