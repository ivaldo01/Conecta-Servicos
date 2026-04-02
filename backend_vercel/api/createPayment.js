
const axios = require('axios');
const { db } = require('../lib/firebaseAdmin');

const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://www.asaas.com/api/v3';
const ASAAS_API_KEY = process.env.ASAAS_API_KEY;

const FORMA_PAGAMENTO_MAPPING = {
    'pix': 'PIX',
    'boleto': 'BOLETO',
    'cartao_credito': 'CREDIT_CARD',
    'cartao_debito': 'DEBIT_CARD',
    'credit_card': 'CREDIT_CARD',
    'debit_card': 'DEBIT_CARD',
};

function normalizarFormaPagamento(formaPagamento) {
    const forma = String(formaPagamento || 'pix').toLowerCase().trim();
    const mapped = FORMA_PAGAMENTO_MAPPING[forma];

    if (!mapped) {
        console.warn(`[createPayment] Forma de pagamento desconhecida: ${forma}. Usando PIX como padrão.`);
        return 'PIX';
    }

    return mapped;
}

module.exports = async (req, res) => {
    // ✅ Garante que toda resposta de erro seja sempre JSON, nunca HTML
    res.setHeader('Content-Type', 'application/json');

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    // ✅ Verifica variáveis de ambiente antes de qualquer operação
    if (!ASAAS_API_KEY) {
        console.error('[createPayment] ASAAS_API_KEY não configurada.');
        return res.status(500).json({ error: 'Configuração do servidor incompleta. Contate o suporte.' });
    }

    const { agendamentoId, valor, formaPagamento, descricao, cliente } = req.body;

    if (!agendamentoId || !valor || !formaPagamento) {
        return res.status(400).json({ error: 'Campos obrigatórios: agendamentoId, valor, formaPagamento' });
    }

    try {
        const agendamentoRef = db.collection('agendamentos').doc(agendamentoId);
        const agendamentoSnap = await agendamentoRef.get();

        if (!agendamentoSnap.exists) {
            console.error(`[createPayment] Agendamento não encontrado: ${agendamentoId}`);
            return res.status(404).json({ error: 'Agendamento não encontrado' });
        }

        console.log(`[createPayment] Iniciando criação de pagamento para agendamento: ${agendamentoId}`, {
            valor,
            formaPagamento,
            clienteNome: cliente?.nome,
        });

        let customerId;

        if (cliente?.idAsaas) {
            customerId = cliente.idAsaas;
            console.log('[createPayment] Usando customerId do Asaas fornecido:', customerId);
        } else if (cliente?.cpfCnpj || cliente?.email) {
            console.log('[createPayment] Buscando ou criando cliente no Asaas');
            customerId = await buscarOuCriarClienteAsaas(cliente);
            console.log('[createPayment] customerId obtido/criado:', customerId);
        } else {
            console.error('[createPayment] Cliente sem idAsaas, cpfCnpj ou email');
            return res.status(400).json({ error: 'Cliente precisa ter idAsaas, cpfCnpj ou email' });
        }

        const dueDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0];

        const billingTypeAsaas = normalizarFormaPagamento(formaPagamento);

        const bodyRequest = {
            customer: customerId,
            billingType: billingTypeAsaas,
            value: valor,
            dueDate,
            description: descricao || `Agendamento #${agendamentoId}`,
            externalReference: agendamentoId,
        };

        const response = await axios.post(
            `${ASAAS_API_URL}/payments`,
            bodyRequest,
            { headers: { 'access_token': ASAAS_API_KEY } }
        );

        const paymentData = response.data;
        console.log('[createPayment] Pagamento criado com sucesso:', {
            paymentId: paymentData.id,
            status: paymentData.status,
            billingType: bodyRequest.billingType,
        });

        let qrCodeData = null;

        if (billingTypeAsaas === 'PIX') {
            try {
                console.log('[createPayment] Buscando QR Code do Pix para paymentId:', paymentData.id);
                const qrRes = await axios.get(
                    `${ASAAS_API_URL}/payments/${paymentData.id}/pixQrCode`,
                    { headers: { 'access_token': ASAAS_API_KEY } }
                );
                qrCodeData = qrRes.data;
                console.log('[createPayment] QR Code obtido com sucesso');
            } catch (qrError) {
                console.warn('[createPayment] Erro ao buscar QR Code:', qrError.message);
            }
        }

        const responseData = {
            paymentId: paymentData.id,
            status: paymentData.status,
            invoiceUrl: paymentData.invoiceUrl,
            qrCode: qrCodeData?.encodedImage || null,
            copiaECola: qrCodeData?.payload || null,
        };

        console.log('[createPayment] Resposta enviada ao cliente:', responseData);

        return res.status(200).json(responseData);

    } catch (error) {
        console.error('[createPayment] Erro ao processar pagamento:', {
            agendamentoId,
            errorMessage: error.message,
            axiosResponse: error.response?.data,
            axiosStatus: error.response?.status,
        });

        const errorData = error.response?.data;
        const errorMessage =
            errorData?.errors?.[0]?.description ||
            errorData?.message ||
            error.message ||
            'Erro ao gerar cobrança';

        return res.status(error.response?.status || 500).json({
            error: errorMessage,
            details: errorData || error.message,
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
