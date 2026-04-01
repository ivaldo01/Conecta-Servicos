# Conecta Backend (Vercel)

Este diretório contém os arquivos necessários para o backend de integração com o Asaas e Firebase Admin.

## Estrutura
- `api/webhook.js`: Recebe notificações de pagamento do Asaas.
- `api/createPayment.js`: Gera cobranças (Pix, Boleto, Cartão).
- `api/withdraw.js`: Realiza solicitações de saque.
- `lib/firebaseAdmin.js`: Configuração do Firebase Admin SDK.

## Configuração na Vercel
Você precisa adicionar as seguintes Variáveis de Ambiente (Environment Variables) no painel da Vercel:

1. `FIREBASE_SERVICE_ACCOUNT`: O conteúdo JSON do seu arquivo de conta de serviço do Firebase (gerado no console do Firebase -> Configurações -> Contas de Serviço).
2. `ASAAS_API_KEY`: Sua chave de API do Asaas (Produção ou Sandbox).
3. `ASAAS_API_URL`: `https://sandbox.asaas.com/api/v3` (para testes) ou `https://www.asaas.com/api/v3` (para produção).
4. `ASAAS_WEBHOOK_TOKEN`: Uma senha criada por você para o webhook.

## Como implantar
1. Crie um novo projeto na Vercel e conecte este repositório.
2. Defina o "Root Directory" como `backend_vercel`.
3. Adicione as variáveis acima.
4. Faça o deploy.

---

### Importante: Webhook no Asaas
No painel do Asaas (Configurações -> Integrações -> Webhooks), configure a URL para:
`https://seu-projeto.vercel.app/api/webhook`
E adicione o `ASAAS_WEBHOOK_TOKEN` no campo de Token de Autenticação.