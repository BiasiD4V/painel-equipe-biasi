# Painel de Gestão de Equipe — Comercial Biasi

Aplicação web para gestão integral da equipe comercial da Biasi Engenharia.

## Stack

- **Frontend:** HTML + CSS + JS vanilla (mobile-first responsivo)
- **Backend:** Vercel Serverless Functions (Node.js)
- **Banco:** Neon Postgres (serverless)
- **Auth:** JWT em cookie httpOnly + bcrypt
- **Deploy:** Vercel

## Recursos

### Auth & Permissões
- Login com e-mail e senha
- 4 papéis: `admin`, `gestor`, `viewer`, `member`
- Admin gerencia usuários e vê auditoria completa
- Member vê apenas o próprio card (autoavaliação)

### Gestão de equipe
- Cards individuais com tempo de casa, perfil, prioridade da semana
- Drawer com 11 seções por pessoa
- Edição inline em todos os campos (`contenteditable`)
- Modelos: Temperamentos hipocráticos + Big Five (Soto, 2018) — [personality-project.org](https://personality-project.org/)

### Novas funcionalidades (v2)
- **KPIs comerciais:** vendas, propostas, ligações, leads, conversão, ticket médio
- **OKRs trimestrais** com objetivos, key results, progresso
- **1-on-1 tracker:** agenda, notas, action items
- **Calendário:** aniversários e datas de admissão
- **Auditoria:** quem fez o quê, quando (admin)
- **Roteiro de feedback de sexta-feira** com export PDF (print)
- **Mobile responsivo** com drawer fullscreen no celular

## Como rodar localmente

```bash
npm install
vercel dev
```

## Migrations & Seed

```bash
node --env-file=.env.local scripts/migrate.mjs
node --env-file=.env.local scripts/seed.mjs
```

## Estrutura

```
.
├── api/                    # Vercel serverless functions
│   ├── auth/               # login, logout, me
│   ├── members.js
│   ├── observations.js
│   ├── history.js
│   ├── okrs.js
│   ├── one-on-ones.js
│   ├── kpis.js
│   ├── users.js            # admin only
│   └── audit.js            # admin only
├── lib/
│   ├── db.mjs              # Neon client
│   └── auth.mjs            # JWT + roles + audit
├── scripts/
│   ├── migrate.mjs
│   └── seed.mjs
├── login.html
├── painel-equipe.html
└── index.html              # redirecionador
```

## Variáveis de ambiente

Configuradas automaticamente na Vercel:
- `DATABASE_URL` (Neon Postgres)
- `JWT_SECRET`
