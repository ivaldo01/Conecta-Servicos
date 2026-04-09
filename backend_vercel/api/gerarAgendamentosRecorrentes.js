/**
 * Cloud Function para gerar agendamentos mensais automaticamente
 * Deve ser chamada via cron job (ex: Vercel Cron) diariamente
 */

const admin = require('firebase-admin');

// Inicializar Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

/**
 * Verifica se hoje é o dia de gerar agendamentos para um contrato
 * Baseado na data de início do contrato
 */
function deveGerarAgendamentosHoje(contrato) {
  const hoje = new Date();
  const inicio = contrato.dataInicio?.toDate?.() || new Date(contrato.dataInicio);
  
  // Se for o primeiro mês, já foi gerado no ato da contratação
  if (isPrimeiroMes(contrato)) {
    return false;
  }
  
  // Verificar se já passou do dia de início do mês seguinte
  const proximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, inicio.getDate());
  
  // Se hoje é o dia de início do novo mês, ou próximo dele
  const diffDias = Math.floor((proximoMes - hoje) / (1000 * 60 * 60 * 24));
  
  // Gerar 1 dia antes do início do novo ciclo
  return diffDias <= 1 && diffDias >= -1;
}

function isPrimeiroMes(contrato) {
  const hoje = new Date();
  const inicio = contrato.dataInicio?.toDate?.() || new Date(contrato.dataInicio);
  return hoje.getMonth() === inicio.getMonth() && hoje.getFullYear() === inicio.getFullYear();
}

/**
 * Calcula as datas dos agendamentos baseado nos dias da semana definidos
 */
function calcularDatasAgendamentos(diasSemana, mesesAvanco = 1) {
  const datas = [];
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth() + mesesAvanco; // Próximo mês
  
  // Pegar o primeiro dia do mês alvo
  const primeiroDiaMes = new Date(ano, mes, 1);
  const ultimoDiaMes = new Date(ano, mes + 1, 0);
  
  // Para cada dia do mês
  for (let dia = 1; dia <= ultimoDiaMes.getDate(); dia++) {
    const data = new Date(ano, mes, dia);
    const diaSemana = data.getDay(); // 0 = Domingo, 1 = Segunda, etc.
    
    // Verificar se esse dia da semana está nos dias configurados
    const diaConfig = diasSemana.find(d => d.diaSemana === diaSemana);
    if (diaConfig) {
      datas.push({
        data: data,
        horaInicio: diaConfig.horaInicio,
        horaFim: diaConfig.horaFim
      });
    }
  }
  
  return datas;
}

/**
 * Gera os agendamentos para um contrato
 */
async function gerarAgendamentosContrato(contrato) {
  const batch = db.batch();
  const agendamentosRef = db.collection('agendamentos');
  const agendamentosIds = [];
  
  const datas = calcularDatasAgendamentos(contrato.plano.diasSemana, 1);
  
  // Limitar ao número de sessões por mês
  const sessoesPorMes = contrato.plano.sessoesPorMes || datas.length;
  const datasLimitadas = datas.slice(0, sessoesPorMes);
  
  let numeroSessao = (contrato.sessoesTotaisContrato || 0) + 1;
  
  for (const item of datasLimitadas) {
    const novoAgendamentoRef = agendamentosRef.doc();
    
    const agendamentoData = {
      clienteId: contrato.clienteId,
      clienteNome: contrato.clienteNome,
      profissionalId: contrato.profissionalId,
      colaboradorId: contrato.colaboradorId,
      clinicaId: contrato.clinicaId || null,
      
      dataAgendamento: admin.firestore.Timestamp.fromDate(item.data),
      horaInicio: item.horaInicio,
      horaFim: item.horaFim,
      
      servico: contrato.plano.nome,
      servicoId: contrato.planoId,
      
      status: 'agendado',
      statusPagamento: 'pago', // Já está pago pelo contrato
      
      // Vinculação ao contrato
      contratoId: contrato.id,
      tipoAgendamento: 'RECORRENTE',
      numeroSessaoContrato: numeroSessao,
      cicloMensal: contrato.cicloAtual + 1,
      
      // Metadados
      criadoEm: admin.firestore.FieldValue.serverTimestamp(),
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
      criadoPorCloudFunction: true,
    };
    
    batch.set(novoAgendamentoRef, agendamentoData);
    agendamentosIds.push(novoAgendamentoRef.id);
    numeroSessao++;
  }
  
  // Commit do batch
  await batch.commit();
  
  return {
    agendamentosIds,
    quantidade: datasLimitadas.length
  };
}

/**
 * Função principal - endpoint HTTP
 */
module.exports = async (req, res) => {
  // Verificar método
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  
  // Verificar autorização (opcional, mas recomendado)
  const authHeader = req.headers.authorization;
  const expectedToken = process.env.CRON_SECRET;
  
  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  try {
    console.log('[Cloud Function] Iniciando geração de agendamentos recorrentes...');
    
    // Buscar contratos ativos
    const contratosRef = db.collection('contratosRecorrentes');
    const snapshot = await contratosRef
      .where('status', 'in', ['ativo', 'trial'])
      .get();
    
    if (snapshot.empty) {
      console.log('[Cloud Function] Nenhum contrato ativo encontrado');
      return res.status(200).json({ 
        message: 'Nenhum contrato ativo para processar',
        processados: 0 
      });
    }
    
    const resultados = {
      processados: 0,
      agendamentosCriados: 0,
      erros: []
    };
    
    // Processar cada contrato
    for (const doc of snapshot.docs) {
      const contrato = { id: doc.id, ...doc.data() };
      
      try {
        // Verificar se deve gerar agendamentos hoje
        if (!deveGerarAgendamentosHoje(contrato)) {
          console.log(`[Cloud Function] Pulando contrato ${contrato.id} - não é hora de gerar`);
          continue;
        }
        
        // Verificar se já gerou agendamentos para o próximo mês
        const jaGerou = contrato.ultimaGeracaoAgendamentos?.toDate?.();
        const hoje = new Date();
        
        if (jaGerou && jaGerou.getMonth() === hoje.getMonth()) {
          console.log(`[Cloud Function] Contrato ${contrato.id} já tem agendamentos gerados este mês`);
          continue;
        }
        
        console.log(`[Cloud Function] Gerando agendamentos para contrato: ${contrato.id}`);
        
        // Gerar agendamentos
        const resultado = await gerarAgendamentosContrato(contrato);
        
        // Atualizar contrato
        await doc.ref.update({
          agendamentosIds: admin.firestore.FieldValue.arrayUnion(...resultado.agendamentosIds),
          sessoesTotaisContrato: admin.firestore.FieldValue.increment(resultado.quantidade),
          cicloAtual: admin.firestore.FieldValue.increment(1),
          sessoesRestantesMesAtual: resultado.quantidade,
          remarcacoesUsadasMes: 0, // Reset mensal
          ultimaGeracaoAgendamentos: admin.firestore.FieldValue.serverTimestamp(),
          atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Criar notificação para o cliente
        await db.collection('notificacoes').add({
          userId: contrato.clienteId,
          tipo: 'AGENDAMENTOS_GERADOS',
          titulo: 'Novas sessões agendadas!',
          mensagem: `Seu profissional ${contrato.profissionalNome} agendou ${resultado.quantidade} sessões para o próximo mês.`,
          contratoId: contrato.id,
          lida: false,
          criadoEm: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Criar notificação para o profissional
        await db.collection('notificacoes').add({
          userId: contrato.profissionalId,
          tipo: 'AGENDAMENTOS_GERADOS',
          titulo: 'Agendamentos gerados',
          mensagem: `${resultado.quantidade} agendamentos foram criados automaticamente para o cliente ${contrato.clienteNome}.`,
          contratoId: contrato.id,
          lida: false,
          criadoEm: admin.firestore.FieldValue.serverTimestamp()
        });
        
        resultados.processados++;
        resultados.agendamentosCriados += resultado.quantidade;
        
        console.log(`[Cloud Function] Contrato ${contrato.id}: ${resultado.quantidade} agendamentos criados`);
        
      } catch (error) {
        console.error(`[Cloud Function] Erro no contrato ${contrato.id}:`, error);
        resultados.erros.push({
          contratoId: contrato.id,
          erro: error.message
        });
      }
    }
    
    console.log('[Cloud Function] Processamento concluído:', resultados);
    
    return res.status(200).json({
      message: 'Processamento concluído',
      ...resultados
    });
    
  } catch (error) {
    console.error('[Cloud Function] Erro geral:', error);
    return res.status(500).json({
      error: 'Erro interno',
      message: error.message
    });
  }
};
