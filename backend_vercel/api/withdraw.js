const axios = require('axios');
const { db, admin } = require('../lib/firebaseAdmin'); // 'admin' necessário para serverTimestamp e increment

const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';
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
        const saldoSnap = await saldoRef.get();

        if (!saldoSnap.exists) {
            console.error('[withdraw] Saldo não encontrado para usuário:', userId);
            return res.status(404).json({ error: 'Saldo não encontrado para este usuário' });
        }

        const saldoAtual = saldoSnap.data()?.valor || 0;

        if (saldoAtual < valor) {
            console.warn('[withdraw] Saldo insuficiente:', { saldoAtual, valorSolicitado: valor });
            return res.status(400).json({ error: `Saldo insuficiente. Disponível: R$ ${saldoAtual.toFixed(2)}` });
        }

        // 2. Solicitar transferência Pix no Asaas
        console.log('[withdraw] Enviando solicitação de transferência ao Asaas');
        const response = await axios.post(
            `${ASAAS_API_URL}/transfers`,
            {
                value: valor,
                operationType: 'PIX',
                bankAccount: {
                    pixAddressKey: pixKey,
                    pixAddressKeyType: keyType,
                },
            },
            { headers: { 'access_token': ASAAS_API_KEY } }
        );

        console.log('[withdraw] Transferência criada com sucesso:', response.data.id);

        const now = admin.firestore.FieldValue.serverTimestamp();

        // 3. Registrar o saque no Firestore
        await db.collection('saques').add({
            userId,
            profissionalId: userId,
            valor,
            pixKey,
            pixKeyType: keyType,
            status: 'solicitado',
            gatewayTransferId: response.data.id,
            criadoEm: now,
        });

        // 4. Debitar o saldo
        await saldoRef.update({
            valor: admin.firestore.FieldValue.increment(-valor),
            ultimoSaque: now,
        });

        console.log('[withdraw] Saque processado com sucesso');

        return res.status(200).json({ success: true, transferId: response.data.id });

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
