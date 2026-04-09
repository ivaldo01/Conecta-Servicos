const axios = require('axios');
const { db } = require('../lib/firebaseAdmin');

const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://www.asaas.com/api/v3';
const ASAAS_API_KEY = process.env.ASAAS_API_KEY;

module.exports = async (req, res) => {
    // ✅ Garante que toda resposta de erro seja sempre JSON, nunca HTML
    res.setHeader('Content-Type', 'application/json');

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    // ✅ Verifica variáveis de ambiente antes de qualquer operação
    if (!ASAAS_API_KEY) {
        console.error('[gerarPix] ASAAS_API_KEY não configurada.');
        return res.status(500).json({ error: 'Configuração do servidor incompleta. Contate o suporte.' });
    }

    const {
        planoId,
        valor,
        nomePlano,
        billingType,
        contratoRecorrenteId
    } = req.body;

    if (!planoId || !valor || !contratoRecorrenteId) {
        return res.status(400).json({ error: 'Campos obrigatórios: planoId, valor, contratoRecorrenteId' });
    }

    try {
        // Buscar o contrato para obter dados do cliente
        const contratoRef = db.collection('contratosRecorrentes').doc(contratoRecorrenteId);
        const contratoSnap = await contratoRef.get();

        if (!contratoSnap.exists) {
            console.error(`[gerarPix] Contrato não encontrado: ${contratoRecorrenteId}`);
            return res.status(404).json({ error: 'Contrato não encontrado' });
        }

        const contrato = contratoSnap.data();

        // Buscar dados do cliente
        const clienteRef = db.collection('usuarios').doc(contrato.clienteId);
        const clienteSnap = await clienteRef.get();
        
        if (!clienteSnap.exists) {
            console.error(`[gerarPix] Cliente não encontrado: ${contrato.clienteId}`);
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }

        const cliente = clienteSnap.data();

        console.log(`[gerarPix] Iniciando criação de pagamento para plano recorrente:`, {
            planoId,
            valor,
            nomePlano,
            clienteNome: cliente.nome,
        });

        let customerId;

        if (cliente?.idAsaas) {
            customerId = cliente.idAsaas;
            console.log('[gerarPix] Usando customerId do Asaas fornecido:', customerId);
        } else if (cliente?.cpfCnpj || cliente?.email) {
            console.log('[gerarPix] Buscando ou criando cliente no Asaas');
            customerId = await buscarOuCriarClienteAsaas(cliente);
            console.log('[gerarPix] customerId obtido/criado:', customerId);
            
            // Atualizar cliente com o idAsaas
            await clienteRef.update({ idAsaas: customerId });
        } else {
            console.error('[gerarPix] Cliente sem idAsaas, cpfCnpj ou email');
            return res.status(400).json({ error: 'Cliente precisa ter idAsaas, cpfCnpj ou email' });
        }

        const dueDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0];

        const bodyRequest = {
            customer: customerId,
            billingType: billingType || 'PIX',
            value: valor,
            dueDate,
            description: nomePlano || `Plano Recorrente #${contratoRecorrenteId}`,
            externalReference: contratoRecorrenteId,
        };

        const response = await axios.post(
            `${ASAAS_API_URL}/payments`,
            bodyRequest,
            { headers: { 'access_token': ASAAS_API_KEY } }
        );

        const paymentData = response.data;
        console.log('[gerarPix] Pagamento criado com sucesso:', {
            paymentId: paymentData.id,
            status: paymentData.status,
        });

        let qrCodeData = null;

        if (bodyRequest.billingType === 'PIX') {
            try {
                console.log('[gerarPix] Buscando QR Code do Pix para paymentId:', paymentData.id);
                const qrRes = await axios.get(
                    `${ASAAS_API_URL}/payments/${paymentData.id}/pixQrCode`,
                    { headers: { 'access_token': ASAAS_API_KEY } }
                );
                qrCodeData = qrRes.data;
                console.log('[gerarPix] QR Code obtido com sucesso');
            } catch (qrError) {
                console.warn('[gerarPix] Erro ao buscar QR Code:', qrError.message);
            }
        }

        // Atualizar contrato com paymentId
        await contratoRef.update({
            paymentId: paymentData.id,
            paymentStatus: paymentData.status,
            updatedAt: new Date()
        });

        const responseData = {
            success: true,
            paymentId: paymentData.id,
            status: paymentData.status,
            invoiceUrl: paymentData.invoiceUrl,
            qrCode: qrCodeData?.encodedImage || null,
            copiaECola: qrCodeData?.payload || null,
        };

        console.log('[gerarPix] Resposta enviada ao cliente:', responseData);

        return res.status(200).json(responseData);

    } catch (error) {
        console.error('[gerarPix] Erro ao processar pagamento:', {
            planoId,
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
