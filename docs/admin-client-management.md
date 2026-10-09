# Cadastro e edição de clientes pelo Admin

## Comportamento entregue

A aba Clientes ganha o botão **Novo cliente**, inclusive na lista vazia. O formulário cadastra ou edita nome, WhatsApp com DDD, e-mail e nascimento. Nome e WhatsApp são obrigatórios; e-mail e nascimento são opcionais. O cadastro não cria agendamentos nem contas de autenticação: o site atual não tem login de cliente.

A tabela `clients` permite manter clientes sem reservas. A lista combina essa tabela com os clientes históricos derivados dos agendamentos. O cadastro administrativo prevalece para os dados pessoais, enquanto visitas, última visita e valores continuam calculados pelos mesmos critérios anteriores.

A edição atualiza o cadastro e os dados pessoais das reservas do mesmo telefone em uma transação. O WhatsApp é normalizado (DDD + número, com remoção opcional do prefixo 55); a comparação exige o número completo, evitando alterações em outro DDD com o mesmo número local. Trocar o WhatsApp preserva o ID do cadastro e o histórico, e bloqueia colisões com outro cliente. Não altera valores, serviços, horários ou status das reservas.

Erros mantêm o formulário aberto e preservam os campos. O diálogo bloqueia envios repetidos durante a gravação, oferece cancelamento e usa foco/modal nativos. Falhas de leitura aparecem com um botão para tentar novamente.

A exclusão existente permanece com a confirmação explícita de exclusão do cliente e seus agendamentos; a nova rotina inclui o cadastro independente na mesma transação. Nenhum registro de cliente ou reserva real foi excluído durante este trabalho.

## Banco e permissões

Migration: `supabase/migrations/20261009011340_admin_clients.sql`.

- Tabela com telefone único, validações e RLS ativa.
- Política administrativa usando `app_metadata.role`; metadados editáveis pelo usuário não autorizam acesso.
- RPCs `save_admin_client` e `delete_admin_client` usam `SECURITY INVOKER`, verificação explícita de Admin e permissões de execução restritas.
- Clientes públicos e funcionários não podem consultar nem gravar o cadastro.
- Sem chaves privadas no navegador, dependências adicionais ou alteração do fluxo público de agendamento.

## Validação

- `npm test`: 25 testes aprovados, incluindo cinco casos do novo diretório.
- `npm run build`: aprovado.
- `npm run lint`: zero erros; oito avisos preexistentes em componentes fora desta alteração.
- `npm run aiox:reliability`: 10 verificações aprovadas.
- A migration foi executada integralmente em PostgreSQL local via PGlite, com testes de cadastro sem reserva, ID estável, normalização/duplicidades, atualização de clientes legados e distinção entre DDDs, preservação de valores, rollback por colisão, campos inválidos e negativa de acesso para anon/staff (inclusive tentativa de usar `user_metadata.role=admin`).

- Teste de interface em Chromium: lista vazia, cadastro manual, edição de WhatsApp/e-mail, bloqueio de duplicidade, manutenção dos campos após erro, nova tentativa, Escape, retorno de foco e formulário em tela de 390 px. Layout móvel inspecionado por captura de tela.

## Publicação pendente

O projeto de banco identificado é ViniDom (`cakzofidcmsbruztmokv`), e a hospedagem é o projeto Vercel `vini-dom`, domínio `vcvisagismo.com`. A branch foi criada a partir de `main` para preservar as funcionalidades atuais de produção, independentemente da branch padrão antiga do repositório.

A revisão automática rejeitou a aplicação da migration no banco de produção por exigir autorização explícita para modificar o banco remoto, incluindo permissões/RPCs e a rotina de exclusão. Portanto, a migration ainda não foi aplicada e a alteração não deve ser mesclada/publicada antes dela.

Sequência após autorização:

1. Aplicar a migration no projeto ViniDom.
2. Verificar estrutura, políticas e advisors; testar as operações com dados de teste e sem alterar clientes reais.
3. Mesclar a PR na `main` e acompanhar o deploy de produção no Vercel.
4. Validar em `vcvisagismo.com/admin`: login, Clientes, Novo cliente, persistência após atualização, edição e bloqueio de duplicidade.
