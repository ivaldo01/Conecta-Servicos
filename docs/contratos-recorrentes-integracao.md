# Contratos Recorrentes - Guia de Integração

## Resumo do que foi Implementado

O sistema de Contratos Recorrentes permite que profissionais (como personal trainers) ofereçam planos mensais com horários fixos, com pagamento automático e controle de sessões.

---

## Telas Criadas

### Para Profissionais

| Tela | Arquivo | Descrição |
|------|---------|-----------|
| Criar Plano | `CriarPlanoRecorrenteScreen.js` | Criar planos com dias/horários fixos, valor mensal, tolerância de remarcação |
| Meus Planos | `MeusPlanosRecorrentesScreen.js` | Listar, ativar/desativar e gerenciar planos criados |

### Para Clientes

| Tela | Arquivo | Descrição |
|------|---------|-----------|
| Ver Planos | `PlanosRecorrentesScreen.js` | Visualizar planos disponíveis do profissional |
| Contratar | `PlanosRecorrentesScreen.js` | Contratar plano com pagamento (PIX/Cartão) |
| Meus Contratos | `MeusContratosScreen.js` | Gerenciar contratos ativos, ver sessões restantes, cancelar |
| Remarcar | `RemarcarSessaoScreen.js` | Remarcar sessões específicas com verificação de disponibilidade |

---

## Backend Criado

### Cloud Function

**Arquivo**: `backend_vercel/api/gerarAgendamentosRecorrentes.js`

Função que gera automaticamente os agendamentos mensais para contratos ativos:
- Roda diariamente (configurado no `vercel.json`)
- Processa contratos com status `ativo` ou `trial`
- Cria agendamentos para o próximo mês baseado nos dias/horários definidos
- Reseta contador de remarcações mensais
- Envia notificações para cliente e profissional

### Configuração Cron

```json
{
  "crons": [
    {
      "path": "/api/gerarAgendamentosRecorrentes",
      "schedule": "0 1 * * *"
    }
  ]
}
```

---

## Estrutura Firestore

### Coleções

```
planosRecorrentes/{planoId}
├── profissionalId, clinicaId
├── nome, descricao
├── sessoesPorMes, duracaoMinutos
├── valorMensal
├── diasSemana: [{diaSemana, horaInicio, horaFim}]
├── periodoFidelidadeMeses, toleranciaRemarcacao
├── ativo, criadoEm

contratosRecorrentes/{contratoId}
├── clienteId, clienteNome
├── profissionalId, profissionalNome
├── planoId, plano: {nome, sessoesPorMes, ...}
├── status: 'ativo' | 'trial' | 'cancelado' | 'suspenso'
├── dataInicio, cicloAtual
├── agendamentosIds[]
├── sessoesRestantesMesAtual
├── remarcacoesUsadasMes
├── cicloFaturamento, proximaCobranca
├── asaasSubscriptionId, asaasClienteId
└── criadoEm, atualizadoEm

sessoesRemarcadas/{remarcacaoId}
├── contratoId, agendamentoOriginalId, agendamentoNovoId
├── clienteId, profissionalId
├── dataOriginal, dataNova, horaOriginal, horaNova
├── remarcacaoNumero, dataRemarcacao
```

---

## Fluxos Principais

### 1. Profissional Cria Plano

```
MeusPlanosRecorrentes → CriarPlanoRecorrente 
→ Define nome, valor, sessões/mês
→ Configura dias/horários fixos
→ Define tolerância de remarcação
→ Salva em planosRecorrentes
```

### 2. Cliente Contrata Plano

```
PerfilPublicoProfissional → PlanosRecorrentes
→ Seleciona plano
→ Escolhe método de pagamento (PIX/Cartão)
→ Cria contrato em contratosRecorrentes
→ Primeira cobrança via Asaas
→ Agendamentos do primeiro mês gerados
→ Retorna para MeusContratos
```

### 3. Geração Mensal Automática

```
Cron Job (1h da manhã)
→ Busca contratos ativos
→ Verifica se é dia de renovação
→ Gera agendamentos próximo mês
→ Reseta contadores
→ Notifica cliente e profissional
```

### 4. Cliente Remarca Sessão

```
MeusContratos → Seleciona contrato
→ Ver sessões disponíveis
→ Escolhe sessão para remarcar
→ RemarcarSessaoScreen
→ Seleciona nova data/hora
→ Verifica disponibilidade
→ Cancela agendamento antigo
→ Cria novo agendamento
→ Atualiza contador de remarcações
```

### 5. Cliente Cancela Contrato

```
MeusContratos → Detalhes do contrato
→ Botão Cancelar Contrato
→ Verifica período de fidelidade
→ Se dentro do período: alerta de multa
→ Confirmação
→ Atualiza status para 'cancelado'
→ Cancela agendamentos futuros pendentes
```

---

## Integração com Asaas (Pendente)

### Criar Assinatura Recorrente

```javascript
// Na tela PlanosRecorrentesScreen, método contratarComCartao()
// Já implementado - cria subscription no Asaas
```

### Webhook para Renovações

O webhook atual (`webhook.js`) precisa ser atualizado para:

1. **Identificar pagamentos recorrentes** de contratos
2. **Atualizar status** do contrato para renovado
3. **Gerar próximos agendamentos** se ainda não foram gerados
4. **Notificar** cliente e profissional sobre renovação

### Exemplo de código para webhook:

```javascript
// Adicionar no webhook.js, no bloco PAYMENT_RECEIVED
if (payment.subscription) {
  // Buscar contrato pela subscription
  const contratosSnap = await db.collection('contratosRecorrentes')
    .where('asaasSubscriptionId', '==', payment.subscription)
    .limit(1)
    .get();
  
  if (!contratosSnap.empty) {
    const contratoDoc = contratosSnap.docs[0];
    
    // Atualizar contrato
    await contratoDoc.ref.update({
      'status': 'ativo',
      'ultimaCobrancaConfirmada': admin.firestore.FieldValue.serverTimestamp(),
      'proximaCobranca': payment.dueDate,
      'cicloAtual': admin.firestore.FieldValue.increment(1)
    });
    
    // Gerar agendamentos se necessário...
  }
}
```

---

## Pendências para Integração Completa

1. **Webhook de Renovação**: Atualizar webhook para processar cobranças recorrentes de contratos
2. **Configurar Cron**: Fazer deploy do backend_vercel com `vercel --prod`
3. **Testar Fluxo**: Criar plano → contratar → verificar geração de agendamentos
4. **Notificações Push**: Implementar envio de notificações para novos agendamentos

---

## Comandos para Deploy

```bash
cd backend_vercel
vercel --prod
```

---

## Telas de Acesso

### Profissional
```javascript
// A partir do perfil profissional
navigation.navigate('CriarPlanoRecorrente');
navigation.navigate('MeusPlanosRecorrentes');
```

### Cliente
```javascript
// A partir do perfil público do profissional
navigation.navigate('PlanosRecorrentes', { 
  profissionalId, 
  profissionalNome, 
  clinicaId 
});

// Menu do cliente
navigation.navigate('MeusContratos');
```

---

## Próximos Passos

1. **Testar** o fluxo completo localmente
2. **Deploy** do backend para Vercel
3. **Integrar** telas nos menus de navegação
4. **Testar** pagamento com Asaas em sandbox
5. **Verificar** geração automática de agendamentos
