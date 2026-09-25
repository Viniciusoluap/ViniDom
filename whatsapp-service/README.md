# ViniDom — Serviço de WhatsApp Web

Serviço Node.js independente, sempre ativo, que mantém a conexão do WhatsApp
Web (via [Baileys](https://github.com/WhiskeySockets/Baileys)) usada pelo
painel administrativo do ViniDom para enviar mensagens pelo número pessoal
(além da API oficial do WhatsApp Business, que já roda direto na Vercel).

Este serviço **não roda na Vercel** — funções serverless não sustentam a
conexão permanente que o WhatsApp Web exige. Ele deve ficar em um serviço
sempre ligado, como o [Railway](https://railway.app).

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `SERVICE_SECRET` | Sim | Segredo compartilhado. O painel do ViniDom envia esse valor no cabeçalho `Authorization: Bearer <valor>` em toda chamada. Gere um valor longo e aleatório. |
| `AUTH_DIR` | Não (padrão `./auth`) | Pasta onde a sessão do WhatsApp Web é salva. **Precisa apontar para um Volume persistente no Railway**, senão a sessão se perde a cada deploy/restart e será necessário escanear o QR Code de novo. |
| `PORT` | Não | Definida automaticamente pelo Railway. |

## Deploy no Railway

1. Crie um novo projeto no Railway e aponte para a pasta `whatsapp-service/` deste repositório (ou faça deploy manual enviando só esta pasta).
2. Em **Variables**, adicione `SERVICE_SECRET` com um valor aleatório e forte.
3. Em **Volumes**, crie um volume e monte em `/data/auth`; defina `AUTH_DIR=/data/auth`.
4. Faça o deploy. Nos logs, aguarde a mensagem `Serviço ouvindo na porta...`.
5. No painel do ViniDom (aba WhatsApp → WhatsApp Web), informe a **URL pública do serviço** (Railway gera algo como `https://seu-servico.up.railway.app`) e o mesmo valor de `SERVICE_SECRET`.
6. Escaneie o QR Code exibido no painel com o WhatsApp do número que vai enviar as mensagens (Configurações → Aparelhos conectados → Conectar um aparelho).

## Endpoints

Todos exigem `Authorization: Bearer <SERVICE_SECRET>`, exceto `/health`.

- `GET /health` — verificação simples, sem autenticação.
- `GET /status` — `{ status: 'connecting' | 'qr_pending' | 'connected' | 'disconnected', phone }`.
- `GET /qr` — `{ qrDataUrl }` (imagem do QR Code em base64, ou `null` se não houver pareamento pendente).
- `POST /send-bulk` — `{ recipients: [{ phone, message, name }] }`. Envia com um pequeno atraso aleatório entre mensagens para reduzir o risco de bloqueio.
- `POST /disconnect` — encerra a sessão atual e força um novo pareamento (novo QR Code).

## Aviso importante

Este método usa engenharia reversa do protocolo do WhatsApp (não é a API
oficial). Existe risco real do número ser suspenso, especialmente em envios
em massa. Prefira números que você pode perder ou substituir com facilidade,
e monitore o painel após cada disparo.
