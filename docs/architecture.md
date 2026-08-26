# Vini Dom — Arquitetura da Automação de Agendamentos

**Status:** Aprovada para implementação técnica.

## 1. Decisão arquitetural

A aplicação manterá o Supabase como repositório interno dos bookings e usará uma camada server-side para falar com o Google Calendar. O frontend não receberá credenciais Google e não criará eventos diretamente. O SuperGator continuará sendo o canal de conversa, mas sua agenda deverá ser uma agenda Google exclusiva conectada no painel do agente.

A integração será desenhada com três camadas:

1. **Domínio de disponibilidade:** catálogo de serviços, duração operacional, dias e períodos abertos, compartilhados por site e APIs.
2. **Persistência de reservas:** tabela `public.bookings`, RPCs existentes e novas colunas de sincronização.
3. **Adaptador externo:** cliente Google Calendar server-side com operações idempotentes e estados `pending`, `synced`, `failed` e `cancelled`.

## 2. Fluxo de criação recomendado

1. O site valida serviço, duração operacional, data, profissional e dados mínimos do cliente.
2. O backend ou RPC cria o booking com ID determinístico/UUID e estado de sincronização pendente.
3. O serviço de calendário cria ou localiza o evento por chave idempotente baseada no booking ID.
4. Em sucesso, o sistema grava `google_event_id`, calendário, timestamps e estado sincronizado.
5. Em falha, registra erro minimizado e aplica a política `GOOGLE_CALENDAR_REQUIRED`: em produção, rejeita ou compensa a reserva quando configurado como obrigatório; em modo contingência, mantém o booking pendente para reconciliação.

Como Supabase e Google não participam da mesma transação, a consistência será obtida por idempotência, compensação e reconciliação. Não haverá promessa de atomicidade distribuída.

## 3. Fluxo de cancelamento e alteração

Cancelamento deve atualizar o booking e remover/atualizar o evento pelo ID já salvo, sem buscar eventos por texto. Remarcação deve atualizar o evento existente, preservando o mesmo ID. Se o evento não existir, o sistema deve recriá-lo com a chave idempotente e atualizar o vínculo.

## 4. Fonte de disponibilidade externa

O site considera bookings confirmados no Supabase. Se o SuperGator criar eventos diretamente no calendário, o site só poderá bloqueá-los se houver uma consulta server-side ao calendário exclusivo ou se a HostGator oferecer webhook/API para refletir eventos no Supabase. A documentação pública consultada confirma a capacidade de o SuperGator consultar e criar eventos, mas não documenta uma API pública de webhook para exportar esses eventos ao Vini Dom. Essa dependência deve ser validada no painel/suporte antes de declarar sincronização bidirecional completa.

## 5. Modelagem proposta

Adicionar à tabela `bookings`:

- `operational_duration integer` — duração usada para bloquear slots.
- `google_calendar_id text` — calendário de destino, sem segredo.
- `google_event_id text` — ID do evento externo.
- `calendar_sync_status text` — `pending`, `synced`, `failed`, `cancelled`.
- `calendar_sync_error text` — mensagem técnica sanitizada.
- `calendar_synced_at timestamptz` — último sucesso.
- `updated_at timestamptz` — última mudança de negócio.

Criar índice único parcial em `(google_calendar_id, google_event_id)` para eventos vinculados. O ID do booking continua sendo a chave principal e deve ser usado na descrição/extended properties quando suportado.

## 6. Segurança

Segredos devem estar nas variáveis privadas do provedor serverless: `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, `GOOGLE_CALENDAR_ID`, `GOOGLE_CALENDAR_TIMEZONE`, `GOOGLE_CALENDAR_REQUIRED`, `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`. O frontend usará apenas o Supabase publishable/anon key já existente.

O endpoint server-side deve validar payload, método HTTP, tamanho máximo, status permitido e autenticação administrativa quando a operação não for pública. Logs não devem registrar token, private key, e-mail completo, telefone completo ou corpo integral da requisição.

## 7. Limites de duração

O domínio deverá guardar `duration` como duração comercial e `operationalDuration` como duração real de bloqueio. Serviços com 90 minutos usam 120 minutos operacionalmente. Serviços de 30 minutos permanecem com 30 minutos. Em seleção múltipla, a soma deve considerar a duração operacional de cada item.

## 8. Deploy e rollback

A primeira entrega deve ser feita em branch de feature com migration versionada, funções serverless e atualização do frontend. O ambiente de produção só deve ativar `GOOGLE_CALENDAR_REQUIRED=true` após cadastrar as variáveis privadas e concluir um teste real. Rollback consiste em desativar a exigência, preservar bookings e reverter a versão do frontend; nunca apagar dados de produção.

## 9. Critérios de validação

- Lint e build passam.
- Testes de duração e slot cobrem 30, 90→120, múltiplos serviços, almoço, fechamento e limite de fim de expediente.
- Testes de adaptação de data/hora cobrem fuso brasileiro e horários numéricos.
- Testes de idempotência garantem que a mesma reserva não gere dois eventos.
- Testes de cancelamento e atualização usam o mesmo ID de evento.
- Nenhuma variável privada aparece no bundle final.
- Advisor de segurança do Supabase é consultado após migration.
