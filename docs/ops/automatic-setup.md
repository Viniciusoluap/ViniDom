# Operação Automática — Vini Dom

## O que já foi implementado

O site agora separa duração comercial de duração operacional. Botox Capilar, Bumper, Detox Capilar e Pintura continuam aparecendo como serviços de 90 minutos, mas bloqueiam 120 minutos no algoritmo de disponibilidade e nos eventos do calendário. O Supabase recebeu campos de estado e vínculo externo sem apagar os 23 bookings existentes.

Em produção, uma reserva passa pela rota server-side `/api/bookings`, que valida os dados, cria o booking via RPC privada ao cliente anônimo, cria/atualiza o evento no Google Calendar e grava `google_event_id` e `calendar_sync_status`. A consulta de slots usa `/api/booking-availability` e `/api/calendar-availability`, sem executar RPCs SECURITY DEFINER diretamente do navegador. Cancelamentos, alterações administrativas e reconciliação usam o mesmo vínculo de evento.

Foi incluída uma reconciliação protegida por `CRON_SECRET` em `/api/calendar-reconcile`, agendada diariamente no Vercel às 05:00. O job sincroniza bookings futuros pendentes/falhos e remove eventos ligados a bookings cancelados. A frequência pode ser aumentada em plano Vercel que aceite cron mais frequente.

## Variáveis privadas do Vercel

Cadastre os valores apenas nas variáveis de ambiente do projeto de publicação:

| Variável | Finalidade |
|---|---|
| `SUPABASE_URL` | URL do projeto Supabase ViniDom |
| `SUPABASE_SERVICE_ROLE_KEY` | Acesso privado server-side ao banco |
| `GOOGLE_CALENDAR_ID` | ID da agenda exclusiva de agendamentos |
| `GOOGLE_CALENDAR_TIMEZONE` | Deve ser `America/Fortaleza` ou o fuso efetivo da operação |
| `GOOGLE_CALENDAR_TIMEZONE_OFFSET` | `-03:00` para o fuso brasileiro atual |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Conta de serviço autorizada na agenda |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Chave privada da conta de serviço, com quebras de linha escapadas |
| `GOOGLE_CALENDAR_REQUIRED` | `false` em homologação; `true` após o primeiro teste real |
| `CRON_SECRET` | Segredo longo usado pelo job automático |

A conta de serviço precisa ter permissão de edição na agenda exclusiva. A chave não deve ser enviada por mensagem, commit, issue ou screenshot.

## Configuração externa inevitável

A única parte que não pode ser cadastrada automaticamente pelo código é a autorização da conta Google e a configuração privada do agente SuperGator, porque o painel exige a sessão do titular e a documentação pública consultada não oferece uma API pública para essa administração. No painel, conecte o Google Calendar exclusivo ao agente, cadastre os eventos dos serviços, use duração operacional de 120 minutos para os quatro serviços de 90 minutos e aplique os períodos 10:00–12:00 e 14:00–18:00 nos dias de segunda, quarta, quinta, sexta e sábado.

Se o SuperGator criar reservas diretamente no Google Calendar, a rota pública de disponibilidade consegue bloquear esses eventos quando a agenda exclusiva estiver configurada. A entrada correspondente no Supabase será criada pelo fluxo do site; eventos originados somente no agente dependem de webhook/API do SuperGator ou de uma futura rotina de importação documentada pela HostGator. A documentação pública pesquisada não confirmou essa API bidirecional.

## Checklist de ativação

1. Criar ou escolher uma agenda Google exclusiva para o agente.
2. Criar uma conta de serviço no Google Cloud com a API Google Calendar habilitada.
3. Compartilhar a agenda exclusiva com o e-mail da conta de serviço como “Fazer alterações nos eventos”.
4. Cadastrar as variáveis privadas no Vercel e manter `GOOGLE_CALENDAR_REQUIRED=false` durante o primeiro teste.
5. Publicar a branch e fazer uma reserva de teste futura pelo site.
6. Confirmar que o evento aparece na agenda, que a duração de 90 minutos bloqueia 120 minutos e que o booking mostra `calendar_sync_status=synced`.
7. Testar cancelamento e remarcação no painel administrativo.
8. Confirmar o agente SuperGator e o WhatsApp no painel autenticado.
9. Alterar `GOOGLE_CALENDAR_REQUIRED=true` somente após todos os testes.
10. Remover o evento de teste ou marcá-lo como teste, sem apagar reservas reais.

## Estado atual do Supabase

A migration de segurança removeu a execução pública das RPCs antigas e v2; o frontend de produção usa as rotas server-side. O advisor de segurança deixou apenas o aviso de proteção contra senhas comprometidas desabilitada no Supabase Auth, que é uma configuração do painel de autenticação e não é necessária para o fluxo público de reservas.
