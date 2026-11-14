# Vini Dom

Aplicação de agendamentos do Vini Dom. O projeto combina um frontend em React e Vite, persistência no Supabase, funções serverless e integração server-side com o Google Calendar.

## Funcionalidades

- catálogo e seleção de múltiplos serviços;
- escolha de data, horário e profissional;
- durações comercial e operacional separadas para preservar o tempo real da agenda;
- cadastro e confirmação dos dados do cliente;
- painel administrativo, relatórios e área do funcionário;
- disponibilidade calculada a partir das reservas do banco e, em produção, dos eventos ocupados no Google Calendar;
- sincronização idempotente de criação, atualização e cancelamento com o Google Calendar;
- confirmação por e-mail e links do WhatsApp, além de envio administrativo pela API do WhatsApp Business.

Eventos criados exclusivamente por integrações externas só aparecem no Supabase quando existe um fluxo específico de importação. O calendário exclusivo é consultado para bloquear ocupações, mas o projeto não promete sincronização bidirecional com o SuperGator.

## Arquitetura

| Diretório | Responsabilidade |
| --- | --- |
| `src/` | Frontend React, hooks, componentes e regras compartilhadas de domínio |
| `api/` | Funções serverless para reservas, calendário, reconciliação e WhatsApp |
| `supabase/` | Migrations versionadas do banco e das RPCs |
| `tests/` | Testes de domínio executados com `node:test` |
| `docs/` | Arquitetura, operação, segurança e requisitos do produto |

O frontend público não recebe credenciais do Google nem a chave `service_role`. A criação de reservas em produção passa pelas funções serverless, que acessam os serviços privados.

## Pré-requisitos

- Node.js 20 ou superior;
- npm 10 ou superior;
- projeto Supabase para persistência e autenticação;
- credenciais privadas de backend somente quando as integrações reais de calendário e WhatsApp forem habilitadas.

O repositório contém lockfiles históricos de npm e pnpm. Os scripts de validação e o fluxo documentado usam **npm**; preserve os lockfiles existentes até que uma migração de gerenciador seja decidida em escopo próprio.

## Instalação e execução

```bash
npm install
npm run dev
```

Comandos disponíveis:

```bash
npm test
npm run lint
npm run build
npm run preview
npm run aiox:reliability
```

O modo local pode usar o armazenamento do navegador quando o Supabase não está configurado. As funções serverless e as integrações reais dependem das variáveis apropriadas no ambiente de execução.

## Variáveis de ambiente

Copie `.env.example` para um arquivo local ignorado pelo Git e preencha somente as integrações necessárias. O arquivo de exemplo contém placeholders, nunca valores reais.

### Frontend público

| Variável | Finalidade |
| --- | --- |
| `VITE_SUPABASE_URL` | URL pública do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Chave pública/anon do Supabase |
| `VITE_USE_DIRECT_BOOKING_RPC` | Habilita RPC direta somente no modo local compatível |
| `VITE_EMAILJS_SERVICE_ID` | Identificador público do serviço EmailJS |
| `VITE_EMAILJS_TEMPLATE_ID` | Identificador público do template EmailJS |
| `VITE_EMAILJS_PUBLIC_KEY` | Chave pública do EmailJS |

### Backend privado

| Grupo | Variáveis |
| --- | --- |
| Supabase | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| Google Calendar | `GOOGLE_CALENDAR_ID`, `GOOGLE_CALENDAR_TIMEZONE`, `GOOGLE_CALENDAR_TIMEZONE_OFFSET`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, `GOOGLE_CALENDAR_REQUIRED` |
| WhatsApp Business | `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_API_VERSION` |
| Reconciliação | `CRON_SECRET` |

Segredos de backend **não podem** usar o prefixo `VITE_`, pois variáveis com esse prefixo podem ser incluídas no bundle do navegador. Nunca versione chaves privadas, tokens ou arquivos `.env` preenchidos.

## Banco de dados

As migrations ficam em `supabase/migrations/` e devem permanecer versionadas e revisáveis. Mudanças de esquema devem preservar dados existentes; não use procedimentos que apaguem ou sobrescrevam dados de produção. A chave `service_role` e operações administrativas exigem ambiente server-side e autorização apropriada.

O arquivo `supabase-schema.sql` registra o esquema de referência, enquanto a evolução incremental deve ser feita por migrations.

## Testes e qualidade

- `npm test` cobre duração comercial e operacional, múltiplos serviços, dias fechados, almoço, fechamento, conflitos, coordenação fail-safe das fontes de disponibilidade e eventos de calendário;
- `npm run lint` verifica JavaScript e JSX com ESLint;
- `npm run build` gera o bundle de produção com Vite;
- `npm run aiox:reliability` executa as verificações de confiabilidade específicas do repositório.

Os testes automatizados não acessam Google Calendar ou Supabase reais.

## Segurança

- nunca exponha `SUPABASE_SERVICE_ROLE_KEY` ou credenciais do Google no frontend;
- não armazene tokens ou chaves privadas no navegador;
- não registre corpos de requisição, telefone, e-mail ou outras PII sem necessidade;
- não envie tokens, arquivos `.env` ou credenciais para o Git;
- mantenha operações administrativas protegidas pela autenticação e pelos papéis definidos no Supabase.

## Documentação complementar

- [Arquitetura](docs/architecture.md)
- [Configuração operacional automática](docs/ops/automatic-setup.md)
- [Remediação de segurança](docs/security/SECURITY-REMEDIATION-2026-08-17.md)
- [PRD](docs/prd.md)
- [Brief do projeto](docs/brief/project-brief.md)
