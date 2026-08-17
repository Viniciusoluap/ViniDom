# ViniDom — Remediação de Segurança

## Estado

A remediação remove a autenticação por senha hardcoded, elimina credenciais WhatsApp do navegador, restringe o acesso direto à tabela `bookings` e atualiza as dependências vulneráveis. A migration `supabase/migrations/20260817_security_hardening.sql` já foi aplicada ao projeto Supabase `ViniDom` (`cakzofidcmsbruztmokv`).

## Supabase Auth

O painel administrativo exige um usuário Supabase Auth cujo `app_metadata.role` seja `admin`. A área de funcionário exige `app_metadata.role=staff`, `professional_name`, `professional_role`, `professional_color`, `professional_initials` e `active=true`. Esses valores devem ser definidos por um operador autorizado no Supabase; nunca devem ser colocados em `localStorage` ou no bundle frontend.

A tabela `bookings` não concede mais `SELECT`, `INSERT`, `UPDATE` ou `DELETE` ao papel `anon`. O agendamento público usa `create_public_booking`, a disponibilidade usa `get_booked_slots` e a tela de confirmação usa `get_public_booking`, todos com escopo mínimo. Operações administrativas usam a sessão Supabase Auth e as políticas baseadas em `app_metadata`.

## Variáveis do Vercel

Configure como variáveis privadas — nunca com prefixo `VITE_` — no projeto `vini-dom`:

| Variável | Uso |
|---|---|
| `SUPABASE_URL` | URL do projeto Supabase usada pela Function para validar sessões |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave privada para validar o token Supabase Auth no endpoint server-side |
| `WHATSAPP_ACCESS_TOKEN` | Token privado da Meta WhatsApp Business API |
| `WHATSAPP_PHONE_NUMBER_ID` | Identificador do número WhatsApp Business |
| `WHATSAPP_API_VERSION` | Versão da Graph API; default do código: `v18.0` |

O endpoint `/api/whatsapp-send` não retorna esses valores e aceita somente solicitações autenticadas por um usuário com `app_metadata.role=admin`. O envio em massa é limitado a 50 destinatários por requisição.

## Validação

Antes de publicar, execute `npm ci`, `npm run lint`, `npm run build`, `npm audit --omit=dev`, `npm audit` e `npm run aiox:doctor` no branch. O lint atualmente mantém falhas preexistentes em arquivos não relacionados à remediação; elas devem ser tratadas em uma frente separada para não misturar escopos.

## Rollback

O checkpoint local anterior às alterações é a tag `checkpoint/pre-security-remediation-20260817` no clone de trabalho. O rollback do frontend pode ser feito selecionando o deployment anterior `dpl_J9YyLFotcvvR9D7U3CTuJ3rGKA7j` no Vercel. A migration deve ser revertida somente com uma migration de rollback revisada por operador de banco; não se recomenda reabrir políticas anônimas.
