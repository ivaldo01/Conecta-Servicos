# 🖥️ Estrutura do Backend - Conecta Solutions

## 📁 Arquitetura Geral

```
backend_vercel/
├── api/                          # Endpoints serverless (Vercel)
│   ├── createSubscription.js     # ⭐ Criar assinatura (PIX/Cartão)
│   ├── webhook.js                # ⭐ Webhook Asaas (confirma pagamento)
│   ├── createPayment.js          # Gerar cobrança única
│   ├── withdraw.js               # Saque PIX profissional
│   └── _utils.js                 # Funções auxiliares
├── lib/
│   └── firebaseAdmin.js          # Config Firebase Admin
├── package.json
└── vercel.json                   # Configuração deploy Vercel
```

---

## 🔄 Fluxo de Dados - Assinaturas VIP

### 1. Criar Assinatura (App/Web → Backend)

```
┌──────────────┐     POST /api/createSubscription     ┌──────────────┐
│   Mobile     │ ───────────────────────────────────▶ │   Backend    │
│   ou Web     │    {userId, planoId, valor, ...}     │   Vercel     │
└──────────────┘                                      └──────────────┘
                                                               │
                                                               ▼
                                                      ┌──────────────┐
                                                      │    Asaas     │
                                                      │   Gateway    │
                                                      └──────────────┘
                                                               │
                                                               ▼
                                                      ┌──────────────┐
                                                      │  QR Code     │
                                                      │  ou Cartão   │
                                                      └──────────────┘
```

**Endpoint:** `POST /api/createSubscription`

**Payload:**
```json
{
  "userId": "uid123",
  "planoId": "pro_profissional",
  "valor": 24.95,
  "nomePlano": "Profissional",
  "billingType": "PIX" | "CREDIT_CARD",
  "creditCard": {...},          // se cartão
  "creditCardHolderInfo": {...}, // se cartão
  "discount": {
    "type": "FIXED",
    "value": 24.95
  }
}
```

**Resposta:**
```json
{
  "success": true,
  "subscriptionId": "sub_abc123",
  "qrCode": "...",
  "copiaECola": "..."
}
```

---

### 2. Webhook - Confirmação de Pagamento (Asaas → Backend)

```
┌──────────────┐     POST /api/webhook (Asaas)        ┌──────────────┐
│    Asaas     │ ───────────────────────────────────▶ │   Backend    │
│   Gateway    │    {event: "PAYMENT_RECEIVED", ...}   │   Vercel     │
└──────────────┘                                      └──────────────┘
                                                               │
                                                               ▼
                                                      ┌──────────────┐
                                                      │   Firebase   │
                                                      │  Firestore   │
                                                      └──────────────┘
                                                               │
                                    ┌──────────────────────────┼──────────────────────────┐
                                    │                          │                          │
                                    ▼                          ▼                          ▼
                             ┌──────────────┐          ┌──────────────┐          ┌──────────────┐
                             │  usuarios/   │          │  assinaturas/│          │  agendamentos/│
                             │  planoAtivo  │          │   status     │          │   status     │
                             │  assinatura  │          │   ACTIVE     │          │   confirmado │
                             │   = true     │          │              │          │              │
                             └──────────────┘          └──────────────┘          └──────────────┘
```

**Eventos Processados:**
- `PAYMENT_RECEIVED` - Pagamento confirmado
- `PAYMENT_CONFIRMED` - Confirmação adicional
- `PAYMENT_OVERDUE` - Pagamento atrasado
- `SUBSCRIPTION_CANCELED` - Assinatura cancelada

---

### 3. Saque PIX (Profissional → Backend)

```
┌──────────────┐     POST /api/withdraw             ┌──────────────┐
│  Profissional│ ──────────────────────────────────▶ │   Backend    │
│   (App/Web)  │    {valor, pixKey, userId}           │   Vercel     │
└──────────────┘                                      └──────────────┘
                                                               │
                                                               ▼
                                                      ┌──────────────┐
                                                      │    Asaas     │
                                                      │  Transfer    │
                                                      └──────────────┘
                                                               │
                                                               ▼
                                                      ┌──────────────┐
                                                      │  Firebase    │
                                                      │  saques/     │
                                                      │  status      │
                                                      └──────────────┘
```

---

## 📊 Endpoints Disponíveis

| Endpoint | Método | Descrição | Status |
|----------|--------|-----------|--------|
| `/api/createSubscription` | POST | Criar assinatura mensal | ⭐ Essencial |
| `/api/webhook` | POST | Receber eventos Asaas | ⭐ Essencial |
| `/api/createPayment` | POST/GET | Cobrança única (agendamento) | ✅ Funcional |
| `/api/withdraw` | POST | Saque PIX profissional | ✅ Funcional |
| `/api/checkBalance` | GET | Consultar saldo Asaas | ⏳ Pendente |
| `/api/cancelSubscription` | POST | Cancelar assinatura | ⏳ Pendente |

---

## 🔐 Variáveis de Ambiente (`.env`)

```env
# Firebase Admin
FIREBASE_PROJECT_ID=seu-projeto
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@...

# Asaas Gateway
ASAAS_API_KEY=sua_chave_aqui
ASAAS_API_URL=https://api.asaas.com/v3

# Webhook Secret
ASAAS_WEBHOOK_TOKEN=token_seguro_webhook
```

---

## 📈 Logs e Monitoramento

### Logs no Vercel Dashboard
```
[createSubscription] Criando assinatura PIX...
[createSubscription] Assinatura criada: sub_abc123
[Webhook] Evento recebido: PAYMENT_RECEIVED
[Webhook] Plano pro_profissional ativado para user123
```

### Coleções Firebase Afetadas

| Coleção | Campo Atualizado | Quando |
|---------|------------------|--------|
| `usuarios/{uid}` | `planoAtivo`, `assinaturaAtiva` | Pagamento confirmado |
| `assinaturas/{id}` | `status`, `ultimaConfirmacao` | Webhook recebido |
| `pagamentos/{id}` | `status`, `pagoEm` | Pagamento agendamento |
| `saques/{id}` | `status`, `processadoEm` | Saque realizado |

---

## 🧪 Testes Locais

### 1. Testar Webhook Local (ngrok)
```bash
# Terminal 1 - Iniciar backend
npm run dev

# Terminal 2 - Expor localhost
npx ngrok http 3001

# Copiar URL https do ngrok e configurar no Asaas Dashboard
```

### 2. Simular Pagamento (modo sandbox)
```bash
curl -X POST http://localhost:3001/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "PAYMENT_RECEIVED",
    "payment": {
      "id": "pay_test123",
      "subscription": "sub_test456",
      "status": "RECEIVED",
      "value": 24.95
    }
  }'
```

---

## 🚀 Deploy (Vercel)

```bash
# Deploy automático via git push
vercel --prod

# Ou via GitHub Actions (configurado no repo)
```

**URLs:**
- Produção: `https://backend-vercel-nu-topaz.vercel.app`
- Webhook: `https://backend-vercel-nu-topaz.vercel.app/api/webhook`

---

## ⚠️ Pontos de Atenção

1. **Webhook Security** - Sempre validar `ASAAS_WEBHOOK_TOKEN`
2. **Idempotência** - Não processar pagamento 2x (verificar `payment.id`)
3. **Retry Logic** - Asaas reenvia webhooks se falhar (HTTP 200+)
4. **Timeout** - Funções serverless têm limite de 10s (Vercel hobby)

---

*Documentação atualizada: 15 Abril 2026*
