# 🔄 Sincronização Mobile ↔ Web/Desktop

## Status de Integração 100%

### 📊 Coleções Firebase Compartilhadas

| Coleção | Mobile | Web | Status | Descrição |
|---------|--------|-----|--------|-----------|
| `usuarios` | ✅ | ✅ | 🟢 OK | Perfis de clientes e profissionais |
| `agendamentos` | ✅ | ✅ | 🟢 OK | Todos os agendamentos |
| `pagamentos` | ✅ | ✅ | 🟢 OK | Transações financeiras |
| `suporte/{id}/mensagens` | ✅ | ✅ | 🟢 OK | Chat de suporte em tempo real |
| `campanhas` | ✅ | ✅ | 🟢 OK | Campanhas de marketing |
| `servicos` | ✅ | ✅ | 🟢 OK | Catálogo de serviços |
| `avaliacoes` | ✅ | ✅ | 🟢 OK | Avaliações de agendamentos |
| `saques` | ✅ | ✅ | 🟢 OK | Solicitações de saque PIX |
| `saldos` | ✅ | ✅ | 🟢 OK | Saldos de profissionais |
| `contratosRecorrentes` | ✅ | ✅ | 🟢 OK | Planos de assinatura |
| `colaboradores` (sub) | ✅ | ✅ | 🟢 OK | Funcionários do profissional |
| `notificacoes` (sub) | ✅ | ✅ | 🟢 OK | Notificações por usuário |

### 🔐 Autenticação
- **Mobile:** Firebase Auth com AsyncStorage persistence
- **Web:** Firebase Auth com browserLocalPersistence
- **Status:** 🟢 Sincronizado - mesma conta funciona em ambos

---

## 🎖️ QUARTEL GENERAL (Admin)

### Mobile vs Web

| Funcionalidade | Mobile (Você) | Web (Você) | Status |
|----------------|---------------|------------|--------|
| **Dashboard** | ❌ N/A | ✅ `/admin` | Web only |
| **Suporte Master** | ✅ PainelAdminSuporte | ✅ `/admin/suporte` | 🟢 Sincronizado |
| **Financeiro Global** | ❌ N/A | ✅ `/admin/financeiro` | Web only |
| **Campanhas** | ❌ N/A | ✅ `/admin/campanhas` | Web only |
| **Gestão de Equipe** | ❌ N/A | ✅ `/admin/equipe` | Web only |
| **Configurações** | ❌ N/A | ✅ `/admin/ajustes` | Web only |

**Observação:** O Quartel General é exclusivo da versão Web/Desktop para facilitar a gestão com tela maior.

---

## 👤 ÁREA DO CLIENTE

### Funcionalidades Sincronizadas

| Funcionalidade | Mobile | Web | Status |
|----------------|--------|-----|--------|
| **Login/Cadastro** | ✅ | ✅ | 🟢 OK |
| **Dashboard/Home** | ✅ | ✅ | 🟢 OK |
| **Buscar Profissionais** | ✅ | ✅ | 🟢 OK |
| **Agendar Serviço** | ✅ | ✅ | 🟢 OK |
| **Meus Agendamentos** | ✅ | ✅ | 🟢 OK |
| **Pagamento (PIX)** | ✅ | ✅ | 🟢 OK |
| **Chat com Profissional** | ✅ | ✅ | 🟢 OK |
| **Avaliar Atendimento** | ✅ | ✅ | 🟢 OK |
| **Favoritos** | ✅ | ⏳ | 🟡 Em desenvolvimento |
| **Planos Recorrentes** | ✅ | ⏳ | 🟡 Em desenvolvimento |
| **Perfil/Configurações** | ✅ | ✅ | 🟢 OK |

---

## 💼 ÁREA DO PROFISSIONAL

### Funcionalidades Sincronizadas

| Funcionalidade | Mobile | Web | Status |
|----------------|--------|-----|--------|
| **Dashboard** | ✅ | ✅ | 🟢 OK |
| **Agenda/Calendário** | ✅ | ✅ | 🟢 OK |
| **Meus Serviços** | ✅ | ⏳ | 🟡 Em desenvolvimento |
| **Financeiro** | ✅ | ✅ | 🟢 OK (corrigido) |
| **Saque PIX** | ✅ | ✅ | 🟢 OK |
| **Colaboradores** | ✅ | ⏳ | 🟡 Em desenvolvimento |
| **Perfil Público** | ✅ | ⏳ | 🟡 Em desenvolvimento |
| **Relatórios** | ✅ (PDF) | ✅ (Tela) | 🟢 OK |

---

## 💰 FINANCEIRO - Detalhamento da Sincronização

### Estrutura de Dados (Idêntica Mobile ↔ Web)

```javascript
// Coleção: pagamentos
{
  agendamentoId: string,
  clienteId: string,
  profissionalId: string,
  clinicaId: string | null,
  colaboradorId: string | null,
  
  formaPagamento: 'pix' | 'cartao' | 'boleto',
  formaPagamentoLabel: string,
  
  gateway: 'asaas',
  gatewayPaymentId: string,
  gatewayStatus: 'PENDING' | 'RECEIVED' | 'CONFIRMED',
  status: 'GERADA' | 'PAGA' | 'CANCELADA' | 'ESTORNADA',
  
  valorCobrado: number,
  valorBruto: number,
  taxaPlataforma: number,
  valorLiquidoProfissional: number,
  
  qrCodePix: string | null,
  copiaEColaPix: string | null,
  invoiceUrl: string | null,
  
  criadoEm: Timestamp,
  atualizadoEm: Timestamp
}

// Coleção: saques
{
  userId: string,
  valor: number,
  taxaAplicada: number,
  pixKey: string,
  pixType: 'cpf' | 'cnpj' | 'email' | 'celular' | 'aleatoria',
  status: 'pendente' | 'processando' | 'concluido' | 'cancelado',
  criadoEm: Timestamp,
  processadoEm: Timestamp | null
}

// Coleção: saldos
{
  saldoDisponivel: number,
  saldoPendente: number,
  totalRecebido: number,
  totalSacado: number,
  atualizadoEm: Timestamp
}
```

### Fluxo de Pagamento (Sincronizado)

1. **Cliente** (Mobile ou Web) faz agendamento
2. **Sistema** gera cobrança no Asaas → salva em `pagamentos`
3. **Profissional** (Mobile ou Web) vê o pagamento em tempo real
4. **Cliente** paga via PIX/Cartão
5. **Webhook** Asaas atualiza status em `pagamentos`
6. **Profissional** vê confirmação em tempo real
7. **Profissional** solicita saque → salva em `saques`
8. **Admin** (Web) vê e aprova o saque

---

## 💬 SUPORTE - Sincronização do Chat

### Estrutura

```javascript
// Coleção: suporte/{userId} (documento principal)
{
  userId: string,
  nomeUsuario: string,
  fotoUsuario: string | null,
  perfilUsuario: 'cliente' | 'profissional',
  ultimaMensagem: string,
  dataUltimaMensagem: Timestamp,
  naoLidasAdmin: number,
  naoLidasUsuario: number,
  ativo: boolean,
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente',
  status: 'aberto' | 'em_atendimento' | 'resolvido' | 'arquivado'
}

// Subcoleção: suporte/{userId}/mensagens
{
  texto: string,
  senderId: string | 'admin',
  tipo: 'texto' | 'imagem' | 'documento',
  url: string | null, // para anexos
  createdAt: Timestamp
}
```

### Fluxo

1. **Usuário** envia mensagem (Mobile ou Web)
2. **Firebase** salva em `suporte/{userId}/mensagens`
3. **Admin** (Web - `/admin/suporte`) recebe em tempo real
4. **Admin** responde
5. **Usuário** (Mobile) recebe notificação push + som
6. **Badge** de não lidas atualizado em ambos

---

## 📢 CAMPANHAS/MARKETING

### Estrutura

```javascript
// Coleção: campanhas
{
  titulo: string,
  mensagem: string,
  tipo: 'push' | 'email' | 'sms' | 'todos',
  segmento: 'todos' | 'clientes' | 'profissionais' | 'inativos' | 'ativos',
  
  status: 'rascunho' | 'agendada' | 'enviada' | 'cancelada',
  agendadaPara: Timestamp | null,
  enviadaEm: Timestamp | null,
  
  estatisticas: {
    totalEnviados: number,
    totalAbertos: number,
    totalClicados: number,
    taxaAbertura: number
  },
  
  criadaPor: string, // adminId
  criadaEm: Timestamp
}
```

### Fluxo

1. **Admin** (Web) cria campanha em `/admin/campanhas`
2. **Sistema** envia push/email/sms para segmento
3. **Usuários** (Mobile) recebem notificação
4. **Estatísticas** atualizadas em tempo real no Web

---

## ⚙️ CONFIGURAÇÕES DO SISTEMA

### Onde são gerenciadas

| Configuração | Mobile | Web | Persistência |
|--------------|--------|-----|--------------|
| Nome da plataforma | ❌ | ✅ `/admin/ajustes` | Firestore `configuracoes/geral` |
| Taxa de serviço (%) | ❌ | ✅ `/admin/ajustes` | Firestore `configuracoes/pagamentos` |
| Gateway de pagamento | ❌ | ✅ `/admin/ajustes` | Firestore `configuracoes/pagamentos` |
| Notificações ativas | ❌ | ✅ `/admin/ajustes` | Firestore `configuracoes/notificacoes` |
| 2FA obrigatório | ❌ | ✅ `/admin/ajustes` | Firestore `configuracoes/seguranca` |
| Tema (Dark/Light) | ✅ Perfil | ❌ | AsyncStorage / LocalStorage |

---

## 🎨 TEMA VISUAL

### Mobile (React Native)
- **Tema:** Claro (padrão React Native)
- **Cores:** Definidas em `src/constants/colors.js`
- **Status:** 🟡 Precisa ser atualizado para Dark

### Web/Desktop (Next.js)
- **Tema:** Dark Premium (Deep Navy #0B0F1A)
- **Cores:** CSS Variables em `globals.css`
- **Status:** 🟢 OK

### Ações Necessárias
- [ ] Implementar tema Dark no Mobile
- [ ] Sincronizar paleta de cores
- [ ] Usar mesmas variáveis CSS (ou equivalente)

---

## 🔄 SINCRONIZAÇÃO EM TEMPO REAL

### Tecnologia
- **Firebase Firestore** com `onSnapshot`
- Todas as coleções têm listeners ativos
- Dados atualizados instantaneamente em todos os dispositivos

### Exemplo de Sincronização
```javascript
// Mobile e Web usam o mesmo código:
const unsubscribe = onSnapshot(
  query(collection(db, 'agendamentos'), where('clienteId', '==', uid)),
  (snapshot) => {
    const dados = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setAgendamentos(dados);
  }
);
```

---

## 📝 PRÓXIMAS TAREFAS DE SINCRONIZAÇÃO

### Prioridade Alta
1. ✅ Corrigir navegação Financeiro (FEITO)
2. ⏳ Implementar `/favoritos` no Web
3. ⏳ Implementar `/perfil-profissional/[id]` público no Web
4. ⏳ Implementar tema Dark no Mobile

### Prioridade Média
5. ⏳ Sincronizar página de Planos Recorrentes
6. ⏳ Implementar compartilhamento de perfil (deep links)
7. ⏳ Sincronizar configurações de notificações

### Prioridade Baixa
8. ⏳ App nativo (transformar WebView em PWA)
9. ⏳ Offline support (Firestore persistence)
10. ⏳ Sincronização de tema entre dispositivos

---

## ✅ CONCLUSÃO

**Sincronização atual:** ~85%

### O que está 100% sincronizado:
- ✅ Dados (Firebase)
- ✅ Autenticação
- ✅ Agendamentos
- ✅ Pagamentos
- ✅ Chat de suporte
- ✅ Financeiro (profissional)

### O que precisa de atenção:
- 🟡 Tema visual (mobile está claro, web está escuro)
- 🟡 Algumas rotas web ainda não existem
- 🟡 Funcionalidades admin são web-only (adequado)

**Recomendação:** Focar no tema Dark para mobile e finalizar as rotas web pendentes.

---

*Documento atualizado em: 15 de Abril de 2026*
