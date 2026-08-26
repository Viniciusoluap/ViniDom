# Achados da documentação oficial da HostGator — Google Calendar no SuperGator

Data da consulta: 2026-08-26.

Fonte principal: https://suporte.hostgator.com.br/hc/pt-br/articles/51838453831699-Como-configurar-a-agenda-do-Google-Google-Calendar-no-SuperGator

A HostGator informa que o SuperGator pode consultar horários livres, criar, remarcar e cancelar eventos e enviar lembretes durante o atendimento. A integração deve usar uma agenda Google exclusiva para agendamentos do agente; a documentação afirma que agendas pessoais não devem ser consultadas por agentes de IA.

Fluxo oficial de conexão: painel do SuperGator > Meus Agentes > selecionar o agente > Agendamentos > Conectar minha agenda > Conectar ao Google Agenda; depois é necessário autorizar a criação de agendas secundárias e a visualização, criação, alteração e exclusão de eventos.

Fonte de configuração dos eventos: https://suporte.hostgator.com.br/hc/pt-br/articles/51838399417107-Como-criar-eventos-de-agenda-para-o-agente-de-IA-no-SuperGator

Antes de criar eventos, a agenda Google deve estar conectada. Cada evento do agente deve definir nome do evento, duração, tipo online (Google Meet) ou presencial, localização quando presencial, lembretes e horários liberados. Os horários permitem ativar/desativar dias da semana, definir início e fim e adicionar múltiplos períodos no mesmo dia; isso atende ao intervalo de almoço 12:00–14:00 do Vini Dom.

Implicação para o Vini Dom: o cadastro existente no código usa serviços de 30 e 90 minutos, mas o painel do agente precisa ter eventos separados por serviço ou uma regra explicitamente equivalente. Para manter a mesma disponibilidade do site, os períodos deverão ser Segunda, Quarta, Quinta, Sexta e Sábado, das 10:00–12:00 e 14:00–18:00; Terça e Domingo bloqueados. A documentação não confirma que o agente do SuperGator leia automaticamente a configuração de serviços do código ou do Supabase, portanto os eventos precisam ser configurados no painel ou por uma integração adicional.


Acesso oficial ao painel: https://super.hostgator.com.br. A documentação informa que o painel administra os agentes, conexões do WhatsApp e agendamentos. A validação de que a agenda foi efetivamente conectada e de que os eventos do Vini Dom foram criados exige abrir o painel autenticado do titular, pois essa informação não aparece no código público do site nem nos eventos do calendário principal consultado.

Fonte: https://suporte.hostgator.com.br/hc/pt-br/articles/51838683283091-Como-acessar-o-painel-do-SuperGator


O painel oficial abriu em https://super.hostgator.com.br/login e apresenta login por Google ou e-mail/senha; a sessão disponível nesta auditoria não está autenticada. Portanto, não foi possível confirmar diretamente no painel se o agente do Vini Dom já tem a agenda conectada, se os eventos foram criados ou se o WhatsApp está vinculado. Não vou solicitar nem registrar senha; a validação autenticada deverá ser feita pelo próprio titular no navegador, ou o usuário pode fornecer o estado/prints do painel.


Diagnóstico do loop de login em 2026-08-26: após a tentativa, o painel permanece em https://super.hostgator.com.br/login; não há token de sessão no localStorage/sessionStorage e não apareceu erro no console. A página chama https://ai-core.hostgator.com.br/api/login e carrega reCAPTCHA do Google; há cookies de identificação, mas não foi estabelecida sessão autenticada. Isso é compatível com falha de sessão/cookie, bloqueio ou falha do reCAPTCHA, resposta rejeitada pela API ou problema de redirecionamento do próprio painel. Nenhum dado de senha foi salvo neste registro.


A inspeção dos bundles públicos confirmou que a tela trata falhas de autenticação como credenciais inválidas ou erro de processamento e usa reCAPTCHA antes de chamar a API de login. Como a página retornou ao login sem mensagem e sem token persistido, a hipótese operacional mais forte é falha de sessão/cookie, reCAPTCHA ou redirecionamento da plataforma; não é possível confirmar a causa exata sem o status da resposta no servidor da HostGator.
