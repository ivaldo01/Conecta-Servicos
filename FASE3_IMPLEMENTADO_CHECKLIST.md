# ✅ FASE 3 IMPLEMENTADA - Backend & Automações

## 🎉 O QUE FOI IMPLEMENTADO

### 📧 1. Backend de Envio de Emails

#### ✅ API: `/api/campanhas/enviar-email`
**Arquivo:** `backend_vercel/api/campanhas/enviar-email.js`

**Funcionalidades:**
- [x] Enviar campanha de email para lista de destinatários
- [x] Segmentação por: clientes, profissionais, VIP, ativos, inativos, novos
- [x] Rate limiting: 50 emails por lote, 1 segundo entre lotes
- [x] Personalização de templates com variáveis: `{{nome}}`, `{{cidade}}`, `{{cupom}}`, etc.
- [x] Tracking de envios (sucesso/falha)
- [x] Atualização automática de métricas
- [x] Suporte a SendGrid (recomendado)
- [x] Fallback para SMTP (nodemailer)
- [x] Modo simulação (dev)

**Variáveis de Ambiente necessárias:**
```env
# SendGrid (Recomendado)
SENDGRID_API_KEY=SG.xxxxxxxxxx

# Ou SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu@email.com
SMTP_PASS=sua_senha

# Geral
EMAIL_FROM=noreply@conectaservicos.com.br
EMAIL_FROM_NAME=Conecta Serviços
```

**Como usar:**
```bash
curl -X POST https://seusite.com/api/campanhas/enviar-email \
  -H "Content-Type: application/json" \
  -d '{"campanhaId": "abc123"}'
```

---

### 📱 2. Push Notifications (FCM)

#### ✅ API: `/api/campanhas/enviar-push`
**Arquivo:** `backend_vercel/api/campanhas/enviar-push.js`

**Funcionalidades:**
- [x] Enviar push notification via Firebase Cloud Messaging
- [x] Segmentação por tipo de usuário
- [x] Enviar para tokens específicos
- [x] Lotes de 500 notificações (limite FCM)
- [x] Suporte Android (channel, sound)
- [x] Suporte iOS (badge, sound)
- [x] Desativa tokens inválidos automaticamente
- [x] Métricas de envio
- [x] Links de redirecionamento
- [x] Imagens nas notificações

**Coleções Firestore:**
- `usuarios/{userId}/fcmTokens` - Tokens de cada usuário
- `campanhasPush` - Histórico de campanhas

**Como usar:**
```bash
curl -X POST https://seusite.com/api/campanhas/enviar-push \
  -H "Content-Type: application/json" \
  -d '{
    "titulo": "Oferta Especial!",
    "mensagem": "20% OFF em todos os serviços",
    "imagemUrl": "https://.../imagem.jpg",
    "link": "/promocoes",
    "segmento": ["todos"]
  }'
```

---

### 🤖 3. Automações (Triggers)

#### ✅ API: `/api/campanhas/automatizacoes`
**Arquivo:** `backend_vercel/api/campanhas/automatizacoes.js`

**Automações Configuradas:**

| Automação | Gatilho | Delay | Tipo |
|-----------|---------|-------|------|
| **Boas-vindas** | Novo cadastro | Imediato | Email |
| **Aniversário** | Data de nascimento | 09:00 do dia | Email + Push |
| **Reativação 7d** | Sem acesso 7 dias | 7 dias | Email |
| **Reativação 30d** | Sem acesso 30 dias | 30 dias | Email + Push |
| **Pós-agendamento** | Agendamento criado | 1 hora | Email |
| **Pós-serviço** | Serviço concluído | 1 dia | Email + Push |
| **Pós-pagamento** | Pagamento confirmado | 30 min | Email |

**Funcionalidades:**
- [x] Agendamento de automações futuras
- [x] Processamento de pendentes (cron job)
- [x] Verificação de aniversariantes
- [x] Prevenção de spam (não enviar repetido)
- [x] Templates pré-definidos para cada automação
- [x] Webhooks para integração com app

**Cron Job:**
```json
{
  "path": "/api/campanhas/automatizacoes",
  "schedule": "*/15 * * * *"  // A cada 15 minutos
}
```

**Webhooks para chamar no app:**
```javascript
// Novo usuário cadastrado
POST /api/campanhas/automatizacoes
{
  "action": "trigger",
  "tipo": "boasVindas",
  "userId": "xyz123"
}

// Agendamento criado
POST /api/campanhas/automatizacoes
{
  "action": "trigger", 
  "tipo": "posAgendamento",
  "userId": "xyz123",
  "dados": { "servicoNome": "Limpeza", "data": "15/04/2026" }
}
```

**Integração direta (recomendado):**
```javascript
// No seu backend principal, quando evento ocorrer:
const { webhooks } = require('./api/campanhas/automatizacoes');

// Novo usuário
await webhooks.onNovoUsuario(userId, { nome, email });

// Agendamento
await webhooks.onAgendamento(userId, agendamento);

// Serviço concluído
await webhooks.onServicoConcluido(userId, servico);

// Pagamento
await webhooks.onPagamento(userId, pagamento);
```

---

### ⚙️ 4. Configuração Vercel

#### ✅ Atualização do `vercel.json`

**Novas Rotas:**
```json
{
  "src": "/api/campanhas/enviar-email",
  "dest": "/api/campanhas/enviar-email.js"
},
{
  "src": "/api/campanhas/enviar-push", 
  "dest": "/api/campanhas/enviar-push.js"
},
{
  "src": "/api/campanhas/automatizacoes",
  "dest": "/api/campanhas/automatizacoes.js"
}
```

**Cron Jobs:**
```json
"crons": [
  {
    "path": "/api/gerarAgendamentosRecorrentes",
    "schedule": "0 1 * * *"        // 1:00 AM diário
  },
  {
    "path": "/api/campanhas/automatizacoes", 
    "schedule": "*/15 * * * *"      // A cada 15 minutos
  }
]
```

---

## 📁 ARQUIVOS CRIADOS/MODIFICADOS

### Novos Arquivos:
1. `backend_vercel/api/campanhas/enviar-email.js` - API de envio de emails
2. `backend_vercel/api/campanhas/enviar-push.js` - API de push notifications  
3. `backend_vercel/api/campanhas/automatizacoes.js` - API de automações

### Modificados:
1. `backend_vercel/vercel.json` - Adicionadas rotas e cron jobs

---

## 🚀 COMO DEPLOYAR

### 1. Instalar dependências no backend:
```bash
cd backend_vercel
npm install @sendgrid/mail nodemailer
```

### 2. Configurar variáveis de ambiente no Vercel:
```env
# Firebase (já deve estar configurado)
FIREBASE_PROJECT_ID=seu-projeto
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...

# Email (escolha uma opção)
# Opção 1: SendGrid
SENDGRID_API_KEY=SG.xxxxx

# Opção 2: SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu@email.com
SMTP_PASS=sua_senha_app

# Configurações gerais
EMAIL_FROM=noreply@conectaservicos.com.br
EMAIL_FROM_NAME=Conecta Serviços
```

### 3. Deploy:
```bash
cd backend_vercel
vercel --prod
```

---

## 🧪 COMO TESTAR

### Testar Envio de Email:
```bash
# 1. Criar campanha no Firestore
colecao: campanhasEmail
documento: {teste}
  titulo: "Teste"
  assunto: "Teste de Email"
  conteudo: "<h1>Olá!</h1>"
  segmento: ["todos"]
  status: "agendada"

# 2. Chamar API
curl -X POST https://seusite.com/api/campanhas/enviar-email \
  -H "Content-Type: application/json" \
  -d '{"campanhaId": "{teste}"}'
```

### Testar Push:
```bash
curl -X POST https://seusite.com/api/campanhas/enviar-push \
  -H "Content-Type: application/json" \
  -d '{
    "titulo": "Teste",
    "mensagem": "Notificação de teste",
    "userIds": ["seu_user_id"]
  }'
```

### Testar Automações:
```bash
# Listar automações
curl https://seusite.com/api/campanhas/automatizacoes

# Disparar manualmente
curl -X POST https://seusite.com/api/campanhas/automatizacoes \
  -H "Content-Type: application/json" \
  -d '{
    "action": "trigger",
    "tipo": "boasVindas",
    "userId": "seu_user_id"
  }'

# Processar pendentes
curl -X POST https://seusite.com/api/campanhas/automatizacoes \
  -H "Content-Type: application/json" \
  -d '{"action": "processar-pendentes"}'
```

---

## 📊 PRÓXIMA ETAPA (Fase 4)

### Implementar:
- [ ] **Componente BannerAd** nos apps (Web, Mobile, Desktop)
- [ ] **Tracking de impressões** (IntersectionObserver)
- [ ] **Tracking de cliques** (registro no Firestore)
- [ ] **Exibição nos apps** - integração real
- [ ] **Dashboard de métricas** em tempo real

---

## 📈 FLUXO COMPLETO

```
┌─────────────────────────────────────────────────────────────┐
│                     FASE 1 - Backend                        │
│  Firestore Rules + Services (Anúncios, Anunciantes)        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    FASE 2 - Painel Admin                    │
│  Anúncios CRUD + Anunciantes + Email Marketing             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              FASE 3 - Backend & Automações                  │
│  ✓ Envio de Emails (SendGrid/SMTP)                         │
│  ✓ Push Notifications (FCM)                                │
│  ✓ Automações (Triggers)                                   │
│  ✓ Cron Jobs (15 min)                                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              FASE 4 - Exibição nos Apps                     │
│  Componentes BannerAd + Tracking                          │
└─────────────────────────────────────────────────────────────┘
```

---

**Status:** 🟢 **FASE 3 COMPLETA - Pronta para Deploy**

**Data:** 15/04/2026
