// backend_vercel/api/withdraw.js
const axios = require('axios');
const { db } = require('../lib/firebaseAdmin');

const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';
const ASAAS_API_KEY = process.env.ASAAS_API_KEY;

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    const { valor, pixKey, userId } = req.body;

    if (!valor || !pixKey || !userId) {
        return res.status(400).json({ error: 'Faltam campos obrigatórios (valor, pixKey, userId)' });
    }

    try {
        // 1. Verificar saldo do profissional no Firestore
        const saldoRef = db.collection('saldos').doc(userId);
        const saldoSnap = await saldoRef.get();

        if (!saldoSnap.exists()) {
            return res.status(404).json({ error: 'Saldo não encontrado' });
        }

        const saldoAtual = saldoSnap.data().valor || 0;

        if (saldoAtual < valor) {
            return res.status(400).json({ error: 'Saldo insuficiente' });
        }

        // 2. Chamar API do Asaas para solicitar transferência via Pix
        // Nota: O Asaas exige que o Pix seja enviado para uma chave do CPF do titular da conta
        const response = await axios.post(`${ASAAS_API_URL}/transfers`, {
            value: valor,
            bankAccount: {
                pixAddressKey: pixKey,
                pixAddressKeyType: 'CPF' // Ajuste conforme necessário (EMAIL, PHONE, CPF, CNPJ, EVP)
            },
            operationType: 'PIX'
        }, {
            headers: { 'access_token': ASAAS_API_KEY }
        });

        // 3. Registrar o saque no Firestore
        await db.collection('saques').add({
            userId: userId,
            valor: valor,
            pixKey: pixKey,
            status: 'concluido',
            gatewayTransferId: response.data.id,
            criadoEm: admin.firestore.FieldValue.serverTimestamp()
        });

        // 4. Atualizar o saldo disponível
        await saldoRef.update({
            valor: admin.firestore.FieldValue.increment(-valor),
            ultimoSaque: admin.firestore.FieldValue.serverTimestamp()
        });

        return res.status(200).json({ success: true, transferId: response.data.id });

    } catch (error) {
        console.error('[withdraw] Erro:', error.response?.data || error.message);
        return res.status(error.response?.status || 500).json({
            error: error.response?.data || 'Erro ao processar o saque'
        });
    }
};