# Preferências Técnicas — ViniDom

## Stack Principal
- **Frontend**: React 18 + Vite
- **Estilização**: Tailwind CSS v3
- **Roteamento**: React Router v6
- **Backend/DB**: Supabase (PostgreSQL)
- **Deploy**: Vercel
- **Ícones**: Lucide React

## Contexto do Projeto
Sistema de agendamento para salão de beleza/visagismo do Vinicius Cavalcante.
- Admin panel com Agenda (Dia/Semana/Mês), Dashboard, Clientes, Funcionários, WhatsApp, Relatórios, Contabilidade
- Integração com Google Calendar (OAuth 2.0)
- Integração futura com agente de IA para agendamentos automáticos
- Integração WhatsApp Business API para disparos em massa

## Padrões de Código
- Componentes funcionais React com hooks
- useMemo/useCallback para performance
- localStorage para dados de configuração (credenciais, templates)
- Supabase como fonte de dados principal (localStorage como fallback)
