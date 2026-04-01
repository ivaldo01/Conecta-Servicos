// backend_vercel/api/createPayment.js
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
        return res.status(400).json({ error: 'Faltam campos obrigatórios' });
    }

    try {
        // 1. Verificar se o agendamento existe e o status atual
        const agendamentoRef = db.collection('agendamentos').doc(agendamentoId);
        const agendamentoSnap = await agendamentoRef.get();

        if (!agendamentoSnap.exists()) {
            return res.status(404).json({ error: 'Agendamento não encontrado' });
        }

        // 2. Montar o corpo da requisição para o Asaas
        // Na criação do pagamento, enviamos o ID do agendamento como externalReference
        const bodyRequest = {
            billingType: formaPagamento.toUpperCase(), // PIX, BOLETO, CREDIT_CARD
            value: valor,
            dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 dias de validade
            description: descricao,
            customer: cliente.cpfCnpj ? undefined : await buscarOuCriarClienteAsaas(cliente), // Busca ou cria cliente se não tiver dados
            externalReference: agendamentoId, // CHAVE PARA O WEBHOOK
        };

        // Se o cliente já for um ID do Asaas
        if (cliente.idAsaas) {
            bodyRequest.customer = cliente.idAsaas;
        } else if (cliente.cpfCnpj) {
            // Se tiver CPF/CNPJ, criamos/buscamos no Asaas antes
            bodyRequest.customer = await buscarOuCriarClienteAsaas(cliente);
        }

        // 3. Chamar API do Asaas para criar a cobrança
        const response = await axios.post(`${ASAAS_API_URL}/payments`, bodyRequest, {
            headers: { 'access_token': ASAAS_API_KEY }
        });

        const paymentData = response.data;
        let qrCodeData = null;

        // Se for Pix, precisamos buscar o QR Code
        if (formaPagamento.toLowerCase() === 'pix') {
            const qrCodeResponse = await axios.get(`${ASAAS_API_URL}/payments/${paymentData.id}/pixQrCode`, {
                headers: { 'access_token': ASAAS_API_KEY }
            });
            qrCodeData = qrCodeResponse.data;
        }

        // 4. Retornar dados para o frontend
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
            error: error.response?.data || 'Erro interno no servidor'
        });
    }
};

async function buscarOuCriarClienteAsaas(cliente) {
    // Tenta buscar por CPF/CNPJ ou Email
    const searchUrl = `${ASAAS_API_URL}/customers?email=${cliente.email || ''}&cpfCnpj=${cliente.cpfCnpj || ''}`;
    const searchResponse = await axios.get(searchUrl, {
        headers: { 'access_token': ASAAS_API_KEY }
    });

    if (searchResponse.data.data.length > 0) {
        return searchResponse.data.data[0].id;
    }

    // Se não achar, cria novo
    const createResponse = await axios.post(`${ASAAS_API_URL}/customers`, {
        name: cliente.nome,
        email: cliente.email,
        phone: cliente.telefone,
        cpfCnpj: cliente.cpfCnpj
    }, {
        headers: { 'access_token': ASAAS_API_KEY }
    });

    return createResponse.data.id;
}