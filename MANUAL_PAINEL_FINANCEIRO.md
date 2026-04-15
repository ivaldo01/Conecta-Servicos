# 📊 Manual do Painel Financeiro - Conecta Solutions

## Visão Geral

O painel **Monitoramento Backend** (`/admin/financeiro`) permite acompanhar em tempo real todas as transações financeiras da plataforma, desde assinaturas VIP até saques de profissionais.

---

## 📈 Cards de Estatísticas

### 👑 Assinaturas Ativas
**O que mostra:** Quantidade de usuários com plano VIP atualmente ativo  
**Por que importa:** Indica a saúde financeira recorrente da plataforma  
**Quando aumenta:** Novo usuário contrata plano e paga primeira mensalidade  
**Quando diminui:** Usuário cancela ou não renova assinatura

---

### 💰 Receita Mensal
**O que mostra:** Soma de todos os valores de assinaturas ativas  
**Cálculo:** Soma de (valor do plano × quantidade de assinaturas ativas)  
**Exemplo:** 10 usuários no plano Profissional (R$24,95) = R$249,50/mês  
**Importância:** Previsibilidade de receita para planejamento

---

### ⏳ Pagamentos Pendentes
**O que mostra:** Quantidade de cobranças geradas mas ainda não pagas  
**Status incluídos:** PIX gerado aguardando pagamento, cartão processando  
**Ação recomendada:** Cobrança ativa para converter em receita  
**Tempo típico:** PIX expira em 24h se não pago

---

### 🔄 Saques Pendentes
**O que mostra:** Quantos profissionais aguardando transferência de dinheiro  
**Fluxo:** Profissional solicita → Admin aprova → Dinheiro vai para conta  
**Importância:** Gestão de caixa e liquidez  
**Prazo:** Profissionais esperam receber em até 48h úteis

---

### 📡 Webhooks (24h)
**O que mostra:** Quantas comunicações recebidas do gateway de pagamento nas últimas 24 horas  
**O que é webhook:** Notificação automática do Asaas quando algo acontece (pagamento, cancelamento, etc.)  
**Valor:** Diagnóstico de integração - se for zero, há problema técnico

---

## 📑 Abas de Detalhamento

---

### 👑 Aba: Assinaturas

**Objetivo:** Listar todos os planos VIP contratados pelos usuários

#### Colunas Explicadas:

| Coluna | Descrição | Exemplo |
|--------|-----------|---------|
| **Usuário** | Nome da pessoa que contratou | "João Silva" |
| **Plano** | Tipo de plano contratado | pro_profissional, pro_empresa, client_premium |
| **Status** | Situação atual da assinatura | 🟢 ACTIVE = pagando / 🟡 PENDING = aguardando / 🔴 CANCELLED = cancelou |
| **Valor/Mês** | Quanto paga mensalmente | R$ 24,95 (com desconto 50%) |
| **Método** | Forma de pagamento escolhida | PIX ou CREDIT_CARD |
| **Criado em** | Data da contratação | 15/04/2026 14:30 |
| **ID Asaas** | Código único no gateway | sub_abc123xyz |

#### Quando aparecem dados:
- ✅ Quando usuário compra plano pelo **App Mobile**
- ✅ Quando usuário compra plano pela **Web/Desktop**
- ✅ Quando você ativa manualmente pelo painel Admin

#### Ações possíveis:
- Filtrar por status (ativas, pendentes, canceladas)
- Buscar por nome do usuário
- Identificar churn (cancelamentos recentes)

---

### 💳 Aba: Pagamentos

**Objetivo:** Visualizar todas as cobranças geradas no sistema

#### Tipos de Pagamento:

| Tipo | Descrição | Origem |
|------|-----------|--------|
| **assinatura** | Mensalidade do plano VIP | Usuário contrata plano |
| **agendamento** | Pagamento de serviço realizado | Cliente paga profissional |

#### Status de Pagamento:

| Status | Cor | Significado | Ação |
|--------|-----|-------------|------|
| **PENDING** | 🟡 Amarelo | Cobrança gerada, aguardando pagamento | Aguardar ou cobrar cliente |
| **RECEIVED** | 🟢 Verde | Pagamento recebido no Asaas | Confirmar no sistema |
| **CONFIRMED** | 🟢 Verde | Pagamento processado e confirmado | Nenhuma ação |
| **OVERDUE** | 🔴 Vermelho | Pagamento em atraso | Cobrança/cancelamento |
| **REFUNDED** | 🟣 Roxo | Estornado/Devolvido | Registro de reembolso |

#### Colunas Importantes:

- **Criado em:** Quando a cobrança foi gerada (ex: usuário clicou "Assinar")
- **Pago em:** Quando o dinheiro efetivamente entrou (ex: escaneou PIX)
- **Valor:** Valor líquido (já com desconto de 50% se aplicável)

---

### 🔄 Aba: Saques

**Objetivo:** Gerenciar transferências de dinheiro para profissionais

#### Fluxo Completo:

```
1. Profissional vende serviço → Recebe saldo na plataforma
2. Profissional clica "Sacar" → Solicita transferência
3. Admin vê em "Saques Pendentes" → Analisa solicitação
4. Admin aprova → Dinheiro vai para conta do profissional
5. Status muda para "processado" → Profissional recebe
```

#### Status de Saque:

| Status | Descrição | Ação do Admin |
|--------|-----------|---------------|
| **pendente** | Aguardando aprovação | Analisar e aprovar/recusar |
| **processado** | Dinheiro já transferido | Nenhuma ação |
| **erro** | Falha na transferência | Verificar dados bancários |

#### Informações Exibidas:

- **Profissional:** Quem está solicitando o saque
- **Valor:** Quanto quer receber
- **Chave PIX:** Para onde o dinheiro será enviado
- **Solicitado em:** Data do pedido
- **Processado em:** Data da transferência (quando aprovado)

---

### 📡 Aba: Webhooks

**Objetivo:** Monitorar comunicação técnica entre plataforma e gateway Asaas

#### O que são Webhooks?

Webhooks são notificações automáticas que o **Asaas** envia para o seu sistema quando acontece algo importante:

- 💰 Cliente pagou uma cobrança
- ❌ Cliente cancelou assinatura
- 🔄 Cartão foi recusado
- ⏳ Pagamento está atrasado

#### Campos da Tabela:

| Campo | Explicação | Exemplo |
|-------|------------|---------|
| **Evento** | Tipo de notificação | PAYMENT_RECEIVED, SUBSCRIPTION_CANCELED |
| **Payment ID** | Identificador do pagamento | pay_123456789 |
| **User ID** | Identificador do usuário | uid_abc123 |
| **Processado** | Seu sistema tratou a notificação? | ✅ Sim / ❌ Não (erro) |
| **Recebido em** | Data/hora que chegou | 15/04/2026 15:45:22 |
| **Erro** | Se falhou, motivo do erro | "User not found" |

#### Eventos Comuns:

| Evento | Quando ocorre | Ação do sistema |
|--------|---------------|-----------------|
| **PAYMENT_RECEIVED** | Cliente pagou PIX/cartão | Ativa plano VIP automaticamente |
| **PAYMENT_CONFIRMED** | Confirmação adicional | Atualiza status interno |
| **SUBSCRIPTION_CANCELED** | Cliente cancelou plano | Remove planoAtivo do usuário |
| **PAYMENT_OVERDUE** | Pagamento atrasado | Envia lembrete ao cliente |

#### Diagnóstico:

- ✅ **Webhooks chegando normalmente:** Integração funcionando
- ❌ **Zero webhooks:** Problema no backend ou Asaas
- ⚠️ **Muitos erros:** Dados inconsistentes entre sistemas

---

## 🎯 Fluxo de Dinheiro na Plataforma

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTE                                 │
│                   (Quem contrata serviço)                       │
└──────────────┬──────────────────────────────────┬───────────────┘
               │                                  │
               ▼                                  ▼
     ┌─────────────────┐                ┌──────────────────────┐
     │  Assinatura VIP │                │  Pagamento Serviço   │
     │   (mensalidade)  │                │   (valor do job)     │
     └────────┬────────┘                └──────────┬───────────┘
              │                                    │
              ▼                                    ▼
     ┌─────────────────┐                ┌──────────────────────┐
     │     ASAAS       │◄───────────────│      ASAAS           │
     │   (gateway)     │   Webhooks     │   (gateway)          │
     └────────┬────────┘                └──────────┬───────────┘
              │                                    │
              ▼                                    ▼
     ┌─────────────────┐                ┌──────────────────────┐
     │ Plataforma       │                │  Profissional        │
     │ (taxa 10-20%)    │                │  (recebe após taxa)  │
     └────────┬────────┘                └──────────┬───────────┘
              │                                    │
              ▼                                    ▼
     ┌─────────────────┐                ┌──────────────────────┐
     │  Sua Empresa    │                │  Saque Solicitado     │
     │  (receita)      │                │  (PIX para conta)    │
     └─────────────────┘                └──────────────────────┘
```

---

## 🚨 Alertas Importantes

### Quando preocupar-se:

| Situação | Significado | Ação |
|----------|-------------|------|
| Muitos "PENDING" antigos | Clientes não estão pagando | Revisar precificação ou UX |
| Webhooks com erro | Integração falhando | Verificar backend imediatamente |
| Saques acumulados | Falta de liquidez | Garantir saldo no Asaas |
| Churn alto | Cancelamentos frequentes | Melhorar retenção |

---

## 📱 Sincronização Mobile/Web

Todos os dados deste painel são **idênticos** no App Mobile:

- ✅ Mesmo Firebase (dados em tempo real)
- ✅ Mesmas collections (assinaturas, pagamentos, saques)
- ✅ Mesmos status (ACTIVE, PENDING, CANCELLED)

**O que muda:** Interface adaptada para celular, mas mesma informação.

---

## 🔧 Configuração Necessária

Para o painel funcionar completamente:

1. **Backend rodando** (Vercel ou local)
2. **Webhooks configurados** no dashboard Asaas
3. **Firebase com permissões** (firestore.rules atualizadas)
4. **Coleções criadas** automaticamente ao primeiro uso

---

## 📞 Suporte

Dúvidas sobre:
- **Valores incorretos:** Verificar se desconto de 50% está aplicado
- **Dados não aparecem:** Verificar se backend está gravando no Firestore
- **Erros de webhook:** Consultar logs no Vercel Dashboard

---

*Documento gerado em: 15 de Abril de 2026*  
*Versão: 1.0*  
*Sistema: Conecta Solutions - Painel Administrativo*
