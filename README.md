# Painel de Gestão de Equipe — Comercial Biasi

Aplicação web (single-file, sem dependências) para acompanhamento da equipe comercial da Biasi Engenharia.

## Recursos

- Cards individuais por colaborador com tempo na empresa, perfil e prioridade da semana
- Drawer detalhado com 9 seções: resumo, perfil, Big Five (OCEAN), observações, pontos fortes, atenção, plano de trabalho, feedback e histórico
- Edição inline (`contenteditable`) em todos os campos
- Persistência local via `localStorage` (chave: `biasi_team_v4`)
- Geração automática de roteiro de feedback de sexta-feira
- Modelos de referência: Temperamentos hipocráticos + Big Five (Soto, 2018) — [personality-project.org](https://personality-project.org/)

## Como rodar localmente

Basta abrir `painel-equipe.html` no navegador. Nenhuma instalação necessária.

## Deploy

Hospedado na Vercel a partir deste repositório.
