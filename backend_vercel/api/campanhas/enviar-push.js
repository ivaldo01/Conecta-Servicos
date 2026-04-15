// ============================================================
// API - Envio de Push Notifications (FCM)
// Endpoint: /api/campanhas/enviar-push
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
const messaging = admin.messaging();

module.exports = async (req, res) => {
  // CORS
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
    const { 
      titulo, 
      mensagem, 
      imagemUrl, 
      link,
      segmento,
      userIds, // Array específico de IDs
      data // Dados extras
    } = req.body;

    if (!titulo || !mensagem) {
      return res.status(400).json({ error: 'Título e mensagem são obrigatórios' });
    }

    let destinatarios = [];

    // Buscar tokens FCM
    if (userIds && userIds.length > 0) {
      // Enviar para usuários específicos
      for (const userId of userIds) {
        const tokensSnapshot = await db
          .collection('usuarios')
          .doc(userId)
          .collection('fcmTokens')
          .where('ativo', '==', true)
          .get();

        tokensSnapshot.forEach(doc => {
          destinatarios.push({
            userId,
            token: doc.data().token,
            platform: doc.data().platform || 'android'
          });
        });
      }
    } else if (segmento && segmento.length > 0) {
      // Enviar para segmento
      destinatarios = await getDestinatariosPush(segmento);
    } else {
      return res.status(400).json({ error: 'Defina userIds ou segmento' });
    }

    console.log(`[Push] Enviando para ${destinatarios.length} dispositivos`);

    // Enviar notificações em lotes (500 por vez - limite FCM)
    const resultados = await enviarPushEmLotes({
      titulo,
      mensagem,
      imagemUrl,
      link,
      data
    }, destinatarios);

    // Registrar campanha
    const campanhaRef = await db.collection('campanhasPush').add({
      titulo,
      mensagem,
      imagemUrl,
      link,
      segmento: segmento || [],
      userIds: userIds || [],
      status: 'concluida',
      metricas: {
        total: destinatarios.length,
        enviados: resultados.enviados,
        falhas: resultados.falhas,
        cliques: 0 // Atualizado quando usuário clicar
      },
      enviadoEm: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Log
    await db.collection('activityLogs').add({
      tipo: 'campanha_push_enviada',
      descricao: `Push "${titulo}" enviado para ${resultados.enviados} dispositivos`,
      userId: 'system',
      userNome: 'Sistema',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      metadata: {
        campanhaId: campanhaRef.id,
        titulo,
        total: destinatarios.length,
        enviados: resultados.enviados,
        falhas: resultados.falhas
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Push notifications enviados',
      campanhaId: campanhaRef.id,
      estatisticas: {
        total: destinatarios.length,
        enviados: resultados.enviados,
        falhas: resultados.falhas
      }
    });

  } catch (error) {
    console.error('[Enviar Push] Erro:', error);
    return res.status(500).json({
      error: 'Erro ao enviar push notifications',
      details: error.message
    });
  }
};

// Buscar tokens FCM por segmento
async function getDestinatariosPush(segmentos) {
  const destinatarios = [];

  for (const seg of segmentos) {
    let userQuery = db.collection('usuarios');

    switch (seg) {
      case 'clientes':
        userQuery = userQuery.where('tipo', '==', 'cliente');
        break;
      case 'profissionais':
        userQuery = userQuery.where('tipo', '==', 'profissional');
        break;
      case 'vip':
        userQuery = userQuery.where('planoAtivo', 'in', ['vip', 'conecta_vip']);
        break;
      case 'todos':
      default:
        break;
    }

    const usersSnapshot = await userQuery.get();

    for (const userDoc of usersSnapshot.docs) {
      const tokensSnapshot = await db
        .collection('usuarios')
        .doc(userDoc.id)
        .collection('fcmTokens')
        .where('ativo', '==', true)
        .get();

      tokensSnapshot.forEach(tokenDoc => {
        destinatarios.push({
          userId: userDoc.id,
          token: tokenDoc.data().token,
          platform: tokenDoc.data().platform || 'android'
        });
      });
    }
  }

  // Remover duplicados
  const unique = destinatarios.filter((v, i, a) => 
    a.findIndex(t => t.token === v.token) === i
  );

  return unique;
}

// Enviar push em lotes
async function enviarPushEmLotes(payload, destinatarios) {
  const resultados = { enviados: 0, falhas: 0 };
  const loteSize = 500; // Limite FCM

  for (let i = 0; i < destinatarios.length; i += loteSize) {
    const lote = destinatarios.slice(i, i + loteSize);
    
    const messages = lote.map(dest => ({
      token: dest.token,
      notification: {
        title: payload.titulo,
        body: payload.mensagem,
        imageUrl: payload.imagemUrl
      },
      data: {
        link: payload.link || '',
        tipo: 'campanha',
        ...payload.data
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'campanhas',
          sound: 'default'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    }));

    try {
      const response = await messaging.sendEach(messages);
      
      response.responses.forEach((resp, idx) => {
        if (resp.success) {
          resultados.enviados++;
        } else {
          resultados.falhas++;
          console.error(`[Push] Falha token ${lote[idx].token}:`, resp.error);
          
          // Se token inválido, desativar
          if (resp.error?.code === 'messaging/invalid-registration-token' ||
              resp.error?.code === 'messaging/registration-token-not-registered') {
            desativarToken(lote[idx].userId, lote[idx].token);
          }
        }
      });
    } catch (error) {
      console.error('[Push] Erro no lote:', error);
      resultados.falhas += lote.length;
    }
  }

  return resultados;
}

// Desativar token inválido
async function desativarToken(userId, token) {
  try {
    const tokensSnapshot = await db
      .collection('usuarios')
      .doc(userId)
      .collection('fcmTokens')
      .where('token', '==', token)
      .get();

    tokensSnapshot.forEach(async doc => {
      await doc.ref.update({ ativo: false });
    });
  } catch (error) {
    console.error('[Push] Erro ao desativar token:', error);
  }
}
