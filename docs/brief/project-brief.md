# Briefing do Projeto — Automação de Agendamentos do Vini Dom

## Contexto

O Vini Dom possui um site React/Vite com persistência de reservas no Supabase, confirmação por e-mail, abertura de conversa no WhatsApp e um widget do agente de IA SuperGator instalado no `index.html`. O repositório também contém uma implementação experimental de Google Calendar no painel administrativo, porém essa implementação opera apenas no frontend, guarda configuração no `localStorage`, mantém o token em memória e exporta reservas manualmente.

A auditoria identificou que o fluxo público de reserva não cria nem atualiza eventos no Google Calendar. Os eventos encontrados no calendário principal consultado não eram reservas do Vini Dom. A documentação oficial do SuperGator informa que o agente deve usar uma agenda Google exclusiva e que os eventos precisam ser cadastrados no painel do agente com duração, tipo, lembretes e períodos de disponibilidade.

## Objetivo autorizado

Transformar o agendamento em uma operação automática e unificada, na qual site, WhatsApp, agente SuperGator e Google Calendar respeitem a mesma disponibilidade. A solução deve reduzir intervenção manual, impedir conflitos e manter a operação auditável.

## Regras de negócio aprovadas

- Dias de atendimento: segunda, quarta, quinta, sexta e sábado.
- Períodos de atendimento: 10:00–12:00 e 14:00–18:00.
- Dias fechados: terça-feira e domingo.
- Intervalo entre períodos: 12:00–14:00.
- Serviços atualmente cadastrados: Corte Masculino, Barba, Botox Capilar, Bumper, Detox Capilar, Pigmentação de Barba e Pintura.
- Serviços que hoje possuem 90 minutos devem bloquear 120 minutos operacionalmente.
- A duração comercial exibida ao cliente poderá permanecer em 90 minutos; a duração operacional usada para disponibilidade e calendário será de 120 minutos.
- Preços atuais devem ser preservados até nova instrução.
- Nenhum segredo deve ser exposto no frontend, no GitHub ou nos logs.

## Critérios de sucesso

1. Uma reserva feita pelo site não pode ser criada sem reservar também o evento correspondente, salvo modo de contingência explicitamente configurado.
2. Uma reserva criada pelo agente no Google Calendar deve bloquear o horário no site.
3. Cancelamentos e remarcações devem refletir o estado no calendário sem duplicar eventos.
4. Eventos criados pelo site devem possuir um identificador idempotente ligado ao booking.
5. O algoritmo de disponibilidade deve respeitar duração operacional de 120 minutos para os serviços de 90 minutos.
6. Build, lint e testes de regressão devem passar antes de qualquer publicação.
7. A configuração privada do SuperGator e a autorização do Google devem ser documentadas como dependências externas, sem armazenar credenciais no repositório.

## Fontes externas

- [Configurar Google Calendar no SuperGator](https://suporte.hostgator.com.br/hc/pt-br/articles/51838453831699-Como-configurar-a-agenda-do-Google-Google-Calendar-no-SuperGator)
- [Criar eventos no SuperGator](https://suporte.hostgator.com.br/hc/pt-br/articles/51838399417107-Como-criar-eventos-de-agenda-para-o-agente-de-IA-no-SuperGator)
- [Acessar o painel do SuperGator](https://suporte.hostgator.com.br/hc/pt-br/articles/51838683283091-Como-acessar-o-painel-do-SuperGator)
