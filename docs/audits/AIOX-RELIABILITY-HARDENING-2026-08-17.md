# AIOX — Hardening de Confiabilidade do Histórico

**Projeto:** Vini Dom  
**Data:** 17/08/2026  
**Escopo:** carregamento de agendamentos no painel administrativo e na área de funcionários

## Diagnóstico

O Supabase continha os registros reais, mas o painel podia exibir uma lista vazia durante a restauração da sessão Supabase Auth. O hook `useBookings` era executado na montagem da tela, antes de `authed` estar disponível. Quando a consulta ocorria sem a sessão autorizada, o serviço registrava o erro e retornava `[]`. O efeito do hook tinha dependências vazias e não repetia o carregamento depois que o login terminava.

Esse comportamento confundia três estados diferentes: carregamento, erro de consulta e banco realmente vazio. A interface tratava os três como “0 agendamentos”. A evidência de produção confirmou que os 23 agendamentos de agosto continuavam no banco e apareceram corretamente após a tela ser reaberta.

## Correções implementadas

O hook `useBookings` agora recebe `enabled` e só consulta o Supabase quando a sessão autorizada está pronta. Admin e Funcionário usam `useBookings(authed)`, o que impede consultas pré-login e força novo carregamento na transição para autenticado.

Falhas de `getAllBookings` agora são propagadas para o hook. O hook expõe `error` e `reload`, mantém o carregamento separado do resultado e permite retry explícito. Em erro, o painel mostra uma mensagem operacional e não substitui o histórico por uma lista vazia.

A proteção foi aplicada uniformemente às abas administrativas que dependem de bookings. A área de funcionários apresenta o mesmo estado seguro e retry, sem alterar o catálogo ou os registros existentes.

## Validações

- `npm run aiox:reliability`: 10 verificações aprovadas.
- Lint direcionado nos arquivos alterados: 0 erros; 2 avisos preexistentes no `Funcionario.jsx` relacionados às dependências de `useMemo`.
- `npm run build`: aprovado.
- `git diff --check`: aprovado.
- SecurityChecker AIOX: sem padrões novos de credencial, injeção SQL ou path traversal nos arquivos modificados. Os alertas de `setInterval` no hook e no Admin são padrões de polling/timer já usados como fallback operacional e não introduzem uma vulnerabilidade por si só.
- Nenhuma migration, exclusão ou alteração de dados do Supabase foi executada nesta correção.

## Critério de aceite para publicação

A correção só deve ser publicada após revisão do diff, execução do build, execução do teste AIOX e teste de produção que cubra: tela sem sessão, login administrativo, carregamento dos 23 registros, falha simulada de consulta e retry. O deployment deve ser monitorado e a URL deve ser validada após a publicação.
