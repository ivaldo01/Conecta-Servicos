// ============================================================
// API - Envio de Campanhas de Email
// Endpoint: /api/campanhas/enviar-email
// ============================================================

const admin = require('firebase-admin');

// Inicializar Firebase Admin se não estiver inicializado
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

// Configuração do serviço de email (SendGrid ou nodemailer)
// Você precisa configurar SENDGRID_API_KEY ou SMTP_* no .env
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@conectaservicos.com.br';
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'Conecta Serviços';

module.exports = async (req, res) => {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { campanhaId } = req.body;

    if (!campanhaId) {
      return res.status(400).json({ error: 'ID da campanha é obrigatório' });
    }

    // Buscar campanha
    const campanhaRef = db.collection('campanhasEmail').doc(campanhaId);
    const campanhaDoc = await campanhaRef.get();

    if (!campanhaDoc.exists) {
      return res.status(404).json({ error: 'Campanha não encontrada' });
    }

    const campanha = campanhaDoc.data();

    // Verificar se já foi enviada
    if (campanha.status === 'concluida') {
      return res.status(400).json({ error: 'Campanha já foi concluída' });
    }

    if (campanha.status === 'enviando') {
      return res.status(400).json({ error: 'Campanha já está sendo enviada' });
    }

    // Atualizar status para "enviando"
    await campanhaRef.update({
      status: 'enviando',
      enviadoEm: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Buscar destinatários baseado no segmento
    const destinatarios = await getDestinatarios(campanha.segmento);

    console.log(`[Campanha ${campanhaId}] Enviando para ${destinatarios.length} destinatários`);

    // Atualizar métricas total
    await campanhaRef.update({
      'metricas.total': destinatarios.length
    });

    // Enviar emails em lotes (rate limiting)
    const resultados = await enviarEmailsEmLotes(campanha, destinatarios, campanhaRef);

    // Atualizar status para concluída
    await campanhaRef.update({
      status: 'concluida',
      'metricas.enviados': resultados.enviados,
      'metricas.falhas': resultados.falhas,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Log da atividade
    await db.collection('activityLogs').add({
      tipo: 'campanha_email_enviada',
      descricao: `Campanha "${campanha.titulo}" enviada para ${resultados.enviados} destinatários`,
      userId: 'system',
      userNome: 'Sistema',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      metadata: {
        campanhaId,
        totalDestinatarios: destinatarios.length,
        enviados: resultados.enviados,
        falhas: resultados.falhas
      }
    });

    return res.status(200).json({
      success: true,
      message: `Campanha enviada com sucesso`,
      estatisticas: {
        total: destinatarios.length,
        enviados: resultados.enviados,
        falhas: resultados.falhas
      }
    });

  } catch (error) {
    console.error('[Enviar Email] Erro:', error);
    
    // Atualizar status para erro
    if (req.body.campanhaId) {
      await db.collection('campanhasEmail').doc(req.body.campanhaId).update({
        status: 'erro',
        erro: error.message,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    return res.status(500).json({
      error: 'Erro ao enviar campanha',
      details: error.message
    });
  }
};

// Buscar destinatários baseado no segmento
async function getDestinatarios(segmentos) {
  const db = admin.firestore();
  let destinatarios = [];

  for (const segmento of segmentos) {
    let query = db.collection('usuarios');

    switch (segmento) {
      case 'clientes':
        query = query.where('tipo', '==', 'cliente');
        break;
      case 'profissionais':
        query = query.where('tipo', '==', 'profissional');
        break;
      case 'vip':
        query = query.where('planoAtivo', 'in', ['vip', 'conecta_vip', 'client_premium']);
        break;
      case 'ativos':
        // Últimos 30 dias
        const trintaDiasAtras = new Date();
        trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
        query = query.where('ultimoAcesso', '>=', trintaDiasAtras);
        break;
      case 'inativos':
        // Mais de 30 dias sem acesso
        const inativosData = new Date();
        inativosData.setDate(inativosData.getDate() - 30);
        query = query.where('ultimoAcesso', '<', inativosData);
        break;
      case 'novos':
        // Últimos 7 dias
        const seteDiasAtras = new Date();
        seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
        query = query.where('createdAt', '>=', seteDiasAtras);
        break;
      case 'todos':
      default:
        // Todos os usuários ativos
        query = query.where('status', '!=', 'inativo');
        break;
    }

    // Só usuários com email verificado
    query = query.where('emailVerificado', '==', true);

    const snapshot = await query.get();
    
    snapshot.forEach(doc => {
      const user = doc.data();
      if (user.email && !destinatarios.find(d => d.email === user.email)) {
        destinatarios.push({
          id: doc.id,
          email: user.email,
          nome: user.nome || user.nomeCompleto || 'Usuário',
          cidade: user.cidade || user.endereco?.cidade || '',
          tipo: user.tipo || 'cliente'
        });
      }
    });
  }

  return destinatarios;
}

// Enviar emails em lotes
async function enviarEmailsEmLotes(campanha, destinatarios, campanhaRef) {
  const resultados = { enviados: 0, falhas: 0 };
  const loteSize = 50; // Enviar 50 por vez
  const delayEntreLotes = 1000; // 1 segundo entre lotes

  for (let i = 0; i < destinatarios.length; i += loteSize) {
    const lote = destinatarios.slice(i, i + loteSize);
    
    const promessas = lote.map(async (destinatario) => {
      try {
        await enviarEmailIndividual(campanha, destinatario);
        resultados.enviados++;
        
        // Registrar envio
        await campanhaRef.collection('envios').add({
          userId: destinatario.id,
          email: destinatario.email,
          enviadoEm: admin.firestore.FieldValue.serverTimestamp(),
          status: 'enviado'
        });

      } catch (error) {
        console.error(`[Email] Erro ao enviar para ${destinatario.email}:`, error);
        resultados.falhas++;
        
        // Registrar falha
        await campanhaRef.collection('envios').add({
          userId: destinatario.id,
          email: destinatario.email,
          erro: error.message,
          enviadoEm: admin.firestore.FieldValue.serverTimestamp(),
          status: 'falha'
        });
      }
    });

    await Promise.all(promessas);

    // Delay entre lotes para não sobrecarregar
    if (i + loteSize < destinatarios.length) {
      await new Promise(resolve => setTimeout(resolve, delayEntreLotes));
    }

    // Atualizar progresso
    await campanhaRef.update({
      'metricas.enviados': resultados.enviados,
      'metricas.falhas': resultados.falhas
    });
  }

  return resultados;
}

// Enviar email individual
async function enviarEmailIndividual(campanha, destinatario) {
  // Personalizar conteúdo
  const conteudoPersonalizado = personalizarTemplate(
    campanha.conteudo,
    destinatario
  );

  const assuntoPersonalizado = personalizarTemplate(
    campanha.assunto,
    destinatario
  );

  // Usar SendGrid se disponível
  if (SENDGRID_API_KEY) {
    return await enviarViaSendGrid(
      destinatario.email,
      assuntoPersonalizado,
      conteudoPersonalizado
    );
  }

  // Fallback para SMTP (nodemailer)
  if (SMTP_HOST) {
    return await enviarViaSMTP(
      destinatario.email,
      assuntoPersonalizado,
      conteudoPersonalizado
    );
  }

  // Simulação (modo desenvolvimento)
  console.log(`[Simulação] Email para ${destinatario.email}`);
  console.log(`Assunto: ${assuntoPersonalizado}`);
  console.log('---');
  
  // Simular delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return { success: true };
}

// Personalizar template com variáveis
function personalizarTemplate(template, destinatario) {
  return template
    .replace(/\{\{nome\}\}/g, destinatario.nome)
    .replace(/\{\{cidade\}\}/g, destinatario.cidade || 'Sua Cidade')
    .replace(/\{\{categoria\}\}/g, 'Limpeza')
    .replace(/\{\{cupom\}\}/g, 'PROMO20')
    .replace(/\{\{data_validade\}\}/g, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'))
    .replace(/\{\{link_app\}\}/g, 'https://conectaservicos.com.br/app')
    .replace(/\{\{link_promocao\}\}/g, 'https://conectaservicos.com.br/promocoes')
    .replace(/\{\{dica\}\}/g, 'Agende serviços com antecedência!')
    .replace(/\{\{depoimento\}\}/g, '"Excelente serviço!" - Maria');
}

// Enviar via SendGrid
async function enviarViaSendGrid(to, subject, html) {
  // Implementação real requer @sendgrid/mail
  // npm install @sendgrid/mail
  
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(SENDGRID_API_KEY);

  const msg = {
    to,
    from: { email: EMAIL_FROM, name: EMAIL_FROM_NAME },
    subject,
    html,
    trackingSettings: {
      clickTracking: { enable: true },
      openTracking: { enable: true }
    }
  };

  await sgMail.send(msg);
  return { success: true };
}

// Enviar via SMTP (nodemailer)
async function enviarViaSMTP(to, subject, html) {
  // Implementação real requer nodemailer
  // npm install nodemailer
  
  const nodemailer = require('nodemailer');

  const transporter = nodemailer.createTransporter({
    host: SMTP_HOST,
    port: SMTP_PORT || 587,
    secure: (SMTP_PORT || 587) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: `"${EMAIL_FROM_NAME}" <${EMAIL_FROM}>`,
    to,
    subject,
    html,
  });

  return { success: true };
}
