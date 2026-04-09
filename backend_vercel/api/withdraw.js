const axios = require('axios');
const { db, admin } = require('../lib/firebaseAdmin'); // 'admin' necessário para serverTimestamp e increment

const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://www.asaas.com/api/v3';
const ASAAS_API_KEY = process.env.ASAAS_API_KEY;

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    const { valor, pixKey, pixKeyType, userId } = req.body;

    if (!valor || !pixKey || !userId) {
        return res.status(400).json({ error: 'Campos obrigatórios: valor, pixKey, userId' });
    }

    // pixKeyType aceita: CPF | CNPJ | EMAIL | PHONE | EVP
    const keyType = pixKeyType || 'CPF';

    try {
        console.log('[withdraw] Iniciando solicita ção de saque:', {
            userId,
            valor,
            pixKeyType: keyType,
        });

        // 1. Verificar saldo do profissional
        const saldoRef = db.collection('saldos').doc(userId);
        const userRef = db.collection('usuarios').doc(userId);
        
        const [saldoSnap, userSnap] = await Promise.all([
            saldoRef.get(),
            userRef.get()
        ]);

        const userData = userSnap.exists ? userSnap.data() : {};
        const planoAtivo = userData.planoAtivo || 'free';
        
        // Taxa de saque: R$ 2,00 para Free, R$ 0,00 para Premium
        const taxaSaque = planoAtivo === 'premium' ? 0 : 2.00;
        const valorTotalADebitar = valor + taxaSaque;

        let saldoAtual = 0;
        if (saldoSnap.exists) {
            const data = saldoSnap.data();
            saldoAtual = data.saldoDisponivel !== undefined ? data.saldoDisponivel : (data.valor || 0);
        }

        saldoAtual = Number(saldoAtual);

        if (saldoAtual < valorTotalADebitar) {
            console.warn('[withdraw] Saldo insuficiente para valor + taxa:', { saldoAtual, valorSolicitado: valor, taxaSaque });
            return res.status(400).json({ 
                error: `Saldo insuficiente. Valor: R$ ${valor.toFixed(2)} + Taxa de Saque (${planoAtivo}): R$ ${taxaSaque.toFixed(2)}. Total necessário: R$ ${valorTotalADebitar.toFixed(2)}`,
            });
        }

        const now = admin.firestore.FieldValue.serverTimestamp();

        // 3. Registrar o saque no Firestore
        const saqueDocRef = await db.collection('saques').add({
            userId,
            profissionalId: userId,
            valor,
            taxaAplicada: taxaSaque,
            planoNoMomento: planoAtivo,
            pixKey,
            pixKeyType: keyType,
            status: 'pendente',
            criadoEm: now,
        });

        const saqueId = saqueDocRef.id;

        // 4. Debitar o saldo (Valor solicitado + Taxa)
        await saldoRef.update({
            valor: admin.firestore.FieldValue.increment(-valorTotalADebitar),
            saldoDisponivel: admin.firestore.FieldValue.increment(-valorTotalADebitar),
            ultimoSaque: now,
            atualizadoEm: now
        });

        // 5. Opcional: Notificar o Suporte/Admin via Chat de Suporte
        try {
            const userSnap = await db.collection('usuarios').doc(userId).get();
            const userData = userSnap.data();
            const nomeUser = userData?.nome || 'Profissional';

            const chatRef = db.collection('suporte').doc(userId);
            const msgTexto = `📢 SOLICITAÇÃO DE SAQUE\n\nValor: R$ ${valor.toFixed(2)}\nChave Pix: ${pixKey}\nTipo: ${keyType}\nNome: ${nomeUser}`;

            await chatRef.set({
                userId: userId,
                nomeUsuario: nomeUser,
                fotoUsuario: userData?.foto || null,
                perfilUsuario: 'profissional',
                ultimaMensagem: msgTexto,
                dataUltimaMensagem: now,
                naoLidasAdmin: admin.firestore.FieldValue.increment(1),
                ativo: true,
                temSaquePendente: true
            }, { merge: true });

            await chatRef.collection('mensagens').add({
                texto: msgTexto,
                senderId: userId,
                createdAt: now,
                isSystem: true,
                tipo: 'saque',
                saqueId: saqueId, // Salvamos o ID aqui para facilitar a aprovação sem precisar de query
                valorSaque: valor
            });
        } catch (chatErr) {
            console.error('[withdraw] Erro ao notificar chat de suporte:', chatErr.message);
        }

        console.log('[withdraw] Saque registrado para processamento manual');

        return res.status(200).json({ success: true, message: 'Solicitação de saque enviada com sucesso. Aguarde o processamento manual.' });

    } catch (error) {
        console.error('[withdraw] Erro ao processar saque:', {
            userId,
            valor,
            errorMessage: error.message,
            axiosResponse: error.response?.data,
            axiosStatus: error.response?.status,
        });
        return res.status(error.response?.status || 500).json({
            error: error.response?.data?.errors?.[0]?.description || error.response?.data || error.message || 'Erro ao processar o saque',
        });
    }
};
