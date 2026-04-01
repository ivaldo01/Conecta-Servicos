const axios = require('axios');
const { db } = require('../lib/firebaseAdmin');

const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';
const ASAAS_API_KEY = process.env.ASAAS_API_KEY;

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    const { agendamentoId, valor, formaPagamento, descricao, cliente } = req.body;

    if (!agendamentoId || !valor || !formaPagamento) {
        return res.status(400).json({ error: 'Campos obrigatórios: agendamentoId, valor, formaPagamento' });
    }

    try {
        const agendamentoRef = db.collection('agendamentos').doc(agendamentoId);
        const agendamentoSnap = await agendamentoRef.get();

        if (!agendamentoSnap.exists) {
            return res.status(404).json({ error: 'Agendamento não encontrado' });
        }

        // Resolve o ID do cliente no Asaas
        let customerId;

        if (cliente?.idAsaas) {
            // Já tem ID do Asaas: usa direto
            customerId = cliente.idAsaas;
        } else if (cliente?.cpfCnpj || cliente?.email) {
            // Tem CPF/CNPJ ou e-mail: busca ou cria no Asaas
            customerId = await buscarOuCriarClienteAsaas(cliente);
        } else {
            return res.status(400).json({ error: 'Cliente precisa ter idAsaas, cpfCnpj ou email' });
        }

        // Validade da cobrança: 2 dias a partir de hoje
        const dueDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0];

        const bodyRequest = {
            customer: customerId,
            billingType: formaPagamento.toUpperCase(), // PIX | BOLETO | CREDIT_CARD
            value: valor,
            dueDate,
            description: descricao || `Agendamento #${agendamentoId}`,
            externalReference: agendamentoId, // chave para o webhook
        };

        const response = await axios.post(
            `${ASAAS_API_URL}/payments`,
            bodyRequest,
            { headers: { 'access_token': ASAAS_API_KEY } }
        );

        const paymentData = response.data;
        let qrCodeData = null;

        // Para Pix: busca QR Code imediatamente
        if (formaPagamento.toLowerCase() === 'pix') {
            const qrRes = await axios.get(
                `${ASAAS_API_URL}/payments/${paymentData.id}/pixQrCode`,
                { headers: { 'access_token': ASAAS_API_KEY } }
            );
            qrCodeData = qrRes.data;
        }

        return res.status(200).json({
            paymentId: paymentData.id,
            status: paymentData.status,
            invoiceUrl: paymentData.invoiceUrl,
            qrCode: qrCodeData?.encodedImage || null,
            copiaECola: qrCodeData?.payload || null,
        });

    } catch (error) {
        console.error('[createPayment] Erro:', error.response?.data || error.message);
        return res.status(error.response?.status || 500).json({
            error: error.response?.data || 'Erro interno no servidor',
        });
    }
};

async function buscarOuCriarClienteAsaas(cliente) {
    const params = new URLSearchParams();
    if (cliente.email) params.append('email', cliente.email);
    if (cliente.cpfCnpj) params.append('cpfCnpj', cliente.cpfCnpj);

    const searchRes = await axios.get(
        `${ASAAS_API_URL}/customers?${params.toString()}`,
        { headers: { 'access_token': ASAAS_API_KEY } }
    );

    if (searchRes.data?.data?.length > 0) {
        return searchRes.data.data[0].id;
    }

    const createRes = await axios.post(
        `${ASAAS_API_URL}/customers`,
        {
            name: cliente.nome,
            email: cliente.email,
            phone: cliente.telefone,
            cpfCnpj: cliente.cpfCnpj,
        },
        { headers: { 'access_token': ASAAS_API_KEY } }
    );

    return createRes.data.id;
}
