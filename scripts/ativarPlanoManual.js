// Script para ativar plano manualmente no Firestore
// Uso: node scripts/ativarPlanoManual.js <USER_ID> [PLANO_ID]

const admin = require('firebase-admin');

// Inicializar Firebase Admin (precisa do serviceAccountKey.json)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require('../serviceAccountKey.json'))
  });
}

const db = admin.firestore();

async function ativarPlanoManual(userId, planoId = 'pro_empresa') {
  try {
    console.log(`[Ativar Plano] User: ${userId}, Plano: ${planoId}`);

    // Verificar se usuário existe
    const userRef = db.collection('usuarios').doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      console.error(`❌ Usuário ${userId} não encontrado!`);
      process.exit(1);
    }

    const userData = userSnap.data();
    console.log(`👤 Usuário: ${userData.nome || userData.email || userId}`);
    console.log(`📋 Plano atual: ${userData.planoAtivo || 'free'}`);

    // Atualizar documento do usuário
    await userRef.update({
      planoAtivo: 'premium',
      planoId: planoId,
      assinaturaAtiva: true,
      dataAssinatura: admin.firestore.FieldValue.serverTimestamp(),
      ativadoManualmente: true,
      ativadoEm: admin.firestore.FieldValue.serverTimestamp()
    });

    // Criar registro na coleção assinaturas (opcional, para histórico)
    const assinaturaRef = db.collection('assinaturas').doc();
    await assinaturaRef.set({
      userId: userId,
      planoId: planoId,
      status: 'ACTIVE',
      valor: 0, // Ativação manual
      billingType: 'MANUAL',
      criadoEm: admin.firestore.FieldValue.serverTimestamp(),
      ativadoManualmente: true,
      observacao: 'Ativacao manual via script'
    });

    console.log('✅ Plano ativado com sucesso!');
    console.log(`   planoAtivo: premium`);
    console.log(`   planoId: ${planoId}`);
    console.log(`   assinaturaAtiva: true`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao ativar plano:', error.message);
    process.exit(1);
  }
}

// Executar se chamado via CLI
const userId = process.argv[2];
const planoId = process.argv[3] || 'pro_empresa';

const planosValidos = ['pro_empresa', 'pro_franquia', 'pro_profissional', 'pro_iniciante'];

if (!userId) {
  console.log('❌ Uso: node scripts/ativarPlanoManual.js <USER_ID> [PLANO_ID]');
  console.log('   PLANO_ID opcional (padrão: pro_empresa)');
  console.log('   Planos válidos:', planosValidos.join(', '));
  process.exit(1);
}

if (planoId && !planosValidos.includes(planoId)) {
  console.log('❌ Plano inválido. Planos válidos:', planosValidos.join(', '));
  process.exit(1);
}

ativarPlanoManual(userId, planoId);
