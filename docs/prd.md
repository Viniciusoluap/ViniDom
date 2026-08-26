# Vini Dom — PRD de Automação de Agendamentos

**Status:** Aprovado para implementação técnica no repositório; dependências externas devem ser validadas antes da publicação.

## 1. Análise do projeto existente

### 1.1 Fonte da análise

A análise foi feita diretamente sobre o repositório `Viniciusoluap/ViniDom`, sua árvore de código, histórico de commits, configuração de publicação, banco Supabase conectado e documentação oficial do SuperGator.

### 1.2 Estado atual

O projeto é uma aplicação React 19 com Vite, publicada como frontend estático com funções serverless no diretório `api/`. O fluxo público usa `SERVICES` e `BUSINESS_HOURS` definidos em `src/utils/constants.js`, calcula slots em `src/hooks/useAvailableSlots.js`, persiste reservas por meio de `create_public_booking` no Supabase e apresenta a agenda administrativa com `src/components/Agenda.jsx`.

O widget SuperGator é inicializado no `index.html` com o identificador público do agente. Não há no repositório uma API do SuperGator, webhook documentado ou mecanismo que copie automaticamente reservas criadas pelo agente para a tabela `bookings`. A integração Google Calendar existente no painel administrativo é um protótipo manual: configura Client ID e calendário no `localStorage`, obtém token no navegador e tenta criar eventos diretamente pela API do Google.

### 1.3 Escopo

Esta é uma melhoria de integração externa, correção de estabilidade e mudança arquitetural moderada. O trabalho será organizado como um único épico com stories sequenciais para reduzir risco ao sistema existente.

## 2. Objetivos

O objetivo é criar uma operação de agendamento com a menor intervenção humana possível, centralizando regras de serviço e disponibilidade e evitando que site, atendente ou calendário ofereçam o mesmo horário duas vezes.

A solução deve manter a experiência existente do cliente, preservar preços e descrições atuais e introduzir apenas as mudanças necessárias na disponibilidade, persistência, sincronização e observabilidade.

## 3. Requisitos funcionais

- **FR1:** O catálogo de serviços deve distinguir `duration` comercial de `operationalDuration` usada para bloquear agenda.
- **FR2:** Serviços com duração comercial de 90 minutos devem usar duração operacional de 120 minutos.
- **FR3:** A disponibilidade deve permitir segunda, quarta, quinta, sexta e sábado, das 10:00 às 12:00 e das 14:00 às 18:00, bloqueando terça e domingo.
- **FR4:** O cálculo de slots deve considerar a duração operacional acumulada quando o cliente seleciona mais de um serviço.
- **FR5:** O horário persistido deve permanecer em formato numérico de minutos para compatibilidade com o Supabase atual.
- **FR6:** A sincronização com Google Calendar deve converter corretamente data, horário e fuso `America/Fortaleza`/`America/Sao_Paulo` conforme a configuração operacional do negócio.
- **FR7:** Cada booking deve possuir vínculo idempotente com o evento Google correspondente, incluindo estado de sincronização e mensagem de erro quando aplicável.
- **FR8:** Criação, cancelamento e remarcação devem usar o mesmo vínculo para atualizar o evento original, nunca criar duplicatas.
- **FR9:** A criação de booking deverá rejeitar ou colocar em contingência controlada uma reserva cujo evento não possa ser sincronizado, conforme a variável de política configurada no backend.
- **FR10:** A consulta de disponibilidade deverá considerar bookings confirmados no Supabase e eventos bloqueadores da agenda exclusiva, quando a leitura externa estiver habilitada.
- **FR11:** O painel administrativo deverá mostrar estado de sincronização, última tentativa e erro resumido sem expor tokens.
- **FR12:** A configuração do SuperGator deverá conter um evento para cada serviço ou combinação operacional aprovada, com duração coerente e os mesmos períodos de atendimento.
- **FR13:** O widget do agente deverá continuar funcional no site sem duplicar outro componente de chat.
- **FR14:** O sistema deverá permitir idempotência por `booking_id` e detectar reservas antigas sem vínculo antes de qualquer reconciliação.

## 4. Requisitos não funcionais

- **NFR1:** Credenciais Google, token de serviço, chave Supabase privilegiada e segredos do WhatsApp devem permanecer exclusivamente em variáveis privadas de backend.
- **NFR2:** Nenhuma credencial deve ser salva no Git, no `localStorage`, em logs ou em respostas públicas.
- **NFR3:** Rotas server-side devem validar método, payload, origem ou sessão conforme o tipo de operação e aplicar tratamento seguro de erros.
- **NFR4:** A solução deve ser idempotente e tolerar repetição de requisição sem criar eventos duplicados.
- **NFR5:** O build atual deve continuar passando e nenhuma rota pública existente deve quebrar.
- **NFR6:** A solução deve registrar logs operacionais sem dados excessivos de PII; telefone e e-mail devem ser minimizados ou mascarados.
- **NFR7:** A configuração deve permitir desabilitar temporariamente a sincronização sem apagar bookings existentes.
- **NFR8:** Alterações de banco devem ser feitas por migration versionada e as políticas RLS existentes devem permanecer protegidas.

## 5. Compatibilidade

- **CR1:** As RPCs `create_public_booking`, `get_public_booking` e `get_booked_slots` existentes devem continuar válidas ou ser substituídas por compatibilidade explícita.
- **CR2:** A tabela `public.bookings` existente deve preservar dados e IDs atuais; novas colunas devem ser opcionais para registros legados.
- **CR3:** O fluxo de cinco etapas do site, a confirmação por e-mail, o link de WhatsApp e o painel administrativo devem continuar funcionando.
- **CR4:** O widget SuperGator e o atendimento WhatsApp não devem receber segredos do backend do Vini Dom.

## 6. Regras operacionais

| Regra | Valor |
|---|---|
| Fuso padrão | `America/Fortaleza` ou `America/Sao_Paulo`, a confirmar no calendário exclusivo |
| Dias abertos | Segunda, quarta, quinta, sexta e sábado |
| Período 1 | 10:00–12:00 |
| Período 2 | 14:00–18:00 |
| Fechamento | Terça e domingo |
| Intervalo | 12:00–14:00 |
| Intervalo de slot | 15 minutos |
| Duração comercial 90 min | Mantida para exibição |
| Duração operacional 90 min | 120 minutos |
| Cancelamento | Mínimo atual de 2 horas, sujeito a confirmação no SuperGator |

## 7. Riscos e mitigação

| Risco | Impacto | Mitigação |
|---|---|---|
| SuperGator não expõe webhook/API pública | Alto | Usar o Google Calendar exclusivo como fonte externa e confirmar capacidade de consulta; caso não haja integração bidirecional, documentar a limitação e não declarar sincronização plena. |
| Google Calendar e Supabase não formam transação única | Alto | Idempotência, estados de sincronização, compensação de falha e job de reconciliação. |
| Agenda pessoal misturada com agenda do agente | Alto | Criar/usar agenda exclusiva, conforme orientação oficial da HostGator. |
| Credenciais não disponíveis para backend | Alto | Configurar segredo somente no provedor de publicação; não incluir valor no repositório. |
| Serviços de 90 min divergentes | Médio | Bloqueio operacional fixo de 120 min e testes de borda. |
| Reservas antigas sem evento | Médio | Migração de reconciliação manual controlada, sem criar duplicatas automaticamente sem critério. |
| Requisições públicas abusivas | Médio | Validação, rate limit do provedor e RPC transacional existente. |

## 8. Sequência de stories

1. **Story 1.1 — Normalização do catálogo e duração operacional:** separar duração comercial e duração de bloqueio; corrigir conversões de horário; criar testes da disponibilidade.
2. **Story 1.2 — Modelo de sincronização e migration:** adicionar campos idempotentes e estado de sincronização, preservando RLS e RPCs.
3. **Story 1.3 — Serviço server-side de Google Calendar:** criar cliente seguro, criação/atualização/cancelamento, tratamento de fuso e idempotência.
4. **Story 1.4 — Integração do booking com o calendário:** vincular criação, cancelamento e remarcação do site ao serviço server-side com compensação de erros.
5. **Story 1.5 — Reconciliação e observabilidade:** consultar eventos externos quando possível, sinalizar divergências e apresentar estado no admin.
6. **Story 1.6 — Configuração operacional do SuperGator:** cadastrar eventos, períodos, lembretes e regras conforme a agenda exclusiva, usando a sessão do titular no painel.
7. **Story 1.7 — QA e publicação controlada:** executar lint, build, testes, revisão de segurança e preparar PR/release sem publicar credenciais.

## 9. Critérios de aceite do épico

O épico será considerado concluído somente quando site, Supabase, Google Calendar e SuperGator tiverem regras equivalentes, quando as operações de criação/cancelamento/remarcação forem idempotentes, quando os testes automatizados e build passarem e quando as dependências externas forem verificadas em uma sessão real do painel. Se o SuperGator não oferecer um caminho oficial de sincronização bidirecional, essa limitação deverá ser explicitamente registrada e a solução não será apresentada como plenamente unificada.
