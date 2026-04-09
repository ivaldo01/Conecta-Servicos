# Contratos Recorrentes - Estrutura Firestore

## Nova Coleção: `planosRecorrentes` (Profissional cria)

```javascript
{
  id: "plan_abc123",                    // Auto-gerado
  profissionalId: "uid_profissional",   // Dono do plano
  
  // Configuração do Plano
  nome: "Pacote Personal 8x",           // Nome exibido
  descricao: "8 sessões por mês",       // Descrição
  
  // Valor e Pagamento
  valorMensal: 400.00,                // Valor do pacote mensal
  
  // Configuração de Sessões
  sessoesPorMes: 8,                   // Quantidade de sessões incluídas
  duracaoMinutos: 60,                 // Duração de cada sessão
  
  // Horários Fixos (array)
  horariosFixos: [
    { diaSemana: 2, hora: "10:00" },   // 0=Dom, 1=Seg, 2=Ter...
    { diaSemana: 4, hora: "10:00" },   // Quinta
    // pode ter mais horários
  ],
  
  // Vigência do Contrato
  duracaoMinimaMeses: 3,              // Período mínimo de fidelidade
  renovacaoAutomatica: true,          // Renova após período mínimo?
  
  // Regras
  toleranciaRemarcacao: 2,            // Quantas remarcações permitidas/mês
  
  // Status
  ativo: true,
  criadoEm: timestamp,
  atualizadoEm: timestamp
}
```

## Nova Coleção: `contratosRecorrentes` (Cliente contrata)

```javascript
{
  id: "cont_xyz789",
  
  // Referências
  planoId: "plan_abc123",
  profissionalId: "uid_profissional",
  clienteId: "uid_cliente",
  
  // Status do Contrato
  status: "ATIVO",                    // ATIVO, PAGO, VENCIDO, CANCELADO, FINALIZADO
  
  // Ciclo Atual
  cicloAtual: 3,                      // Mês 3 do contrato
  totalCiclos: 3,                     // Se duracaoMinimaMeses=3, e está no ciclo 3
  proximaRenovacao: timestamp,        // Data da próxima cobrança
  
  // Controle de Sessões
  sessoesTotaisContrato: 24,          // 8 sessões x 3 meses
  sessoesRealizadas: 6,               // Já fez 6 sessões
  sessoesRestantesMesAtual: 2,        // Créditos deste mês
  remarcacoesUsadasMes: 1,            // Já remarcou 1x este mês
  
  // Horários Fixos Acordados (cópia do plano na contratação)
  horariosFixos: [
    { diaSemana: 2, hora: "10:00", proximaData: "2026-05-06" },
    { diaSemana: 4, hora: "10:00", proximaData: "2026-05-08" }
  ],
  
  // Agendamentos Gerados (referências)
  agendamentosIds: ["agd_1", "agd_2", "agd_3"],
  
  // Pagamento
  formaPagamento: "CARTAO_RECORRENTE", // ou "PIX_MANUAL", "BOLETO"
  asaasSubscriptionId: "sub_xxx",       // ID da assinatura Asaas
  ultimoPagamento: timestamp,
  proximoVencimento: timestamp,
  
  // Datas
  dataInicio: timestamp,              // Início do contrato
  dataFimPrevisto: timestamp,         // Fim do período mínimo
  
  criadoEm: timestamp,
  atualizadoEm: timestamp
}
```

## Coleção `agendamentos` (já existe - adaptação)

Adicionar campo `tipoAgendamento`:

```javascript
{
  // ... campos existentes ...
  tipoAgendamento: "RECORRENTE",      // "AVULSO" ou "RECORRENTE"
  contratoId: "cont_xyz789",          // Se for recorrente
  numeroSessaoContrato: 5,            // É a 5ª sessão do contrato
  cicloDoContrato: 2,                 // Mês 2 do contrato
  
  // Para remarcação
  remarcadoDe: "agd_original_id",     // Se foi remarcado, referência ao original
  remarcacaoNumero: 1,                // 1ª remarcação desta sessão
}
```

## Nova Coleção: `sessoesRemarcadas` (opcional - log)

```javascript
{
  id: "rem_123",
  contratoId: "cont_xyz789",
  agendamentoOriginalId: "agd_old",
  agendamentoNovoId: "agd_new",
  dataOriginal: timestamp,
  dataNova: timestamp,
  motivo: "Cliente solicitou",
  dataRemarcacao: timestamp
}
```

## Fluxos

### 1. Profissional Cria Plano
```
Tela: CriarPlanoRecorrenteScreen
↓
planosRecorrentes.add({...})
```

### 2. Cliente Contrata
```
Tela: ContratarPlanoScreen
↓
1. Verifica disponibilidade dos horários
2. Cria contratoRecorrente (status: PENDENTE_PAGAMENTO)
3. Chama Asaas para criar assinatura
4. Cliente paga (PIX/Cartão)
5. Webhook Asaas → atualiza status para ATIVO
6. Gera agendamentos do primeiro mês
```

### 3. Renovação Mensal Automática
```
Cloud Function (agendada diariamente):
↓
Para cada contrato com proximoVencimento = hoje:
  - Tenta cobrar via Asaas
  - Se sucesso: gera novos agendamentos próximo mês
  - Se falha: notifica cliente e profissional
```

### 4. Remarcação
```
Cliente solicita remarcação:
↓
1. Verifica se tem remarcações disponíveis
2. Sugere novos horários disponíveis
3. Cliente escolhe novo horário
4. Cancela agendamento antigo (mantém histórico)
5. Cria novo agendamento
6. Atualiza contador de remarcações
```

## Integração com Asaas

### Assinatura (Recorrente)
```javascript
// createSubscription já existe
// Precisamos adaptar para vincular ao contratoRecorrente

// No webhook.js, quando assinatura for confirmada:
// 1. Atualiza contratoRecorrente.status = "ATIVO"
// 2. Chama função para gerar agendamentos do mês
```

## Telas Necessárias

### Profissional:
1. **MeusPlanosRecorrentesScreen** - Lista planos criados
2. **CriarPlanoRecorrenteScreen** - Form para criar plano
3. **EditarPlanoRecorrenteScreen** - Editar valores/horários
4. **ContratosDoPlanoScreen** - Ver clientes contratados

### Cliente:
1. **PlanosDisponiveisScreen** - Ver planos do profissional
2. **ContratarPlanoScreen** - Contratar com pagamento
3. **MeusContratosScreen** - Gerenciar contratos ativos
4. **DetalheContratoScreen** - Ver sessões, remarcar

## Regras de Negócio Importantes

1. **Agendamentos avulsos** NÃO podem conflitar com horários de contratos recorrentes
2. Profissional pode ter **ambos**: agendamentos avulsos E planos recorrentes
3. Cliente pode ter **múltiplos contratos** com profissionais diferentes
4. Sessões não utilizadas em um mês **não acumulam** (use ou perca)
5. Cancelamento antes do período mínimo pode ter **multa** (configurável)
