// ============================================================
// API - Automações de Campanhas (Triggers)
// Endpoint: /api/campanhas/automatizacoes
// 
// Dispara automaticamente:
// - Boas-vindas (novo cadastro)
// - Aniversário
// - Reativação (usuário inativo)
// - Pós-agendamento
// - Pós-pagamento
// - Abandono de carrinho
// ============================================================

const admin = require('firebase-admin');

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

// Configurações de automações
const AUTOMACOES = {
  boasVindas: {
    id: 'boas-vindas',
    nome: 'Boas-vindas',
    tipo: 'email',
    delay: 0, // Imediato
    assunto: '🎉 Bem-vindo ao Conecta Serviços!',
    template: 'boas-vindas',
    ativo: true
  },
  aniversario: {
    id: 'aniversario',
    nome: 'Aniversário',
    tipo: 'email_push',
    horario: '09:00', // Enviar às 9h
    assunto: '🎂 Feliz Aniversário! Temos um presente para você',
    template: 'aniversario',
    ativo: true
  },
  reativacao7dias: {
    id: 'reativacao-7dias',
    nome: 'Reativação - 7 dias',
    tipo: 'email',
    delay: 7 * 24 * 60 * 60 * 1000, // 7 dias
    assunto: '🥺 Sentimos sua falta! Volte para o Conecta',
    template: 'reativacao',
    ativo: true
  },
  reativacao30dias: {
    id: 'reativacao-30dias',
    nome: 'Reativação - 30 dias',
    tipo: 'email_push',
    delay: 30 * 24 * 60 * 60 * 1000, // 30 dias
    assunto: '🎁 Oferta especial para você voltar',
    template: 'reativacao-oferta',
    ativo: true
  },
  posAgendamento: {
    id: 'pos-agendamento',
    nome: 'Pós-agendamento',
    tipo: 'email',
    delay: 60 * 60 * 1000, // 1 hora após
    assunto: '✅ Seu agendamento foi confirmado!',
    template: 'confirmacao-agendamento',
    ativo: true
  },
  posServico: {
    id: 'pos-servico',
    nome: 'Pós-serviço',
    tipo: 'email_push',
    delay: 24 * 60 * 60 * 1000, // 1 dia após
    assunto: '🌟 Como foi seu atendimento?',
    template: 'avaliacao-servico',
    ativo: true
  },
  posPagamento: {
    id: 'pos-pagamento',
    nome: 'Pós-pagamento',
    tipo: 'email',
    delay: 30 * 60 * 1000, // 30 min após
    assunto: '🧾 Pagamento confirmado',
    template: 'comprovante-pagamento',
    ativo: true
  }
};

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    switch (req.method) {
      case 'GET':
        // Listar automações
        return res.status(200).json({
          automacoes: AUTOMACOES,
          message: 'Automações disponíveis'
        });

      case 'POST':
        // Disparar automação manualmente ou processar trigger
        const { action, tipo, userId, dados } = req.body;

        switch (action) {
          case 'trigger':
            // Disparar automação específica
            await dispararAutomacao(tipo, userId, dados);
            return res.status(200).json({ success: true, message: 'Automação disparada' });

          case 'processar-pendentes':
            // Processar todas as automações pendentes (cron job)
            const resultados = await processarPendentes();
            return res.status(200).json({ success: true, resultados });

          case 'verificar-aniversarios':
            // Verificar aniversariantes do dia
            const aniversariantes = await verificarAniversarios();
            return res.status(200).json({ success: true, aniversariantes });

          default:
            return res.status(400).json({ error: 'Ação não reconhecida' });
        }

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('[Automações] Erro:', error);
    return res.status(500).json({
      error: 'Erro no processamento',
      details: error.message
    });
  }
};

// Disparar automação específica
async function dispararAutomacao(tipo, userId, dados) {
  const config = AUTOMACOES[tipo];
  if (!config || !config.ativo) {
    throw new Error(`Automação ${tipo} não encontrada ou inativa`);
  }

  // Buscar usuário
  const userDoc = await db.collection('usuarios').doc(userId).get();
  if (!userDoc.exists) {
    throw new Error('Usuário não encontrado');
  }

  const usuario = userDoc.data();

  // Verificar se já enviou recentemente (evitar spam)
  const jaEnviou = await verificarEnvioRecente(tipo, userId);
  if (jaEnviou) {
    console.log(`[Automação] ${tipo} já enviado para ${userId} recentemente`);
    return { skipped: true, reason: 'already_sent' };
  }

  // Registrar envio
  await db.collection('automacoesEnviadas').add({
    tipo,
    userId,
    enviadoEm: admin.firestore.FieldValue.serverTimestamp(),
    dados
  });

  // Disparar email
  if (config.tipo === 'email' || config.tipo === 'email_push') {
    await enviarEmailAutomacao(config, usuario, dados);
  }

  // Disparar push
  if (config.tipo === 'push' || config.tipo === 'email_push') {
    await enviarPushAutomacao(config, usuario, dados);
  }

  console.log(`[Automação] ${tipo} disparado para ${usuario.nome || userId}`);

  return { success: true };
}

// Agendar automação para o futuro
async function agendarAutomacao(tipo, userId, dados, delayMs) {
  const agendamento = {
    tipo,
    userId,
    dados,
    agendadoPara: admin.firestore.Timestamp.fromMillis(Date.now() + delayMs),
    status: 'pendente',
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await db.collection('automacoesAgendadas').add(agendamento);
}

// Processar automações agendadas pendentes
async function processarPendentes() {
  const agora = admin.firestore.Timestamp.now();
  
  const pendentes = await db
    .collection('automacoesAgendadas')
    .where('status', '==', 'pendente')
    .where('agendadoPara', '<=', agora)
    .limit(100)
    .get();

  const resultados = { processados: 0, erros: 0 };

  for (const doc of pendentes.docs) {
    const agendamento = doc.data();
    
    try {
      await dispararAutomacao(agendamento.tipo, agendamento.userId, agendamento.dados);
      
      // Marcar como processado
      await doc.ref.update({
        status: 'processado',
        processadoEm: admin.firestore.FieldValue.serverTimestamp()
      });
      
      resultados.processados++;
    } catch (error) {
      console.error(`[Automações] Erro ao processar ${doc.id}:`, error);
      
      await doc.ref.update({
        status: 'erro',
        erro: error.message
      });
      
      resultados.erros++;
    }
  }

  return resultados;
}

// Verificar aniversariantes do dia
async function verificarAniversarios() {
  const hoje = new Date();
  const dia = hoje.getDate();
  const mes = hoje.getMonth() + 1;

  const aniversariantes = await db
    .collection('usuarios')
    .where('dataNascimento', '!=', null)
    .get();

  const paraEnviar = [];

  aniversariantes.forEach(doc => {
    const user = doc.data();
    if (user.dataNascimento) {
      const dataNasc = user.dataNascimento.toDate ? 
        user.dataNascimento.toDate() : 
        new Date(user.dataNascimento);
      
      if (dataNasc.getDate() === dia && (dataNasc.getMonth() + 1) === mes) {
        paraEnviar.push({
          userId: doc.id,
          nome: user.nome,
          email: user.email
        });

        // Disparar automação
        dispararAutomacao('aniversario', doc.id, {
          idade: hoje.getFullYear() - dataNasc.getFullYear()
        });
      }
    }
  });

  return paraEnviar;
}

// Verificar se já enviou recentemente
async function verificarEnvioRecente(tipo, userId) {
  // Boas-vindas: apenas 1x na vida
  if (tipo === 'boasVindas') {
    const envios = await db
      .collection('automacoesEnviadas')
      .where('tipo', '==', tipo)
      .where('userId', '==', userId)
      .limit(1)
      .get();
    return !envios.empty;
  }

  // Aniversário: apenas 1x por ano
  if (tipo === 'aniversario') {
    const umAnoAtras = admin.firestore.Timestamp.fromMillis(
      Date.now() - 365 * 24 * 60 * 60 * 1000
    );
    const envios = await db
      .collection('automacoesEnviadas')
      .where('tipo', '==', tipo)
      .where('userId', '==', userId)
      .where('enviadoEm', '>=', umAnoAtras)
      .limit(1)
      .get();
    return !envios.empty;
  }

  // Outros: máximo 1x a cada 7 dias
  const seteDiasAtras = admin.firestore.Timestamp.fromMillis(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  );
  const envios = await db
    .collection('automacoesEnviadas')
    .where('tipo', '==', tipo)
    .where('userId', '==', userId)
    .where('enviadoEm', '>=', seteDiasAtras)
    .limit(1)
    .get();
  return !envios.empty;
}

// Enviar email de automação
async function enviarEmailAutomacao(config, usuario, dados) {
  // Implementação similar ao enviar-email.js
  // Mas com templates específicos de automação
  
  const templates = {
    'boas-vindas': {
      assunto: config.assunto,
      html: `<h1>Olá, ${usuario.nome}!</h1>
             <p>Seja muito bem-vindo ao <strong>Conecta Serviços</strong>! 🎉</p>
             <p>Estamos felizes em ter você conosco.</p>
             <p>Com nossa plataforma, você pode:</p>
             <ul>
               <li>Encontrar os melhores profissionais</li>
               <li>Agendar serviços com facilidade</li>
               <li>Pagar com segurança</li>
             </ul>
             <a href="https://conectaservicos.com.br/app" style="background:#3B82F6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">
               Começar Agora
             </a>`
    },
    'aniversario': {
      assunto: config.assunto,
      html: `<h1>🎂 Feliz Aniversário, ${usuario.nome}!</h1>
             <p>Parabéns pelos seus ${dados.idade} anos!</p>
             <p>Preparamos um presente especial para você:</p>
             <div style="background:#F3F4F6;padding:20px;border-radius:8px;text-align:center;margin:20px 0;">
               <h2 style="color:#3B82F6;margin:0;">20% OFF</h2>
               <p>Em qualquer serviço!</p>
               <code style="font-size:20px;font-weight:bold;">PARABENS${dados.idade}</code>
             </div>
             <p>Válido por 7 dias. Aproveite! 🎁</p>`
    },
    'reativacao': {
      assunto: config.assunto,
      html: `<h1>Sentimos sua falta, ${usuario.nome}! 🥺</h1>
             <p>Percebemos que você não usa o Conecta Serviços há algum tempo.</p>
             <p><strong>Sua conta está esperando por você!</strong></p>
             <p>Que tal agendar um serviço hoje?</p>
             <a href="https://conectaservicos.com.br/app" style="background:#8B5CF6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">
               Voltar ao App
             </a>`
    },
    'confirmacao-agendamento': {
      assunto: config.assunto,
      html: `<h1>✅ Agendamento Confirmado!</h1>
             <p>Olá, ${usuario.nome}!</p>
             <p>Seu agendamento foi confirmado com sucesso.</p>
             <p><strong>Detalhes:</strong></p>
             <p>Serviço: ${dados.servicoNome || 'Serviço'}</p>
             <p>Data: ${dados.data}</p>
             <p>Horário: ${dados.horario}</p>
             <p>Profissional: ${dados.profissionalNome}</p>`
    }
  };

  const template = templates[config.template] || templates['boas-vindas'];

  // Aqui você integraria com seu serviço de email
  // sendEmail(usuario.email, template.assunto, template.html);
  
  console.log(`[Email Automação] ${config.template} → ${usuario.email}`);
  
  return { success: true };
}

// Enviar push de automação
async function enviarPushAutomacao(config, usuario, dados) {
  const mensagens = {
    'boas-vindas': {
      titulo: '🎉 Bem-vindo!',
      corpo: `${usuario.nome}, seu cadastro foi confirmado!`
    },
    'aniversario': {
      titulo: '🎂 Feliz Aniversário!',
      corpo: `Temos um presente especial para você, ${usuario.nome}!`
    },
    'reativacao': {
      titulo: '🥺 Sentimos sua falta',
      corpo: 'Volte para o Conecta Serviços!'
    },
    'avaliacao-servico': {
      titulo: '🌟 Como foi?',
      corpo: 'Avalie seu último atendimento'
    }
  };

  const msg = mensagens[config.template] || mensagens['boas-vindas'];

  // Aqui você integraria com FCM
  // sendPushNotification(usuario.id, msg.titulo, msg.corpo);
  
  console.log(`[Push Automação] ${config.template} → ${usuario.nome}`);
  
  return { success: true };
}

// Webhooks para serem chamados em eventos do app
module.exports.webhooks = {
  // Chamar quando novo usuário se cadastrar
  onNovoUsuario: async (userId, dados) => {
    // Boas-vindas imediata
    await dispararAutomacao('boasVindas', userId, dados);
    
    // Agendar reativação para 7 dias
    await agendarAutomacao('reativacao7dias', userId, {}, 7 * 24 * 60 * 60 * 1000);
    
    // Agendar reativação para 30 dias
    await agendarAutomacao('reativacao30dias', userId, {}, 30 * 24 * 60 * 60 * 1000);
  },

  // Chamar quando usuário fizer agendamento
  onAgendamento: async (userId, agendamento) => {
    await dispararAutomacao('posAgendamento', userId, {
      servicoNome: agendamento.servicoNome,
      data: agendamento.data,
      horario: agendamento.horario,
      profissionalNome: agendamento.profissionalNome
    });
  },

  // Chamar quando serviço for concluído
  onServicoConcluido: async (userId, servico) => {
    // Agendar avaliação para 1 dia depois
    await agendarAutomacao('posServico', userId, {
      servicoNome: servico.nome,
      profissionalNome: servico.profissionalNome
    }, 24 * 60 * 60 * 1000);
  },

  // Chamar quando pagamento for confirmado
  onPagamento: async (userId, pagamento) => {
    await dispararAutomacao('posPagamento', userId, {
      valor: pagamento.valor,
      servico: pagamento.servicoNome
    });
  }
};
